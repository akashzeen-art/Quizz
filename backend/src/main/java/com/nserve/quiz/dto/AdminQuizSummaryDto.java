package com.nserve.quiz.dto;

import com.nserve.quiz.domain.QuizStatus;
import java.time.Instant;

public record AdminQuizSummaryDto(
    String id,
    String title,
    String category,
    int questionCount,
    QuizStatus status,
    Instant startsAt,
    Instant createdAt) {}
