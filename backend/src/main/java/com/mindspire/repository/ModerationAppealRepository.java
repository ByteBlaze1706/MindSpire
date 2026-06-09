package com.mindspire.repository;

import com.mindspire.entity.ModerationAppeal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ModerationAppealRepository extends JpaRepository<ModerationAppeal, UUID> {
    List<ModerationAppeal> findAllByInstitutionIdAndStatusOrderByCreatedAtDesc(UUID institutionId, String status);
    List<ModerationAppeal> findAllByUserIdOrderByCreatedAtDesc(UUID userId);
}
