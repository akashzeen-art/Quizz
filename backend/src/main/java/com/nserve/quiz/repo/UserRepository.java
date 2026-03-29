package com.nserve.quiz.repo;

import com.nserve.quiz.domain.User;
import java.time.Instant;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

public interface UserRepository extends MongoRepository<User, String> {

  Optional<User> findByAuthToken(String authToken);

  Optional<User> findByEmail(String email);

  Optional<User> findByPhone(String phone);

  Page<User> findAll(Pageable pageable);

  @Query(
      "{'$or':[{'displayName':{'$regex':?0,'$options':'i'}},{'email':{'$regex':?0,'$options':'i'}},{'phone':{'$regex':?0,'$options':'i'}}]}")
  Page<User> searchByTerm(String term, Pageable pageable);

  long countByLastActiveAtGreaterThanEqual(Instant since);
}
