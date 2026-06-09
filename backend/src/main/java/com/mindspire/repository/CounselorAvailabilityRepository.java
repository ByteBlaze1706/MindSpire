package com.mindspire.repository;

import com.mindspire.entity.CounselorAvailability;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface CounselorAvailabilityRepository extends JpaRepository<CounselorAvailability, UUID> {
    List<CounselorAvailability> findAllByCounselorIdOrderByStartTimeAsc(UUID counselorId);
    List<CounselorAvailability> findAllByInstitutionIdAndIsBookedFalseOrderByStartTimeAsc(UUID institutionId);
}
