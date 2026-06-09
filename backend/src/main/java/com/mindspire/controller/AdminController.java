package com.mindspire.controller;

import com.mindspire.entity.AuditLog;
import com.mindspire.entity.User;
import com.mindspire.repository.UserRepository;
import com.mindspire.service.AdminService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@CrossOrigin(originPatterns = "*", allowCredentials = "true")
public class AdminController {

    private final AdminService adminService;
    private final UserRepository userRepository;

    private User getCurrentAdmin() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User profile not found."));
        
        String role = user.getRole();
        if (!role.equalsIgnoreCase("inst_admin") && !role.equalsIgnoreCase("super_admin")) {
            throw new IllegalStateException("Access Denied: You do not have administrator privileges.");
        }
        return user;
    }

    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        return ip;
    }

    @GetMapping("/stats")
    public ResponseEntity<?> getStats() {
        try {
            User admin = getCurrentAdmin();
            Map<String, Object> stats = adminService.getOverviewStats(admin.getInstitutionId());
            return ResponseEntity.ok(stats);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/heatmap")
    public ResponseEntity<?> getHeatmap() {
        try {
            User admin = getCurrentAdmin();
            Map<String, Object> heatmap = adminService.getWellnessHeatmap(admin.getInstitutionId());
            return ResponseEntity.ok(heatmap);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/resource-analytics")
    public ResponseEntity<?> getResourceAnalytics() {
        try {
            User admin = getCurrentAdmin();
            List<Map<String, Object>> analytics = adminService.getResourceAnalytics(admin.getInstitutionId());
            return ResponseEntity.ok(analytics);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/counselors/pending")
    public ResponseEntity<?> getPendingCounselors() {
        try {
            User admin = getCurrentAdmin();
            List<User> counselors = adminService.getPendingCounselors(admin.getInstitutionId());
            return ResponseEntity.ok(counselors);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/counselors/{id}/approve")
    public ResponseEntity<?> approveCounselor(@PathVariable("id") UUID counselorId, HttpServletRequest request) {
        try {
            User admin = getCurrentAdmin();
            adminService.approveCounselor(
                    counselorId, 
                    admin.getId(), 
                    getClientIp(request), 
                    request.getHeader("User-Agent")
            );
            return ResponseEntity.ok(Map.of("success", true, "message", "Counselor approved successfully."));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/counselors/{id}/reject")
    public ResponseEntity<?> rejectCounselor(@PathVariable("id") UUID counselorId, HttpServletRequest request) {
        try {
            User admin = getCurrentAdmin();
            adminService.rejectCounselor(
                    counselorId, 
                    admin.getId(), 
                    getClientIp(request), 
                    request.getHeader("User-Agent")
            );
            return ResponseEntity.ok(Map.of("success", true, "message", "Counselor registration rejected."));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/branding")
    public ResponseEntity<?> updateBranding(@RequestBody Map<String, String> branding, HttpServletRequest request) {
        try {
            User admin = getCurrentAdmin();
            adminService.updateBrandingConfig(
                    admin.getInstitutionId(), 
                    branding, 
                    admin.getId(), 
                    getClientIp(request), 
                    request.getHeader("User-Agent")
            );
            return ResponseEntity.ok(Map.of("success", true, "message", "Institution branding updated successfully."));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/audit-logs")
    public ResponseEntity<?> getAuditLogs() {
        try {
            User admin = getCurrentAdmin();
            List<AuditLog> logs = adminService.getAuditLogs(admin.getInstitutionId());
            return ResponseEntity.ok(logs);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
