package com.cinepulse.backend.jigsaw.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class MovieRevealDto {
    private String title;
    private String posterPath;
    private Integer releaseYear;
}
