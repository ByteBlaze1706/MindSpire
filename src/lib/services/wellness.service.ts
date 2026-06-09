// src/lib/services/wellness.service.ts
// Domain service calculating user wellness scores dynamically based on the revised formula.
import { MoodRepository } from '../repositories/mood.repository';
import { AssessmentRepository } from '../repositories/assessment.repository';
import { createClient } from '../supabase/server';

export class WellnessService {
  private moodRepo = new MoodRepository();
  private assessRepo = new AssessmentRepository();

  /**
   * Calculates a compound wellness score (0 - 100).
   * Formula:
   * - Mood Trends = 40%
   * - PHQ-9 = 20%
   * - GAD-7 = 20%
   * - Engagement Consistency = 20%
   */
  async calculateCompoundScore(userId: string): Promise<number> {
    // 1. Mood Component (40% weight)
    const moodAvg = await this.moodRepo.get7DayAverage(userId);
    const moodScore = moodAvg > 0 ? (moodAvg / 5) * 100 : 70; // Default baseline if no logs

    // 2. Clinical Assessments (20% PHQ-9, 20% GAD-7)
    const history = await this.assessRepo.getResultsHistory(userId);
    let phqScore = 75; // Default baseline
    let gadScore = 75; // Default baseline

    if (history.length > 0) {
      const latestPHQ = history.find((h) => h.assessment_name === 'PHQ-9');
      const latestGAD = history.find((h) => h.assessment_name === 'GAD-7');

      if (latestPHQ) {
        phqScore = Math.max(0, 100 - (latestPHQ.total_score / 27) * 100);
      }
      if (latestGAD) {
        gadScore = Math.max(0, 100 - (latestGAD.total_score / 21) * 100);
      }
    }

    // 3. Engagement Consistency (20% weight)
    // Counts unique days of logging (mood entries or assessment submissions) in the past 7 days
    const supabase = await createClient();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Fetch mood dates
    const { data: moodLogs } = await supabase
      .from('mood_logs')
      .select('logged_at')
      .eq('user_id', userId)
      .gte('logged_at', oneWeekAgo.toISOString());

    // Fetch assessment dates
    const { data: assessmentLogs } = await supabase
      .from('assessment_results')
      .select('completed_at')
      .eq('user_id', userId)
      .gte('completed_at', oneWeekAgo.toISOString());

    const activeDays = new Set<string>();

    if (moodLogs) {
      moodLogs.forEach((l) => activeDays.add(new Date(l.logged_at).toISOString().split('T')[0]));
    }
    if (assessmentLogs) {
      assessmentLogs.forEach((l) => activeDays.add(new Date(l.completed_at).toISOString().split('T')[0]));
    }

    const uniqueDaysCount = activeDays.size;
    const engagementScore = (uniqueDaysCount / 7) * 100;

    // Weighted aggregation
    const compound =
      moodScore * 0.4 +
      phqScore * 0.2 +
      gadScore * 0.2 +
      engagementScore * 0.2;

    return Math.round(compound);
  }
}
