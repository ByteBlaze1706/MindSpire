// src/app/page.tsx
import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '../lib/supabase/server';

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#FDFBF7] via-[#F5EBE6] to-[#E3EFF3] flex flex-col justify-between antialiased">
      {/* Header */}
      <header className="px-6 py-5 md:px-12 flex items-center justify-between border-b border-white/20 bg-white/10 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight text-neutral-800">MindSpire</span>
          <span className="px-2 py-0.5 text-[10px] font-semibold text-neutral-500 bg-neutral-100/80 rounded-full">Sanctuary</span>
        </div>
        <div>
          <Link
            href="/login"
            className="px-4 py-2 text-xs font-semibold text-neutral-700 hover:text-neutral-900 transition"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="ml-3 px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-850 rounded-full transition shadow-sm"
          >
            Register
          </Link>
        </div>
      </header>

      {/* Hero Body */}
      <main className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="max-w-4xl w-full text-center space-y-12">
          {/* Tagline & Title */}
          <div className="space-y-6 max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-neutral-600 bg-neutral-100/70 border border-neutral-200/40 rounded-full">
              ✨ Zero Identity Leakage Design
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-neutral-800 tracking-tight leading-tight">
              Your Secure, Anonymous <br className="hidden md:block" />
              Sanctuary for Wellness.
            </h1>
            <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
              MindSpire is a privacy-first mental wellness space built from the ground up to protect you. 
              Share your thoughts, chat with our AI companion, and consult clinical counselors without ever revealing your name, email, or identity.
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-4 text-sm font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-2xl transition duration-200 shadow-lg shadow-neutral-900/10 cursor-pointer text-center"
            >
              Start Anonymously
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-4 text-sm font-semibold text-neutral-700 bg-white/70 backdrop-blur-md border border-neutral-200 hover:bg-neutral-50 rounded-2xl transition duration-200 shadow-sm cursor-pointer text-center"
            >
              Access Your Space
            </Link>
          </div>

          {/* Privacy Value Proposition Columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left mt-8">
            <div className="p-6 bg-white/60 backdrop-blur-md border border-neutral-100 rounded-3xl space-y-3 shadow-sm hover:translate-y-[-2px] transition duration-200">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-lg">
                🔒
              </div>
              <h3 className="text-sm font-bold text-neutral-800 uppercase tracking-wide">Strict Anonymity</h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Counselors only see your system-generated Pseudonym and secure Token ID (e.g. <code className="bg-neutral-100 px-1 py-0.5 rounded text-[10px] font-mono text-neutral-600">NMIMS-529184</code>). Your real identity is strictly hidden.
              </p>
            </div>

            <div className="p-6 bg-white/60 backdrop-blur-md border border-neutral-100 rounded-3xl space-y-3 shadow-sm hover:translate-y-[-2px] transition duration-200">
              <div className="w-10 h-10 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-lg">
                🤖
              </div>
              <h3 className="text-sm font-bold text-neutral-800 uppercase tracking-wide">AI Companion</h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Log your moods and write in your digital journal. Our secure AI agent monitors self-harm risks and guides you with real-time coping strategies.
              </p>
            </div>

            <div className="p-6 bg-white/60 backdrop-blur-md border border-neutral-100 rounded-3xl space-y-3 shadow-sm hover:translate-y-[-2px] transition duration-200">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-lg">
                ❤️
              </div>
              <h3 className="text-sm font-bold text-neutral-800 uppercase tracking-wide">Counselor Support</h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                If the AI companion detects high stress, you can easily share anonymized logs with a counselor and schedule confidential session chats.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-white/20 text-center text-[10px] uppercase font-bold tracking-wider text-neutral-400">
        Safe • Supportive • Completely Confidential
      </footer>
    </div>
  );
}
