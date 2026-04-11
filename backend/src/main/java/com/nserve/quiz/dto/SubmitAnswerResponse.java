package com.nserve.quiz.dto;

public record SubmitAnswerResponse(
    boolean correct,
    boolean timedOut,
    int pointsEarned,
    String feedbackMessage,
    int totalScore,
    Integer correctAnswerIndex) {}
