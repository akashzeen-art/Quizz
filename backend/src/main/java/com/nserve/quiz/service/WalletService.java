package com.nserve.quiz.service;

import com.nserve.quiz.domain.CreditTransaction;
import com.nserve.quiz.domain.QuizPlayEntitlement;
import com.nserve.quiz.domain.User;
import com.nserve.quiz.dto.AddCreditsRequest;
import com.nserve.quiz.dto.DeductCreditsResponse;
import com.nserve.quiz.dto.WalletBalanceDto;
import com.nserve.quiz.repo.CreditTransactionRepository;
import com.nserve.quiz.repo.QuizPlayEntitlementRepository;
import com.nserve.quiz.repo.UserRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class WalletService {

  public static final int CREDITS_PER_RUPEE = 2;
  public static final int STARTER_CREDITS = 100;

  private final UserRepository userRepository;
  private final QuizPlayEntitlementRepository entitlementRepository;
  private final CreditTransactionRepository txRepository;
  private final int quizStartCost;
  private final int entitlementHours;

  public WalletService(
      UserRepository userRepository,
      QuizPlayEntitlementRepository entitlementRepository,
      CreditTransactionRepository txRepository,
      @Value("${app.wallet.quiz-start-cost:10}") int quizStartCost,
      @Value("${app.wallet.entitlement-hours:24}") int entitlementHours) {
    this.userRepository = userRepository;
    this.entitlementRepository = entitlementRepository;
    this.txRepository = txRepository;
    this.quizStartCost = quizStartCost;
    this.entitlementHours = entitlementHours;
  }

  public WalletBalanceDto balance(User user) {
    User u = userRepository.findById(user.getId()).orElse(user);
    return new WalletBalanceDto(u.getCredits(), u.getTotalSpent());
  }

  public List<CreditTransaction> transactions(User user) {
    return txRepository.findTop20ByUserIdOrderByCreatedAtDesc(user.getId());
  }

  public WalletBalanceDto addCredits(User user, AddCreditsRequest req) {
    int fromRupees = 0;
    if (req.amountRupees() != null && req.amountRupees() > 0) {
      long raw = (long) req.amountRupees() * CREDITS_PER_RUPEE;
      if (raw > Integer.MAX_VALUE) throw new IllegalArgumentException("amountRupees too large");
      fromRupees = (int) raw;
    }
    int bonus = req.credits() != null && req.credits() > 0 ? req.credits() : 0;
    int total = fromRupees + bonus;
    if (total <= 0) throw new IllegalArgumentException("Provide amountRupees and/or credits to add");

    User u = userRepository.findById(user.getId()).orElseThrow();
    u.setCredits(u.getCredits() + total);
    userRepository.save(u);

    String desc = req.amountRupees() != null && req.amountRupees() > 0
        ? "Top-up ₹" + req.amountRupees() + " → " + total + " credits"
        : "Credit grant: " + total + " credits";
    saveTx(CreditTransaction.added(u.getId(), total, u.getCredits(), desc));

    return new WalletBalanceDto(u.getCredits(), u.getTotalSpent());
  }

  /** Grant starter credits to a new user (called from AuthService on first login). */
  public void grantStarterCreditsIfNeeded(User user) {
    if (user.getCredits() > 0) return;
    user.setCredits(STARTER_CREDITS);
    userRepository.save(user);
    saveTx(CreditTransaction.added(user.getId(), STARTER_CREDITS, STARTER_CREDITS, "Welcome bonus"));
  }

  public DeductCreditsResponse deductForQuiz(User user, String quizId, String clientRequestId) {
    if (clientRequestId == null || clientRequestId.isBlank())
      throw new IllegalArgumentException("clientRequestId is required");

    // Idempotency — wrapped so missing collection never causes 503
    try {
      Optional<QuizPlayEntitlement> existing =
          entitlementRepository.findByClientRequestId(clientRequestId);
      if (existing.isPresent()) {
        QuizPlayEntitlement e = existing.get();
        if (!e.getUserId().equals(user.getId()))
          throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Invalid play session");
        if (!e.getQuizId().equals(quizId))
          throw new IllegalArgumentException("clientRequestId belongs to another quiz");
        User u = userRepository.findById(user.getId()).orElseThrow();
        return new DeductCreditsResponse(u.getCredits(), u.getTotalSpent(), clientRequestId, quizId);
      }
    } catch (ResponseStatusException | IllegalArgumentException rse) {
      throw rse;
    } catch (Exception ignored) { /* collection not yet available */ }

    User u = userRepository.findById(user.getId()).orElseThrow();
    if (u.getCredits() < quizStartCost) {
      throw new ResponseStatusException(
          HttpStatus.PAYMENT_REQUIRED,
          "Insufficient credits. You need at least " + quizStartCost + " credits to start a quiz.");
    }
    u.setCredits(u.getCredits() - quizStartCost);
    u.setTotalSpent(u.getTotalSpent() + quizStartCost);
    userRepository.save(u);

    saveTx(CreditTransaction.used(u.getId(), quizStartCost, u.getCredits(), "Quiz start: " + quizId));

    try {
      QuizPlayEntitlement ent = new QuizPlayEntitlement();
      ent.setUserId(u.getId()); ent.setQuizId(quizId);
      ent.setClientRequestId(clientRequestId);
      ent.setCreatedAt(Instant.now());
      ent.setExpiresAt(Instant.now().plus(entitlementHours, ChronoUnit.HOURS));
      entitlementRepository.save(ent);
    } catch (Exception ignored) { /* collection not yet available */ }

    return new DeductCreditsResponse(u.getCredits(), u.getTotalSpent(), clientRequestId, quizId);
  }

  public int getQuizStartCost() { return quizStartCost; }

  private void saveTx(CreditTransaction tx) {
    try { txRepository.save(tx); } catch (Exception ignored) { /* non-critical */ }
  }
}
