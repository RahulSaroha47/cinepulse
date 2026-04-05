package com.cinepulse.backend.movie;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "movies")
public class Movie {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private Long tmdbId;

    @Column(nullable = false)
    private String title;

    private String posterPath;

    private Integer releaseYear;

    @Column(columnDefinition = "TEXT")
    private String overview;
}
