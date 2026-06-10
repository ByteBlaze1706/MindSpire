// src/lib/services/recommendation.service.ts
// Recommends wellness articles based on mood histories, clinical scores, and tracks recommendations history.
import { createClient } from '../supabase/server';
import { CMSRepository, ResourceArticle } from '../repositories/cms.repository';
import { WellnessService } from './wellness.service';

export interface RecommendationResult {
  resources: ResourceArticle[];
  reason: string;
  isCrisis: boolean;
}

export class RecommendationService {
  private cmsRepo = new CMSRepository();
  private wellnessService = new WellnessService();

  /**
   * Generates personalized resource recommendations and records the recommendation event.
   */
  async getPersonalizedRecommendations(
    userId: string,
    institutionId: string
  ): Promise<RecommendationResult> {
    const supabase = await createClient();

    // 1. Fetch latest clinical assessment scores
    const { data: assessments } = await supabase
      .from('assessment_results')
      .select('total_score, severity_level, completed_at, assessment_types(name)')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });

    const latestByType: Record<string, { total_score: number; severity_level: string }> = {};
    if (assessments) {
      for (const row of assessments) {
        const rawTypes = (row as any).assessment_types;
        const typeName = Array.isArray(rawTypes) ? rawTypes[0]?.name : rawTypes?.name;
        if (typeName && !latestByType[typeName]) {
          latestByType[typeName] = {
            total_score: row.total_score,
            severity_level: row.severity_level,
          };
        }
      }
    }

    const latestPhq = latestByType['PHQ-9'];
    const latestGad = latestByType['GAD-7'];
    const latestStress = latestByType['Stress Assessment'];
    const latestBurnout = latestByType['Burnout Assessment'];
    const latestWellness = latestByType['Wellness Check'];

    // 2. Fetch latest mood logs
    const { data: moodLogs } = await supabase
      .from('mood_logs')
      .select('descriptor, logged_at')
      .eq('user_id', userId)
      .order('logged_at', { ascending: false })
      .limit(5);

    const moodDescriptors = moodLogs?.map((m) => m.descriptor) || [];
    const latestMood = moodDescriptors[0];

    // 3. Fetch latest journal entries (for sentiment & risk)
    const { data: journalEntries } = await supabase
      .from('journal_entries')
      .select('sentiment_score, risk_level, created_at')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(5);

    const latestJournal = journalEntries?.[0];
    const avgJournalSentiment =
      journalEntries && journalEntries.length > 0
        ? journalEntries.reduce((acc, j) => acc + (j.sentiment_score ?? 0.5), 0) / journalEntries.length
        : 0.7;

    // 4. Calculate overall wellness score
    const wellnessScore = await this.wellnessService.calculateCompoundScore(userId);

    // 5. Check Q9 & Q3 responses on latest PHQ-9
    let hasSelfHarmThoughts = false;
    let hasPoorSleep = false;

    // Fetch latest PHQ-9 result ID for the user
    const { data: latestPhqResult } = await supabase
      .from('assessment_results')
      .select('id')
      .eq('user_id', userId)
      .eq('assessment_type_id', 'd1e2f3a4-1111-1111-1111-111111111111') // PHQ9_ID
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestPhqResult) {
      // Q9 response
      const { data: q9Resp } = await supabase
        .from('assessment_responses')
        .select('selected_value')
        .eq('assessment_result_id', latestPhqResult.id)
        .eq('question_id', 'b1c2d3e4-9999-9999-9999-999999999999')
        .maybeSingle();
      if (q9Resp && q9Resp.selected_value > 0) {
        hasSelfHarmThoughts = true;
      }

      // Q3 response (Trouble sleeping)
      const { data: q3Resp } = await supabase
        .from('assessment_responses')
        .select('selected_value')
        .eq('assessment_result_id', latestPhqResult.id)
        .eq('question_id', 'b1c2d3e4-3333-3333-3333-333333333333')
        .maybeSingle();
      if (q3Resp && q3Resp.selected_value >= 2) {
        hasPoorSleep = true;
      }
    }

    // 6. PRIORITIZATION MATRIX LOGIC
    let targetCategory = 'Mindfulness & Meditation';
    let reason = 'Based on your overall wellness overview, here are some recommended mindfulness exercises.';
    let isCrisis = false;

    if (
      hasSelfHarmThoughts ||
      latestJournal?.risk_level === 'critical' ||
      latestJournal?.risk_level === 'high' ||
      (latestPhq && latestPhq.total_score >= 15) ||
      (latestGad && latestGad.total_score >= 15)
    ) {
      targetCategory = 'Crisis Support';
      isCrisis = true;
      reason = 'Based on critical indicators detected in your assessments or journal entries, we recommend immediate crisis support resources and helpline guidance.';
    } else if ((latestGad && latestGad.total_score >= 10) || (latestStress && latestStress.total_score >= 13) || moodDescriptors.includes('Anxious') || moodDescriptors.includes('Stressed')) {
      targetCategory = 'Anxiety Management';
      const triggers = [];
      if (latestGad && latestGad.total_score >= 10) triggers.push('anxiety assessment');
      if (latestStress && latestStress.total_score >= 13) triggers.push('stress score');
      if (moodDescriptors.includes('Anxious') || moodDescriptors.includes('Stressed')) triggers.push('recent anxious/stressed mood logs');
      reason = `Based on your ${triggers.join(' and ')}, these anxiety-management resources may be helpful.`;
    } else if ((latestPhq && latestPhq.total_score >= 10) || moodDescriptors.includes('Sad') || avgJournalSentiment < 0.45) {
      targetCategory = 'Depression Support';
      const triggers = [];
      if (latestPhq && latestPhq.total_score >= 10) triggers.push('PHQ-9 results');
      if (moodDescriptors.includes('Sad')) triggers.push('sad mood check-ins');
      if (avgJournalSentiment < 0.45) triggers.push('lower journal sentiment scores');
      reason = `Based on your ${triggers.join(' and ')}, these depression support resources and coping tools may help.`;
    } else if ((latestBurnout && latestBurnout.total_score >= 13) || moodDescriptors.includes('Overwhelmed')) {
      targetCategory = 'Burnout Recovery';
      const triggers = [];
      if (latestBurnout && latestBurnout.total_score >= 13) triggers.push('burnout assessment');
      if (moodDescriptors.includes('Overwhelmed')) triggers.push('overwhelmed mood logs');
      reason = `Based on your ${triggers.join(' and ')}, we suggest these burnout recovery and boundary-setting strategies.`;
    } else if (hasPoorSleep || latestMood === 'Exhausted') {
      targetCategory = 'Sleep Improvement';
      const triggers = [];
      if (hasPoorSleep) triggers.push('poor sleep indicators on PHQ-9');
      if (latestMood === 'Exhausted') triggers.push('exhausted mood check-in');
      reason = `Based on your ${triggers.join(' and ')}, we recommend these sleep hygiene and relaxation guides.`;
    } else if (wellnessScore < 60 || (latestWellness && latestWellness.total_score < 10)) {
      targetCategory = 'Mindfulness & Meditation';
      reason = `Based on your compound wellness score of ${wellnessScore} indicating room for balance, we recommend daily mindfulness training.`;
    } else if (avgJournalSentiment < 0.6) {
      targetCategory = 'Self-Esteem & Confidence';
      reason = 'Based on constructive self-talk patterns in your journal logs, these self-esteem and confidence building resources may help.';
    } else {
      targetCategory = 'Mindfulness & Meditation';
      reason = 'Your wellness indicators look balanced! We recommend these mindfulness practices to maintain your positive momentum.';
    }

    // 7. Fetch matching articles from resources table
    const { data: articles, error } = await supabase
      .from('resources')
      .select('*')
      .eq('institution_id', institutionId)
      .eq('category', targetCategory)
      .is('deleted_at', null)
      .eq('status', 'published')
      .limit(4);

    let recommended = (articles || []) as ResourceArticle[];

    // Fallback: If no matches in target category, return general resources
    if (recommended.length === 0) {
      const fallbackArticles = await this.cmsRepo.getResources(institutionId);
      recommended = fallbackArticles.slice(0, 4);
    }

    // 8. Track recommendation event history in database
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

    return {
      resources: recommended,
      reason,
      isCrisis
    };
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
