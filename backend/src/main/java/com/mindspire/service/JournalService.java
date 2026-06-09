package com.mindspire.service;

import com.mindspire.entity.JournalEntry;
import com.mindspire.repository.JournalEntryRepository;
import com.mindspire.util.KmsEncryptionUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class JournalService {

    private final JournalEntryRepository journalEntryRepository;

    @Value("${mindspire.encryption.key}")
    private String masterKey;

    private static final Set<String> STOPWORDS = Set.of(
            "the", "and", "a", "of", "to", "is", "in", "it", "that", "i", "my", "me", "we", "you", 
            "for", "on", "with", "as", "at", "by", "an", "be", "this", "are", "was"
    );

    /**
     * Helper to compute blind search hashes using HmacSHA256.
     */
    private String hashToken(String token, String key) {
        try {
            Mac hmac = Mac.getInstance("HmacSHA256");
            SecretKeySpec keySpec = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            hmac.init(keySpec);
            byte[] hashBytes = hmac.doFinal(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashBytes);
        } catch (Exception e) {
            throw new RuntimeException("Failed to calculate blind search token.", e);
        }
    }

    private List<String> generateSearchIndices(String content, String key) {
        if (content == null || content.trim().isEmpty()) {
            return Collections.emptyList();
        }

        // Tokenize and clean text
        String[] tokens = content.toLowerCase(Locale.ROOT).split("\\W+");
        Set<String> uniqueHashed = new HashSet<>();

        for (String token : tokens) {
            if (!token.isEmpty() && !STOPWORDS.contains(token)) {
                uniqueHashed.add(hashToken(token, key));
            }
        }

        return new ArrayList<>(uniqueHashed);
    }

    public List<JournalEntry> getUserJournals(UUID userId) {
        return journalEntryRepository.findAllByUserIdAndDeletedAtIsNullOrderByCreatedAtDesc(userId);
    }

    @Transactional
    public JournalEntry createJournalEntry(UUID userId, UUID institutionId, String content, boolean isGratitude) throws Exception {
        // 1. Encrypt content via KMS envelope encryption
        KmsEncryptionUtil.EncryptionResult result = KmsEncryptionUtil.encrypt(content, masterKey);

        // 2. Compute blind search hashes
        List<String> searchIndices = generateSearchIndices(content, masterKey);

        JournalEntry entry = JournalEntry.builder()
                .userId(userId)
                .institutionId(institutionId)
                .encryptedContent(result.ciphertext)
                .encryptedDek(result.encryptedDek)
                .keyReference(result.keyRef)
                .encryptionVersion("v1")
                .isGratitude(isGratitude)
                .searchIndices(searchIndices)
                .createdAt(OffsetDateTime.now())
                .build();

        return journalEntryRepository.save(entry);
    }

    @Transactional
    public void deleteJournalEntry(UUID id, UUID userId) {
        JournalEntry entry = journalEntryRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Journal entry not found."));

        if (!entry.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Access Denied: Cannot delete this journal entry.");
        }

        // Soft delete
        entry.setDeletedAt(OffsetDateTime.now());
        journalEntryRepository.save(entry);
    }

    /**
     * Secure search of encrypted entries.
     */
    public List<JournalEntry> searchJournals(UUID userId, String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return getUserJournals(userId);
        }

        // Tokenize the query
        String[] queryTokens = keyword.toLowerCase(Locale.ROOT).split("\\W+");
        List<String> hashedKeywords = new ArrayList<>();

        for (String token : queryTokens) {
            if (!token.isEmpty() && !STOPWORDS.contains(token)) {
                hashedKeywords.add(hashToken(token, masterKey));
            }
        }

        if (hashedKeywords.isEmpty()) {
            return Collections.emptyList();
        }

        String[] keywordsArray = hashedKeywords.toArray(new String[0]);
        return journalEntryRepository.searchByKeywords(userId, keywordsArray);
    }
}
