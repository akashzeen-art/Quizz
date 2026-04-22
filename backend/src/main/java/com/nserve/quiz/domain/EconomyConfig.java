package com.nserve.quiz.domain;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/** Singleton document — only one row ever exists (id = "default"). */
@Document(collection = "economy_config")
public class EconomyConfig {

  @Id private String id = "default";

  // Wallet (paise: 100 paise = ₹1)
  private int quizStartCost = 10;        // legacy credits (kept for compat)
  private int creditsPerRupee = 2;       // legacy
  private int starterCredits = 100;      // legacy

  // New rupee economy (stored as paise to avoid floats)
  private int quizEntryFeePaise = 1000;  // ₹10 entry fee
  private int correctAnswerPaise = 100;  // +₹1 per correct
  private int wrongAnswerPaise = 10;     // -₹0.10 per wrong (stored positive, applied negative)
  private int starterWalletPaise = 10000; // ₹100 starter wallet
  private int minWithdrawalPaise = 20000; // ₹200 minimum withdrawal

  // Points (winnings)
  private int correctPoints = 10;        // +10 points per correct
  private int wrongPoints = -1;          // -1 point per wrong
  private int timeoutPoints = 0;         // 0 points unanswered

  // Booster removed

  public EconomyConfig() {}

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }

  public int getQuizStartCost() { return quizStartCost; }
  public void setQuizStartCost(int v) { this.quizStartCost = v; }

  public int getCreditsPerRupee() { return creditsPerRupee; }
  public void setCreditsPerRupee(int v) { this.creditsPerRupee = v; }

  public int getStarterCredits() { return starterCredits; }
  public void setStarterCredits(int v) { this.starterCredits = v; }

  public int getQuizEntryFeePaise() { return quizEntryFeePaise; }
  public void setQuizEntryFeePaise(int v) { this.quizEntryFeePaise = v; }

  public int getCorrectAnswerPaise() { return correctAnswerPaise; }
  public void setCorrectAnswerPaise(int v) { this.correctAnswerPaise = v; }

  public int getWrongAnswerPaise() { return wrongAnswerPaise; }
  public void setWrongAnswerPaise(int v) { this.wrongAnswerPaise = v; }

  public int getStarterWalletPaise() { return starterWalletPaise; }
  public void setStarterWalletPaise(int v) { this.starterWalletPaise = v; }

  public int getMinWithdrawalPaise() { return minWithdrawalPaise; }
  public void setMinWithdrawalPaise(int v) { this.minWithdrawalPaise = v; }

  public int getCorrectPoints() { return correctPoints; }
  public void setCorrectPoints(int v) { this.correctPoints = v; }

  public int getWrongPoints() { return wrongPoints; }
  public void setWrongPoints(int v) { this.wrongPoints = v; }

  public int getTimeoutPoints() { return timeoutPoints; }
  public void setTimeoutPoints(int v) { this.timeoutPoints = v; }

}
