import { createClient } from '../supabase/server';

const CRISIS_PATTERNS = [
  // English severe self-harm / suicidal keywords
  /\b(suicide|suicidal|self-harm|selfharm|kill myself|end my life|end it all|want to die|wanna die|hang myself|slit my|overdose|poison myself|cutting myself|wishing i was dead|done with life)\b/i,
  // Hindi transliterated keywords
  /\b(atmahatya|suicide kar|apni jaan|jaan de du|marna chahta|mar jaunga|zeher khana|faansi laga)\b/i
];

export class CrisisDetectorService {
  /**
   * Scans text for high-risk crisis patterns.
   */
  detectCrisis(text: string): boolean {
    if (!text) return false;
    return CRISIS_PATTERNS.some((pattern) => pattern.test(text));
  }

  /**
   * Logs a risk alert and notifies moderators if crisis language is detected.
   */
  async handleCrisisTrigger(
    userId: string,
    institutionId: string,
    sourceType: 'mood' | 'journal' | 'assessment' | 'ai' | 'community',
    textSnippet: string
  ): Promise<{ triggered: boolean; alertId?: string }> {
    const isCrisis = this.detectCrisis(textSnippet);
    if (!isCrisis) {
      return { triggered: false };
    }

    const supabase = await createClient();

    // 1. Commit a public.risk_alerts entry
    const { data: alertData, error: alertErr } = await supabase
      .from('risk_alerts')
      .insert({
        institution_id: institutionId,
        user_id: userId,
        source_type: sourceType === 'community' ? 'journal' : sourceType, // Database supports: 'mood', 'journal', 'assessment', 'ai'
        severity: 'critical',
        status: 'pending',
        resolution_notes: `Automated: Crisis language triggered on community portal. Snippet: "${textSnippet.slice(0, 80)}..."`,
      })
      .select('id')
      .single();

    if (alertErr) {
      console.error(`Failed to register risk alert: ${alertErr.message}`);
    }

    const alertId = alertData?.id;

    // 2. Alert all moderators in the institution via public.notifications
    // Find moderators/admins in the same institution
    const { data: staff } = await supabase
      .from('users')
      .select('id')
      .eq('institution_id', institutionId)
      .in('role', ['moderator', 'inst_admin']);

    if (staff && staff.length > 0) {
      const notifications = staff.map((member) => ({
        institution_id: institutionId,
        user_id: member.id,
        type: 'risk_alert',
        title: '⚠️ CRITICAL: Crisis Language Detected',
        body: `A peer posted content containing crisis cues. Review recommended. Alert ID: ${alertId || 'N/A'}`,
        is_read: false,
      }));

      await supabase.from('notifications').insert(notifications);
    }

    return { triggered: true, alertId };
  }
}
