package com.nserve.quiz.dto;

import jakarta.validation.constraints.NotBlank;

public record ResetPinRequest(@NotBlank String recoveryToken, @NotBlank String pin) {}

