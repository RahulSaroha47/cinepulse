package com.cinepulse.backend.user;

import com.cinepulse.backend.jigsaw.JigsawAttemptRepository;
import com.cinepulse.backend.quiz.QuizAttemptRepository;
import com.cinepulse.backend.wordle.WordleAttemptRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final WordleAttemptRepository wordleAttemptRepository;
    private final JigsawAttemptRepository jigsawAttemptRepository;

    @GetMapping("/me/stats")
    public ResponseEntity<UserStatsResponse> getMyStats(@AuthenticationPrincipal User user) {
        int rank = userRepository.findRankByScore(user.getTotalScore());
        int gamesPlayed = (int) (
                quizAttemptRepository.countByUser(user) +
                wordleAttemptRepository.countByUser(user) +
                jigsawAttemptRepository.countByUser(user)
        );
        return ResponseEntity.ok(new UserStatsResponse(
                user.getOverallStreak(),
                user.getStreak(),
                user.getTotalScore(),
                rank,
                gamesPlayed
        ));
    }
}
