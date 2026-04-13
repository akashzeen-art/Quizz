package com.nserve.quiz.domain;

import java.time.Instant;
import java.util.List;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

/** One row per paid quiz start; {@code clientRequestId} is the idempotency key from the client. */
@Document(collection = "quiz_play_entitlements")
public class QuizPlayEntitlement {

  @Id private String id;

  @Indexed private String userId;

  @Indexed private String quizId;

  private String clientRequestId;

  /** Shuffled question IDs for this session — same order on refresh, different each new session. */
  private List<String> questionOrder;

  private Instant createdAt;
  private Instant expiresAt;

  public QuizPlayEntitlement() {}

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }
  public String getUserId() { return userId; }
  public void setUserId(String userId) { this.userId = userId; }
  public String getQuizId() { return quizId; }
  public void setQuizId(String quizId) { this.quizId = quizId; }
  public String getClientRequestId() { return clientRequestId; }
  public void setClientRequestId(String clientRequestId) { this.clientRequestId = clientRequestId; }
  public List<String> getQuestionOrder() { return questionOrder; }
  public void setQuestionOrder(List<String> questionOrder) { this.questionOrder = questionOrder; }
  public Instant getCreatedAt() { return createdAt; }
  public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
  public Instant getExpiresAt() { return expiresAt; }
  public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }
}
