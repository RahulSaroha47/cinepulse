package com.cinepulse.backend.party;

import com.cinepulse.backend.movie.Movie;
import com.cinepulse.backend.movie.MovieRepository;
import com.cinepulse.backend.party.dto.PartyQuestionDto;
import com.cinepulse.backend.quiz.Dialogue;
import com.cinepulse.backend.quiz.DialogueRepository;
import com.cinepulse.backend.quiz.DirectorEntry;
import com.cinepulse.backend.quiz.DirectorEntryRepository;
import com.cinepulse.backend.quiz.QuestionType;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PartyService {

    private final MovieRepository movieRepository;
    private final DialogueRepository dialogueRepository;
    private final DirectorEntryRepository directorEntryRepository;
    private final ObjectMapper objectMapper;

    private static final int MAX_QUESTIONS = 90;

    // Cycle evenly through all 8 types
    private static final QuestionType[] TYPE_POOL = {
            QuestionType.POSTER_BLIND,
            QuestionType.TAGLINE_GUESS,
            QuestionType.WHO_SAID_IT,
            QuestionType.DIRECTOR_OF_MOVIE,
            QuestionType.RELEASE_YEAR,
            QuestionType.ACTOR_SPOTLIGHT,
            QuestionType.DIRECTORS_CUT,
            QuestionType.FILMOGRAPHY_LINK,
    };

    public List<PartyQuestionDto> generateQuestions(int count) {
        count = Math.min(count, MAX_QUESTIONS);

        List<Movie> allMovies = new ArrayList<>(movieRepository.findAllByPosterPathIsNotNull());
        if (allMovies.size() < 8) throw new IllegalStateException("Not enough movies seeded.");

        List<Dialogue> dialogues     = shuffled(new ArrayList<>(dialogueRepository.findAll()));
        List<DirectorEntry> dirEntries = shuffled(new ArrayList<>(directorEntryRepository.findAll()));

        // Per-type movie pools — each shuffled independently so pulls are non-repeating within a type
        List<Movie> posterPool    = shuffled(filter(allMovies, m -> m.getPosterPath() != null));
        List<Movie> yearPool      = shuffled(filter(allMovies, m -> m.getReleaseYear() != null));
        List<Movie> taglinePool   = shuffled(filter(allMovies, m -> notBlank(m.getTagline())));
        List<Movie> directorPool  = shuffled(filter(allMovies, m -> notBlank(m.getDirector())));
        List<Movie> castPool      = shuffled(filter(allMovies, m -> notBlank(m.getCast())));

        // Filmography groups: directors with ≥2 movies
        List<List<Movie>> filmGroups = shuffled(new ArrayList<>(
                allMovies.stream()
                        .filter(m -> notBlank(m.getDirector()))
                        .collect(Collectors.groupingBy(Movie::getDirector))
                        .values().stream()
                        .filter(g -> g.size() >= 2)
                        .collect(Collectors.toList())
        ));

        // Sequential indices — pull from each pool in order, wrapping only if pool is exhausted
        int posterIdx = 0, yearIdx = 0, taglineIdx = 0, directorIdx = 0, castIdx = 0;
        int dialogueIdx = 0, dirEntryIdx = 0, filmGroupIdx = 0;

        List<PartyQuestionDto> questions = new ArrayList<>(count);

        for (int i = 0; i < count; i++) {
            QuestionType type = TYPE_POOL[i % TYPE_POOL.length];

            // Fall back to POSTER_BLIND / RELEASE_YEAR if a pool is empty
            if (type == QuestionType.TAGLINE_GUESS   && taglinePool.isEmpty())  type = QuestionType.POSTER_BLIND;
            if (type == QuestionType.DIRECTOR_OF_MOVIE && directorPool.isEmpty()) type = QuestionType.RELEASE_YEAR;
            if (type == QuestionType.ACTOR_SPOTLIGHT && castPool.isEmpty())      type = QuestionType.RELEASE_YEAR;
            if (type == QuestionType.FILMOGRAPHY_LINK && filmGroups.isEmpty())   type = QuestionType.DIRECTORS_CUT;

            PartyQuestionDto q = switch (type) {
                case POSTER_BLIND    -> buildPosterBlind(allMovies, posterPool.get(posterIdx++ % posterPool.size()));
                case TAGLINE_GUESS   -> buildTaglineGuess(allMovies, taglinePool.get(taglineIdx++ % taglinePool.size()));
                case WHO_SAID_IT     -> buildWhoSaidIt(allMovies, dialogues.get(dialogueIdx++ % dialogues.size()));
                case DIRECTOR_OF_MOVIE -> buildDirectorOfMovie(allMovies, directorPool.get(directorIdx++ % directorPool.size()));
                case RELEASE_YEAR    -> buildReleaseYear(allMovies, yearPool.get(yearIdx++ % yearPool.size()));
                case ACTOR_SPOTLIGHT -> buildActorSpotlight(allMovies, castPool.get(castIdx++ % castPool.size()));
                case DIRECTORS_CUT   -> buildDirectorsCut(allMovies, dirEntries.get(dirEntryIdx++ % dirEntries.size()));
                case FILMOGRAPHY_LINK -> buildFilmographyLink(allMovies, filmGroups.get(filmGroupIdx++ % filmGroups.size()));
            };
            q.setIndex(i);
            questions.add(q);
        }

        Collections.shuffle(questions);
        for (int i = 0; i < questions.size(); i++) questions.get(i).setIndex(i);
        return questions;
    }

    // ── Question builders ─────────────────────────────────────────────────────

    private PartyQuestionDto buildPosterBlind(List<Movie> allMovies, Movie subject) {
        PartyQuestionDto q = new PartyQuestionDto();
        q.setType(QuestionType.POSTER_BLIND);
        q.setQuestionText("Guess the movie from the poster");
        q.setPosterPath(subject.getPosterPath());
        q.setCorrectAnswer(subject.getTitle());
        q.setOptions(buildMovieTitleOptions(allMovies, subject.getTitle()));
        return q;
    }

    private PartyQuestionDto buildTaglineGuess(List<Movie> allMovies, Movie subject) {
        PartyQuestionDto q = new PartyQuestionDto();
        q.setType(QuestionType.TAGLINE_GUESS);
        q.setQuestionText("\u201C" + subject.getTagline() + "\u201D");
        q.setCorrectAnswer(subject.getTitle());
        q.setOptions(buildMovieTitleOptions(allMovies, subject.getTitle()));
        return q;
    }

    private PartyQuestionDto buildWhoSaidIt(List<Movie> allMovies, Dialogue dialogue) {
        PartyQuestionDto q = new PartyQuestionDto();
        q.setType(QuestionType.WHO_SAID_IT);
        q.setQuestionText("\u201C" + dialogue.getText() + "\u201D");
        q.setCorrectAnswer(dialogue.getMovieTitle());
        q.setOptions(buildMovieTitleOptions(allMovies, dialogue.getMovieTitle()));
        return q;
    }

    private PartyQuestionDto buildDirectorOfMovie(List<Movie> allMovies, Movie subject) {
        List<String> wrongDirectors = allMovies.stream()
                .filter(m -> notBlank(m.getDirector()) && !m.getDirector().equals(subject.getDirector()))
                .map(Movie::getDirector)
                .distinct()
                .collect(Collectors.toList());
        Collections.shuffle(wrongDirectors);

        List<String> opts = new ArrayList<>();
        opts.add(subject.getDirector());
        wrongDirectors.stream().limit(3).forEach(opts::add);
        while (opts.size() < 4) opts.add("Unknown Director");
        Collections.shuffle(opts);

        PartyQuestionDto q = new PartyQuestionDto();
        q.setType(QuestionType.DIRECTOR_OF_MOVIE);
        q.setQuestionText("Who directed \u201C" + subject.getTitle() + "\u201D?");
        q.setPosterPath(subject.getPosterPath());
        q.setCorrectAnswer(subject.getDirector());
        q.setOptions(opts);
        return q;
    }

    private PartyQuestionDto buildReleaseYear(List<Movie> allMovies, Movie subject) {
        int year = subject.getReleaseYear() != null ? subject.getReleaseYear() : 2020;

        PartyQuestionDto q = new PartyQuestionDto();
        q.setType(QuestionType.RELEASE_YEAR);
        q.setQuestionText("When was \u201C" + subject.getTitle() + "\u201D released?");
        q.setPosterPath(subject.getPosterPath());
        q.setCorrectAnswer(String.valueOf(year));
        q.setOptions(buildYearOptions(year));
        return q;
    }

    private PartyQuestionDto buildActorSpotlight(List<Movie> allMovies, Movie subject) {
        List<String> cast = Arrays.stream(subject.getCast().split(","))
                .map(String::trim).filter(s -> !s.isEmpty()).collect(Collectors.toList());

        String correctActor = cast.get(0); // top-billed actor

        List<String> wrongActors = allMovies.stream()
                .filter(m -> notBlank(m.getCast()) && !m.getId().equals(subject.getId()))
                .flatMap(m -> Arrays.stream(m.getCast().split(",")).map(String::trim))
                .filter(a -> !a.isEmpty() && !a.equals(correctActor))
                .distinct()
                .collect(Collectors.toList());
        Collections.shuffle(wrongActors);

        List<String> opts = new ArrayList<>();
        opts.add(correctActor);
        wrongActors.stream().limit(3).forEach(opts::add);
        while (opts.size() < 4) opts.add("Unknown Actor");
        Collections.shuffle(opts);

        PartyQuestionDto q = new PartyQuestionDto();
        q.setType(QuestionType.ACTOR_SPOTLIGHT);
        q.setQuestionText("Which actor starred in \u201C" + subject.getTitle() + "\u201D?");
        q.setPosterPath(subject.getPosterPath());
        q.setCorrectAnswer(correctActor);
        q.setOptions(opts);
        return q;
    }

    private PartyQuestionDto buildDirectorsCut(List<Movie> allMovies, DirectorEntry director) {
        List<String> directorMovies = new ArrayList<>(fromJson(director.getMoviesJson()));
        Collections.shuffle(directorMovies);
        List<String> threeByDirector = directorMovies.subList(0, Math.min(3, directorMovies.size()));

        String impostor = allMovies.stream()
                .map(Movie::getTitle)
                .filter(t -> !directorMovies.contains(t))
                .findFirst()
                .orElse(allMovies.get(allMovies.size() - 1).getTitle());

        List<String> opts = new ArrayList<>(threeByDirector);
        opts.add(impostor);
        Collections.shuffle(opts);

        PartyQuestionDto q = new PartyQuestionDto();
        q.setType(QuestionType.DIRECTORS_CUT);
        q.setQuestionText("Which film was NOT directed by " + director.getName() + "?");
        q.setCorrectAnswer(impostor);
        q.setOptions(opts);
        return q;
    }

    private PartyQuestionDto buildFilmographyLink(List<Movie> allMovies, List<Movie> group) {
        List<Movie> g = new ArrayList<>(group);
        Collections.shuffle(g);
        Movie subject = g.get(0);
        Movie correct = g.get(1);

        List<String> wrongTitles = allMovies.stream()
                .filter(m -> notBlank(m.getDirector()) && !m.getDirector().equals(subject.getDirector()))
                .map(Movie::getTitle)
                .collect(Collectors.toList());
        Collections.shuffle(wrongTitles);

        List<String> opts = new ArrayList<>();
        opts.add(correct.getTitle());
        wrongTitles.stream().limit(3).forEach(opts::add);
        while (opts.size() < 4) opts.add("Unknown Movie");
        Collections.shuffle(opts);

        PartyQuestionDto q = new PartyQuestionDto();
        q.setType(QuestionType.FILMOGRAPHY_LINK);
        q.setQuestionText("Which movie shares the same director as \u201C" + subject.getTitle() + "\u201D?");
        q.setPosterPath(subject.getPosterPath());
        q.setCorrectAnswer(correct.getTitle());
        q.setOptions(opts);
        return q;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private List<String> buildMovieTitleOptions(List<Movie> movies, String correct) {
        List<String> distractors = movies.stream()
                .map(Movie::getTitle)
                .filter(t -> !t.equals(correct))
                .collect(Collectors.toList());
        Collections.shuffle(distractors);

        List<String> opts = new ArrayList<>();
        opts.add(correct);
        distractors.stream().limit(3).forEach(opts::add);
        while (opts.size() < 4) opts.add("Unknown Movie");
        Collections.shuffle(opts);
        return opts;
    }

    private List<String> buildYearOptions(int correct) {
        Set<Integer> years = new LinkedHashSet<>();
        years.add(correct);
        for (int off : new int[]{-3, -1, 2, 4, -2, 3}) {
            if (years.size() >= 4) break;
            years.add(correct + off);
        }
        List<String> opts = years.stream().map(String::valueOf).collect(Collectors.toList());
        Collections.shuffle(opts);
        return opts;
    }

    private <T> List<T> shuffled(List<T> list) {
        Collections.shuffle(list);
        return list;
    }

    private List<Movie> filter(List<Movie> movies, java.util.function.Predicate<Movie> pred) {
        return movies.stream().filter(pred).collect(Collectors.toList());
    }

    private boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }

    private List<String> fromJson(String json) {
        try { return objectMapper.readValue(json, new TypeReference<>() {}); }
        catch (Exception e) { return List.of(); }
    }
}
