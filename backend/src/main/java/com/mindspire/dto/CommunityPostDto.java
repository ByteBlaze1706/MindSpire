package com.mindspire.dto;

import lombok.Builder;
import lombok.Data;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
public class CommunityPostDto {
    private UUID id;
    private String title;
    private String content;
    private String category;
    private boolean isAnonymous;
    private String authorPseudonym;
    private long upvoteCount;
    private long commentCount;
    private OffsetDateTime createdAt;
    private String status;
    private Map<String, Long> reactionCounts;
    private String userReaction; // Reaction type of current user if any
}
