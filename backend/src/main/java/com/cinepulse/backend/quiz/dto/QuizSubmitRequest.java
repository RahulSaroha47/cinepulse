package com.cinepulse.backend.quiz.dto;

import lombok.Data;

import java.util.List;

@Data
public class QuizSubmitRequest {
    private List<AnswerSubmission> answers;
}
