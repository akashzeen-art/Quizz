package com.nserve.quiz.dto;

import jakarta.validation.constraints.NotBlank;

public record ForgotPinVerifyRequest(
    @NotBlank String phone,
    @NotBlank String code,
    @NotBlank String question,
    @NotBlank String answer) {}

