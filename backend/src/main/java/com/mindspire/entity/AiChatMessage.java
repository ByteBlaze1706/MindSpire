package com.mindspire.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "ai_chat_messages", schema = "public")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "session_id", nullable = false)
    private UUID sessionId;

    @Column(nullable = false)
    private String role; // 'user', 'model'

    @Column(name = "encrypted_content", nullable = false)
    private String encryptedContent;

    @Column(name = "encrypted_dek", nullable = false)
    private String encryptedDek;

    @Column(name = "key_reference", nullable = false)
    private String keyReference;

    @Column(name = "encryption_version", nullable = false)
    private String encryptionVersion; // 'v1'

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}
