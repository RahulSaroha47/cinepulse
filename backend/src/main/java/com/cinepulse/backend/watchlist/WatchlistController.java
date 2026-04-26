package com.cinepulse.backend.watchlist;

import com.cinepulse.backend.movie.Movie;
import com.cinepulse.backend.movie.MovieRepository;
import com.cinepulse.backend.movie.MovieSummaryDto;
import com.cinepulse.backend.review.ReviewRepository;
import com.cinepulse.backend.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/watchlist")
@RequiredArgsConstructor
public class WatchlistController {

    private final WatchlistRepository watchlistRepository;
    private final MovieRepository movieRepository;
    private final ReviewRepository reviewRepository;

    @GetMapping
    public ResponseEntity<List<MovieSummaryDto>> getWatchlist(@AuthenticationPrincipal User user) {
        List<MovieSummaryDto> result = watchlistRepository.findByUserOrderByAddedAtDesc(user).stream()
                .map(w -> {
                    Movie m = w.getMovie();
                    Double avg = reviewRepository.findAvgRatingByMovie(m);
                    long count = reviewRepository.countByMovie(m);
                    return new MovieSummaryDto(
                            m.getId(), m.getTitle(), m.getPosterPath(),
                            m.getReleaseYear(), m.getGenre(),
                            avg != null ? Math.round(avg * 10.0) / 10.0 : 0.0,
                            count
                    );
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/{movieId}")
    public ResponseEntity<Map<String, Object>> addToWatchlist(
            @PathVariable Long movieId,
            @AuthenticationPrincipal User user) {
        Movie movie = movieRepository.findById(movieId)
                .orElseThrow(() -> new IllegalArgumentException("Movie not found"));
        if (watchlistRepository.existsByUserAndMovie(user, movie)) {
            return ResponseEntity.ok(Map.of("inWatchlist", true));
        }
        Watchlist entry = new Watchlist();
        entry.setUser(user);
        entry.setMovie(movie);
        watchlistRepository.save(entry);
        return ResponseEntity.ok(Map.of("inWatchlist", true));
    }

    @DeleteMapping("/{movieId}")
    public ResponseEntity<Map<String, Object>> removeFromWatchlist(
            @PathVariable Long movieId,
            @AuthenticationPrincipal User user) {
        Movie movie = movieRepository.findById(movieId)
                .orElseThrow(() -> new IllegalArgumentException("Movie not found"));
        watchlistRepository.findByUserAndMovie(user, movie)
                .ifPresent(watchlistRepository::delete);
        return ResponseEntity.ok(Map.of("inWatchlist", false));
    }
}
