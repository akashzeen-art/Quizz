package com.nserve.quiz.repo;

import com.nserve.quiz.domain.Quiz;
import com.nserve.quiz.domain.QuizStatus;
import java.time.Instant;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface QuizRepository extends MongoRepository<Quiz, String> {

  List<Quiz> findByStatus(QuizStatus status);

  List<Quiz> findByStatusAndStartsAtLessThanEqual(QuizStatus status, Instant when);
}
