package com.nserve.quiz.dto;

public record OtpVerifyResponse(String token, UserProfileDto user, boolean newUser) {}

