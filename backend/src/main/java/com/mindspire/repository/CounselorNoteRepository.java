package com.mindspire.repository;

import com.mindspire.entity.CounselorNote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CounselorNoteRepository extends JpaRepository<CounselorNote, UUID> {
    Optional<CounselorNote> findByAppointmentId(UUID appointmentId);
    Optional<CounselorNote> findByAppointmentIdAndCounselorId(UUID appointmentId, UUID counselorId);
}
