package com.mindspire.dto;

import lombok.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SessionResponse {
    private UUID id;
    private String title;
    private String memoryPreference;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
