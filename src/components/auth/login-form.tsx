// src/components/auth/login-form.tsx
'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { signInWithEmail } from '../../lib/actions/auth.actions';
import { useTenant } from '../providers/tenant-provider';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid university email address.'),
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

    const result = await signInWithEmail({
      email: data.email,
      password_hash: data.password, // Directly processed over SSL
      tenantSubdomain: tenant.subdomain,
    });

    if (result && !result.success) {
      setErrorMsg(result.error || 'Invalid credentials.');
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Preserves tenant code context inside redirection endpoint callback
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    window.location.href = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${window.location.origin}/${tenant.subdomain}/callback`;
  };

  return (
    <div className="w-full max-w-md p-8 bg-white/80 backdrop-blur-md border border-neutral-100 rounded-3xl shadow-xl shadow-neutral-100/40">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-semibold text-neutral-800 tracking-tight">
          Welcome back to MindSpire
        </h2>
        <p className="mt-2 text-sm text-neutral-500">
          Sign in to your {tenant.name} wellness account
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 mb-6 text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-2xl">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500 mb-2">
            University Email Address
          </label>
          <input
            {...register('email')}
            type="email"
            placeholder="name@college.edu"
            className="w-full px-5 py-3.5 bg-neutral-50 border border-neutral-200 focus:border-neutral-400 focus:bg-white rounded-2xl outline-none transition duration-200 text-neutral-800 placeholder-neutral-400 text-sm"
          />
          {errors.email && (
            <p className="mt-1.5 text-xs text-rose-500">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500 mb-2">
            Password
          </label>
          <input
            {...register('password')}
            type="password"
            placeholder="••••••••"
            className="w-full px-5 py-3.5 bg-neutral-50 border border-neutral-200 focus:border-neutral-400 focus:bg-white rounded-2xl outline-none transition duration-200 text-neutral-800 placeholder-neutral-400 text-sm"
          />
          {errors.password && (
            <p className="mt-1.5 text-xs text-rose-500">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-300 rounded-2xl transition duration-200 shadow-lg shadow-neutral-900/10 cursor-pointer"
        >
          {loading ? 'Signing In...' : 'Sign In'}
        </button>
      </form>

      <div className="relative my-8 text-center">
        <span className="relative z-10 px-4 text-xs font-medium uppercase tracking-wider text-neutral-400 bg-white">
          Or continue with
        </span>
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-neutral-100 -z-0" />
      </div>

      <button
        onClick={handleGoogleLogin}
        className="w-full py-3.5 flex items-center justify-center gap-3 bg-white border border-neutral-200 hover:bg-neutral-50 text-sm font-medium text-neutral-700 rounded-2xl transition duration-200 cursor-pointer"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="#EA4335"
            d="M12 5.04c1.67 0 3.19.57 4.37 1.7l3.27-3.27C17.65 1.54 14.99 1 12 1 7.35 1 3.37 3.65 1.4 7.56l3.85 2.99C6.18 7.37 8.87 5.04 12 5.04z"
          />
          <path
            fill="#4285F4"
            d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.47h6.46c-.28 1.47-1.11 2.71-2.36 3.55l3.66 2.84c2.14-1.97 3.37-4.88 3.37-8.5z"
          />
          <path
            fill="#FBBC05"
            d="M5.25 14.84c-.23-.69-.36-1.42-.36-2.18s.13-1.49.36-2.18L1.4 7.49C.51 9.28 0 11.28 0 13.38s.51 4.1 1.4 5.89l3.85-2.99s-.23-1.05-.23-2.44z"
          />
          <path
            fill="#34A853"
            d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.66-2.84c-1.01.68-2.31 1.08-3.81 1.08-3.13 0-5.82-2.33-6.75-5.51L.89 15.82C2.86 19.73 6.84 23 12 23z"
          />
        </svg>
        Sign in with Google
      </button>
    </div>
  );
}
