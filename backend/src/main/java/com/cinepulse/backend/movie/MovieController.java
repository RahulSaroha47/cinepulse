package com.cinepulse.backend.movie;

import com.cinepulse.backend.review.ReviewRequest;
import com.cinepulse.backend.review.ReviewResponse;
import com.cinepulse.backend.review.ReviewService;
import com.cinepulse.backend.user.User;
import com.cinepulse.backend.watchlist.WatchlistRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/movies")
@RequiredArgsConstructor
public class MovieController {

    private final MovieRepository movieRepository;
    private final ReviewService reviewService;
    private final WatchlistRepository watchlistRepository;

    // ── Dashboard poster grid (public) ────────────────────────────
    @GetMapping("/posters")
    public ResponseEntity<List<Map<String, Object>>> getRandomPosters() {
        List<Movie> movies = new ArrayList<>(movieRepository.findAllByPosterPathIsNotNull());
        Collections.shuffle(movies);
        List<Map<String, Object>> result = movies.stream()
                .limit(14)
                .map(m -> Map.<String, Object>of("id", m.getId(), "posterPath", m.getPosterPath()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    // ── Browse all movies (public) ────────────────────────────────
    @GetMapping
    public ResponseEntity<List<MovieSummaryDto>> getAllMovies(
            @RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "0") int page) {
        return ResponseEntity.ok(reviewService.getAllMovies(search, page));
    }

    // ── Top 10 rated (public) ─────────────────────────────────────
    @GetMapping("/top-rated")
    public ResponseEntity<List<TopRatedMovieDto>> getTopRated() {
        return ResponseEntity.ok(reviewService.getTopRated());
    }

    // ── Movie detail (public, but userReviewed needs auth) ────────
    @GetMapping("/{id}")
    public ResponseEntity<MovieDetailDto> getMovie(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        boolean inWatchlist = false;
        if (user != null) {
            Movie movie = movieRepository.findById(id).orElse(null);
            inWatchlist = movie != null && watchlistRepository.existsByUserAndMovie(user, movie);
        }
        return ResponseEntity.ok(reviewService.getMovieDetail(id, user, inWatchlist));
    }

    // ── Reviews for a movie (public) ─────────────────────────────
    @GetMapping("/{id}/reviews")
    public ResponseEntity<List<ReviewResponse>> getReviews(@PathVariable Long id) {
        return ResponseEntity.ok(reviewService.getReviews(id));
    }

    // ── Submit a review (authenticated) ──────────────────────────
    @PostMapping("/{id}/reviews")
    public ResponseEntity<ReviewResponse> addReview(
            @PathVariable Long id,
            @AuthenticationPrincipal User user,
            @RequestBody ReviewRequest req) {
        return ResponseEntity.ok(reviewService.addReview(user, id, req));
    }
}
