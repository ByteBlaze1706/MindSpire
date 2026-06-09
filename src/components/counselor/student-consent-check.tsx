// src/components/counselor/student-consent-check.tsx
'use client';

import React from 'react';

interface StudentConsentCheckProps {
  hasConsent: boolean;
  type: 'journals' | 'ai_chats';
  studentPseudonym: string;
  children: React.ReactNode;
}

export function StudentConsentCheck({
  hasConsent,
  type,
  studentPseudonym,
  children,
}: StudentConsentCheckProps) {
  if (hasConsent) {
    return <>{children}</>;
  }

  const label = type === 'journals' ? 'Wellness Journal Logs' : 'AI Chat Sessions';

  return (
    <div className="relative overflow-hidden rounded-3xl border border-neutral-100 bg-white/40 backdrop-blur-sm p-8 flex flex-col items-center justify-center text-center space-y-4 shadow-sm min-h-[200px]">
      <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 text-lg animate-pulse">
        🔒
      </div>
      
      <div className="space-y-1">
        <h4 className="text-sm font-bold text-neutral-800 tracking-tight">Clinical Consent Required</h4>
        <span className="inline-block px-2 py-0.5 bg-neutral-100 border border-neutral-200 text-[8px] uppercase tracking-wider font-bold rounded text-neutral-500">
          Target: {label}
        </span>
      </div>

      <p className="text-xs text-neutral-500 max-w-sm leading-relaxed">
        The student <strong>{studentPseudonym}</strong> has not authorized sharing for this resource. To enable access, the student must toggle consent settings in their personal onboarding/settings wizard.
      </p>
    </div>
  );
}
