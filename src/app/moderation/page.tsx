// src/app/[tenant]/moderation/page.tsx
import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';
import { UserRepository } from '../../lib/repositories/user.repository';
import { CommunityRepository, ModerationReport, ModerationAppeal } from '../../lib/repositories/community.repository';
import { ModerationContainer } from './moderation-container'; // Client container

const userRepo = new UserRepository();
const communityRepo = new CommunityRepository();

export default async function ModerationPortalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const profile = await userRepo.getById(user.id);
  if (!profile || !['moderator', 'inst_admin', 'super_admin'].includes(profile.role)) {
    redirect('/dashboard'); // Non-staff redirected to student dashboard
  }

  // Fetch pending reports and appeals
  let reports: ModerationReport[] = [];
  let appeals: ModerationAppeal[] = [];
  let fetchError = false;

  try {
    reports = await communityRepo.getModerationQueue(profile.institution_id);
    appeals = await communityRepo.getAppeals(profile.institution_id);
  } catch (err) {
    fetchError = true;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-neutral-800 tracking-tight">Safety & Moderation Center</h1>
        <p className="text-sm text-neutral-500 leading-relaxed max-w-xl">
          Review community reports, issue restrictions, resolve student appeals, and enforce campus wellness guidelines.
        </p>
      </div>

      <ModerationContainer
        reports={reports}
        appeals={appeals}
        tenantSubdomain={process.env.NEXT_PUBLIC_TENANT_KEY || 'nmims'}
        hasError={fetchError}
      />
    </div>
  );
}
