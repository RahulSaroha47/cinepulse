package com.cinepulse.backend.wordle;

import com.cinepulse.backend.user.User;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "wordle_attempts",
       uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "wordle_date"}))
public class WordleAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "wordle_date", nullable = false)
    private LocalDate wordleDate;

    // JSON array of guess strings: ["Inception", "The Matrix"]
    @Column(columnDefinition = "TEXT")
    private String guessesJson;

    private boolean solved;

    private int score;

    private LocalDateTime completedAt;
}
