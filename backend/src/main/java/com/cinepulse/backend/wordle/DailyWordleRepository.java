package com.cinepulse.backend.wordle;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface DailyWordleRepository extends JpaRepository<DailyWordle, Long> {
    Optional<DailyWordle> findByWordleDate(LocalDate date);
}
