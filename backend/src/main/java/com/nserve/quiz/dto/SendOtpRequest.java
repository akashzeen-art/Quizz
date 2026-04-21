package com.nserve.quiz.dto;

import jakarta.validation.constraints.NotBlank;

public record SendOtpRequest(@NotBlank String phone) {}

