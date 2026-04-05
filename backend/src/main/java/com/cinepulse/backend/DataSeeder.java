package com.cinepulse.backend;

import com.cinepulse.backend.quiz.*;
import com.cinepulse.backend.tmdb.TmdbService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataSeeder implements ApplicationRunner {

    private final TmdbService tmdbService;
    private final DialogueRepository dialogueRepository;
    private final DirectorEntryRepository directorEntryRepository;

    @Override
    public void run(ApplicationArguments args) {
        seedMovies();
        seedDialogues();
        seedDirectors();
    }

    private void seedMovies() {
        tmdbService.seedMovies();
    }

    private void seedDialogues() {
        if (dialogueRepository.count() > 0) return;

        List<Dialogue> dialogues = List.of(
            dialogue("Why so serious?", "The Dark Knight", "Joker"),
            dialogue("I am Groot.", "Guardians of the Galaxy", "Groot"),
            dialogue("To infinity and beyond!", "Toy Story", "Buzz Lightyear"),
            dialogue("You can't handle the truth!", "A Few Good Men", "Col. Jessup"),
            dialogue("I'll be back.", "The Terminator", "The Terminator"),
            dialogue("Life is like a box of chocolates, you never know what you're gonna get.", "Forrest Gump", "Forrest Gump"),
            dialogue("I see dead people.", "The Sixth Sense", "Cole Sear"),
            dialogue("Here's looking at you, kid.", "Casablanca", "Rick Blaine"),
            dialogue("You talking to me?", "Taxi Driver", "Travis Bickle"),
            dialogue("With great power comes great responsibility.", "Spider-Man", "Uncle Ben"),
            dialogue("Just keep swimming.", "Finding Nemo", "Dory"),
            dialogue("Why do we fall? So we can learn to pick ourselves up.", "Batman Begins", "Alfred"),
            dialogue("All is well.", "3 Idiots", "Rancho"),
            dialogue("Mere paas maa hai.", "Deewar", "Ravi"),
            dialogue("Don ko pakadna mushkil hi nahi, namumkin hai.", "Don", "Don"),
            dialogue("Bade bade deshon mein aisi choti choti baatein hoti rehti hain.", "Dilwale Dulhania Le Jayenge", "Raj"),
            dialogue("Picture abhi baaki hai mere dost.", "Om Shanti Om", "Om Kapoor"),
            dialogue("Ek baar jo maine commitment kar di, toh main apne aap ki bhi nahi sunta.", "Wanted", "Radhe"),
            dialogue("Some people can't believe in themselves until someone else believes in them first.", "Good Will Hunting", "Sean"),
            dialogue("Get busy living or get busy dying.", "The Shawshank Redemption", "Andy Dufresne")
        );

        dialogueRepository.saveAll(dialogues);
        log.info("Seeded {} dialogues.", dialogues.size());
    }

    private void seedDirectors() {
        if (directorEntryRepository.count() > 0) return;

        List<DirectorEntry> directors = List.of(
            director("Christopher Nolan",
                "[\"Inception\",\"Interstellar\",\"The Dark Knight\",\"Memento\",\"Oppenheimer\",\"Tenet\",\"The Prestige\",\"Dunkirk\"]"),
            director("Steven Spielberg",
                "[\"Schindler's List\",\"Jurassic Park\",\"Saving Private Ryan\",\"E.T. the Extra-Terrestrial\",\"Indiana Jones and the Raiders of the Lost Ark\",\"Jaws\"]"),
            director("Martin Scorsese",
                "[\"Goodfellas\",\"The Departed\",\"The Wolf of Wall Street\",\"Taxi Driver\",\"Raging Bull\",\"Killers of the Flower Moon\"]"),
            director("Quentin Tarantino",
                "[\"Pulp Fiction\",\"Kill Bill: Volume 1\",\"Inglourious Basterds\",\"Django Unchained\",\"Reservoir Dogs\",\"Once Upon a Time in Hollywood\"]"),
            director("James Cameron",
                "[\"Titanic\",\"Avatar\",\"Aliens\",\"The Terminator\",\"True Lies\",\"Avatar: The Way of Water\"]"),
            director("SS Rajamouli",
                "[\"Baahubali: The Beginning\",\"Baahubali 2: The Conclusion\",\"RRR\",\"Magadheera\",\"Eega\"]"),
            director("Rajkumar Hirani",
                "[\"3 Idiots\",\"PK\",\"Munna Bhai M.B.B.S.\",\"Lage Raho Munna Bhai\",\"Sanju\"]"),
            director("Ridley Scott",
                "[\"Gladiator\",\"The Martian\",\"Blade Runner\",\"Alien\",\"Black Hawk Down\",\"Kingdom of Heaven\"]")
        );

        directorEntryRepository.saveAll(directors);
        log.info("Seeded {} director entries.", directors.size());
    }

    private Dialogue dialogue(String text, String movieTitle, String character) {
        Dialogue d = new Dialogue();
        d.setText(text);
        d.setMovieTitle(movieTitle);
        d.setCharacter(character);
        return d;
    }

    private DirectorEntry director(String name, String moviesJson) {
        DirectorEntry e = new DirectorEntry();
        e.setName(name);
        e.setMoviesJson(moviesJson);
        return e;
    }
}
