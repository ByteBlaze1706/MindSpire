package com.mindspire.repository;

import com.mindspire.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    List<User> findAllByInstitutionIdAndRole(UUID institutionId, String role);
    long countByInstitutionIdAndRole(UUID institutionId, String role);
    long countByInstitutionIdAndRoleAndCounselorStatus(UUID institutionId, String role, String status);
    List<User> findAllByInstitutionIdAndRoleAndCounselorStatus(UUID institutionId, String role, String status);
}
