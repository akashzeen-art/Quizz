package com.nserve.quiz.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ProfileUpdateRequest(
    @NotBlank @Size(max = 80) String displayName,
    @NotBlank @Size(min = 4, max = 24) String gameTag,
    /** When non-null, replaces avatar seed (empty string clears). */
    @Size(max = 64) String avatarKey,
    /** New gallery image path from {@code POST /user/profile/photo}; ignored if blank. */
    @Size(max = 512) String profilePhotoUrl,
    /** When true, deletes stored gallery file and clears {@code profilePhotoUrl}. */
    boolean clearCustomPhoto) {}
