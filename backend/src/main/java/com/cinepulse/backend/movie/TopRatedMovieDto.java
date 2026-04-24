package com.cinepulse.backend.movie;

public record TopRatedMovieDto(
        Long id,
        String title,
        String posterPath,
        Integer releaseYear,
        String genre,
        String director,
        String overview,
        double avgRating,
        long reviewCount
) {}
