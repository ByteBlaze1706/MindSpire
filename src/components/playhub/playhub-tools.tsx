// src/components/playhub/playhub-tools.tsx
'use client';

import React, { useState, useEffect } from 'react';

const AFFIRMATIONS = [
  "You are doing the best you can, and that is enough.",
  "You are worthy of care, compassion, and rest.",
  "It is okay to feel overwhelmed; take it one breath at a time.",
  "Your mistakes do not define your worth or potential.",
  "You belong here, and your presence matters.",
  "This feeling is temporary, and you will navigate through it.",
  "Be gentle with yourself; growth is a quiet and steady process."
];

export function PlayHubTools() {
  const [activeTab, setActiveTab] = useState<'breathing' | 'meditation' | 'pomodoro' | 'affirmations'>('breathing');

  // 1. Breathing Exercise State
  const [breathState, setBreathState] = useState<'Inhale' | 'Hold' | 'Exhale' | 'Hold (Empty)'>('Inhale');
  const [breathSeconds, setBreathSeconds] = useState(4);

  useEffect(() => {
    if (activeTab !== 'breathing') return;

    const interval = setInterval(() => {
      setBreathSeconds((prev) => {
        if (prev === 1) {
          setBreathState((state) => {
            if (state === 'Inhale') return 'Hold';
            if (state === 'Hold') return 'Exhale';
            if (state === 'Exhale') return 'Hold (Empty)';
            return 'Inhale';
          });
          return 4;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTab]);

  // 2. Meditation & Pomodoro Timer States
  const [timerSeconds, setTimerSeconds] = useState(300); // 5 mins default
  const [timerActive, setTimerActive] = useState(false);
  const [timerMode, setTimerMode] = useState<'meditation' | 'pomodoro'>('meditation');

  useEffect(() => {
    if (!timerActive) return;

    const interval = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          setTimerActive(false);
          // Play a gentle notification sound using Web Audio API synthesized chime
          try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 523.25; // C5 note
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);
            osc.start();
            osc.stop(ctx.currentTime + 1.5);
          } catch (e) {
            // Audio context blocked
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerActive]);

  const toggleTimer = () => setTimerActive(!timerActive);
  const resetTimer = (secs: number) => {
    setTimerActive(false);
    setTimerSeconds(secs);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // 3. Affirmation Card State
  const [affirmationIdx, setAffirmationIdx] = useState(0);
  const rotateAffirmation = () => {
    setAffirmationIdx((prev) => (prev + 1) % AFFIRMATIONS.length);
  };

  return (
    <div className="w-full bg-white/70 backdrop-blur-md border border-neutral-100 rounded-3xl p-8 shadow-sm">
      {/* Tabs list selector */}
      <div className="flex border-b border-neutral-100 pb-4 mb-8 gap-4 overflow-x-auto">
        {(['breathing', 'meditation', 'pomodoro', 'affirmations'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              if (tab === 'meditation') {
                setTimerMode('meditation');
                resetTimer(300);
              }
              if (tab === 'pomodoro') {
                setTimerMode('pomodoro');
                resetTimer(1500);
              }
            }}
            className={`px-5 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-xl transition duration-150 cursor-pointer ${
              activeTab === tab
                ? 'bg-neutral-900 text-white shadow-sm'
                : 'text-neutral-500 hover:bg-neutral-100'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 1. Breathing Exercise Tab */}
      {activeTab === 'breathing' && (
        <div className="flex flex-col items-center py-10">
          <div className="relative w-48 h-48 flex items-center justify-center">
            {/* Dynamic expanding/contracting breathing circle */}
            <div
              className={`absolute rounded-full bg-neutral-900/10 border-2 border-neutral-900 transition-all duration-[4000ms] ease-in-out ${
                breathState === 'Inhale' ? 'w-48 h-48 opacity-100' : ''
              } ${
                breathState === 'Hold' ? 'w-48 h-48 opacity-90 scale-95' : ''
              } ${
                breathState === 'Exhale' ? 'w-24 h-24 opacity-60' : ''
              } ${
                breathState === 'Hold (Empty)' ? 'w-24 h-24 opacity-50' : ''
              }`}
            />
            <div className="absolute flex flex-col items-center text-center">
              <span className="text-xl font-semibold text-neutral-800 tracking-tight transition duration-300">
                {breathState}
              </span>
              <span className="text-xs font-semibold text-neutral-400 mt-1">
                {breathSeconds}s
              </span>
            </div>
          </div>
          <p className="mt-10 text-xs text-neutral-500 max-w-xs text-center leading-relaxed">
            Follow the circle. Box Breathing (4-4-4-4) helps calm the nervous system and relieve acute stress.
          </p>
        </div>
      )}

      {/* 2. Meditation Timer Tab */}
      {activeTab === 'meditation' && (
        <div className="flex flex-col items-center py-6 space-y-6">
          <div className="text-4xl font-semibold text-neutral-800 tracking-tight">
            {formatTime(timerSeconds)}
          </div>

          <div className="flex gap-2.5">
            <button
              onClick={() => resetTimer(60)}
              className="px-4 py-2 border border-neutral-200 text-xs font-medium rounded-xl hover:bg-neutral-50 cursor-pointer"
            >
              1 Min
            </button>
            <button
              onClick={() => resetTimer(300)}
              className="px-4 py-2 border border-neutral-200 text-xs font-medium rounded-xl hover:bg-neutral-50 cursor-pointer"
            >
              5 Min
            </button>
            <button
              onClick={() => resetTimer(600)}
              className="px-4 py-2 border border-neutral-200 text-xs font-medium rounded-xl hover:bg-neutral-50 cursor-pointer"
            >
              10 Min
            </button>
          </div>

          <div className="flex gap-4 w-full max-w-xs pt-4">
            <button
              onClick={toggleTimer}
              className="flex-1 py-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              {timerActive ? 'Pause' : 'Start'}
            </button>
            <button
              onClick={() => resetTimer(300)}
              className="px-5 py-3 border border-neutral-200 text-neutral-600 rounded-xl text-xs font-semibold hover:bg-neutral-50 cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* 3. Pomodoro Timer Tab */}
      {activeTab === 'pomodoro' && (
        <div className="flex flex-col items-center py-6 space-y-6">
          <div className="text-4xl font-semibold text-neutral-800 tracking-tight">
            {formatTime(timerSeconds)}
          </div>

          <div className="flex gap-2.5">
            <button
              onClick={() => resetTimer(1500)}
              className="px-4 py-2 border border-neutral-200 text-xs font-medium rounded-xl hover:bg-neutral-50 cursor-pointer"
            >
              Focus Block (25m)
            </button>
            <button
              onClick={() => resetTimer(300)}
              className="px-4 py-2 border border-neutral-200 text-xs font-medium rounded-xl hover:bg-neutral-50 cursor-pointer"
            >
              Short Break (5m)
            </button>
          </div>

          <div className="flex gap-4 w-full max-w-xs pt-4">
            <button
              onClick={toggleTimer}
              className="flex-1 py-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              {timerActive ? 'Pause' : 'Start'}
            </button>
            <button
              onClick={() => resetTimer(1500)}
              className="px-5 py-3 border border-neutral-200 text-neutral-600 rounded-xl text-xs font-semibold hover:bg-neutral-50 cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* 4. Positive Affirmations Tab */}
      {activeTab === 'affirmations' && (
        <div className="flex flex-col items-center py-10 space-y-8">
          <div className="w-full max-w-sm p-8 bg-neutral-50 border border-neutral-200 rounded-2xl text-center min-h-[120px] flex items-center justify-center">
            <p className="text-sm font-medium text-neutral-700 italic leading-relaxed transition-all duration-300">
              "{AFFIRMATIONS[affirmationIdx]}"
            </p>
          </div>

          <button
            onClick={rotateAffirmation}
            className="px-6 py-3 border border-neutral-900 text-neutral-800 text-xs font-semibold uppercase tracking-wider rounded-xl hover:bg-neutral-50 transition cursor-pointer"
          >
            Show another affirmation
          </button>
        </div>
      )}
    </div>
  );
}
