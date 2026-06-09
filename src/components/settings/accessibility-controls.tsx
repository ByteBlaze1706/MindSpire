// src/components/settings/accessibility-controls.tsx
'use client';

import React, { useState, useEffect } from 'react';

export function AccessibilityControls() {
  const [contrast, setContrast] = useState(false);
  const [fontSize, setFontSize] = useState(100); // percentage

  useEffect(() => {
    const root = document.documentElement;
    // Set text size scaler
    root.style.fontSize = `${fontSize}%`;
  }, [fontSize]);

  const toggleContrast = () => {
    setContrast(!contrast);
    const body = document.body;
    if (!contrast) {
      body.classList.add('high-contrast');
      body.style.filter = 'contrast(1.2) saturate(0.9)';
    } else {
      body.classList.remove('high-contrast');
      body.style.filter = 'none';
    }
  };

  return (
    <div className="p-6 bg-white/70 backdrop-blur-md border border-neutral-100 rounded-3xl shadow-sm space-y-6">
      <h3 className="text-lg font-semibold text-neutral-800 tracking-tight">
        Accessibility Controls
      </h3>
      <p className="text-xs text-neutral-500">
        Adjust MindSpire display properties to match your comfort.
      </p>

      <div className="space-y-4">
        {/* Text Scaling Slider */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold uppercase tracking-wider text-neutral-500">
            <span>Text Magnification</span>
            <span>{fontSize}%</span>
          </div>
          <input
            type="range"
            min="80"
            max="150"
            value={fontSize}
            onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
            className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-neutral-800"
          />
        </div>

        {/* High Contrast Toggle */}
        <label className="flex items-center justify-between p-4 bg-neutral-50 border border-neutral-200/50 rounded-2xl cursor-pointer hover:bg-neutral-100/30 transition">
          <div>
            <span className="block text-sm font-semibold text-neutral-700">High Contrast Mode</span>
            <span className="block text-xs text-neutral-400 mt-0.5">Increases saturation and text boundaries.</span>
          </div>
          <input
            type="checkbox"
            checked={contrast}
            onChange={toggleContrast}
            className="w-5 h-5 rounded-md border-neutral-300 text-neutral-800 focus:ring-neutral-500 cursor-pointer"
          />
        </label>
      </div>
    </div>
  );
}
