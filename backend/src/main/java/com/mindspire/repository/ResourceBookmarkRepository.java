package com.mindspire.repository;

import com.mindspire.entity.ResourceBookmark;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ResourceBookmarkRepository extends JpaRepository<ResourceBookmark, UUID> {
    List<ResourceBookmark> findAllByUserId(UUID userId);
    Optional<ResourceBookmark> findByUserIdAndResourceId(UUID userId, UUID resourceId);
    boolean existsByUserIdAndResourceId(UUID userId, UUID resourceId);
}
