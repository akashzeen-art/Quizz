package com.nserve.quiz.dto;

/**
 * Full score snapshot for one row. {@code rank} is for the active sort on the leaderboard request.
 */
public record LeaderboardEntryDto(
    int rank,
    String userId,
    String displayName,
    int totalScore,
    int weeklyScore,
    int monthlyScore,
    int points) {}
