package com.nserve.quiz.api;

import com.nserve.quiz.dto.AdminChartsResponse;
import com.nserve.quiz.dto.AdminStatsResponse;
import com.nserve.quiz.security.CurrentAdmin;
import com.nserve.quiz.service.AdminStatsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin")
public class AdminStatsController {

  private final AdminStatsService adminStatsService;

  public AdminStatsController(AdminStatsService adminStatsService) {
    this.adminStatsService = adminStatsService;
  }

  @GetMapping("/stats")
  public AdminStatsResponse stats(@RequestAttribute(CurrentAdmin.ATTR) String adminEmail) {
    return adminStatsService.stats();
  }

  @GetMapping("/stats/charts")
  public AdminChartsResponse charts(
      @RequestAttribute(CurrentAdmin.ATTR) String adminEmail,
      @RequestParam(defaultValue = "14") int days) {
    return adminStatsService.charts(days);
  }
}
