// src/app/[tenant]/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';

export default async function TenantRootPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const resolvedParams = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect(`/${resolvedParams.tenant}/dashboard`);
  } else {
    redirect(`/${resolvedParams.tenant}/login`);
  }
}
