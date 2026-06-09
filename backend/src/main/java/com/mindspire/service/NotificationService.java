package com.mindspire.service;

import com.mindspire.entity.Notification;
import com.mindspire.entity.NotificationPreference;
import com.mindspire.repository.NotificationPreferenceRepository;
import com.mindspire.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final NotificationPreferenceRepository preferenceRepository;

    public List<Notification> getNotifications(UUID userId, UUID institutionId) {
        return notificationRepository.findAllByUserIdAndInstitutionIdOrderByCreatedAtDesc(userId, institutionId);
    }

    public List<Notification> getUnreadNotifications(UUID userId, UUID institutionId) {
        return notificationRepository.findAllByUserIdAndInstitutionIdAndIsReadOrderByCreatedAtDesc(userId, institutionId, false);
    }

    @Transactional
    public void markAsRead(UUID notificationId, UUID userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new NoSuchElementException("Notification not found."));

        if (!notification.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Access Denied: This notification does not belong to the user.");
        }

        notification.setRead(true);
        notificationRepository.save(notification);
    }

    @Transactional
    public void markAllAsRead(UUID userId, UUID institutionId) {
        List<Notification> unread = notificationRepository.findAllByUserIdAndInstitutionIdAndIsReadOrderByCreatedAtDesc(userId, institutionId, false);
        for (Notification n : unread) {
            n.setRead(true);
        }
        notificationRepository.saveAll(unread);
    }

    @Transactional
    public Notification sendNotification(UUID userId, UUID institutionId, String type, String title, String body, List<String> defaultChannels) {
        NotificationPreference pref = getPreferences(userId);
        
        List<String> activeChannels = new ArrayList<>();
        if (pref.isInAppEnabled()) {
            activeChannels.add("in_app");
        }
        if (pref.isEmailEnabled() && defaultChannels.contains("email")) {
            activeChannels.add("email");
            // Mock Email transmission
            System.out.println("[SMTP Mock Email Dispatch to " + userId + "]: Title: " + title + " | Content: " + body);
        }
        if (pref.isPushEnabled() && defaultChannels.contains("push")) {
            activeChannels.add("push");
            // Mock Push notifications
            System.out.println("[WebPush Mock Notification to " + userId + "]: Title: " + title + " | Content: " + body);
        }

        Notification notification = Notification.builder()
                .userId(userId)
                .institutionId(institutionId)
                .type(type) // 'appointment', 'risk_alert', 'community_reply', 'system'
                .title(title)
                .body(body)
                .isRead(false)
                .channels(activeChannels)
                .createdAt(OffsetDateTime.now())
                .build();

        return notificationRepository.save(notification);
    }

    public NotificationPreference getPreferences(UUID userId) {
        return preferenceRepository.findByUserId(userId)
                .orElseGet(() -> {
                    // Seed initial defaults if no pref row is set
                    NotificationPreference defaultPref = NotificationPreference.builder()
                            .userId(userId)
                            .emailEnabled(true)
                            .pushEnabled(true)
                            .inAppEnabled(true)
                            .appointmentReminders(true)
                            .riskAlertsSubscribed(false)
                            .updatedAt(OffsetDateTime.now())
                            .build();
                    return preferenceRepository.save(defaultPref);
                });
    }

    @Transactional
    public NotificationPreference updatePreferences(UUID userId, NotificationPreference updated) {
        NotificationPreference current = getPreferences(userId);
        
        current.setEmailEnabled(updated.isEmailEnabled());
        current.setPushEnabled(updated.isPushEnabled());
        current.setInAppEnabled(updated.isInAppEnabled());
        current.setAppointmentReminders(updated.isAppointmentReminders());
        current.setRiskAlertsSubscribed(updated.isRiskAlertsSubscribed());
        current.setUpdatedAt(OffsetDateTime.now());

        return preferenceRepository.save(current);
    }
}
