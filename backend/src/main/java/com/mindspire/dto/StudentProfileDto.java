package com.mindspire.dto;

import lombok.Builder;
import lombok.Data;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class StudentProfileDto {
    private UUID id;
    private String email;
    private String pseudonym;

    private List<MoodLogDto> moodLogs;
    private List<AssessmentResultDto> assessmentResults;
    private List<AppointmentDto> appointments;

    private ConsentDto consent;

    private List<ClinicalJournalDto> journals;
    private List<ClinicalChatDto> chats;

    @Data
    @Builder
    public static class MoodLogDto {
        private UUID id;
        private int score;
        private String descriptor;
        private OffsetDateTime loggedAt;
    }

    @Data
    @Builder
    public static class AssessmentResultDto {
        private UUID id;
        private String assessmentName;
        private int totalScore;
        private String severityLevel;
        private OffsetDateTime completedAt;
    }

    @Data
    @Builder
    public static class AppointmentDto {
        private UUID id;
        private OffsetDateTime scheduledTime;
        private String status;
        private boolean hasNotes;
    }

    @Data
    @Builder
    public static class ConsentDto {
        private boolean journals;
        private boolean chats;
    }
}
