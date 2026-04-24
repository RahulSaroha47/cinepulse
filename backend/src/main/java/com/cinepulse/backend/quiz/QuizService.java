package com.cinepulse.backend.quiz;

import com.cinepulse.backend.movie.Movie;
import com.cinepulse.backend.leaderboard.LeaderboardService;
import com.cinepulse.backend.movie.MovieRepository;
import com.cinepulse.backend.quiz.dto.*;
import com.cinepulse.backend.user.User;
import com.cinepulse.backend.user.UserRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class QuizService {

    private final DailyQuizRepository dailyQuizRepository;
    private final QuizQuestionRepository questionRepository;
    private final QuizAttemptRepository attemptRepository;
    private final MovieRepository movieRepository;
    private final DialogueRepository dialogueRepository;
    private final DirectorEntryRepository directorEntryRepository;
    private final UserRepository userRepository;
    private final LeaderboardService leaderboardService;
    private final ObjectMapper objectMapper;

    private static final int TIMER_SECONDS = 20;

    // ── Public API ────────────────────────────────────────────────────────────

    public TodayQuizResponse getTodayQuiz(String userEmail) {
        LocalDate today = LocalDate.now();
        DailyQuiz quiz;
        try {
            quiz = dailyQuizRepository.findByQuizDate(today)
                    .orElseGet(() -> generateDailyQuiz(today));
        } catch (DataIntegrityViolationException e) {
            // Two requests raced to generate — fetch the one that won
            quiz = dailyQuizRepository.findByQuizDate(today)
                    .orElseThrow(() -> new IllegalStateException("Quiz generation failed."));
        }

        User user = userRepository.findByEmail(userEmail).orElseThrow();
        boolean done = attemptRepository.existsByUserAndQuizDate(user, today);
        Integer prevScore = null;
        if (done) {
            prevScore = attemptRepository.findByUserAndQuizDate(user, today)
                    .map(QuizAttempt::getScore).orElse(null);
        }

        TodayQuizResponse resp = new TodayQuizResponse();
        resp.setQuizDate(today.toString());
        resp.setTheme(quiz.getTheme());
        resp.setThemePosterPath(quiz.getThemePosterPath());
        resp.setAlreadyCompleted(done);
        resp.setPreviousScore(prevScore);
        resp.setQuestions(quiz.getQuestions().stream().map(this::toDto).collect(Collectors.toList()));
        return resp;
    }

    @Transactional
    public QuizResultResponse submitQuiz(String userEmail, QuizSubmitRequest req) {
        LocalDate today = LocalDate.now();
        User user = userRepository.findByEmail(userEmail).orElseThrow();

        if (attemptRepository.existsByUserAndQuizDate(user, today)) {
            throw new IllegalStateException("Quiz already submitted for today.");
        }

        DailyQuiz quiz = dailyQuizRepository.findByQuizDate(today)
                .orElseThrow(() -> new IllegalStateException("No quiz found for today."));

        Map<Long, QuizQuestion> questionMap = quiz.getQuestions().stream()
                .collect(Collectors.toMap(QuizQuestion::getId, q -> q));

        List<QuizResultResponse.QuestionResult> breakdown = new ArrayList<>();
        Set<Long> seen = new HashSet<>();
        int baseScore = 0;

        for (AnswerSubmission submission : req.getAnswers()) {
            if (!seen.add(submission.getQuestionId())) continue; // skip duplicate submissions
            QuizQuestion question = questionMap.get(submission.getQuestionId());
            if (question == null) continue;

            boolean correct = question.getCorrectAnswer().equalsIgnoreCase(submission.getSelectedAnswer());
            int base = 5;
            int speedBonus = correct
                    ? (int) Math.round(Math.min(submission.getTimeLeft(), TIMER_SECONDS) * 3.0 / TIMER_SECONDS)
                    : 0;
            int earned = correct ? base + speedBonus : 0;
            baseScore += earned;

            QuizResultResponse.QuestionResult r = new QuizResultResponse.QuestionResult();
            r.setQuestionId(question.getId());
            r.setQuestionText(question.getQuestionText());
            r.setSelectedAnswer(submission.getSelectedAnswer());
            r.setCorrectAnswer(question.getCorrectAnswer());
            r.setCorrect(correct);
            r.setPointsEarned(earned);
            r.setTimeLeft(submission.getTimeLeft());
            breakdown.add(r);
        }

        int totalScore = baseScore;

        // Update quiz streak
        LocalDate yesterday = today.minusDays(1);
        if (!today.equals(user.getLastQuizDate())) {
            if (yesterday.equals(user.getLastQuizDate())) {
                user.setStreak(user.getStreak() + 1);
            } else {
                user.setStreak(1);
            }
            user.setLastQuizDate(today);
        }

        // Update overall streak
        updateOverallStreak(user, today);

        user.setTotalScore(user.getTotalScore() + totalScore);
        userRepository.save(user);

        // Update Redis leaderboard
        leaderboardService.addDailyScore("quiz", user.getUsername(), totalScore);
        leaderboardService.updateOverallScore(user.getUsername(), user.getTotalScore());

        // Persist attempt
        QuizAttempt attempt = new QuizAttempt();
        attempt.setUser(user);
        attempt.setQuizDate(today);
        attempt.setScore(totalScore);
        attempt.setCompletedAt(LocalDateTime.now());
        attempt.setAnswersJson(toJson(req.getAnswers()));
        attemptRepository.save(attempt);

        QuizResultResponse resp = new QuizResultResponse();
        resp.setBaseScore(baseScore);
        resp.setStreakMultiplier(1.0);
        resp.setTotalScore(totalScore);
        resp.setNewStreak(user.getStreak());
        resp.setBreakdown(breakdown);
        return resp;
    }

    // ── Quiz Generation ───────────────────────────────────────────────────────

    @Transactional
    public DailyQuiz generateDailyQuiz(LocalDate date) {
        List<Movie> movies = movieRepository.findAllByPosterPathIsNotNull();
        if (movies.size() < 8) throw new IllegalStateException("Not enough movies seeded. Run /api/admin/seed first.");

        Collections.shuffle(movies);
        List<QuizQuestion> questions = new ArrayList<>();

        // 2× POSTER_BLIND
        questions.add(buildPosterBlind(movies, 0));
        questions.add(buildPosterBlind(movies, 1));

        // 1× WHO_SAID_IT
        questions.add(buildWhoSaidIt(movies));

        // 1× DIRECTORS_CUT
        questions.add(buildDirectorsCut(movies));

        // 1× RELEASE_YEAR
        questions.add(buildReleaseYear(movies, 2));

        // Shuffle question order
        Collections.shuffle(questions);
        List<QuizQuestion> saved = questionRepository.saveAll(questions);

        DailyQuiz quiz = new DailyQuiz();
        quiz.setQuizDate(date);
        quiz.setQuestions(saved);

        // Theme = first POSTER_BLIND movie title as a stand-in (can be improved later)
        Movie featuredMovie = movies.get(0);
        quiz.setTheme(featuredMovie.getTitle());
        quiz.setThemePosterPath(featuredMovie.getPosterPath());

        return dailyQuizRepository.save(quiz);
    }

    private QuizQuestion buildPosterBlind(List<Movie> movies, int idx) {
        Movie subject = movies.get(idx);
        List<String> options = buildMovieOptions(movies, subject.getTitle(), idx + 10);

        QuizQuestion q = new QuizQuestion();
        q.setType(QuestionType.POSTER_BLIND);
        q.setQuestionText("Guess the movie from the poster");
        q.setPosterPath(subject.getPosterPath());
        q.setCorrectAnswer(subject.getTitle());
        q.setOptionsJson(toJson(options));
        return q;
    }

    private QuizQuestion buildWhoSaidIt(List<Movie> movies) {
        List<Dialogue> dialogues = dialogueRepository.findAll();
        if (dialogues.isEmpty()) throw new IllegalStateException("No dialogues seeded.");

        Dialogue dialogue = dialogues.get(new Random().nextInt(dialogues.size()));
        List<String> options = buildMovieOptions(movies, dialogue.getMovieTitle(), 20);

        QuizQuestion q = new QuizQuestion();
        q.setType(QuestionType.WHO_SAID_IT);
        q.setQuestionText("\u201C" + dialogue.getText() + "\u201D");
        q.setCorrectAnswer(dialogue.getMovieTitle());
        q.setOptionsJson(toJson(options));
        return q;
    }

    private QuizQuestion buildDirectorsCut(List<Movie> movies) {
        List<DirectorEntry> directors = directorEntryRepository.findAll();
        if (directors.isEmpty()) throw new IllegalStateException("No director entries seeded.");

        DirectorEntry director = directors.get(new Random().nextInt(directors.size()));
        List<String> directorMovies = fromJson(director.getMoviesJson());

        // Pick 3 movies by this director
        Collections.shuffle(directorMovies);
        List<String> threeByDirector = directorMovies.subList(0, Math.min(3, directorMovies.size()));

        // Pick 1 movie NOT by this director
        String impostor = movies.stream()
                .map(Movie::getTitle)
                .filter(t -> !directorMovies.contains(t))
                .findFirst()
                .orElse(movies.get(movies.size() - 1).getTitle());

        List<String> options = new ArrayList<>(threeByDirector);
        options.add(impostor);
        Collections.shuffle(options);

        QuizQuestion q = new QuizQuestion();
        q.setType(QuestionType.DIRECTORS_CUT);
        q.setQuestionText("Which film was NOT directed by " + director.getName() + "?");
        q.setCorrectAnswer(impostor);
        q.setOptionsJson(toJson(options));
        return q;
    }

    private QuizQuestion buildReleaseYear(List<Movie> movies, int idx) {
        Movie subject = movies.stream()
                .filter(m -> m.getReleaseYear() != null)
                .skip(idx)
                .findFirst()
                .orElse(movies.get(idx));

        int year = subject.getReleaseYear() != null ? subject.getReleaseYear() : 2020;
        List<String> options = buildYearOptions(year);

        QuizQuestion q = new QuizQuestion();
        q.setType(QuestionType.RELEASE_YEAR);
        q.setQuestionText("When was \u201C" + subject.getTitle() + "\u201D released?");
        q.setPosterPath(subject.getPosterPath());
        q.setCorrectAnswer(String.valueOf(year));
        q.setOptionsJson(toJson(options));
        return q;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private List<String> buildMovieOptions(List<Movie> movies, String correct, int offset) {
        List<String> opts = new ArrayList<>();
        opts.add(correct);
        movies.stream()
                .map(Movie::getTitle)
                .filter(t -> !t.equals(correct))
                .skip(offset)
                .limit(3)
                .forEach(opts::add);
        while (opts.size() < 4) opts.add("Unknown Movie");
        Collections.shuffle(opts);
        return opts;
    }

    private List<String> buildYearOptions(int correct) {
        Set<Integer> years = new LinkedHashSet<>();
        years.add(correct);
        int[] offsets = {-3, -1, 2, 4, -2, 3};
        for (int off : offsets) {
            if (years.size() >= 4) break;
            years.add(correct + off);
        }
        List<String> opts = years.stream().map(String::valueOf).collect(Collectors.toList());
        Collections.shuffle(opts);
        return opts;
    }

    public static void updateOverallStreak(User user, LocalDate today) {
        LocalDate yesterday = today.minusDays(1);
        if (today.equals(user.getOverallLastPlayed())) return; // already counted today
        if (yesterday.equals(user.getOverallLastPlayed())) {
            user.setOverallStreak(user.getOverallStreak() + 1);
        } else {
            user.setOverallStreak(1);
        }
        user.setOverallLastPlayed(today);
    }

    private QuizQuestionDto toDto(QuizQuestion q) {
        QuizQuestionDto dto = new QuizQuestionDto();
        dto.setId(q.getId());
        dto.setType(q.getType());
        dto.setQuestionText(q.getQuestionText());
        dto.setPosterPath(q.getPosterPath());
        dto.setOptions(fromJson(q.getOptionsJson()));
        dto.setBasePoints(5);
        return dto;
    }

    private String toJson(Object obj) {
        try { return objectMapper.writeValueAsString(obj); }
        catch (Exception e) { return "[]"; }
    }

    private List<String> fromJson(String json) {
        try { return objectMapper.readValue(json, new TypeReference<>() {}); }
        catch (Exception e) { return List.of(); }
    }
}
