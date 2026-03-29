package com.nserve.quiz.service;

import java.util.List;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.stereotype.Service;

@Service
public class FeedbackService {

  private static final List<String> CORRECT =
      List.of(
          "Nailed it! Pure genius.",
          "You're on fire now!",
          "Total masterclass right there.",
          "Spot on. Keep rolling!",
          "Boom! You got it.",
          "Brain power: 100%.",
          "Sharp as a tack!",
          "Nothing gets past you.",
          "Simply flawless work.",
          "Look at you go!");

  private static final List<String> WRONG =
      List.of(
          "Close! Try again soon.",
          "Next one is yours!",
          "Shake it off, Champ!",
          "Almost had it there.",
          "Keep that focus up!",
          "A lesson learned today.",
          "Nice try, stay sharp!",
          "Dust off, keep going!",
          "Smart effort, keep swinging.",
          "Your comeback starts now!");

  public String random(boolean correct) {
    var list = correct ? CORRECT : WRONG;
    return list.get(ThreadLocalRandom.current().nextInt(list.size()));
  }
}
