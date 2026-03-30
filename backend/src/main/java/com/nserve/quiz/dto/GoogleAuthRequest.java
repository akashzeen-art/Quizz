package com.nserve.quiz.dto;

import jakarta.validation.constraints.NotBlank;

/** GIS / OAuth credential (JWT) from the Google Identity Services client. */
public record GoogleAuthRequest(@NotBlank String credential) {}
