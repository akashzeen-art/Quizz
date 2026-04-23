package com.nserve.quiz.dto;

import java.time.Instant;
import java.util.List;

public record UserProfileDto(
    String id,
    String displayName,
    String gameTag,
    boolean pinSet,
    boolean securityQuestionSet,
    String securityQuestion,
    boolean faceRegistered,
    boolean faceLoginEnabled,
    String email,
    String phone,
    int totalScore,
    int weeklyScore,
    int monthlyScore,
    int points,
    int dayScore,
    int credits,
    int totalSpent,
    int walletPaise,
    double walletRupees,
    int totalSpentPaise,
    List<String> categories,
    List<String> playedDates,
    String location,
    String profilePhotoUrl,
    String avatarKey,
    String planType,
    String planStatus,
    boolean rulesConfirmed,
    Instant profileUpdatedAt) {}
