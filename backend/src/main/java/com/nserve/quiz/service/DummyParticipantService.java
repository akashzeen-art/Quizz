package com.nserve.quiz.service;

import com.nserve.quiz.dto.LeaderboardEntryDto;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class DummyParticipantService {

  private static final int MIN_REAL_USERS = 20;
  private static final int TARGET_BOARD_SIZE = 25;

  // Deterministic name pool — same names every day
  private static final String[] FIRST = {
    "Arjun","Priya","Rahul","Sneha","Vikram","Ananya","Rohan","Kavya","Amit","Divya",
    "Karan","Pooja","Nikhil","Shreya","Aditya","Meera","Siddharth","Riya","Varun","Nisha",
    "Harsh","Simran","Akash","Tanvi","Rajesh","Swati","Deepak","Anjali","Suresh","Neha"
  };
  private static final String[] LAST = {
    "Sharma","Patel","Singh","Kumar","Verma","Gupta","Joshi","Mehta","Shah","Rao",
    "Nair","Iyer","Reddy","Mishra","Pandey","Tiwari","Chauhan","Yadav","Sinha","Bose"
  };

  /**
   * Fills the leaderboard with dummy entries when real users are fewer than MIN_REAL_USERS.
   * Dummies are placed around the real user's position to create competition.
   */
  public List<LeaderboardEntryDto> fill(List<LeaderboardEntryDto> real, String currentUserId, String sort) {
    if (real.size() >= MIN_REAL_USERS) return real;

    int needed = TARGET_BOARD_SIZE - real.size();
    if (needed <= 0) return real;

    // Find current user's score to place dummies above and below
    int userScore = real.stream()
        .filter(e -> e.userId().equals(currentUserId))
        .mapToInt(e -> scoreForSort(e, sort))
        .findFirst()
        .orElse(50);

    List<LeaderboardEntryDto> dummies = generateDummies(needed, userScore, sort);

    // Merge real + dummies, sort by score desc
    List<LeaderboardEntryDto> merged = new ArrayList<>(real);
    merged.addAll(dummies);
    merged.sort((a, b) -> Integer.compare(scoreForSort(b, sort), scoreForSort(a, sort)));

    // Re-rank
    List<LeaderboardEntryDto> result = new ArrayList<>();
    int rank = 1;
    for (LeaderboardEntryDto e : merged) {
      result.add(new LeaderboardEntryDto(
          rank++, e.userId(), e.displayName(),
          e.totalScore(), e.weeklyScore(), e.monthlyScore(),
          e.dayScore(), e.points(), e.totalTimeMs(), e.dummy()));
    }
    return result;
  }

  private List<LeaderboardEntryDto> generateDummies(int count, int userScore, String sort) {
    // Use day-of-year as seed so dummies are consistent within a day
    int daySeed = LocalDate.now().getDayOfYear() * 31;
    List<LeaderboardEntryDto> dummies = new ArrayList<>();

    for (int i = 0; i < count; i++) {
      int seed = daySeed + i * 7;
      String name = FIRST[seed % FIRST.length] + " " + LAST[(seed / FIRST.length) % LAST.length];
      String uid = "dummy_" + seed;

      // Distribute scores: half above user, half below
      int score;
      if (i < count / 2) {
        // above user: userScore + 10..100
        score = userScore + 10 + ((seed * 13) % 90);
      } else {
        // below user: max(0, userScore - 5..80)
        score = Math.max(0, userScore - 5 - ((seed * 11) % 75));
      }

      int weekly  = (int)(score * 0.4);
      int monthly = (int)(score * 0.7);
      int daily   = (int)(score * 0.15);
      int points  = score / 3;

      int s = switch (sort == null ? "total" : sort) {
        case "weekly"  -> weekly;
        case "monthly" -> monthly;
        case "daily"   -> daily;
        case "points"  -> points;
        default        -> score;
      };

      dummies.add(new LeaderboardEntryDto(
          0, uid, name, score, weekly, monthly, daily, points, 0L, true));
    }
    return dummies;
  }

  private static int scoreForSort(LeaderboardEntryDto e, String sort) {
    return switch (sort == null ? "total" : sort) {
      case "weekly"  -> e.weeklyScore();
      case "monthly" -> e.monthlyScore();
      case "daily"   -> e.dayScore();
      case "points"  -> e.points();
      default        -> e.totalScore();
    };
  }
}
