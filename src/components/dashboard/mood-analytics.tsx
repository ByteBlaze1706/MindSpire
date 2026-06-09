// src/components/dashboard/mood-analytics.tsx
'use client';

import React from 'react';

interface MoodLogEntry {
  score: number;
  logged_at: string;
}

export function MoodAnalytics({ history }: { history: MoodLogEntry[] }) {
  // Safe fallback if history is empty
  const entries = history.length > 0 ? history.slice(-7) : [
    { score: 3, logged_at: 'Mon' },
    { score: 4, logged_at: 'Tue' },
    { score: 3, logged_at: 'Wed' },
    { score: 4, logged_at: 'Thu' },
    { score: 5, logged_at: 'Fri' },
    { score: 4, logged_at: 'Sat' },
    { score: 5, logged_at: 'Sun' },
  ];

  // Map coordinates
  const width = 500;
  const height = 180;
  const paddingX = 40;
  const paddingY = 30;

  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  // X points spacing
  const stepX = chartWidth / (entries.length - 1 || 1);

  // Y mapper: Mood rating 1-5 maps to height boundary 140 to 40
  const getY = (score: number) => {
    const minScore = 1;
    const maxScore = 5;
    const pct = (score - minScore) / (maxScore - minScore);
    return height - paddingY - pct * chartHeight;
  };

  // Compile points array
  const points = entries.map((entry, index) => {
    const x = paddingX + index * stepX;
    const y = getY(entry.score);
    return { x, y, score: entry.score, date: new Date(entry.logged_at).toLocaleDateString(undefined, { weekday: 'short' }) };
  });

  // Build SVG Path strings
  const linePath = points.reduce(
    (acc, curr, index) => (index === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`),
    ''
  );

  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`
    : '';

  return (
    <div className="p-6 bg-white/70 backdrop-blur-md border border-neutral-100 rounded-3xl shadow-sm">
      <h3 className="text-lg font-semibold text-neutral-800 tracking-tight mb-2">
        Mood Trajectory
      </h3>
      <p className="text-xs text-neutral-500 mb-6">
        Review your emotional trends over the past 7 check-ins.
      </p>

      <div className="relative w-full h-[180px]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          {/* Gradient definitions */}
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#457B9D" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#457B9D" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#1D3557" />
              <stop offset="100%" stopColor="#457B9D" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[1, 2, 3, 4, 5].map((val) => {
            const y = getY(val);
            return (
              <line
                key={val}
                x1={paddingX}
                y1={y}
                x2={width - paddingX}
                y2={y}
                className="stroke-neutral-100"
                strokeWidth="1"
                strokeDasharray="4,4"
              />
            );
          })}

          {/* Path Area Fill */}
          {areaPath && <path d={areaPath} fill="url(#areaGrad)" />}

          {/* Main Line */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="url(#lineGrad)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data Points Circles */}
          {points.map((p, i) => (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r="5.5"
                className="fill-neutral-900 stroke-white"
                strokeWidth="2.5"
              />
              {/* Tooltip trigger or label */}
              <text
                x={p.x}
                y={p.y - 12}
                textAnchor="middle"
                className="text-[9px] font-semibold fill-neutral-600"
              >
                {p.score}
              </text>
              {/* Date text along X axis */}
              <text
                x={p.x}
                y={height - 10}
                textAnchor="middle"
                className="text-[10px] font-medium fill-neutral-400"
              >
                {p.date}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
