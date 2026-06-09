// src/lib/repositories/user.repository.ts
// Handles database operations for student and staff profiles.
import { createClient } from '../supabase/server';
import { Role } from '../permissions/roles';

export interface UserProfile {
  id: string;
  institution_id: string;
  email: string;
  role: Role;
  real_first_name: string | null;
  real_last_name: string | null;
  counselor_status: 'pending' | 'approved' | 'rejected';
  is_approved: boolean;
  created_at: string;
}

export interface AnonymousProfile {
  id: string;
  user_id: string;
  institution_id: string;
  pseudonym: string;
  avatar_config: Record<string, any>;
}

export class UserRepository {
  /**
   * Fetches user profile data by user ID.
   */
  async getById(id: string): Promise<UserProfile | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    return data as UserProfile;
  }

  /**
   * Registers/Pre-creates a student user record at signup.
   */
  async createProfile(profile: Omit<UserProfile, 'created_at' | 'is_approved' | 'counselor_status'>): Promise<UserProfile> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('users')
      .insert({
        ...profile,
        counselor_status: profile.role === 'counselor' ? 'pending' : 'approved',
        is_approved: profile.role !== 'counselor',
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Profile creation failed: ${error?.message}`);
    }

    return data as UserProfile;
  }

  /**
   * Checks if an anonymous pseudonym is already registered in the DB.
   */
  async pseudonymExists(pseudonym: string): Promise<boolean> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('anonymous_profiles')
      .select('id')
      .eq('pseudonym', pseudonym)
      .maybeSingle();

    if (error) {
      return false;
    }

    return !!data;
  }

  /**
   * Onboards student: saves encrypted name fields and updates status.
   */
  async updateOnboardingProfile(
    userId: string,
    encryptedFirstName: string,
    encryptedLastName: string
  ): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('users')
      .update({
        real_first_name: encryptedFirstName,
        real_last_name: encryptedLastName,
      })
      .eq('id', userId);

    if (error) {
      throw new Error(`Onboarding name update failed: ${error.message}`);
    }
  }

  /**
   * Decoupled Anonymous profile creation.
   */
  async createAnonymousProfile(anonProfile: Omit<AnonymousProfile, 'id'>): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('anonymous_profiles')
      .insert(anonProfile);

    if (error) {
      throw new Error(`Anonymous profile provisioning failed: ${error.message}`);
    }
  }

  /**
   * Sets up notification preferences configuration.
   */
  async updateNotificationPreferences(
    userId: string,
    preferences: { email_enabled: boolean; push_enabled: boolean; in_app_enabled: boolean }
  ): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('notification_preferences')
      .update(preferences)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Notification preferences update failed: ${error.message}`);
    }
  }

  /**
   * Fetches list of available counselors in a university.
   */
  async getCounselorsByInstitution(institutionId: string): Promise<{ id: string; email: string }[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('users')
      .select('id, email')
      .eq('institution_id', institutionId)
      .eq('role', 'counselor')
      .eq('counselor_status', 'approved');

    if (error || !data) {
      return [];
    }

    return data;
  }
}
