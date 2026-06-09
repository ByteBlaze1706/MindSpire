package com.mindspire.service;

import com.mindspire.entity.RiskAlert;
import com.mindspire.repository.RiskAlertRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CrisisDetectionService {

    private final RiskAlertRepository riskAlertRepository;

    private static final List<String> CRISIS_KEYWORDS = List.of(
            "suicide", "kill myself", "end my life", "want to die", "self-harm", 
            "cutting myself", "hurt myself", "better off dead", "hanging myself",
            "poison myself", "self harm", "suicidal"
    );

    public boolean detectCrisis(String text) {
        if (text == null || text.trim().isEmpty()) {
            return false;
        }
        String cleanText = text.toLowerCase(Locale.ROOT);
        for (String keyword : CRISIS_KEYWORDS) {
            if (cleanText.contains(keyword)) {
                return true;
            }
        }
        return false;
    }

    @Transactional
    public void triggerRiskAlert(UUID userId, UUID institutionId, String sourceType, String contentSnippet) {
        // Cut snippet to fit notes or save reference details
        String snippet = contentSnippet != null && contentSnippet.length() > 500 
                ? contentSnippet.substring(0, 500) + "..." 
                : contentSnippet;

        RiskAlert alert = RiskAlert.builder()
                .userId(userId)
                .institutionId(institutionId)
                .sourceType(sourceType) // 'mood', 'journal', 'assessment', 'ai' (or 'community')
                .severity("critical")
                .status("pending")
                .resolutionNotes("System Auto-Generated: Crisis keywords identified. Snippet: [" + snippet + "]")
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build();

        riskAlertRepository.save(alert);
    }
}
