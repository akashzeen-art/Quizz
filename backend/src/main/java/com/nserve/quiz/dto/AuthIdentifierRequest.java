package com.nserve.quiz.dto;

import jakarta.validation.constraints.NotBlank;

public record AuthIdentifierRequest(@NotBlank String identifier) {}

