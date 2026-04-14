package com.nserve.quiz.dto;

import com.nserve.quiz.domain.QuizStatus;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.List;

public record AdminQuizBulkStatusRequest(
    @NotEmpty List<String> quizIds, @NotNull QuizStatus status, Instant startsAt) {}
