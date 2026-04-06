package com.cinepulse.backend.jigsaw.dto;

import lombok.Data;

@Data
public class JigsawSubmitResponse {
    private int score;
    private int timeTaken;
    private int timeLimit;
    private MovieRevealDto movie;
}
