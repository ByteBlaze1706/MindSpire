package com.mindspire.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "consent_grants", schema = "public")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConsentGrant {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "institution_id", nullable = false)
    private UUID institutionId;

    @Column(name = "student_id", nullable = false)
    private UUID studentId;

    @Column(name = "counselor_id", nullable = false)
    private UUID counselorId;

    @Column(name = "grant_type", nullable = false)
    private String grantType; // 'journals', 'ai_chats', 'both'

    @Column(nullable = false)
    private String status; // 'active', 'revoked', 'expired'

    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
