package com.nserve.quiz.api;

import com.nserve.quiz.dto.LeaderboardEntryDto;
import com.nserve.quiz.service.LeaderboardService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class LeaderboardController {

  private final LeaderboardService leaderboardService;

  public LeaderboardController(LeaderboardService leaderboardService) {
    this.leaderboardService = leaderboardService;
  }

  @GetMapping("/leaderboard")
  public List<LeaderboardEntryDto> leaderboard(
      @RequestParam(defaultValue = "total") String sort) {
    return leaderboardService.leaderboard(sort);
  }
}
