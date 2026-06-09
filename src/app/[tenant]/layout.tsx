// src/app/[tenant]/layout.tsx
import React from 'react';
import { notFound } from 'next/navigation';
import { TenantRepository } from '../../lib/repositories/tenant.repository';
import { TenantProvider } from '../../components/providers/tenant-provider';

const tenantRepo = new TenantRepository();

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const resolvedParams = await params;
  const tenant = await tenantRepo.getBySubdomain(resolvedParams.tenant);

  if (!tenant) {
    notFound();
  }

  return (
    <TenantProvider tenant={tenant}>
      <div className="min-h-screen bg-gradient-to-tr from-neutral-50 via-neutral-100/50 to-neutral-200/30 flex flex-col antialiased">
        <header className="px-8 py-6 flex items-center justify-between border-b border-neutral-100/50 bg-white/30 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {tenant.branding_config.logoUrl ? (
              <img
                src={tenant.branding_config.logoUrl}
                alt={tenant.name}
                className="h-8 w-auto object-contain"
              />
            ) : (
              <span className="font-semibold text-lg text-neutral-800 tracking-tight">
                {tenant.name}
              </span>
            )}
            <span className="h-4 w-[1px] bg-neutral-300" />
            <span className="text-sm font-medium text-neutral-500 tracking-wide">
              MindSpire
            </span>
          </div>

          <a
            href={`tel:${tenant.branding_config.emergencyPhone}`}
            className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-full transition duration-150"
          >
            Emergency: {tenant.branding_config.emergencyPhone}
          </a>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          {children}
        </main>
      </div>
    </TenantProvider>
  );
}
