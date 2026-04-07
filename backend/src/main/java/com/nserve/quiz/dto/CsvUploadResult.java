package com.nserve.quiz.dto;

import java.util.List;

public record CsvUploadResult(
    int questionsUploaded,
    int quizSetsCreated,
    int releasedSetNumber,
    List<String> errors
) {}
