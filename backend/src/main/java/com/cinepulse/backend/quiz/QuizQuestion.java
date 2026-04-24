package com.cinepulse.backend.quiz;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "quiz_questions")
public class QuizQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    private QuestionType type;

    // Displayed question text
    // POSTER_BLIND  → "Guess the movie from the poster"
    // WHO_SAID_IT   → the dialogue quote
    // DIRECTORS_CUT → "Which film was NOT directed by {director}?"
    // RELEASE_YEAR  → "When was '{title}' released?"
    @Column(columnDefinition = "TEXT")
    private String questionText;

    // Poster path for POSTER_BLIND and RELEASE_YEAR questions (nullable otherwise)
    private String posterPath;

    // JSON array of 4 option strings  e.g. ["Inception","Tenet","The Batman","Dune"]
    @Column(columnDefinition = "TEXT")
    private String optionsJson;

    private String correctAnswer;
}
