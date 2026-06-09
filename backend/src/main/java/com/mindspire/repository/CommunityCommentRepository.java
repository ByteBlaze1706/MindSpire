package com.mindspire.repository;

import com.mindspire.entity.CommunityComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CommunityCommentRepository extends JpaRepository<CommunityComment, UUID> {
    List<CommunityComment> findAllByPostIdAndStatusAndDeletedAtIsNullOrderByCreatedAtAsc(UUID postId, String status);
    List<CommunityComment> findAllByPostIdAndDeletedAtIsNullOrderByCreatedAtAsc(UUID postId);
    long countByPostIdAndStatusAndDeletedAtIsNull(UUID postId, String status);
}
