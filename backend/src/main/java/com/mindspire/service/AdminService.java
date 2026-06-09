package com.mindspire.service;

import com.mindspire.entity.*;
import com.mindspire.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final MoodLogRepository moodLogRepository;
    private final RiskAlertRepository riskAlertRepository;
    private final AuditLogRepository auditLogRepository;
    private final InstitutionRepository institutionRepository;
    private final ResourceRepository resourceRepository;
    private final ResourceBookmarkRepository resourceBookmarkRepository;
    private final WellnessScoreService wellnessScoreService;

    /**
     * Retrieves overview KPI metrics for the institution dashboard.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getOverviewStats(UUID institutionId) {
        long activeStudents = userRepository.countByInstitutionIdAndRole(institutionId, "student");
        long verifiedCounselors = userRepository.countByInstitutionIdAndRoleAndCounselorStatus(institutionId, "counselor", "approved");
        long totalCheckIns = moodLogRepository.countByInstitutionId(institutionId);
        long unresolvedRiskAlerts = riskAlertRepository.countByInstitutionIdAndStatus(institutionId, "pending");

        Map<String, Object> stats = new HashMap<>();
        stats.put("activeStudents", activeStudents);
        stats.put("verifiedCounselors", verifiedCounselors);
        stats.put("totalCheckIns", totalCheckIns);
        stats.put("unresolvedRiskAlerts", unresolvedRiskAlerts);
        return stats;
    }

    /**
     * Compiles wellness risk heatmap datasets, anonymized by enforcing cohort size >= 5.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getWellnessHeatmap(UUID institutionId) {
        List<User> students = userRepository.findAllByInstitutionIdAndRole(institutionId, "student");

        // Group students by department, academicYear, and program
        Map<String, List<User>> byDept = students.stream()
                .filter(s -> s.getDepartment() != null && !s.getDepartment().trim().isEmpty())
                .collect(Collectors.groupingBy(User::getDepartment));

        Map<String, List<User>> byYear = students.stream()
                .filter(s -> s.getAcademicYear() != null && !s.getAcademicYear().trim().isEmpty())
                .collect(Collectors.groupingBy(User::getAcademicYear));

        Map<String, List<User>> byProg = students.stream()
                .filter(s -> s.getProgram() != null && !s.getProgram().trim().isEmpty())
                .collect(Collectors.groupingBy(User::getProgram));

        Map<String, Object> heatmapData = new HashMap<>();
        heatmapData.put("departmentStats", compileCohortStats(byDept));
        heatmapData.put("academicYearStats", compileCohortStats(byYear));
        heatmapData.put("programStats", compileCohortStats(byProg));

        return heatmapData;
    }

    private List<Map<String, Object>> compileCohortStats(Map<String, List<User>> grouped) {
        List<Map<String, Object>> resultList = new ArrayList<>();

        for (Map.Entry<String, List<User>> entry : grouped.entrySet()) {
            String cohortName = entry.getKey();
            List<User> cohortStudents = entry.getValue();
            int count = cohortStudents.size();

            // Enforce Anonymity Gate: Only show cohorts with at least 5 students
            if (count < 5) {
                continue;
            }

            double totalScore = 0;
            for (User student : cohortStudents) {
                totalScore += wellnessScoreService.calculateWellnessScore(student.getId());
            }
            double averageWellness = count > 0 ? (totalScore / count) : 100.0;

            Map<String, Object> stat = new HashMap<>();
            stat.put("cohort", cohortName);
            stat.put("studentCount", count);
            stat.put("averageScore", Math.round(averageWellness));
            resultList.add(stat);
        }

        return resultList;
    }

    /**
     * Compiles resource usage analytics (most bookmarked self-help resources).
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getResourceAnalytics(UUID institutionId) {
        List<Resource> resources = resourceRepository.findAllByInstitutionIdAndStatusOrderByCreatedAtDesc(institutionId, "published");
        
        List<Map<String, Object>> list = new ArrayList<>();
        for (Resource res : resources) {
            // Simple count in memory or db
            long count = resourceBookmarkRepository.findAll().stream()
                    .filter(b -> b.getResourceId().equals(res.getId()))
                    .count();

            Map<String, Object> map = new HashMap<>();
            map.put("id", res.getId());
            map.put("title", res.getTitle());
            map.put("category", res.getCategory());
            map.put("bookmarkCount", count);
            list.add(map);
        }

        // Sort descending by bookmarkCount
        list.sort((a, b) -> Long.compare((long) b.get("bookmarkCount"), (long) a.get("bookmarkCount")));
        return list;
    }

    /**
     * Approves a pending counselor.
     */
    @Transactional
    public void approveCounselor(UUID counselorId, UUID adminUserId, String ipAddress, String userAgent) {
        User counselor = userRepository.findById(counselorId)
                .orElseThrow(() -> new IllegalArgumentException("Counselor not found."));

        if (!"counselor".equals(counselor.getRole())) {
            throw new IllegalArgumentException("Target user is not a counselor.");
        }

        counselor.setCounselorStatus("approved");
        counselor.setApproved(true);
        counselor.setUpdatedAt(OffsetDateTime.now());
        userRepository.save(counselor);

        // Log append-only audit record
        auditLogRepository.save(AuditLog.builder()
                .institutionId(counselor.getInstitutionId())
                .userId(adminUserId)
                .action("APPROVE_COUNSELOR")
                .targetResource("counselor_id:" + counselorId + ", email:" + counselor.getEmail())
                .ipAddress(ipAddress)
                .userAgent(userAgent)
                .createdAt(OffsetDateTime.now())
                .build());
    }

    /**
     * Rejects a pending counselor.
     */
    @Transactional
    public void rejectCounselor(UUID counselorId, UUID adminUserId, String ipAddress, String userAgent) {
        User counselor = userRepository.findById(counselorId)
                .orElseThrow(() -> new IllegalArgumentException("Counselor not found."));

        if (!"counselor".equals(counselor.getRole())) {
            throw new IllegalArgumentException("Target user is not a counselor.");
        }

        counselor.setCounselorStatus("rejected");
        counselor.setApproved(false);
        counselor.setUpdatedAt(OffsetDateTime.now());
        userRepository.save(counselor);

        // Log append-only audit record
        auditLogRepository.save(AuditLog.builder()
                .institutionId(counselor.getInstitutionId())
                .userId(adminUserId)
                .action("REJECT_COUNSELOR")
                .targetResource("counselor_id:" + counselorId + ", email:" + counselor.getEmail())
                .ipAddress(ipAddress)
                .userAgent(userAgent)
                .createdAt(OffsetDateTime.now())
                .build());
    }

    /**
     * Updates branding configurations for the institution.
     */
    @Transactional
    public void updateBrandingConfig(UUID institutionId, Map<String, String> branding, UUID adminUserId, String ipAddress, String userAgent) {
        Institution inst = institutionRepository.findById(institutionId)
                .orElseThrow(() -> new IllegalArgumentException("Institution not found."));

        // Format to JSON string manually or using Jackson
        // Required fields: primaryColor, accentColor, logoUrl, supportEmail, emergencyPhone
        String json = String.format(
                "{\"primaryColor\":\"%s\",\"accentColor\":\"%s\",\"logoUrl\":\"%s\",\"supportEmail\":\"%s\",\"emergencyPhone\":\"%s\"}",
                escapeJson(branding.getOrDefault("primaryColor", "#8EADC2")),
                escapeJson(branding.getOrDefault("accentColor", "#F5AF8F")),
                escapeJson(branding.getOrDefault("logoUrl", "")),
                escapeJson(branding.getOrDefault("supportEmail", "")),
                escapeJson(branding.getOrDefault("emergencyPhone", ""))
        );

        inst.setBrandingConfig(json);
        inst.setUpdatedAt(OffsetDateTime.now());
        institutionRepository.save(inst);

        // Log append-only audit record
        auditLogRepository.save(AuditLog.builder()
                .institutionId(institutionId)
                .userId(adminUserId)
                .action("UPDATE_BRANDING")
                .targetResource("institution_id:" + institutionId)
                .ipAddress(ipAddress)
                .userAgent(userAgent)
                .createdAt(OffsetDateTime.now())
                .build());
    }

    private String escapeJson(String input) {
        if (input == null) return "";
        return input.replace("\"", "\\\"");
    }

    /**
     * Lists append-only audit logs (read-only endpoint helper).
     */
    @Transactional(readOnly = true)
    public List<AuditLog> getAuditLogs(UUID institutionId) {
        return auditLogRepository.findAllByInstitutionIdOrderByCreatedAtDesc(institutionId);
    }

    /**
     * Lists pending counselors for approval queue.
     */
    @Transactional(readOnly = true)
    public List<User> getPendingCounselors(UUID institutionId) {
        return userRepository.findAllByInstitutionIdAndRoleAndCounselorStatus(institutionId, "counselor", "pending");
    }
}
