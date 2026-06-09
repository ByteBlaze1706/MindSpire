// src/components/dashboard/mood-checkin.tsx
'use client';

import React, { useState } from 'react';
import { submitDailyMoodCheckIn } from '../../lib/actions/mood.actions';
import { useTenant } from '../providers/tenant-provider';
import { MoodDescriptor } from '../../lib/repositories/mood.repository';

const MOOD_OPTIONS: { value: MoodDescriptor; emoji: string; label: string }[] = [
  { value: 'Happy', emoji: '😄', label: 'Happy' },
  { value: 'Calm', emoji: '😌', label: 'Calm' },
  { value: 'Motivated', emoji: '✨', label: 'Motivated' },
  { value: 'Neutral', emoji: '😐', label: 'Neutral' },
  { value: 'Stressed', emoji: '😰', label: 'Stressed' },
  { value: 'Anxious', emoji: '😟', label: 'Anxious' },
  { value: 'Exhausted', emoji: '🥱', label: 'Exhausted' },
  { value: 'Sad', emoji: '😢', label: 'Sad' },
];

const SUGGESTED_TAGS = ['exams', 'sleep', 'family', 'friends', 'exercise', 'hobbies', 'social', 'health'];

export function MoodCheckIn() {
  const tenant = useTenant();
  const [selectedMood, setSelectedMood] = useState<MoodDescriptor | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ success: boolean; message?: string } | null>(null);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMood === null) return;

    setLoading(true);
    setStatus(null);

    const result = await submitDailyMoodCheckIn(
      tenant.subdomain,
      selectedMood,
      selectedTags,
      notes.trim() || null
    );

    if (result.success) {
      setStatus({ success: true, message: 'Your daily check-in has been logged.' });
      setTimeout(() => {
        setStatus(null);
        setSelectedMood(null);
        setSelectedTags([]);
        setNotes('');
      }, 3000);
    } else {
      setStatus({ success: false });
    }
    setLoading(false);
  };

  return (
    <div className="p-6 bg-white/70 backdrop-blur-md border border-neutral-100 rounded-3xl shadow-sm">
      <h3 className="text-lg font-semibold text-neutral-800 tracking-tight mb-2">
        How are you feeling right now?
      </h3>
      <p className="text-xs text-neutral-500 mb-6">
        Log your current feeling to sync with your wellness streak and indicator.
      </p>

      {status && status.success ? (
        <div className="py-12 text-center text-sm font-medium text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-2xl">
          ✓ {status.message}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Emojis Grid */}
          <div className="grid grid-cols-4 gap-2.5">
            {MOOD_OPTIONS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setSelectedMood(m.value)}
                className={`py-3.5 flex flex-col items-center justify-center border rounded-2xl transition duration-200 cursor-pointer ${
                  selectedMood === m.value
                    ? 'border-neutral-800 bg-neutral-900 text-white shadow-md'
                    : 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-600'
                }`}
              >
                <span className="text-2xl mb-1">{m.emoji}</span>
                <span className="text-[10px] font-semibold tracking-wide">
                  {m.label}
                </span>
              </button>
            ))}
          </div>

          {/* Tags */}
          {selectedMood !== null && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400">
                What triggers or tags define this state?
              </label>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_TAGS.map((tag) => {
                  const active = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full border transition duration-150 cursor-pointer ${
                        active
                          ? 'border-neutral-800 bg-neutral-800 text-white'
                          : 'border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-500'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Note */}
          {selectedMood !== null && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Reflection Note
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Reflect briefly on what is contributing to this state..."
                rows={2}
                className="w-full p-4 bg-neutral-50 border border-neutral-200 rounded-2xl outline-none focus:bg-white focus:border-neutral-400 text-sm placeholder-neutral-400 transition"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={selectedMood === null || loading}
            className="w-full py-4 text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 rounded-2xl transition duration-200 cursor-pointer"
          >
            {loading ? 'Submitting check-in...' : 'Submit Check-In'}
          </button>
        </form>
      )}
    </div>
  );
}
