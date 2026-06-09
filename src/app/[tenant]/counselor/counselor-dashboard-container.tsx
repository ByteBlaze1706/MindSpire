// src/app/[tenant]/counselor/counselor-dashboard-container.tsx
'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { CounselorAvailability, RiskAlert } from '../../lib/repositories/counselor.repository';
import { UserProfile } from '../../lib/repositories/user.repository';
import { CounselorCalendar } from '../../../components/counselor/counselor-calendar';
import { resolveRiskAlertAction } from '../../actions/counselor.actions';

interface CounselorDashboardProps {
  roster: (UserProfile & { pseudonym: string; active_consent: boolean })[];
  slots: CounselorAvailability[];
  riskAlerts: RiskAlert[];
  tenantSubdomain: string;
  hasError: boolean;
}

export function CounselorDashboardContainer({
  roster,
  slots,
  riskAlerts: initialRiskAlerts,
  tenantSubdomain,
  hasError,
}: CounselorDashboardProps) {
  const [activeTab, setActiveTab] = useState<'roster' | 'calendar' | 'alerts'>('roster');
  const [riskAlerts, setRiskAlerts] = useState(initialRiskAlerts);
  const [searchRoster, setSearchRoster] = useState('');
  
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleResolveAlert = (alertId: string) => {
    if (!resolutionNotes.trim() || isPending) return;

    startTransition(async () => {
      const res = await resolveRiskAlertAction(tenantSubdomain, alertId, resolutionNotes);
      if (res.success) {
        setRiskAlerts((prev) =>
          prev.map((a) => (a.id === alertId ? { ...a, status: 'resolved', resolution_notes: resolutionNotes } : a))
        );
        setSelectedAlertId(null);
        setResolutionNotes('');
      } else {
        alert('Failed to resolve risk alert.');
      }
    });
  };

  const filteredRoster = roster.filter(
    (student) =>
      student.pseudonym.toLowerCase().includes(searchRoster.toLowerCase()) ||
      student.email.toLowerCase().includes(searchRoster.toLowerCase())
  );

  if (hasError) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-neutral-100">
        <span className="text-2xl">⚠️</span>
        <h3 className="text-base font-semibold text-neutral-800 mt-2">Error loading dashboard</h3>
        <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1 leading-relaxed">
          Please check your connection and reload the dashboard to try again.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Selectors */}
      <div className="flex bg-neutral-100/70 p-1.5 rounded-2xl w-fit flex-wrap">
        <button
          onClick={() => setActiveTab('roster')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition duration-150 ${
            activeTab === 'roster' ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-500'
          }`}
        >
          Assigned Students ({roster.length})
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition duration-150 ${
            activeTab === 'calendar' ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-500'
          }`}
        >
          Availability Scheduler ({slots.filter((s) => !s.is_booked).length} open)
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition duration-150 ${
            activeTab === 'alerts' ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-500'
          }`}
        >
          Risk Alert Queue ({riskAlerts.filter((a) => a.status === 'pending').length} active)
        </button>
      </div>

      {activeTab === 'roster' && (
        /* Assigned Students Roster Tab */
        <div className="space-y-4">
          <div className="flex justify-between items-center gap-4 bg-white/50 p-4 rounded-3xl border border-neutral-100/70 flex-wrap">
            <input
              type="text"
              value={searchRoster}
              onChange={(e) => setSearchRoster(e.target.value)}
              placeholder="Search students by pseudonym or email..."
              className="w-full md:max-w-md px-4 py-2.5 bg-white border border-neutral-100 rounded-2xl text-xs text-neutral-700 outline-none focus:border-neutral-200 transition"
            />
          </div>

          {filteredRoster.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-neutral-100">
              <span className="text-2xl">👤</span>
              <h3 className="text-sm font-semibold text-neutral-800 mt-2">No Students Found</h3>
              <p className="text-xs text-neutral-400 mt-1">
                You are not currently assigned to any students matching your criteria.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRoster.map((student) => (
                <div
                  key={student.id}
                  className="bg-white p-5 rounded-3xl border border-neutral-100 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-neutral-800 tracking-tight">
                        {student.pseudonym}
                      </h4>
                      <span className="px-2 py-0.5 bg-neutral-100 border border-neutral-200 text-[8px] uppercase tracking-wider font-bold rounded text-neutral-500">
                        Student
                      </span>
                    </div>

                    <div className="text-[11px] text-neutral-500 space-y-1.5">
                      <p className="truncate">Email: {student.email}</p>
                      <p>Joined: {new Date(student.created_at).toLocaleDateString()}</p>
                    </div>

                    <div className="flex gap-2 flex-wrap pt-1">
                      <span
                        className={`px-2 py-0.5 border text-[8px] uppercase font-bold rounded-md ${
                          student.active_consent
                            ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                            : 'bg-rose-50 border-rose-100 text-rose-700'
                        }`}
                      >
                        Consent: {student.active_consent ? 'Active' : 'Locked'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-neutral-50 mt-4">
                    <Link
                      href={`/${tenantSubdomain}/counselor/student/${student.id}`}
                      className="block text-center py-2.5 bg-neutral-800 hover:bg-neutral-900 text-white rounded-xl text-xs font-semibold transition duration-150"
                    >
                      View Clinical Profile
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'calendar' && (
        /* Availability Calendar Scheduler Tab */
        <CounselorCalendar slots={slots} tenantSubdomain={tenantSubdomain} />
      )}

      {activeTab === 'alerts' && (
        /* Risk Alerts Queue Tab */
        <div className="space-y-4">
          {riskAlerts.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-neutral-100">
              <span className="text-2xl">🎉</span>
              <h3 className="text-sm font-semibold text-neutral-800 mt-2">All Clear!</h3>
              <p className="text-xs text-neutral-400 mt-1">No pending risk alerts registered in the institution queue.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {riskAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="bg-white border border-neutral-100 p-6 rounded-3xl shadow-sm space-y-4"
                >
                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <div>
                      <span
                        className={`inline-block px-2.5 py-0.5 border rounded-md text-[8px] uppercase font-bold ${
                          alert.severity === 'critical' || alert.severity === 'high'
                            ? 'bg-rose-50 border-rose-100 text-rose-700'
                            : 'bg-amber-50 border-amber-100 text-amber-700'
                        }`}
                      >
                        {alert.severity} Risk alert
                      </span>
                      <span className="text-[10px] text-neutral-400 block mt-1">
                        Source: {alert.source_type} | Student: {alert.pseudonym} | Logged: {new Date(alert.created_at).toLocaleString()}
                      </span>
                    </div>

                    {alert.status === 'pending' && (
                      <button
                        onClick={() => setSelectedAlertId(selectedAlertId === alert.id ? null : alert.id)}
                        className="py-1 px-3 bg-neutral-800 hover:bg-neutral-900 text-white rounded-xl text-xs font-semibold transition"
                      >
                        Resolve
                      </button>
                    )}
                  </div>

                  {alert.resolution_notes && (
                    <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-100/50 text-xs text-neutral-600 leading-relaxed font-mono">
                      Resolution Notes: {alert.resolution_notes}
                    </div>
                  )}

                  {/* Resolution Input */}
                  {selectedAlertId === alert.id && (
                    <div className="p-4 bg-neutral-50/50 border border-neutral-100 rounded-2xl space-y-3 animate-scale-up">
                      <div className="space-y-1">
                        <label className="block text-[10px] uppercase font-bold text-neutral-400">Resolution Steps Taken</label>
                        <input
                          type="text"
                          required
                          value={resolutionNotes}
                          onChange={(e) => setResolutionNotes(e.target.value)}
                          placeholder="Contacted student, resolved with campus administration..."
                          className="w-full p-2.5 bg-white border border-neutral-200 rounded-xl text-xs outline-none text-neutral-700"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setSelectedAlertId(null)}
                          className="py-1.5 px-3 bg-white border border-neutral-200 text-neutral-600 rounded-xl text-[10px] font-bold"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleResolveAlert(alert.id)}
                          disabled={!resolutionNotes.trim() || isPending}
                          className="py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-bold disabled:opacity-50"
                        >
                          Confirm Resolve
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
