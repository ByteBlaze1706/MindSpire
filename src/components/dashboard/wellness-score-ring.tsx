// src/components/dashboard/wellness-score-ring.tsx
'use client';

import React from 'react';

export function WellnessScoreRing({ score }: { score: number }) {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  // Determine feedback label and styling based on score ranges
  let color = 'stroke-[#2A9D8F]'; // Calm teal
  let label = 'Thriving';
  let desc = 'Your wellness indicators are balanced.';

  if (score < 50) {
    color = 'stroke-[#E76F51]'; // Rose warning
    label = 'Support Recommended';
    desc = 'Consider utilizing PlayHub tools or scheduling a chat.';
  } else if (score < 80) {
    color = 'stroke-[#E9C46A]'; // Warm amber
    label = 'Coping Well';
    desc = 'Maintain your check-ins and look into resource articles.';
  }

  return (
    <div className="p-6 bg-white/70 backdrop-blur-md border border-neutral-100 rounded-3xl shadow-sm flex flex-col items-center text-center">
      <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-6">
        Wellness Indicator
      </h3>

      <div className="relative w-36 h-36 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
          {/* Background circle */}
          <circle
            cx="70"
            cy="70"
            r={radius}
            className="stroke-neutral-100 fill-none"
            strokeWidth="10"
          />
          {/* Active progress ring */}
          <circle
            cx="70"
            cy="70"
            r={radius}
            className={`${color} fill-none transition-all duration-1000 ease-out`}
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        {/* Core text indicators */}
        <div className="absolute flex flex-col items-center">
          <span className="text-3xl font-semibold text-neutral-800 tracking-tight">
            {score}
          </span>
          <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-widest mt-0.5">
            Score
          </span>
        </div>
      </div>

      <h4 className="text-base font-semibold text-neutral-800 tracking-tight mt-6 mb-1.5">
        {label}
      </h4>
      <p className="text-xs text-neutral-500 max-w-[200px] leading-relaxed">
        {desc}
      </p>
    </div>
  );
}
