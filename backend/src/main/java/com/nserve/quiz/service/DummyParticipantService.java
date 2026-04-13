package com.nserve.quiz.service;

import com.nserve.quiz.dto.LeaderboardEntryDto;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class DummyParticipantService {

  private static final int MIN_REAL_USERS = 20;
  private static final int TARGET_BOARD_SIZE = 25;
  // Top 2 slots are always bots
  private static final int TOP_BOT_COUNT = 2;

  private static final String[] FIRST = {
    "Arjun","Priya","Rahul","Sneha","Vikram","Ananya","Rohan","Kavya","Amit","Divya",
    "Karan","Pooja","Nikhil","Shreya","Aditya","Meera","Siddharth","Riya","Varun","Nisha",
    "Harsh","Simran","Akash","Tanvi","Rajesh","Swati","Deepak","Anjali","Suresh","Neha",
    "Yash","Kritika","Mohit","Pallavi","Gaurav","Shweta","Tarun","Isha","Vivek","Preeti"
  };
  private static final String[] LAST = {
    "Sharma","Patel","Singh","Kumar","Verma","Gupta","Joshi","Mehta","Shah","Rao",
    "Nair","Iyer","Reddy","Mishra","Pandey","Tiwari","Chauhan","Yadav","Sinha","Bose",
    "Malhotra","Kapoor","Saxena","Agarwal","Chaudhary","Dubey","Tripathi","Shukla","Bajaj","Khanna"
  };

  public List<LeaderboardEntryDto> fill(List<LeaderboardEntryDto> real, String currentUserId, String sort) {
    // Always inject top 2 bots regardless of real user count
    List<LeaderboardEntryDto> result = new ArrayList<>(injectTopBots(real, sort));

    // Also fill remaining slots if real users are few
    if (real.size() < MIN_REAL_USERS) {
      int needed = TARGET_BOARD_SIZE - result.size();
      if (needed > 0) {
        int userScore = real.stream()
            .filter(e -> e.userId().equals(currentUserId))
            .mapToInt(e -> scoreForSort(e, sort))
            .findFirst()
            .orElse(50);
        result.addAll(generateFillDummies(needed, userScore, sort));
      }
    }

    // Sort by score desc, re-rank
    result.sort((a, b) -> Integer.compare(scoreForSort(b, sort), scoreForSort(a, sort)));
    List<LeaderboardEntryDto> ranked = new ArrayList<>();
    int rank = 1;
    for (LeaderboardEntryDto e : result) {
      ranked.add(new LeaderboardEntryDto(
          rank++, e.userId(), e.displayName(),
          e.totalScore(), e.weeklyScore(), e.monthlyScore(),
          e.dayScore(), e.points(), e.totalTimeMs(), e.dummy()));
    }
    return ranked;
  }

  /**
   * Always generates 2 top bots.
   * Names and scores change every HOUR so they feel dynamic.
   */
  private List<LeaderboardEntryDto> injectTopBots(List<LeaderboardEntryDto> real, String sort) {
    // Find the current highest real score so bots are always above
    int topRealScore = real.stream()
        .mapToInt(e -> scoreForSort(e, sort))
        .max()
        .orElse(100);

    // Seed changes every hour → names/scores rotate hourly
    LocalDateTime now = LocalDateTime.now();
    int hourSeed = (now.getDayOfYear() * 24 + now.getHour()) * 37;

    List<LeaderboardEntryDto> bots = new ArrayList<>(real);

    for (int i = 0; i < TOP_BOT_COUNT; i++) {
      int seed = hourSeed + i * 53;
      String name = FIRST[Math.abs(seed) % FIRST.length] + " " + LAST[Math.abs(seed / FIRST.length) % LAST.length];
      String uid = "dummy_top_" + i;

      // Top bot: topRealScore + 50..200 (clearly ahead)
      // Second bot: topRealScore + 20..80
      int gap = i == 0 ? 50 + (Math.abs(seed * 7) % 150) : 20 + (Math.abs(seed * 11) % 60);
      int score = topRealScore + gap;

      int weekly  = (int)(score * 0.45);
      int monthly = (int)(score * 0.75);
      int daily   = (int)(score * 0.18);
      int points  = score / 3;

      bots.add(new LeaderboardEntryDto(
          0, uid, name, score, weekly, monthly, daily, points, 0L, true));
    }
    return bots;
  }

  private List<LeaderboardEntryDto> generateFillDummies(int count, int userScore, String sort) {
    // Day seed for fill dummies (stable within a day)
    int daySeed = LocalDateTime.now().getDayOfYear() * 31;
    List<LeaderboardEntryDto> dummies = new ArrayList<>();

    for (int i = 0; i < count; i++) {
      int seed = daySeed + (i + 10) * 7;
      String name = FIRST[Math.abs(seed) % FIRST.length] + " " + LAST[Math.abs(seed / FIRST.length) % LAST.length];
      String uid = "dummy_fill_" + seed;

      // Place below user
      int score = Math.max(0, userScore - 5 - (Math.abs(seed * 11) % 75));
      int weekly  = (int)(score * 0.4);
      int monthly = (int)(score * 0.7);
      int daily   = (int)(score * 0.15);
      int points  = score / 3;

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
