package com.mindspire.repository;

import com.mindspire.entity.AssessmentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AssessmentTypeRepository extends JpaRepository<AssessmentType, UUID> {
    Optional<AssessmentType> findByName(String name);
}
