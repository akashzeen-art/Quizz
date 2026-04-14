package com.nserve.quiz.domain;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/** Singleton document — only one row ever exists (id = "default"). */
@Document(collection = "economy_config")
public class EconomyConfig {

  @Id private String id = "default";

  // Wallet
  private int quizStartCost = 10;
  private int creditsPerRupee = 2;
  private int starterCredits = 100;

  // Scoring
  private int correctPoints = 10;
  private int wrongPoints = -2;
  private int timeoutPoints = 0;

  // Booster
  private int boosterMultiplier = 2;
  private int boosterDurationMinutes = 10;
  private int boosterConsecutiveWrongTrigger = 2;
  private int boosterInactivityHoursTrigger = 24;
  private double boosterBottomPercentTrigger = 0.40;

  public EconomyConfig() {}

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }

  public int getQuizStartCost() { return quizStartCost; }
  public void setQuizStartCost(int v) { this.quizStartCost = v; }

  public int getCreditsPerRupee() { return creditsPerRupee; }
  public void setCreditsPerRupee(int v) { this.creditsPerRupee = v; }

  public int getStarterCredits() { return starterCredits; }
  public void setStarterCredits(int v) { this.starterCredits = v; }

  public int getCorrectPoints() { return correctPoints; }
  public void setCorrectPoints(int v) { this.correctPoints = v; }

  public int getWrongPoints() { return wrongPoints; }
  public void setWrongPoints(int v) { this.wrongPoints = v; }

  public int getTimeoutPoints() { return timeoutPoints; }
  public void setTimeoutPoints(int v) { this.timeoutPoints = v; }

  public int getBoosterMultiplier() { return boosterMultiplier; }
  public void setBoosterMultiplier(int v) { this.boosterMultiplier = v; }

  public int getBoosterDurationMinutes() { return boosterDurationMinutes; }
  public void setBoosterDurationMinutes(int v) { this.boosterDurationMinutes = v; }

  public int getBoosterConsecutiveWrongTrigger() { return boosterConsecutiveWrongTrigger; }
  public void setBoosterConsecutiveWrongTrigger(int v) { this.boosterConsecutiveWrongTrigger = v; }

  public int getBoosterInactivityHoursTrigger() { return boosterInactivityHoursTrigger; }
  public void setBoosterInactivityHoursTrigger(int v) { this.boosterInactivityHoursTrigger = v; }

  public double getBoosterBottomPercentTrigger() { return boosterBottomPercentTrigger; }
  public void setBoosterBottomPercentTrigger(double v) { this.boosterBottomPercentTrigger = v; }
}
