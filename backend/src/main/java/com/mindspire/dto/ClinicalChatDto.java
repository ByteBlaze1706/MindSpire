package com.mindspire.dto;

import lombok.Builder;
import lombok.Data;
import java.time.OffsetDateTime;
import java.util.List;

@Data
@Builder
public class ClinicalChatDto {
    private String sessionTitle;
    private List<ChatMessageDto> messages;

    @Data
    @Builder
    public static class ChatMessageDto {
        private String senderType; // 'student' | 'assistant'
        private String content;
        private OffsetDateTime createdAt;
    }
}
