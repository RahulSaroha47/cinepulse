package com.cinepulse.backend.review;

import com.cinepulse.backend.movie.Movie;
import com.cinepulse.backend.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    List<Review> findByMovieOrderByCreatedAtDesc(Movie movie);

    boolean existsByUserAndMovie(User user, Movie movie);

    Optional<Review> findByUserAndMovie(User user, Movie movie);

    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.movie = :movie")
    Double findAvgRatingByMovie(@Param("movie") Movie movie);

    long countByMovie(Movie movie);

    @Query("SELECT r.movie FROM Review r GROUP BY r.movie ORDER BY AVG(r.rating) DESC, COUNT(r) DESC")
    List<Movie> findTopRatedMovies(Pageable pageable);
}
