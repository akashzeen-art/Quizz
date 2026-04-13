package com.nserve.quiz.api;

import com.nserve.quiz.domain.User;
import com.nserve.quiz.dto.LeaderboardEntryDto;
import com.nserve.quiz.security.CurrentUser;
import com.nserve.quiz.service.LeaderboardService;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class LeaderboardController {

  private final LeaderboardService leaderboardService;

  public LeaderboardController(LeaderboardService leaderboardService) {
    this.leaderboardService = leaderboardService;
  }

  /** Global leaderboard: ?sort=total|weekly|monthly|daily|points */
  @GetMapping("/leaderboard")
  public List<LeaderboardEntryDto> leaderboard(
      @RequestParam(defaultValue = "total") String sort) {
    return leaderboardService.leaderboard(sort);
  }

  /** Per-quiz leaderboard ranked by quiz score + tiebreaker on time */
  @GetMapping("/leaderboard/quiz/{quizId}")
  public List<LeaderboardEntryDto> quizLeaderboard(@PathVariable String quizId) {
    return leaderboardService.quizLeaderboard(quizId);
  }

  /** Instant rank for the logged-in user */
  @GetMapping("/leaderboard/my-rank")
  public Map<String, Integer> myRank(
      @RequestAttribute(CurrentUser.ATTR) User user,
      @RequestParam(defaultValue = "total") String sort) {
    return Map.of("rank", leaderboardService.myRank(user.getId(), sort));
  }
}
