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
    /** Optional quick-login PIN (exactly 4 digits). */
    String pin,
    /** Optional security recovery question key/text. */
    String securityQuestion,
    /** Optional recovery answer in plaintext (stored hashed). */
    String securityAnswer,
    /** Optional 128-d embedding returned by face service. */
    List<Double> faceEncoding,
    /** For google signup/login flows. */
    String googleCredential) {}

