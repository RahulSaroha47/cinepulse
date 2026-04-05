package com.cinepulse.backend.wordle;

import com.cinepulse.backend.movie.Movie;
import com.cinepulse.backend.movie.MovieRepository;
import com.cinepulse.backend.user.User;
import com.cinepulse.backend.wordle.dto.*;
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
import java.util.List;
import java.util.Random;

@Slf4j
@Service
@RequiredArgsConstructor
public class WordleService {

    private static final int MAX_GUESSES = 6;

    private final DailyWordleRepository dailyWordleRepository;
    private final WordleAttemptRepository wordleAttemptRepository;
    private final MovieRepository movieRepository;
    private final ObjectMapper objectMapper;

    // ── GET STATUS ────────────────────────────────────────────────

    public WordleStatusResponse getStatus(User user) {
        LocalDate today = LocalDate.now();
        DailyWordle dailyWordle = getOrCreateDailyWordle(today);
        WordleAttempt attempt = wordleAttemptRepository
                .findByUserAndWordleDate(user, today)
                .orElse(null);

        int wrongGuesses = 0;
        List<String> guesses = new ArrayList<>();

        if (attempt != null) {
            guesses = parseGuesses(attempt.getGuessesJson());
            wrongGuesses = attempt.isSolved() ? guesses.size() - 1 : guesses.size();
        }

        WordleStatusResponse resp = new WordleStatusResponse();
        resp.setDate(today.toString());
        resp.setGuesses(guesses);
        resp.setGuessCount(guesses.size());
        resp.setMaxGuesses(MAX_GUESSES);
        resp.setSolved(attempt != null && attempt.isSolved());
        resp.setFailed(attempt != null && !attempt.isSolved() && guesses.size() >= MAX_GUESSES);
        resp.setClues(buildClues(dailyWordle.getMovie(), wrongGuesses));

        resp.setBackgroundPosterPath(dailyWordle.getMovie().getPosterPath());

        if (resp.isSolved() || resp.isFailed()) {
            resp.setMovie(toRevealDto(dailyWordle.getMovie()));
        }

        return resp;
    }

    // ── SUBMIT GUESS ──────────────────────────────────────────────

    public GuessResponse submitGuess(User user, String guess) {
        if (guess == null || guess.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Guess cannot be empty.");
        }

        LocalDate today = LocalDate.now();
        DailyWordle dailyWordle = getOrCreateDailyWordle(today);
        Movie movie = dailyWordle.getMovie();

        WordleAttempt attempt = wordleAttemptRepository
                .findByUserAndWordleDate(user, today)
                .orElseGet(() -> {
                    WordleAttempt a = new WordleAttempt();
                    a.setUser(user);
                    a.setWordleDate(today);
                    a.setGuessesJson("[]");
                    return a;
                });

        if (attempt.isSolved() || parseGuesses(attempt.getGuessesJson()).size() >= MAX_GUESSES) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Already completed today's Wordle.");
        }

        List<String> guesses = new ArrayList<>(parseGuesses(attempt.getGuessesJson()));
        guesses.add(guess.trim());

        boolean correct = movie.getTitle().equalsIgnoreCase(guess.trim());
        boolean failed = !correct && guesses.size() >= MAX_GUESSES;

        attempt.setGuessesJson(toJson(guesses));
        attempt.setSolved(correct);
        if (correct || failed) {
            attempt.setCompletedAt(LocalDateTime.now());
        }
        wordleAttemptRepository.save(attempt);

        GuessResponse resp = new GuessResponse();
        resp.setCorrect(correct);
        resp.setSolved(correct);
        resp.setFailed(failed);
        resp.setGuessCount(guesses.size());

        // Unlock next clue on wrong guess (if not game over)
        if (!correct && !failed) {
            int wrongCount = guesses.size(); // just submitted a wrong guess
            List<ClueDto> allClues = buildAllClues(movie);
            int nextIndex = 1 + wrongCount; // index of newly unlocked clue
            if (nextIndex < allClues.size()) {
                resp.setNextClue(allClues.get(nextIndex));
            }
        }

        if (correct || failed) {
            resp.setMovie(toRevealDto(movie));
        }

        return resp;
    }

    // ── AUTOCOMPLETE ──────────────────────────────────────────────

    public List<MovieTitleDto> getAllMovieTitles() {
        return movieRepository.findAll().stream()
                .map(m -> new MovieTitleDto(m.getId(), m.getTitle()))
                .toList();
    }

    // ── HELPERS ───────────────────────────────────────────────────

    private DailyWordle getOrCreateDailyWordle(LocalDate date) {
        return dailyWordleRepository.findByWordleDate(date).orElseGet(() -> {
            try {
                return createDailyWordle(date);
            } catch (DataIntegrityViolationException e) {
                return dailyWordleRepository.findByWordleDate(date)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to get daily wordle."));
            }
        });
    }

    private DailyWordle createDailyWordle(LocalDate date) {
        List<Movie> eligible = movieRepository
                .findByGenreIsNotNullAndDirectorIsNotNullAndCastIsNotNullAndTaglineIsNotNull();

        if (eligible.isEmpty()) {
            // Fallback: any movie with a poster
            eligible = movieRepository.findAllByPosterPathIsNotNull();
        }

        // Deterministic random: seed by date so all servers pick same movie
        long seed = date.toEpochDay();
        Movie movie = eligible.get((int) (new Random(seed).nextLong(eligible.size())));

        DailyWordle dw = new DailyWordle();
        dw.setWordleDate(date);
        dw.setMovie(movie);
        return dailyWordleRepository.save(dw);
    }

    private List<ClueDto> buildAllClues(Movie movie) {
        List<ClueDto> clues = new ArrayList<>();
        clues.add(new ClueDto("Genre", nullSafe(movie.getGenre(), "Unknown")));
        clues.add(new ClueDto("Release Year", movie.getReleaseYear() != null ? String.valueOf(movie.getReleaseYear()) : "Unknown"));
        clues.add(new ClueDto("Language", nullSafe(movie.getLanguage(), "Unknown")));
        clues.add(new ClueDto("Director", nullSafe(movie.getDirector(), "Unknown")));
        clues.add(new ClueDto("Cast", nullSafe(movie.getCast(), "Unknown")));
        clues.add(new ClueDto("Tagline", nullSafe(movie.getTagline(), "No tagline available")));
        clues.add(new ClueDto("First Letter", String.valueOf(movie.getTitle().charAt(0))));
        return clues;
    }

    /**
     * Returns clues visible to the user:
     * - Always show first 2 (Genre + Release Year)
     * - Unlock 1 more per wrong guess
     */
    private List<ClueDto> buildClues(Movie movie, int wrongGuesses) {
        List<ClueDto> all = buildAllClues(movie);
        int toShow = Math.min(2 + wrongGuesses, all.size());
        return all.subList(0, toShow);
    }

    private MovieRevealDto toRevealDto(Movie movie) {
        return new MovieRevealDto(movie.getTitle(), movie.getPosterPath(), movie.getReleaseYear());
    }

    private String nullSafe(String value, String fallback) {
        return (value != null && !value.isBlank()) ? value : fallback;
    }

    @SuppressWarnings("unchecked")
    private List<String> parseGuesses(String json) {
        try {
            if (json == null || json.isBlank()) return new ArrayList<>();
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    private String toJson(List<String> list) {
        try {
            return objectMapper.writeValueAsString(list);
        } catch (Exception e) {
            return "[]";
        }
    }
}
