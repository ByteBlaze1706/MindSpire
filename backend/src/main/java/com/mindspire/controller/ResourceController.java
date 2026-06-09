package com.mindspire.controller;

import com.mindspire.entity.Resource;
import com.mindspire.entity.User;
import com.mindspire.repository.UserRepository;
import com.mindspire.service.ResourceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/resources")
@RequiredArgsConstructor
@CrossOrigin(originPatterns = "*", allowCredentials = "true")
public class ResourceController {

    private final ResourceService resourceService;
    private final UserRepository userRepository;

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User profile not found."));
    }

    @GetMapping("/list")
    public ResponseEntity<List<Map<String, Object>>> getResources(@RequestParam(value = "category", defaultValue = "all") String category) {
        User user = getCurrentUser();
        List<Resource> list = resourceService.getResources(user.getInstitutionId(), category);
        
        // Map to include bookmark boolean state for current user
        List<Map<String, Object>> mapped = list.stream()
                .map(r -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", r.getId());
                    map.put("title", r.getTitle());
                    map.put("contentMarkdown", r.getContentMarkdown());
                    map.put("category", r.getCategory());
                    map.put("createdAt", r.getCreatedAt());
                    map.put("isBookmarked", resourceService.isBookmarked(user.getId(), r.getId()));
                    return map;
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(mapped);
    }

    @PostMapping("/{id}/bookmark")
    public ResponseEntity<Map<String, Object>> toggleBookmark(@PathVariable("id") UUID resourceId) {
        User user = getCurrentUser();
        try {
            resourceService.toggleBookmark(user.getId(), resourceId);
            boolean isBookmarkedNow = resourceService.isBookmarked(user.getId(), resourceId);
            return ResponseEntity.ok(Map.of("success", true, "isBookmarked", isBookmarkedNow));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @GetMapping("/recommendations")
    public ResponseEntity<List<Resource>> getRecommendations() {
        User user = getCurrentUser();
        List<Resource> recommended = resourceService.getRecommendations(user.getId(), user.getInstitutionId());
        return ResponseEntity.ok(recommended);
    }
}
