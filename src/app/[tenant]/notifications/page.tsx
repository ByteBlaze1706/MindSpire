// src/app/[tenant]/notifications/page.tsx
import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';
import { UserRepository } from '../../../lib/repositories/user.repository';
import { NotificationRepository, NotificationLog } from '../../../lib/repositories/notification.repository';
import { NotificationsFeed } from './notifications-feed'; // Client container

const userRepo = new UserRepository();
const notifRepo = new NotificationRepository();

export default async function NotificationsCenterPage({
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
  if (!profile) {
    redirect(`/${resolvedParams.tenant}/login`);
  }

  let list: NotificationLog[] = [];
  let fetchError = false;

  try {
    list = await notifRepo.getNotifications(user.id);
  } catch (err) {
    fetchError = true;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-neutral-800 tracking-tight">Notification Center</h1>
        <p className="text-sm text-neutral-500 leading-relaxed max-w-xl">
          Track replies, community reactions, announcements, and recommended resources tailored to your wellness.
        </p>
      </div>

      <NotificationsFeed
        notifications={list}
        tenantSubdomain={resolvedParams.tenant}
        hasError={fetchError}
      />
    </div>
  );
}
