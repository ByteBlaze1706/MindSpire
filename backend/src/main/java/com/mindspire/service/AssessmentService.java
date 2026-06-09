package com.mindspire.service;

import com.mindspire.entity.*;
import com.mindspire.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AssessmentService {

    private final AssessmentTypeRepository assessmentTypeRepository;
    private final AssessmentQuestionRepository assessmentQuestionRepository;
    private final AssessmentResultRepository assessmentResultRepository;
    private final AssessmentResponseRepository assessmentResponseRepository;

    public List<AssessmentType> getAvailableAssessments() {
        return assessmentTypeRepository.findAll();
    }

    public List<AssessmentQuestion> getQuestions(UUID typeId) {
        return assessmentQuestionRepository.findAllByAssessmentTypeIdOrderByDisplayOrderAsc(typeId);
    }

    public List<AssessmentResult> getHistory(UUID userId) {
        return assessmentResultRepository.findAllByUserIdOrderByCompletedAtDesc(userId);
    }

    @Transactional
    public AssessmentResult submitAssessment(UUID userId, UUID institutionId, UUID typeId, Map<UUID, Integer> answers) {
        AssessmentType type = assessmentTypeRepository.findById(typeId)
                .orElseThrow(() -> new NoSuchElementException("Assessment type not found."));

        int totalScore = 0;
        List<AssessmentQuestion> questions = assessmentQuestionRepository.findAllByAssessmentTypeIdOrderByDisplayOrderAsc(typeId);
        List<AssessmentResponse> responsesToSave = new ArrayList<>();

        // 1. Calculate Score and prepare responses
        for (AssessmentQuestion q : questions) {
            Integer value = answers.get(q.getId());
            if (value == null) {
                throw new IllegalArgumentException("Answer missing for question: " + q.getQuestionText());
            }
            if (value < 0 || value > 3) {
                throw new IllegalArgumentException("Answer score values must scale between 0 and 3.");
            }
            totalScore += value;
        }

        // 2. Map Severity Level
        String severityLevel = determineSeverity(type.getName(), totalScore);

        // 3. Save result
        AssessmentResult result = AssessmentResult.builder()
                .userId(userId)
                .institutionId(institutionId)
                .assessmentType(type)
                .totalScore(totalScore)
                .severityLevel(severityLevel)
                .completedAt(OffsetDateTime.now())
                .build();
        result = assessmentResultRepository.save(result);

        // 4. Save individual responses
        for (AssessmentQuestion q : questions) {
            Integer value = answers.get(q.getId());
            AssessmentResponse resp = AssessmentResponse.builder()
                    .assessmentResultId(result.getId())
                    .questionId(q.getId())
                    .selectedValue(value)
                    .createdAt(OffsetDateTime.now())
                    .build();
            responsesToSave.add(resp);
        }
        assessmentResponseRepository.saveAll(responsesToSave);

        return result;
    }

    private String determineSeverity(String testName, int score) {
        String name = testName.toUpperCase();
        if (name.contains("PHQ-9") || name.contains("PHQ9")) {
            if (score <= 4) return "Minimal";
            if (score <= 9) return "Mild";
            if (score <= 14) return "Moderate";
            if (score <= 19) return "Moderately Severe";
            return "Severe";
        } else if (name.contains("GAD-7") || name.contains("GAD7")) {
            if (score <= 4) return "Minimal";
            if (score <= 9) return "Mild";
            if (score <= 14) return "Moderate";
            return "Severe";
        }
        return score <= 10 ? "Mild" : "Severe";
    }
}
