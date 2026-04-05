package com.cinepulse.backend.quiz;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "director_entries")
public class DirectorEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    // JSON array of movie titles directed by this person
    // e.g. ["Inception","Interstellar","The Dark Knight","Oppenheimer","Tenet"]
    @Column(columnDefinition = "TEXT", nullable = false)
    private String moviesJson;
}
