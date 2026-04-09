package com.nserve.quiz.dto;

import jakarta.validation.constraints.NotBlank;

public record DeductCreditsRequest(
    @NotBlank String quizId, @NotBlank String clientRequestId) {}
