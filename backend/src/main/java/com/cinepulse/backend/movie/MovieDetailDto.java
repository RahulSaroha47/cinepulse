package com.cinepulse.backend.movie;

public record MovieDetailDto(
        Long id,
        String title,
        String posterPath,
        Integer releaseYear,
        String overview,
        String genre,
        String language,
        String director,
        String cast,
        String tagline,
        double avgRating,
        long reviewCount,
        boolean userReviewed   // whether the calling user has already reviewed this
) {}
