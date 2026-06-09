package com.mindspire.repository;

import com.mindspire.entity.MoodLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface MoodLogRepository extends JpaRepository<MoodLog, UUID> {
    List<MoodLog> findAllByUserIdOrderByLoggedAtDesc(UUID userId);
    List<MoodLog> findAllByUserIdOrderByLoggedAtDesc(UUID userId, Pageable pageable);
    long countByInstitutionId(UUID institutionId);
    List<MoodLog> findAllByInstitutionId(UUID institutionId);
}
