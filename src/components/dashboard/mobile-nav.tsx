// src/components/dashboard/mobile-nav.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface MobileNavProps {
  navLinks: { href: string; label: string }[];
  profileEmail: string;
  profileRole: string;
}

export function MobileNav({ navLinks, profileEmail, profileRole }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="md:hidden">
      {/* Top Navbar */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-neutral-100 flex items-center justify-between px-6 z-40">
        <span className="text-lg font-semibold text-neutral-800 tracking-tight">
          MindSpire
        </span>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-neutral-600 hover:text-neutral-900 focus:outline-none"
        >
          {isOpen ? (
            <span className="text-xl font-bold">✕</span>
          ) : (
            <span className="text-xl">☰</span>
          )}
        </button>
      </header>

      {/* Drawer Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer Menu */}
      <div
        className={`fixed top-16 bottom-0 left-0 w-64 bg-white border-r border-neutral-100 z-30 flex flex-col p-6 space-y-6 transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <nav className="flex-1 flex flex-col gap-1 overflow-y-auto">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className="px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 rounded-2xl transition duration-150"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-neutral-100 pt-6">
          <span className="block text-xs font-semibold text-neutral-400">Signed in as</span>
          <span className="block text-xs font-semibold text-neutral-700 truncate mt-1">
            {profileEmail}
          </span>
          <span className="inline-block mt-1 px-2 py-0.5 bg-neutral-100 border border-neutral-200 text-[10px] uppercase font-bold text-neutral-600 rounded-md">
            {profileRole}
          </span>
        </div>
      </div>
    </div>
  );
}
