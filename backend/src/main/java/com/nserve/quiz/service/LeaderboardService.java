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
  private final DummyParticipantService dummyService;

  public LeaderboardService(
      UserRepository userRepository,
      ResultRepository resultRepository,
      DummyParticipantService dummyService) {
    this.userRepository = userRepository;
    this.resultRepository = resultRepository;
    this.dummyService = dummyService;
  }

  /** Global leaderboard — total / weekly / monthly / daily / points */
  public List<LeaderboardEntryDto> leaderboard(String sort, String currentUserId) {
    String key = sort == null ? "total" : sort.trim().toLowerCase(Locale.ROOT);

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

    // Inject dummies when real users are few
    if (currentUserId != null) {
      out = dummyService.fill(out, currentUserId, key);
    }
    return out;
  }

  /** Per-quiz leaderboard — ranked by quiz score, tiebreaker = fastest total time */
  public List<LeaderboardEntryDto> quizLeaderboard(String quizId, String currentUserId) {
    List<Result> results = resultRepository.findByQuizId(quizId);

    Map<String, long[]> agg = new HashMap<>();
    for (Result r : results) {
      agg.compute(r.getUserId(), (uid, prev) -> {
        long[] v = prev == null ? new long[]{0, 0} : prev;
        v[0] += r.getPointsEarned();
        v[1] += r.getTimeMs();
        return v;
      });
    }

    Map<String, User> userMap = new HashMap<>();
    for (User u : userRepository.findAll()) userMap.put(u.getId(), u);

    List<Map.Entry<String, long[]>> sorted = new ArrayList<>(agg.entrySet());
    sorted.sort((a, b) -> {
      int scoreCmp = Long.compare(b.getValue()[0], a.getValue()[0]);
      if (scoreCmp != 0) return scoreCmp;
      return Long.compare(a.getValue()[1], b.getValue()[1]);
    });

    List<LeaderboardEntryDto> out = new ArrayList<>();
    int rank = 1;
    for (Map.Entry<String, long[]> e : sorted) {
      if (rank > MAX_ROWS) break;
      User u = userMap.get(e.getKey());
      if (u == null) continue;
      out.add(toEntry(rank++, u, e.getValue()[1]));
    }

    if (currentUserId != null) {
      out = dummyService.fill(out, currentUserId, "total");
    }
    return out;
  }

  /** Instant rank for a user */
  public int myRank(String userId, String sort) {
    List<LeaderboardEntryDto> board = leaderboard(sort, userId);
    for (LeaderboardEntryDto e : board) {
      if (e.userId().equals(userId)) return e.rank();
    }
    return board.size() + 1;
  }

  private LeaderboardEntryDto toEntry(int rank, User u, long totalTimeMs) {
    String avatarSeed =
        (u.getAvatarKey() != null && !u.getAvatarKey().isBlank())
            ? u.getAvatarKey()
            : ("lb-" + u.getId());
    String avatarUrl = u.getProfilePhotoUrl();
    // Leaderboard score = wallet (in rupees as int) + points
    int walletRupees = u.getWalletPaise() / 100;
    int leaderboardScore = walletRupees + u.getPoints();
    return new LeaderboardEntryDto(
        rank,
        u.getId(),
        u.getDisplayName() != null ? u.getDisplayName() : "Player",
        avatarSeed,
        avatarUrl,
        leaderboardScore,
        u.getWeeklyScore(),
        u.getMonthlyScore(),
        u.getDayScore(),
        u.getPoints(),
        totalTimeMs,
        false);
  }
}
