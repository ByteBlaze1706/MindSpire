// src/components/counselor/counselor-calendar.tsx
'use client';

import React, { useState, useTransition } from 'react';
import { CounselorAvailability, createAvailabilitySlot, deleteAvailabilitySlot } from '../../lib/actions/counselor.actions';

interface CounselorCalendarProps {
  slots: CounselorAvailability[];
  tenantSubdomain: string;
}

export function CounselorCalendar({ slots, tenantSubdomain }: CounselorCalendarProps) {
  const [isPending, startTransition] = useTransition();
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const handleAddSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startTime || !endTime || isPending) return;

    if (new Date(startTime) >= new Date(endTime)) {
      alert('Error: Start time must occur before end time.');
      return;
    }

    startTransition(async () => {
      const res = await createAvailabilitySlot(tenantSubdomain, startTime, endTime);
      if (res.success) {
        setStartTime('');
        setEndTime('');
      } else {
        alert(res.error || 'Failed to add slot.');
      }
    });
  };

  const handleDeleteSlot = (slotId: string) => {
    if (confirm('Are you sure you want to remove this availability block?')) {
      startTransition(async () => {
        await deleteAvailabilitySlot(tenantSubdomain, slotId);
      });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Create Availability Slot Form */}
      <div className="bg-white rounded-3xl border border-neutral-100 p-6 space-y-4 shadow-sm h-fit">
        <h3 className="text-lg font-semibold text-neutral-800 tracking-tight">Manage Availability</h3>
        <p className="text-xs text-neutral-500 leading-relaxed">
          Select date and hours blocks to create open booking slots for students in your university.
        </p>

        <form onSubmit={handleAddSlot} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-[10px] uppercase font-bold text-neutral-400">Start Time</label>
            <input
              type="datetime-local"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full p-3 bg-neutral-50 border border-neutral-100 rounded-2xl text-xs text-neutral-700 outline-none focus:border-neutral-200 transition"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] uppercase font-bold text-neutral-400">End Time</label>
            <input
              type="datetime-local"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full p-3 bg-neutral-50 border border-neutral-100 rounded-2xl text-xs text-neutral-700 outline-none focus:border-neutral-200 transition"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3 bg-neutral-800 hover:bg-neutral-900 text-white rounded-2xl text-xs font-semibold disabled:opacity-50 transition duration-150"
          >
            {isPending ? 'Saving block...' : 'Add Availability Slot'}
          </button>
        </form>
      </div>

      {/* Available Slots List */}
      <div className="lg:col-span-2 bg-white rounded-3xl border border-neutral-100 p-6 shadow-sm space-y-4">
        <h3 className="text-lg font-semibold text-neutral-800 tracking-tight">Active Schedule Blocks</h3>
        
        {slots.length === 0 ? (
          <div className="text-center py-12 bg-neutral-50/50 rounded-2xl border border-dashed border-neutral-200/50">
            <span className="text-2xl">📅</span>
            <p className="text-xs text-neutral-400 mt-2">No availability blocks registered yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[360px] overflow-y-auto pr-2">
            {slots.map((slot) => (
              <div
                key={slot.id}
                className={`p-4 rounded-2xl border flex flex-col justify-between items-start gap-3 transition ${
                  slot.is_booked
                    ? 'bg-neutral-50 border-neutral-200 text-neutral-500'
                    : 'bg-white border-neutral-100 text-neutral-800 hover:border-neutral-200 shadow-sm'
                }`}
              >
                <div>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-md text-[8px] uppercase font-bold ${
                      slot.is_booked ? 'bg-neutral-200 text-neutral-600' : 'bg-emerald-50 text-emerald-800'
                    }`}
                  >
                    {slot.is_booked ? 'Booked' : 'Open Slot'}
                  </span>
                  
                  <div className="mt-2 text-xs font-semibold">
                    <p className="text-neutral-500">From:</p>
                    <p className="text-neutral-800">{new Date(slot.start_time).toLocaleString()}</p>
                    <p className="text-neutral-500 mt-1">To:</p>
                    <p className="text-neutral-800">{new Date(slot.end_time).toLocaleString()}</p>
                  </div>
                </div>

                {!slot.is_booked && (
                  <button
                    onClick={() => handleDeleteSlot(slot.id)}
                    className="text-[10px] font-bold text-rose-500 hover:text-rose-700 transition uppercase tracking-wider"
                  >
                    Delete Slot
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
