package com.cinepulse.backend.jigsaw;

import com.cinepulse.backend.jigsaw.dto.JigsawStatusResponse;
import com.cinepulse.backend.jigsaw.dto.JigsawSubmitResponse;
import com.cinepulse.backend.jigsaw.dto.MovieRevealDto;
import com.cinepulse.backend.movie.Movie;
import com.cinepulse.backend.movie.MovieRepository;
import com.cinepulse.backend.user.User;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Slf4j
@Service
@RequiredArgsConstructor
public class JigsawService {

    private static final int GRID_SIZE = 4;           // 4×4
    private static final int TILE_COUNT = GRID_SIZE * GRID_SIZE; // 16
    private static final int TIME_LIMIT = 90;          // seconds
    private static final int POINTS_PER_SECOND = 10;  // score = timeRemaining × 10

    private final DailyJigsawRepository dailyJigsawRepository;
    private final JigsawAttemptRepository jigsawAttemptRepository;
    private final MovieRepository movieRepository;
    private final ObjectMapper objectMapper;

    // ── GET STATUS ────────────────────────────────────────────────

    public JigsawStatusResponse getStatus(User user) {
        LocalDate today = LocalDate.now();
        DailyJigsaw daily = getOrCreateDailyJigsaw(today);
        JigsawAttempt attempt = jigsawAttemptRepository
                .findByUserAndJigsawDate(user, today)
                .orElse(null);

        JigsawStatusResponse resp = new JigsawStatusResponse();
        resp.setDate(today.toString());
        resp.setPosterPath(daily.getMovie().getPosterPath());
        resp.setTileOrder(parseTileOrder(daily.getTileOrderJson()));
        resp.setTimeLimit(TIME_LIMIT);

        if (attempt != null && attempt.isCompleted()) {
            resp.setCompleted(true);
            resp.setScore(attempt.getScore());
            resp.setTimeTaken(attempt.getTimeTaken());
            resp.setMovie(toRevealDto(daily.getMovie()));
        }

        return resp;
    }

    // ── SUBMIT ────────────────────────────────────────────────────

    public JigsawSubmitResponse submit(User user, int timeTaken) {
        LocalDate today = LocalDate.now();
        DailyJigsaw daily = getOrCreateDailyJigsaw(today);

        jigsawAttemptRepository.findByUserAndJigsawDate(user, today).ifPresent(existing -> {
            if (existing.isCompleted()) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Already completed today's puzzle.");
            }
        });

        int timeRemaining = Math.max(0, TIME_LIMIT - timeTaken);
        int score = timeRemaining * POINTS_PER_SECOND;

        JigsawAttempt attempt = jigsawAttemptRepository
                .findByUserAndJigsawDate(user, today)
                .orElseGet(() -> {
                    JigsawAttempt a = new JigsawAttempt();
                    a.setUser(user);
                    a.setJigsawDate(today);
                    return a;
                });

        attempt.setTimeTaken(timeTaken);
        attempt.setScore(score);
        attempt.setCompleted(true);
        attempt.setCompletedAt(LocalDateTime.now());
        jigsawAttemptRepository.save(attempt);

        JigsawSubmitResponse resp = new JigsawSubmitResponse();
        resp.setScore(score);
        resp.setTimeTaken(timeTaken);
        resp.setTimeLimit(TIME_LIMIT);
        resp.setMovie(toRevealDto(daily.getMovie()));
        return resp;
    }

    // ── HELPERS ───────────────────────────────────────────────────

    private DailyJigsaw getOrCreateDailyJigsaw(LocalDate date) {
        return dailyJigsawRepository.findByJigsawDate(date).orElseGet(() -> {
            try {
                return createDailyJigsaw(date);
            } catch (DataIntegrityViolationException e) {
                return dailyJigsawRepository.findByJigsawDate(date)
                        .orElseThrow(() -> new ResponseStatusException(
                                HttpStatus.INTERNAL_SERVER_ERROR, "Failed to get daily jigsaw."));
            }
        });
    }

    private DailyJigsaw createDailyJigsaw(LocalDate date) {
        List<Movie> eligible = movieRepository
                .findByGenreIsNotNullAndDirectorIsNotNullAndCastIsNotNullAndTaglineIsNotNull();
        if (eligible.isEmpty()) {
            eligible = movieRepository.findAllByPosterPathIsNotNull();
        }

        // Deterministic: same movie + same shuffle for all users on a given date
        // Use seed + 1 offset so jigsaw picks a different movie than wordle on same day
        long seed = date.toEpochDay() + 1L;
        Random rng = new Random(seed);
        Movie movie = eligible.get((int) (rng.nextLong(eligible.size())));

        // Fisher-Yates shuffle with same seeded RNG
        List<Integer> tiles = IntStream.range(0, TILE_COUNT)
                .boxed()
                .collect(Collectors.toCollection(ArrayList::new));
        Collections.shuffle(tiles, rng);

        DailyJigsaw dj = new DailyJigsaw();
        dj.setJigsawDate(date);
        dj.setMovie(movie);
        dj.setTileOrderJson(toJson(tiles));
        return dailyJigsawRepository.save(dj);
    }

    private List<Integer> parseTileOrder(String json) {
        try {
            return objectMapper.readValue(json, new TypeReference<List<Integer>>() {});
        } catch (Exception e) {
            return IntStream.range(0, TILE_COUNT).boxed().collect(Collectors.toList());
        }
    }

    private String toJson(List<Integer> list) {
        try {
            return objectMapper.writeValueAsString(list);
        } catch (Exception e) {
            return "[]";
        }
    }

    private MovieRevealDto toRevealDto(Movie movie) {
        return new MovieRevealDto(movie.getTitle(), movie.getPosterPath(), movie.getReleaseYear());
    }
}
