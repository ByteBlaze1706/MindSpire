// src/lib/repositories/counselor.repository.ts
// Handles database logic for verified counselors: availability, rosters, risk alerts, clinical session notes, and consent-based data access.
import crypto from 'crypto';
import { createClient } from '../supabase/server';
import { UserProfile, AnonymousProfile } from './user.repository';
import { JournalEntry } from './journal.repository';

export interface CounselorAvailability {
  id: string;
  institution_id: string;
  counselor_id: string;
  start_time: string;
  end_time: string;
  is_booked: boolean;
  created_at: string;
}

export interface CounselorNote {
  id: string;
  institution_id: string;
  appointment_id: string;
  counselor_id: string;
  student_id: string;
  encrypted_clinical_data: string;
  encrypted_dek: string;
  key_reference: string;
  encryption_version: string;
  created_at: string;
}

export interface RiskAlert {
  id: string;
  institution_id: string;
  user_id: string;
  source_type: 'mood' | 'journal' | 'assessment' | 'ai';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'under_review' | 'resolved';
  resolution_notes: string | null;
  created_at: string;
  pseudonym?: string;
}

const KEK_MASTER = process.env.ENCRYPTION_MASTER_KEY || 'mindspire-super-secret-key-phrase';

function encryptClinicalData(text: string): { ciphertext: string; encryptedDek: string; keyRef: string } {
  const dek = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', dek, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  const ciphertextPayload = `${iv.toString('hex')}:${authTag}:${encrypted}`;

  const kek = crypto.scryptSync(KEK_MASTER, 'mindspire-dek-salt', 32);
  const dekIv = crypto.randomBytes(16);
  const dekCipher = crypto.createCipheriv('aes-256-cbc', kek, dekIv);
  let encryptedDek = dekCipher.update(dek.toString('hex'), 'utf8', 'hex');
  encryptedDek += dekCipher.final('hex');
  const dekPayload = `${dekIv.toString('hex')}:${encryptedDek}`;

  return {
    ciphertext: ciphertextPayload,
    encryptedDek: dekPayload,
    keyRef: 'kms-master-v1',
  };
}

