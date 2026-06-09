package com.mindspire.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "counselor_notes", schema = "public")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CounselorNote {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "institution_id", nullable = false)
    private UUID institutionId;

    @Column(name = "appointment_id", nullable = false, unique = true)
    private UUID appointmentId;

    @Column(name = "counselor_id", nullable = false)
    private UUID counselorId;

    @Column(name = "student_id", nullable = false)
    private UUID studentId;

    @Column(name = "encrypted_clinical_data", nullable = false, columnDefinition = "TEXT")
    private String encryptedClinicalData;

    @Column(name = "encrypted_dek", columnDefinition = "TEXT")
    private String encryptedDek;

    @Column(name = "key_reference")
    private String keyReference;

    @Column(name = "encryption_version")
    private String encryptionVersion;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
