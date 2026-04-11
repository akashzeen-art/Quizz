package com.nserve.quiz.repo;

import com.nserve.quiz.domain.CreditTransaction;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface CreditTransactionRepository extends MongoRepository<CreditTransaction, String> {
  List<CreditTransaction> findTop20ByUserIdOrderByCreatedAtDesc(String userId);
}
