package com.cinepulse.backend.wordle.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class MovieTitleDto {
    private Long id;
    private String title;
}
