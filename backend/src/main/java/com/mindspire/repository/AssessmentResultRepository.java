package com.mindspire.repository;

import com.mindspire.entity.AssessmentResult;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface AssessmentResultRepository extends JpaRepository<AssessmentResult, UUID> {
    List<AssessmentResult> findAllByUserIdOrderByCompletedAtDesc(UUID userId);
    List<AssessmentResult> findAllByUserIdOrderByCompletedAtDesc(UUID userId, Pageable pageable);
}
