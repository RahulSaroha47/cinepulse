package com.cinepulse.backend.movie;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/movies")
@RequiredArgsConstructor
public class MovieController {

    private final MovieRepository movieRepository;

    // Returns random Bollywood movie poster paths for the dashboard grid
    @GetMapping("/posters")
    public ResponseEntity<List<String>> getRandomPosters() {
        List<Movie> movies = new ArrayList<>(movieRepository.findAllByPosterPathIsNotNull());
        Collections.shuffle(movies);
        List<String> posters = movies.stream()
                .map(Movie::getPosterPath)
                .limit(14)
                .collect(Collectors.toList());
        return ResponseEntity.ok(posters);
    }
}
