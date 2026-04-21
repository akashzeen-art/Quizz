package com.nserve.quiz.dto;

import jakarta.validation.constraints.NotBlank;

public record VerifyPinRequest(@NotBlank String phone, @NotBlank String pin) {}

