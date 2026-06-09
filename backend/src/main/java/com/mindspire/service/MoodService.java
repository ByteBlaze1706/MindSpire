package com.mindspire.service;

import com.mindspire.entity.MoodLog;
import com.mindspire.repository.MoodLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MoodService {

    private final MoodLogRepository moodLogRepository;

    public List<MoodLog> getUserMoodHistory(UUID userId) {
        return moodLogRepository.findAllByUserIdOrderByLoggedAtDesc(userId, PageRequest.of(0, 30));
    }

    @Transactional
    public MoodLog logMood(UUID userId, UUID institutionId, int score, String descriptor, String notes) {
        if (score < 1 || score > 5) {
            throw new IllegalArgumentException("Mood score must occur between 1 and 5.");
        }

        MoodLog moodLog = MoodLog.builder()
                .userId(userId)
                .institutionId(institutionId)
                .score(score)
                .descriptor(descriptor)
                .notes(notes) // Optionally envelope encrypt later if needed
                .loggedAt(OffsetDateTime.now())
                .build();

        return moodLogRepository.save(moodLog);
    }
}
