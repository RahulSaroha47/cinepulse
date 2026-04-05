package com.cinepulse.backend.tmdb;

import com.cinepulse.backend.movie.Movie;
import com.cinepulse.backend.movie.MovieRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class TmdbService {

    @Value("${tmdb.api-key}")
    private String apiKey;

    @Value("${tmdb.base-url}")
    private String baseUrl;

    private final MovieRepository movieRepository;

    public void seedMovies() {
        if (movieRepository.count() > 20) {
            log.info("Movies already seeded, skipping.");
            return;
        }

        RestClient client = RestClient.create();
        int saved = 0;

        // Fetch English popular movies (pages 1-4)
        for (int page = 1; page <= 4; page++) {
            saved += fetchAndSavePage(client, "en-US", page);
        }

        // Fetch Hindi popular movies (page 1-2) for Bollywood coverage
        for (int page = 1; page <= 2; page++) {
            saved += fetchAndSavePage(client, "hi-IN", page);
        }

        log.info("Seeded {} movies from TMDB.", saved);
    }

    private int fetchAndSavePage(RestClient client, String language, int page) {
        try {
            String url = baseUrl + "/movie/popular?api_key=" + apiKey
                    + "&language=" + language + "&page=" + page;
            TmdbPageResponse response = client.get()
                    .uri(url)
                    .retrieve()
                    .body(TmdbPageResponse.class);

            if (response == null || response.getResults() == null) return 0;

            int count = 0;
            for (TmdbMovieResult r : response.getResults()) {
                if (movieRepository.existsByTmdbId(r.getId())) continue;
                if (r.getPosterPath() == null || r.getTitle() == null) continue;

                Movie movie = new Movie();
                movie.setTmdbId(r.getId());
                movie.setTitle(r.getTitle());
                movie.setPosterPath(r.getPosterPath());
                movie.setOverview(r.getOverview());

                if (r.getReleaseDate() != null && r.getReleaseDate().length() >= 4) {
                    try {
                        movie.setReleaseYear(Integer.parseInt(r.getReleaseDate().substring(0, 4)));
                    } catch (NumberFormatException ignored) {}
                }

                movieRepository.save(movie);
                count++;
            }
            return count;
        } catch (Exception e) {
            log.warn("Failed to fetch TMDB page {} lang {}: {}", page, language, e.getMessage());
            return 0;
        }
    }

    public List<TmdbMovieResult> searchMovies(String query) {
        RestClient client = RestClient.create();
        String url = baseUrl + "/search/movie?api_key=" + apiKey + "&query=" + query;
        TmdbPageResponse response = client.get()
                .uri(url)
                .retrieve()
                .body(TmdbPageResponse.class);
        return response != null ? response.getResults() : List.of();
    }
}
