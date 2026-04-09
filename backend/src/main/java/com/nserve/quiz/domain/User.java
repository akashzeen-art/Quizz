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

  /** Lifetime credits spent (e.g. quiz starts). */
  private int totalSpent;

  /** yyyy-MM-dd in UTC — reset dayScore when day changes */
  private String dayScoreDate;

  private List<String> playedDates = new ArrayList<>();

  private Instant createdAt;

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

  public int getTotalSpent() {
    return totalSpent;
  }

  public void setTotalSpent(int totalSpent) {
    this.totalSpent = totalSpent;
  }

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
}
