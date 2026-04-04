package com.cinepulse.backend.quiz;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "dialogues")
public class Dialogue {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String text;

    @Column(nullable = false)
    private String movieTitle;

    @Column(name = "character_name")
    private String character;
}
