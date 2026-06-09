// src/lib/actions/counselor.actions.ts
'use server';

import { createClient } from '../supabase/server';
import { CounselorRepository } from '../repositories/counselor.repository';
import { revalidatePath } from 'next/cache';

const counselorRepo = new CounselorRepository();

// Helper: Guard verifying counselor role and verification approval status
async function verifyApprovedCounselor() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized: Session context missing.');
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role, counselor_status, institution_id')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'counselor' || profile.counselor_status !== 'approved') {
    throw new Error('Access Denied: Action restricted to approved counselors only.');
  }

  return { user, profile };
}

/**
 * Creates availability slot.
 */
export async function createAvailabilitySlot(
  tenantSubdomain: string,
  startTime: string,
  endTime: string
) {
  try {
    const { user, profile } = await verifyApprovedCounselor();
    await counselorRepo.createAvailability(user.id, profile.institution_id, startTime, endTime);
    revalidatePath(`/${tenantSubdomain}/counselor`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Deletes availability slot.
 */
export async function deleteAvailabilitySlot(tenantSubdomain: string, slotId: string) {
  try {
    const { user } = await verifyApprovedCounselor();
    await counselorRepo.deleteAvailability(slotId, user.id);
    revalidatePath(`/${tenantSubdomain}/counselor`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Saves clinical session notes.
 */
export async function saveSessionNoteAction(
  tenantSubdomain: string,
  studentId: string,
  appointmentId: string,
  noteText: string
) {
  try {
    const { user, profile } = await verifyApprovedCounselor();

    // Verify appointment maps to counselor & student
    const supabase = await createClient();
    const { data: appt } = await supabase
      .from('appointments')
      .select('id')
      .eq('id', appointmentId)
      .eq('counselor_id', user.id)
      .eq('student_id', studentId)
      .single();

    if (!appt) {
      return { success: false, error: 'Appointment reference mismatch or not found.' };
    }

    await counselorRepo.writeSessionNote(
      user.id,
      studentId,
      appointmentId,
      profile.institution_id,
      noteText
    );

    revalidatePath(`/${tenantSubdomain}/counselor/student/${studentId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Fetches decrypted notes.
 */
export async function getSessionNoteForAppointment(appointmentId: string) {
  try {
    const { user } = await verifyApprovedCounselor();
    const noteText = await counselorRepo.readSessionNote(appointmentId, user.id);
    return { success: true, noteText };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Resolves risk alert.
 */
export async function resolveRiskAlertAction(
  tenantSubdomain: string,
  alertId: string,
  resolutionNotes: string
) {
  try {
    const { profile } = await verifyApprovedCounselor();
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('risk_alerts')
      .update({
        status: 'resolved',
        resolution_notes: resolutionNotes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', alertId)
      .eq('institution_id', profile.institution_id);

    if (error) throw new Error(error.message);

    revalidatePath(`/${tenantSubdomain}/counselor`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Loads student clinical profile for reviews.
 */
export async function getStudentClinicalProfile(
  tenantSubdomain: string,
  studentId: string
) {
  try {
    const { user } = await verifyApprovedCounselor();
    const supabase = await createClient();

    // 1. Verify access (assignment or active consent grant)
    const { data: appt } = await supabase
      .from('appointments')
      .select('id')
      .eq('counselor_id', user.id)
      .eq('student_id', studentId)
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle();

    const consentJournal = await counselorRepo.checkConsentGrant(studentId, user.id, 'journals');
    const consentChat = await counselorRepo.checkConsentGrant(studentId, user.id, 'ai_chats');
    const hasAssignedAccess = !!appt || consentJournal || consentChat;

    if (!hasAssignedAccess) {
      return { success: false, error: 'Access Denied: Counselors only access assigned students.' };
    }

    // 2. Fetch basic profile & anonymous details
    const { data: studentUser } = await supabase
      .from('users')
      .select('*, anonymous_profiles(pseudonym, avatar_config)')
      .eq('id', studentId)
      .single();

    // 3. Fetch mood history logs (last 30 checks)
    const { data: moodLogs } = await supabase
      .from('mood_logs')
      .select('*')
      .eq('user_id', studentId)
      .order('logged_at', { ascending: false })
      .limit(30);

    // 4. Fetch clinical questionnaire scores (last 10)
    const { data: assessmentResults } = await supabase
      .from('assessment_results')
      .select('*, assessment_types(name)')
      .eq('user_id', studentId)
      .order('completed_at', { ascending: false })
      .limit(10);

    // 5. Fetch appointments history
    const { data: apptHistory } = await supabase
      .from('appointments')
      .select('*, counselor_notes(id)')
      .eq('student_id', studentId)
      .eq('counselor_id', user.id)
      .is('deleted_at', null)
      .order('scheduled_time', { ascending: false });

    // 6. Fetch journals (consent-enforced)
    const journals = consentJournal ? await counselorRepo.getStudentJournals(studentId, user.id) : [];

    // 7. Fetch chats (consent-enforced)
    const chats = consentChat ? await counselorRepo.getStudentChats(studentId, user.id) : [];

    return {
      success: true,
      profile: {
        id: studentUser.id,
        email: studentUser.email,
        pseudonym: studentUser.anonymous_profiles?.[0]?.pseudonym || 'Anonymous Peer',
        avatar_config: studentUser.anonymous_profiles?.[0]?.avatar_config || {},
        real_first_name: studentUser.real_first_name, // (KMS encrypted - decrypter on client wrapper if needed, or left masked)
        real_last_name: studentUser.real_last_name,
      },
      moodLogs: moodLogs || [],
      assessmentResults: (assessmentResults || []).map((row: any) => ({
        id: row.id,
        assessment_name: row.assessment_types?.name || 'Scale',
        total_score: row.total_score,
        severity_level: row.severity_level,
        completed_at: row.completed_at,
      })),
      appointments: apptHistory || [],
      consent: {
        journals: consentJournal,
        chats: consentChat,
      },
      journals,
      chats,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
