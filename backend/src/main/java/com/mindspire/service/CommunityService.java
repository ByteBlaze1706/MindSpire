package com.mindspire.service;

import com.mindspire.dto.CommunityCommentDto;
import com.mindspire.dto.CommunityPostDto;
import com.mindspire.entity.*;
import com.mindspire.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CommunityService {

    private final CommunityPostRepository postRepository;
    private final CommunityCommentRepository commentRepository;
    private final CommunityReactionRepository reactionRepository;
    private final ModerationReportRepository reportRepository;
    private final ModerationActionRepository actionRepository;
    private final UserRepository userRepository;
    private final AnonymousProfileRepository anonymousProfileRepository;
    private final PiiDetectionService piiDetectionService;
    private final CrisisDetectionService crisisDetectionService;

    // 1. Convert Post Entity to DTO
    public CommunityPostDto toPostDto(CommunityPost post, UUID currentUserId) {
        // Resolve author pseudonym
        String pseudonym = anonymousProfileRepository.findByUserId(post.getUserId())
                .map(AnonymousProfile::getPseudonym)
                .orElse("Anonymous User");

        // Count interactions
        long commentsCount = commentRepository.countByPostIdAndStatusAndDeletedAtIsNull(post.getId(), "approved");
        
        List<CommunityReaction> reactions = reactionRepository.findAllByPostId(post.getId());
        long upvotesCount = reactions.size();

        Map<String, Long> reactionCounts = reactions.stream()
                .collect(Collectors.groupingBy(CommunityReaction::getReactionType, Collectors.counting()));

        // Add defaults for reaction categories
        reactionCounts.putIfAbsent("support", 0L);
        reactionCounts.putIfAbsent("helpful", 0L);
        reactionCounts.putIfAbsent("relatable", 0L);
        reactionCounts.putIfAbsent("encouraging", 0L);

        // Find current user reaction type
        String userReaction = reactions.stream()
                .filter(r -> r.getUserId().equals(currentUserId))
                .map(CommunityReaction::getReactionType)
                .findFirst()
                .orElse(null);

        return CommunityPostDto.builder()
                .id(post.getId())
                .title(post.getTitle())
                .content(post.getContent())
                .category(post.getCategory())
                .isAnonymous(post.isAnonymous())
                .authorPseudonym(pseudonym)
                .upvoteCount(upvotesCount)
                .commentCount(commentsCount)
                .createdAt(post.getCreatedAt())
                .status(post.getStatus())
                .reactionCounts(reactionCounts)
                .userReaction(userReaction)
                .build();
    }

    // 2. Convert Comment Entity to DTO
    public CommunityCommentDto toCommentDto(CommunityComment comment) {
        String pseudonym = anonymousProfileRepository.findByUserId(comment.getUserId())
                .map(AnonymousProfile::getPseudonym)
                .orElse("Anonymous User");

        return CommunityCommentDto.builder()
                .id(comment.getId())
                .postId(comment.getPostId())
                .content(comment.getStatus().equals("hidden") ? "[Content hidden by moderators]" : comment.getContent())
                .isAnonymous(comment.isAnonymous())
                .authorPseudonym(pseudonym)
                .parentId(comment.getParentId())
                .createdAt(comment.getCreatedAt())
                .deletedAt(comment.getDeletedAt())
                .status(comment.getStatus())
                .build();
    }

    // 3. Fetch Posts by Category
    public List<CommunityPostDto> getPosts(UUID institutionId, String category, UUID currentUserId) {
        List<CommunityPost> posts;
        if (category == null || category.trim().isEmpty() || category.equalsIgnoreCase("all")) {
            posts = postRepository.findAllByInstitutionIdAndStatusOrderByCreatedAtDesc(institutionId, "approved");
        } else {
            posts = postRepository.findAllByInstitutionIdAndStatusAndCategoryOrderByCreatedAtDesc(institutionId, "approved", category);
        }

        return posts.stream()
                .map(p -> toPostDto(p, currentUserId))
                .collect(Collectors.toList());
    }

    // 4. Trending Feed ranking algorithm
    public List<CommunityPostDto> getTrendingPosts(UUID institutionId, UUID currentUserId) {
        List<CommunityPost> posts = postRepository.findAllByInstitutionIdAndStatusOrderByCreatedAtDesc(institutionId, "approved");
        
        return posts.stream()
                .map(p -> toPostDto(p, currentUserId))
                .sorted((a, b) -> {
                    double scoreA = calculateTrendingScore(a);
                    double scoreB = calculateTrendingScore(b);
                    return Double.compare(scoreB, scoreA); // descending order
                })
                .collect(Collectors.toList());
    }

    private double calculateTrendingScore(CommunityPostDto dto) {
        long hoursElapsed = Duration.between(dto.getCreatedAt(), OffsetDateTime.now()).toHours();
        double recencyScore = 100.0 / (1.0 + hoursElapsed);
        return (dto.getUpvoteCount() * 0.40) + (dto.getCommentCount() * 0.40) + (recencyScore * 0.20);
    }

    // 5. Create Community Post
    @Transactional
    public CommunityPost createPost(UUID userId, UUID institutionId, String title, String content, String category, boolean isAnonymous) {
        // Enforce PII validation
        piiDetectionService.validateContent(title);
        piiDetectionService.validateContent(content);

        // Crisis scanning
        boolean isCrisis = crisisDetectionService.detectCrisis(title) || crisisDetectionService.detectCrisis(content);
        String status = "approved";

        if (isCrisis) {
            crisisDetectionService.triggerRiskAlert(userId, institutionId, "community", "Title: " + title + " | Content: " + content);
            status = "hidden"; // Hide distress posts from public view immediately
        }

        CommunityPost post = CommunityPost.builder()
                .userId(userId)
                .institutionId(institutionId)
                .title(title)
                .content(content)
                .category(category == null ? "General Support" : category)
                .isAnonymous(isAnonymous)
                .status(status)
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build();

        post = postRepository.save(post);

        if (isCrisis) {
            throw new IllegalStateException("Distress keywords detected. The post has been flagged for counselor review, and public visibility is restricted. Please seek assistance.");
        }

        return post;
    }

    // 6. Comments list
    public List<CommunityCommentDto> getCommentsForPost(UUID postId) {
        List<CommunityComment> comments = commentRepository.findAllByPostIdAndDeletedAtIsNullOrderByCreatedAtAsc(postId);
        return comments.stream()
                .map(this::toCommentDto)
                .collect(Collectors.toList());
    }

    // 7. Create Community Comment
    @Transactional
    public CommunityComment createComment(UUID userId, UUID institutionId, UUID postId, String content, UUID parentId, boolean isAnonymous) {
        // Validate PII
        piiDetectionService.validateContent(content);

        // Crisis scanning
        boolean isCrisis = crisisDetectionService.detectCrisis(content);
        String status = "approved";

        if (isCrisis) {
            crisisDetectionService.triggerRiskAlert(userId, institutionId, "community", "Comment: " + content);
            status = "hidden";
        }

        CommunityComment comment = CommunityComment.builder()
                .userId(userId)
                .institutionId(institutionId)
                .postId(postId)
                .content(content)
                .parentId(parentId)
                .isAnonymous(isAnonymous)
                .status(status)
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build();

        comment = commentRepository.save(comment);

        if (isCrisis) {
            throw new IllegalStateException("Distress keywords detected. The comment has been flagged for counselor review. Visibility restricted.");
        }

        return comment;
    }

    // 8. React to Post (Toggles support/helpful/relatable/encouraging reactions)
    @Transactional
    public void reactToPost(UUID userId, UUID postId, String reactionType) {
        String cleanType = reactionType.toLowerCase(Locale.ROOT);
        Optional<CommunityReaction> existing = reactionRepository.findByUserIdAndPostIdAndReactionType(userId, postId, cleanType);

        if (existing.isPresent()) {
            reactionRepository.delete(existing.get()); // Toggle off
        } else {
            CommunityReaction reaction = CommunityReaction.builder()
                    .userId(userId)
                    .postId(postId)
                    .reactionType(cleanType)
                    .createdAt(OffsetDateTime.now())
                    .build();
            reactionRepository.save(reaction);
        }
    }

    // 9. React to Comment (Toggles reaction)
    @Transactional
    public void reactToComment(UUID userId, UUID commentId, String reactionType) {
        String cleanType = reactionType.toLowerCase(Locale.ROOT);
        Optional<CommunityReaction> existing = reactionRepository.findByUserIdAndCommentIdAndReactionType(userId, commentId, cleanType);

        if (existing.isPresent()) {
            reactionRepository.delete(existing.get());
        } else {
            CommunityReaction reaction = CommunityReaction.builder()
                    .userId(userId)
                    .commentId(commentId)
                    .reactionType(cleanType)
                    .createdAt(OffsetDateTime.now())
                    .build();
            reactionRepository.save(reaction);
        }
    }

    // 10. Report Post
    @Transactional
    public ModerationReport reportPost(UUID userId, UUID institutionId, UUID postId, String reason) {
        CommunityPost post = postRepository.findById(postId)
                .orElseThrow(() -> new NoSuchElementException("Community post not found."));

        ModerationReport report = ModerationReport.builder()
                .reporterId(userId)
                .institutionId(institutionId)
                .targetType("post")
                .targetId(postId)
                .reason(reason)
                .status("pending")
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build();

        return reportRepository.save(report);
    }

    // 11. Report Comment
    @Transactional
    public ModerationReport reportComment(UUID userId, UUID institutionId, UUID commentId, String reason) {
        CommunityComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new NoSuchElementException("Community comment not found."));

        ModerationReport report = ModerationReport.builder()
                .reporterId(userId)
                .institutionId(institutionId)
                .targetType("comment")
                .targetId(commentId)
                .reason(reason)
                .status("pending")
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build();

        return reportRepository.save(report);
    }

    // 12. Fetch Moderation Queue Reports (Moderator/Admin)
    public List<ModerationReport> getPendingReports(UUID institutionId) {
        return reportRepository.findAllByInstitutionIdAndStatusOrderByCreatedAtDesc(institutionId, "pending");
    }

    // 13. Resolve Report (Moderator/Admin)
    @Transactional
    public void resolveReport(UUID reportId, UUID moderatorId, UUID institutionId, String action, String reason) {
        ModerationReport report = reportRepository.findById(reportId)
                .orElseThrow(() -> new NoSuchElementException("Report log not found."));

        if (!report.getInstitutionId().equals(institutionId)) {
            throw new IllegalArgumentException("Access Denied: Report does not belong to this institution.");
        }

        // Apply action
        if (action.equalsIgnoreCase("hide_content")) {
            if (report.getTargetType().equals("post")) {
                postRepository.findById(report.getTargetId()).ifPresent(p -> {
                    p.setStatus("hidden");
                    postRepository.save(p);
                });
            } else if (report.getTargetType().equals("comment")) {
                commentRepository.findById(report.getTargetId()).ifPresent(c -> {
                    c.setStatus("hidden");
                    commentRepository.save(c);
                });
            }
        }

        report.setStatus("resolved");
        report.setUpdatedAt(OffsetDateTime.now());
        reportRepository.save(report);

        // Save action log
        ModerationAction modAction = ModerationAction.builder()
                .institutionId(institutionId)
                .moderatorId(moderatorId)
                .reportId(reportId)
                .targetType(report.getTargetType())
                .targetId(report.getTargetId())
                .actionTaken(action.equalsIgnoreCase("hide_content") ? "hide_content" : "delete_content")
                .reason(reason)
                .appliedAt(OffsetDateTime.now())
                .build();
        actionRepository.save(modAction);
    }
}
