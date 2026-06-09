package com.mindspire.controller;

import com.mindspire.dto.*;
import com.mindspire.entity.User;
import com.mindspire.repository.UserRepository;
import com.mindspire.service.AiChatService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Queue;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@CrossOrigin(originPatterns = "*", allowCredentials = "true")
public class AiChatController {

    private final AiChatService chatService;
    private final UserRepository userRepository;

    // Rate limiting map: UserID -> Timestamps
    private final Map<UUID, Queue<Long>> rateLimitMap = new ConcurrentHashMap<>();

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User profile not found."));
    }

    private void checkRateLimit(UUID userId) {
        long now = System.currentTimeMillis();
        Queue<Long> timestamps = rateLimitMap.computeIfAbsent(userId, k -> new ConcurrentLinkedQueue<>());
        
        // Remove timestamps older than 60 seconds
        while (!timestamps.isEmpty() && now - timestamps.peek() > 60000) {
            timestamps.poll();
        }

        if (timestamps.size() >= 20) {
            throw new IllegalStateException("Rate limit exceeded. Maximum 20 chat requests per minute.");
        }
        timestamps.add(now);
    }

    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        return ip;
    }

    @GetMapping("/sessions")
    public ResponseEntity<?> getSessions() {
        try {
            User user = getCurrentUser();
            List<SessionResponse> sessions = chatService.getSessions(user.getId(), user.getInstitutionId());
            return ResponseEntity.ok(sessions);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @GetMapping("/session/{id}/messages")
    public ResponseEntity<?> getSessionMessages(@PathVariable("id") UUID sessionId) {
        try {
            User user = getCurrentUser();
            ClinicalChatDto chatDto = chatService.getDecryptedMessages(sessionId, user.getId());
            return ResponseEntity.ok(chatDto);
        } catch (IllegalAccessException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("success", false, "error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @PostMapping("/chat")
    public ResponseEntity<?> sendChatMessage(@RequestBody ChatRequest request, HttpServletRequest servletRequest) {
        try {
            User user = getCurrentUser();
            
            // Enforce rate limiting: 20 requests/minute per student
            try {
                checkRateLimit(user.getId());
            } catch (IllegalStateException e) {
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of("success", false, "error", e.getMessage()));
            }

            ChatResponse response = chatService.processChatMessage(
                    user.getId(), 
                    user.getInstitutionId(), 
                    request,
                    getClientIp(servletRequest),
                    servletRequest.getHeader("User-Agent")
            );
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @DeleteMapping("/session/{id}")
    public ResponseEntity<Map<String, Object>> deleteSession(@PathVariable("id") UUID sessionId, HttpServletRequest servletRequest) {
        try {
            User user = getCurrentUser();
            chatService.deleteSession(
                    sessionId, 
                    user.getId(),
                    getClientIp(servletRequest),
                    servletRequest.getHeader("User-Agent")
            );
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @DeleteMapping("/history/clear")
    public ResponseEntity<Map<String, Object>> clearAllHistory(HttpServletRequest servletRequest) {
        try {
            User user = getCurrentUser();
            chatService.deleteAllHistory(
                    user.getId(), 
                    user.getInstitutionId(),
                    getClientIp(servletRequest),
                    servletRequest.getHeader("User-Agent")
            );
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @PostMapping("/feedback")
    public ResponseEntity<Map<String, Object>> submitFeedback(@RequestBody FeedbackRequest request) {
        try {
            User user = getCurrentUser();
            chatService.saveFeedback(user.getId(), user.getInstitutionId(), request);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        }
    }
}
