package com.cinepulse.backend.wordle.dto;

import lombok.Data;

import java.util.List;

@Data
public class WordleStatusResponse {
    private String date;
    private List<ClueDto> clues;
    private List<String> guesses;
    private int guessCount;
    private int maxGuesses;
    private boolean solved;
    private boolean failed;
    private String backgroundPosterPath; // always set, used for blurred bg
    // Only set when solved or failed
    private MovieRevealDto movie;
}
