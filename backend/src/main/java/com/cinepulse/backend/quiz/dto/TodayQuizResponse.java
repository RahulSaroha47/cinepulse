package com.cinepulse.backend.quiz.dto;

import lombok.Data;

import java.util.List;

@Data
public class TodayQuizResponse {
    private String quizDate;
    private String theme;
    private String themePosterPath;
    private boolean alreadyCompleted;
    private Integer previousScore;          // null if not yet completed
    private List<QuizQuestionDto> questions;
}
