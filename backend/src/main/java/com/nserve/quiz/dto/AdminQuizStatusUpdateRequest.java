package com.nserve.quiz.dto;

import com.nserve.quiz.domain.QuizStatus;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;

public record AdminQuizStatusUpdateRequest(@NotNull QuizStatus status, Instant startsAt) {}
