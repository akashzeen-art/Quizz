package com.nserve.quiz.repo;

import com.nserve.quiz.domain.Admin;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface AdminRepository extends MongoRepository<Admin, String> {

  Optional<Admin> findByEmailIgnoreCase(String email);
}
