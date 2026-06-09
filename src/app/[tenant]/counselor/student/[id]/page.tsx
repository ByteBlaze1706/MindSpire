// src/app/[tenant]/counselor/student/[id]/page.tsx
import React from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '../../../../../lib/supabase/server';
import { UserRepository } from '../../../../../lib/repositories/user.repository';
import { getStudentClinicalProfile } from '../../../../../lib/actions/counselor.actions';
import { StudentProfileContainer } from './student-profile-container'; // Client container

const userRepo = new UserRepository();

export default async function StudentClinicalProfilePage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>;
}) {
  const resolvedParams = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${resolvedParams.tenant}/login`);
  }

  const profile = await userRepo.getById(user.id);
  if (!profile || profile.role !== 'counselor') {
    redirect(`/${resolvedParams.tenant}/dashboard`);
  }

  if (profile.counselor_status !== 'approved') {
    redirect(`/${resolvedParams.tenant}/pending-approval`);
  }

  // Load clinical profile details
  const res = await getStudentClinicalProfile(resolvedParams.tenant, resolvedParams.id);
  if (!res.success || !res.profile) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-rose-100 max-w-md mx-auto space-y-4">
        <span className="text-2xl">🔒</span>
        <h3 className="text-base font-bold text-neutral-800">Roster Access Denied</h3>
        <p className="text-xs text-neutral-500 leading-relaxed">
          {res.error || 'You do not have active clinical permissions to view this student profile.'}
        </p>
        <Link
          href={`/${resolvedParams.tenant}/counselor`}
          className="inline-block py-2 px-4 bg-neutral-800 hover:bg-neutral-900 text-white rounded-xl text-xs font-semibold"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          href={`/${resolvedParams.tenant}/counselor`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-500 hover:text-neutral-800 transition"
        >
          ← Back to Clinical Dashboard
        </Link>
      </div>

      <StudentProfileContainer
        profile={res.profile}
        moodLogs={res.moodLogs || []}
        assessmentResults={res.assessmentResults || []}
        appointments={res.appointments || []}
        consent={res.consent || { journals: false, chats: false }}
        journals={res.journals || []}
        chats={res.chats || []}
        tenantSubdomain={resolvedParams.tenant}
      />
    </div>
  );
}
