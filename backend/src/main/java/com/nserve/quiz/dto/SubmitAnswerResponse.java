package com.nserve.quiz.dto;

public record SubmitAnswerResponse(
    boolean correct,
    int pointsEarned,
    String feedbackMessage,
    int totalScore,
    Integer correctAnswerIndex) {}
