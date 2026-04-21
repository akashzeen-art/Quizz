package com.nserve.quiz.api;

import com.nserve.quiz.repo.CreditTransactionRepository;
import com.nserve.quiz.repo.QuestionRepository;
import com.nserve.quiz.repo.QuizPlayEntitlementRepository;
import com.nserve.quiz.repo.QuizRepository;
import com.nserve.quiz.repo.ResultRepository;
import com.nserve.quiz.repo.UserRepository;
import com.nserve.quiz.security.CurrentAdmin;
import java.util.Map;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin/reset")
public class AdminResetController {

  private final UserRepository userRepo;
  private final QuizRepository quizRepo;
  private final QuestionRepository questionRepo;
  private final ResultRepository resultRepo;
  private final CreditTransactionRepository creditTxRepo;
  private final QuizPlayEntitlementRepository entitlementRepo;

  public AdminResetController(
      UserRepository userRepo,
      QuizRepository quizRepo,
      QuestionRepository questionRepo,
      ResultRepository resultRepo,
      CreditTransactionRepository creditTxRepo,
      QuizPlayEntitlementRepository entitlementRepo) {
    this.userRepo = userRepo;
    this.quizRepo = quizRepo;
    this.questionRepo = questionRepo;
    this.resultRepo = resultRepo;
    this.creditTxRepo = creditTxRepo;
    this.entitlementRepo = entitlementRepo;
  }

  /** Clears all users, quizzes, results, entitlements and credit transactions.
   *  Admin accounts and questions are NOT touched. */
  @DeleteMapping
  public Map<String, Object> reset(@RequestAttribute(CurrentAdmin.ATTR) String adminEmail) {
    long users = userRepo.count();
    long quizzes = quizRepo.count();
    long questions = questionRepo.count();
    long results = resultRepo.count();
    long credits = creditTxRepo.count();
    long entitlements = entitlementRepo.count();

    userRepo.deleteAll();
    quizRepo.deleteAll();
    questionRepo.deleteAll();
    resultRepo.deleteAll();
    creditTxRepo.deleteAll();
    entitlementRepo.deleteAll();

    return Map.of(
        "deleted", Map.of(
            "users", users,
            "quizzes", quizzes,
            "questions", questions,
            "results", results,
            "creditTransactions", credits,
            "entitlements", entitlements),
        "kept", "admins only");
  }
}
