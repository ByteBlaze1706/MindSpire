package com.mindspire.repository;

import com.mindspire.entity.AiChatSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AiChatSessionRepository extends JpaRepository<AiChatSession, UUID> {
    List<AiChatSession> findAllByUserIdAndInstitutionIdOrderByUpdatedAtDesc(UUID userId, UUID institutionId);
    void deleteAllByUserId(UUID userId);
}
