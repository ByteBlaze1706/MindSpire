package com.mindspire.repository;

import com.mindspire.entity.Announcement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface AnnouncementRepository extends JpaRepository<Announcement, UUID> {
    
    @Query("SELECT a FROM Announcement a WHERE a.institutionId = :instId AND " +
           "(a.targetAudience = 'all' OR a.targetAudience = :audience) AND " +
           "(a.expiresAt IS NULL OR a.expiresAt > :now) " +
           "ORDER BY a.createdAt DESC")
    List<Announcement> findActiveAnnouncements(
            @Param("instId") UUID instId,
            @Param("audience") String audience,
            @Param("now") OffsetDateTime now
    );

    List<Announcement> findAllByInstitutionIdOrderByCreatedAtDesc(UUID institutionId);
}
