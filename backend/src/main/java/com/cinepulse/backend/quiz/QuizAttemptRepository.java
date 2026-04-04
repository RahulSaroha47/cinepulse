package com.cinepulse.backend.quiz;

import com.cinepulse.backend.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface QuizAttemptRepository extends JpaRepository<QuizAttempt, Long> {

    Optional<QuizAttempt> findByUserAndQuizDate(User user, LocalDate date);

    boolean existsByUserAndQuizDate(User user, LocalDate date);
}
