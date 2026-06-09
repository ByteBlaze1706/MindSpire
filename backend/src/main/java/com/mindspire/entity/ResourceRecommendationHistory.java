package com.mindspire.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "resource_recommendation_history", schema = "public")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResourceRecommendationHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "resource_id", nullable = false)
    private UUID resourceId;

    @Column(name = "recommended_reason", nullable = false)
    private String recommendedReason; // e.g. 'mood:Stressed', 'assessment:PHQ-9'

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}
