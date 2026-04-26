package com.cinepulse.backend.watchlist;

import com.cinepulse.backend.movie.Movie;
import com.cinepulse.backend.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Repository
public interface WatchlistRepository extends JpaRepository<Watchlist, Long> {

    List<Watchlist> findByUserOrderByAddedAtDesc(User user);

    Optional<Watchlist> findByUserAndMovie(User user, Movie movie);

    boolean existsByUserAndMovie(User user, Movie movie);

    default Set<Long> findMovieIdsByUser(User user) {
        return findByUserOrderByAddedAtDesc(user).stream()
                .map(w -> w.getMovie().getId())
                .collect(Collectors.toSet());
    }
}
