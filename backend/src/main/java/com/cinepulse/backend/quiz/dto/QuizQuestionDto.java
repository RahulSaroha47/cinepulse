package com.cinepulse.backend.quiz.dto;

import com.cinepulse.backend.quiz.QuestionType;
import lombok.Data;

import java.util.List;

@Data
public class QuizQuestionDto {
    private Long id;
    private QuestionType type;
    private String questionText;
    private String posterPath;      // null for WHO_SAID_IT / DIRECTORS_CUT
    private List<String> options;
    private int basePoints;         // 150 for POSTER_BLIND, 100 for others
}
