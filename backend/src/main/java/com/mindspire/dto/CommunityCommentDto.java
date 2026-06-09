package com.mindspire.dto;

import lombok.Builder;
import lombok.Data;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
public class CommunityCommentDto {
    private UUID id;
    private UUID postId;
    private String content;
    private boolean isAnonymous;
    private String authorPseudonym;
    private UUID parentId;
    private OffsetDateTime createdAt;
    private OffsetDateTime deletedAt;
    private String status;
}
