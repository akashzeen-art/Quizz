package com.nserve.quiz.dto;

import jakarta.validation.constraints.Size;

public record LocationUpdateRequest(
    /** Empty string clears location. */
    @Size(max = 160) String location) {}
