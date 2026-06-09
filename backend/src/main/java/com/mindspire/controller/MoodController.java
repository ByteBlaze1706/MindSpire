package com.mindspire.controller;

import com.mindspire.entity.MoodLog;
import com.mindspire.entity.User;
import com.mindspire.repository.UserRepository;
import com.mindspire.service.MoodService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/mood")
@RequiredArgsConstructor
@CrossOrigin(originPatterns = "*")
public class MoodController {

    private final MoodService moodService;
    private final UserRepository userRepository;

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User profile not found."));
    }

    @GetMapping("/history")
    public ResponseEntity<List<MoodLog>> getMoodHistory() {
        User user = getCurrentUser();
        List<MoodLog> history = moodService.getUserMoodHistory(user.getId());
        return ResponseEntity.ok(history);
    }

    @PostMapping("/log")
    public ResponseEntity<?> logMood(@RequestBody Map<String, Object> body) {
        User user = getCurrentUser();

        try {
            int score = (Integer) body.get("score");
            String descriptor = (String) body.get("descriptor");
            String notes = (String) body.get("notes");

            MoodLog log = moodService.logMood(user.getId(), user.getInstitutionId(), score, descriptor, notes);
            return ResponseEntity.ok(log);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        }
    }
}
