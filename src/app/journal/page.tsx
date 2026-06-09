// src/app/[tenant]/journal/page.tsx
import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';
import { JournalRepository } from '../../lib/repositories/journal.repository';
import { submitJournalLog, deleteJournal } from '../../lib/actions/journal.actions';

const journalRepo = new JournalRepository();

export default async function StudentJournalPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams.q || '';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Retrieve decrypted entries list matching search query hashes
  const entries = await journalRepo.getEntries(user.id, query);

  // Server Action triggers in form submit context
  const handleCreateEntry = async (formData: FormData) => {
    'use server';
    const text = formData.get('content') as string;
    const isGratitude = formData.get('isGratitude') === 'on';

    if (!text?.trim()) return;

    await submitJournalLog(process.env.NEXT_PUBLIC_TENANT_KEY || 'nmims', text, isGratitude, 0.0, 'low');
  };

  const handleDeleteEntry = async (formData: FormData) => {
    'use server';
    const id = formData.get('id') as string;
    if (id) {
      await deleteJournal(process.env.NEXT_PUBLIC_TENANT_KEY || 'nmims', id);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-semibold text-neutral-800 tracking-tight">
          Wellness Journal
        </h2>
        <p className="text-sm text-neutral-500 mt-1">
          A secure, private space. All entries are encrypted-at-rest.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Editor Form */}
        <div className="lg:col-span-1 p-6 bg-white/70 backdrop-blur-md border border-neutral-100 rounded-3xl h-fit space-y-4">
          <h3 className="text-sm font-semibold text-neutral-800 uppercase tracking-wider">
            New Entry
          </h3>
          <form action={handleCreateEntry} className="space-y-4">
            <textarea
              name="content"
              required
              rows={6}
              placeholder="What is on your mind today? Write freely..."
              className="w-full p-4 bg-neutral-50 border border-neutral-200 rounded-2xl outline-none focus:bg-white focus:border-neutral-400 text-sm placeholder-neutral-400 transition"
            />

            <label className="flex items-center gap-3.5 p-3.5 bg-neutral-50 hover:bg-neutral-100/30 border border-neutral-100 rounded-2xl cursor-pointer">
              <input
                type="checkbox"
                name="isGratitude"
                className="w-5 h-5 rounded-md border-neutral-300 text-neutral-800 focus:ring-neutral-500 cursor-pointer"
              />
              <div>
                <span className="block text-xs font-semibold text-neutral-700">Gratitude Journal Entry</span>
                <span className="block text-[10px] text-neutral-400">Log things you are thankful for.</span>
              </div>
            </label>

            <button
              type="submit"
              className="w-full py-3.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-2xl text-sm font-medium transition cursor-pointer"
            >
              Save Entry
            </button>
          </form>
        </div>

        {/* History & Search list */}
        <div className="lg:col-span-2 space-y-6">
          {/* Search box */}
          <form method="GET" className="flex gap-2">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search previous journals by keyword..."
              className="flex-1 px-5 py-3.5 bg-white/70 border border-neutral-200 focus:border-neutral-400 rounded-2xl outline-none text-sm transition"
            />
            <button
              type="submit"
              className="px-6 py-3.5 bg-neutral-900 text-white rounded-2xl text-sm font-medium cursor-pointer"
            >
              Search
            </button>
          </form>

          {/* Cards listing */}
          <div className="space-y-4">
            {entries.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-neutral-200 rounded-3xl text-sm text-neutral-400">
                No journal logs found. Log your first check-in above.
              </div>
            ) : (
              entries.map((entry) => (
                <div
                  key={entry.id}
                  className="p-6 bg-white/70 backdrop-blur-md border border-neutral-100 rounded-3xl space-y-4 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                        {new Date(entry.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                      {entry.is_gratitude && (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 text-[9px] font-bold uppercase tracking-wider rounded-full">
                          ♥ Gratitude
                        </span>
                      )}
                    </div>

                    <form action={handleDeleteEntry}>
                      <input type="hidden" name="id" value={entry.id} />
                      <button
                        type="submit"
                        className="text-xs text-rose-500 hover:text-rose-700 font-medium cursor-pointer"
                      >
                        Delete
                      </button>
                    </form>
                  </div>

                  <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">
                    {entry.content}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
