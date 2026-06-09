package com.mindspire.controller;

import com.mindspire.dto.CommunityCommentDto;
import com.mindspire.dto.CommunityPostDto;
import com.mindspire.entity.*;
import com.mindspire.repository.UserRepository;
import com.mindspire.service.CommunityService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/community")
@RequiredArgsConstructor
@CrossOrigin(originPatterns = "*", allowCredentials = "true")
public class CommunityController {

    private final CommunityService communityService;
    private final UserRepository userRepository;

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User profile not found."));
    }

    private void checkModeratorRole(User user) {
        String role = user.getRole();
        if (!role.equalsIgnoreCase("moderator") && 
            !role.equalsIgnoreCase("inst_admin") && 
            !role.equalsIgnoreCase("super_admin")) {
            throw new IllegalArgumentException("Access Denied: You do not have moderator credentials.");
        }
    }

    @GetMapping("/posts")
    public ResponseEntity<List<CommunityPostDto>> getPosts(@RequestParam(value = "category", defaultValue = "all") String category) {
        User user = getCurrentUser();
        List<CommunityPostDto> dtos = communityService.getPosts(user.getInstitutionId(), category, user.getId());
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/trending")
    public ResponseEntity<List<CommunityPostDto>> getTrending() {
        User user = getCurrentUser();
        List<CommunityPostDto> dtos = communityService.getTrendingPosts(user.getInstitutionId(), user.getId());
        return ResponseEntity.ok(dtos);
    }

    @PostMapping("/posts/create")
    public ResponseEntity<?> createPost(@RequestBody Map<String, Object> body) {
        User user = getCurrentUser();
        try {
            String title = (String) body.get("title");
            String content = (String) body.get("content");
            String category = (String) body.get("category");
            boolean isAnon = body.containsKey("isAnonymous") ? (Boolean) body.get("isAnonymous") : true;

            if (title == null || title.trim().isEmpty() || content == null || content.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Title and content cannot be empty."));
            }

            CommunityPost post = communityService.createPost(user.getId(), user.getInstitutionId(), title, content, category, isAnon);
            return ResponseEntity.ok(communityService.toPostDto(post, user.getId()));
        } catch (IllegalStateException e) {
            // Crisis keywords match trigger
            return ResponseEntity.status(HttpStatus.UNAVAILABLE_FOR_LEGAL_REASONS)
                    .body(Map.of("success", false, "crisis", true, "error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            // PII block trigger
            return ResponseEntity.badRequest().body(Map.of("success", false, "pii", true, "error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @GetMapping("/posts/{postId}/comments")
    public ResponseEntity<List<CommunityCommentDto>> getComments(@PathVariable("postId") UUID postId) {
        List<CommunityCommentDto> comments = communityService.getCommentsForPost(postId);
        return ResponseEntity.ok(comments);
    }

    @PostMapping("/posts/{postId}/comments/create")
    public ResponseEntity<?> createComment(@PathVariable("postId") UUID postId, @RequestBody Map<String, Object> body) {
        User user = getCurrentUser();
        try {
            String content = (String) body.get("content");
            UUID parentId = body.get("parentId") != null ? UUID.fromString((String) body.get("parentId")) : null;
            boolean isAnon = body.containsKey("isAnonymous") ? (Boolean) body.get("isAnonymous") : true;

            if (content == null || content.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Comment content cannot be empty."));
            }

            CommunityComment comment = communityService.createComment(user.getId(), user.getInstitutionId(), postId, content, parentId, isAnon);
            return ResponseEntity.ok(communityService.toCommentDto(comment));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.UNAVAILABLE_FOR_LEGAL_REASONS)
                    .body(Map.of("success", false, "crisis", true, "error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "pii", true, "error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @PostMapping("/posts/{postId}/react")
    public ResponseEntity<Map<String, Object>> reactToPost(@PathVariable("postId") UUID postId, @RequestParam("type") String reactionType) {
        User user = getCurrentUser();
        try {
            communityService.reactToPost(user.getId(), postId, reactionType);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @PostMapping("/comments/{commentId}/react")
    public ResponseEntity<Map<String, Object>> reactToComment(@PathVariable("commentId") UUID commentId, @RequestParam("type") String reactionType) {
        User user = getCurrentUser();
        try {
            communityService.reactToComment(user.getId(), commentId, reactionType);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @PostMapping("/posts/{postId}/report")
    public ResponseEntity<?> reportPost(@PathVariable("postId") UUID postId, @RequestBody Map<String, String> body) {
        User user = getCurrentUser();
        try {
            String reason = body.get("reason");
            if (reason == null || reason.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Reason must be provided."));
            }
            communityService.reportPost(user.getId(), user.getInstitutionId(), postId, reason);
            return ResponseEntity.ok(Map.of("success", true, "message", "Report logged successfully."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @PostMapping("/comments/{commentId}/report")
    public ResponseEntity<?> reportComment(@PathVariable("commentId") UUID commentId, @RequestBody Map<String, String> body) {
        User user = getCurrentUser();
        try {
            String reason = body.get("reason");
            if (reason == null || reason.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Reason must be provided."));
            }
            communityService.reportComment(user.getId(), user.getInstitutionId(), commentId, reason);
            return ResponseEntity.ok(Map.of("success", true, "message", "Report logged successfully."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    // --- Role-Based Content Moderation Queue ---

    @GetMapping("/moderation/reports")
    public ResponseEntity<?> getReports() {
        try {
            User user = getCurrentUser();
            checkModeratorRole(user);
            List<ModerationReport> reports = communityService.getPendingReports(user.getInstitutionId());
            return ResponseEntity.ok(reports);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @PostMapping("/moderation/reports/{reportId}/resolve")
    public ResponseEntity<?> resolveReport(@PathVariable("reportId") UUID reportId, @RequestBody Map<String, String> body) {
        try {
            User user = getCurrentUser();
            checkModeratorRole(user);
            String action = body.get("action");
            String reason = body.get("reason");

            if (action == null || reason == null || reason.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Action and reason fields are required."));
            }

            communityService.resolveReport(reportId, user.getId(), user.getInstitutionId(), action, reason);
            return ResponseEntity.ok(Map.of("success", true, "message", "Report resolved successfully."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("success", false, "error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        }
    }
}
