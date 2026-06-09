package com.mindspire.repository;

import com.mindspire.entity.InstitutionFeatureFlag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface InstitutionFeatureFlagRepository extends JpaRepository<InstitutionFeatureFlag, UUID> {
    Optional<InstitutionFeatureFlag> findByInstitutionIdAndFlagId(UUID institutionId, UUID flagId);
}
