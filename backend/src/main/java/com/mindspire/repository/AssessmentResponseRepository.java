package com.mindspire.repository;

import com.mindspire.entity.AssessmentResponse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AssessmentResponseRepository extends JpaRepository<AssessmentResponse, UUID> {
    List<AssessmentResponse> findAllByAssessmentResultId(UUID assessmentResultId);
}
