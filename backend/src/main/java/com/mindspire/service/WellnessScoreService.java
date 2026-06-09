package com.mindspire.service;

import com.mindspire.entity.AssessmentResult;
import com.mindspire.entity.MoodLog;
import com.mindspire.repository.AssessmentResultRepository;
import com.mindspire.repository.MoodLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WellnessScoreService {

    private final MoodLogRepository moodLogRepository;
    private final AssessmentResultRepository assessmentResultRepository;

    /**
     * Calculates compound wellness score for student:
     * - Mood Trends = 40%
     * - PHQ-9 = 20%
     * - GAD-7 = 20%
     * - Engagement Consistency = 20%
     */
    public int calculateWellnessScore(UUID userId) {
        // 1. Mood Trends (40%)
        List<MoodLog> moods = moodLogRepository.findAllByUserIdOrderByLoggedAtDesc(userId, PageRequest.of(0, 30));
        double moodScore = 100.0; // Default if no check-ins
        if (!moods.isEmpty()) {
            double avg = moods.stream().mapToInt(MoodLog::getScore).average().orElse(3.0);
            // Map 1-5 scale to 0-100
            moodScore = ((avg - 1.0) / 4.0) * 100.0;
        }

        // 2. PHQ-9 (20%)
        List<AssessmentResult> results = assessmentResultRepository.findAllByUserIdOrderByCompletedAtDesc(userId);
        Optional<AssessmentResult> phq9 = results.stream()
                .filter(r -> r.getAssessmentType().getName().toUpperCase().contains("PHQ-9") || 
                             r.getAssessmentType().getName().toUpperCase().contains("PHQ9"))
                .findFirst();
        double phqScore = 100.0; // Default if no assessment
        if (phq9.isPresent()) {
            int score = phq9.get().getTotalScore();
            // PHQ-9 scales 0 to 27. Invert since lower is better.
            phqScore = ((27.0 - score) / 27.0) * 100.0;
        }

        // 3. GAD-7 (20%)
        Optional<AssessmentResult> gad7 = results.stream()
                .filter(r -> r.getAssessmentType().getName().toUpperCase().contains("GAD-7") || 
                             r.getAssessmentType().getName().toUpperCase().contains("GAD7"))
                .findFirst();
        double gadScore = 100.0; // Default if no assessment
        if (gad7.isPresent()) {
            int score = gad7.get().getTotalScore();
            // GAD-7 scales 0 to 21. Invert since lower is better.
            gadScore = ((21.0 - score) / 21.0) * 100.0;
        }

        // 4. Engagement Consistency (20%) - Checkins in last 14 days
        OffsetDateTime threshold = OffsetDateTime.now().minusDays(14);
        long activeDays = moods.stream()
                .filter(m -> m.getLoggedAt().isAfter(threshold))
                .map(m -> m.getLoggedAt().toLocalDate())
                .distinct()
                .count();
        double engagementScore = (activeDays / 14.0) * 100.0;

        // 5. Aggregate compound score
        double total = (moodScore * 0.40) + (phqScore * 0.20) + (gadScore * 0.20) + (engagementScore * 0.20);
        return (int) Math.round(total);
    }
}
