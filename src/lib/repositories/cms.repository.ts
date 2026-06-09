// src/lib/repositories/cms.repository.ts
// Handles CMS data access operations for articles, bookmarks, views, recommendations, and announcements.
import { createClient } from '../supabase/server';

export interface ResourceArticle {
  id: string;
  institution_id: string;
  title: string;
  content_markdown: string;
  category: string;
  status: string;
  translations: Record<string, any>;
  created_at: string;
  deleted_at: string | null;
}

export interface Announcement {
  id: string;
  institution_id: string;
  title: string;
  content: string;
  target_audience: string;
  translations: Record<string, any>;
  created_at: string;
}

export class CMSRepository {
  /**
   * Fetches published resources.
   */
  async getResources(institutionId: string): Promise<ResourceArticle[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .eq('institution_id', institutionId)
      .is('deleted_at', null)
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data as ResourceArticle[];
  }

  /**
   * Toggles bookmark state for a resource.
   */
  async toggleBookmark(userId: string, resourceId: string): Promise<boolean> {
    const supabase = await createClient();
    
    // Check if bookmark exists
    const { data, error } = await supabase
      .from('resource_bookmarks')
      .select('id')
      .eq('user_id', userId)
      .eq('resource_id', resourceId)
      .maybeSingle();

    if (error) throw new Error(error.message);

    if (data) {
      // Remove bookmark
      await supabase
        .from('resource_bookmarks')
        .delete()
        .eq('id', data.id);
      return false; // Not bookmarked now
    } else {
      // Add bookmark
      await supabase
        .from('resource_bookmarks')
        .insert({ user_id: userId, resource_id: resourceId });
      return true; // Bookmarked now
    }
  }

  /**
   * Fetches bookmarked resources.
   */
  async getBookmarkedResources(userId: string): Promise<ResourceArticle[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('resource_bookmarks')
      .select('resources(*)')
      .eq('user_id', userId);

    if (error || !data) return [];
    return data.map((d: any) => d.resources).filter(Boolean) as ResourceArticle[];
  }

  /**
   * Logs a resource view history.
   */
  async logResourceView(userId: string, resourceId: string): Promise<void> {
    const supabase = await createClient();
    await supabase
      .from('resource_views')
      .insert({ user_id: userId, resource_id: resourceId });
  }

  /**
   * Gets recently viewed resources (limit 5).
   */
  async getRecentlyViewed(userId: string): Promise<ResourceArticle[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('resource_views')
      .select('resources(*)')
      .eq('user_id', userId)
      .order('viewed_at', { ascending: false })
      .limit(5);

    if (error || !data) return [];
    
    // De-duplicate recently viewed articles
    const uniqueResources: ResourceArticle[] = [];
    const seenIds = new Set<string>();

    data.forEach((d: any) => {
      if (d.resources && !seenIds.has(d.resources.id)) {
        seenIds.add(d.resources.id);
        uniqueResources.push(d.resources as ResourceArticle);
      }
    });

    return uniqueResources;
  }

  /**
   * Recommends articles based on the student's recent mood descriptor tags.
   */
  async getRecommendedResources(userId: string, institutionId: string): Promise<ResourceArticle[]> {
    const supabase = await createClient();

    // 1. Fetch latest mood descriptor
    const { data: latestMood } = await supabase
      .from('mood_logs')
      .select('descriptor')
      .eq('user_id', userId)
      .order('logged_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const currentMood = latestMood?.descriptor || 'Neutral';
    let targetCategory = 'Wellness & Balance';

    if (currentMood === 'Anxious') targetCategory = 'Anxiety & Stress Management';
    if (currentMood === 'Stressed') targetCategory = 'Anxiety & Stress Management';
    if (currentMood === 'Sad') targetCategory = 'Depression & Mood Support';
    if (currentMood === 'Exhausted') targetCategory = 'Sleep & Energy Rest';

    // 2. Fetch matching resources
    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .eq('institution_id', institutionId)
      .eq('category', targetCategory)
      .is('deleted_at', null)
      .eq('status', 'published')
      .limit(3);

    if (error || !data || data.length === 0) {
      // Fallback: Return any 3 resources
      return this.getResources(institutionId).then((r) => r.slice(0, 3));
    }

    return data as ResourceArticle[];
  }

  /**
   * Retrieves active announcements.
   */
  async getAnnouncements(institutionId: string, role: string): Promise<Announcement[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('institution_id', institutionId)
      .or(`target_audience.eq.all,target_audience.eq.${role}`)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data as Announcement[];
  }
}
