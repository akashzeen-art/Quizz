package com.nserve.quiz.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record SubmitAnswerRequest(
    @NotBlank String quizId,
    @NotBlank String questionId,
    Integer answerIndex,
    Double sliderValue,
    @NotNull Long timeMs) {}
