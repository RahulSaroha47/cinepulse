package com.cinepulse.backend.jigsaw;

import com.cinepulse.backend.user.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface JigsawAttemptRepository extends JpaRepository<JigsawAttempt, Long> {
    Optional<JigsawAttempt> findByUserAndJigsawDate(User user, LocalDate date);
    long countByUser(User user);
}
