package com.mindspire.repository;

import com.mindspire.entity.ModerationAction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ModerationActionRepository extends JpaRepository<ModerationAction, UUID> {
    List<ModerationAction> findAllByInstitutionIdOrderByAppliedAtDesc(UUID institutionId);
}
