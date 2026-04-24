package com.cinepulse.backend.review;

public record ReviewResponse(
        Long id,
        String username,
        int rating,
        String body,
        String createdAt   // ISO date string e.g. "2026-04-12"
) {}
