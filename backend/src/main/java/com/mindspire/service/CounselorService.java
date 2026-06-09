package com.mindspire.service;

import com.mindspire.dto.*;
import com.mindspire.entity.*;
import com.mindspire.repository.*;
import com.mindspire.util.KmsEncryptionUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CounselorService {

    private final UserRepository userRepository;
    private final AppointmentRepository appointmentRepository;
    private final ConsentGrantRepository consentGrantRepository;
    private final AnonymousProfileRepository anonymousProfileRepository;
    private final RiskAlertRepository riskAlertRepository;
    private final CounselorAvailabilityRepository availabilityRepository;
    private final CounselorNoteRepository counselorNoteRepository;
    private final MoodLogRepository moodLogRepository;
    private final AssessmentResultRepository assessmentResultRepository;
    private final JournalEntryRepository journalEntryRepository;

    /**
     * Retrieves counselor verification status.
     */
    public User getCounselorStatus(UUID counselorId) {
        return userRepository.findById(counselorId).orElse(null);
    }

    /**
     * Resolves student roster assigned to counselor.
     */
    public List<StudentRosterDto> getAssignedStudents(UUID counselorId, UUID institutionId) {
        List<Appointment> appts = appointmentRepository.findAllByCounselorIdAndInstitutionIdAndDeletedAtIsNull(counselorId, institutionId);
        List<ConsentGrant> consents = consentGrantRepository.findAllByCounselorIdAndInstitutionIdAndStatus(counselorId, institutionId, "active");

        Set<UUID> studentIds = new HashSet<>();
        appts.forEach(a -> studentIds.add(a.getStudentId()));
        consents.forEach(c -> {
            if (c.getExpiresAt().isAfter(OffsetDateTime.now())) {
                studentIds.add(c.getStudentId());
            }
        });

        if (studentIds.isEmpty()) return Collections.emptyList();

        List<User> students = userRepository.findAllById(studentIds);

        return students.stream().map(student -> {
            Optional<AnonymousProfile> anon = anonymousProfileRepository.findByUserId(student.getId());
            boolean hasActiveConsent = consents.stream().anyMatch(c -> 
                c.getStudentId().equals(student.getId()) && c.getExpiresAt().isAfter(OffsetDateTime.now())
            );

            return StudentRosterDto.builder()
                    .id(student.getId())
                    .email(student.getEmail())
                    .pseudonym(anon.map(AnonymousProfile::getPseudonym).orElse("Anonymous Peer"))
                    .activeConsent(hasActiveConsent)
                    .build();
        }).collect(Collectors.toList());
    }

    /**
     * Checks if active consent grant exists.
     */
    public boolean checkConsent(UUID studentId, UUID counselorId, String type) {
        Optional<ConsentGrant> grant = consentGrantRepository.findActiveConsent(studentId, counselorId, OffsetDateTime.now());
        if (grant.isEmpty()) return false;
        
        String grantType = grant.get().getGrantType();
        if ("both".equals(grantType)) return true;
        return grantType.equals(type);
    }

    /**
     * Resolves active risk alerts queue.
     */
    public List<RiskAlertDto> getRiskAlerts(UUID institutionId) {
        List<RiskAlert> alerts = riskAlertRepository.findAllByInstitutionIdOrderByCreatedAtDesc(institutionId);
        
        return alerts.stream().map(a -> {
            Optional<AnonymousProfile> anon = anonymousProfileRepository.findByUserId(a.getUserId());
            return RiskAlertDto.builder()
                    .id(a.getId())
                    .pseudonym(anon.map(AnonymousProfile::getPseudonym).orElse("Anonymous Peer"))
                    .sourceType(a.getSourceType())
                    .severity(a.getSeverity())
                    .status(a.getStatus())
                    .resolutionNotes(a.getResolutionNotes())
                    .createdAt(a.getCreatedAt())
                    .build();
        }).collect(Collectors.toList());
    }

    /**
     * Resolves a risk alert.
     */
    @Transactional
    public void resolveRiskAlert(UUID alertId, UUID institutionId, String notes) {
        Optional<RiskAlert> alertOpt = riskAlertRepository.findById(alertId);
        if (alertOpt.isPresent()) {
            RiskAlert alert = alertOpt.get();
            if (alert.getInstitutionId().equals(institutionId)) {
                alert.setStatus("resolved");
                alert.setResolutionNotes(notes);
                alert.setUpdatedAt(OffsetDateTime.now());
                riskAlertRepository.save(alert);
            }
        }
    }

    /**
     * Creates scheduling slots.
     */
    @Transactional
    public void createAvailabilitySlot(UUID counselorId, UUID institutionId, OffsetDateTime start, OffsetDateTime end) {
        if (start.isAfter(end) || start.isEqual(end)) {
            throw new IllegalArgumentException("Start time must occur before end time.");
        }
        
        CounselorAvailability slot = CounselorAvailability.builder()
                .counselorId(counselorId)
                .institutionId(institutionId)
                .startTime(start)
                .endTime(end)
                .isBooked(false)
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build();
        
        availabilityRepository.save(slot);
    }

    /**
     * Deletes availability slot.
     */
    @Transactional
    public void deleteAvailabilitySlot(UUID slotId, UUID counselorId) {
        Optional<CounselorAvailability> slot = availabilityRepository.findById(slotId);
        if (slot.isPresent() && slot.get().getCounselorId().equals(counselorId) && !slot.get().isBooked()) {
            availabilityRepository.delete(slot.get());
        }
    }

    /**
     * Fetches availability blocks.
     */
    public List<CounselorAvailability> getAvailability(UUID counselorId) {
        return availabilityRepository.findAllByCounselorIdOrderByStartTimeAsc(counselorId);
    }

    /**
     * Writes envelope-encrypted note.
     */
    @Transactional
    public void saveSessionNote(UUID counselorId, UUID studentId, UUID appointmentId, UUID institutionId, String rawText, String masterKey) throws Exception {
        KmsEncryptionUtil.EncryptionResult result = KmsEncryptionUtil.encrypt(rawText, masterKey);
        
        Optional<CounselorNote> existing = counselorNoteRepository.findByAppointmentId(appointmentId);
        CounselorNote note;
        
        if (existing.isPresent()) {
            note = existing.get();
            note.setEncryptedClinicalData(result.ciphertext);
            note.setEncryptedDek(result.encryptedDek);
            note.setKeyReference(result.keyRef);
            note.setUpdatedAt(OffsetDateTime.now());
        } else {
            note = CounselorNote.builder()
                    .appointmentId(appointmentId)
                    .counselorId(counselorId)
                    .studentId(studentId)
                    .institutionId(institutionId)
                    .encryptedClinicalData(result.ciphertext)
                    .encryptedDek(result.encryptedDek)
                    .keyReference(result.keyRef)
                    .encryptionVersion("v1")
                    .createdAt(OffsetDateTime.now())
                    .updatedAt(OffsetDateTime.now())
                    .build();
        }
        
        counselorNoteRepository.save(note);
    }

    /**
     * Decrypts note.
     */
    public String getSessionNote(UUID appointmentId, UUID counselorId, String masterKey) throws Exception {
        Optional<CounselorNote> note = counselorNoteRepository.findByAppointmentIdAndCounselorId(appointmentId, counselorId);
        if (note.isEmpty()) return null;
        return KmsEncryptionUtil.decrypt(note.get().getEncryptedClinicalData(), note.get().getEncryptedDek(), masterKey);
    }

    /**
     * Gathers student details.
     */
    public StudentProfileDto getStudentProfile(UUID studentId, UUID counselorId, UUID institutionId, String masterKey) throws Exception {
        // 1. Verify access
        List<Appointment> appts = appointmentRepository.findAllByStudentIdAndCounselorIdAndDeletedAtIsNull(studentId, counselorId);
        boolean journalsConsent = checkConsent(studentId, counselorId, "journals");
        boolean chatsConsent = checkConsent(studentId, counselorId, "ai_chats");

        if (appts.isEmpty() && !journalsConsent && !chatsConsent) {
            throw new IllegalAccessException("Access Denied: Counselors only access assigned students.");
        }

        // 2. Fetch demographic details
        Optional<User> studentOpt = userRepository.findById(studentId);
        if (studentOpt.isEmpty() || !studentOpt.get().getInstitutionId().equals(institutionId)) {
            throw new NoSuchElementException("Student profile not found.");
        }
        User student = studentOpt.get();
        Optional<AnonymousProfile> anon = anonymousProfileRepository.findByUserId(studentId);

        // 3. Fetch mood logs (limit 30)
        List<MoodLog> moodLogs = moodLogRepository.findAllByUserIdOrderByLoggedAtDesc(studentId, PageRequest.of(0, 30));
        List<StudentProfileDto.MoodLogDto> moodDtos = moodLogs.stream().map(log -> 
            StudentProfileDto.MoodLogDto.builder()
                    .id(log.getId())
                    .score(log.getScore())
                    .descriptor(log.getDescriptor())
                    .loggedAt(log.getLoggedAt())
                    .build()
        ).collect(Collectors.toList());

        // 4. Fetch clinical assessment results (limit 10)
        List<AssessmentResult> results = assessmentResultRepository.findAllByUserIdOrderByCompletedAtDesc(studentId, PageRequest.of(0, 10));
        List<StudentProfileDto.AssessmentResultDto> resultsDtos = results.stream().map(res -> 
            StudentProfileDto.AssessmentResultDto.builder()
                    .id(res.getId())
                    .assessmentName(res.getAssessmentType().getName())
                    .totalScore(res.getTotalScore())
                    .severityLevel(res.getSeverityLevel())
                    .completedAt(res.getCompletedAt())
                    .build()
        ).collect(Collectors.toList());

        // 5. Fetch appointments history
        List<StudentProfileDto.AppointmentDto> apptDtos = appts.stream().map(appt -> {
            Optional<CounselorNote> note = counselorNoteRepository.findByAppointmentId(appt.getId());
            return StudentProfileDto.AppointmentDto.builder()
                    .id(appt.getId())
                    .scheduledTime(appt.getScheduledTime())
                    .status(appt.getStatus())
                    .hasNotes(note.isPresent())
                    .build();
        }).collect(Collectors.toList());

        // 6. Decrypt journals (if consent is active)
        List<ClinicalJournalDto> journalDtos = Collections.emptyList();
        if (journalsConsent) {
            List<JournalEntry> journals = journalEntryRepository.findAllByUserIdAndDeletedAtIsNullOrderByCreatedAtDesc(studentId);
            journalDtos = journals.stream().map(j -> {
                String decryptedContent;
                try {
                    decryptedContent = decryptJournalHelper(j.getEncryptedContent(), j.getEncryptedDek(), masterKey);
                } catch (Exception e) {
                    decryptedContent = "[Decryption Error: Key mismatch]";
                }
                return ClinicalJournalDto.builder()
                        .id(j.getId())
                        .content(decryptedContent)
                        .createdAt(j.getCreatedAt())
                        .isGratitude(j.isGratitude())
                        .build();
            }).collect(Collectors.toList());
        }

        return StudentProfileDto.builder()
                .id(student.getId())
                .email(student.getEmail())
                .pseudonym(anon.map(AnonymousProfile::getPseudonym).orElse("Anonymous Peer"))
                .moodLogs(moodDtos)
                .assessmentResults(resultsDtos)
                .appointments(apptDtos)
                .consent(StudentProfileDto.ConsentDto.builder()
                        .journals(journalsConsent)
                        .chats(chatsConsent)
                        .build())
                .journals(journalDtos)
                .chats(Collections.emptyList()) // AI Companion chats details mapping simplified
                .build();
    }

    private String decryptJournalHelper(String cipherText, String encryptedDek, String masterKey) throws Exception {
        // Wrapper for standard KMS decryption
        return KmsEncryptionUtil.decrypt(cipherText, encryptedDek, masterKey);
    }
}
