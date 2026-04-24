package com.cinepulse.backend.movie;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MovieRepository extends JpaRepository<Movie, Long> {

    boolean existsByTmdbId(Long tmdbId);

    List<Movie> findAllByPosterPathIsNotNull();

    List<Movie> findByGenreIsNull();

    List<Movie> findByGenreIsNotNullAndDirectorIsNotNullAndCastIsNotNullAndTaglineIsNotNull();
}
