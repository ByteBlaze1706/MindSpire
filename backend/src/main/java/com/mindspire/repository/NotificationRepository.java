package com.mindspire.repository;

import com.mindspire.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    List<Notification> findAllByUserIdAndInstitutionIdOrderByCreatedAtDesc(UUID userId, UUID institutionId);
    List<Notification> findAllByUserIdAndInstitutionIdAndIsReadOrderByCreatedAtDesc(UUID userId, UUID institutionId, boolean isRead);
}
