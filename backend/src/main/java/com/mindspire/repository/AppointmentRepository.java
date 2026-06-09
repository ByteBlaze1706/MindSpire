package com.mindspire.repository;

import com.mindspire.entity.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, UUID> {
    List<Appointment> findAllByCounselorIdAndDeletedAtIsNull(UUID counselorId);
    List<Appointment> findAllByStudentIdAndCounselorIdAndDeletedAtIsNull(UUID studentId, UUID counselorId);
    List<Appointment> findAllByCounselorIdAndInstitutionIdAndDeletedAtIsNull(UUID counselorId, UUID institutionId);
}
