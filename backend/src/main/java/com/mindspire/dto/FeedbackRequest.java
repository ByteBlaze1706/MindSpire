package com.mindspire.dto;

import lombok.*;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeedbackRequest {
    private UUID sessionId;
    private String feedbackRating; // 'HELPFUL', 'NOT_RELEVANT', 'TOO_GENERIC', 'NEEDS_HUMAN_SUPPORT'
    private String feedbackComments;
}
