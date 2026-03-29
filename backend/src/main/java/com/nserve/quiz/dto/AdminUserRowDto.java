package com.nserve.quiz.dto;

import java.time.Instant;

public record AdminUserRowDto(
    String id,
    String displayName,
    String email,
    String phone,
    String status,
    int totalScore,
    Instant lastActiveAt) {}
