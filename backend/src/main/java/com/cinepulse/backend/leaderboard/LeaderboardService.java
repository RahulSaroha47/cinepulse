package com.cinepulse.backend.leaderboard;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class LeaderboardService {

    private static final String OVERALL_KEY = "lb:overall";
    private static final int TOP_N = 7;

    private final StringRedisTemplate redis;

    // ── Write ─────────────────────────────────────────────────────

    public void addDailyScore(String game, String username, int score) {
        String key = dailyKey(game);
        redis.opsForZSet().add(key, username, score);
        redis.expire(key, Duration.ofDays(2));
    }

    public void updateOverallScore(String username, int totalScore) {
        redis.opsForZSet().add(OVERALL_KEY, username, totalScore);
    }

    // ── Read ──────────────────────────────────────────────────────

    public LeaderboardResponse getDailyLeaderboard(String game, String username) {
        return getLeaderboard(dailyKey(game), username);
    }

    public LeaderboardResponse getOverallLeaderboard(String username) {
        return getLeaderboard(OVERALL_KEY, username);
    }

    // ── Helpers ───────────────────────────────────────────────────

    private LeaderboardResponse getLeaderboard(String key, String username) {
        Set<ZSetOperations.TypedTuple<String>> raw =
                redis.opsForZSet().reverseRangeWithScores(key, 0, TOP_N - 1);

        List<LeaderboardEntry> top7 = new ArrayList<>();
        if (raw != null) {
            int rank = 1;
            for (ZSetOperations.TypedTuple<String> t : raw) {
                top7.add(new LeaderboardEntry(rank++, t.getValue(), t.getScore().intValue()));
            }
        }

        LeaderboardEntry playerEntry = null;
        if (username != null) {
            Long rev = redis.opsForZSet().reverseRank(key, username);
            Double score = redis.opsForZSet().score(key, username);
            if (rev != null && score != null) {
                playerEntry = new LeaderboardEntry((int) (rev + 1), username, score.intValue());
            }
        }

        return new LeaderboardResponse(top7, playerEntry);
    }

    private String dailyKey(String game) {
        return "lb:" + game + ":" + LocalDate.now();
    }
}
