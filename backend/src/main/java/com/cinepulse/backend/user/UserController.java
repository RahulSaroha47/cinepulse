package com.cinepulse.backend.user;

import com.cinepulse.backend.quiz.QuizAttemptRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final QuizAttemptRepository quizAttemptRepository;

    @GetMapping("/me/stats")
    public ResponseEntity<UserStatsResponse> getMyStats(@AuthenticationPrincipal User user) {
        int rank = userRepository.findRankByScore(user.getTotalScore());
        int quizzesCompleted = (int) quizAttemptRepository.countByUser(user);
        return ResponseEntity.ok(new UserStatsResponse(
                user.getStreak(),
                user.getTotalScore(),
                rank,
                quizzesCompleted
        ));
    }
}
