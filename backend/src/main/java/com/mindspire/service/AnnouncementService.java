package com.mindspire.service;

import com.mindspire.entity.Announcement;
import com.mindspire.repository.AnnouncementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AnnouncementService {

    private final AnnouncementRepository announcementRepository;

    /**
     * Resolves active (non-expired) announcements targeted to the user's role.
     */
    @Transactional(readOnly = true)
    public List<Announcement> getActiveAnnouncementsForRole(UUID institutionId, String role) {
        String targetAudience = "students";
        if ("counselor".equalsIgnoreCase(role)) {
            targetAudience = "counselors";
        }
        return announcementRepository.findActiveAnnouncements(institutionId, targetAudience, OffsetDateTime.now());
    }

    /**
     * Lists all announcements for an institution (for administrators).
     */
    @Transactional(readOnly = true)
    public List<Announcement> getAllAnnouncements(UUID institutionId) {
        return announcementRepository.findAllByInstitutionIdOrderByCreatedAtDesc(institutionId);
    }

    /**
     * Creates a new announcement.
     */
    @Transactional
    public Announcement createAnnouncement(UUID institutionId, Announcement announcement) {
        announcement.setInstitutionId(institutionId);
        announcement.setCreatedAt(OffsetDateTime.now());
        announcement.setUpdatedAt(OffsetDateTime.now());
        if (announcement.getTargetAudience() == null) {
            announcement.setTargetAudience("all");
        }
        return announcementRepository.save(announcement);
    }

    /**
     * Deletes an announcement.
     */
    @Transactional
    public void deleteAnnouncement(UUID announcementId, UUID institutionId) {
        Announcement announcement = announcementRepository.findById(announcementId)
                .orElseThrow(() -> new IllegalArgumentException("Announcement not found."));
        
        if (!announcement.getInstitutionId().equals(institutionId)) {
            throw new IllegalArgumentException("Unauthorized deletion request.");
        }
        announcementRepository.delete(announcement);
    }
}
