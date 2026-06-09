package com.mindspire.repository;

import com.mindspire.entity.Resource;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ResourceRepository extends JpaRepository<Resource, UUID> {
    List<Resource> findAllByInstitutionIdAndStatusOrderByCreatedAtDesc(UUID institutionId, String status);
    List<Resource> findAllByInstitutionIdAndStatusAndCategoryOrderByCreatedAtDesc(UUID institutionId, String status, String category);
}
