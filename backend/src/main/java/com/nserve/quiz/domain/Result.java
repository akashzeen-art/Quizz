package com.nserve.quiz.domain;

import java.time.Instant;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "results")
@CompoundIndex(name = "user_quiz", def = "{'userId': 1, 'quizId': 1}")
public class Result {

  @Id private String id;

  private String userId;
  private String quizId;
  private String questionId;
  private boolean correct;
  private boolean timedOut;
  private int pointsEarned;
  private Instant answeredAt;

  public Result() {}

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getUserId() {
    return userId;
  }

  public void setUserId(String userId) {
    this.userId = userId;
  }

  public String getQuizId() {
    return quizId;
  }

  public void setQuizId(String quizId) {
    this.quizId = quizId;
  }

  public String getQuestionId() {
    return questionId;
  }

  public void setQuestionId(String questionId) {
    this.questionId = questionId;
  }

  public boolean isCorrect() { return correct; }
  public void setCorrect(boolean correct) { this.correct = correct; }
  public boolean isTimedOut() { return timedOut; }
  public void setTimedOut(boolean timedOut) { this.timedOut = timedOut; }

  public int getPointsEarned() {
    return pointsEarned;
  }

  public void setPointsEarned(int pointsEarned) {
    this.pointsEarned = pointsEarned;
  }

  public Instant getAnsweredAt() {
    return answeredAt;
  }

  public void setAnsweredAt(Instant answeredAt) {
    this.answeredAt = answeredAt;
  }
}
