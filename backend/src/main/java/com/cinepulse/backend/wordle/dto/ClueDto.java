package com.cinepulse.backend.wordle.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ClueDto {
    private String label;
    private String value;
}
