package com.nserve.quiz.dto;

import com.nserve.quiz.domain.QuizStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;

public record AdminQuizCreateRequest(
    @NotBlank String title,
    @NotBlank String category,
    String description,
    @NotNull QuizStatus status,
    @Min(5) @Max(120) int secondsPerQuestion,
    Instant startsAt,
    Instant endsAt,
    String referenceDocumentUrl,
    String referenceDocumentName,
    @NotNull @Valid @Size(min = 1, max = 100) List<AdminQuestionPayload> questions) {}
