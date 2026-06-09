// src/app/[tenant]/counselor/student/[id]/student-profile-container.tsx
'use client';

import React, { useState } from 'react';
import { StudentConsentCheck } from '../../../../components/counselor/student-consent-check';
import { SessionNotesEditor } from '../../../../components/counselor/session-notes-editor';
import { AvatarGenerator } from '../../../../components/community/avatar-generator';

interface StudentProfileContainerProps {
  profile: {
    id: string;
    pseudonym: string;
    token_id?: string;
    avatar_config: Record<string, any>;
  };
  moodLogs: { id: string; score: number; descriptor: string; logged_at: string }[];
  assessmentResults: { id: string; assessment_name: string; total_score: number; severity_level: string; completed_at: string }[];
  appointments: { id: string; scheduled_time: string; status: string; counselor_notes: { id: string }[] }[];
  consent: { journals: boolean; chats: boolean };
  journals: { id: string; content: string; created_at: string; is_gratitude: boolean }[];
  chats: { session_title: string; messages: { sender_type: string; content: string; created_at: string }[] }[];
  tenantSubdomain: string;
}

const MOOD_VALUES: Record<string, number> = {
  Happy: 5,
  Calm: 5,
  Motivated: 4,
  Neutral: 3,
  Stressed: 2,
  Anxious: 2,
  Exhausted: 1,
  Sad: 1,
};

