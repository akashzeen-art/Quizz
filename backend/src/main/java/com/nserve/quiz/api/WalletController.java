package com.nserve.quiz.api;

import com.nserve.quiz.domain.CreditTransaction;
import com.nserve.quiz.domain.User;
import com.nserve.quiz.dto.AddCreditsRequest;
import com.nserve.quiz.dto.WalletBalanceDto;
import com.nserve.quiz.security.CurrentUser;
import com.nserve.quiz.service.WalletService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class WalletController {

  private final WalletService walletService;

  public WalletController(WalletService walletService) {
    this.walletService = walletService;
  }

  @GetMapping("/wallet/balance")
  public WalletBalanceDto balance(@RequestAttribute(CurrentUser.ATTR) User user) {
    return walletService.balance(user);
  }

  @GetMapping("/wallet/transactions")
  public List<CreditTransaction> transactions(@RequestAttribute(CurrentUser.ATTR) User user) {
    return walletService.transactions(user);
  }

  @PostMapping("/wallet/add-credits")
  public WalletBalanceDto addCredits(
      @RequestAttribute(CurrentUser.ATTR) User user,
      @Valid @RequestBody AddCreditsRequest body) {
    return walletService.addCredits(user, body);
  }
}
