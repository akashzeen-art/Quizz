package com.nserve.quiz.service;

import com.nserve.quiz.domain.User;
import com.nserve.quiz.repo.UserRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class BoosterService {

  private static final int BOOSTER_DURATION_MINUTES = 10;
  private static final int CONSECUTIVE_WRONG_TRIGGER = 2;   // 2+ wrong in a row
  private static final int INACTIVITY_HOURS_TRIGGER = 24;   // inactive 1+ day
  private static final double BOTTOM_PERCENT_TRIGGER = 0.40; // bottom 40%

  private final UserRepository userRepository;

  public BoosterService(UserRepository userRepository) {
    this.userRepository = userRepository;
  }

  /** Check if user currently has an active booster */
  public boolean isBoosterActive(User user) {
    return user.getBoosterActiveUntil() != null
        && user.getBoosterActiveUntil().isAfter(Instant.now());
  }

  /** Returns remaining booster seconds, 0 if inactive */
  public long boosterSecondsLeft(User user) {
    if (!isBoosterActive(user)) return 0;
    return Math.max(0, Instant.now().until(user.getBoosterActiveUntil(), ChronoUnit.SECONDS));
  }

  /**
   * Evaluate all trigger conditions after an answer.
   * Activates booster if any condition is met and booster not already active.
   */
  public boolean evaluateAndActivate(User user, boolean correct, boolean timedOut) {
    if (isBoosterActive(user)) return false; // already active

    User u = userRepository.findById(user.getId()).orElse(user);

    // Trigger 1: consecutive wrong answers
    if (!correct && !timedOut) {
      u.setConsecutiveWrong(u.getConsecutiveWrong() + 1);
    } else if (correct) {
      u.setConsecutiveWrong(0); // reset on correct
    }

    boolean trigger = false;

    // Trigger 1: 2+ consecutive wrong
    if (u.getConsecutiveWrong() >= CONSECUTIVE_WRONG_TRIGGER) {
      trigger = true;
    }

    // Trigger 2: user inactive for 24+ hours
    if (!trigger && u.getLastActiveAt() != null) {
      long hoursSinceActive = u.getLastActiveAt().until(Instant.now(), ChronoUnit.HOURS);
      if (hoursSinceActive >= INACTIVITY_HOURS_TRIGGER) trigger = true;
    }

    // Trigger 3: bottom 40% rank
    if (!trigger) {
      trigger = isBottomPercent(u);
    }

    if (trigger) {
      u.setBoosterActiveUntil(Instant.now().plus(BOOSTER_DURATION_MINUTES, ChronoUnit.MINUTES));
      u.setConsecutiveWrong(0); // reset after activation
      userRepository.save(u);
      return true;
    }

    userRepository.save(u); // save consecutiveWrong update
    return false;
  }

  private boolean isBottomPercent(User user) {
    try {
      List<User> all = userRepository.findAll();
      if (all.size() < 5) return false; // not enough users to rank
      all.sort((a, b) -> Integer.compare(b.getTotalScore(), a.getTotalScore()));
      int userRank = -1;
      for (int i = 0; i < all.size(); i++) {
        if (all.get(i).getId().equals(user.getId())) { userRank = i + 1; break; }
      }
      if (userRank < 0) return false;
      double percentile = (double) userRank / all.size();
      return percentile >= (1.0 - BOTTOM_PERCENT_TRIGGER); // bottom 40%
    } catch (Exception e) {
      return false;
    }
  }
}
