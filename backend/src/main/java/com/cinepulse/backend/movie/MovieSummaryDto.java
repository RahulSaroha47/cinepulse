package com.cinepulse.backend.movie;

public record MovieSummaryDto(
        Long id,
        String title,
        String posterPath,
        Integer releaseYear,
        String genre,
        double avgRating,
        long reviewCount
) {}
