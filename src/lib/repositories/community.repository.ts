// src/lib/repositories/community.repository.ts
// Handles database logic for anonymous community posts, comments, reactions, moderation, and reputation.
import { createClient } from '../supabase/server';

export interface CommunityPost {
  id: string;
  institution_id: string;
  user_id: string;
  title: string;
  content: string;
  category: 'Academic Stress' | 'Exam Anxiety' | 'Relationships' | 'Motivation' | 'Career' | 'Wellness' | 'General Support';
  is_anonymous: boolean;
  status: 'pending' | 'approved' | 'flagged' | 'hidden';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Joins
  pseudonym?: string;
  avatar_config?: Record<string, any>;
  comment_count?: number;
  reaction_counts?: Record<string, number>;
  user_reacted?: Record<string, boolean>;
  trending_score?: number;
}

export interface CommunityComment {
  id: string;
  institution_id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  is_anonymous: boolean;
  status: 'pending' | 'approved' | 'flagged' | 'hidden';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Joins
  pseudonym?: string;
  avatar_config?: Record<string, any>;
  reaction_counts?: Record<string, number>;
  user_reacted?: Record<string, boolean>;
}

export interface ModerationReport {
  id: string;
  institution_id: string;
  reporter_id: string;
  target_type: 'post' | 'comment';
  target_id: string;
  reason: string;
  status: 'pending' | 'under_review' | 'resolved' | 'dismissed';
  created_at: string;
  updated_at: string;
  // Joins
  reporter_pseudonym?: string;
  target_content?: string;
}

export interface ModerationAction {
  id: string;
  institution_id: string;
  moderator_id: string;
  report_id: string | null;
  target_type: 'post' | 'comment' | 'user';
  target_id: string;
  action_taken: 'warn_user' | 'hide_content' | 'delete_content' | 'ban_user' | 'temporary_restriction' | 'permanent_restriction';
  reason: string;
  applied_at: string;
}

export interface ModerationAppeal {
  id: string;
  institution_id: string;
  user_id: string;
  action_id: string | null;
  reason: string;
  status: 'pending' | 'resolved' | 'rejected';
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
}

export class CommunityRepository {
  /**
   * Creates a community post.
   */
  async createPost(
    userId: string,
    institutionId: string,
    title: string,
    content: string,
    category: CommunityPost['category'],
    isAnonymous: boolean
  ): Promise<string> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('community_posts')
      .insert({
        user_id: userId,
        institution_id: institutionId,
        title,
        content,
        category,
        is_anonymous: isAnonymous,
        status: 'approved',
      })
      .select('id')
      .single();

    if (error || !data) {
      throw new Error(`Failed to create post: ${error?.message}`);
    }

    // Increment positive contributions on post creation
    await this.adjustReputation(userId, 'positive_contributions', 1);

