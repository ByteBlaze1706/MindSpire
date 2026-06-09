package com.mindspire.repository;

import com.mindspire.entity.ResourceRecommendationHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ResourceRecommendationHistoryRepository extends JpaRepository<ResourceRecommendationHistory, UUID> {
    List<ResourceRecommendationHistory> findAllByUserIdOrderByCreatedAtDesc(UUID userId);
}
