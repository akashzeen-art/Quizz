package com.nserve.quiz.dto;

import java.util.List;

public record PdfQuizUploadResultDto(
    int totalQuestions,
    int quizSetsCreated,
    boolean savedAsDraft,
    List<PdfQuizSetDto> sets,
    List<String> errors) {

  public record PdfQuizSetDto(String title, int questionCount, List<String> sampleQuestions) {}
}
