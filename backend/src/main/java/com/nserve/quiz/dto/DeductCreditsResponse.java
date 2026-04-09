package com.nserve.quiz.dto;

public record DeductCreditsResponse(
    int credits, int totalSpent, String clientRequestId, String quizId) {}
