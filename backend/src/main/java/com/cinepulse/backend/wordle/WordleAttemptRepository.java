package com.cinepulse.backend.wordle;

import com.cinepulse.backend.user.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface WordleAttemptRepository extends JpaRepository<WordleAttempt, Long> {
    Optional<WordleAttempt> findByUserAndWordleDate(User user, LocalDate date);
    long countByUser(User user);
}
