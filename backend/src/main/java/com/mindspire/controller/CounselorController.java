package com.mindspire.controller;

import com.mindspire.dto.*;
import com.mindspire.entity.CounselorAvailability;
import com.mindspire.entity.User;
import com.mindspire.repository.UserRepository;
import com.mindspire.service.CounselorService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/counselor")
@RequiredArgsConstructor
@CrossOrigin(originPatterns = "*", allowCredentials = "true")
public class CounselorController {

    private final CounselorService counselorService;
    private final UserRepository userRepository;

    @Value("${mindspire.encryption.key}")
    private String masterKey;

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User profile not found."));
    }

    private void checkCounselorRole(User user) {
        String role = user.getRole();
        if (!role.equalsIgnoreCase("counselor") && 
            !role.equalsIgnoreCase("moderator") && 
            !role.equalsIgnoreCase("inst_admin") && 
            !role.equalsIgnoreCase("super_admin")) {
            throw new IllegalStateException("Access Denied: You do not have counselor credentials.");
        }
        if (role.equalsIgnoreCase("counselor") && !user.isApproved()) {
            throw new IllegalStateException("Access Denied: Your counselor profile is pending administrator approval.");
        }
    }

    @GetMapping("/status")
    public ResponseEntity<?> getStatus() {
        try {
            User user = getCurrentUser();
            return ResponseEntity.ok(Map.of(
                "email", user.getEmail(),
                "status", user.getCounselorStatus() != null ? user.getCounselorStatus() : "pending",
                "isApproved", user.isApproved()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @GetMapping("/roster")
    public ResponseEntity<?> getRoster() {
        try {
            User user = getCurrentUser();
            checkCounselorRole(user);
            List<StudentRosterDto> roster = counselorService.getAssignedStudents(user.getId(), user.getInstitutionId());
            return ResponseEntity.ok(roster);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("success", false, "error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @GetMapping("/availability")
    public ResponseEntity<?> getAvailability() {
        try {
            User user = getCurrentUser();
            checkCounselorRole(user);
            List<CounselorAvailability> slots = counselorService.getAvailability(user.getId());
            return ResponseEntity.ok(slots);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("success", false, "error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @PostMapping("/availability")
    public ResponseEntity<Map<String, Object>> addAvailability(
            @RequestBody Map<String, String> body
    ) {
        try {
            User user = getCurrentUser();
            checkCounselorRole(user);
            OffsetDateTime start = OffsetDateTime.parse(body.get("startTime"));
            OffsetDateTime end = OffsetDateTime.parse(body.get("endTime"));

            counselorService.createAvailabilitySlot(user.getId(), user.getInstitutionId(), start, end);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @DeleteMapping("/availability/{id}")
    public ResponseEntity<Map<String, Object>> removeAvailability(
            @PathVariable("id") UUID slotId
    ) {
        try {
            User user = getCurrentUser();
            checkCounselorRole(user);
            counselorService.deleteAvailabilitySlot(slotId, user.getId());
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @GetMapping("/student/{id}/profile")
    public ResponseEntity<?> getStudentProfile(
            @PathVariable("id") UUID studentId
    ) {
        try {
            User user = getCurrentUser();
            checkCounselorRole(user);
            StudentProfileDto profile = counselorService.getStudentProfile(studentId, user.getId(), user.getInstitutionId(), masterKey);
            return ResponseEntity.ok(profile);
        } catch (IllegalAccessException e) {
            return ResponseEntity.status(430).body(Map.of("success", false, "error", e.getMessage())); // Access Denied (consent gate)
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("success", false, "error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @PostMapping("/student/{id}/note")
    public ResponseEntity<Map<String, Object>> saveSessionNote(
            @PathVariable("id") UUID studentId,
            @RequestBody Map<String, String> body
    ) {
        try {
            User user = getCurrentUser();
            checkCounselorRole(user);
            UUID appointmentId = UUID.fromString(body.get("appointmentId"));
            String noteText = body.get("noteText");

            counselorService.saveSessionNote(user.getId(), studentId, appointmentId, user.getInstitutionId(), noteText, masterKey);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @GetMapping("/student/note/{appointmentId}")
    public ResponseEntity<Map<String, Object>> getSessionNote(
            @PathVariable("appointmentId") UUID apptId
    ) {
        try {
            User user = getCurrentUser();
            checkCounselorRole(user);
            String noteText = counselorService.getSessionNote(apptId, user.getId(), masterKey);
            return ResponseEntity.ok(Map.of("success", true, "noteText", noteText != null ? noteText : ""));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @GetMapping("/alerts")
    public ResponseEntity<?> getAlerts() {
        try {
            User user = getCurrentUser();
            checkCounselorRole(user);
            List<RiskAlertDto> alerts = counselorService.getRiskAlerts(user.getInstitutionId());
            return ResponseEntity.ok(alerts);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("success", false, "error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @PostMapping("/alerts/{id}/resolve")
    public ResponseEntity<Map<String, Object>> resolveAlert(
            @PathVariable("id") UUID alertId,
            @RequestBody Map<String, String> body
    ) {
        try {
            User user = getCurrentUser();
            checkCounselorRole(user);
            String notes = body.get("resolutionNotes");

            counselorService.resolveRiskAlert(alertId, user.getInstitutionId(), notes);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        }
    }
}