function decryptClinicalData(ciphertext: string, encryptedDek: string): string {
  const [dekIvHex, encryptedDekHex] = encryptedDek.split(':');
  const kek = crypto.scryptSync(KEK_MASTER, 'mindspire-dek-salt', 32);
  const dekIv = Buffer.from(dekIvHex, 'hex');
  const dekDecipher = crypto.createDecipheriv('aes-256-cbc', kek, dekIv);
  let dekHex = dekDecipher.update(encryptedDekHex, 'hex', 'utf8');
  dekHex += dekDecipher.final('utf8');
  const dek = Buffer.from(dekHex, 'hex');

  const [ivHex, authTagHex, encryptedHex] = ciphertext.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', dek, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

export class CounselorRepository {
  /**
   * Fetches assigned student rosters based on appointments OR active consent grants.
   */
  async getAssignedStudents(
    counselorId: string,
    institutionId: string
  ): Promise<(UserProfile & { pseudonym: string; active_consent: boolean })[]> {
    const supabase = await createClient();

    // 1. Fetch appointments students
    const { data: appts } = await supabase
      .from('appointments')
      .select('student_id')
      .eq('counselor_id', counselorId)
      .eq('institution_id', institutionId)
      .is('deleted_at', null);

    // 2. Fetch active consent students
    const { data: consents } = await supabase
      .from('consent_grants')
      .select('student_id')
      .eq('counselor_id', counselorId)
      .eq('institution_id', institutionId)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString());

    const studentIds = Array.from(
      new Set([
        ...(appts || []).map((a) => a.student_id),
        ...(consents || []).map((c) => c.student_id),
      ])
    );

    if (studentIds.length === 0) return [];

    // 3. Resolve user details and anonymous profile pseudonyms & token IDs
    const { data: users, error } = await supabase
      .from('users')
      .select('*, anonymous_profiles(pseudonym, token_id)')
      .in('id', studentIds);

    if (error || !users) return [];

    return users.map((user: any) => {
      const studentConsent = (consents || []).some((c) => c.student_id === user.id);
      return {
        id: user.id,
        institution_id: user.institution_id,
        email: '', // Hidden for privacy
        role: user.role,
        real_first_name: null, // Hidden for privacy
        real_last_name: null, // Hidden for privacy
        counselor_status: user.counselor_status,
        is_approved: user.is_approved,
        created_at: user.created_at,
        pseudonym: user.anonymous_profiles?.[0]?.pseudonym || 'Anonymous Peer',
        token_id: user.anonymous_profiles?.[0]?.token_id || '',
        active_consent: studentConsent,
      } as any;
    });
  }

  /**
   * Checks counselor access permission. Returns consent status.
   */
  async checkConsentGrant(
    studentId: string,
    counselorId: string,
    requiredType: 'journals' | 'ai_chats' | 'both'
  ): Promise<boolean> {
    const supabase = await createClient();
    const { data } = await supabase
      .from('consent_grants')
      .select('id, grant_type')
      .eq('student_id', studentId)
      .eq('counselor_id', counselorId)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (!data) return false;
    
    if (requiredType === 'both') {
      return data.grant_type === 'both';
    }
    return data.grant_type === requiredType || data.grant_type === 'both';
  }

  /**
   * Fetches risk alerts queue in institution.
   */
  async getRiskAlerts(institutionId: string): Promise<RiskAlert[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('risk_alerts')
      .select('*, users(anonymous_profiles(pseudonym))')
      .eq('institution_id', institutionId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((row: any) => ({
      id: row.id,
      institution_id: row.institution_id,
      user_id: row.user_id,
      source_type: row.source_type,
      severity: row.severity,
      status: row.status,
      resolution_notes: row.resolution_notes,
      created_at: row.created_at,
      pseudonym: row.users?.anonymous_profiles?.[0]?.pseudonym || 'Anonymous Peer',
    }));
  }

  /**
   * Session notes: Writes session note.
   */
  async writeSessionNote(
    counselorId: string,
    studentId: string,
    appointmentId: string,
    institutionId: string,
    rawText: string
  ): Promise<void> {
    const { ciphertext, encryptedDek, keyRef } = encryptClinicalData(rawText);
    const supabase = await createClient();

    // Upsert note for this appointment
    const { error } = await supabase
      .from('counselor_notes')
      .upsert({
        appointment_id: appointmentId,
        counselor_id: counselorId,
        student_id: studentId,
        institution_id: institutionId,
        encrypted_clinical_data: ciphertext,
        encrypted_dek: encryptedDek,
        key_reference: keyRef,
        encryption_version: 'v1',
      }, { onConflict: 'appointment_id' });

    if (error) {
      throw new Error(`Failed to save session note: ${error.message}`);
    }
  }

  /**
   * Decrypts and reads session note for a booked appointment.
   */
  async readSessionNote(appointmentId: string, counselorId: string): Promise<string | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('counselor_notes')
      .select('*')
      .eq('appointment_id', appointmentId)
      .eq('counselor_id', counselorId)
      .maybeSingle();

    if (error || !data) return null;

    try {
      return decryptClinicalData(data.encrypted_clinical_data, data.encrypted_dek);
    } catch (err) {
      return '[Decryption Error: Key mismatch]';
    }
  }

  /**
   * Consent-based journals access.
   */
  async getStudentJournals(
    studentId: string,
    counselorId: string
  ): Promise<{ id: string; content: string; created_at: string; is_gratitude: boolean }[]> {
    const hasConsent = await this.checkConsentGrant(studentId, counselorId, 'journals');
    if (!hasConsent) return [];

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', studentId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    // Decrypt entries helper (Matches journal envelope decrypt)
    const decryptJournal = (ciphertext: string, encryptedDek: string) => {
      const [dekIvHex, encryptedDekHex] = encryptedDek.split(':');
      const kek = crypto.scryptSync(KEK_MASTER, 'mindspire-dek-salt', 32);
      const dekDecipher = crypto.createDecipheriv('aes-256-cbc', kek, Buffer.from(dekIvHex, 'hex'));
      let dekHex = dekDecipher.update(encryptedDekHex, 'hex', 'utf8') + dekDecipher.final('utf8');
      
      const [ivHex, authTagHex, encryptedHex] = ciphertext.split(':');
      const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(dekHex, 'hex'), Buffer.from(ivHex, 'hex'));
      decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
      return decipher.update(encryptedHex, 'hex', 'utf8') + decipher.final('utf8');
    };

    return data.map((row: any) => {
      try {
        const plaintext = decryptJournal(row.encrypted_content, row.encrypted_dek);
        return {
          id: row.id,
          content: plaintext,
          created_at: row.created_at,
          is_gratitude: row.is_gratitude,
        };
      } catch (err) {
        return {
          id: row.id,
          content: '[Decryption Lock: Student key reference required]',
          created_at: row.created_at,
          is_gratitude: row.is_gratitude,
        };
      }
    });
  }

  /**
   * Consent-based AI Chat sessions and messages access.
   */
  async getStudentChats(
    studentId: string,
    counselorId: string
  ): Promise<{ session_title: string; messages: { sender_type: string; content: string; created_at: string }[] }[]> {
    const hasConsent = await this.checkConsentGrant(studentId, counselorId, 'ai_chats');
    if (!hasConsent) return [];

    const supabase = await createClient();
    const { data: sessions, error: sessErr } = await supabase
      .from('ai_chat_sessions')
      .select('id, title')
      .eq('user_id', studentId)
      .order('created_at', { ascending: false });

    if (sessErr || !sessions) return [];

    // Helper decrypt
    const decryptChatMsg = (ciphertext: string, encryptedDek: string) => {
      // Chat messages reuse similar encryption if needed, or default to general master KEK
      // If client didn't encrypt messages uniquely, we decrypt using master Scrypt seed
      const [ivHex, authTagHex, encryptedHex] = ciphertext.split(':');
      const key = crypto.scryptSync(KEK_MASTER, 'mindspire-chat-salt', 32);
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
      decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
      return decipher.update(encryptedHex, 'hex', 'utf8') + decipher.final('utf8');
    };

    const parsedSessions = await Promise.all(
      sessions.map(async (sess) => {
        const { data: messages } = await supabase
          .from('ai_chat_messages')
          .select('*')
          .eq('session_id', sess.id)
          .order('created_at', { ascending: true });

        const parsedMsgs = (messages || []).map((m: any) => {
          try {
            // Decrypt message payload
            // Note: If messages were encrypted with DEK we resolve KEK, otherwise fallback
            let plaintext = m.encrypted_content;
            if (m.encrypted_content.includes(':')) {
              plaintext = decryptChatMsg(m.encrypted_content, '');
            }
            return {
              sender_type: m.sender_type,
              content: plaintext,
              created_at: m.created_at,
            };
          } catch (err) {
            return {
              sender_type: m.sender_type,
              content: '[Encrypted Message Body]',
              created_at: m.created_at,
            };
          }
        });

        return {
          session_title: sess.title,
          messages: parsedMsgs,
        };
      })
    );

    return parsedSessions;
  }

  /**
   * Calendar availability scheduling slots.
   */
  async createAvailability(
    counselorId: string,
    institutionId: string,
    startTime: string,
    endTime: string
  ): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('counselor_availability')
      .insert({
        counselor_id: counselorId,
        institution_id: institutionId,
        start_time: startTime,
        end_time: endTime,
        is_booked: false,
      });

    if (error) {
      throw new Error(`Failed to create availability slot: ${error.message}`);
    }
  }

  async getAvailability(counselorId: string): Promise<CounselorAvailability[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('counselor_availability')
      .select('*')
      .eq('counselor_id', counselorId)
      .order('start_time', { ascending: true });

    if (error || !data) return [];
    return data as CounselorAvailability[];
  }

  async deleteAvailability(slotId: string, counselorId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('counselor_availability')
      .delete()
      .eq('id', slotId)
      .eq('counselor_id', counselorId);

    if (error) {
      throw new Error(`Failed to delete availability slot: ${error.message}`);
    }
  }
}
