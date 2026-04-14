package com.nserve.quiz.service;

import com.nserve.quiz.domain.Quiz;
import com.nserve.quiz.domain.QuizStatus;
import com.nserve.quiz.repo.QuizRepository;
import java.time.Instant;
import java.util.List;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class QuizReleaseScheduler {

  private final QuizRepository quizRepository;

  public QuizReleaseScheduler(QuizRepository quizRepository) {
    this.quizRepository = quizRepository;
  }

  /** Auto-promote scheduled quizzes from upcoming to live. */
  @Scheduled(fixedDelayString = "${app.quiz-release.poll-ms:60000}")
  public void promoteUpcomingToLive() {
    List<Quiz> ready = quizRepository.findByStatusAndStartsAtLessThanEqual(QuizStatus.upcoming, Instant.now());
    for (Quiz q : ready) {
      q.setStatus(QuizStatus.live);
      quizRepository.save(q);
    }
  }
}
