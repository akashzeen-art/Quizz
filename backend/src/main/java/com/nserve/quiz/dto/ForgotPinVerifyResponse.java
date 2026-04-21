package com.nserve.quiz.dto;

public record ForgotPinVerifyResponse(boolean verified, String recoveryToken) {}

