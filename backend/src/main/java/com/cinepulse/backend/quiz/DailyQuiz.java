package com.cinepulse.backend.quiz;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
@Entity
@Table(name = "daily_quizzes")
public class DailyQuiz {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private LocalDate quizDate;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "daily_quiz_questions",
        joinColumns = @JoinColumn(name = "daily_quiz_id"),
        inverseJoinColumns = @JoinColumn(name = "question_id")
    )
    private List<QuizQuestion> questions;

    // Featured hero label shown on dashboard (e.g. "Christopher Nolan")
    private String theme;

    // Poster used in the featured hero card on dashboard
    private String themePosterPath;
}
