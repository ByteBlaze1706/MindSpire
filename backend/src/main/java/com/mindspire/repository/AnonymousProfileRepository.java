package com.mindspire.repository;

import com.mindspire.entity.AnonymousProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AnonymousProfileRepository extends JpaRepository<AnonymousProfile, UUID> {
    Optional<AnonymousProfile> findByUserId(UUID userId);
    Optional<AnonymousProfile> findByPseudonym(String pseudonym);
}
