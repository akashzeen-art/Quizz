package com.nserve.quiz.dto;

import java.util.List;

public record FaceMatchRequest(List<Candidate> candidates, Double threshold) {
  public record Candidate(String userId, List<Double> encoding) {}
}

