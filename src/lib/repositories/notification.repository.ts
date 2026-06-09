// src/lib/repositories/notification.repository.ts
// Handles database logic for in-app notification logs, marking read/unread, and creation hooks.
import { createClient } from '../supabase/server';

export interface NotificationLog {
  id: string;
  institution_id: string;
  user_id: string;
  type: 'appointment' | 'risk_alert' | 'community_reply' | 'system';
  title: string;
  body: string;
  is_read: boolean;
  channels: string[];
  created_at: string;
}

export class NotificationRepository {
  /**
   * Fetches active notifications for a user (limit 50).
   */
  async getNotifications(userId: string): Promise<NotificationLog[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !data) return [];
    return data as NotificationLog[];
  }

  /**
   * Marks a single notification as read.
   */
  async markAsRead(id: string, userId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to update notification: ${error.message}`);
    }
  }

  /**
   * Marks all notifications as read for a user.
   */
  async markAllAsRead(userId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      throw new Error(`Failed to update notifications: ${error.message}`);
    }
  }

  /**
   * Dispatches a new notification.
   */
  async createNotification(
    userId: string,
    institutionId: string,
    type: NotificationLog['type'],
    title: string,
    body: string,
    channels: string[] = ['in_app']
  ): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        institution_id: institutionId,
        type,
        title,
        body,
        is_read: false,
        channels,
      });

    if (error) {
      throw new Error(`Failed to create notification: ${error.message}`);
    }
  }
}
