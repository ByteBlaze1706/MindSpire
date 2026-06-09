package com.mindspire.repository;

import com.mindspire.entity.CommunityPost;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CommunityPostRepository extends JpaRepository<CommunityPost, UUID> {
    List<CommunityPost> findAllByInstitutionIdAndStatusOrderByCreatedAtDesc(UUID institutionId, String status);
    List<CommunityPost> findAllByInstitutionIdAndStatusAndCategoryOrderByCreatedAtDesc(UUID institutionId, String status, String category);
    List<CommunityPost> findAllByStatus(String status);
}
