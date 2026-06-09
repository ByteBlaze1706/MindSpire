// src/components/auth/signup-form.tsx
'use client';

import React, { useState } from 'react';
import { signUpStudentAnonymously } from '../../lib/actions/auth.actions';
import { useTenant } from '../providers/tenant-provider';

export function SignupForm() {
  const tenant = useTenant();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Form values
  const [pseudonym, setPseudonym] = useState('');
  const [pin, setPin] = useState('');
  const [tokenId, setTokenId] = useState('');

  const adjectives = ['Quiet', 'Calm', 'Gentle', 'Warm', 'Serene', 'Peaceful', 'Soft', 'Silent', 'Restful', 'Mindful', 'Friendly', 'Joyful', 'Kind', 'Bright', 'Tranquil', 'Brave', 'Strong', 'Radiant'];
  const nouns = ['Lotus', 'Lily', 'Rose', 'Sage', 'Petal', 'Forest', 'Ocean', 'River', 'Breeze', 'Meadow', 'Pebble', 'Otter', 'Panda', 'Koala', 'Robin', 'Bluebird', 'Fern', 'Willow'];

  const handleGenerateAlias = () => {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 900) + 100;
    setPseudonym(`${adj} ${noun} ${num}`);
  };

  const generateTokenId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const generated = `${tenant.subdomain.toUpperCase()}-${code}`;
    setTokenId(generated);
  };

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pseudonym.trim()) {
      setErrorMsg('Please choose or generate an alias.');
      return;
    }
    setErrorMsg(null);
    generateTokenId();
    setStep(2);
  };

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(pin)) {
      setErrorMsg('PIN must be exactly 6 numeric digits.');
      return;
    }
    setErrorMsg(null);
    setStep(3);
  };

  const handleFinish = async () => {
    setLoading(true);
    setErrorMsg(null);
    const result = await signUpStudentAnonymously({
      pseudonym: pseudonym.trim(),
      tokenId: tokenId,
      pin: pin,
      tenantSubdomain: tenant.subdomain,
    });
    if (result && !result.success) {
      setErrorMsg(result.error || 'Registration failed.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#E3EFF3] via-[#F5EBE6] to-[#FDFBF7] p-6 relative overflow-hidden">
      {/* Floating decorative elements */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-sky-200/20 rounded-full blur-3xl animate-pulse-slow -z-10" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-amber-100/20 rounded-full blur-3xl animate-pulse-slow -z-10" />
      <div className="absolute top-1/3 right-1/4 w-60 h-60 bg-rose-100/10 rounded-full blur-2xl animate-float -z-10" />
      <div className="absolute bottom-1/3 left-1/4 w-80 h-80 bg-teal-100/10 rounded-full blur-2xl animate-float-reverse -z-10" />

      <div className="w-full max-w-md p-8 bg-white/40 backdrop-blur-xl border border-white/50 rounded-[32px] shadow-2xl shadow-neutral-200/50 relative">
        <div className="absolute top-4 right-4 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest">Sanctuary Shield</span>
        </div>

        <div className="mb-8 text-center">
          <h2 className="text-2xl font-semibold text-neutral-800 tracking-tight flex items-center justify-center gap-2">
            <span>🌸</span> MindSpire Signup
          </h2>
          <p className="mt-1.5 text-xs text-neutral-500">
            Step {step} of 3 • Secure Student Enrollment
          </p>
        </div>

        {errorMsg && (
          <div className="p-4 mb-6 text-xs text-rose-600 bg-rose-50/80 backdrop-blur-sm border border-rose-100 rounded-2xl text-left">
            {errorMsg}
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleStep1Submit} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">
                What would you like to be called anonymously?
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Calm Sparrow"
                  value={pseudonym}
                  onChange={(e) => setPseudonym(e.target.value)}
                  className="flex-1 px-4 py-3 bg-white/80 border border-neutral-200 focus:border-neutral-400 focus:bg-white rounded-2xl outline-none transition text-sm text-neutral-800"
                  required
                />
                <button
                  type="button"
                  onClick={handleGenerateAlias}
                  className="px-4 py-3 bg-neutral-900 text-white hover:bg-neutral-800 rounded-2xl text-xs font-medium transition cursor-pointer"
                >
                  🎲 Generate
                </button>
              </div>
              <p className="mt-2 text-[10px] text-neutral-450 leading-normal">
                Examples: Calm Sparrow, Quiet River, Brave Willow. This is your safe peer handle.
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-2xl transition cursor-pointer"
            >
              Continue to Step 2
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleStep2Submit} className="space-y-6">
            <div className="p-5 bg-gradient-to-br from-[#E3EFF3] to-[#F5EBE6] border border-white/50 rounded-3xl text-center space-y-2">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">Your Secure Token ID</span>
              <span className="block text-2xl font-mono font-bold text-neutral-800 tracking-wide">{tokenId}</span>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">
                Create a 6-digit PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="••••••"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                className="w-full text-center tracking-widest px-4 py-3 bg-white/80 border border-neutral-200 focus:border-neutral-400 focus:bg-white rounded-2xl outline-none transition text-lg font-bold text-neutral-800"
                required
              />
              <p className="mt-2 text-[10px] text-neutral-450 text-center leading-normal">
                Enter exactly 6 numeric digits. You will use this PIN to log in.
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-850 rounded-2xl transition cursor-pointer"
            >
              Continue to Step 3
            </button>
          </form>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="p-6 bg-emerald-50/60 border border-emerald-100 rounded-3xl space-y-4">
              <div className="text-center">
                <span className="text-3xl">🛡️</span>
                <h4 className="text-sm font-bold text-emerald-800 mt-2">Privacy Lock Active</h4>
              </div>
              <div className="space-y-3 text-xs border-t border-emerald-100/50 pt-3">
                <div className="flex justify-between">
                  <span className="text-emerald-700">Anonymous Name:</span>
                  <span className="font-bold text-emerald-900">{pseudonym}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-700">Token ID:</span>
                  <span className="font-mono font-bold text-emerald-900">{tokenId}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-amber-50/60 border border-amber-100 rounded-2xl text-left flex gap-2">
              <span className="text-sm">⚠️</span>
              <p className="text-[10px] text-amber-800 leading-normal">
                <strong>Important:</strong> Counselors and administrators only see this anonymous identity. Real emails and names are never collected. You must store your Token ID and 6-digit PIN to log back in.
              </p>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={handleFinish}
              className="w-full py-3.5 text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-300 rounded-2xl transition cursor-pointer"
            >
              {loading ? 'Creating Sanctuary Account...' : 'Save Token & Enter Sanctuary'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
