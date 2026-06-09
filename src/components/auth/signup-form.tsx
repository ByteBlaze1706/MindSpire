// src/components/auth/signup-form.tsx
'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { signUpWithEmail } from '../../lib/actions/auth.actions';
import { useTenant } from '../providers/tenant-provider';

const signupSchema = z.object({
  email: z.string().email('Please enter a valid university email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters long.'),
  accessCode: z.string().min(1, 'Institution access code is required.'),
});

type SignupInput = z.infer<typeof signupSchema>;

export function SignupForm() {
  const tenant = useTenant();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ success: boolean; message?: string; error?: string } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupInput) => {
    setLoading(true);
    setStatus(null);

    // Dynamic email domain verification check in browser prior to API hit
    const domain = data.email.split('@')[1];
    const isDomainAllowed = tenant.allowed_domains.length === 0 || tenant.allowed_domains.includes(domain);

    if (!isDomainAllowed) {
      setStatus({
        success: false,
        error: `Only emails ending with ${tenant.allowed_domains.map(d => `'@${d}'`).join(', ')} are allowed to register for ${tenant.name}.`,
      });
      setLoading(false);
      return;
    }

    const result = await signUpWithEmail({
      email: data.email,
      password_hash: data.password,
      tenantSubdomain: tenant.subdomain,
      accessCode: data.accessCode,
    });

    if (result.success) {
      setStatus({ success: true, message: result.message });
    } else {
      setStatus({ success: false, error: result.error || 'Registration failed.' });
    }
    setLoading(false);
  };

  return (
    <div className="w-full max-w-md p-8 bg-white/80 backdrop-blur-md border border-neutral-100 rounded-3xl shadow-xl shadow-neutral-100/40">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-semibold text-neutral-800 tracking-tight">
          Create student account
        </h2>
        <p className="mt-2 text-sm text-neutral-500">
          Join MindSpire for {tenant.name}
        </p>
      </div>

      {status && !status.success && (
        <div className="p-4 mb-6 text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-2xl">
          {status.error}
        </div>
      )}

      {status && status.success && (
        <div className="p-4 mb-6 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-2xl">
          {status.message}
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
            placeholder="student@college.edu"
            className="w-full px-5 py-3.5 bg-neutral-50 border border-neutral-200 focus:border-neutral-400 focus:bg-white rounded-2xl outline-none transition duration-200 text-neutral-800 placeholder-neutral-400 text-sm"
          />
          {errors.email && (
            <p className="mt-1.5 text-xs text-rose-500">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500 mb-2">
            Create Password
          </label>
          <input
            {...register('password')}
            type="password"
            placeholder="Minimum 8 characters"
            className="w-full px-5 py-3.5 bg-neutral-50 border border-neutral-200 focus:border-neutral-400 focus:bg-white rounded-2xl outline-none transition duration-200 text-neutral-800 placeholder-neutral-400 text-sm"
          />
          {errors.password && (
            <p className="mt-1.5 text-xs text-rose-500">{errors.password.message}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500 mb-2">
            Institution Access Code
          </label>
          <input
            {...register('accessCode')}
            type="text"
            placeholder="Enter joining code"
            className="w-full px-5 py-3.5 bg-neutral-50 border border-neutral-200 focus:border-neutral-400 focus:bg-white rounded-2xl outline-none transition duration-200 text-neutral-800 placeholder-neutral-400 text-sm"
          />
          {errors.accessCode && (
            <p className="mt-1.5 text-xs text-rose-500">{errors.accessCode.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-300 rounded-2xl transition duration-200 shadow-lg shadow-neutral-900/10 cursor-pointer"
        >
          {loading ? 'Creating Account...' : 'Register'}
        </button>
      </form>
    </div>
  );
}
