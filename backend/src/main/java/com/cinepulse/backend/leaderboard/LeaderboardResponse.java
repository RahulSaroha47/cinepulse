package com.cinepulse.backend.leaderboard;

import java.util.List;

public record LeaderboardResponse(List<LeaderboardEntry> top7, LeaderboardEntry playerRank) {}
