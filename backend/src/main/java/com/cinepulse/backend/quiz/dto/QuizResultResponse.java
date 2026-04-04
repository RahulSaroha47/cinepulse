package com.cinepulse.backend.quiz.dto;

import lombok.Data;

import java.util.List;

@Data
public class QuizResultResponse {
    private int totalScore;
    private int baseScore;
    private double streakMultiplier;
    private int newStreak;
    private List<QuestionResult> breakdown;

    @Data
    public static class QuestionResult {
        private Long questionId;
        private String questionText;
        private String selectedAnswer;
        private String correctAnswer;
        private boolean correct;
        private int pointsEarned;
        private int timeLeft;
    }
}
