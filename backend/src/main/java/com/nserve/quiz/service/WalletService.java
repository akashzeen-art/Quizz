package com.nserve.quiz.service;

import com.nserve.quiz.domain.QuizPlayEntitlement;
import com.nserve.quiz.domain.User;
import com.nserve.quiz.dto.AddCreditsRequest;
import com.nserve.quiz.dto.DeductCreditsResponse;
import com.nserve.quiz.dto.WalletBalanceDto;
import com.nserve.quiz.repo.QuizPlayEntitlementRepository;
import com.nserve.quiz.repo.UserRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class WalletService {

  /** Credits granted per ₹1 (₹50 → 100 credits). */
  public static final int CREDITS_PER_RUPEE = 2;

  private final UserRepository userRepository;
  private final QuizPlayEntitlementRepository entitlementRepository;
  private final int quizStartCost;
  private final int entitlementHours;

  public WalletService(
      UserRepository userRepository,
      QuizPlayEntitlementRepository entitlementRepository,
      @Value("${app.wallet.quiz-start-cost:10}") int quizStartCost,
      @Value("${app.wallet.entitlement-hours:24}") int entitlementHours) {
    this.userRepository = userRepository;
    this.entitlementRepository = entitlementRepository;
    this.quizStartCost = quizStartCost;
    this.entitlementHours = entitlementHours;
  }

  public WalletBalanceDto balance(User user) {
    User u = userRepository.findById(user.getId()).orElse(user);
    return new WalletBalanceDto(u.getCredits(), u.getTotalSpent());
  }

  public WalletBalanceDto addCredits(User user, AddCreditsRequest req) {
    int fromRupees = 0;
    if (req.amountRupees() != null && req.amountRupees() > 0) {
      long raw = (long) req.amountRupees() * CREDITS_PER_RUPEE;
      if (raw > Integer.MAX_VALUE) {
        throw new IllegalArgumentException("amountRupees too large");
      }
      fromRupees = (int) raw;
    }
    int bonus = req.credits() != null && req.credits() > 0 ? req.credits() : 0;
    if (fromRupees + bonus <= 0) {
      throw new IllegalArgumentException("Provide amountRupees and/or credits to add");
    }
    User u = userRepository.findById(user.getId()).orElseThrow();
    u.setCredits(u.getCredits() + fromRupees + bonus);
    userRepository.save(u);
    return new WalletBalanceDto(u.getCredits(), u.getTotalSpent());
  }

  /**
   * Reserves {@code quizStartCost} credits once per {@code clientRequestId}. Repeating the same id
   * returns the current balance without charging again (idempotent).
   */
  public DeductCreditsResponse deductForQuiz(User user, String quizId, String clientRequestId) {
    if (clientRequestId == null || clientRequestId.isBlank()) {
      throw new IllegalArgumentException("clientRequestId is required");
    }
    Optional<QuizPlayEntitlement> existing =
        entitlementRepository.findByClientRequestId(clientRequestId);
    if (existing.isPresent()) {
      QuizPlayEntitlement e = existing.get();
      if (!e.getUserId().equals(user.getId())) {
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Invalid play session");
      }
      if (!e.getQuizId().equals(quizId)) {
        throw new IllegalArgumentException("clientRequestId belongs to another quiz");
      }
      User u = userRepository.findById(user.getId()).orElseThrow();
      return new DeductCreditsResponse(
          u.getCredits(), u.getTotalSpent(), clientRequestId, quizId);
    }

    User u = userRepository.findById(user.getId()).orElseThrow();
    if (u.getCredits() < quizStartCost) {
      throw new ResponseStatusException(
          HttpStatus.PAYMENT_REQUIRED,
          "Insufficient credits. You need at least "
              + quizStartCost
              + " credits to start a quiz.");
    }
    u.setCredits(u.getCredits() - quizStartCost);
    u.setTotalSpent(u.getTotalSpent() + quizStartCost);
    userRepository.save(u);

    QuizPlayEntitlement ent = new QuizPlayEntitlement();
    ent.setUserId(u.getId());
    ent.setQuizId(quizId);
    ent.setClientRequestId(clientRequestId);
    ent.setCreatedAt(Instant.now());
    ent.setExpiresAt(Instant.now().plus(entitlementHours, ChronoUnit.HOURS));
    entitlementRepository.save(ent);

    return new DeductCreditsResponse(
        u.getCredits(), u.getTotalSpent(), clientRequestId, quizId);
  }

  public int getQuizStartCost() {
    return quizStartCost;
  }
}
