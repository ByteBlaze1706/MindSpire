// src/app/[tenant]/playhub/page.tsx
import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';
import { PlayHubTools } from '../../../components/playhub/playhub-tools';

export default async function StudentPlayHubPage({
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

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-semibold text-neutral-800 tracking-tight">
          PlayHub
        </h2>
        <p className="text-sm text-neutral-500 mt-1">
          Simple, interactive micro-tools to help you focus, breathe, meditate, and build positivity.
        </p>
      </div>

      <PlayHubTools />
    </div>
  );
}
