package com.mindspire.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "mood_logs", schema = "public")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MoodLog {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "institution_id", nullable = false)
    private UUID institutionId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private int score; // 1 to 5 scale

    @Column(nullable = false)
    private String descriptor; // 'Happy', 'Calm', etc.

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes; // Application-level encrypted

    @Column(name = "logged_at", nullable = false, updatable = false)
    private OffsetDateTime loggedAt;
}
