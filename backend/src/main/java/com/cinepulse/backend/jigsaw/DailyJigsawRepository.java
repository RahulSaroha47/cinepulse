package com.cinepulse.backend.jigsaw;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface DailyJigsawRepository extends JpaRepository<DailyJigsaw, Long> {
    Optional<DailyJigsaw> findByJigsawDate(LocalDate date);
}
