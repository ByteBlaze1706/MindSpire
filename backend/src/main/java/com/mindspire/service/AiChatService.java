package com.mindspire.service;

import com.mindspire.dto.*;
import com.mindspire.entity.*;
import com.mindspire.repository.*;
import com.mindspire.util.KmsEncryptionUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AiChatService {

    private final AiChatSessionRepository sessionRepository;
    private final AiChatMessageRepository messageRepository;
    private final AiUsageAnalyticsRepository analyticsRepository;
    private final RiskAlertRepository riskAlertRepository;
    private final AuditLogRepository auditLogRepository;
    private final GeminiService geminiService;

    @Value("${mindspire.encryption.key}")
    private String masterKey;

    /**
     * Lists all chat sessions.
     */
    public List<SessionResponse> getSessions(UUID userId, UUID institutionId) {
        List<AiChatSession> sessions = sessionRepository.findAllByUserIdAndInstitutionIdOrderByUpdatedAtDesc(userId, institutionId);
        return sessions.stream().map(s -> SessionResponse.builder()
                .id(s.getId())
                .title(s.getTitle())
                .memoryPreference(s.getMemoryPreference())
                .createdAt(s.getCreatedAt())
                .updatedAt(s.getUpdatedAt())
                .build()).collect(Collectors.toList());
    }

    /**
     * Processes a message from the student, calls Gemini, and saves results securely.
     */
    @Transactional
    public ChatResponse processChatMessage(UUID userId, UUID institutionId, ChatRequest request, String ipAddress, String userAgent) throws Exception {
        AiChatSession session;
        boolean isNew = (request.getSessionId() == null);
        
        if (isNew) {
            String title = request.getMessage().trim();
            if (title.length() > 30) title = title.substring(0, 28) + "...";
            if (title.isEmpty()) title = "New Conversation";

            String memoryPref = request.getMemoryPreference() != null ? request.getMemoryPreference() : "session_memory";

            session = AiChatSession.builder()
                    .userId(userId)
                    .institutionId(institutionId)
                    .title(title)
                    .memoryPreference(memoryPref)
                    .createdAt(OffsetDateTime.now())
                    .updatedAt(OffsetDateTime.now())
                    .build();
            session = sessionRepository.save(session);

            // Audit log session creation
            auditLogRepository.save(AuditLog.builder()
                    .institutionId(institutionId)
                    .userId(userId)
                    .action("CREATE_AI_CHAT_SESSION")
                    .targetResource("session_id:" + session.getId())
                    .ipAddress(ipAddress)
                    .userAgent(userAgent)
                    .createdAt(OffsetDateTime.now())
                    .build());
        } else {
            session = sessionRepository.findById(request.getSessionId())
                    .orElseThrow(() -> new NoSuchElementException("Session not found"));
            
            // Check auth access (prevent IDOR)
            if (!session.getUserId().equals(userId)) {
                throw new IllegalAccessException("Access Denied to this chat session.");
            }
            
            // Update memory preference if provided
            if (request.getMemoryPreference() != null) {
                session.setMemoryPreference(request.getMemoryPreference());
                session.setUpdatedAt(OffsetDateTime.now());
                session = sessionRepository.save(session);
            }
        }

        // 1. Fetch memory history based on user preferences
        List<AiChatMessage> history = new ArrayList<>();
        String pref = session.getMemoryPreference();

        if ("session_memory".equals(pref)) {
            List<AiChatMessage> dbMsgs = messageRepository.findAllBySessionIdOrderByCreatedAtAsc(session.getId());
            for (AiChatMessage msg : dbMsgs) {
                history.add(decryptMessageHelper(msg));
            }
        } else if ("persistent_memory".equals(pref)) {
            // Retrieve recent sessions messages (e.g. past 5 sessions)
            List<AiChatSession> userSessions = sessionRepository.findAllByUserIdAndInstitutionIdOrderByUpdatedAtDesc(userId, institutionId);
            int count = 0;
            for (AiChatSession s : userSessions) {
                if (count >= 5) break;
                List<AiChatMessage> dbMsgs = messageRepository.findAllBySessionIdOrderByCreatedAtAsc(s.getId());
                for (AiChatMessage msg : dbMsgs) {
                    history.add(decryptMessageHelper(msg));
                }
                count++;
            }
            // Sort history by date to ensure proper timeline feed
            history.sort(Comparator.comparing(AiChatMessage::getCreatedAt));
        }

        // 2. Encrypt and save User message
        KmsEncryptionUtil.EncryptionResult userEncrypt = KmsEncryptionUtil.encrypt(request.getMessage(), masterKey);
        AiChatMessage userMsg = AiChatMessage.builder()
                .sessionId(session.getId())
                .role("user")
                .encryptedContent(userEncrypt.ciphertext)
                .encryptedDek(userEncrypt.encryptedDek)
                .keyReference(userEncrypt.keyRef)
                .encryptionVersion("v1")
                .createdAt(OffsetDateTime.now())
                .build();
        messageRepository.save(userMsg);

        // 3. Call Gemini (scanForCrisis is executed first inside generateResponse)
        String lang = request.getLanguage() != null ? request.getLanguage() : "English";
        ChatResponse response = geminiService.generateResponse(session.getId(), session.getTitle(), request.getMessage(), history, lang);

        // 4. Encrypt and save AI response
        KmsEncryptionUtil.EncryptionResult aiEncrypt = KmsEncryptionUtil.encrypt(response.getResponse(), masterKey);
        AiChatMessage aiMsg = AiChatMessage.builder()
                .sessionId(session.getId())
                .role("model")
                .encryptedContent(aiEncrypt.ciphertext)
                .encryptedDek(aiEncrypt.encryptedDek)
                .keyReference(aiEncrypt.keyRef)
                .encryptionVersion("v1")
                .createdAt(OffsetDateTime.now())
                .build();
        messageRepository.save(aiMsg);

        // 5. If crisis is detected, save RiskAlert and audit the escalation
        if (response.isCrisis()) {
            RiskAlert alert = RiskAlert.builder()
                    .userId(userId)
                    .institutionId(institutionId)
                    .sourceType("ai")
                    .severity("critical")
                    .status("pending")
                    .resolutionNotes("System flagged: AI Companion high-risk text detected.")
                    .createdAt(OffsetDateTime.now())
                    .updatedAt(OffsetDateTime.now())
                    .build();
            riskAlertRepository.save(alert);

            // Audit log crisis event
            auditLogRepository.save(AuditLog.builder()
                    .institutionId(institutionId)
                    .userId(userId)
                    .action("AI_CHAT_CRISIS_ESCALATION")
                    .targetResource("session_id:" + session.getId())
                    .ipAddress(ipAddress)
                    .userAgent(userAgent)
                    .createdAt(OffsetDateTime.now())
                    .build());
        }

        // 6. Log usage analytics (simulated token counting)
        int promptLen = request.getMessage().length() / 4;
        int completionLen = response.getResponse().length() / 4;
        AiUsageAnalytics usage = AiUsageAnalytics.builder()
                .userId(userId)
                .institutionId(institutionId)
                .sessionId(session.getId())
                .promptTokens(promptLen > 0 ? promptLen : 1)
                .completionTokens(completionLen > 0 ? completionLen : 1)
                .createdAt(OffsetDateTime.now())
                .build();
        analyticsRepository.save(usage);

        // Touch session time
        session.setUpdatedAt(OffsetDateTime.now());
        sessionRepository.save(session);

        return response;
    }

    /**
     * Retrieves decrypted message list for a chat session.
     */
    public ClinicalChatDto getDecryptedMessages(UUID sessionId, UUID userId) throws Exception {
        AiChatSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new NoSuchElementException("Session not found"));

        // Check ownership (prevent IDOR)
        if (!session.getUserId().equals(userId)) {
            throw new IllegalAccessException("Access Denied to this chat session.");
        }

        List<AiChatMessage> msgs = messageRepository.findAllBySessionIdOrderByCreatedAtAsc(sessionId);
        List<ClinicalChatDto.ChatMessageDto> messageDtos = new ArrayList<>();

        for (AiChatMessage msg : msgs) {
            String plainText = KmsEncryptionUtil.decrypt(msg.getEncryptedContent(), msg.getEncryptedDek(), masterKey);
            messageDtos.add(ClinicalChatDto.ChatMessageDto.builder()
                    .senderType(msg.getRole().equals("user") ? "student" : "assistant")
                    .content(plainText)
                    .createdAt(msg.getCreatedAt())
                    .build());
        }

        return ClinicalChatDto.builder()
                .sessionTitle(session.getTitle())
                .messages(messageDtos)
                .build();
    }

    /**
     * Delete a single session.
     */
    @Transactional
    public void deleteSession(UUID sessionId, UUID userId, String ipAddress, String userAgent) throws IllegalAccessException {
        AiChatSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new NoSuchElementException("Session not found"));
        
        // Check ownership (prevent IDOR)
        if (!session.getUserId().equals(userId)) {
            throw new IllegalAccessException("Access Denied to delete this session.");
        }

        sessionRepository.delete(session);

        // Audit log deletion
        auditLogRepository.save(AuditLog.builder()
                .institutionId(session.getInstitutionId())
                .userId(userId)
                .action("DELETE_AI_CHAT_SESSION")
                .targetResource("session_id:" + sessionId)
                .ipAddress(ipAddress)
                .userAgent(userAgent)
                .createdAt(OffsetDateTime.now())
                .build());
    }

    /**
     * Purges all chat sessions and logs for a user.
     */
    @Transactional
    public void deleteAllHistory(UUID userId, UUID institutionId, String ipAddress, String userAgent) {
        // Triggers cascade deletions of messages due to database FK constraint
        sessionRepository.deleteAllByUserId(userId);
        analyticsRepository.deleteAllByUserId(userId);

        // Audit log history purge
        auditLogRepository.save(AuditLog.builder()
                .institutionId(institutionId)
                .userId(userId)
                .action("PURGE_AI_CHAT_HISTORY")
                .targetResource("user_id:" + userId)
                .ipAddress(ipAddress)
                .userAgent(userAgent)
                .createdAt(OffsetDateTime.now())
                .build());
    }

    /**
     * Saves user feedback rating for a session.
     */
    @Transactional
    public void saveFeedback(UUID userId, UUID institutionId, FeedbackRequest request) {
        // Update the latest usage log corresponding to this session with rating
        List<AiUsageAnalytics> logs = analyticsRepository.findAllByUserId(userId);
        Optional<AiUsageAnalytics> target = logs.stream()
                .filter(l -> l.getSessionId() != null && l.getSessionId().equals(request.getSessionId()))
                .max(Comparator.comparing(AiUsageAnalytics::getCreatedAt));

        if (target.isPresent()) {
            AiUsageAnalytics usage = target.get();
            usage.setFeedbackRating(request.getFeedbackRating());
            usage.setFeedbackComments(request.getFeedbackComments());
            analyticsRepository.save(usage);
        } else {
            // Save a standalone feedback log if no usage log found
            AiUsageAnalytics feedback = AiUsageAnalytics.builder()
                    .userId(userId)
                    .institutionId(institutionId)
                    .sessionId(request.getSessionId())
                    .feedbackRating(request.getFeedbackRating())
                    .feedbackComments(request.getFeedbackComments())
                    .promptTokens(0)
                    .completionTokens(0)
                    .createdAt(OffsetDateTime.now())
                    .build();
            analyticsRepository.save(feedback);
        }
    }

    private AiChatMessage decryptMessageHelper(AiChatMessage msg) throws Exception {
        String decrypted = KmsEncryptionUtil.decrypt(msg.getEncryptedContent(), msg.getEncryptedDek(), masterKey);
        return AiChatMessage.builder()
                .id(msg.getId())
                .sessionId(msg.getSessionId())
                .role(msg.getRole())
                .encryptedContent(decrypted) // Stored plain text temporarily in history model
                .createdAt(msg.getCreatedAt())
                .build();
    }
}
