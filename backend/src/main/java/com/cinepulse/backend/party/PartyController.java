package com.cinepulse.backend.party;

import com.cinepulse.backend.party.dto.PartyQuestionDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/party")
@RequiredArgsConstructor
public class PartyController {

    private final PartyService partyService;

    /**
     * GET /api/party/questions?count=N
     * Returns N randomized questions for a local party game session.
     * correctAnswer is included — validation is client-side for local multiplayer.
     */
    @GetMapping("/questions")
    public ResponseEntity<List<PartyQuestionDto>> getQuestions(
            @RequestParam(defaultValue = "30") int count) {
        if (count < 1) count = 1;
        if (count > 90) count = 90;
        return ResponseEntity.ok(partyService.generateQuestions(count));
    }
}
