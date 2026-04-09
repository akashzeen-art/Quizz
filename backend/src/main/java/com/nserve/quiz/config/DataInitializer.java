package com.nserve.quiz.config;

import com.nserve.quiz.domain.Quiz;
import com.nserve.quiz.domain.QuizStatus;
import com.nserve.quiz.repo.QuestionRepository;
import com.nserve.quiz.repo.QuizRepository;
import com.nserve.quiz.repo.UserRepository;
import com.nserve.quiz.seed.QuestionSeedGenerator;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DataInitializer {

  private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);
  private static final int FREE_STARTER_CREDITS = 100;

  private final QuestionRepository questionRepository;
  private final QuizRepository quizRepository;
  private final UserRepository userRepository;

  public DataInitializer(
      QuestionRepository questionRepository,
      QuizRepository quizRepository,
      UserRepository userRepository) {
    this.questionRepository = questionRepository;
    this.quizRepository = quizRepository;
    this.userRepository = userRepository;
  }

  @Bean
  CommandLineRunner seedData() {
    return args -> {
      try {
        // Grant free starter credits to existing users who have 0
        var zeroUsers = userRepository.findAll().stream()
            .filter(u -> u.getCredits() <= 0)
            .toList();
        if (!zeroUsers.isEmpty()) {
          zeroUsers.forEach(u -> u.setCredits(FREE_STARTER_CREDITS));
          userRepository.saveAll(zeroUsers);
          log.info("Granted {} starter credits to {} existing users", FREE_STARTER_CREDITS, zeroUsers.size());
        }

        long qc = questionRepository.count();
        if (qc == 0) {
          var questions = QuestionSeedGenerator.generate();
          questionRepository.saveAll(questions);
          log.info("Seeded {} questions", questions.size());
        } else {
          log.info("Questions already present ({}), skipping seed", qc);
        }

        if (quizRepository.count() == 0) {
          Instant seedNow = Instant.now();
          Quiz q1 = new Quiz();
          q1.setTitle("Lightning Round");
          q1.setDescription("Fast 10-question sprint tailored to your categories.");
          q1.setStatus(QuizStatus.live);
          q1.setStartsAt(seedNow);
          q1.setQuestionCount(10);
          q1.setCategory("mixed");
          q1.setCreatedAt(seedNow);
          q1.setSecondsPerQuestion(15);
          quizRepository.save(q1);

          Quiz q2 = new Quiz();
          q2.setTitle("Prime Time Contest");
          q2.setDescription("Longer set with mixed media — climb the board.");
          q2.setStatus(QuizStatus.live);
          q2.setStartsAt(seedNow);
          q2.setQuestionCount(15);
          q2.setCategory("mixed");
          q2.setCreatedAt(seedNow);
          q2.setSecondsPerQuestion(15);
          quizRepository.save(q2);

          Quiz q3 = new Quiz();
          q3.setTitle("Weekend Mega Quiz");
          q3.setDescription("Big pool, bigger prizes — set a reminder and join when we go live.");
          q3.setStatus(QuizStatus.upcoming);
          q3.setStartsAt(seedNow.plusSeconds(86_400));
          q3.setEndsAt(seedNow.plusSeconds(86_400 + 3_600));
          q3.setQuestionCount(20);
          q3.setCategory("mixed");
          q3.setCreatedAt(seedNow);
          q3.setSecondsPerQuestion(15);
          quizRepository.save(q3);

          Quiz q4 = new Quiz();
          q4.setTitle("Spring Throwdown");
          q4.setDescription("Finished — replay stats on the leaderboard.");
          q4.setStatus(QuizStatus.ended);
          q4.setStartsAt(seedNow.minusSeconds(86400 * 5));
          q4.setEndsAt(seedNow.minusSeconds(86400 * 4));
          q4.setQuestionCount(12);
          q4.setCategory("mixed");
          q4.setCreatedAt(seedNow.minusSeconds(86400 * 5));
          q4.setSecondsPerQuestion(15);
          quizRepository.save(q4);

          log.info("Seeded default quizzes");
        }
      } catch (Exception e) {
        log.error(
            "Skipping DB seed — MongoDB not reachable (fix URI, Atlas IP access, TLS, or use JDK 21 LTS). API will still start.",
            e);
      }
    };
  }
}
