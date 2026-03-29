package com.nserve.quiz.dto;

import jakarta.validation.constraints.NotBlank;

public record OtpRequest(@NotBlank String phone, @NotBlank String otp) {}
