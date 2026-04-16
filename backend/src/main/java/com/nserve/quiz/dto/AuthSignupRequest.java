package com.nserve.quiz.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

public record AuthSignupRequest(
    @NotBlank String method,
    /** Email or phone digits depending on method. For google, can be empty. */
    String identifier,
    @NotBlank String gameTag,
    @NotBlank String name,
    /** Optional avatar seed key (Dicebear). */
    String avatarKey,
    /** For google signup/login flows. */
    String googleCredential) {}

