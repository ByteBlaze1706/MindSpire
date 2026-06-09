package com.mindspire.dto;

import lombok.Builder;
import lombok.Data;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
public class ClinicalJournalDto {
    private UUID id;
    private String content;
    private OffsetDateTime createdAt;
    private boolean isGratitude;
}