    return data.id;
  }

  /**
   * Retrieves posts and joins details, applying the trending score formula:
   * Score = (Reactions Count * 0.40) + (Comment Count * 0.40) + (Recency Score * 0.20)
   */
  async getPosts(
    institutionId: string,
    userId: string,
    filter: 'recent' | 'trending',
    category?: string,
    search?: string
  ): Promise<CommunityPost[]> {
    const supabase = await createClient();

    // 1. Fetch posts, comments count, reactions count and user profiles
    let query = supabase
      .from('community_posts')
      .select(`
        *,
        users!inner(
          email,
          role,
          anonymous_profiles(pseudonym, avatar_config, helpful_score, report_count, positive_contributions)
        ),
        community_comments(id, deleted_at, status),
        reactions(id, reaction_type, user_id)
      `)
      .eq('institution_id', institutionId)
      .eq('status', 'approved')
      .is('deleted_at', null);

    if (category && category !== 'All') {
      query = query.eq('category', category);
    }

    if (search && search.trim().length > 0) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error || !data) {
      return [];
    }

    // 2. Parse data and compute trending score in-memory
    const parsedPosts: CommunityPost[] = data.map((row: any) => {
      const isAnon = row.is_anonymous;
      const anonProfile = row.users?.anonymous_profiles?.[0];

      // Assemble counts
      const activeComments = (row.community_comments || []).filter(
        (c: any) => c.deleted_at === null && c.status === 'approved'
      );
      const commentsCount = activeComments.length;

      const reactions = row.reactions || [];
      const reactionsCount = reactions.length;

      // Group reactions by type and check if current user reacted
      const reaction_counts: Record<string, number> = {
        support: 0,
        helpful: 0,
        relatable: 0,
        encouraging: 0,
      };
      const user_reacted: Record<string, boolean> = {
        support: false,
        helpful: false,
        relatable: false,
        encouraging: false,
      };

      reactions.forEach((r: any) => {
        if (reaction_counts[r.reaction_type] !== undefined) {
          reaction_counts[r.reaction_type]++;
        }
        if (r.user_id === userId) {
          user_reacted[r.reaction_type] = true;
        }
      });

      // Recency Score = 1 / (1 + HoursElapsed^1.5)
      const hoursElapsed = (Date.now() - new Date(row.created_at).getTime()) / (1000 * 60 * 60);
      const recencyScore = 1 / (1 + Math.pow(hoursElapsed, 1.5));

      // Calculate trending score
      const trending_score = (reactionsCount * 0.4) + (commentsCount * 0.4) + (recencyScore * 0.2);

      return {
        id: row.id,
        institution_id: row.institution_id,
        user_id: row.user_id,
        title: row.title,
        content: row.content,
        category: row.category,
        is_anonymous: isAnon,
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at,
        deleted_at: row.deleted_at,
        pseudonym: isAnon ? (anonProfile?.pseudonym || 'Anonymous Peer') : 'Campus Staff Member',
        avatar_config: isAnon ? (anonProfile?.avatar_config || {}) : {},
        comment_count: commentsCount,
        reaction_counts,
        user_reacted,
        trending_score,
      };
    });

    // 3. Sort posts based on selected filter
    if (filter === 'trending') {
      return parsedPosts.sort((a, b) => (b.trending_score || 0) - (a.trending_score || 0));
    } else {
      return parsedPosts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  }

  /**
   * Fetches single post.
   */
  async getPostById(postId: string, userId: string): Promise<CommunityPost | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('community_posts')
      .select(`
        *,
        users(
          role,
          anonymous_profiles(pseudonym, avatar_config, helpful_score, report_count, positive_contributions)
        ),
        reactions(id, reaction_type, user_id)
      `)
      .eq('id', postId)
      .is('deleted_at', null)
      .single();

    if (error || !data) return null;

    const isAnon = data.is_anonymous;
    const anonProfile = data.users?.anonymous_profiles?.[0];

    const reactions = data.reactions || [];
    const reaction_counts: Record<string, number> = { support: 0, helpful: 0, relatable: 0, encouraging: 0 };
    const user_reacted: Record<string, boolean> = { support: false, helpful: false, relatable: false, encouraging: false };

    reactions.forEach((r: any) => {
      if (reaction_counts[r.reaction_type] !== undefined) reaction_counts[r.reaction_type]++;
      if (r.user_id === userId) user_reacted[r.reaction_type] = true;
    });

    return {
      id: data.id,
      institution_id: data.institution_id,
      user_id: data.user_id,
      title: data.title,
      content: data.content,
      category: data.category,
      is_anonymous: isAnon,
      status: data.status,
      created_at: data.created_at,
      updated_at: data.updated_at,
      deleted_at: data.deleted_at,
      pseudonym: isAnon ? (anonProfile?.pseudonym || 'Anonymous Peer') : 'Campus Staff Member',
      avatar_config: isAnon ? (anonProfile?.avatar_config || {}) : {},
      reaction_counts,
      user_reacted,
    };
  }

  /**
   * Updates a community post.
   */
  async updatePost(postId: string, userId: string, title: string, content: string, category: CommunityPost['category']): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('community_posts')
      .update({ title, content, category })
      .eq('id', postId)
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
  }

  /**
   * Soft deletes a post.
   */
  async softDeletePost(postId: string, userId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('community_posts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', postId)
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
  }

  /**
   * Comments
   */
  async createComment(
    userId: string,
    institutionId: string,
    postId: string,
    content: string,
    isAnonymous: boolean,
    parentId: string | null = null
  ): Promise<string> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('community_comments')
      .insert({
        user_id: userId,
        institution_id: institutionId,
        post_id: postId,
        parent_id: parentId,
        content,
        is_anonymous: isAnonymous,
        status: 'approved',
      })
      .select('id')
      .single();

    if (error || !data) {
      throw new Error(`Failed to create comment: ${error?.message}`);
    }

    await this.adjustReputation(userId, 'positive_contributions', 1);

    return data.id;
  }

  /**
   * Fetches comment list for a post.
   */
  async getComments(postId: string, userId: string): Promise<CommunityComment[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('community_comments')
      .select(`
        *,
        users(
          role,
          anonymous_profiles(pseudonym, avatar_config)
        ),
        reactions(id, reaction_type, user_id)
      `)
      .eq('post_id', postId)
      .eq('status', 'approved')
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error || !data) return [];

    return data.map((row: any) => {
      const isAnon = row.is_anonymous;
      const anonProfile = row.users?.anonymous_profiles?.[0];
      const reactions = row.reactions || [];

      const reaction_counts: Record<string, number> = { support: 0, helpful: 0, relatable: 0, encouraging: 0 };
      const user_reacted: Record<string, boolean> = { support: false, helpful: false, relatable: false, encouraging: false };

      reactions.forEach((r: any) => {
        if (reaction_counts[r.reaction_type] !== undefined) reaction_counts[r.reaction_type]++;
        if (r.user_id === userId) user_reacted[r.reaction_type] = true;
      });

      return {
        id: row.id,
        institution_id: row.institution_id,
        post_id: row.post_id,
        user_id: row.user_id,
        parent_id: row.parent_id,
        content: row.content,
        is_anonymous: isAnon,
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at,
        deleted_at: row.deleted_at,
        pseudonym: isAnon ? (anonProfile?.pseudonym || 'Anonymous Peer') : 'Campus Staff Member',
        avatar_config: isAnon ? (anonProfile?.avatar_config || {}) : {},
        reaction_counts,
        user_reacted,
      };
    });
  }

  /**
   * Soft deletes a comment.
   */
  async softDeleteComment(commentId: string, userId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('community_comments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', commentId)
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
  }

  /**
   * Reactions Toggle logic.
   */
  async toggleReaction(
    userId: string,
    targetType: 'post' | 'comment',
    targetId: string,
    reactionType: 'support' | 'helpful' | 'relatable' | 'encouraging'
  ): Promise<boolean> {
    const supabase = await createClient();

    const column = targetType === 'post' ? 'post_id' : 'comment_id';

    // 1. Check if reaction exists
    const { data: existing, error: fetchErr } = await supabase
      .from('reactions')
      .select('id')
      .eq('user_id', userId)
      .eq(column, targetId)
      .eq('reaction_type', reactionType)
      .maybeSingle();

    if (fetchErr) throw new Error(fetchErr.message);

    // 2. Fetch author of the content to update their reputation
    let authorId: string | null = null;
    if (targetType === 'post') {
      const { data } = await supabase.from('community_posts').select('user_id').eq('id', targetId).single();
      authorId = data?.user_id || null;
    } else {
      const { data } = await supabase.from('community_comments').select('user_id').eq('id', targetId).single();
      authorId = data?.user_id || null;
    }

    if (existing) {
      // Delete reaction
      await supabase.from('reactions').delete().eq('id', existing.id);
      
      // Decrease reputation on reaction removal
      if (authorId) {
        if (reactionType === 'helpful') {
          await this.adjustReputation(authorId, 'helpful_score', -1);
        }
      }
      return false; // Reaction removed
    } else {
      // Add reaction
      await supabase.from('reactions').insert({
        user_id: userId,
        [column]: targetId,
        reaction_type: reactionType,
      });

      // Increase reputation on reaction addition
      if (authorId) {
        if (reactionType === 'helpful') {
          await this.adjustReputation(authorId, 'helpful_score', 1);
        }
      }
      return true; // Reaction added
    }
  }

  /**
   * Report content.
   */
  async createReport(
    reporterId: string,
    institutionId: string,
    targetType: 'post' | 'comment',
    targetId: string,
    reason: string
  ): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('moderation_reports')
      .insert({
        reporter_id: reporterId,
        institution_id: institutionId,
        target_type: targetType,
        target_id: targetId,
        reason,
        status: 'pending',
      });

    if (error) throw new Error(error.message);

    // Fetch author of the reported content to increment report counts
    let authorId: string | null = null;
    if (targetType === 'post') {
      const { data } = await supabase.from('community_posts').select('user_id').eq('id', targetId).single();
      authorId = data?.user_id || null;
    } else {
      const { data } = await supabase.from('community_comments').select('user_id').eq('id', targetId).single();
      authorId = data?.user_id || null;
    }

    if (authorId) {
      await this.adjustReputation(authorId, 'report_count', 1);
    }
  }

  /**
   * Moderation Queue.
   */
  async getModerationQueue(institutionId: string): Promise<ModerationReport[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('moderation_reports')
      .select('*')
      .eq('institution_id', institutionId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    // For each report, grab the raw content from the respective tables
    const reportsWithContent = await Promise.all(
      data.map(async (rep: any) => {
        let contentSnippet = '[Content Deleted or Missing]';
        if (rep.target_type === 'post') {
          const { data: p } = await supabase.from('community_posts').select('title, content').eq('id', rep.target_id).maybeSingle();
          if (p) contentSnippet = `Post: ${p.title} - ${p.content.slice(0, 100)}`;
        } else {
          const { data: c } = await supabase.from('community_comments').select('content').eq('id', rep.target_id).maybeSingle();
          if (c) contentSnippet = `Comment: ${c.content.slice(0, 100)}`;
        }
        return {
          ...rep,
          target_content: contentSnippet,
        };
      })
    );

    return reportsWithContent;
  }

  /**
   * Resolve Moderation Report & apply actions.
   */
  async resolveReport(
    reportId: string,
    moderatorId: string,
    institutionId: string,
    action: ModerationAction['action_taken'],
    reason: string
  ): Promise<void> {
    const supabase = await createClient();

    // 1. Log moderation action
    const { data: report } = await supabase.from('moderation_reports').select('*').eq('id', reportId).single();
    if (!report) throw new Error('Report not found');

    const { error: actionErr } = await supabase.from('moderation_actions').insert({
      institution_id: institutionId,
      moderator_id: moderatorId,
      report_id: reportId,
      target_type: report.target_type,
      target_id: report.target_id,
      action_taken: action,
      reason,
    });

    if (actionErr) throw new Error(actionErr.message);

    // 2. Perform the actual action (e.g. hide content)
    if (action === 'hide_content' || action === 'delete_content') {
      if (report.target_type === 'post') {
        await supabase.from('community_posts').update({ status: 'hidden' }).eq('id', report.target_id);
      } else {
        await supabase.from('community_comments').update({ status: 'hidden' }).eq('id', report.target_id);
      }
    }

    // 3. Mark report resolved
    await supabase.from('moderation_reports').update({ status: 'resolved' }).eq('id', reportId);
  }

  /**
   * Appeals CRUD
   */
  async submitAppeal(userId: string, institutionId: string, actionId: string | null, reason: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('moderation_appeals')
      .insert({
        user_id: userId,
        institution_id: institutionId,
        action_id: actionId,
        reason,
        status: 'pending',
      });
    if (error) throw new Error(error.message);
  }

  async getAppeals(institutionId: string): Promise<ModerationAppeal[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('moderation_appeals')
      .select('*')
      .eq('institution_id', institutionId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data as ModerationAppeal[];
  }

  async resolveAppeal(appealId: string, status: 'resolved' | 'rejected', resolutionNotes: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('moderation_appeals')
      .update({ status, resolution_notes: resolutionNotes, updated_at: new Date().toISOString() })
      .eq('id', appealId);

    if (error) throw new Error(error.message);
  }

  /**
   * Adjust anonymous profile metrics helper.
   */
  private async adjustReputation(userId: string, field: 'helpful_score' | 'report_count' | 'positive_contributions', amount: number): Promise<void> {
    const supabase = await createClient();

    // 1. Fetch current scores
    const { data, error } = await supabase
      .from('anonymous_profiles')
      .select('helpful_score, report_count, positive_contributions')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return;

    const newValue = Math.max(0, (data[field] || 0) + amount);

    await supabase
      .from('anonymous_profiles')
      .update({ [field]: newValue })
      .eq('user_id', userId);
  }
}
