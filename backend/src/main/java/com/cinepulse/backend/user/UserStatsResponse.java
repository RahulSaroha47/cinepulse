package com.cinepulse.backend.user;

public record UserStatsResponse(
        int streak,          // overall streak (any game, consecutive days)
        int quizStreak,      // quiz-specific streak
        int totalScore,
        int rank,
        int gamesPlayed      // total across quiz + wordle + jigsaw
) {}
