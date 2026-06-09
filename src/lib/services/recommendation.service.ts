// src/lib/services/recommendation.service.ts
// Recommends wellness articles based on mood histories, clinical scores, and tracks recommendations history.
import { createClient } from '../supabase/server';
import { CMSRepository, ResourceArticle } from '../repositories/cms.repository';

export class RecommendationService {
  private cmsRepo = new CMSRepository();

  /**
   * Generates personalized resource recommendations and records the recommendation event.
   */
  async getPersonalizedRecommendations(
    userId: string,
    institutionId: string
  ): Promise<ResourceArticle[]> {
    const supabase = await createClient();

    // 1. Fetch latest clinical assessment score
    const { data: latestAssessment } = await supabase
      .from('assessment_results')
      .select('total_score, severity_level, assessment_types(name)')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle() as any;

    // 2. Fetch latest mood check-in descriptor
    const { data: latestMood } = await supabase
      .from('mood_logs')
      .select('descriptor')
      .eq('user_id', userId)
      .order('logged_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let targetCategory = 'Wellness & Balance';
    let reason = 'Default recommendation based on general wellness.';

    // 3. Determine target category from clinical assessments or mood check-ins
    const hasHighAssessment = latestAssessment && latestAssessment.total_score >= 10;

    if (hasHighAssessment) {
      const scaleName = latestAssessment.assessment_types?.name || 'Scale';
      reason = `Clinical trigger: score of ${latestAssessment.total_score} on ${scaleName} (${latestAssessment.severity_level})`;
      
      if (scaleName.toLowerCase().includes('gad')) {
        targetCategory = 'Anxiety & Stress Management';
      } else {
        targetCategory = 'Depression & Mood Support';
      }
    } else if (latestMood?.descriptor) {
      const mood = latestMood.descriptor;
      reason = `Mood trigger: check-in logged as "${mood}"`;
      
      if (mood === 'Anxious' || mood === 'Stressed') {
        targetCategory = 'Anxiety & Stress Management';
      } else if (mood === 'Sad') {
        targetCategory = 'Depression & Mood Support';
      } else if (mood === 'Exhausted') {
        targetCategory = 'Sleep & Energy Rest';
      } else {
        targetCategory = 'Wellness & Balance';
      }
    }

    // 4. Fetch matching articles from resources table
    const { data: articles, error } = await supabase
      .from('resources')
      .select('*')
      .eq('institution_id', institutionId)
      .eq('category', targetCategory)
      .is('deleted_at', null)
      .eq('status', 'published')
      .limit(3);

    let recommended = (articles || []) as ResourceArticle[];

    // Fallback: If no matches, return general resources
    if (recommended.length === 0) {
      const fallbackArticles = await this.cmsRepo.getResources(institutionId);
      recommended = fallbackArticles.slice(0, 3);
      reason = 'General recommendation fallback.';
    }

    // 5. Track recommendation event history in database
    if (recommended.length > 0) {
      const historyPayload = recommended.map((art) => ({
        user_id: userId,
        resource_id: art.id,
        recommended_reason: reason,
      }));

      // Avoid duplication if recommended in the last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      for (const rec of historyPayload) {
        const { data: existing } = await supabase
          .from('resource_recommendation_history')
          .select('id')
          .eq('user_id', userId)
          .eq('resource_id', rec.resource_id)
          .gt('created_at', oneHourAgo)
          .maybeSingle();

        if (!existing) {
          await supabase.from('resource_recommendation_history').insert(rec);
        }
      }
    }

    return recommended;
  }

  /**
   * Fetches recommendation history for a user (limit 20).
   */
  async getRecommendationHistory(userId: string): Promise<{
    id: string;
    recommended_reason: string;
    created_at: string;
    resource: ResourceArticle;
  }[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('resource_recommendation_history')
      .select('*, resource:resources(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error || !data) return [];
    
    return data.map((d: any) => ({
      id: d.id,
      recommended_reason: d.recommended_reason,
      created_at: d.created_at,
      resource: d.resource as ResourceArticle,
    })).filter((d) => d.resource !== null);
  }
}
