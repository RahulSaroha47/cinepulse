package com.cinepulse.backend.review;

import com.cinepulse.backend.movie.Movie;
import com.cinepulse.backend.movie.MovieDetailDto;
import com.cinepulse.backend.movie.MovieRepository;
import com.cinepulse.backend.movie.MovieSummaryDto;
import com.cinepulse.backend.user.User;
import com.cinepulse.backend.movie.TopRatedMovieDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final MovieRepository movieRepository;

    private static final long CACHE_TTL_MS = 5 * 60 * 1000L;

    private volatile List<TopRatedMovieDto> topRatedCache;
    private volatile long topRatedCachedAt = 0;

    private volatile List<MovieSummaryDto> defaultMoviesCache;
    private volatile long defaultMoviesCachedAt = 0;

    // ── Movie listing ─────────────────────────────────────────────

    public synchronized List<MovieSummaryDto> getAllMovies(String search, int page) {
        String q = (search == null) ? "" : search.trim();
        // Cache only the default first page (search="" page=0) — most common request
        if (q.isEmpty() && page == 0) {
            if (defaultMoviesCache != null && System.currentTimeMillis() - defaultMoviesCachedAt < CACHE_TTL_MS) {
                return defaultMoviesCache;
            }
            defaultMoviesCache = movieRepository.findMovieSummaries("", PageRequest.of(0, 50));
            defaultMoviesCachedAt = System.currentTimeMillis();
            return defaultMoviesCache;
        }
        return movieRepository.findMovieSummaries(q, PageRequest.of(page, 50));
    }

    public MovieDetailDto getMovieDetail(Long movieId, User user, boolean inWatchlist) {
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
                count, reviewed, inWatchlist
        );
    }

    // ── Top rated (in-memory cached, 5 min TTL) ──────────────────

    public synchronized List<TopRatedMovieDto> getTopRated() {
        if (topRatedCache != null && System.currentTimeMillis() - topRatedCachedAt < TOP_RATED_TTL_MS) {
            return topRatedCache;
        }
        topRatedCache = reviewRepository.findTopRatedSummaries(PageRequest.of(0, 10)).stream()
                .map(m -> new TopRatedMovieDto(
                        m.id(), m.title(), m.posterPath(), m.releaseYear(), m.genre(),
                        m.director(), m.overview(),
                        Math.round(m.avgRating() * 10.0) / 10.0,
                        m.reviewCount()))
                .collect(Collectors.toList());
        topRatedCachedAt = System.currentTimeMillis();
        return topRatedCache;
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
        ReviewResponse result = toDto(reviewRepository.save(review));
        topRatedCache = null; // invalidate top-rated cache after new review
        return result;
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
