// src/components/counselor/session-notes-editor.tsx
'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { getSessionNoteForAppointment, saveSessionNoteAction } from '../../lib/actions/counselor.actions';

interface SessionNotesEditorProps {
  appointmentId: string;
  studentId: string;
  studentPseudonym: string;
  appointmentTime: string;
  tenantSubdomain: string;
}

export function SessionNotesEditor({
  appointmentId,
  studentId,
  studentPseudonym,
  appointmentTime,
  tenantSubdomain,
}: SessionNotesEditorProps) {
  const [noteText, setNoteText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load existing session note
  useEffect(() => {
    async function loadNote() {
      setIsLoading(true);
      const res = await getSessionNoteForAppointment(appointmentId);
      if (res.success && res.noteText) {
        setNoteText(res.noteText);
      }
      setIsLoading(false);
    }
    loadNote();
  }, [appointmentId]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending) return;

    setSuccessMsg(null);
    startTransition(async () => {
      const res = await saveSessionNoteAction(tenantSubdomain, studentId, appointmentId, noteText);
      if (res.success) {
        setSuccessMsg('Session notes saved and envelope encrypted.');
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        alert(res.error || 'Failed to save notes.');
      }
    });
  };

  return (
    <div className="bg-white border border-neutral-100 rounded-3xl p-6 space-y-4 shadow-sm">
      <div className="border-b border-neutral-50 pb-3 flex justify-between items-center flex-wrap gap-2">
        <div>
          <span className="block text-xs font-semibold text-neutral-400">Appointment Session Notes</span>
          <h4 className="text-sm font-bold text-neutral-800 mt-0.5">
            Student: {studentPseudonym}
          </h4>
          <span className="text-[10px] text-neutral-400">
            Date: {new Date(appointmentTime).toLocaleString()}
          </span>
        </div>
        <span className="px-2.5 py-0.5 bg-rose-50 border border-rose-100 rounded-md text-[8px] font-bold uppercase tracking-wider text-rose-800">
          🔒 Clinical Encryption (KMS)
        </span>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-xs text-neutral-400 animate-pulse">
          Decrypting session note payloads...
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-4">
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Log clinical progress, recommendations, follow-up indicators..."
            rows={6}
            className="w-full p-4 bg-neutral-50 border border-neutral-100 rounded-2xl text-xs text-neutral-700 outline-none focus:border-neutral-200 transition"
          />

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider rounded-xl animate-fade-in">
              ✓ {successMsg}
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-900 text-white rounded-xl text-xs font-semibold disabled:opacity-50 transition duration-150"
            >
              {isPending ? 'Encrypting & Saving...' : 'Save Session Note'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
