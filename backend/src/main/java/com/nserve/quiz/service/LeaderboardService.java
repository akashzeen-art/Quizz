package com.nserve.quiz.service;

import com.nserve.quiz.domain.User;
import com.nserve.quiz.dto.LeaderboardEntryDto;
import com.nserve.quiz.repo.UserRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;

@Service
public class LeaderboardService {

  private static final int MAX_ROWS = 100;

  private final UserRepository userRepository;

  public LeaderboardService(UserRepository userRepository) {
    this.userRepository = userRepository;
  }

  public List<LeaderboardEntryDto> leaderboard(String sort) {
    String key = sort == null ? "total" : sort.trim().toLowerCase(Locale.ROOT);
    Comparator<User> cmp =
        switch (key) {
          case "weekly" -> Comparator.comparingInt(User::getWeeklyScore).reversed();
          case "monthly" -> Comparator.comparingInt(User::getMonthlyScore).reversed();
          case "points" -> Comparator.comparingInt(User::getPoints).reversed();
          default -> Comparator.comparingInt(User::getTotalScore).reversed();
        };

    List<User> users = new ArrayList<>(userRepository.findAll());
    users.sort(cmp);

    List<LeaderboardEntryDto> out = new ArrayList<>();
    int rank = 1;
    for (User u : users) {
      if (rank > MAX_ROWS) {
        break;
      }
      String name = u.getDisplayName() != null ? u.getDisplayName() : "Player";
      out.add(
          new LeaderboardEntryDto(
              rank++,
              u.getId(),
              name,
              u.getTotalScore(),
              u.getWeeklyScore(),
              u.getMonthlyScore(),
              u.getPoints()));
    }
    return out;
  }
}
