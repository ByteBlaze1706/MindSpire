package com.mindspire.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "anonymous_profiles", schema = "public")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnonymousProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "user_id", nullable = false, unique = true)
    private UUID userId;

    @Column(name = "institution_id", nullable = false)
    private UUID institutionId;

    @Column(nullable = false, unique = true)
    private String pseudonym;

    @Column(name = "avatar_config", columnDefinition = "jsonb")
    private String avatarConfig;

    @Column(name = "helpful_score", nullable = false)
    private int helpfulScore;

    @Column(name = "report_count", nullable = false)
    private int reportCount;

    @Column(name = "positive_contributions", nullable = false)
    private int positiveContributions;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
