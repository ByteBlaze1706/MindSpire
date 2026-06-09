// src/lib/actions/auth.actions.ts
'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { AuthService } from '../services/auth.service';
import { signToken } from '../auth/token';

const authService = new AuthService();

/**
 * Server Action: Register a new student user anonymously.
 */
export async function signUpStudentAnonymously(formData: {
  pseudonym: string;
  tokenId: string;
  pin: string;
  tenantSubdomain: string;
}) {
  console.log('[signUpStudentAnonymously] Server Action START. Token:', formData.tokenId, 'Pseudonym:', formData.pseudonym);
  try {
    console.log('[signUpStudentAnonymously] Step 1/3: Calling authService.signUpStudentAnonymous...');
    const user = await authService.signUpStudentAnonymous({
      pseudonym: formData.pseudonym,
      tokenId: formData.tokenId,
      pin: formData.pin,
      tenantSubdomain: formData.tenantSubdomain,
    });
    console.log('[signUpStudentAnonymously] Step 1/3 succeeded. User:', user.id);

    console.log('[signUpStudentAnonymously] Step 2/3: Signing custom JWT token...');
    const token = await signToken({
      userId: user.id,
      tokenId: formData.tokenId.toUpperCase(),
      institutionId: user.institution_id,
      role: 'student',
    });
    console.log('[signUpStudentAnonymously] Step 2/3 succeeded. Token length:', token.length);

    console.log('[signUpStudentAnonymously] Step 3/3: Setting session cookie...');
    const cookieStore = await cookies();
    cookieStore.set('mindspire-student-session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: 'strict',
    });
    console.log('[signUpStudentAnonymously] Step 3/3 succeeded. Cookie set.');
  } catch (error: any) {
    console.error('[signUpStudentAnonymously] Server Action EXCEPTION:', error.message, error.stack);
    return { success: false, error: error.message };
  }

  console.log('[signUpStudentAnonymously] Server Action redirecting to /dashboard...');
  redirect('/dashboard');
}

/**
 * Server Action: Login a student using their Token ID and PIN.
 */
export async function signInWithToken(formData: {
  tokenId: string;
  pin: string;
  tenantSubdomain: string;
}) {
  try {
    const user = await authService.loginStudentWithToken(
      formData.tokenId,
      formData.pin,
      formData.tenantSubdomain
    );

    const token = await signToken({
      userId: user.id,
      tokenId: formData.tokenId.toUpperCase(),
      institutionId: user.institution_id,
      role: 'student',
    });

    const cookieStore = await cookies();
    cookieStore.set('mindspire-student-session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: 'strict',
    });
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
  const cookieStore = await cookies();
  cookieStore.delete('mindspire-student-session');
  redirect('/login');
}
