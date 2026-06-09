// src/app/[tenant]/dashboard/layout.tsx
import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';
import { UserRepository } from '../../../lib/repositories/user.repository';
import { EmergencySupportWidget } from '../../../components/dashboard/emergency-support';
import { MobileNav } from '../../../components/dashboard/mobile-nav'; // We'll create this helper client component

const userRepo = new UserRepository();

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
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

  const isStaff = ['moderator', 'inst_admin', 'super_admin'].includes(profile.role);

  const navLinks = [
    { href: `/${resolvedParams.tenant}/dashboard`, label: 'Dashboard' },
    { href: `/${resolvedParams.tenant}/community`, label: 'Community Feed' },
    { href: `/${resolvedParams.tenant}/journal`, label: 'Wellness Journal' },
    { href: `/${resolvedParams.tenant}/assessments`, label: 'Assessments' },
    { href: `/${resolvedParams.tenant}/resources`, label: 'Resource Hub' },
    { href: `/${resolvedParams.tenant}/playhub`, label: 'PlayHub Tools' },
    { href: `/${resolvedParams.tenant}/notifications`, label: 'Notification Center' },
    { href: `/${resolvedParams.tenant}/settings`, label: 'Settings' },
  ];

  if (isStaff) {
    navLinks.push({ href: `/${resolvedParams.tenant}/moderation`, label: 'Moderation Queue' });
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#FDFBF7] via-[#F5EBE6] to-[#E3EFF3] flex flex-col md:flex-row antialiased">
      {/* Desktop Sidebar Navigation */}
      <aside className="hidden md:flex w-64 bg-white/70 backdrop-blur-md border-r border-neutral-100 flex-col p-6 space-y-8 sticky top-0 h-screen">
        <div>
          <span className="block text-xs font-semibold uppercase tracking-widest text-neutral-400">
            Wellness Portal
          </span>
          <span className="block text-xl font-semibold text-neutral-800 tracking-tight mt-1">
            MindSpire
          </span>
        </div>

        <nav className="flex-1 flex flex-col gap-1 overflow-y-auto">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 rounded-2xl transition duration-150"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-neutral-100 pt-6">
          <span className="block text-xs font-semibold text-neutral-400">Signed in as</span>
          <span className="block text-xs font-semibold text-neutral-700 truncate mt-1">
            {profile.email}
          </span>
          <span className="inline-block mt-1.5 px-2 py-0.5 bg-neutral-100 border border-neutral-200 text-[10px] uppercase font-bold text-neutral-600 rounded-md">
            {profile.role}
          </span>
        </div>
      </aside>

      {/* Mobile Top Navigation */}
      <MobileNav navLinks={navLinks} profileEmail={profile.email} profileRole={profile.role} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-y-auto min-w-0">
        <main className="p-4 md:p-8 max-w-5xl w-full mx-auto space-y-8 mt-16 md:mt-0">
          {children}
        </main>
      </div>

      {/* Floating Emergency Widget */}
      <EmergencySupportWidget />
    </div>
  );
}
