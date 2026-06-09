// src/app/[tenant]/counselor/page.tsx
import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';
import { UserRepository, UserProfile } from '../../../lib/repositories/user.repository';
import { CounselorRepository, CounselorAvailability, RiskAlert } from '../../../lib/repositories/counselor.repository';
import { CounselorDashboardContainer } from './counselor-dashboard-container';

const userRepo = new UserRepository();
const counselorRepo = new CounselorRepository();

export default async function CounselorDashboardPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
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

  // Load roster, availability slots, and risk alerts
  let roster: (UserProfile & { pseudonym: string; active_consent: boolean })[] = [];
  let slots: CounselorAvailability[] = [];
  let riskAlerts: RiskAlert[] = [];
  let fetchError = false;

  try {
    roster = await counselorRepo.getAssignedStudents(user.id, profile.institution_id);
    slots = await counselorRepo.getAvailability(user.id);
    riskAlerts = await counselorRepo.getRiskAlerts(profile.institution_id);
  } catch (err) {
    fetchError = true;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-neutral-800 tracking-tight">Clinical Dashboard</h1>
        <p className="text-sm text-neutral-500 leading-relaxed max-w-xl">
          Review wellness indicators for your assigned students, manage booking availability, and track critical campus safety alerts.
        </p>
      </div>

      <CounselorDashboardContainer
        roster={roster}
        slots={slots}
        riskAlerts={riskAlerts}
        tenantSubdomain={resolvedParams.tenant}
        hasError={fetchError}
      />
    </div>
  );
}
