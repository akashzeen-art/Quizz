package com.nserve.quiz.dto;

import jakarta.validation.constraints.NotBlank;

public record AdminLoginRequest(
    @NotBlank String email, @NotBlank String password) {}
