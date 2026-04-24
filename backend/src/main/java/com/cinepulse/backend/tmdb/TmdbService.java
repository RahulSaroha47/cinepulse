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
        appendMovies(8);
    }

    public int appendMovies(int pages) {
        RestClient client = RestClient.create();
        int saved = 0;
        for (int page = 1; page <= pages; page++) {
            saved += fetchBollywoodPage(client, page);
        }
        log.info("Appended {} new Bollywood movies from TMDB ({} pages).", saved, pages);
        return saved;
    }

    public void enrichMovies() {
        List<Movie> unenriched = movieRepository.findByGenreIsNull();
        if (unenriched.isEmpty()) {
            log.info("All movies already enriched, skipping.");
            return;
        }

        log.info("Enriching {} movies with TMDB details...", unenriched.size());
        RestClient client = RestClient.create();
        int enriched = 0;

        for (Movie movie : unenriched) {
            try {
                String url = baseUrl + "/movie/" + movie.getTmdbId()
                        + "?api_key=" + apiKey + "&append_to_response=credits";

                TmdbMovieDetails details = client.get()
                        .uri(url)
                        .retrieve()
                        .body(TmdbMovieDetails.class);

                if (details == null) continue;

                // Genre: join first 2 genre names
                if (details.getGenres() != null && !details.getGenres().isEmpty()) {
                    String genre = details.getGenres().stream()
                            .limit(2)
                            .map(TmdbMovieDetails.Genre::getName)
                            .reduce((a, b) -> a + ", " + b)
                            .orElse(null);
                    movie.setGenre(genre);
                }

                // Language: prefer spoken_languages[0] english name, fallback to original_language
                if (details.getSpokenLanguages() != null && !details.getSpokenLanguages().isEmpty()) {
                    movie.setLanguage(details.getSpokenLanguages().get(0).getEnglishName());
                } else if (details.getOriginalLanguage() != null) {
                    movie.setLanguage(details.getOriginalLanguage());
                }

                // Tagline
                if (details.getTagline() != null && !details.getTagline().isBlank()) {
                    movie.setTagline(details.getTagline());
                }

                // Director + top cast from credits
                if (details.getCredits() != null) {
                    if (details.getCredits().getCrew() != null) {
                        details.getCredits().getCrew().stream()
                                .filter(c -> "Director".equals(c.getJob()))
                                .findFirst()
                                .ifPresent(c -> movie.setDirector(c.getName()));
                    }
                    if (details.getCredits().getCast() != null) {
                        details.getCredits().getCast().stream()
                                .filter(c -> c.getOrder() != null)
                                .min((a, b) -> Integer.compare(a.getOrder(), b.getOrder()))
                                .ifPresent(c -> movie.setCast(c.getName()));
                    }
                }

                movieRepository.save(movie);
                enriched++;

                // Respect TMDB rate limit
                Thread.sleep(60);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            } catch (Exception e) {
                log.warn("Failed to enrich movie {} ({}): {}", movie.getTitle(), movie.getTmdbId(), e.getMessage());
            }
        }

        log.info("Enriched {}/{} movies.", enriched, unenriched.size());
    }

    private int fetchBollywoodPage(RestClient client, int page) {
        try {
            // /discover/movie filters strictly by original_language=hi (true Bollywood)
            String url = baseUrl + "/discover/movie?api_key=" + apiKey
                    + "&with_original_language=hi"
                    + "&sort_by=popularity.desc"
                    + "&page=" + page;

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
            log.warn("Failed to fetch Bollywood TMDB page {}: {}", page, e.getMessage());
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
