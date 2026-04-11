package com.nserve.quiz.service;

import com.nserve.quiz.domain.InputType;
import com.nserve.quiz.domain.Question;
import com.nserve.quiz.domain.Quiz;
import com.nserve.quiz.domain.QuizPlayEntitlement;
import com.nserve.quiz.domain.QuizStatus;
import com.nserve.quiz.domain.Result;
import com.nserve.quiz.domain.User;
import com.nserve.quiz.dto.QuestionDto;
import com.nserve.quiz.dto.QuizDetailResponse;
import com.nserve.quiz.dto.QuizDto;
import com.nserve.quiz.dto.SubmitAnswerRequest;
import com.nserve.quiz.dto.SubmitAnswerResponse;
import com.nserve.quiz.repo.QuestionRepository;
import com.nserve.quiz.repo.QuizPlayEntitlementRepository;
import com.nserve.quiz.repo.QuizRepository;
import com.nserve.quiz.repo.ResultRepository;
import com.nserve.quiz.repo.UserRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class QuizService {

  private static final int QUESTION_MS = 15_000;

  private final QuizRepository quizRepository;
  private final QuestionRepository questionRepository;
  private final ResultRepository resultRepository;
  private final UserRepository userRepository;
  private final QuizPlayEntitlementRepository playEntitlementRepository;
  private final FeedbackService feedbackService;

  public QuizService(
      QuizRepository quizRepository,
      QuestionRepository questionRepository,
      ResultRepository resultRepository,
      UserRepository userRepository,
      QuizPlayEntitlementRepository playEntitlementRepository,
      FeedbackService feedbackService) {
    this.quizRepository = quizRepository;
    this.questionRepository = questionRepository;
    this.resultRepository = resultRepository;
    this.userRepository = userRepository;
    this.playEntitlementRepository = playEntitlementRepository;
    this.feedbackService = feedbackService;
  }

  public List<QuizDto> listQuizzes() {
    List<Quiz> live = new ArrayList<>();
    List<Quiz> upcoming = new ArrayList<>();
    List<Quiz> ended = new ArrayList<>();
    for (Quiz q : quizRepository.findAll()) {
      switch (q.getStatus()) {
        case live -> live.add(q);
        case upcoming -> upcoming.add(q);
        case ended -> ended.add(q);
      }
    }
    live.sort(byStartsDesc());
    upcoming.sort(byStartsAsc());
    ended.sort(byStartsDesc());
    List<Quiz> ordered = new ArrayList<>(live.size() + upcoming.size() + ended.size());
    ordered.addAll(live);
    ordered.addAll(upcoming);
    ordered.addAll(ended);
    return ordered.stream().map(this::toDto).toList();
  }

  public QuizDetailResponse getQuizForUser(User user, String quizId, String playRef) {
    // Soft entitlement check — only blocks if entitlement exists but is invalid
    if (playRef != null && !playRef.isBlank()) {
      try {
        Optional<QuizPlayEntitlement> ent =
            playEntitlementRepository.findByClientRequestId(playRef);
        if (ent.isPresent()) {
          QuizPlayEntitlement e = ent.get();
          if (!e.getUserId().equals(user.getId())
              || !e.getQuizId().equals(quizId)
              || e.getExpiresAt().isBefore(Instant.now())) {
            throw new ResponseStatusException(
                HttpStatus.PAYMENT_REQUIRED,
                "No active play session for this quiz.");
          }
        }
      } catch (ResponseStatusException rse) {
        throw rse;
      } catch (Exception ignored) {
        // entitlement collection not yet available — allow play
      }
    }

    Quiz quiz =
        quizRepository
            .findById(quizId)
            .orElseThrow(() -> new IllegalArgumentException("Quiz not found"));
    assertQuizJoinable(quiz);

    List<String> qids = quiz.getQuestionIds();
    if (qids != null && !qids.isEmpty()) {
      List<Question> ordered = new ArrayList<>();
      for (String qid : qids) {
        questionRepository.findById(qid).ifPresent(ordered::add);
      }
      int take = Math.min(quiz.getQuestionCount(), ordered.size());
      List<QuestionDto> qs =
          ordered.subList(0, take).stream().map(this::toQuestionDto).toList();
      return new QuizDetailResponse(toDto(quiz), qs);
    }

    List<String> cats = user.getCategories();
    if (cats == null || cats.isEmpty()) cats = List.of();
    List<Question> pool =
        cats.isEmpty() ? questionRepository.findAll() : questionRepository.findByCategoryIn(cats);
    if (pool.isEmpty()) pool = questionRepository.findAll();
    List<Question> copy = new ArrayList<>(pool);
    Collections.shuffle(copy, ThreadLocalRandom.current());
    int take = Math.min(quiz.getQuestionCount(), copy.size());
    List<QuestionDto> qs = copy.subList(0, take).stream().map(this::toQuestionDto).toList();
    return new QuizDetailResponse(toDto(quiz), qs);
  }

  public SubmitAnswerResponse submitAnswer(User user, SubmitAnswerRequest req) {
    // Soft entitlement check — allow if collection unavailable
    try {
      boolean hasEntitlement =
          playEntitlementRepository
              .findFirstByUserIdAndQuizIdAndExpiresAtAfterOrderByCreatedAtDesc(
                  user.getId(), req.quizId(), Instant.now())
              .isPresent();
      if (!hasEntitlement) {
        // Check if any entitlement exists at all (wallet system may not be active)
        long total = playEntitlementRepository.count();
        if (total > 0) {
          throw new ResponseStatusException(
              HttpStatus.PAYMENT_REQUIRED, "No active quiz session.");
        }
        // wallet system not active — allow submit
      }
    } catch (ResponseStatusException rse) {
      throw rse;
    } catch (Exception ignored) {
      // entitlement collection unavailable — allow submit
    }

    var dup =
        resultRepository.findByUserIdAndQuizIdAndQuestionId(
            user.getId(), req.quizId(), req.questionId());
    if (dup.isPresent()) {
      Result r = dup.get();
      Question qq =
          questionRepository
              .findById(req.questionId())
              .orElseThrow(() -> new IllegalArgumentException("Question not found"));
      Integer reveal = qq.getInputType() == InputType.slider ? null : qq.getCorrectAnswerIndex();
      return new SubmitAnswerResponse(r.isCorrect(), false, 0, "Already answered", user.getTotalScore(), reveal);
    }

    Question q =
        questionRepository
            .findById(req.questionId())
            .orElseThrow(() -> new IllegalArgumentException("Question not found"));

    boolean correct = evaluate(q, req);
    int points = computePoints(correct, req.timedOut());

    Result row = new Result();
    row.setUserId(user.getId());
    row.setQuizId(req.quizId());
    row.setQuestionId(req.questionId());
    row.setCorrect(correct);
    row.setTimedOut(req.timedOut());
    row.setPointsEarned(points);
    row.setAnsweredAt(Instant.now());
    resultRepository.save(row);

    if (points > 0) applyPoints(user, points);
    else if (points < 0) applyNegativePoints(user, points);
    else ensurePlayedDate(user);

    User saved = userRepository.findById(user.getId()).orElse(user);
    Integer revealIdx = q.getInputType() == InputType.slider ? null : q.getCorrectAnswerIndex();
    return new SubmitAnswerResponse(
        correct, req.timedOut(), points, feedbackService.random(correct), saved.getTotalScore(), revealIdx);
  }

  private void assertQuizJoinable(Quiz quiz) {
    Instant now = Instant.now();
    if (quiz.getStatus() == QuizStatus.ended)
      throw new IllegalArgumentException("This event has ended.");
    if (quiz.getEndsAt() != null && now.isAfter(quiz.getEndsAt()))
      throw new IllegalArgumentException("This event window has closed.");
    if (quiz.getStatus() == QuizStatus.upcoming
        && quiz.getStartsAt() != null
        && quiz.getStartsAt().isAfter(now))
      throw new IllegalArgumentException("This event has not started yet.");
  }

  private static Comparator<Quiz> byStartsAsc() {
    return Comparator.comparing(Quiz::getStartsAt, Comparator.nullsLast(Comparator.naturalOrder()));
  }

  private static Comparator<Quiz> byStartsDesc() {
    return Comparator.comparing(
            Quiz::getStartsAt, Comparator.nullsFirst(Comparator.naturalOrder()))
        .reversed();
  }

  private void ensurePlayedDate(User user) {
    User u = userRepository.findById(user.getId()).orElse(user);
    String today = LocalDate.now(ZoneOffset.UTC).toString();
    List<String> dates = u.getPlayedDates();
    if (dates == null) { dates = new ArrayList<>(); u.setPlayedDates(dates); }
    if (!dates.contains(today)) { dates.add(today); userRepository.save(u); }
  }

  private void applyPoints(User user, int points) {
    User u = userRepository.findById(user.getId()).orElseThrow();
    String today = LocalDate.now(ZoneOffset.UTC).toString();
    if (!today.equals(u.getDayScoreDate())) { u.setDayScore(0); u.setDayScoreDate(today); }
    u.setDayScore(u.getDayScore() + points);
    u.setTotalScore(u.getTotalScore() + points);
    u.setWeeklyScore(u.getWeeklyScore() + points);
    u.setMonthlyScore(u.getMonthlyScore() + points);
    u.setPoints(u.getPoints() + points);
    List<String> dates = u.getPlayedDates();
    if (dates == null) { dates = new ArrayList<>(); u.setPlayedDates(dates); }
    if (!dates.contains(today)) dates.add(today);
    userRepository.save(u);
  }

  private void applyNegativePoints(User user, int points) {
    User u = userRepository.findById(user.getId()).orElseThrow();
    String today = LocalDate.now(ZoneOffset.UTC).toString();
    if (!today.equals(u.getDayScoreDate())) { u.setDayScore(0); u.setDayScoreDate(today); }
    u.setDayScore(Math.max(0, u.getDayScore() + points));
    u.setTotalScore(Math.max(0, u.getTotalScore() + points));
    u.setWeeklyScore(Math.max(0, u.getWeeklyScore() + points));
    u.setMonthlyScore(Math.max(0, u.getMonthlyScore() + points));
    u.setPoints(Math.max(0, u.getPoints() + points));
    List<String> dates = u.getPlayedDates();
    if (dates == null) { dates = new ArrayList<>(); u.setPlayedDates(dates); }
    if (!dates.contains(today)) dates.add(today);
    userRepository.save(u);
  }

  private static boolean evaluate(Question q, SubmitAnswerRequest req) {
    if (q.getInputType() == InputType.slider) {
      if (req.sliderValue() == null || q.getCorrectNumeric() == null) return false;
      double val = req.sliderValue();
      double target = q.getCorrectNumeric();
      double min = Double.parseDouble(q.getOptions().get(0));
      double max = Double.parseDouble(q.getOptions().get(1));
      double range = Math.abs(max - min);
      double tol = Math.max(range * 0.05, 1.0);
      return Math.abs(val - target) <= tol;
    }
    if (req.answerIndex() == null || q.getCorrectAnswerIndex() == null) return false;
    return req.answerIndex().equals(q.getCorrectAnswerIndex());
  }

  private static int computePoints(boolean correct, boolean timedOut) {
    if (timedOut) return 0;
    return correct ? 10 : -2;
  }

  private QuizDto toDto(Quiz q) {
    return new QuizDto(
        q.getId(), q.getTitle(), q.getDescription(), q.getStatus(),
        q.getStartsAt(), q.getEndsAt(), q.getQuestionCount(),
        q.getReferenceDocumentUrl(), q.getReferenceDocumentName());
  }

  private QuestionDto toQuestionDto(Question q) {
    return new QuestionDto(
        q.getId(), q.getQuestionText(), q.getMediaUrl(), q.getMediaType(),
        q.getInputType(), q.getOptions(), q.getCategory(), q.getDocumentReference());
  }
}
