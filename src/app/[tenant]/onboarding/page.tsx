// src/app/[tenant]/onboarding/page.tsx
import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';
import { UserRepository } from '../../../lib/repositories/user.repository';
import { OnboardingForm } from '../../../components/auth/onboarding-form';

const userRepo = new UserRepository();

export default async function TenantOnboardingPage({
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

  // Fetch user profile to get institution context
  const profile = await userRepo.getById(user.id);
  if (!profile) {
    redirect(`/${resolvedParams.tenant}/login`);
  }

  // Fetch allowed counselor lists
  const counselors = await userRepo.getCounselorsByInstitution(profile.institution_id);

  return <OnboardingForm counselors={counselors} />;
}
