package com.cinepulse.backend.jigsaw;

import com.cinepulse.backend.movie.Movie;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDate;

@Data
@Entity
@Table(name = "daily_jigsaws")
public class DailyJigsaw {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private LocalDate jigsawDate;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "movie_id", nullable = false)
    private Movie movie;

    // JSON array of shuffled tile indices e.g. [3,7,1,15,...]
    @Column(columnDefinition = "TEXT", nullable = false)
    private String tileOrderJson;
}
