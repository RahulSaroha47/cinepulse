package com.cinepulse.backend.quiz;

import com.cinepulse.backend.user.User;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "quiz_attempts",
       uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "quiz_date"}))
public class QuizAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private LocalDate quizDate;

    // JSON: [{questionId, selectedAnswer, timeLeft}]
    @Column(columnDefinition = "TEXT")
    private String answersJson;

    private Integer score;

    private LocalDateTime completedAt;
}
