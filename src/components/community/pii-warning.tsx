// src/components/community/pii-warning.tsx
'use client';

import React, { useEffect, useState } from 'react';

interface PIIWarningProps {
  text: string;
  onValidationChange: (isValid: boolean) => void;
}

const EMAIL_REGEX = /[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}/;
const PHONE_REGEX = /(\+?\d{1,4}[-.\s]?)?\(?\d{3,4}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b\d{10}\b/;
const STUDENT_ID_REGEX = /\b(roll[-_\s]?no|student[-_\s]?id|rollno|id[-_\s]?no)\b\s*[:=-]?\s*\w+|\b[a-zA-Z]{2,4}\d{4,8}\b|\b\d{8,12}\b/i;

export function PIIWarning({ text, onValidationChange }: PIIWarningProps) {
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    if (!text) {
      setWarning(null);
      onValidationChange(true);
      return;
    }

    if (EMAIL_REGEX.test(text)) {
      setWarning('Safety Block: Email address detected. For privacy and safety, do not share emails in anonymous forums.');
      onValidationChange(false);
    } else if (PHONE_REGEX.test(text)) {
      setWarning('Safety Block: Phone number detected. To protect your identity, do not share phone numbers.');
      onValidationChange(false);
    } else if (STUDENT_ID_REGEX.test(text)) {
      setWarning('Safety Block: Student roll number or ID detected. For absolute privacy, do not post institutional identifiers.');
      onValidationChange(false);
    } else {
      setWarning(null);
      onValidationChange(true);
    }
  }, [text, onValidationChange]);

  if (!warning) return null;

  return (
    <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex gap-3 text-rose-700 text-xs font-medium animate-pulse">
      <span className="text-base">⚠️</span>
      <div>
        <p className="font-semibold uppercase tracking-wider text-[10px] text-rose-800">Privacy Flag Triggered</p>
        <p className="mt-1 leading-relaxed">{warning}</p>
      </div>
    </div>
  );
}
