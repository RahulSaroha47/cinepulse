package com.cinepulse.backend.party.dto;

import com.cinepulse.backend.quiz.QuestionType;
import lombok.Data;

import java.util.List;

@Data
public class PartyQuestionDto {
    private int index;               // global question index (0-based)
    private QuestionType type;
    private String questionText;
    private String posterPath;       // null for WHO_SAID_IT / DIRECTORS_CUT
    private List<String> options;
    private String correctAnswer;    // included — local party game, no server validation needed
}
