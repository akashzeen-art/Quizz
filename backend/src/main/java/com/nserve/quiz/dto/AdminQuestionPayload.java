package com.nserve.quiz.dto;

import com.nserve.quiz.domain.InputType;
import com.nserve.quiz.domain.MediaType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record AdminQuestionPayload(
    @NotBlank String questionText,
    String mediaUrl,
    @NotNull MediaType mediaType,
    @NotNull InputType inputType,
    @NotNull @Size(min = 2, max = 8) List<String> options,
    Integer correctAnswerIndex,
    Double correctNumeric,
    @NotBlank String category,
    String documentReference) {}
