package com.cinepulse.backend.quiz;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface DailyQuizRepository extends JpaRepository<DailyQuiz, Long> {

    Optional<DailyQuiz> findByQuizDate(LocalDate date);
}
