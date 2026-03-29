package com.nserve.quiz.seed;

import com.nserve.quiz.domain.InputType;
import com.nserve.quiz.domain.MediaType;
import com.nserve.quiz.domain.Question;
import java.util.ArrayList;
import java.util.List;

/** Generates 100 questions: 50% text, 15% image, 5% video, 20% gif, 10% audio. */
public final class QuestionSeedGenerator {

  private static final String[] CATS = {
    "music", "sports", "food", "art", "science", "movies", "history", "geography"
  };

  private QuestionSeedGenerator() {}

  public static List<Question> generate() {
    List<Question> list = new ArrayList<>();
    int n = 0;
    for (int i = 0; i < 50; i++) {
      list.add(textQuestion(n++, i));
    }
    for (int i = 0; i < 15; i++) {
      list.add(imageQuestion(n++, i));
    }
    for (int i = 0; i < 5; i++) {
      list.add(videoQuestion(n++, i));
    }
    for (int i = 0; i < 20; i++) {
      list.add(gifQuestion(n++, i));
    }
    for (int i = 0; i < 10; i++) {
      list.add(audioQuestion(n++, i));
    }
    return list;
  }

  private static String cat(int i) {
    return CATS[i % CATS.length];
  }

  private static Question textQuestion(int n, int i) {
    String c = cat(i);
    InputType it = InputType.values()[i % 4];
    Question q = new Question();
    q.setCategory(c);
    q.setMediaType(MediaType.none);
    q.setInputType(it);
    switch (it) {
      case mcq4 -> {
        q.setQuestionText(mcqStem(c, n, "text"));
        q.setOptions(List.of("Option A", "Option B", "Option C", "Option D"));
        q.setCorrectAnswerIndex(i % 4);
      }
      case binary -> {
        q.setQuestionText(binaryStem(c, n));
        q.setOptions(List.of("Yes", "No"));
        q.setCorrectAnswerIndex(i % 2);
      }
      case mcq3 -> {
        q.setQuestionText(mcqStem(c, n, "pick"));
        q.setOptions(List.of("First", "Second", "Third"));
        q.setCorrectAnswerIndex(i % 3);
      }
      case slider -> {
        q.setQuestionText(sliderStem(c, n));
        q.setOptions(List.of("0", "100"));
        q.setCorrectNumeric(25.0 + (n % 50));
      }
    }
    return q;
  }

  private static Question imageQuestion(int n, int i) {
    String c = cat(i);
    Question q = new Question();
    q.setQuestionText("What best matches this scene? (#" + (n + 1) + ")");
    q.setMediaUrl("https://picsum.photos/seed/sq" + n + "/400/240");
    q.setMediaType(MediaType.image);
    q.setInputType(InputType.mcq4);
    q.setOptions(List.of("Calm", "Chaotic", "Vintage", "Futuristic"));
    q.setCorrectAnswerIndex(i % 4);
    q.setCategory(c);
    return q;
  }

  private static Question videoQuestion(int n, int i) {
    String c = cat(i);
    Question q = new Question();
    q.setQuestionText("After watching the clip, pick the best tag (#" + (n + 1) + ")");
    q.setMediaUrl("https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4");
    q.setMediaType(MediaType.video);
    q.setInputType(InputType.mcq3);
    q.setOptions(List.of("Action", "Drama", "Comedy"));
    q.setCorrectAnswerIndex(i % 3);
    q.setCategory(c);
    return q;
  }

  private static Question gifQuestion(int n, int i) {
    String c = cat(i);
    String gif =
        (i % 3 == 0)
            ? "https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif"
            : (i % 3 == 1)
                ? "https://media.giphy.com/media/l0MYC0LajbaPoEADu/giphy.gif"
                : "https://media.giphy.com/media/26BRuo6sLetdllPAQ/giphy.gif";
    Question q = new Question();
    q.setQuestionText("What vibe does this GIF give? (#" + (n + 1) + ")");
    q.setMediaUrl(gif);
    q.setMediaType(MediaType.gif);
    q.setInputType(InputType.binary);
    q.setOptions(List.of("Fun", "Serious"));
    q.setCorrectAnswerIndex(i % 2);
    q.setCategory(c);
    return q;
  }

  private static Question audioQuestion(int n, int i) {
    String c = cat(i);
    Question q = new Question();
    q.setQuestionText("Listen and choose the closest genre (#" + (n + 1) + ")");
    q.setMediaUrl("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3");
    q.setMediaType(MediaType.audio);
    q.setInputType(InputType.mcq4);
    q.setOptions(List.of("Orchestral", "Electronic", "Rock", "Jazz"));
    q.setCorrectAnswerIndex(i % 4);
    q.setCategory(c);
    return q;
  }

  private static String mcqStem(String cat, int n, String kind) {
    return "In "
        + cat
        + ", which choice fits this "
        + kind
        + " prompt best? (#"
        + (n + 1)
        + ")";
  }

  private static String binaryStem(String cat, int n) {
    return "Quick " + cat + " check: is this statement mostly true? (#" + (n + 1) + ")";
  }

  private static String sliderStem(String cat, int n) {
    return "Slide to your confidence in "
        + cat
        + " trivia (0-100). Target near the hidden mark. (#"
        + (n + 1)
        + ")";
  }
}
