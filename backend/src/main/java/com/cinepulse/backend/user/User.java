package com.cinepulse.backend.user;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String passwordHash;

    private String avatarUrl;

    private Integer reputationScore = 0;

    // Quiz streak
    private Integer streak = 0;
    private java.time.LocalDate lastQuizDate;

    // Wordle streak
    private Integer wordleStreak = 0;
    private java.time.LocalDate wordleLastPlayed;

    // Jigsaw streak
    private Integer jigsawStreak = 0;
    private java.time.LocalDate jigsawLastPlayed;

    // Overall streak — consecutive days playing any game
    private Integer overallStreak = 0;
    private java.time.LocalDate overallLastPlayed;

    private Integer totalScore = 0;

    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}