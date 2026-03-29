package com.nserve.quiz.repo;

import com.nserve.quiz.domain.Quiz;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface QuizRepository extends MongoRepository<Quiz, String> {}
