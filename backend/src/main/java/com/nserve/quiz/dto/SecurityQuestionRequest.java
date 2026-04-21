package com.nserve.quiz.dto;

import jakarta.validation.constraints.NotBlank;

public record SecurityQuestionRequest(@NotBlank String question, @NotBlank String answer) {}

