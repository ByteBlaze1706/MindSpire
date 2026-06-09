package com.mindspire.service;

import com.mindspire.entity.MoodLog;
import com.mindspire.entity.Resource;
import com.mindspire.entity.ResourceBookmark;
import com.mindspire.entity.ResourceRecommendationHistory;
import com.mindspire.repository.MoodLogRepository;
import com.mindspire.repository.ResourceBookmarkRepository;
import com.mindspire.repository.ResourceRecommendationHistoryRepository;
import com.mindspire.repository.ResourceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ResourceService {

    private final ResourceRepository resourceRepository;
    private final ResourceBookmarkRepository bookmarkRepository;
    private final ResourceRecommendationHistoryRepository recommendationHistoryRepository;
    private final MoodLogRepository moodLogRepository;

    public List<Resource> getResources(UUID institutionId, String category) {
        if (category == null || category.trim().isEmpty() || category.equalsIgnoreCase("all")) {
            return resourceRepository.findAllByInstitutionIdAndStatusOrderByCreatedAtDesc(institutionId, "published");
        } else {
            return resourceRepository.findAllByInstitutionIdAndStatusAndCategoryOrderByCreatedAtDesc(institutionId, "published", category);
        }
    }

    @Transactional
    public void toggleBookmark(UUID userId, UUID resourceId) {
        Optional<ResourceBookmark> bookmarkOpt = bookmarkRepository.findByUserIdAndResourceId(userId, resourceId);
        if (bookmarkOpt.isPresent()) {
            bookmarkRepository.delete(bookmarkOpt.get());
        } else {
            ResourceBookmark bookmark = ResourceBookmark.builder()
                    .userId(userId)
                    .resourceId(resourceId)
                    .createdAt(OffsetDateTime.now())
                    .build();
            bookmarkRepository.save(bookmark);
        }
    }

    public List<ResourceBookmark> getBookmarks(UUID userId) {
        return bookmarkRepository.findAllByUserId(userId);
    }

    public boolean isBookmarked(UUID userId, UUID resourceId) {
        return bookmarkRepository.existsByUserIdAndResourceId(userId, resourceId);
    }

    /**
     * Recommend Engine: Matches student's recent logged moods to resource categories
     */
    @Transactional
    public List<Resource> getRecommendations(UUID userId, UUID institutionId) {
        // Query recent 10 mood logs
        List<MoodLog> moods = moodLogRepository.findAllByUserIdOrderByLoggedAtDesc(userId, PageRequest.of(0, 10));

        String categoryTag = "General Support";
        String reason = "General Wellness support";

        if (!moods.isEmpty()) {
            double avgScore = moods.stream().mapToInt(MoodLog::getScore).average().orElse(3.0);
            
            // Check for negative descriptors
            long anxietyOrStressCount = moods.stream()
                    .map(MoodLog::getDescriptor)
                    .filter(d -> "Stressed".equals(d) || "Anxious".equals(d))
                    .count();
                    
            long sadCount = moods.stream()
                    .map(MoodLog::getDescriptor)
                    .filter(d -> "Sad".equals(d) || "Exhausted".equals(d))
                    .count();

            if (anxietyOrStressCount >= 2 || avgScore <= 2.5) {
                categoryTag = "Anxiety & Stress Management";
                reason = "Recent stress check-ins";
            } else if (sadCount >= 2) {
                categoryTag = "Motivation";
                reason = "Recent fatigue/sadness check-ins";
            } else if (avgScore >= 4.0) {
                categoryTag = "Wellness";
                reason = "Maintain positive mood levels";
            }
        }

        // Query resources in selected category
        List<Resource> resources = resourceRepository.findAllByInstitutionIdAndStatusAndCategoryOrderByCreatedAtDesc(
                institutionId, "published", categoryTag
        );

        if (resources.isEmpty()) {
            // Fallback to general lists if category is empty
            resources = resourceRepository.findAllByInstitutionIdAndStatusOrderByCreatedAtDesc(institutionId, "published");
        }

        // Limit to top 3 and save logs to recommendation history
        List<Resource> topRecommendations = resources.stream().limit(3).collect(Collectors.toList());
        for (Resource r : topRecommendations) {
            ResourceRecommendationHistory history = ResourceRecommendationHistory.builder()
                    .userId(userId)
                    .resourceId(r.getId())
                    .recommendedReason(reason)
                    .createdAt(OffsetDateTime.now())
                    .build();
            recommendationHistoryRepository.save(history);
        }

        return topRecommendations;
    }
}
