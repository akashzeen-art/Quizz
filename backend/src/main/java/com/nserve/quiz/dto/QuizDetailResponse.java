package com.nserve.quiz.dto;

import java.util.List;

public record QuizDetailResponse(QuizDto quiz, List<QuestionDto> questions) {}
