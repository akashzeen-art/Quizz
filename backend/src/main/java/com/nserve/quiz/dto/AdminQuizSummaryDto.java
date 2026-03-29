package com.nserve.quiz.dto;

import java.time.Instant;

public record AdminQuizSummaryDto(
    String id,
    String title,
    String category,
    int questionCount,
    Instant createdAt) {}
