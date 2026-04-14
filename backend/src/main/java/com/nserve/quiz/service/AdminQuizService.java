package com.nserve.quiz.service;

import com.nserve.quiz.domain.InputType;
import com.nserve.quiz.domain.MediaType;
import com.nserve.quiz.domain.Question;
import com.nserve.quiz.domain.Quiz;
import com.nserve.quiz.domain.QuizStatus;
import com.nserve.quiz.dto.AdminQuizCreateRequest;
import com.nserve.quiz.dto.AdminQuizSummaryDto;
import com.nserve.quiz.dto.AdminQuestionPayload;
import com.nserve.quiz.repo.QuestionRepository;
import com.nserve.quiz.repo.QuizRepository;
import com.nserve.quiz.repo.ResultRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminQuizService {

  private final QuizRepository quizRepository;
  private final QuestionRepository questionRepository;
  private final ResultRepository resultRepository;

  public AdminQuizService(
      QuizRepository quizRepository,
      QuestionRepository questionRepository,
      ResultRepository resultRepository) {
    this.quizRepository = quizRepository;
    this.questionRepository = questionRepository;
    this.resultRepository = resultRepository;
  }

  @Transactional
  public AdminQuizSummaryDto create(AdminQuizCreateRequest req) {
    if (req.questions().isEmpty()) {
      throw new IllegalArgumentException("At least one question is required");
    }
    boolean hasRefDoc =
        req.referenceDocumentUrl() != null && !req.referenceDocumentUrl().isBlank();
    List<String> ids = new ArrayList<>();
    for (AdminQuestionPayload p : req.questions()) {
      validateQuestion(p, hasRefDoc);
      Question q = new Question();
      q.setQuestionText(p.questionText().trim());
      q.setMediaUrl(p.mediaUrl() != null && !p.mediaUrl().isBlank() ? p.mediaUrl().trim() : null);
      q.setMediaType(p.mediaType());
      q.setInputType(p.inputType());
      q.setOptions(new ArrayList<>(p.options()));
      q.setCorrectAnswerIndex(p.correctAnswerIndex());
      q.setCorrectNumeric(p.correctNumeric());
      q.setCategory(p.category().trim().toLowerCase());
      if (hasRefDoc) {
        q.setDocumentReference(p.documentReference().trim());
      } else if (p.documentReference() != null && !p.documentReference().isBlank()) {
        q.setDocumentReference(p.documentReference().trim());
      }
      questionRepository.save(q);
      ids.add(q.getId());
    }
    Quiz quiz = new Quiz();
    quiz.setTitle(req.title().trim());
    quiz.setDescription(req.description() != null ? req.description().trim() : "");
    quiz.setCategory(req.category().trim().toLowerCase());
    quiz.setStatus(req.status() != null ? req.status() : QuizStatus.live);
    quiz.setSecondsPerQuestion(Math.max(5, req.secondsPerQuestion()));
    quiz.setStartsAt(req.startsAt());
    quiz.setEndsAt(req.endsAt());
    if (hasRefDoc) {
      quiz.setReferenceDocumentUrl(req.referenceDocumentUrl().trim());
      String docName = req.referenceDocumentName();
      quiz.setReferenceDocumentName(
          docName != null && !docName.isBlank() ? docName.trim() : "Source document");
    }
    quiz.setQuestionIds(ids);
    quiz.setQuestionCount(ids.size());
    quiz.setCreatedAt(Instant.now());
    quizRepository.save(quiz);
    return toSummary(quiz);
  }

  private static void validateQuestion(AdminQuestionPayload p, boolean requireDocumentReference) {
    if (requireDocumentReference) {
      if (p.documentReference() == null || p.documentReference().isBlank()) {
        throw new IllegalArgumentException(
            "Each question needs a document reference (section/page) when a source document is attached");
      }
    }
    InputType it = p.inputType();
    List<String> opts = p.options();
    if (it == InputType.mcq4) {
      if (opts.size() != 4) {
        throw new IllegalArgumentException("MCQ4 requires exactly 4 options");
      }
      requireIndex(p.correctAnswerIndex(), 0, 3);
    } else if (it == InputType.binary) {
      if (opts.size() != 2) {
        throw new IllegalArgumentException("Binary requires exactly 2 options");
      }
      requireIndex(p.correctAnswerIndex(), 0, 1);
    } else if (it == InputType.mcq3) {
      if (opts.size() != 3) {
        throw new IllegalArgumentException("MCQ3 requires exactly 3 options");
      }
      requireIndex(p.correctAnswerIndex(), 0, 2);
    } else if (it == InputType.slider) {
      if (opts.size() != 2) {
        throw new IllegalArgumentException("Slider requires min/max in options");
      }
      if (p.correctNumeric() == null) {
        throw new IllegalArgumentException("Slider requires correctNumeric");
      }
    }
    if (p.mediaType() != MediaType.none && (p.mediaUrl() == null || p.mediaUrl().isBlank())) {
      throw new IllegalArgumentException("Media URL required when media type is not none");
    }
  }

  private static void requireIndex(Integer idx, int min, int max) {
    if (idx == null || idx < min || idx > max) {
      throw new IllegalArgumentException("Invalid correct answer index");
    }
  }

  public List<AdminQuizSummaryDto> listAll() {
    List<Quiz> all = quizRepository.findAll();
    all.sort(Comparator.comparing(Quiz::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder()))
        .reversed());
    return all.stream().map(this::toSummary).toList();
  }

  @Transactional
  public AdminQuizSummaryDto updateStatus(String id, QuizStatus status, Instant startsAt) {
    Quiz q = quizRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Quiz not found"));
    q.setStatus(status);
    if (status == QuizStatus.upcoming) {
      q.setStartsAt(startsAt != null ? startsAt : Instant.now().plusSeconds(3600));
    } else if (status == QuizStatus.live) {
      q.setStartsAt(startsAt != null ? startsAt : Instant.now());
    }
    quizRepository.save(q);
    return toSummary(q);
  }

  @Transactional
  public List<AdminQuizSummaryDto> bulkUpdateStatus(List<String> ids, QuizStatus status, Instant startsAt) {
    List<AdminQuizSummaryDto> out = new ArrayList<>();
    for (String id : ids) {
      out.add(updateStatus(id, status, startsAt));
    }
    return out;
  }

  @Transactional
  public void delete(String id) {
    Quiz q =
        quizRepository
            .findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Quiz not found"));
    if (q.getQuestionIds() != null) {
      for (String qid : q.getQuestionIds()) {
        questionRepository.deleteById(qid);
      }
    }
    resultRepository.deleteByQuizId(id);
    quizRepository.deleteById(id);
  }

  @Transactional
  public void bulkDelete(List<String> ids) {
    for (String id : ids) {
      delete(id);
    }
  }

  private AdminQuizSummaryDto toSummary(Quiz q) {
    return new AdminQuizSummaryDto(
        q.getId(),
        q.getTitle(),
        q.getCategory() != null ? q.getCategory() : "—",
        q.getQuestionCount(),
        q.getStatus(),
        q.getStartsAt(),
        q.getCreatedAt());
  }
}
