// src/lib/repositories/consent.repository.ts
// Handles database data access operations for counselor-student consent records.
import { createClient } from '../supabase/server';

export interface ConsentGrant {
  id: string;
  institution_id: string;
  student_id: string;
  counselor_id: string;
  grant_type: 'journals' | 'ai_chats' | 'both';
  status: 'active' | 'revoked' | 'expired';
  expires_at: string;
}

export class ConsentRepository {
  /**
   * Records a counselor sharing consent grant.
   */
  async createConsentGrant(grant: Omit<ConsentGrant, 'id' | 'status'>): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('consent_grants')
      .insert({
        ...grant,
        status: 'active',
      });

    if (error) {
      throw new Error(`Consent registration failed: ${error.message}`);
    }
  }

  /**
   * Revokes sharing permissions immediately.
   */
  async revokeConsentGrant(studentId: string, counselorId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('consent_grants')
      .update({ status: 'revoked' })
      .eq('student_id', studentId)
      .eq('counselor_id', counselorId)
      .eq('status', 'active');

    if (error) {
      throw new Error(`Consent revocation failed: ${error.message}`);
    }
  }
}
