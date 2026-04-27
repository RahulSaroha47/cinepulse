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

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final MovieRepository movieRepository;

    private static final long CACHE_TTL_MS = 5 * 60 * 1000L;

    private volatile List<TopRatedMovieDto> topRatedCache;
    private volatile long topRatedCachedAt = 0;

    private volatile List<MovieSummaryDto> allMoviesCache;
    private volatile long allMoviesCachedAt = 0;

    // ── Movie listing ─────────────────────────────────────────────

    private synchronized List<MovieSummaryDto> buildMoviesCache() {
        if (allMoviesCache != null && System.currentTimeMillis() - allMoviesCachedAt < CACHE_TTL_MS) {
            return allMoviesCache;
        }
        // 2 queries total instead of N+1
        Map<Long, double[]> ratings = reviewRepository.findAllRatingAggregates().stream()
                .collect(Collectors.toMap(
                        r -> (Long) r[0],
                        r -> new double[]{ Math.round((Double) r[1] * 10.0) / 10.0, (double)(Long) r[2] }
                ));
        allMoviesCache = movieRepository.findAllByPosterPathIsNotNull().stream()
                .map(m -> {
                    double[] rv = ratings.getOrDefault(m.getId(), new double[]{0.0, 0.0});
                    return new MovieSummaryDto(m.getId(), m.getTitle(), m.getPosterPath(),
                            m.getReleaseYear(), m.getGenre(), rv[0], (long) rv[1]);
                })
                .sorted(Comparator.comparing(MovieSummaryDto::title))
                .collect(Collectors.toList());
        allMoviesCachedAt = System.currentTimeMillis();
        return allMoviesCache;
    }

    public List<MovieSummaryDto> getAllMovies(String search, int page) {
        List<MovieSummaryDto> all = buildMoviesCache();
        String q = (search == null) ? "" : search.trim().toLowerCase();
        return all.stream()
                .filter(m -> q.isEmpty()
                        || m.title().toLowerCase().contains(q)
                        || (m.genre() != null && m.genre().toLowerCase().contains(q)))
                .limit(50)
                .collect(Collectors.toList());
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
        if (topRatedCache != null && System.currentTimeMillis() - topRatedCachedAt < CACHE_TTL_MS) {
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
