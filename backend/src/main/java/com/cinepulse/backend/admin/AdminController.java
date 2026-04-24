package com.cinepulse.backend.admin;

import com.cinepulse.backend.tmdb.TmdbService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    @Value("${admin.secret-key}")
    private String secretKey;

    private final TmdbService tmdbService;

    @PostMapping("/seed-movies")
    public ResponseEntity<?> seedMovies(
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey,
            @RequestParam(defaultValue = "10") int pages) {

        if (!secretKey.equals(adminKey)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid admin key"));
        }

        if (pages < 1 || pages > 75) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "pages must be between 1 and 75"));
        }

        log.info("Admin triggered movie seed: {} pages", pages);
        int newMovies = tmdbService.appendMovies(pages);
        tmdbService.enrichMovies();

        return ResponseEntity.ok(Map.of(
                "message", "Done",
                "newMoviesAdded", newMovies,
                "pagesScanned", pages
        ));
    }
}
