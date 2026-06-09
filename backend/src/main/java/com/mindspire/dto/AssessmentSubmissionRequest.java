package com.mindspire.dto;

import lombok.Data;
import java.util.Map;
import java.util.UUID;

@Data
public class AssessmentSubmissionRequest {
    private UUID typeId;
    private Map<UUID, Integer> answers;
}
