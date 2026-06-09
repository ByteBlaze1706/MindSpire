// src/app/[tenant]/dashboard/page.tsx
import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';
import { UserRepository } from '../../../lib/repositories/user.repository';
import { MoodRepository } from '../../../lib/repositories/mood.repository';
import { CMSRepository } from '../../../lib/repositories/cms.repository';
import { WellnessService } from '../../../lib/services/wellness.service';
import { WellnessScoreRing } from '../../../components/dashboard/wellness-score-ring';
import { MoodCheckIn } from '../../../components/dashboard/mood-checkin';
import { MoodAnalytics } from '../../../components/dashboard/mood-analytics';

const userRepo = new UserRepository();
const moodRepo = new MoodRepository();
const cmsRepo = new CMSRepository();
const wellnessService = new WellnessService();

export default async function StudentDashboardPage({
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

  // Fetch score, historical logs, streak, and announcements
  const wellnessScore = await wellnessService.calculateCompoundScore(user.id);
  const moods = await moodRepo.getMoodsByDays(user.id, 7);
  const streak = await moodRepo.getWellnessStreak(user.id);
  const announcements = await cmsRepo.getAnnouncements(profile.institution_id, profile.role);

  return (
    <div className="space-y-8">
      {/* Top Banner section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-semibold text-neutral-800 tracking-tight">
            Hello there
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            Welcome back to your MindSpire space. Take a moment to check in with yourself.
          </p>
        </div>

        {/* Streak indicator */}
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-amber-50 border border-amber-100 rounded-2xl">
          <span className="text-xl">🔥</span>
          <div>
            <span className="block text-[9px] uppercase font-bold text-amber-600 tracking-wider">
              Wellness Streak
            </span>
            <span className="block text-xs font-semibold text-neutral-700">
              {streak} {streak === 1 ? 'Day' : 'Days'}
            </span>
          </div>
        </div>
      </div>

      {/* Announcements */}
      {announcements.length > 0 && (
        <div className="p-5 bg-amber-50/50 border border-amber-100 rounded-3xl space-y-2">
          <span className="text-[10px] uppercase font-bold text-amber-600 tracking-widest">
            Campus Announcements
          </span>
          <h4 className="text-sm font-semibold text-neutral-800">{announcements[0].title}</h4>
          <p className="text-xs text-neutral-600 leading-relaxed">{announcements[0].content}</p>
        </div>
      )}

      {/* Grid of wellness tools */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <WellnessScoreRing score={wellnessScore} />
        </div>
        <div className="md:col-span-2">
          <MoodCheckIn />
        </div>
      </div>

      {/* Chart */}
      <MoodAnalytics history={moods} />
    </div>
  );
}
