package com.nserve.quiz.repo;

import com.nserve.quiz.domain.QuizPlayEntitlement;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface QuizPlayEntitlementRepository extends MongoRepository<QuizPlayEntitlement, String> {

  Optional<QuizPlayEntitlement> findByClientRequestId(String clientRequestId);

  Optional<QuizPlayEntitlement> findFirstByUserIdAndQuizIdAndExpiresAtAfterOrderByCreatedAtDesc(
      String userId, String quizId, Instant now);

  List<QuizPlayEntitlement> findByUserIdAndQuizId(String userId, String quizId);
}
