package com.nserve.quiz.dto;

public record AdminLoginResponse(
    String accessToken, String tokenType, long expiresInSeconds) {}
