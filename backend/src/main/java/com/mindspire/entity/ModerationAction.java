package com.mindspire.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "moderation_actions", schema = "public")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ModerationAction {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "institution_id", nullable = false)
    private UUID institutionId;

    @Column(name = "moderator_id", nullable = false)
    private UUID moderatorId;

    @Column(name = "report_id")
    private UUID reportId;

    @Column(name = "target_type", nullable = false)
    private String targetType; // 'post', 'comment', 'user'

    @Column(name = "target_id", nullable = false)
    private UUID targetId;

    @Column(name = "action_taken", nullable = false)
    private String actionTaken; // 'warn_user', 'hide_content', 'delete_content', 'ban_user'

    @Column(nullable = false, columnDefinition = "TEXT")
    private String reason;

    @Column(name = "applied_at", nullable = false, updatable = false)
    private OffsetDateTime appliedAt;
}
