package com.mindspire.controller;

import com.mindspire.dto.AssessmentSubmissionRequest;
import com.mindspire.entity.*;
import com.mindspire.repository.UserRepository;
import com.mindspire.service.AssessmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/assessment")
@RequiredArgsConstructor
@CrossOrigin(originPatterns = "*", allowCredentials = "true")
public class AssessmentController {

    private final AssessmentService assessmentService;
    private final UserRepository userRepository;

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User profile not found."));
    }

    @GetMapping("/list")
    public ResponseEntity<List<AssessmentType>> getAvailableAssessments() {
        return ResponseEntity.ok(assessmentService.getAvailableAssessments());
    }

    @GetMapping("/questions/{typeId}")
    public ResponseEntity<List<AssessmentQuestion>> getQuestions(@PathVariable("typeId") UUID typeId) {
        return ResponseEntity.ok(assessmentService.getQuestions(typeId));
    }

    @PostMapping("/submit")
    public ResponseEntity<?> submitAssessment(@RequestBody AssessmentSubmissionRequest request) {
        User user = getCurrentUser();
        try {
            if (request.getTypeId() == null || request.getAnswers() == null || request.getAnswers().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Submission fields are missing or empty."));
            }

            AssessmentResult result = assessmentService.submitAssessment(
                    user.getId(),
                    user.getInstitutionId(),
                    request.getTypeId(),
                    request.getAnswers()
            );
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @GetMapping("/history")
    public ResponseEntity<List<AssessmentResult>> getHistory() {
        User user = getCurrentUser();
        return ResponseEntity.ok(assessmentService.getHistory(user.getId()));
    }
}
