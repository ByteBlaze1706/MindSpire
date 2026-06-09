package com.mindspire.controller;

import com.mindspire.entity.User;
import com.mindspire.entity.MoodLog;
import com.mindspire.entity.AssessmentResult;
import com.mindspire.repository.UserRepository;
import com.mindspire.repository.MoodLogRepository;
import com.mindspire.repository.AssessmentResultRepository;
import com.mindspire.service.WellnessScoreService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/wellness")
@RequiredArgsConstructor
@CrossOrigin(originPatterns = "*", allowCredentials = "true")
public class WellnessController {

    private final WellnessScoreService wellnessScoreService;
    private final UserRepository userRepository;
    private final MoodLogRepository moodLogRepository;
    private final AssessmentResultRepository assessmentResultRepository;

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User profile not found."));
    }

    @GetMapping("/score")
    public ResponseEntity<Map<String, Object>> getWellnessScore() {
        User user = getCurrentUser();
        int score = wellnessScoreService.calculateWellnessScore(user.getId());
        return ResponseEntity.ok(Map.of("score", score));
    }

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboardData() {
        User user = getCurrentUser();
        UUID userId = user.getId();

        // 1. Calculate compound score
        int score = wellnessScoreService.calculateWellnessScore(userId);

        // 2. Fetch last 30 mood logs for trends
        List<MoodLog> moodLogs = moodLogRepository.findAllByUserIdOrderByLoggedAtDesc(userId, PageRequest.of(0, 30));
        
        // 3. Calculate streak
        int streak = calculateStreak(moodLogs);

        // 4. Retrieve latest assessment results
        List<AssessmentResult> assessments = assessmentResultRepository.findAllByUserIdOrderByCompletedAtDesc(userId);
        
        Optional<AssessmentResult> latestPhq9 = assessments.stream()
                .filter(r -> r.getAssessmentType().getName().toUpperCase().contains("PHQ-9") || 
                             r.getAssessmentType().getName().toUpperCase().contains("PHQ9"))
                .findFirst();

        Optional<AssessmentResult> latestGad7 = assessments.stream()
                .filter(r -> r.getAssessmentType().getName().toUpperCase().contains("GAD-7") || 
                             r.getAssessmentType().getName().toUpperCase().contains("GAD7"))
                .findFirst();

        Map<String, Object> data = new HashMap<>();
        data.put("wellnessScore", score);
        data.put("streak", streak);
        data.put("moodLogs", moodLogs.stream()
                .map(m -> Map.of(
                        "id", m.getId(),
                        "score", m.getScore(),
                        "descriptor", m.getDescriptor() != null ? m.getDescriptor() : "Neutral",
                        "notes", m.getNotes() != null ? m.getNotes() : "",
                        "loggedAt", m.getLoggedAt()
                ))
                .collect(Collectors.toList())
        );
        
        latestPhq9.ifPresent(r -> data.put("phq9", Map.of("score", r.getTotalScore(), "severity", r.getSeverityLevel(), "date", r.getCompletedAt())));
        latestGad7.ifPresent(r -> data.put("gad7", Map.of("score", r.getTotalScore(), "severity", r.getSeverityLevel(), "date", r.getCompletedAt())));

        return ResponseEntity.ok(data);
    }

    private int calculateStreak(List<MoodLog> moodLogs) {
        if (moodLogs == null || moodLogs.isEmpty()) {
            return 0;
        }

        // Extract dates
        Set<LocalDate> dates = moodLogs.stream()
                .map(m -> m.getLoggedAt().toLocalDate())
                .collect(Collectors.toSet());

        LocalDate today = LocalDate.now();
        LocalDate yesterday = today.minusDays(1);

        // Streak continues if logged today or yesterday
        if (!dates.contains(today) && !dates.contains(yesterday)) {
            return 0;
        }

        int streak = 0;
        LocalDate current = dates.contains(today) ? today : yesterday;

        while (dates.contains(current)) {
            streak++;
            current = current.minusDays(1);
        }

        return streak;
    }
}
