package com.mindspire.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "users", schema = "public")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    private UUID id;

    @Column(name = "institution_id", nullable = false)
    private UUID institutionId;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash")
    private String passwordHash;

    @Column(nullable = false)
    private String role; // 'student', 'counselor', 'inst_admin', 'moderator', 'super_admin'

    @Column(name = "real_first_name")
    private String realFirstName; // Application-level encrypted

    @Column(name = "real_last_name")
    private String realLastName;   // Application-level encrypted


    @Column(name = "counselor_status")
    private String counselorStatus; // 'pending', 'approved', 'rejected'

    @Column(name = "is_approved", nullable = false)
    private boolean isApproved;

    @Column(name = "failed_login_attempts", nullable = false)
    private int failedLoginAttempts;

    @Column(name = "lockout_until")
    private OffsetDateTime lockoutUntil;

    @Column(name = "department")
    private String department;

    @Column(name = "academic_year")
    private String academicYear;

    @Column(name = "program")
    private String program;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
