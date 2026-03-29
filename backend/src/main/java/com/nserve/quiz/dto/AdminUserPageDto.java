package com.nserve.quiz.dto;

import java.util.List;

public record AdminUserPageDto(
    List<AdminUserRowDto> content,
    long totalElements,
    int totalPages,
    int page,
    int size) {}
