package com.cinepulse.backend.review;

import com.cinepulse.backend.movie.Movie;
import com.cinepulse.backend.movie.MovieDetailDto;
import com.cinepulse.backend.movie.MovieRepository;
import com.cinepulse.backend.movie.MovieSummaryDto;
import com.cinepulse.backend.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final MovieRepository movieRepository;

    // ── Movie listing ─────────────────────────────────────────────

    public List<MovieSummaryDto> getAllMovies() {
        return movieRepository.findAllByPosterPathIsNotNull().stream()
                .map(m -> {
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
    }

    public MovieDetailDto getMovieDetail(Long movieId, User user) {
        Movie m = movieRepository.findById(movieId)
                .orElseThrow(() -> new IllegalArgumentException("Movie not found"));
        Double avg = reviewRepository.findAvgRatingByMovie(m);
        long count = reviewRepository.countByMovie(m);
        boolean reviewed = user != null && reviewRepository.existsByUserAndMovie(user, m);
        return new MovieDetailDto(
                m.getId(), m.getTitle(), m.getPosterPath(), m.getReleaseYear(),
                m.getOverview(), m.getGenre(), m.getLanguage(), m.getDirector(),
                m.getCast(), m.getTagline(),
                avg != null ? Math.round(avg * 10.0) / 10.0 : 0.0,
                count, reviewed
        );
    }

    // ── Reviews ───────────────────────────────────────────────────

    public List<ReviewResponse> getReviews(Long movieId) {
        Movie m = movieRepository.findById(movieId)
                .orElseThrow(() -> new IllegalArgumentException("Movie not found"));
        return reviewRepository.findByMovieOrderByCreatedAtDesc(m)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    public ReviewResponse addReview(User user, Long movieId, ReviewRequest req) {
        Movie m = movieRepository.findById(movieId)
                .orElseThrow(() -> new IllegalArgumentException("Movie not found"));
        if (reviewRepository.existsByUserAndMovie(user, m)) {
            throw new IllegalStateException("You have already reviewed this film.");
        }
        if (req.rating() < 1 || req.rating() > 5) {
            throw new IllegalArgumentException("Rating must be between 1 and 5.");
        }
        Review review = new Review();
        review.setUser(user);
        review.setMovie(m);
        review.setRating(req.rating());
        review.setBody(req.body());
        return toDto(reviewRepository.save(review));
    }

    // ── Helpers ───────────────────────────────────────────────────

    private ReviewResponse toDto(Review r) {
        return new ReviewResponse(
                r.getId(),
                r.getUser().getUsername(),
                r.getRating(),
                r.getBody(),
                r.getCreatedAt().toLocalDate().toString()
        );
    }
}
