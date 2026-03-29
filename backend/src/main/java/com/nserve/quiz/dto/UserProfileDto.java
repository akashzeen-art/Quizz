package com.nserve.quiz.dto;

import java.time.Instant;
import java.util.List;

public record UserProfileDto(
    String id,
    String displayName,
    String email,
    String phone,
    int totalScore,
    int weeklyScore,
    int monthlyScore,
    int points,
    int dayScore,
    List<String> categories,
    List<String> playedDates,
    String location,
    String profilePhotoUrl,
    String avatarKey,
    String planType,
    String planStatus,
    Instant profileUpdatedAt) {}
