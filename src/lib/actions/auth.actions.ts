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
  try {
    const user = await authService.signUpStudentAnonymous({
      pseudonym: formData.pseudonym,
      tokenId: formData.tokenId,
      pin: formData.pin,
      tenantSubdomain: formData.tenantSubdomain,
    });

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
