package com.nserve.quiz.dto;

import java.util.List;

public record AdminChartsResponse(
    List<ChartPointDto> participationByDay, List<ChartPointDto> activeUsersByDay) {}
