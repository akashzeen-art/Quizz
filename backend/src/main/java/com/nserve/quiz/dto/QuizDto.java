package com.nserve.quiz.dto;

import com.nserve.quiz.domain.QuizStatus;
import java.time.Instant;

public record QuizDto(
    String id,
    String title,
    String description,
    QuizStatus status,
    Instant startsAt,
    Instant endsAt,
    int questionCount,
    String referenceDocumentUrl,
    String referenceDocumentName) {}
