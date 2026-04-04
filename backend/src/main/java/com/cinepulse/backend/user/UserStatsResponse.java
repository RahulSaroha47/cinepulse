package com.cinepulse.backend.user;

public record UserStatsResponse(
        int streak,
        int totalScore,
        int rank,
        int quizzesCompleted
) {}
