package com.cinepulse.backend.wordle.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class MovieRevealDto {
    private String title;
    private String posterPath;
    private Integer releaseYear;
}
