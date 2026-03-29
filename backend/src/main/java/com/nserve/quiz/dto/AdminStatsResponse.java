package com.nserve.quiz.dto;

public record AdminStatsResponse(
    long totalUsers,
    long activeUsers,
    long inactiveUsers,
    long totalQuizzes,
    long totalQuestions,
    int activeWindowMinutes) {}
