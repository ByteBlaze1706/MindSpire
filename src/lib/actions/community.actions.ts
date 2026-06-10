// src/lib/actions/community.actions.ts
'use server';

import { createClient } from '../supabase/server';
import { CommunityRepository, CommunityPost, CommunityComment, ModerationReport, ModerationAppeal } from '../repositories/community.repository';
export type { CommunityPost, CommunityComment, ModerationReport, ModerationAppeal };
import { CrisisDetectorService } from '../services/crisis-detector.service';
import { revalidatePath } from 'next/cache';

const communityRepo = new CommunityRepository();
const crisisDetector = new CrisisDetectorService();

// PII Detection Regular Expressions
const EMAIL_REGEX = /[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}/;
const PHONE_REGEX = /(\+?\d{1,4}[-.\s]?)?\(?\d{3,4}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b\d{10}\b/;
const STUDENT_ID_REGEX = /\b(roll[-_\s]?no|student[-_\s]?id|rollno|id[-_\s]?no)\b\s*[:=-]?\s*\w+|\b[a-zA-Z]{2,4}\d{4,8}\b|\b\d{8,12}\b/i;

interface ValidationResult {
  isClean: boolean;
  piiType?: 'email' | 'phone' | 'student_id';
}

function scanForPII(text: string): ValidationResult {
  if (EMAIL_REGEX.test(text)) return { isClean: false, piiType: 'email' };
  if (PHONE_REGEX.test(text)) return { isClean: false, piiType: 'phone' };
  if (STUDENT_ID_REGEX.test(text)) return { isClean: false, piiType: 'student_id' };
  return { isClean: true };
}

/**
 * Creates a community post, performing PII block and Crisis checks.
 */
export async function createPostAction(
  tenantSubdomain: string,
  title: string,
  content: string,
  category: CommunityPost['category'],
  isAnonymous: boolean
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized: Session context missing.' };
  }

  // 1. Resolve institution_id
  const { data: profile } = await supabase
    .from('users')
    .select('institution_id')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return { success: false, error: 'User profile not found.' };
  }

  // 2. Scan for PII (Proactive warning check)
  const titlePii = scanForPII(title);
  const contentPii = scanForPII(content);
  if (!titlePii.isClean || !contentPii.isClean) {
    const type = titlePii.piiType || contentPii.piiType;
    return {
      success: false,
      error: 'PII_DETECTED',
      message: `Safety Block: A potential ${type} was detected. For your safety, do not share personal information.`,
    };
  }

  // 3. Scan for Crisis Language
  const crisisTitle = crisisDetector.detectCrisis(title);
  const crisisContent = crisisDetector.detectCrisis(content);
  const isCrisisTriggered = crisisTitle || crisisContent;

  try {
    // 4. Create Post
    const postId = await communityRepo.createPost(
      user.id,
      profile.institution_id,
      title,
      content,
      category,
      isAnonymous
    );

    // 5. Log crisis alert in background if detected (without removing post)
    if (isCrisisTriggered) {
      await crisisDetector.handleCrisisTrigger(user.id, profile.institution_id, 'community', `${title}\n${content}`);
    }

    revalidatePath('/community');
    return { success: true, postId, crisisTriggered: isCrisisTriggered };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Edits a community post.
 */
export async function editPostAction(
  tenantSubdomain: string,
  postId: string,
  title: string,
  content: string,
  category: CommunityPost['category']
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Unauthorized.' };

  // Scan PII
  if (!scanForPII(title).isClean || !scanForPII(content).isClean) {
    return { success: false, error: 'PII_DETECTED', message: 'Safety Block: PII detected in changes.' };
  }

  try {
    await communityRepo.updatePost(postId, user.id, title, content, category);
    revalidatePath('/community');
    revalidatePath(`/community/post/${postId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Soft deletes a community post.
 */
export async function deletePostAction(tenantSubdomain: string, postId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Unauthorized.' };

  try {
    await communityRepo.softDeletePost(postId, user.id);
    revalidatePath('/community');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Creates a comment, performing safety checks.
 */
export async function createCommentAction(
  tenantSubdomain: string,
  postId: string,
  content: string,
  isAnonymous: boolean,
  parentId: string | null = null
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Unauthorized.' };

  const { data: profile } = await supabase
    .from('users')
    .select('institution_id')
    .eq('id', user.id)
    .single();

  if (!profile) return { success: false, error: 'Profile not found.' };

  // Scan PII
  const piiScan = scanForPII(content);
  if (!piiScan.isClean) {
    return {
      success: false,
      error: 'PII_DETECTED',
      message: `Safety Block: A potential ${piiScan.piiType} was detected. For your safety, do not share personal information.`,
    };
  }

  const isCrisisTriggered = crisisDetector.detectCrisis(content);

  try {
    const commentId = await communityRepo.createComment(
      user.id,
      profile.institution_id,
      postId,
      content,
      isAnonymous,
      parentId
    );

    if (isCrisisTriggered) {
      await crisisDetector.handleCrisisTrigger(user.id, profile.institution_id, 'community', content);
    }

    // Notify post author of new comment (if comment is by someone else)
    const { data: post } = await supabase
      .from('community_posts')
      .select('user_id, title')
      .eq('id', postId)
      .single();

    if (post && post.user_id !== user.id) {
      await supabase.from('notifications').insert({
        institution_id: profile.institution_id,
        user_id: post.user_id,
        type: 'community_reply',
        title: 'New Reply on Your Thread',
        body: `Someone replied to your post "${post.title.slice(0, 30)}..."`,
        is_read: false,
      });
    }

    revalidatePath(`/community/post/${postId}`);
    return { success: true, commentId, crisisTriggered: isCrisisTriggered };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Soft deletes a comment.
 */
export async function deleteCommentAction(tenantSubdomain: string, postId: string, commentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Unauthorized.' };

  try {
    await communityRepo.softDeleteComment(commentId, user.id);
    revalidatePath(`/community/post/${postId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Toggles reaction.
 */
export async function toggleReactionAction(
  tenantSubdomain: string,
  postId: string,
  targetType: 'post' | 'comment',
  targetId: string,
  reactionType: 'support' | 'helpful' | 'relatable' | 'encouraging'
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Unauthorized.' };

  try {
    const isAdded = await communityRepo.toggleReaction(user.id, targetType, targetId, reactionType);
    revalidatePath(`/community/post/${postId}`);
    revalidatePath('/community');
    return { success: true, reacted: isAdded };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Reports content.
 */
export async function reportContentAction(
  tenantSubdomain: string,
  postId: string,
  targetType: 'post' | 'comment',
  targetId: string,
  reason: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Unauthorized.' };

  const { data: profile } = await supabase.from('users').select('institution_id').eq('id', user.id).single();
  if (!profile) return { success: false, error: 'Profile not found.' };

  try {
    await communityRepo.createReport(user.id, profile.institution_id, targetType, targetId, reason);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Submits appeal for a restriction.
 */
export async function submitAppealAction(tenantSubdomain: string, actionId: string | null, reason: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Unauthorized.' };

  const { data: profile } = await supabase.from('users').select('institution_id').eq('id', user.id).single();
  if (!profile) return { success: false, error: 'Profile not found.' };

  try {
    await communityRepo.submitAppeal(user.id, profile.institution_id, actionId, reason);
    revalidatePath('/moderation');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Resolves moderation report.
 */
export async function resolveReportAction(
  tenantSubdomain: string,
  reportId: string,
  action: 'warn_user' | 'hide_content' | 'delete_content' | 'ban_user' | 'temporary_restriction' | 'permanent_restriction',
  reason: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Unauthorized.' };

  const { data: profile } = await supabase.from('users').select('role, institution_id').eq('id', user.id).single();
  if (!profile || !['moderator', 'inst_admin', 'super_admin'].includes(profile.role)) {
    return { success: false, error: 'Access Denied.' };
  }

  try {
    await communityRepo.resolveReport(reportId, user.id, profile.institution_id, action, reason);
    revalidatePath('/moderation');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Resolves appeal.
 */
export async function resolveAppealAction(
  tenantSubdomain: string,
  appealId: string,
  status: 'resolved' | 'rejected',
  notes: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Unauthorized.' };

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (!profile || !['moderator', 'inst_admin', 'super_admin'].includes(profile.role)) {
    return { success: false, error: 'Access Denied.' };
  }

  try {
    await communityRepo.resolveAppeal(appealId, status, notes);
    revalidatePath('/moderation');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
