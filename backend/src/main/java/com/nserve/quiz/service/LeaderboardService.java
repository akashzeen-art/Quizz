package com.nserve.quiz.service;

import com.nserve.quiz.domain.Result;
import com.nserve.quiz.domain.User;
import com.nserve.quiz.dto.LeaderboardEntryDto;
import com.nserve.quiz.repo.ResultRepository;
import com.nserve.quiz.repo.UserRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class LeaderboardService {

  private static final int MAX_ROWS = 100;

  private final UserRepository userRepository;
  private final ResultRepository resultRepository;

  public LeaderboardService(UserRepository userRepository, ResultRepository resultRepository) {
    this.userRepository = userRepository;
    this.resultRepository = resultRepository;
  }

  /** Global leaderboard — total / weekly / monthly / daily / points */
  public List<LeaderboardEntryDto> leaderboard(String sort) {
    String key = sort == null ? "total" : sort.trim().toLowerCase(Locale.ROOT);

    // For daily sort we need dayScore; tiebreaker = lower totalTimeMs wins
    Comparator<User> cmp = switch (key) {
      case "weekly"  -> Comparator.comparingInt(User::getWeeklyScore).reversed();
      case "monthly" -> Comparator.comparingInt(User::getMonthlyScore).reversed();
      case "daily"   -> Comparator.comparingInt(User::getDayScore).reversed();
      case "points"  -> Comparator.comparingInt(User::getPoints).reversed();
      default        -> Comparator.comparingInt(User::getTotalScore).reversed();
    };

    List<User> users = new ArrayList<>(userRepository.findAll());
    users.sort(cmp);

    List<LeaderboardEntryDto> out = new ArrayList<>();
    int rank = 1;
    for (User u : users) {
      if (rank > MAX_ROWS) break;
      out.add(toEntry(rank++, u, 0L));
    }
    return out;
  }

  /** Per-quiz leaderboard — ranked by quiz score, tiebreaker = fastest total time */
  public List<LeaderboardEntryDto> quizLeaderboard(String quizId) {
    List<Result> results = resultRepository.findByQuizId(quizId);

    // Aggregate per user: totalScore and totalTimeMs
    Map<String, long[]> agg = new HashMap<>(); // userId -> [score, timeMs]
    for (Result r : results) {
      agg.compute(r.getUserId(), (uid, prev) -> {
        long[] v = prev == null ? new long[]{0, 0} : prev;
        v[0] += r.getPointsEarned();
        v[1] += r.getTimeMs();
        return v;
      });
    }

    // Build user map
    Map<String, User> userMap = new HashMap<>();
    for (User u : userRepository.findAll()) userMap.put(u.getId(), u);

    // Sort: higher score first, then lower time (faster)
    List<Map.Entry<String, long[]>> sorted = new ArrayList<>(agg.entrySet());
    sorted.sort((a, b) -> {
      int scoreCmp = Long.compare(b.getValue()[0], a.getValue()[0]);
      if (scoreCmp != 0) return scoreCmp;
      return Long.compare(a.getValue()[1], b.getValue()[1]); // faster wins
    });

    List<LeaderboardEntryDto> out = new ArrayList<>();
    int rank = 1;
    for (Map.Entry<String, long[]> e : sorted) {
      if (rank > MAX_ROWS) break;
      User u = userMap.get(e.getKey());
      if (u == null) continue;
      out.add(toEntry(rank++, u, e.getValue()[1]));
    }
    return out;
  }

  /** Instant rank for a user on a given sort after quiz completion */
  public int myRank(String userId, String sort) {
    List<LeaderboardEntryDto> board = leaderboard(sort);
    for (LeaderboardEntryDto e : board) {
      if (e.userId().equals(userId)) return e.rank();
    }
    return board.size() + 1; // outside top 100
  }

  private LeaderboardEntryDto toEntry(int rank, User u, long totalTimeMs) {
    return new LeaderboardEntryDto(
        rank,
        u.getId(),
        u.getDisplayName() != null ? u.getDisplayName() : "Player",
        u.getTotalScore(),
        u.getWeeklyScore(),
        u.getMonthlyScore(),
        u.getDayScore(),
        u.getPoints(),
        totalTimeMs);
  }
}
