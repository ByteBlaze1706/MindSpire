package com.mindspire.repository;

import com.mindspire.entity.JournalEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.UUID;

@Repository
public interface JournalEntryRepository extends JpaRepository<JournalEntry, UUID> {
    List<JournalEntry> findAllByUserIdAndDeletedAtIsNullOrderByCreatedAtDesc(UUID userId);

    @Query(value = "SELECT * FROM journal_entries WHERE user_id = :userId AND deleted_at IS NULL AND search_indices && CAST(:keywords AS text[]) ORDER BY created_at DESC", nativeQuery = true)
    List<JournalEntry> searchByKeywords(@Param("userId") UUID userId, @Param("keywords") String[] keywords);
}
