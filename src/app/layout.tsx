// src/app/layout.tsx
import React from 'react';
import '../styles/globals.css';
import { TenantRepository } from '../lib/repositories/tenant.repository';
import { TenantProvider } from '../components/providers/tenant-provider';

const tenantRepo = new TenantRepository();

export const metadata = {
  title: 'MindSpire - Digital Wellness Platform',
  description: 'Empowering Minds, Enabling Change.',
};

const fallbackTenant = {
  id: 'e5f6a7b8-3333-3333-3333-333333333333',
  name: 'NMIMS University',
  subdomain: 'nmims',
  branding_config: {
    logoUrl: '',
    accentColor: '#FFC107',
    primaryColor: '#D32F2F',
    supportEmail: 'wellness@nmims.edu',
    emergencyPhone: '022-42355555'
  },
  access_code: null,
  allowed_domains: [] as string[],
  created_at: ''
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tenantKey = process.env.NEXT_PUBLIC_TENANT_KEY || 'nmims';
  let tenant = await tenantRepo.getBySubdomain(tenantKey);
  if (!tenant) {
    tenant = fallbackTenant;
  }

  return (
    <html lang="en">
      <body>
        <TenantProvider tenant={tenant}>
          {children}
        </TenantProvider>
      </body>
    </html>
  );
}

