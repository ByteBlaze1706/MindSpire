// src/components/community/crisis-alert-modal.tsx
'use client';

import React from 'react';
import { useTenant } from '../providers/tenant-provider';

interface CrisisAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CrisisAlertModal({ isOpen, onClose }: CrisisAlertModalProps) {
  const tenant = useTenant();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-8 border border-neutral-100 shadow-2xl space-y-6 animate-scale-up">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-rose-50 rounded-full text-rose-600 text-3xl">
            🤝
          </div>
          <h2 className="text-2xl font-semibold text-neutral-800 tracking-tight">
            You Are Not Alone. We Are Here.
          </h2>
          <p className="text-sm text-neutral-500 leading-relaxed">
            It looks like you might be going through a challenging moment. We want to support you. You can connect with professional counseling immediately and confidentially.
          </p>
        </div>

        {/* Emergency Contact List */}
        <div className="space-y-3">
          <div className="p-4 bg-rose-50/50 border border-rose-100 rounded-2xl flex flex-col justify-between items-start">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800">
              National Mental Health Helpline (India)
            </span>
            <span className="text-lg font-bold text-neutral-800 mt-1">Tele-MANAS</span>
            <div className="flex flex-wrap gap-2 mt-2 w-full">
              <a
                href="tel:14416"
                className="flex-1 text-center py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition duration-150"
              >
                Call 14416
              </a>
              <a
                href="tel:1-800-891-4416"
                className="flex-1 text-center py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition duration-150"
              >
                Call 1-800-891-4416
              </a>
            </div>
          </div>

          <div className="p-4 bg-neutral-50 border border-neutral-100 rounded-2xl flex justify-between items-center">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                Campus Safety & Support
              </span>
              <p className="text-sm font-semibold text-neutral-800 mt-1">{tenant.name} Helpline</p>
            </div>
            <a
              href={`tel:${tenant.branding_config.emergencyPhone || '911'}`}
              className="py-2 px-4 bg-neutral-800 hover:bg-neutral-900 text-white rounded-xl text-xs font-semibold transition duration-150"
            >
              Call {tenant.branding_config.emergencyPhone || '911'}
            </a>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="w-full py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-2xl text-xs font-semibold transition duration-150"
          >
            I understand, thank you
          </button>
        </div>
      </div>
    </div>
  );
}
