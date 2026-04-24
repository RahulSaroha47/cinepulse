package com.cinepulse.backend.quiz;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DirectorEntryRepository extends JpaRepository<DirectorEntry, Long> {
}
