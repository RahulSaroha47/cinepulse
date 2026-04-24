package com.cinepulse.backend.quiz.dto;

import lombok.Data;

@Data
public class AnswerSubmission {
    private Long questionId;
    private String selectedAnswer;
    private int timeLeft;   // seconds remaining when answered (0-20)
}
