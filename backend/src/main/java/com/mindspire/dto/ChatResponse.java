package com.mindspire.dto;

import lombok.*;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatResponse {
    private UUID sessionId;
    private String sessionTitle;
    private String response;
    private boolean isCrisis;
    private String crisisHelpline;
    private boolean escalateToCounselor;
}
