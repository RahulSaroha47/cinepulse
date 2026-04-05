package com.cinepulse.backend.tmdb;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class TmdbMovieDetails {

    private Long id;
    private String tagline;

    @JsonProperty("original_language")
    private String originalLanguage;

    @JsonProperty("spoken_languages")
    private List<SpokenLanguage> spokenLanguages;

    private List<Genre> genres;

    private Credits credits;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Genre {
        private String name;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class SpokenLanguage {
        @JsonProperty("english_name")
        private String englishName;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Credits {
        private List<CastMember> cast;
        private List<CrewMember> crew;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class CastMember {
        private String name;
        private Integer order;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class CrewMember {
        private String name;
        private String job;
    }
}
