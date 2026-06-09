package com.mindspire.repository;

import com.mindspire.entity.ConsentGrant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ConsentGrantRepository extends JpaRepository<ConsentGrant, UUID> {
    
    @Query("SELECT c FROM ConsentGrant c WHERE c.studentId = :studentId " +
           "AND c.counselorId = :counselorId AND c.status = 'active' AND c.expiresAt > :now")
    Optional<ConsentGrant> findActiveConsent(
            @Param("studentId") UUID studentId,
            @Param("counselorId") UUID counselorId,
            @Param("now") OffsetDateTime now
    );

    List<ConsentGrant> findAllByCounselorIdAndInstitutionIdAndStatus(UUID counselorId, UUID institutionId, String status);
}
