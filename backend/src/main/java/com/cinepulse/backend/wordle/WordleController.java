package com.cinepulse.backend.wordle;

import com.cinepulse.backend.leaderboard.LeaderboardResponse;
import com.cinepulse.backend.leaderboard.LeaderboardService;
import com.cinepulse.backend.user.User;
import com.cinepulse.backend.wordle.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/daily-movie")
@RequiredArgsConstructor
public class WordleController {

    private final WordleService wordleService;
    private final LeaderboardService leaderboardService;

    @GetMapping("/today")
    public ResponseEntity<WordleStatusResponse> getToday(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(wordleService.getStatus(user));
    }

    @PostMapping("/guess")
    public ResponseEntity<GuessResponse> submitGuess(
            @AuthenticationPrincipal User user,
            @RequestBody GuessRequest request) {
        return ResponseEntity.ok(wordleService.submitGuess(user, request.getGuess()));
    }

    @GetMapping("/movies")
    public ResponseEntity<List<MovieTitleDto>> getMovies() {
        return ResponseEntity.ok(wordleService.getAllMovieTitles());
    }

    @GetMapping("/leaderboard")
    public ResponseEntity<LeaderboardResponse> leaderboard(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(leaderboardService.getDailyLeaderboard("wordle", user.getUsername()));
    }
}
