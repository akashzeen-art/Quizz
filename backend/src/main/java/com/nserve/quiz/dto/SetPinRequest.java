package com.nserve.quiz.dto;

import jakarta.validation.constraints.NotBlank;

public record SetPinRequest(@NotBlank String pin) {}

