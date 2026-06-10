// src/lib/actions/notification.actions.ts
'use server';

import { createClient } from '../supabase/server';
import { NotificationRepository } from '../repositories/notification.repository';
import { revalidatePath } from 'next/cache';

const notifRepo = new NotificationRepository();

export async function getNotificationsList() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized.' };
  }

  try {
    const list = await notifRepo.getNotifications(user.id);
    return { success: true, notifications: list };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function markNotificationRead(tenantSubdomain: string, id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Unauthorized.' };

  try {
    await notifRepo.markAsRead(id, user.id);
    revalidatePath('/dashboard');
    revalidatePath('/notifications');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function markAllNotificationsRead(tenantSubdomain: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Unauthorized.' };

  try {
    await notifRepo.markAllAsRead(user.id);
    revalidatePath('/dashboard');
    revalidatePath('/notifications');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
