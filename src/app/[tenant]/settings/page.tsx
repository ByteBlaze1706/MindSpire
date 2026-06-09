// src/app/[tenant]/settings/page.tsx
import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';
import { AccessibilityControls } from '../../../components/settings/accessibility-controls';

export default async function StudentSettingsPage({
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

  // Server Action inline to update settings preference
  const handleUpdatePreferences = async (formData: FormData) => {
    'use server';
    const email = formData.get('emailNotif') === 'on';
    const push = formData.get('pushNotif') === 'on';
    const inApp = formData.get('inAppNotif') === 'on';

    const client = await createClient();
    await client
      .from('notification_preferences')
      .update({
        email_enabled: email,
        push_enabled: push,
        in_app_enabled: inApp,
      })
      .eq('user_id', user.id);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-semibold text-neutral-800 tracking-tight">
          Settings
        </h2>
        <p className="text-sm text-neutral-500 mt-1">
          Manage your account preferences, language, and accessibility tools.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Accessibility Panel */}
        <AccessibilityControls />

        {/* Preferences Form */}
        <div className="p-6 bg-white/70 backdrop-blur-md border border-neutral-100 rounded-3xl h-fit space-y-6">
          <h3 className="text-lg font-semibold text-neutral-800 tracking-tight">
            Notification Settings
          </h3>

          <form action={handleUpdatePreferences} className="space-y-4">
            <label className="flex items-center justify-between p-4 bg-neutral-50 border border-neutral-200/50 rounded-2xl cursor-pointer">
              <div>
                <span className="block text-sm font-semibold text-neutral-700">Email Updates</span>
                <span className="block text-xs text-neutral-400 mt-0.5">Alerts dispatched via email.</span>
              </div>
              <input
                type="checkbox"
                name="emailNotif"
                defaultChecked
                className="w-5 h-5 rounded-md border-neutral-300 text-neutral-800 focus:ring-neutral-500 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-4 bg-neutral-50 border border-neutral-200/50 rounded-2xl cursor-pointer">
              <div>
                <span className="block text-sm font-semibold text-neutral-700">Web Push Alerts</span>
                <span className="block text-xs text-neutral-400 mt-0.5">Real-time alerts sent to your browser.</span>
              </div>
              <input
                type="checkbox"
                name="pushNotif"
                defaultChecked
                className="w-5 h-5 rounded-md border-neutral-300 text-neutral-800 focus:ring-neutral-500 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-4 bg-neutral-50 border border-neutral-200/50 rounded-2xl cursor-pointer">
              <div>
                <span className="block text-sm font-semibold text-neutral-700">In-App Notifications</span>
                <span className="block text-xs text-neutral-400 mt-0.5">View indicators in your dashboard.</span>
              </div>
              <input
                type="checkbox"
                name="inAppNotif"
                defaultChecked
                className="w-5 h-5 rounded-md border-neutral-300 text-neutral-800 focus:ring-neutral-500 cursor-pointer"
              />
            </label>

            <button
              type="submit"
              className="w-full py-3.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-2xl text-sm font-medium transition cursor-pointer"
            >
              Save Preferences
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
