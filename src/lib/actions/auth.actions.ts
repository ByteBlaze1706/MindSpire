// src/lib/actions/auth.actions.ts
'use server';

import { redirect } from 'next/navigation';
import { AuthService } from '../services/auth.service';

const authService = new AuthService();

/**
 * Server Action: Register a new student user anonymously.
 */
export async function signUpStudentAnonymously(formData: {
  pseudonym: string;
  tokenId: string;
  password_hash: string;
  tenantSubdomain: string;
}) {
  try {
    await authService.signUpStudentAnonymous({
      pseudonym: formData.pseudonym,
      tokenId: formData.tokenId,
      password_hash: formData.password_hash,
      tenantSubdomain: formData.tenantSubdomain,
    });

    const email = `${formData.tokenId.trim().toUpperCase()}@mindspire.local`;
    await authService.login(email, formData.password_hash, formData.tenantSubdomain);
  } catch (error: any) {
    return { success: false, error: error.message };
  }

  redirect('/dashboard');
}

/**
 * Server Action: Login a student using their Token ID and Password.
 */
export async function signInWithToken(formData: {
  tokenId: string;
  password_hash: string;
  tenantSubdomain: string;
}) {
  try {
    const email = `${formData.tokenId.trim().toUpperCase()}@mindspire.local`;
    await authService.login(email, formData.password_hash, formData.tenantSubdomain);
  } catch (error: any) {
    return { success: false, error: error.message };
  }

  redirect('/dashboard');
}

/**
 * Server Action: Login a counselor or admin using their Email and Password.
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

  redirect('/dashboard');
}

/**
 * Server Action: Standard signout.
 */
export async function signOut() {
  try {
    await authService.logout();
  } catch (error) {
    // Ignore error
  }
  redirect('/login');
}

