package com.mindspire.controller;

import com.mindspire.entity.Notification;
import com.mindspire.entity.NotificationPreference;
import com.mindspire.entity.User;
import com.mindspire.repository.UserRepository;
import com.mindspire.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@CrossOrigin(originPatterns = "*", allowCredentials = "true")
public class NotificationController {

    private final NotificationService notificationService;
    private final UserRepository userRepository;

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User profile not found."));
    }

    @GetMapping("/list")
    public ResponseEntity<List<Notification>> getNotifications() {
        User user = getCurrentUser();
        List<Notification> list = notificationService.getNotifications(user.getId(), user.getInstitutionId());
        return ResponseEntity.ok(list);
    }

    @GetMapping("/unread")
    public ResponseEntity<List<Notification>> getUnreadNotifications() {
        User user = getCurrentUser();
        List<Notification> list = notificationService.getUnreadNotifications(user.getId(), user.getInstitutionId());
        return ResponseEntity.ok(list);
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<Map<String, Object>> markRead(@PathVariable("id") UUID notificationId) {
        User user = getCurrentUser();
        try {
            notificationService.markAsRead(notificationId, user.getId());
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @PostMapping("/read-all")
    public ResponseEntity<Map<String, Object>> markAllRead() {
        User user = getCurrentUser();
        try {
            notificationService.markAllAsRead(user.getId(), user.getInstitutionId());
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @GetMapping("/preferences")
    public ResponseEntity<NotificationPreference> getPreferences() {
        User user = getCurrentUser();
        NotificationPreference pref = notificationService.getPreferences(user.getId());
        return ResponseEntity.ok(pref);
    }

    @PostMapping("/preferences")
    public ResponseEntity<?> updatePreferences(@RequestBody NotificationPreference prefBody) {
        User user = getCurrentUser();
        try {
            NotificationPreference updated = notificationService.updatePreferences(user.getId(), prefBody);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        }
    }
}
