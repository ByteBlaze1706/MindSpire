package com.mindspire.repository;

import com.mindspire.entity.AiUsageAnalytics;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AiUsageAnalyticsRepository extends JpaRepository<AiUsageAnalytics, UUID> {
    List<AiUsageAnalytics> findAllByUserId(UUID userId);
    void deleteAllByUserId(UUID userId);
}
