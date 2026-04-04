package com.cinepulse.backend.quiz;

import com.cinepulse.backend.quiz.dto.QuizResultResponse;
import com.cinepulse.backend.quiz.dto.QuizSubmitRequest;
import com.cinepulse.backend.quiz.dto.TodayQuizResponse;
import com.cinepulse.backend.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/quiz")
@RequiredArgsConstructor
public class QuizController {

    private final QuizService quizService;

    @GetMapping("/today")
    public ResponseEntity<TodayQuizResponse> getToday(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(quizService.getTodayQuiz(user.getEmail()));
    }

    @PostMapping("/submit")
    public ResponseEntity<QuizResultResponse> submit(
            @AuthenticationPrincipal User user,
            @RequestBody QuizSubmitRequest req) {
        return ResponseEntity.ok(quizService.submitQuiz(user.getEmail(), req));
    }
}
