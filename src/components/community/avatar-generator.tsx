// src/components/community/avatar-generator.tsx
'use client';

import React from 'react';

interface AvatarGeneratorProps {
  seed: string;
  size?: number;
  className?: string;
}

const GRADIENT_PALETTES = [
  { start: '#E3EFF3', end: '#C2E5D3' },
  { start: '#F5EBE6', end: '#E3D7D1' },
  { start: '#F5AF8F', end: '#F0D3C4' },
  { start: '#B3D4E0', end: '#8EADC2' },
  { start: '#D7ECD9', end: '#B3CBB8' },
  { start: '#FDE4C3', end: '#F4CBB5' },
  { start: '#EBDDF7', end: '#C7B5D6' },
  { start: '#E4F0EC', end: '#C0D5CC' }
];

export function AvatarGenerator({ seed, size = 40, className = '' }: AvatarGeneratorProps) {
  // Hash function to pick gradient and shape features deterministically from pseudonym string
  const getHash = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
  };

  const hash = getHash(seed || 'Anonymous Peer');
  const paletteIndex = hash % GRADIENT_PALETTES.length;
  const palette = GRADIENT_PALETTES[paletteIndex];
  
  // Deterministic shapes based on hash
  const cx1 = 20 + (hash % 10);
  const cy1 = 20 + ((hash >> 2) % 10);
  const r1 = 8 + ((hash >> 4) % 6);

  const cx2 = 25 - ((hash >> 3) % 8);
  const cy2 = 25 - ((hash >> 5) % 8);
  const r2 = 6 + ((hash >> 6) % 5);

  const gradientId = `anon-avatar-grad-${hash}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`rounded-full shadow-inner bg-white ${className}`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={palette.start} />
          <stop offset="100%" stopColor={palette.end} />
        </linearGradient>
      </defs>
      {/* Background */}
      <circle cx="20" cy="20" r="20" fill={`url(#${gradientId})`} />
      
      {/* Calming abstract geometric shapes */}
      <circle cx={cx1} cy={cy1} r={r1} fill="white" fillOpacity="0.4" />
      <circle cx={cx2} cy={cy2} r={r2} fill="white" fillOpacity="0.25" />
      <rect
        x="10"
        y="25"
        width="20"
        height="10"
        rx="5"
        fill="white"
        fillOpacity="0.2"
        transform={`rotate(${(hash % 45)} 20 30)`}
      />
    </svg>
  );
}
