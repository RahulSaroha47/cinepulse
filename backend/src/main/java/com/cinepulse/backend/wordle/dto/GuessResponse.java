package com.cinepulse.backend.wordle.dto;

import lombok.Data;

@Data
public class GuessResponse {
    private boolean correct;
    private boolean solved;
    private boolean failed;
    private int guessCount;
    private int score;
    private ClueDto nextClue;      // non-null when wrong and a new clue is unlocked
    private MovieRevealDto movie;  // non-null when solved or failed
}
