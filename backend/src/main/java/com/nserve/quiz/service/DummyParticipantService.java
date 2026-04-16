package com.nserve.quiz.service;

import com.nserve.quiz.dto.LeaderboardEntryDto;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class DummyParticipantService {

  private static final int MIN_REAL_USERS = 20;
  private static final int TARGET_BOARD_SIZE = 25;
  // Top 2 slots are always bots
  private static final int TOP_BOT_COUNT = 2;
  private static final long REFRESH_WINDOW_MS = 30L * 60L * 1000L; // 30 minutes

  // Indian Hindu + Muslim + Western (White + Black), male + female
  private static final String[] INDIAN_HINDU_FIRST = {
    "Arjun","Priya","Rahul","Sneha","Vikram","Ananya","Rohan","Kavya","Amit","Divya",
    "Nikhil","Shreya","Aditya","Meera","Siddharth","Riya","Harsh","Simran","Tanvi","Pallavi"
  };
  private static final String[] INDIAN_MUSLIM_FIRST = {
    "Ayaan","Zoya","Rehan","Aisha","Faizan","Sana","Ibrahim","Hina","Imran","Mariam",
    "Arif","Nazia","Sameer","Rukhsar","Nadeem","Noor","Adil","Farah","Yusuf","Mehwish"
  };
  private static final String[] WESTERN_WHITE_FIRST = {
    "Liam","Olivia","Noah","Emma","James","Sophia","Henry","Amelia","Benjamin","Charlotte",
    "Lucas","Chloe","Ethan","Ava","Jack","Mia","Ryan","Grace","Logan","Hannah"
  };
  private static final String[] WESTERN_BLACK_FIRST = {
    "Malik","Aaliyah","Jamal","Imani","Darius","Nia","Andre","Kiara","Tyrone","Jasmine",
    "Marquis","Tiana","DeShawn","Zuri","Kendrick","Arielle","Rashad","Brianna","Trevon","Nyla"
  };
  private static final String[] INDIAN_LAST = {
    "Sharma","Patel","Singh","Kumar","Verma","Gupta","Joshi","Mehta","Shah","Rao",
    "Nair","Iyer","Reddy","Mishra","Pandey","Tiwari","Chauhan","Yadav","Sinha","Bose",
    "Malhotra","Kapoor","Saxena","Agarwal","Chaudhary","Dubey","Tripathi","Shukla","Bajaj","Khanna"
  };
  private static final String[] MUSLIM_LAST = {
    "Khan","Ansari","Qureshi","Shaikh","Siddiqui","Farooqui","Nadwi","Hashmi","Rizvi","Syed",
    "Abbasi","Momin","Pathan","Mirza","Usmani"
  };
  private static final String[] WESTERN_WHITE_LAST = {
    "Smith","Johnson","Miller","Anderson","Thompson","Baker","Carter","Davis","Evans","Turner"
  };
  private static final String[] WESTERN_BLACK_LAST = {
    "Washington","Jefferson","Jackson","Brooks","Harris","Robinson","Walker","Coleman","Bennett","Parker"
  };

  private volatile long lastRefreshEpochMs = 0L;
  private volatile int refreshSeed = 0;

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
          rank++, e.userId(), e.displayName(), e.avatarSeed(), e.avatarUrl(),
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

    int baseSeed = ensureAndGetRefreshSeed();

    List<LeaderboardEntryDto> bots = new ArrayList<>(real);

    for (int i = 0; i < TOP_BOT_COUNT; i++) {
      int seed = baseSeed + i * 53;
      String name = randomBotName(seed);
      String uid = "dummy_top_" + i;
      String avatarSeed = "bot-top-" + Math.abs(seed);

      // Top bot: topRealScore + 50..200 (clearly ahead)
      // Second bot: topRealScore + 20..80
      int gap = i == 0 ? 50 + (Math.abs(seed * 7) % 150) : 20 + (Math.abs(seed * 11) % 60);
      int score = topRealScore + gap;

      int weekly  = (int)(score * 0.45);
      int monthly = (int)(score * 0.75);
      int daily   = (int)(score * 0.18);
      int points  = score / 3;

      bots.add(new LeaderboardEntryDto(
          0, uid, name, avatarSeed, null, score, weekly, monthly, daily, points, 0L, true));
    }
    return bots;
  }

  private List<LeaderboardEntryDto> generateFillDummies(int count, int userScore, String sort) {
    // Keep fill dummies stable within refresh window (30 mins)
    int daySeed = ensureAndGetRefreshSeed() * 31;
    List<LeaderboardEntryDto> dummies = new ArrayList<>();

    for (int i = 0; i < count; i++) {
      int seed = daySeed + (i + 10) * 7;
      String name = randomBotName(seed);
      String uid = "dummy_fill_" + seed;
      String avatarSeed = "bot-fill-" + Math.abs(seed);

      // Place below user
      int score = Math.max(0, userScore - 5 - (Math.abs(seed * 11) % 75));
      int weekly  = (int)(score * 0.4);
      int monthly = (int)(score * 0.7);
      int daily   = (int)(score * 0.15);
      int points  = score / 3;

      dummies.add(new LeaderboardEntryDto(
          0, uid, name, avatarSeed, null, score, weekly, monthly, daily, points, 0L, true));
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

  private int ensureAndGetRefreshSeed() {
    long now = Instant.now().toEpochMilli();
    long last = lastRefreshEpochMs;
    if (last == 0L || now - last >= REFRESH_WINDOW_MS) {
      synchronized (this) {
        long again = lastRefreshEpochMs;
        if (again == 0L || now - again >= REFRESH_WINDOW_MS) {
          lastRefreshEpochMs = now;
          refreshSeed = (int) (now / REFRESH_WINDOW_MS);
        }
      }
    }
    return refreshSeed;
  }

  private static String randomBotName(int seed) {
    int bucket = Math.abs(seed) % 4;
    if (bucket == 0) {
      String f = INDIAN_HINDU_FIRST[Math.abs(seed * 3 + 7) % INDIAN_HINDU_FIRST.length];
      String l = INDIAN_LAST[Math.abs(seed * 5 + 11) % INDIAN_LAST.length];
      return f + " " + l;
    }
    if (bucket == 1) {
      String f = INDIAN_MUSLIM_FIRST[Math.abs(seed * 3 + 13) % INDIAN_MUSLIM_FIRST.length];
      String l = MUSLIM_LAST[Math.abs(seed * 5 + 17) % MUSLIM_LAST.length];
      return f + " " + l;
    }
    if (bucket == 2) {
      String f = WESTERN_WHITE_FIRST[Math.abs(seed * 3 + 19) % WESTERN_WHITE_FIRST.length];
      String l = WESTERN_WHITE_LAST[Math.abs(seed * 5 + 23) % WESTERN_WHITE_LAST.length];
      return f + " " + l;
    }
    String f = WESTERN_BLACK_FIRST[Math.abs(seed * 3 + 29) % WESTERN_BLACK_FIRST.length];
    String l = WESTERN_BLACK_LAST[Math.abs(seed * 5 + 31) % WESTERN_BLACK_LAST.length];
    return f + " " + l;
  }
}
