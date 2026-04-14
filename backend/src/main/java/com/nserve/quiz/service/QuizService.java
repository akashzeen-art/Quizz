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
import com.nserve.quiz.service.BoosterService;
import com.nserve.quiz.service.EconomyConfigService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class QuizService {

  private static final int QUESTIONS_PER_SESSION = 10;

  private final QuizRepository quizRepository;
  private final QuestionRepository questionRepository;
  private final ResultRepository resultRepository;
  private final UserRepository userRepository;
  private final QuizPlayEntitlementRepository playEntitlementRepository;
  private final FeedbackService feedbackService;
  private final BoosterService boosterService;
  private final EconomyConfigService economyConfigService;

  public QuizService(
      QuizRepository quizRepository,
      QuestionRepository questionRepository,
      ResultRepository resultRepository,
      UserRepository userRepository,
      QuizPlayEntitlementRepository playEntitlementRepository,
      FeedbackService feedbackService,
      BoosterService boosterService,
      EconomyConfigService economyConfigService) {
    this.quizRepository = quizRepository;
    this.questionRepository = questionRepository;
    this.resultRepository = resultRepository;
    this.userRepository = userRepository;
    this.playEntitlementRepository = playEntitlementRepository;
    this.feedbackService = feedbackService;
    this.boosterService = boosterService;
    this.economyConfigService = economyConfigService;
  }

  public java.util.Optional<QuizPlayEntitlement> findEntitlementByRef(String playRef, String userId, String quizId) {
    try {
      return playEntitlementRepository.findByClientRequestId(playRef)
          .filter(e -> e.getUserId().equals(userId) && e.getQuizId().equals(quizId)
              && e.getExpiresAt().isAfter(Instant.now()));
    } catch (Exception ignored) {
      return java.util.Optional.empty();
    }
  }

  // ── list ──────────────────────────────────────────────────────────────────

  public List<QuizDto> listQuizzes() {
    List<Quiz> live = new ArrayList<>(), upcoming = new ArrayList<>(), ended = new ArrayList<>();
    for (Quiz q : quizRepository.findAll()) {
      switch (q.getStatus()) {
        case live -> live.add(q);
        case upcoming -> upcoming.add(q);
        case ended -> ended.add(q);
        case draft, archived -> {
          // hidden from player app
        }
      }
    }
    live.sort(byStartsDesc()); upcoming.sort(byStartsAsc()); ended.sort(byStartsDesc());
    List<Quiz> ordered = new ArrayList<>();
    ordered.addAll(live); ordered.addAll(upcoming); ordered.addAll(ended);
    return ordered.stream().map(this::toDto).toList();
  }

  // ── get quiz for user (with per-session shuffle) ──────────────────────────

  public QuizDetailResponse getQuizForUser(User user, String quizId, String playRef) {
    Quiz quiz = quizRepository.findById(quizId)
        .orElseThrow(() -> new IllegalArgumentException("Quiz not found"));
    assertQuizJoinable(quiz);

    // Try to load existing entitlement for this session (idempotent on refresh)
    QuizPlayEntitlement entitlement = null;
    if (playRef != null && !playRef.isBlank()) {
      try {
        Optional<QuizPlayEntitlement> ent = playEntitlementRepository.findByClientRequestId(playRef);
        if (ent.isPresent()) {
          QuizPlayEntitlement e = ent.get();
          if (!e.getUserId().equals(user.getId()) || !e.getQuizId().equals(quizId)) {
            throw new ResponseStatusException(HttpStatus.PAYMENT_REQUIRED, "Invalid play session.");
          }
          if (e.getExpiresAt().isBefore(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.PAYMENT_REQUIRED, "Play session expired.");
          }
          entitlement = e;
        }
      } catch (ResponseStatusException rse) {
        throw rse;
      } catch (Exception ignored) { /* collection not yet available */ }
    }

    // If entitlement has a stored question order → use it (same order on refresh)
    if (entitlement != null
        && entitlement.getQuestionOrder() != null
        && !entitlement.getQuestionOrder().isEmpty()) {
      List<Question> ordered = new ArrayList<>();
      for (String qid : entitlement.getQuestionOrder()) {
        questionRepository.findById(qid).ifPresent(ordered::add);
      }
      return new QuizDetailResponse(toDto(quiz), ordered.stream().map(this::toQuestionDto).toList());
    }

    // Build question pool
    List<Question> pool = buildPool(quiz, user);

    // Shuffle with user-id seed so same user gets different order each new session
    // but consistent within a session (stored in entitlement)
    long seed = (user.getId() + quizId + System.currentTimeMillis()).hashCode();
    Collections.shuffle(pool, new java.util.Random(seed));

    int take = Math.min(QUESTIONS_PER_SESSION, pool.size());
    List<Question> selected = new ArrayList<>(pool.subList(0, take));

    // Persist the order in the entitlement so refresh returns same questions
    if (entitlement != null) {
      try {
        entitlement.setQuestionOrder(selected.stream().map(Question::getId).toList());
        playEntitlementRepository.save(entitlement);
      } catch (Exception ignored) { /* non-critical */ }
    }

    return new QuizDetailResponse(toDto(quiz), selected.stream().map(this::toQuestionDto).toList());
  }

  // ── submit answer ─────────────────────────────────────────────────────────

  public SubmitAnswerResponse submitAnswer(User user, SubmitAnswerRequest req) {
    // Validate active session
    int sessionQuestionCount = validateSession(user, req.quizId());

    // Prevent double-submit for same question
    // Scope dup check to current session — allows replaying same quiz in new session
    String sessionId = req.sessionId() != null ? req.sessionId() : "";
    if (!sessionId.isBlank()) {
      var dup = resultRepository.findByUserIdAndQuizIdAndQuestionIdAndSessionId(
          user.getId(), req.quizId(), req.questionId(), sessionId);
      if (dup.isPresent()) {
        Result r = dup.get();
        Question qq = questionRepository.findById(req.questionId())
            .orElseThrow(() -> new IllegalArgumentException("Question not found"));
        Integer reveal = qq.getInputType() == InputType.slider ? null : qq.getCorrectAnswerIndex();
        return new SubmitAnswerResponse(r.isCorrect(), false, 0, "Already answered", user.getTotalScore(), reveal, boosterService.isBoosterActive(user), false);
      }
    }

    // Prevent submitting more answers than questions in session
    long answeredSoFar = sessionId.isBlank()
        ? resultRepository.countByUserIdAndQuizId(user.getId(), req.quizId())
        : resultRepository.countByUserIdAndQuizIdAndSessionId(user.getId(), req.quizId(), sessionId);
    if (answeredSoFar >= sessionQuestionCount) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Quiz session already completed.");
    }

    Question q = questionRepository.findById(req.questionId())
        .orElseThrow(() -> new IllegalArgumentException("Question not found"));

    boolean correct = evaluate(q, req);
    int basePoints = computePoints(correct, req.timedOut());

    // Apply 2x booster if active
    boolean boosterActive = boosterService.isBoosterActive(user);
    int points = (boosterActive && basePoints > 0) ? basePoints * 2 : basePoints;

    // Evaluate booster triggers for next question
    boolean boosterJustActivated = boosterService.evaluateAndActivate(user, correct, req.timedOut());

    Result row = new Result();
    row.setUserId(user.getId());
    row.setQuizId(req.quizId());
    row.setQuestionId(req.questionId());
    row.setSessionId(sessionId);
    row.setCorrect(correct);
    row.setTimedOut(req.timedOut());
    row.setPointsEarned(points);
    row.setTimeMs(req.timeMs());
    row.setAnsweredAt(Instant.now());
    resultRepository.save(row);

    if (points > 0) applyPoints(user, points);
    else if (points < 0) applyNegativePoints(user, points);
    else ensurePlayedDate(user);

    User saved = userRepository.findById(user.getId()).orElse(user);
    Integer revealIdx = q.getInputType() == InputType.slider ? null : q.getCorrectAnswerIndex();
    return new SubmitAnswerResponse(
        correct, req.timedOut(), points, feedbackService.random(correct), saved.getTotalScore(), revealIdx,
        boosterService.isBoosterActive(saved), boosterJustActivated);
  }

  // ── helpers ───────────────────────────────────────────────────────────────

  /**
   * Validates the session is active. Returns the number of questions in this session.
   * Soft — if entitlement collection unavailable, allows play.
   */
  private int validateSession(User user, String quizId) {
    try {
      Optional<QuizPlayEntitlement> ent =
          playEntitlementRepository.findFirstByUserIdAndQuizIdAndExpiresAtAfterOrderByCreatedAtDesc(
              user.getId(), quizId, Instant.now());
      if (ent.isEmpty()) {
        long total = playEntitlementRepository.count();
        if (total > 0) {
          throw new ResponseStatusException(HttpStatus.PAYMENT_REQUIRED, "No active quiz session.");
        }
        return QUESTIONS_PER_SESSION; // wallet not active
      }
      QuizPlayEntitlement e = ent.get();
      int count = (e.getQuestionOrder() != null && !e.getQuestionOrder().isEmpty())
          ? e.getQuestionOrder().size()
          : QUESTIONS_PER_SESSION;
      return count;
    } catch (ResponseStatusException rse) {
      throw rse;
    } catch (Exception ignored) {
      return QUESTIONS_PER_SESSION; // collection unavailable
    }
  }

  private List<Question> buildPool(Quiz quiz, User user) {
    List<String> qids = quiz.getQuestionIds();
    if (qids != null && !qids.isEmpty()) {
      List<Question> list = new ArrayList<>();
      for (String qid : qids) questionRepository.findById(qid).ifPresent(list::add);
      if (!list.isEmpty()) return list;
    }
    List<String> cats = user.getCategories();
    if (cats == null || cats.isEmpty()) cats = List.of();
    List<Question> pool = cats.isEmpty()
        ? questionRepository.findAll()
        : questionRepository.findByCategoryIn(cats);
    if (pool.isEmpty()) pool = questionRepository.findAll();
    return new ArrayList<>(pool);
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
    return Comparator.comparing(Quiz::getStartsAt, Comparator.nullsFirst(Comparator.naturalOrder())).reversed();
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
      double val = req.sliderValue(), target = q.getCorrectNumeric();
      double min = Double.parseDouble(q.getOptions().get(0));
      double max = Double.parseDouble(q.getOptions().get(1));
      double tol = Math.max(Math.abs(max - min) * 0.05, 1.0);
      return Math.abs(val - target) <= tol;
    }
    if (req.answerIndex() == null || q.getCorrectAnswerIndex() == null) return false;
    return req.answerIndex().equals(q.getCorrectAnswerIndex());
  }

  private int computePoints(boolean correct, boolean timedOut) {
    if (timedOut) return economyConfigService.get().getTimeoutPoints();
    return correct ? economyConfigService.get().getCorrectPoints() : economyConfigService.get().getWrongPoints();
  }

  private QuizDto toDto(Quiz q) {
    return new QuizDto(q.getId(), q.getTitle(), q.getDescription(), q.getStatus(),
        q.getStartsAt(), q.getEndsAt(), q.getQuestionCount(),
        q.getReferenceDocumentUrl(), q.getReferenceDocumentName());
  }

  private QuestionDto toQuestionDto(Question q) {
    return new QuestionDto(q.getId(), q.getQuestionText(), q.getMediaUrl(), q.getMediaType(),
        q.getInputType(), q.getOptions(), q.getCategory(), q.getDocumentReference());
  }
}
