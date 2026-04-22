package com.nserve.quiz.domain;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "users")
public class User {

  @Id private String id;

  /** Sparse: many users are phone-only (email null) or email-only (phone null). */
  @Indexed(unique = true, sparse = true)
  private String email;

  @Indexed(unique = true, sparse = true)
  private String phone;

  /** Google account subject (`sub` claim); links OAuth logins to this user. */
  @Indexed(unique = true, sparse = true)
  private String googleSub;

  private String displayName;
  /** Public gamer tag shown in the app header/leaderboards. */
  @Indexed(unique = true, sparse = true)
  private String gameTag;

  /** City/region label chosen by the user (optional). */
  private String location;

  /** Public URL path served under {@code /files/...} (gallery upload), optional. */
  private String profilePhotoUrl;

  /** Dicebear / preset avatar seed (optional). */
  private String avatarKey;

  /** Subscription label, e.g. FREE, PRO. */
  private String planType;

  /** ACTIVE or INACTIVE. */
  private String planStatus;

  private Instant profileUpdatedAt;

  @Indexed
  private String authToken;

  private List<String> categories = new ArrayList<>();

  private int totalScore;
  private int weeklyScore;
  private int monthlyScore;
  private int points;
  private int dayScore;

  /** Wallet balance for quiz starts and future purchases. */
  private int credits;

  /** Wallet balance in paise (100 paise = ₹1). Primary real-money wallet. */
  private int walletPaise;

  /** Lifetime rupees spent in paise. */
  private int totalSpentPaise;

  /** Lifetime credits spent (e.g. quiz starts). */
  private int totalSpent;

  /** 128-d face embedding used for Face ID login (optional). */
  private List<Double> faceEncoding;

  /** Admin kill-switch for Face ID login when a face is registered. */
  private boolean faceLoginEnabled = true;

  /** BCrypt hash for 4-digit quick login PIN. */
  private String pinHash;

  /** Selected security recovery question. */
  private String securityQuestion;

  /** BCrypt hash of normalized security answer. */
  private String securityAnswerHash;

  /** yyyy-MM-dd in UTC — reset dayScore when day changes */
  private String dayScoreDate;

  private List<String> playedDates = new ArrayList<>();

  private Instant createdAt;

  /** Last successful login time (OTP/PIN/google/email). */
  private Instant lastLogin;

  /** Last API activity (for admin “active” status). */
  private Instant lastActiveAt;

  public User() {}

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getEmail() {
    return email;
  }

  public void setEmail(String email) {
    this.email = email;
  }

  public String getPhone() {
    return phone;
  }

  public void setPhone(String phone) {
    this.phone = phone;
  }

  public String getGoogleSub() {
    return googleSub;
  }

  public void setGoogleSub(String googleSub) {
    this.googleSub = googleSub;
  }

  public String getDisplayName() {
    return displayName;
  }

  public void setDisplayName(String displayName) {
    this.displayName = displayName;
  }

  public String getGameTag() {
    return gameTag;
  }

  public void setGameTag(String gameTag) {
    this.gameTag = gameTag;
  }

  public String getLocation() {
    return location;
  }

  public void setLocation(String location) {
    this.location = location;
  }

  public String getProfilePhotoUrl() {
    return profilePhotoUrl;
  }

  public void setProfilePhotoUrl(String profilePhotoUrl) {
    this.profilePhotoUrl = profilePhotoUrl;
  }

  public String getAvatarKey() {
    return avatarKey;
  }

  public void setAvatarKey(String avatarKey) {
    this.avatarKey = avatarKey;
  }

  public String getPlanType() {
    return planType;
  }

  public void setPlanType(String planType) {
    this.planType = planType;
  }

  public String getPlanStatus() {
    return planStatus;
  }

  public void setPlanStatus(String planStatus) {
    this.planStatus = planStatus;
  }

  public Instant getProfileUpdatedAt() {
    return profileUpdatedAt;
  }

  public void setProfileUpdatedAt(Instant profileUpdatedAt) {
    this.profileUpdatedAt = profileUpdatedAt;
  }

  public String getAuthToken() {
    return authToken;
  }

  public void setAuthToken(String authToken) {
    this.authToken = authToken;
  }

  public List<String> getCategories() {
    return categories;
  }

  public void setCategories(List<String> categories) {
    this.categories = categories;
  }

  public int getTotalScore() {
    return totalScore;
  }

  public void setTotalScore(int totalScore) {
    this.totalScore = totalScore;
  }

  public int getWeeklyScore() {
    return weeklyScore;
  }

  public void setWeeklyScore(int weeklyScore) {
    this.weeklyScore = weeklyScore;
  }

  public int getMonthlyScore() {
    return monthlyScore;
  }

  public void setMonthlyScore(int monthlyScore) {
    this.monthlyScore = monthlyScore;
  }

  public int getPoints() {
    return points;
  }

  public void setPoints(int points) {
    this.points = points;
  }

  public int getDayScore() {
    return dayScore;
  }

  public void setDayScore(int dayScore) {
    this.dayScore = dayScore;
  }

  public int getCredits() {
    return credits;
  }

  public void setCredits(int credits) {
    this.credits = credits;
  }

  public int getWalletPaise() { return walletPaise; }
  public void setWalletPaise(int walletPaise) { this.walletPaise = walletPaise; }

  public int getTotalSpentPaise() { return totalSpentPaise; }
  public void setTotalSpentPaise(int totalSpentPaise) { this.totalSpentPaise = totalSpentPaise; }

  public int getTotalSpent() { return totalSpent; }
  public void setTotalSpent(int totalSpent) { this.totalSpent = totalSpent; }

  public List<Double> getFaceEncoding() { return faceEncoding; }
  public void setFaceEncoding(List<Double> faceEncoding) { this.faceEncoding = faceEncoding; }
  public boolean isFaceLoginEnabled() { return faceLoginEnabled; }
  public void setFaceLoginEnabled(boolean faceLoginEnabled) { this.faceLoginEnabled = faceLoginEnabled; }
  public String getPinHash() { return pinHash; }
  public void setPinHash(String pinHash) { this.pinHash = pinHash; }
  public String getSecurityQuestion() { return securityQuestion; }
  public void setSecurityQuestion(String securityQuestion) { this.securityQuestion = securityQuestion; }
  public String getSecurityAnswerHash() { return securityAnswerHash; }
  public void setSecurityAnswerHash(String securityAnswerHash) { this.securityAnswerHash = securityAnswerHash; }

  public String getDayScoreDate() {
    return dayScoreDate;
  }

  public void setDayScoreDate(String dayScoreDate) {
    this.dayScoreDate = dayScoreDate;
  }

  public List<String> getPlayedDates() {
    return playedDates;
  }

  public void setPlayedDates(List<String> playedDates) {
    this.playedDates = playedDates;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(Instant createdAt) {
    this.createdAt = createdAt;
  }

  public Instant getLastActiveAt() {
    return lastActiveAt;
  }

  public void setLastActiveAt(Instant lastActiveAt) {
    this.lastActiveAt = lastActiveAt;
  }

  public Instant getLastLogin() {
    return lastLogin;
  }

  public void setLastLogin(Instant lastLogin) {
    this.lastLogin = lastLogin;
  }
}
