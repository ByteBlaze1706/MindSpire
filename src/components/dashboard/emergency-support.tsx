// src/components/dashboard/emergency-support.tsx
'use client';

import React, { useState } from 'react';
import { useTenant } from '../providers/tenant-provider';

export function EmergencySupportWidget() {
  const tenant = useTenant();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 px-5 py-3.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold uppercase tracking-wider rounded-full shadow-lg shadow-rose-600/20 transition-all duration-200 z-50 flex items-center gap-2 cursor-pointer"
      >
        <svg className="w-4.5 h-4.5 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        Emergency Support
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-neutral-100 rounded-3xl p-8 shadow-2xl relative">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-600 rounded-full cursor-pointer"
            >
              ✕
            </button>

            <div className="mb-6 flex items-center gap-3">
              <div className="p-2.5 bg-rose-50 rounded-2xl">
                <svg className="w-6 h-6 text-rose-600 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-neutral-800 tracking-tight">
                  Emergency Support
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Reach out for professional support anytime.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* College campus emergency line */}
              <div className="p-4 bg-rose-50/50 border border-rose-100 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    {tenant.name} Campus Support
                  </span>
                  <span className="block text-base font-semibold text-rose-700 mt-0.5">
                    {tenant.branding_config.emergencyPhone}
                  </span>
                </div>
                <a
                  href={`tel:${tenant.branding_config.emergencyPhone}`}
                  className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-500 transition duration-150"
                >
                  Call
                </a>
              </div>

              {/* Tele-MANAS short code */}
              <div className="p-4 bg-neutral-50 border border-neutral-200/50 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    Tele-MANAS Toll-Free
                  </span>
                  <span className="block text-base font-semibold text-neutral-700 mt-0.5">
                    Call 14416
                  </span>
                </div>
                <a
                  href="tel:14416"
                  className="px-4 py-2 bg-neutral-900 text-white rounded-xl text-xs font-semibold hover:bg-neutral-800 transition duration-150"
                >
                  Call
                </a>
              </div>

              {/* Tele-MANAS toll free full number */}
              <div className="p-4 bg-neutral-50 border border-neutral-200/50 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    Tele-MANAS Support Line
                  </span>
                  <span className="block text-base font-semibold text-neutral-700 mt-0.5">
                    Call 1-800-891-4416
                  </span>
                </div>
                <a
                  href="tel:18008914416"
                  className="px-4 py-2 bg-neutral-900 text-white rounded-xl text-xs font-semibold hover:bg-neutral-800 transition duration-150"
                >
                  Call
                </a>
              </div>
            </div>

            <p className="mt-6 text-[10px] text-center text-neutral-400 leading-relaxed">
              If you are undergoing severe emotional distress, please reach out to one of the counselors listed in the portal or dial the emergency lines immediately.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
