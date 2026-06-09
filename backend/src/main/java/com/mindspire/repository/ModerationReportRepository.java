package com.mindspire.repository;

import com.mindspire.entity.ModerationReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ModerationReportRepository extends JpaRepository<ModerationReport, UUID> {
    List<ModerationReport> findAllByInstitutionIdAndStatusOrderByCreatedAtDesc(UUID institutionId, String status);
}
