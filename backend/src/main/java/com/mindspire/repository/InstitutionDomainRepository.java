package com.mindspire.repository;

import com.mindspire.entity.InstitutionDomain;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface InstitutionDomainRepository extends JpaRepository<InstitutionDomain, UUID> {
    List<InstitutionDomain> findAllByInstitutionId(UUID institutionId);
    Optional<InstitutionDomain> findByInstitutionIdAndDomain(UUID institutionId, String domain);
}
