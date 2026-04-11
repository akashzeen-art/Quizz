package com.nserve.quiz.domain;

import java.time.Instant;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "credit_transactions")
public class CreditTransaction {

  public enum Type { credit_added, credit_used }

  @Id private String id;

  @Indexed private String userId;
  private Type type;
  private int amount;
  private int balanceAfter;
  private String description;
  private Instant createdAt;

  public CreditTransaction() {}

  public static CreditTransaction added(String userId, int amount, int balanceAfter, String desc) {
    CreditTransaction t = new CreditTransaction();
    t.userId = userId; t.type = Type.credit_added;
    t.amount = amount; t.balanceAfter = balanceAfter;
    t.description = desc; t.createdAt = Instant.now();
    return t;
  }

  public static CreditTransaction used(String userId, int amount, int balanceAfter, String desc) {
    CreditTransaction t = new CreditTransaction();
    t.userId = userId; t.type = Type.credit_used;
    t.amount = amount; t.balanceAfter = balanceAfter;
    t.description = desc; t.createdAt = Instant.now();
    return t;
  }

  public String getId() { return id; }
  public String getUserId() { return userId; }
  public Type getType() { return type; }
  public int getAmount() { return amount; }
  public int getBalanceAfter() { return balanceAfter; }
  public String getDescription() { return description; }
  public Instant getCreatedAt() { return createdAt; }
}
