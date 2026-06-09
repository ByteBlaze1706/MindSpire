package com.mindspire.repository;

import com.mindspire.entity.RiskAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface RiskAlertRepository extends JpaRepository<RiskAlert, UUID> {
    List<RiskAlert> findAllByInstitutionIdOrderByCreatedAtDesc(UUID institutionId);
    List<RiskAlert> findAllByInstitutionIdAndStatusOrderByCreatedAtDesc(UUID institutionId, String status);
    long countByInstitutionIdAndStatus(UUID institutionId, String status);
}
