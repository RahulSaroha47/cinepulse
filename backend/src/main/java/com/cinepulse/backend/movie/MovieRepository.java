package com.cinepulse.backend.movie;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MovieRepository extends JpaRepository<Movie, Long> {

    boolean existsByTmdbId(Long tmdbId);

    List<Movie> findAllByPosterPathIsNotNull();

    List<Movie> findByGenreIsNull();

    List<Movie> findByGenreIsNotNullAndDirectorIsNotNullAndCastIsNotNullAndTaglineIsNotNull();

    @Query("""
        SELECT new com.cinepulse.backend.movie.MovieSummaryDto(
            m.id, m.title, m.posterPath, m.releaseYear, m.genre,
            COALESCE(AVG(r.rating), 0.0), COUNT(r)
        )
        FROM Movie m LEFT JOIN Review r ON r.movie = m
        WHERE m.posterPath IS NOT NULL
          AND (:search = '' OR LOWER(m.title) LIKE LOWER(CONCAT('%', :search, '%'))
                            OR LOWER(m.genre)  LIKE LOWER(CONCAT('%', :search, '%')))
        GROUP BY m.id, m.title, m.posterPath, m.releaseYear, m.genre
        ORDER BY m.title ASC
        """)
    List<MovieSummaryDto> findMovieSummaries(@Param("search") String search, Pageable pageable);
}
