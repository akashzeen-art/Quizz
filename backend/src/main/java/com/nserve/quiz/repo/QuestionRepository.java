package com.nserve.quiz.repo;

import com.nserve.quiz.domain.Question;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface QuestionRepository extends MongoRepository<Question, String> {

  List<Question> findByCategoryIn(List<String> categories);
}
