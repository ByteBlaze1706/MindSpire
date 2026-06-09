// src/lib/actions/auth.actions.ts
'use server';

import { redirect } from 'next/navigation';
import { AuthService } from '../services/auth.service';

const authService = new AuthService();

/**
 * Server Action: Register a new student user.
 */
export async function signUpWithEmail(formData: {
  email: string;
  password_hash: string;
  tenantSubdomain: string;
  accessCode?: string;
}) {
  try {
    await authService.signUpStudent(formData);
    return { success: true, message: 'Verification link sent to your email.' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Server Action: Login a student or staff member.
 */
export async function signInWithEmail(formData: {
  email: string;
  password_hash: string;
  tenantSubdomain: string;
}) {
  try {
    await authService.login(formData.email, formData.password_hash, formData.tenantSubdomain);
  } catch (error: any) {
    return { success: false, error: error.message };
  }

  // Redirect to target dashboard path upon successful auth
  redirect(`/${formData.tenantSubdomain}/dashboard`);
}

/**
 * Server Action: Standard signout.
 */
export async function signOut(tenantSubdomain: string) {
  try {
    await authService.logout();
  } catch (error) {
    // Ignore error
  }
  redirect(`/${tenantSubdomain}/login`);
}
