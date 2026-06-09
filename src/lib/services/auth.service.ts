// src/lib/services/auth.service.ts
// Handles business logic for authentication and credentials verification.
import crypto from 'crypto';
import { createClient } from '../supabase/server';
import { TenantRepository } from '../repositories/tenant.repository';
import { UserRepository } from '../repositories/user.repository';
import { hashPin, verifyPin } from '../auth/pin';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

let adminSupabaseInstance: any = null;

function getAdminSupabase() {
  if (!adminSupabaseInstance) {
    const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!rawUrl) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL is missing in environment variables.');
    }
    const cleanUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing in environment variables.');
    }
    adminSupabaseInstance = createSupabaseClient(cleanUrl, serviceRoleKey);
  }
  return adminSupabaseInstance;
}

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
    pin: string;
    tenantSubdomain: string;
  }) {
    console.log('[signUpStudentAnonymous] Service execution started. Subdomain:', payload.tenantSubdomain);
    const tenant = await this.tenantRepo.getBySubdomain(payload.tenantSubdomain);
    if (!tenant) {
      console.error('[signUpStudentAnonymous] Tenant not found for subdomain:', payload.tenantSubdomain);
      throw new Error('Target institution not found.');
    }
    console.log('[signUpStudentAnonymous] Found tenant:', tenant.name, 'ID:', tenant.id);

    // Check if pseudonym is already taken
    console.log('[signUpStudentAnonymous] Checking if pseudonym is taken:', payload.pseudonym);
    const isPseudonymTaken = await this.userRepo.pseudonymExists(payload.pseudonym);
    if (isPseudonymTaken) {
      console.error('[signUpStudentAnonymous] Pseudonym already taken:', payload.pseudonym);
      throw new Error('Pseudonym already in use. Please select a different handle.');
    }
    console.log('[signUpStudentAnonymous] Pseudonym is available');

    // Check if token_id is already taken
    console.log('[signUpStudentAnonymous] Checking if Token ID is taken:', payload.tokenId);
    const { data: existingToken } = await getAdminSupabase()
      .from('anonymous_users')
      .select('id')
      .eq('token_id', payload.tokenId.toUpperCase())
      .maybeSingle();
      
    if (existingToken) {
      console.error('[signUpStudentAnonymous] Token ID already registered:', payload.tokenId);
      throw new Error('Token ID already registered.');
    }
    console.log('[signUpStudentAnonymous] Token ID is available');

    const userId = crypto.randomUUID();
    console.log('[signUpStudentAnonymous] Generated user ID:', userId);
    
    const hashedPin = hashPin(payload.pin);

    // 1. Insert into anonymous_users table
    console.log('[signUpStudentAnonymous] Step 1/4: Inserting into anonymous_users table...');
    const { error: anonUserError } = await getAdminSupabase()
      .from('anonymous_users')
      .insert({
        id: userId,
        token_id: payload.tokenId.toUpperCase(),
        anonymous_name: payload.pseudonym,
        hashed_pin: hashedPin,
        institution_id: tenant.id
      });

    if (anonUserError) {
      console.error('[signUpStudentAnonymous] Step 1/4 insertion failed:', anonUserError.message);
      throw new Error(`Failed to create anonymous account: ${anonUserError.message}`);
    }
    console.log('[signUpStudentAnonymous] Step 1/4 insertion succeeded');

    // 2. Pre-create public user profile in users table
    console.log('[signUpStudentAnonymous] Step 2/4: Pre-creating public user profile...');
    await this.userRepo.createProfile({
      id: userId,
      institution_id: tenant.id,
      email: null,
      role: 'student',
      real_first_name: null,
      real_last_name: null,
    });
    console.log('[signUpStudentAnonymous] Step 2/4 profile pre-creation succeeded');

    // 3. Create anonymous profile in anonymous_profiles table
    console.log('[signUpStudentAnonymous] Step 3/4: Creating anonymous profile...');
    await this.userRepo.createAnonymousProfile({
      user_id: userId,
      institution_id: tenant.id,
      pseudonym: payload.pseudonym,
      avatar_config: { icon: 'otter', color: '#0F4C81' },
      token_id: payload.tokenId.toUpperCase(),
    });
    console.log('[signUpStudentAnonymous] Step 3/4 anonymous profile creation succeeded');

    // 4. Create notification preferences
    console.log('[signUpStudentAnonymous] Step 4/4: Updating notification preferences...');
    await this.userRepo.updateNotificationPreferences(userId, {
      email_enabled: false,
      push_enabled: true,
      in_app_enabled: true,
    });
    console.log('[signUpStudentAnonymous] Step 4/4 notification preferences update succeeded');

    return {
      id: userId,
      email: null,
      role: 'student',
      institution_id: tenant.id
    };
  }



  /**
   * Logs a student user in using Token ID and PIN.
   */
  async loginStudentWithToken(tokenId: string, pin: string, tenantSubdomain: string) {
    const tenant = await this.tenantRepo.getBySubdomain(tenantSubdomain);
    if (!tenant) {
      throw new Error('Target institution not found.');
    }

    // Query anonymous_users table
    console.log('[loginStudentWithToken] Querying anonymous_users for Token ID:', tokenId);
    const { data: anonUser, error: queryError } = await getAdminSupabase()
      .from('anonymous_users')
      .select('*')
      .eq('token_id', tokenId.toUpperCase())
      .maybeSingle();

    if (queryError || !anonUser) {
      throw new Error('Invalid Token ID or PIN.');
    }

    // Verify PIN
    const isValid = verifyPin(pin, anonUser.hashed_pin);
    if (!isValid) {
      throw new Error('Invalid Token ID or PIN.');
    }

    // Verify tenant match
    if (anonUser.institution_id !== tenant.id) {
      throw new Error('User account is not associated with this institution.');
    }

    return {
      id: anonUser.id,
      email: null,
      role: 'student',
      institution_id: tenant.id
    };
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
