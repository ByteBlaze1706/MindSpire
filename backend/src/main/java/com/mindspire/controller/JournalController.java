package com.mindspire.controller;

import com.mindspire.dto.ClinicalJournalDto;
import com.mindspire.entity.JournalEntry;
import com.mindspire.entity.User;
import com.mindspire.repository.UserRepository;
import com.mindspire.service.JournalService;
import com.mindspire.util.KmsEncryptionUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/journal")
@RequiredArgsConstructor
@CrossOrigin(originPatterns = "*", allowCredentials = "true")
public class JournalController {

    private final JournalService journalService;
    private final UserRepository userRepository;

    @Value("${mindspire.encryption.key}")
    private String masterKey;

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User profile not found."));
    }

    private ClinicalJournalDto decryptAndMap(JournalEntry entry) {
        String decryptedContent;
        try {
            decryptedContent = KmsEncryptionUtil.decrypt(
                    entry.getEncryptedContent(),
                    entry.getEncryptedDek(),
                    masterKey
            );
        } catch (Exception e) {
            decryptedContent = "[Decryption Error: Key mismatch or integrity check failed]";
        }

        return ClinicalJournalDto.builder()
                .id(entry.getId())
                .content(decryptedContent)
                .createdAt(entry.getCreatedAt())
                .isGratitude(entry.isGratitude())
                .build();
    }

    @GetMapping("/list")
    public ResponseEntity<List<ClinicalJournalDto>> getJournals() {
        User user = getCurrentUser();
        List<JournalEntry> entries = journalService.getUserJournals(user.getId());
        List<ClinicalJournalDto> dtos = entries.stream()
                .map(this::decryptAndMap)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @PostMapping("/create")
    public ResponseEntity<?> createJournal(@RequestBody Map<String, Object> body) {
        User user = getCurrentUser();
        try {
            String content = (String) body.get("content");
            boolean isGratitude = body.containsKey("isGratitude") && (Boolean) body.get("isGratitude");

            if (content == null || content.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Journal content cannot be empty."));
            }

            JournalEntry entry = journalService.createJournalEntry(user.getId(), user.getInstitutionId(), content, isGratitude);
            return ResponseEntity.ok(decryptAndMap(entry));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @DeleteMapping("/delete/{id}")
    public ResponseEntity<?> deleteJournal(@PathVariable("id") UUID entryId) {
        User user = getCurrentUser();
        try {
            journalService.deleteJournalEntry(entryId, user.getId());
            return ResponseEntity.ok(Map.of("success", true, "message", "Journal entry deleted successfully."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @GetMapping("/search")
    public ResponseEntity<List<ClinicalJournalDto>> searchJournals(@RequestParam("keyword") String keyword) {
        User user = getCurrentUser();
        List<JournalEntry> entries = journalService.searchJournals(user.getId(), keyword);
        List<ClinicalJournalDto> dtos = entries.stream()
                .map(this::decryptAndMap)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }
}