export function StudentProfileContainer({
  profile,
  moodLogs,
  assessmentResults,
  appointments,
  consent,
  journals,
  chats,
  tenantSubdomain,
}: StudentProfileContainerProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'assessments' | 'journals' | 'chats' | 'notes'>('summary');
  const [expandedAppointmentId, setExpandedAppointmentId] = useState<string | null>(null);

  // Calculate Rolling Mood Average (last 30 logs)
  const rollingMoodAvg = moodLogs.length > 0
    ? (moodLogs.reduce((acc, log) => acc + (MOOD_VALUES[log.descriptor] || 3), 0) / moodLogs.length).toFixed(1)
    : 'N/A';

  // SVG Line Chart plotting variables
  const graphWidth = 500;
  const graphHeight = 150;
  const padding = 20;

  const points = moodLogs
    .slice()
    .reverse()
    .map((log, index) => {
      const x = padding + (index * (graphWidth - padding * 2)) / Math.max(1, moodLogs.length - 1);
      const y = graphHeight - padding - ((MOOD_VALUES[log.descriptor] || 3) - 1) * (graphHeight - padding * 2) / 4;
      return { x, y, descriptor: log.descriptor, date: new Date(log.logged_at).toLocaleDateString() };
    });

  const pathD = points.length > 0
    ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map((p) => `L ${p.x} ${p.y}`).join(' ')
    : '';

  return (
    <div className="space-y-6">
      {/* Demographics Profile Banner */}
      <div className="bg-white border border-neutral-100 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-center gap-5 justify-between">
        <div className="flex items-center gap-4 text-left">
          <AvatarGenerator seed={profile.pseudonym} size={56} />
          <div>
            <h2 className="text-xl font-bold text-neutral-800 tracking-tight">{profile.pseudonym}</h2>
            {profile.token_id && (
              <p className="text-xs text-neutral-500 mt-0.5">Token ID: {profile.token_id}</p>
            )}
          </div>
        </div>

        <div className="flex gap-2 flex-wrap text-xs font-semibold">
          <span
            className={`px-3 py-1 border rounded-full ${
              consent.journals
                ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                : 'bg-rose-50 border-rose-100 text-rose-700'
            }`}
          >
            Journals Sharing: {consent.journals ? 'Enabled' : 'Locked'}
          </span>
          <span
            className={`px-3 py-1 border rounded-full ${
              consent.chats
                ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                : 'bg-rose-50 border-rose-100 text-rose-700'
            }`}
          >
            AI Conversations: {consent.chats ? 'Enabled' : 'Locked'}
          </span>
        </div>
      </div>

      {/* Roster Tabs */}
      <div className="flex bg-neutral-100/70 p-1.5 rounded-2xl w-fit flex-wrap">
        <button
          onClick={() => setActiveTab('summary')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition duration-150 ${
            activeTab === 'summary' ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-500'
          }`}
        >
          Wellness Summary
        </button>
        <button
          onClick={() => setActiveTab('assessments')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition duration-150 ${
            activeTab === 'assessments' ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-500'
          }`}
        >
          Clinical Assessments
        </button>
        <button
          onClick={() => setActiveTab('journals')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition duration-150 ${
            activeTab === 'journals' ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-500'
          }`}
        >
          Journals ({journals.length})
        </button>
        <button
          onClick={() => setActiveTab('chats')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition duration-150 ${
            activeTab === 'chats' ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-500'
          }`}
        >
          AI Companion Chats
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition duration-150 ${
            activeTab === 'notes' ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-500'
          }`}
        >
          Clinical Notes ({appointments.length})
        </button>
      </div>

      {activeTab === 'summary' && (
        /* Wellness Summary Tab */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Key Metrics */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white p-5 rounded-3xl border border-neutral-100 shadow-sm text-center">
              <span className="text-2xl">📈</span>
              <span className="block text-xs font-semibold uppercase tracking-widest text-neutral-400 mt-2">
                Rolling Mood Average
              </span>
              <strong className="block text-4xl text-neutral-800 mt-1">{rollingMoodAvg}</strong>
              <span className="text-[10px] text-neutral-400 block mt-1">out of 5.0 (Last 30 check-ins)</span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-neutral-100 shadow-sm space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500">Recent Mood Log Descriptor</h4>
              {moodLogs.length === 0 ? (
                <p className="text-xs text-neutral-400 italic">No mood check-ins logged.</p>
              ) : (
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {moodLogs.slice(0, 5).map((log) => (
                    <div key={log.id} className="flex justify-between items-center text-xs border-b border-neutral-50 pb-2">
                      <span className="font-semibold text-neutral-700">{log.descriptor}</span>
                      <span className="text-neutral-400">{new Date(log.logged_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Line Chart */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-neutral-100 p-6 shadow-sm space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-semibold text-neutral-800 tracking-tight">Mood Trend History</h3>
              <p className="text-xs text-neutral-400">Qualitative check-in indexes mapped chronologically.</p>
            </div>

            {points.length === 0 ? (
              <div className="py-12 text-center text-xs text-neutral-400 italic">No logs available to plot graph.</div>
            ) : (
              <div className="w-full overflow-x-auto">
                <svg width="100%" height={graphHeight} viewBox={`0 0 ${graphWidth} ${graphHeight}`} className="mx-auto overflow-visible">
                  {/* Grid lines */}
                  {[1, 2, 3, 4, 5].map((val) => {
                    const y = graphHeight - padding - (val - 1) * (graphHeight - padding * 2) / 4;
                    return (
                      <line
                        key={val}
                        x1={padding}
                        y1={y}
                        x2={graphWidth - padding}
                        y2={y}
                        stroke="#F0F0F0"
                        strokeWidth="1"
                      />
                    );
                  })}
                  {/* Path */}
                  <path d={pathD} fill="none" stroke="#8EADC2" strokeWidth="2.5" />
                  {/* Circles */}
                  {points.map((p, i) => (
                    <g key={i} className="group cursor-pointer">
                      <circle cx={p.x} cy={p.y} r="4.5" fill="#B3D4E0" stroke="white" strokeWidth="1.5" />
                      <title>{`${p.descriptor} (${p.date})`}</title>
                    </g>
                  ))}
                </svg>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'assessments' && (
        /* Clinical Assessments Tab */
        <div className="bg-white rounded-3xl border border-neutral-100 p-6 shadow-sm space-y-4">
          <h3 className="text-base font-semibold text-neutral-800 tracking-tight">Standard Assessment History</h3>
          
          {assessmentResults.length === 0 ? (
            <div className="text-center py-12 bg-neutral-50/50 rounded-2xl border border-dashed border-neutral-200/50">
              <span className="text-2xl">📋</span>
              <p className="text-xs text-neutral-400 mt-2">No clinical tests logged for this student.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-neutral-700">
                <thead>
                  <tr className="border-b border-neutral-100 text-neutral-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="pb-3">Assessment Scale</th>
                    <th className="pb-3">Total Score</th>
                    <th className="pb-3">Severity Level</th>
                    <th className="pb-3">Completion Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {assessmentResults.map((result) => (
                    <tr key={result.id} className="hover:bg-neutral-50/50 transition">
                      <td className="py-3.5 font-semibold text-neutral-800">{result.assessment_name}</td>
                      <td className="py-3.5 font-bold text-neutral-900">{result.total_score}</td>
                      <td className="py-3.5">
                        <span className="px-2 py-0.5 bg-neutral-100 border border-neutral-200 rounded text-[9px] font-bold text-neutral-600">
                          {result.severity_level}
                        </span>
                      </td>
                      <td className="py-3.5 text-neutral-400">{new Date(result.completed_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'journals' && (
        /* Journals Tab (Consent Gated) */
        <StudentConsentCheck hasConsent={consent.journals} type="journals" studentPseudonym={profile.pseudonym}>
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-neutral-800 tracking-tight">Decrypted Private Wellness Journal Logs</h3>
            {journals.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-400 bg-white rounded-3xl border border-neutral-100 italic">
                Student hasn't recorded any journal entries yet.
              </div>
            ) : (
              <div className="space-y-4">
                {journals.map((entry) => (
                  <div key={entry.id} className="bg-white border border-neutral-100 p-5 rounded-3xl shadow-sm space-y-2">
                    <div className="flex justify-between items-center border-b border-neutral-50 pb-2">
                      <span className="text-[10px] text-neutral-400 font-semibold">
                        Logged: {new Date(entry.created_at).toLocaleDateString()}
                      </span>
                      {entry.is_gratitude && (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded text-[8px] font-bold uppercase tracking-wider">
                          Gratitude Log
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-600 leading-relaxed whitespace-pre-line">
                      {entry.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </StudentConsentCheck>
      )}

      {activeTab === 'chats' && (
        /* AI Companion Chats Tab (Consent Gated) */
        <StudentConsentCheck hasConsent={consent.chats} type="ai_chats" studentPseudonym={profile.pseudonym}>
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-neutral-800 tracking-tight">Decrypted AI Chat Messages</h3>
            {chats.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-400 bg-white rounded-3xl border border-neutral-100 italic">
                No active companion sessions registered.
              </div>
            ) : (
              <div className="space-y-6">
                {chats.map((session, i) => (
                  <div key={i} className="bg-white border border-neutral-100 rounded-3xl p-6 shadow-sm space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                      Session Title: "{session.session_title}"
                    </h4>
                    
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                      {session.messages.map((m, j) => (
                        <div
                          key={j}
                          className={`p-3.5 rounded-2xl max-w-sm text-xs leading-relaxed ${
                            m.sender_type === 'student'
                              ? 'bg-neutral-100 text-neutral-800 ml-auto'
                              : 'bg-neutral-800 text-white mr-auto'
                          }`}
                        >
                          <p>{m.content}</p>
                          <span className="block text-[8px] text-neutral-400 mt-1.5 text-right">
                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </StudentConsentCheck>
      )}

      {activeTab === 'notes' && (
        /* Clinical Session Notes Tab */
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-neutral-800 tracking-tight">Booked Appointment Session Notes</h3>
          {appointments.length === 0 ? (
            <div className="p-8 text-center text-xs text-neutral-400 bg-white rounded-3xl border border-neutral-100 italic">
              No appointments scheduled with this student.
            </div>
          ) : (
            <div className="space-y-4">
              {appointments.map((appt) => {
                const isExpanded = expandedAppointmentId === appt.id;
                const hasNotes = appt.counselor_notes && appt.counselor_notes.length > 0;
                
                return (
                  <div key={appt.id} className="bg-white border border-neutral-100 rounded-3xl p-5 shadow-sm space-y-3">
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <div>
                        <span className="block text-xs font-bold text-neutral-800">
                          {new Date(appt.scheduled_time).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-neutral-400 block uppercase font-semibold">
                          Status: {appt.status}
                        </span>
                      </div>

                      <button
                        onClick={() => setExpandedAppointmentId(isExpanded ? null : appt.id)}
                        className="py-1.5 px-3 bg-neutral-800 hover:bg-neutral-900 text-white rounded-xl text-xs font-semibold transition"
                      >
                        {isExpanded ? 'Collapse' : hasNotes ? 'Edit Session Note' : 'Add Session Note'}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="pt-3 border-t border-neutral-50 mt-2">
                        <SessionNotesEditor
                          appointmentId={appt.id}
                          studentId={profile.id}
                          studentPseudonym={profile.pseudonym}
                          appointmentTime={appt.scheduled_time}
                          tenantSubdomain={tenantSubdomain}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
