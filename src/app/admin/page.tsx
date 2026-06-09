// src/app/admin/page.tsx
import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';
import { UserRepository } from '../../lib/repositories/user.repository';
import { AdminRepository } from '../../lib/repositories/admin.repository';
import { approveCounselorAction, rejectCounselorAction } from '../../lib/actions/admin.actions';

const userRepo = new UserRepository();
const adminRepo = new AdminRepository();

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const profile = await userRepo.getById(user.id);
  if (!profile || !['inst_admin', 'super_admin'].includes(profile.role)) {
    redirect('/dashboard');
  }

  const instId = profile.institution_id;

  // Retrieve statistics
  const stats = await adminRepo.getOverviewStats(instId);
  const moodStats = await adminRepo.getMoodStats(instId);
  const assessmentStats = await adminRepo.getAssessmentStats(instId);
  const pendingCounselors = await adminRepo.getPendingCounselors(instId);

  // Counselor approval/rejection actions
  const handleApprove = async (formData: FormData) => {
    'use server';
    const cId = formData.get('counselorId') as string;
    if (cId) {
      await approveCounselorAction(cId);
    }
  };

  const handleReject = async (formData: FormData) => {
    'use server';
    const cId = formData.get('counselorId') as string;
    if (cId) {
      await rejectCounselorAction(cId);
    }
  };

  return (
    <div className="space-y-8 min-h-screen bg-gradient-to-tr from-[#FDFBF7] via-[#F5EBE6] to-[#E3EFF3] p-6 md:p-10 antialiased">
      {/* Title Header */}
      <div className="flex justify-between items-center flex-wrap gap-4 border-b border-neutral-200/50 pb-6">
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Institutional Analytics Portal</span>
          <h1 className="text-3xl font-semibold text-neutral-800 tracking-tight">Wellness Administration</h1>
          <p className="text-xs text-neutral-500 max-w-xl leading-relaxed">
            Monitor anonymous campus-wide mental health indexes and verify counselor credentials.
          </p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100/60 py-2 px-4 rounded-2xl flex items-center gap-2 text-xs font-bold text-emerald-800 shadow-sm">
          <span>🛡️</span> Zero Identity Leakage Guard Active
        </div>
      </div>

      {/* KPI Overview Widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 bg-white/70 backdrop-blur-md border border-neutral-100 rounded-3xl shadow-sm space-y-2">
          <span className="text-xl">👥</span>
          <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Active Students</span>
          <strong className="block text-3xl font-extrabold text-neutral-850">{stats.totalStudents}</strong>
        </div>

        <div className="p-6 bg-white/70 backdrop-blur-md border border-neutral-100 rounded-3xl shadow-sm space-y-2">
          <span className="text-xl">👩‍⚕️</span>
          <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Approved Counselors</span>
          <strong className="block text-3xl font-extrabold text-neutral-850">{stats.totalCounselors}</strong>
        </div>

        <div className="p-6 bg-white/70 backdrop-blur-md border border-neutral-100 rounded-3xl shadow-sm space-y-2">
          <span className="text-xl">⏳</span>
          <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Pending Approvals</span>
          <strong className="block text-3xl font-extrabold text-neutral-850">{stats.pendingCounselors}</strong>
        </div>

        <div className="p-6 bg-white/70 backdrop-blur-md border border-neutral-100 rounded-3xl shadow-sm space-y-2">
          <span className="text-xl">⚠️</span>
          <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Active Crisis Alerts</span>
          <strong className="block text-3xl font-extrabold text-rose-600">{stats.activeAlerts}</strong>
        </div>
      </div>

      {/* Analytical Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Mood Index Heatmap */}
        <div className="bg-white/70 backdrop-blur-md border border-neutral-100 rounded-[32px] p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-semibold text-neutral-800 tracking-tight">Campus Mood Index</h3>
            <p className="text-xs text-neutral-500 mt-0.5">Aggregate breakdown of student mood descriptor records.</p>
          </div>

          {Object.keys(moodStats).length === 0 ? (
            <p className="text-xs text-neutral-400 italic py-6 text-center">No mood data logged this period.</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(moodStats).map(([descriptor, count]) => {
                const total = Object.values(moodStats).reduce((a, b) => a + b, 0);
                const percent = ((count / total) * 100).toFixed(0);
                return (
                  <div key={descriptor} className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold text-neutral-700">
                      <span>{descriptor}</span>
                      <span>{count} logs ({percent}%)</span>
                    </div>
                    <div className="w-full h-2.5 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-neutral-800 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Severity Scale Distribution */}
        <div className="bg-white/70 backdrop-blur-md border border-neutral-100 rounded-[32px] p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-semibold text-neutral-800 tracking-tight">Clinical Test Distributions</h3>
            <p className="text-xs text-neutral-500 mt-0.5">Aggregate severity categories for completed GAD-7 & PHQ-9 scales.</p>
          </div>

          {Object.keys(assessmentStats).length === 0 ? (
            <p className="text-xs text-neutral-400 italic py-6 text-center">No test results submitted yet.</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(assessmentStats).map(([severity, count]) => {
                const total = Object.values(assessmentStats).reduce((a, b) => a + b, 0);
                const percent = ((count / total) * 100).toFixed(0);
                
                let barColor = 'bg-emerald-500';
                if (severity.toLowerCase().includes('severe') || severity.toLowerCase().includes('high')) {
                  barColor = 'bg-rose-500';
                } else if (severity.toLowerCase().includes('moderate')) {
                  barColor = 'bg-amber-500';
                }

                return (
                  <div key={severity} className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold text-neutral-700">
                      <span>{severity}</span>
                      <span>{count} completions ({percent}%)</span>
                    </div>
                    <div className="w-full h-2.5 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${barColor} rounded-full transition-all duration-500`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Counselor Approvals Roster */}
      <div className="bg-white/70 backdrop-blur-md border border-neutral-100 rounded-[32px] p-6 shadow-sm space-y-6">
        <div>
          <h3 className="text-base font-semibold text-neutral-800 tracking-tight">Pending Counselor Verification</h3>
          <p className="text-xs text-neutral-500 mt-0.5">Validate and authorize clinical staff access privileges.</p>
        </div>

        {pendingCounselors.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-neutral-200 rounded-2xl text-xs text-neutral-400 italic">
            No pending registration approvals in the verification queue.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-neutral-700">
              <thead>
                <tr className="border-b border-neutral-200/50 text-neutral-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="pb-3">Email Account</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100/50">
                {pendingCounselors.map((c) => (
                  <tr key={c.id} className="hover:bg-neutral-50/30 transition">
                    <td className="py-4 font-semibold text-neutral-800">{c.email}</td>
                    <td className="py-4">
                      <span className="px-2 py-0.5 bg-neutral-100 border border-neutral-200 rounded text-[9px] font-bold text-neutral-600">
                        {c.role}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <form action={handleApprove}>
                          <input type="hidden" name="counselorId" value={c.id} />
                          <button
                            type="submit"
                            className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer"
                          >
                            Approve
                          </button>
                        </form>
                        <form action={handleReject}>
                          <input type="hidden" name="counselorId" value={c.id} />
                          <button
                            type="submit"
                            className="py-1.5 px-3 bg-white border border-rose-250 text-rose-600 hover:bg-rose-50 rounded-xl font-bold cursor-pointer"
                          >
                            Reject
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
