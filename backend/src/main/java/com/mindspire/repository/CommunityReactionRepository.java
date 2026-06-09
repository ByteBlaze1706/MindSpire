package com.mindspire.repository;

import com.mindspire.entity.CommunityReaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CommunityReactionRepository extends JpaRepository<CommunityReaction, UUID> {
    List<CommunityReaction> findAllByPostId(UUID postId);
    List<CommunityReaction> findAllByCommentId(UUID commentId);
    Optional<CommunityReaction> findByUserIdAndPostIdAndReactionType(UUID userId, UUID postId, String reactionType);
    Optional<CommunityReaction> findByUserIdAndCommentIdAndReactionType(UUID userId, UUID commentId, String reactionType);
    long countByPostIdAndReactionType(UUID postId, String reactionType);
    long countByCommentIdAndReactionType(UUID commentId, String reactionType);
    List<CommunityReaction> findAllByUserId(UUID userId);
}
