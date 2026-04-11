package com.cinepulse.backend.jigsaw;

import com.cinepulse.backend.jigsaw.dto.JigsawStatusResponse;
import com.cinepulse.backend.jigsaw.dto.JigsawSubmitRequest;
import com.cinepulse.backend.jigsaw.dto.JigsawSubmitResponse;
import com.cinepulse.backend.leaderboard.LeaderboardResponse;
import com.cinepulse.backend.leaderboard.LeaderboardService;
import com.cinepulse.backend.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/jigsaw")
@RequiredArgsConstructor
public class JigsawController {

    private final JigsawService jigsawService;
    private final LeaderboardService leaderboardService;

    @GetMapping("/today")
    public ResponseEntity<JigsawStatusResponse> getToday(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(jigsawService.getStatus(user));
    }

    @PostMapping("/submit")
    public ResponseEntity<JigsawSubmitResponse> submit(
            @AuthenticationPrincipal User user,
            @RequestBody JigsawSubmitRequest request) {
        return ResponseEntity.ok(jigsawService.submit(user, request.getTimeTaken()));
    }

    @GetMapping("/leaderboard")
    public ResponseEntity<LeaderboardResponse> leaderboard(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(leaderboardService.getDailyLeaderboard("jigsaw", user.getUsername()));
    }
}
