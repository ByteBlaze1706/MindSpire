// src/lib/actions/admin.actions.ts
'use server';

import { createClient } from '../supabase/server';
import { UserRepository } from '../repositories/user.repository';
import { AdminRepository } from '../repositories/admin.repository';
import { revalidatePath } from 'next/cache';

const userRepo = new UserRepository();
const adminRepo = new AdminRepository();

/**
 * Server Action: Approve a counselor's registration application.
 */
export async function approveCounselorAction(counselorId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized: Session missing.' };
  }

  const profile = await userRepo.getById(user.id);
  if (!profile || !['inst_admin', 'super_admin'].includes(profile.role)) {
    return { success: false, error: 'Access Denied: Administrative role required.' };
  }

  try {
    await adminRepo.approveCounselor(counselorId);
    revalidatePath('/admin');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Server Action: Reject a counselor's registration application.
 */
export async function rejectCounselorAction(counselorId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized: Session missing.' };
  }

  const profile = await userRepo.getById(user.id);
  if (!profile || !['inst_admin', 'super_admin'].includes(profile.role)) {
    return { success: false, error: 'Access Denied: Administrative role required.' };
  }

  try {
    await adminRepo.rejectCounselor(counselorId);
    revalidatePath('/admin');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
