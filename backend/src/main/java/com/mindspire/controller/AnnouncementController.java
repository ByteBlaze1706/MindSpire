package com.mindspire.controller;

import com.mindspire.entity.Announcement;
import com.mindspire.entity.User;
import com.mindspire.repository.UserRepository;
import com.mindspire.service.AnnouncementService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/announcements")
@RequiredArgsConstructor
@CrossOrigin(originPatterns = "*", allowCredentials = "true")
public class AnnouncementController {

    private final AnnouncementService announcementService;
    private final UserRepository userRepository;

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User profile not found."));
    }

    private void checkAdminRole(User user) {
        String role = user.getRole();
        if (!role.equalsIgnoreCase("inst_admin") && !role.equalsIgnoreCase("super_admin")) {
            throw new IllegalStateException("Access Denied: You do not have administrator privileges.");
        }
    }

    @GetMapping
    public ResponseEntity<?> getActiveAnnouncements() {
        try {
            User user = getCurrentUser();
            List<Announcement> list = announcementService.getActiveAnnouncementsForRole(
                    user.getInstitutionId(), 
                    user.getRole()
            );
            return ResponseEntity.ok(list);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/all")
    public ResponseEntity<?> getAllAnnouncements() {
        try {
            User user = getCurrentUser();
            checkAdminRole(user);
            List<Announcement> list = announcementService.getAllAnnouncements(user.getInstitutionId());
            return ResponseEntity.ok(list);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/create")
    public ResponseEntity<?> createAnnouncement(@RequestBody Announcement announcement) {
        try {
            User user = getCurrentUser();
            checkAdminRole(user);
            Announcement created = announcementService.createAnnouncement(user.getInstitutionId(), announcement);
            return ResponseEntity.ok(created);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/delete/{id}")
    public ResponseEntity<?> deleteAnnouncement(@PathVariable("id") UUID id) {
        try {
            User user = getCurrentUser();
            checkAdminRole(user);
            announcementService.deleteAnnouncement(id, user.getInstitutionId());
            return ResponseEntity.ok(Map.of("success", true, "message", "Announcement deleted successfully."));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
