// src/app/[tenant]/pending-approval/page.tsx
import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';

export default async function PendingApprovalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch current user status details
  const { data: profile } = await supabase
    .from('users')
    .select('role, counselor_status')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'counselor') {
    redirect('/dashboard');
  }

  if (profile.counselor_status === 'approved') {
    redirect('/counselor');
  }

  const isRejected = profile.counselor_status === 'rejected';

  return (
    <div className="max-w-md w-full bg-white border border-neutral-100 rounded-3xl p-8 text-center space-y-6 shadow-md">
      <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center text-2xl ${
        isRejected ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600 animate-pulse'
      }`}>
        {isRejected ? '✕' : '⏳'}
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-neutral-800 tracking-tight">
          {isRejected ? 'Verification Rejected' : 'Verification Pending'}
        </h2>
        <p className="text-xs text-neutral-500 leading-relaxed">
          {isRejected
            ? 'Your application to join the counselor roster was rejected by your institution admin. Please check your qualifications or contact support.'
            : 'Your professional credentials are currently under review by your university wellness administrators. You will receive access once approved.'}
        </p>
      </div>

      <div className="border-t border-neutral-50 pt-4 flex flex-col gap-2">
        <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">Current Status</span>
        <span className={`text-xs font-bold ${isRejected ? 'text-rose-600' : 'text-amber-600'}`}>
          {isRejected ? 'Rejected' : 'Under Administrative Review'}
        </span>
      </div>

      <a
        href="/login"
        className="block w-full py-3 bg-neutral-800 hover:bg-neutral-900 text-white rounded-2xl text-xs font-semibold transition"
      >
        Return to Login
      </a>
    </div>
  );
}
