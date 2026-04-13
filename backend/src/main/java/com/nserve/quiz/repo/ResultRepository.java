package com.nserve.quiz.repo;

import com.nserve.quiz.domain.Result;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ResultRepository extends MongoRepository<Result, String> {

  Optional<Result> findByUserIdAndQuizIdAndQuestionId(
      String userId, String quizId, String questionId);

  long countByUserIdAndQuizId(String userId, String quizId);

  List<Result> findByUserIdAndQuizId(String userId, String quizId);

  List<Result> findByAnsweredAtAfter(Instant after);

  List<Result> findByQuizId(String quizId);

  List<Result> findByUserIdAndQuizIdAndCorrectTrue(String userId, String quizId);

  void deleteByQuizId(String quizId);
}
