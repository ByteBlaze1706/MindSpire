// src/lib/repositories/admin.repository.ts
import { createClient } from '../supabase/server';
import { UserProfile } from './user.repository';

export interface AdminStats {
  totalStudents: number;
  totalCounselors: number;
  pendingCounselors: number;
  activeAlerts: number;
}

export class AdminRepository {
  /**
   * Fetches high-level count stats for the admin.
   */
  async getOverviewStats(institutionId: string): Promise<AdminStats> {
    const supabase = await createClient();

    const { count: studentCount } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('institution_id', institutionId)
      .eq('role', 'student');

    const { count: counselorCount } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('institution_id', institutionId)
      .eq('role', 'counselor')
      .eq('counselor_status', 'approved');

    const { count: pendingCount } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('institution_id', institutionId)
      .eq('role', 'counselor')
      .eq('counselor_status', 'pending');

    const { count: alertsCount } = await supabase
      .from('risk_alerts')
      .select('id', { count: 'exact', head: true })
      .eq('institution_id', institutionId)
      .eq('status', 'pending');

    return {
      totalStudents: studentCount || 0,
      totalCounselors: counselorCount || 0,
      pendingCounselors: pendingCount || 0,
      activeAlerts: alertsCount || 0,
    };
  }

  /**
   * Aggregates recent student mood entries by descriptor.
   */
  async getMoodStats(institutionId: string): Promise<Record<string, number>> {
    const supabase = await createClient();
    const { data } = await supabase
      .from('mood_logs')
      .select('descriptor')
      .eq('institution_id', institutionId);

    const stats: Record<string, number> = {};
    if (data) {
      data.forEach((row) => {
        stats[row.descriptor] = (stats[row.descriptor] || 0) + 1;
      });
    }
    return stats;
  }

  /**
   * Aggregates completed clinical assessment severity levels.
   */
  async getAssessmentStats(institutionId: string): Promise<Record<string, number>> {
    const supabase = await createClient();
    const { data } = await supabase
      .from('assessment_results')
      .select('severity_level')
      .eq('institution_id', institutionId);

    const stats: Record<string, number> = {};
    if (data) {
      data.forEach((row) => {
        stats[row.severity_level] = (stats[row.severity_level] || 0) + 1;
      });
    }
    return stats;
  }

  /**
   * Lists counselors seeking approval.
   */
  async getPendingCounselors(institutionId: string): Promise<UserProfile[]> {
    const supabase = await createClient();
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('institution_id', institutionId)
      .eq('role', 'counselor')
      .eq('counselor_status', 'pending');

    return (data || []) as UserProfile[];
  }

  /**
   * Approves a counselor application.
   */
  async approveCounselor(counselorId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('users')
      .update({ counselor_status: 'approved' })
      .eq('id', counselorId);

    if (error) {
      throw new Error(`Failed to approve counselor: ${error.message}`);
    }
  }

  /**
   * Rejects a counselor application.
   */
  async rejectCounselor(counselorId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('users')
      .update({ counselor_status: 'rejected' })
      .eq('id', counselorId);

    if (error) {
      throw new Error(`Failed to reject counselor: ${error.message}`);
    }
  }
}
