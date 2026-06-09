package com.mindspire.dto;

import lombok.Builder;
import lombok.Data;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
public class RiskAlertDto {
    private UUID id;
    private String pseudonym;
    private String sourceType;
    private String severity;
    private String status;
    private String resolutionNotes;
    private OffsetDateTime createdAt;
}
