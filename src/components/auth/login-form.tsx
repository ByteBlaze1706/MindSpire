// src/components/auth/login-form.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { signInWithToken, signInWithEmail } from '../../lib/actions/auth.actions';
import { useTenant } from '../providers/tenant-provider';

const loginSchema = z.object({
  loginIdentifier: z.string().min(3, 'Please enter your Token ID or Email Address.'),
  password: z.string().min(8, 'Password must be at least 8 characters long.'),
});

type LoginInput = z.infer<typeof loginSchema>;

export function LoginForm() {
  const tenant = useTenant();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setLoading(true);
    setErrorMsg(null);

    const isEmail = data.loginIdentifier.includes('@');
    let result;

    if (isEmail) {
      // Staff/Counselor Login
      result = await signInWithEmail({
        email: data.loginIdentifier,
        password_hash: data.password,
        tenantSubdomain: tenant.subdomain,
      });
    } else {
      // Student Token ID Login
      result = await signInWithToken({
        tokenId: data.loginIdentifier,
        password_hash: data.password,
        tenantSubdomain: tenant.subdomain,
      });
    }

    if (result && !result.success) {
      setErrorMsg(result.error || 'Invalid credentials.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#E3EFF3] via-[#F5EBE6] to-[#FDFBF7] p-6 relative overflow-hidden">
      {/* Floating decorative elements */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-sky-200/20 rounded-full blur-3xl animate-pulse-slow -z-10" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-amber-100/20 rounded-full blur-3xl animate-pulse-slow -z-10" />
      <div className="absolute top-1/3 right-1/4 w-60 h-60 bg-rose-100/10 rounded-full blur-2xl animate-float -z-10" />
      <div className="absolute bottom-1/3 left-1/4 w-80 h-80 bg-teal-100/10 rounded-full blur-2xl animate-float-reverse -z-10" />

      <div className="w-full max-w-md p-8 bg-white/40 backdrop-blur-xl border border-white/50 rounded-[32px] shadow-2xl shadow-neutral-200/50 relative">
        <div className="absolute top-4 right-4 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest">Sanctuary Shield</span>
        </div>

        <div className="mb-8 text-center">
          <h2 className="text-2xl font-semibold text-neutral-800 tracking-tight flex items-center justify-center gap-2">
            <span>🌸</span> Welcome to MindSpire
          </h2>
          <p className="mt-1.5 text-xs text-neutral-500">
            Sign in to your {tenant.name} wellness account
          </p>
        </div>

        {errorMsg && (
          <div className="p-4 mb-6 text-xs text-rose-600 bg-rose-50/80 backdrop-blur-sm border border-rose-100 rounded-2xl text-left">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">
              Token ID / Email
            </label>
            <input
              {...register('loginIdentifier')}
              type="text"
              placeholder="e.g. NMIMS-X7K29A"
              className="w-full px-4 py-3 bg-white/80 border border-neutral-200 focus:border-neutral-400 focus:bg-white rounded-2xl outline-none transition text-sm text-neutral-800"
            />
            {errors.loginIdentifier && (
              <p className="mt-1.5 text-xs text-rose-500">{errors.loginIdentifier.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">
              Password
            </label>
            <input
              {...register('password')}
              type="password"
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-white/80 border border-neutral-200 focus:border-neutral-400 focus:bg-white rounded-2xl outline-none transition text-sm text-neutral-800"
            />
            {errors.password && (
              <p className="mt-1.5 text-xs text-rose-500">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-850 disabled:bg-neutral-300 rounded-2xl transition shadow-lg shadow-neutral-900/10 cursor-pointer"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center space-y-3">
          <p className="text-xs text-neutral-500">
            New to MindSpire?{' '}
            <Link href="/register" className="font-semibold text-neutral-700 hover:underline">
              Create an Account
            </Link>
          </p>
          <p className="text-[10px] text-neutral-450 leading-normal">
            MindSpire is an anonymous wellness sanctuary. Your identity is secure.
          </p>
        </div>
      </div>
    </div>
  );
}
