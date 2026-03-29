package com.nserve.quiz.dto;

import com.nserve.quiz.domain.InputType;
import com.nserve.quiz.domain.MediaType;
import java.util.List;

public record QuestionDto(
    String id,
    String questionText,
    String mediaUrl,
    MediaType mediaType,
    InputType inputType,
    List<String> options,
    String category,
    String documentReference) {}
