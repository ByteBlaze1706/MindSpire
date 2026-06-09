// src/app/[tenant]/moderation/moderation-container.tsx
'use client';

import React, { useState, useTransition } from 'react';
import { ModerationReport, ModerationAppeal, resolveReportAction, resolveAppealAction } from '../../../lib/actions/community.actions';

interface ModerationContainerProps {
  reports: ModerationReport[];
  appeals: ModerationAppeal[];
  tenantSubdomain: string;
  hasError: boolean;
}

export function ModerationContainer({
  reports: initialReports,
  appeals: initialAppeals,
  tenantSubdomain,
  hasError,
}: ModerationContainerProps) {
  const [activeTab, setActiveTab] = useState<'reports' | 'appeals'>('reports');
  const [reports, setReports] = useState(initialReports);
  const [appeals, setAppeals] = useState(initialAppeals);
  
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedAppealId, setSelectedAppealId] = useState<string | null>(null);
  
  const [modAction, setModAction] = useState<'warn_user' | 'hide_content' | 'delete_content' | 'temporary_restriction' | 'permanent_restriction'>('hide_content');
  const [modReason, setModReason] = useState('');
  
  const [appealNotes, setAppealNotes] = useState('');
  
  const [isPending, startTransition] = useTransition();

  const handleResolveReport = (reportId: string) => {
    if (!modReason.trim() || isPending) return;

    startTransition(async () => {
      const res = await resolveReportAction(tenantSubdomain, reportId, modAction, modReason);
      if (res.success) {
        setReports((prev) => prev.filter((r) => r.id !== reportId));
        setSelectedReportId(null);
        setModReason('');
      } else {
        alert('Failed to resolve report.');
      }
    });
  };

  const handleResolveAppeal = (appealId: string, status: 'resolved' | 'rejected') => {
    if (!appealNotes.trim() || isPending) return;

    startTransition(async () => {
      const res = await resolveAppealAction(tenantSubdomain, appealId, status, appealNotes);
      if (res.success) {
        setAppeals((prev) =>
          prev.map((a) => (a.id === appealId ? { ...a, status, resolution_notes: appealNotes } : a))
        );
        setSelectedAppealId(null);
        setAppealNotes('');
      } else {
        alert('Failed to resolve appeal.');
      }
    });
  };

  if (hasError) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-neutral-100">
        <span className="text-2xl">⚠️</span>
        <h3 className="text-base font-semibold text-neutral-800 mt-2">Error loading moderation logs</h3>
        <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1 leading-relaxed">
          Please check your connection and reload the portal to try again.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs Menu */}
      <div className="flex bg-neutral-100/70 p-1.5 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition duration-150 ${
            activeTab === 'reports' ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-500'
          }`}
        >
          Reports Queue ({reports.length})
        </button>
        <button
          onClick={() => setActiveTab('appeals')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition duration-150 ${
            activeTab === 'appeals' ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-500'
          }`}
        >
          Appeals ({appeals.filter((a) => a.status === 'pending').length})
        </button>
      </div>

      {activeTab === 'reports' ? (
        /* Reports Queue Tab */
        <div className="space-y-4">
          {reports.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-3xl border border-neutral-100">
              <span className="text-2xl">🎉</span>
              <h3 className="text-sm font-semibold text-neutral-800 mt-2">All Clear!</h3>
              <p className="text-xs text-neutral-400 mt-1">No pending posts or comments flagged in the queue.</p>
            </div>
          ) : (
            reports.map((report) => (
              <div
                key={report.id}
                className="bg-white border border-neutral-100 p-6 rounded-3xl shadow-sm space-y-4"
              >
                <div className="flex justify-between items-start flex-wrap gap-2">
                  <div>
                    <span className="inline-block px-2.5 py-0.5 bg-rose-50 border border-rose-100 rounded-md text-[9px] uppercase font-bold text-rose-800">
                      Flagged: {report.target_type}
                    </span>
                    <span className="text-[10px] text-neutral-400 block mt-1">
                      Report ID: {report.id} | Date: {new Date(report.created_at).toLocaleString()}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedReportId(selectedReportId === report.id ? null : report.id)}
                    className="py-1 px-3 bg-neutral-800 hover:bg-neutral-900 text-white rounded-xl text-xs font-semibold transition"
                  >
                    Take Action
                  </button>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-neutral-500">
                    Reason: <strong className="text-neutral-700">{report.reason}</strong>
                  </p>
                  <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-100 text-xs text-neutral-600 leading-relaxed font-mono">
                    {report.target_content}
                  </div>
                </div>

                {/* Resolution action subform */}
                {selectedReportId === report.id && (
                  <div className="p-4 bg-neutral-50/50 border border-neutral-100 rounded-2xl space-y-4 animate-scale-up">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700">Moderation Action Config</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-[10px] uppercase font-bold text-neutral-400">Action Type</label>
                        <select
                          value={modAction}
                          onChange={(e: any) => setModAction(e.target.value)}
                          className="w-full p-2.5 bg-white border border-neutral-200 rounded-xl text-xs outline-none text-neutral-700"
                        >
                          <option value="hide_content">Hide Flagged Content</option>
                          <option value="warn_user">Warn User (System Warning)</option>
                          <option value="temporary_restriction">Temporary Restriction (7 Days)</option>
                          <option value="permanent_restriction">Permanent Restriction (Ban)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] uppercase font-bold text-neutral-400">Resolution Reason</label>
                        <input
                          type="text"
                          required
                          value={modReason}
                          onChange={(e) => setModReason(e.target.value)}
                          placeholder="Provide audit rationale..."
                          className="w-full p-2.5 bg-white border border-neutral-200 rounded-xl text-xs outline-none text-neutral-700"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={() => setSelectedReportId(null)}
                        className="py-2 px-4 bg-white border border-neutral-200 text-neutral-600 rounded-xl text-xs font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleResolveReport(report.id)}
                        disabled={!modReason.trim() || isPending}
                        className="py-2 px-4 bg-neutral-800 hover:bg-neutral-900 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                      >
                        Confirm Action
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        /* Appeals List Tab */
        <div className="space-y-4">
          {appeals.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-3xl border border-neutral-100">
              <span className="text-2xl">📋</span>
              <h3 className="text-sm font-semibold text-neutral-800 mt-2">No Appeals</h3>
              <p className="text-xs text-neutral-400 mt-1">No active student appeals are logged in this institution.</p>
            </div>
          ) : (
            appeals.map((appeal) => (
              <div
                key={appeal.id}
                className="bg-white border border-neutral-100 p-6 rounded-3xl shadow-sm space-y-4"
              >
                <div className="flex justify-between items-start flex-wrap gap-2">
                  <div>
                    <span
                      className={`inline-block px-2.5 py-0.5 border rounded-md text-[9px] uppercase font-bold ${
                        appeal.status === 'pending'
                          ? 'bg-amber-50 border-amber-100 text-amber-800'
                          : appeal.status === 'resolved'
                          ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                          : 'bg-rose-50 border-rose-100 text-rose-800'
                      }`}
                    >
                      Status: {appeal.status}
                    </span>
                    <span className="text-[10px] text-neutral-400 block mt-1">
                      Appeal ID: {appeal.id} | Logged: {new Date(appeal.created_at).toLocaleString()}
                    </span>
                  </div>

                  {appeal.status === 'pending' && (
                    <button
                      onClick={() => setSelectedAppealId(selectedAppealId === appeal.id ? null : appeal.id)}
                      className="py-1 px-3 bg-neutral-800 hover:bg-neutral-900 text-white rounded-xl text-xs font-semibold transition"
                    >
                      Resolve Appeal
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider">Student's Appeal Reason</p>
                  <p className="text-sm text-neutral-700 leading-relaxed bg-neutral-50 p-4 rounded-2xl border border-neutral-100/50">
                    {appeal.reason}
                  </p>
                </div>

                {appeal.resolution_notes && (
                  <div className="p-3 bg-neutral-100/50 rounded-2xl text-xs text-neutral-600">
                    <span className="font-bold">Resolution Notes: </span>
                    {appeal.resolution_notes}
                  </div>
                )}

                {/* Resolve appeal action subform */}
                {selectedAppealId === appeal.id && (
                  <div className="p-4 bg-neutral-50/50 border border-neutral-100 rounded-2xl space-y-3 animate-scale-up">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700">Appeal Resolution</h4>
                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase font-bold text-neutral-400">Notes & Audit Remarks</label>
                      <input
                        type="text"
                        required
                        value={appealNotes}
                        onChange={(e) => setAppealNotes(e.target.value)}
                        placeholder="State your resolution reasons..."
                        className="w-full p-2.5 bg-white border border-neutral-200 rounded-xl text-xs outline-none text-neutral-700"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={() => handleResolveAppeal(appeal.id, 'rejected')}
                        disabled={!appealNotes.trim() || isPending}
                        className="py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                      >
                        Reject Appeal
                      </button>
                      <button
                        onClick={() => handleResolveAppeal(appeal.id, 'resolved')}
                        disabled={!appealNotes.trim() || isPending}
                        className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                      >
                        Approve Appeal
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
