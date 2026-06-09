// src/lib/repositories/mood.repository.ts
// Handles database data access for student daily mood entries with qualitative descriptors and streak tracking.
import { createClient } from '../supabase/server';

export type MoodDescriptor = 'Happy' | 'Calm' | 'Motivated' | 'Neutral' | 'Stressed' | 'Anxious' | 'Exhausted' | 'Sad';

export const MOOD_SCORE_MAP: Record<MoodDescriptor, number> = {
  Happy: 5,
  Calm: 5,
  Motivated: 4,
  Neutral: 3,
  Stressed: 2,
  Anxious: 2,
  Exhausted: 1,
  Sad: 1,
};

export interface MoodLog {
  id: string;
  institution_id: string;
  user_id: string;
  score: number;
  descriptor: MoodDescriptor;
  tags: string[];
  notes: string | null;
  logged_at: string;
}

export class MoodRepository {
  /**
   * Logs a new mood check-in.
   */
  async logMood(log: Omit<MoodLog, 'id' | 'logged_at' | 'score'>): Promise<MoodLog> {
    const score = MOOD_SCORE_MAP[log.descriptor];
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('mood_logs')
      .insert({
        ...log,
        score,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Mood logging failed: ${error?.message}`);
    }

    return data as MoodLog;
  }

  /**
   * Fetches mood entries logged in the past N days.
   */
  async getMoodsByDays(userId: string, days: number): Promise<MoodLog[]> {
    const supabase = await createClient();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('mood_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('logged_at', startDate.toISOString())
      .order('logged_at', { ascending: true });

    if (error || !data) {
      return [];
    }

    return data as MoodLog[];
  }

  /**
   * Retrieves the 7-day mood rating average.
   */
  async get7DayAverage(userId: string): Promise<number> {
    const moods = await this.getMoodsByDays(userId, 7);
    if (moods.length === 0) return 0;

    const sum = moods.reduce((acc, curr) => acc + curr.score, 0);
    return parseFloat((sum / moods.length).toFixed(2));
  }

  /**
   * Calculates the current consecutive day checking streak.
   */
  async getWellnessStreak(userId: string): Promise<number> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('mood_logs')
      .select('logged_at')
      .eq('user_id', userId)
      .order('logged_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return 0;
    }

    // Convert timestamps to date strings (YYYY-MM-DD) to count unique days
    const uniqueDays = Array.from(
      new Set(data.map((d) => new Date(d.logged_at).toISOString().split('T')[0]))
    );

    let streak = 0;
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Check if user logged today or yesterday to continue active streak
    if (uniqueDays[0] !== todayStr && uniqueDays[0] !== yesterdayStr) {
      return 0;
    }

    let currentRef = new Date(uniqueDays[0]);

    for (let i = 0; i < uniqueDays.length; i++) {
      const dayStr = uniqueDays[i];
      const targetDate = new Date(dayStr);
      
      const diffTime = Math.abs(currentRef.getTime() - targetDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 1) {
        streak++;
        currentRef = targetDate;
      } else {
        break;
      }
    }

    return streak;
  }
}
