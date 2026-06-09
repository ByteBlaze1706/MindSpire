// src/components/providers/tenant-provider.tsx
'use client';

import React, { createContext, useContext, useEffect } from 'react';

export interface TenantConfig {
  id: string;
  name: string;
  subdomain: string;
  branding_config: {
    primaryColor: string;
    accentColor: string;
    logoUrl: string;
    supportEmail: string;
    emergencyPhone: string;
  };
  allowed_domains: string[];
}

const TenantContext = createContext<TenantConfig | null>(null);

export function TenantProvider({
  tenant,
  children,
}: {
  tenant: TenantConfig;
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Inject custom branding variable styles into document head on client side
    const root = document.documentElement;
    if (tenant.branding_config.primaryColor) {
      root.style.setProperty('--primary', tenant.branding_config.primaryColor);
    }
    if (tenant.branding_config.accentColor) {
      root.style.setProperty('--accent', tenant.branding_config.accentColor);
    }
  }, [tenant]);

  return (
    <TenantContext.Provider value={tenant}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
