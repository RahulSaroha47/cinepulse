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
        tmdbService.enrichMovies();
        seedDialogues();
        seedDirectors();
    }

    private void seedMovies() {
        tmdbService.seedMovies();
    }

    private void seedDialogues() {
        if (dialogueRepository.count() > 0) return;

        List<Dialogue> dialogues = List.of(
            dialogue("All is well.", "3 Idiots", "Rancho"),
            dialogue("Mere paas maa hai.", "Deewar", "Ravi"),
            dialogue("Don ko pakadna mushkil hi nahi, namumkin hai.", "Don", "Don"),
            dialogue("Bade bade deshon mein aisi choti choti baatein hoti rehti hain.", "Dilwale Dulhania Le Jayenge", "Raj"),
            dialogue("Picture abhi baaki hai mere dost.", "Om Shanti Om", "Om Kapoor"),
            dialogue("Ek baar jo maine commitment kar di, toh main apne aap ki bhi nahi sunta.", "Wanted", "Radhe"),
            dialogue("Pushpa, I hate tears.", "Amar Prem", "Anand Babu"),
            dialogue("Rishtey mein toh hum tumhare baap lagte hain, naam hai Shahenshah.", "Shahenshah", "Shahenshah"),
            dialogue("Kitne aadmi the?", "Sholay", "Gabbar Singh"),
            dialogue("Jo dar gaya, samjho mar gaya.", "Sholay", "Jai"),
            dialogue("Mogambo khush hua.", "Mr. India", "Mogambo"),
            dialogue("Kuch kuch hota hai, tum nahi samjhoge.", "Kuch Kuch Hota Hai", "Rahul"),
            dialogue("Zindagi lambi nahi badi honi chahiye.", "3 Idiots", "Rancho"),
            dialogue("Agar kisi cheez ko dil se chaho toh poori kayanat usse tumse milane ki koshish mein lag jaati hai.", "Om Shanti Om", "Om Kapoor"),
            dialogue("Hum jahan khade ho jaate hain, line wahin se shuru hoti hai.", "Kaalia", "Kaalia"),
            dialogue("Dhai kilo ka haath jab kisipe padta hai na, toh aadmi uthta nahi, uth jaata hai.", "Sultan", "Sultan"),
            dialogue("Bura mat dekho, bura mat suno, bura mat kaho... aur fir dekho kitna maza aata hai.", "Munna Bhai M.B.B.S.", "Munna Bhai"),
            dialogue("Balma, bada balma.", "Gangs of Wasseypur", "Sardar Khan"),
            dialogue("Thoda jee le.", "Zindagi Na Milegi Dobara", "Kabir"),
            dialogue("Ye dil maange more.", "Mission Kashmir", "Altaaf")
        );

        dialogueRepository.saveAll(dialogues);
        log.info("Seeded {} Bollywood dialogues.", dialogues.size());
    }

    private void seedDirectors() {
        if (directorEntryRepository.count() > 0) return;

        List<DirectorEntry> directors = List.of(
            director("Rajkumar Hirani",
                "[\"3 Idiots\",\"PK\",\"Munna Bhai M.B.B.S.\",\"Lage Raho Munna Bhai\",\"Sanju\",\"Dunki\"]"),
            director("Sanjay Leela Bhansali",
                "[\"Devdas\",\"Black\",\"Bajirao Mastani\",\"Padmaavat\",\"Gangubai Kathiawadi\",\"Hum Dil De Chuke Sanam\",\"Ram-Leela\"]"),
            director("Farhan Akhtar",
                "[\"Dil Chahta Hai\",\"Lakshya\",\"Don\",\"Don 2\",\"Zindagi Na Milegi Dobara\",\"Bhaag Milkha Bhaag\"]"),
            director("Karan Johar",
                "[\"Kuch Kuch Hota Hai\",\"Kabhi Khushi Kabhie Gham\",\"Kal Ho Na Ho\",\"Kabhi Alvida Naa Kehna\",\"My Name Is Khan\",\"Student of the Year\"]"),
            director("Imtiaz Ali",
                "[\"Jab We Met\",\"Love Aaj Kal\",\"Rockstar\",\"Highway\",\"Tamasha\",\"Laila Majnu\",\"Amar Singh Chamkila\"]"),
            director("Vishal Bhardwaj",
                "[\"Maqbool\",\"Omkara\",\"Kaminey\",\"7 Khoon Maaf\",\"Haider\",\"Rangoon\"]"),
            director("Anurag Kashyap",
                "[\"Black Friday\",\"Dev.D\",\"Gangs of Wasseypur\",\"Ugly\",\"Mukkabaaz\",\"Dobaaraa\"]"),
            director("Rohit Shetty",
                "[\"Golmaal\",\"Singham\",\"Bol Bachchan\",\"Chennai Express\",\"Dilwale\",\"Sooryavanshi\",\"Cirkus\"]"),
            director("Aditya Chopra",
                "[\"Dilwale Dulhania Le Jayenge\",\"Mohabbatein\",\"Rab Ne Bana Di Jodi\",\"Befikre\",\"Jab Tak Hai Jaan\"]"),
            director("Zoya Akhtar",
                "[\"Luck by Chance\",\"Zindagi Na Milegi Dobara\",\"Dil Dhadakne Do\",\"Gully Boy\",\"The Archies\"]")
        );

        directorEntryRepository.saveAll(directors);
        log.info("Seeded {} Bollywood director entries.", directors.size());
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
