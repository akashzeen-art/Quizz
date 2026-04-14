package com.nserve.quiz.api;

import com.nserve.quiz.domain.EconomyConfig;
import com.nserve.quiz.security.CurrentAdmin;
import com.nserve.quiz.service.EconomyConfigService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin/economy")
public class AdminEconomyController {

  private final EconomyConfigService economyConfigService;

  public AdminEconomyController(EconomyConfigService economyConfigService) {
    this.economyConfigService = economyConfigService;
  }

  @GetMapping
  public EconomyConfig get(@RequestAttribute(CurrentAdmin.ATTR) String adminEmail) {
    return economyConfigService.get();
  }

  @PutMapping
  public EconomyConfig update(
      @RequestAttribute(CurrentAdmin.ATTR) String adminEmail,
      @RequestBody EconomyConfig body) {
    return economyConfigService.update(body);
  }
}
