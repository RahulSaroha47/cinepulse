package com.cinepulse.backend.jigsaw;

import com.cinepulse.backend.user.User;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "jigsaw_attempts",
       uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "jigsaw_date"}))
public class JigsawAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "jigsaw_date", nullable = false)
    private LocalDate jigsawDate;

    private int timeTaken; // seconds

    private int score;

    private boolean completed;

    private LocalDateTime completedAt;
}
