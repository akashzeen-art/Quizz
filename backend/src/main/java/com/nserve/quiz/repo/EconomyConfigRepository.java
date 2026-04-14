package com.nserve.quiz.repo;

import com.nserve.quiz.domain.EconomyConfig;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface EconomyConfigRepository extends MongoRepository<EconomyConfig, String> {}
