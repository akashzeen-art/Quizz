package com.nserve.quiz.dto;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record AdminQuizBulkDeleteRequest(@NotEmpty List<String> quizIds) {}

