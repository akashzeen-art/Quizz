package com.nserve.quiz.dto;

import com.nserve.quiz.constants.CategoryRules;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;

public record PreferencesRequest(
    @NotEmpty
        @Size(min = CategoryRules.MIN_COUNT, max = CategoryRules.MAX_COUNT)
        List<String> categories,
    /** Optional; when present (including empty string), updates {@code User.location}. */
    @Size(max = 160) String location) {}
