package com.cinepulse.backend.jigsaw.dto;

import lombok.Data;

import java.util.List;

@Data
public class JigsawStatusResponse {
    private String date;
    private String posterPath;
    private List<Integer> tileOrder; // shuffled tile indices for the 4×4 grid
    private int timeLimit;           // seconds (120)
    private boolean completed;
    private int score;
    private int timeTaken;
    private MovieRevealDto movie;    // revealed only after completion
}
