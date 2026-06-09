// src/components/auth/onboarding-form.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { submitOnboardingFlow } from '../../lib/actions/onboarding.actions';
import { useTenant } from '../providers/tenant-provider';

const onboardingSchema = z.object({
  realFirstName: z.string().min(1, 'Real first name is required.'),
  realLastName: z.string().min(1, 'Real last name is required.'),
  pseudonym: z.string().min(3, 'Pseudonym must be at least 3 characters.').max(30, 'Pseudonym is too long.'),
  tokenId: z.string().min(3, 'Token ID is required.'),
  languagePreference: z.string().default('en'),
  counselorId: z.string().optional(),
  shareConsent: z.boolean().default(false),
  consentDuration: z.string().default('30'),
  emailEnabled: z.boolean().default(true),
  pushEnabled: z.boolean().default(true),
  inAppEnabled: z.boolean().default(true),
});

type OnboardingInput = z.infer<typeof onboardingSchema>;

interface CounselorOption {
  id: string;
  email: string;
}

export function OnboardingForm({ counselors }: { counselors: CounselorOption[] }) {
  const tenant = useTenant();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
  });

  const generateAnonDetails = () => {
    const adjectives = ['Quiet', 'Calm', 'Gentle', 'Warm', 'Serene', 'Peaceful', 'Soft', 'Silent', 'Restful', 'Mindful', 'Friendly', 'Joyful', 'Kind', 'Bright', 'Tranquil', 'Brave', 'Strong', 'Radiant'];
    const nouns = ['Lotus', 'Lily', 'Rose', 'Sage', 'Petal', 'Forest', 'Ocean', 'River', 'Breeze', 'Meadow', 'Pebble', 'Otter', 'Panda', 'Koala', 'Robin', 'Bluebird', 'Fern', 'Willow'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 900) + 100;
    const name = `${adj} ${noun} ${num}`;
    
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let token = '';
    for (let i = 0; i < 6; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const tokenId = `${tenant.subdomain.toUpperCase()}-${token}`;
    
    setValue('pseudonym', name);
    setValue('tokenId', tokenId);
  };

  useEffect(() => {
    generateAnonDetails();
  }, [tenant]);

  const watchShareConsent = watch('shareConsent');
  const watchCounselorId = watch('counselorId');

  const onSubmit = async (data: OnboardingInput) => {
    setLoading(true);
    setErrorMsg(null);

    const payload = {
      realFirstName: data.realFirstName,
      realLastName: data.realLastName,
      pseudonym: data.pseudonym,
      tokenId: data.tokenId,
      avatarConfig: { icon: 'otter', color: '#0F4C81' },
      languagePreference: data.languagePreference,
      notifications: {
        email: data.emailEnabled,
        push: data.pushEnabled,
        in_app: data.inAppEnabled,
      },
      counselorConsent:
        data.shareConsent && data.counselorId
          ? {
              counselorId: data.counselorId,
              grantType: 'both' as const,
              daysValid: parseInt(data.consentDuration, 10),
            }
          : undefined,
    };

    const result = await submitOnboardingFlow(tenant.subdomain, payload);

    if (result.success) {
      window.location.href = `/dashboard`;
    } else {
      setErrorMsg(result.error || 'Onboarding registration failed.');
      setLoading(false);
    }
  };

  const nextStep = () => setStep((s) => s + 1);
  const prevStep = () => setStep((s) => s - 1);

  return (
    <div className="w-full max-w-lg p-10 bg-white/80 backdrop-blur-md border border-neutral-100 rounded-3xl shadow-xl shadow-neutral-100/40">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Step {step} of 4
          </span>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`w-5 h-1.5 rounded-full transition duration-300 ${
                  i <= step ? 'bg-neutral-800' : 'bg-neutral-200'
                }`}
              />
            ))}
          </div>
        </div>
        <h2 className="text-2xl font-semibold text-neutral-800 tracking-tight">
          {step === 1 && 'Personal Profile Setup'}
          {step === 2 && 'Anonymous Community Handle'}
          {step === 3 && 'Notification Preferences'}
          {step === 4 && 'Counselor Consent Settings'}
        </h2>
        <p className="mt-1.5 text-sm text-neutral-500">
          {step === 1 && 'Configure your real identity settings. Names are encrypted.'}
          {step === 2 && 'Select a unique pseudonym for peer community chats.'}
          {step === 3 && 'Choose how and where you want to receive safety alerts.'}
          {step === 4 && 'Authorize consent-based access configuration.'}
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 mb-6 text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-2xl">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* STEP 1: Real Identity Details */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500 mb-2">
                Real First Name
              </label>
              <input
                {...register('realFirstName')}
                type="text"
                placeholder="Jane"
                className="w-full px-5 py-3.5 bg-neutral-50 border border-neutral-200 focus:border-neutral-400 focus:bg-white rounded-2xl outline-none transition duration-200 text-neutral-800 text-sm"
              />
              {errors.realFirstName && (
                <p className="mt-1.5 text-xs text-rose-500">{errors.realFirstName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500 mb-2">
                Real Last Name
              </label>
              <input
                {...register('realLastName')}
                type="text"
                placeholder="Doe"
                className="w-full px-5 py-3.5 bg-neutral-50 border border-neutral-200 focus:border-neutral-400 focus:bg-white rounded-2xl outline-none transition duration-200 text-neutral-800 text-sm"
              />
              {errors.realLastName && (
                <p className="mt-1.5 text-xs text-rose-500">{errors.realLastName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500 mb-2">
                Language Preference
              </label>
              <select
                {...register('languagePreference')}
                className="w-full px-5 py-3.5 bg-neutral-50 border border-neutral-200 focus:border-neutral-400 focus:bg-white rounded-2xl outline-none transition duration-200 text-neutral-800 text-sm appearance-none cursor-pointer"
              >
                <option value="en">English</option>
                <option value="hi">हिन्दी (Hindi)</option>
                <option value="mr">मराठी (Marathi)</option>
                <option value="ta">தமிழ் (Tamil)</option>
                <option value="te">తెలుగు (Telugu)</option>
                <option value="bn">বাংলা (Bengali)</option>
                <option value="gu">ગુજરાતી (Gujarati)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={nextStep}
              className="w-full py-4 text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-2xl transition duration-200 cursor-pointer"
            >
              Continue
            </button>
          </div>
        )}

        {/* STEP 2: Pseudonyms Handles */}
        {step === 2 && (
          <div className="space-y-5">
            <input type="hidden" {...register('pseudonym')} />
            <input type="hidden" {...register('tokenId')} />
            
            <div className="p-6 bg-gradient-to-br from-emerald-50/50 to-teal-50/50 border border-emerald-100/50 rounded-2xl text-center space-y-4 shadow-sm">
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">Your Anonymous Display Name</span>
                <span className="block text-2xl font-bold text-emerald-800 tracking-tight mt-1">{watch('pseudonym') || 'Generating...'}</span>
              </div>
              <div className="border-t border-emerald-100/50 pt-3">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">Your Secure Token ID</span>
                <span className="block text-lg font-mono font-bold text-teal-800 mt-1">{watch('tokenId') || 'Generating...'}</span>
              </div>
              
              <button
                type="button"
                onClick={generateAnonDetails}
                className="mt-2 text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline flex items-center gap-1.5 mx-auto cursor-pointer"
              >
                🔄 Generate New Identity
              </button>
            </div>
            
            <p className="text-xs text-neutral-400 text-center leading-normal">
              Counselors and peer students will only see this anonymous name and token ID. Your real identity remains encrypted.
            </p>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={prevStep}
                className="w-1/2 py-4 text-sm font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-2xl transition duration-200 cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={nextStep}
                className="w-1/2 py-4 text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-2xl transition duration-200 cursor-pointer"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Notification Preferences */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="space-y-4">
              <label className="flex items-center gap-3.5 p-4 bg-neutral-50 border border-neutral-100 rounded-2xl cursor-pointer hover:bg-neutral-100/50 transition duration-150">
                <input
                  type="checkbox"
                  {...register('emailEnabled')}
                  className="w-5 h-5 rounded-md border-neutral-300 text-neutral-800 focus:ring-neutral-500 cursor-pointer"
                />
                <div>
                  <span className="block text-sm font-medium text-neutral-700">Email Notifications</span>
                  <span className="block text-xs text-neutral-400">Receive copy logs and alert tickets.</span>
                </div>
              </label>

              <label className="flex items-center gap-3.5 p-4 bg-neutral-50 border border-neutral-100 rounded-2xl cursor-pointer hover:bg-neutral-100/50 transition duration-150">
                <input
                  type="checkbox"
                  {...register('pushEnabled')}
                  className="w-5 h-5 rounded-md border-neutral-300 text-neutral-800 focus:ring-neutral-500 cursor-pointer"
                />
                <div>
                  <span className="block text-sm font-medium text-neutral-700">Web Push Alerts</span>
                  <span className="block text-xs text-neutral-400">Real-time alerts directly on your browser device.</span>
                </div>
              </label>

              <label className="flex items-center gap-3.5 p-4 bg-neutral-50 border border-neutral-100 rounded-2xl cursor-pointer hover:bg-neutral-100/50 transition duration-150">
                <input
                  type="checkbox"
                  {...register('inAppEnabled')}
                  className="w-5 h-5 rounded-md border-neutral-300 text-neutral-800 focus:ring-neutral-500 cursor-pointer"
                />
                <div>
                  <span className="block text-sm font-medium text-neutral-700">In-App Notifications</span>
                  <span className="block text-xs text-neutral-400">Receive highlights inside the user portal.</span>
                </div>
              </label>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={prevStep}
                className="w-1/2 py-4 text-sm font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-2xl transition duration-200 cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={nextStep}
                className="w-1/2 py-4 text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-2xl transition duration-200 cursor-pointer"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Consent Sharing */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500 mb-2">
                Select Campus Counselor
              </label>
              <select
                {...register('counselorId')}
                className="w-full px-5 py-3.5 bg-neutral-50 border border-neutral-200 focus:border-neutral-400 focus:bg-white rounded-2xl outline-none transition duration-200 text-neutral-800 text-sm appearance-none cursor-pointer"
              >
                <option value="">-- No sharing (private mode) --</option>
                {counselors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.email}
                  </option>
                ))}
              </select>
            </div>

            {watchCounselorId && (
              <div className="space-y-4 p-4 border border-dashed border-neutral-200 rounded-2xl">
                <label className="flex items-start gap-3.5 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('shareConsent')}
                    className="w-5 h-5 mt-0.5 rounded-md border-neutral-300 text-neutral-800 focus:ring-neutral-500 cursor-pointer"
                  />
                  <div className="flex-1">
                    <span className="block text-xs font-semibold text-neutral-700">Authorize Counseling Access</span>
                    <span className="block text-xs text-neutral-400 leading-relaxed mt-1">
                      By checking this, you allow your counselor to view your wellness journals and AI chat history for therapy validation.
                    </span>
                  </div>
                </label>

                {watchShareConsent && (
                  <div>
                    <label className="block text-xs font-semibold text-neutral-600 mb-2">
                      Consent Validity Duration
                    </label>
                    <select
                      {...register('consentDuration')}
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl outline-none text-xs"
                    >
                      <option value="7">7 Days</option>
                      <option value="30">30 Days</option>
                      <option value="90">90 Days</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="button"
                disabled={loading}
                onClick={prevStep}
                className="w-1/2 py-4 text-sm font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-2xl transition duration-200 cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-1/2 py-4 text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-300 rounded-2xl transition duration-200 cursor-pointer"
              >
                {loading ? 'Submitting...' : 'Complete'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
