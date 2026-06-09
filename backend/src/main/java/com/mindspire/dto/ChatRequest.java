package com.mindspire.dto;

import lombok.*;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatRequest {
    private UUID sessionId;
    private String message;
    private String memoryPreference; // 'no_memory', 'session_memory', 'persistent_memory'
    private String language; // 'English', 'Hindi', 'Marathi', 'Tamil', 'Telugu', 'Bengali', 'Gujarati'
}
