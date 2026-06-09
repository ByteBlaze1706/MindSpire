// src/lib/services/auth.service.ts
// Handles business logic for authentication and credentials verification.
import { createClient } from '../supabase/server';
import { TenantRepository } from '../repositories/tenant.repository';
import { UserRepository } from '../repositories/user.repository';

export class AuthService {
  private tenantRepo = new TenantRepository();
  private userRepo = new UserRepository();

  /**
   * Registers a student using email and password.
   * Verifies domain matching against target institution allowed email domains.
   */
  async signUpStudent(payload: {
    email: string;
    password_hash: string;
    tenantSubdomain: string;
    accessCode?: string;
  }) {
    const tenant = await this.tenantRepo.getBySubdomain(payload.tenantSubdomain);
    if (!tenant) {
      throw new Error('Target institution not found.');
    }

    // Verify access code if required by tenant config
    if (tenant.access_code && tenant.access_code !== payload.accessCode) {
      throw new Error('Invalid institution access code.');
    }

    // Validate email domain
    const emailDomain = payload.email.split('@')[1];
    const isDomainAllowed = tenant.allowed_domains.length === 0 || tenant.allowed_domains.includes(emailDomain);
    
    if (!isDomainAllowed) {
      throw new Error(`Registration failed: Email domain '@${emailDomain}' is not permitted for ${tenant.name}.`);
    }

    const supabase = await createClient();

    // 1. Create Supabase Auth user record (metadata preserves tenant binding)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password_hash,
      options: {
        data: {
          institution_id: tenant.id,
          role: 'student',
        },
      },
    });

    if (authError || !authData.user) {
      throw new Error(`Authentication registration failed: ${authError?.message}`);
    }

    // 2. Pre-create public user profile
    await this.userRepo.createProfile({
      id: authData.user.id,
      institution_id: tenant.id,
      email: payload.email,
      role: 'student',
      real_first_name: null,
      real_last_name: null,
    });

    return authData.user;
  }

  /**
   * Registers a student user anonymously using a Token ID and pseudonym.
   */
  async signUpStudentAnonymous(payload: {
    pseudonym: string;
    tokenId: string;
    password_hash: string;
    tenantSubdomain: string;
  }) {
    const tenant = await this.tenantRepo.getBySubdomain(payload.tenantSubdomain);
    if (!tenant) {
      throw new Error('Target institution not found.');
    }

    // Check if pseudonym is already taken
    const isPseudonymTaken = await this.userRepo.pseudonymExists(payload.pseudonym);
    if (isPseudonymTaken) {
      throw new Error('Pseudonym already in use. Please select a different handle.');
    }

    const email = `${payload.tokenId.toUpperCase()}@mindspire.local`;
    const supabase = await createClient();

    // 1. Create Supabase Auth user record
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: payload.password_hash,
      options: {
        data: {
          institution_id: tenant.id,
          role: 'student',
        },
      },
    });

    if (authError || !authData.user) {
      throw new Error(`Authentication registration failed: ${authError?.message}`);
    }

    // 2. Pre-create public user profile in users table
    await this.userRepo.createProfile({
      id: authData.user.id,
      institution_id: tenant.id,
      email,
      role: 'student',
      real_first_name: null,
      real_last_name: null,
    });

    // 3. Create anonymous profile in anonymous_profiles table
    await this.userRepo.createAnonymousProfile({
      user_id: authData.user.id,
      institution_id: tenant.id,
      pseudonym: payload.pseudonym,
      avatar_config: { icon: 'otter', color: '#0F4C81' },
      token_id: payload.tokenId.toUpperCase(),
    });

    // 4. Create notification preferences
    await this.userRepo.updateNotificationPreferences(authData.user.id, {
      email_enabled: false,
      push_enabled: true,
      in_app_enabled: true,
    });

    return authData.user;
  }


  /**
   * Logs a user in using email and password.
   */
  async login(email: string, password_hash: string, tenantSubdomain: string) {
    const tenant = await this.tenantRepo.getBySubdomain(tenantSubdomain);
    if (!tenant) {
      throw new Error('Target institution not found.');
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: password_hash,
    });

    if (error || !data.user) {
      throw new Error(`Authentication login failed: ${error?.message}`);
    }

    // Double check user profile matching tenant context
    const profile = await this.userRepo.getById(data.user.id);
    if (!profile || profile.institution_id !== tenant.id) {
      // Force logout if tenant hijacking is attempted
      await supabase.auth.signOut();
      throw new Error('User account is not associated with this institution.');
    }

    return data.user;
  }

  /**
   * Standard signout operation.
   */
  async logout() {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  /**
   * Requests a password reset link email.
   */
  async requestPasswordReset(email: string, tenantSubdomain: string) {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/${tenantSubdomain}/reset-password`,
    });

    if (error) {
      throw new Error(`Password reset request failed: ${error.message}`);
    }
  }
}
