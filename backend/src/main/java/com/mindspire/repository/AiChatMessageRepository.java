package com.mindspire.repository;

import com.mindspire.entity.AiChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AiChatMessageRepository extends JpaRepository<AiChatMessage, UUID> {
    List<AiChatMessage> findAllBySessionIdOrderByCreatedAtAsc(UUID sessionId);
    void deleteAllBySessionIdIn(List<UUID> sessionIds);
}
