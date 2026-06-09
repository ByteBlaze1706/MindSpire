// src/app/[tenant]/assessments/page.tsx
import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';
import { AssessmentRepository } from '../../lib/repositories/assessment.repository';
import { submitAssessmentResult } from '../../lib/actions/assessment.actions';

const assessRepo = new AssessmentRepository();

export default async function StudentAssessmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ take?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const targetTestId = resolvedSearchParams.take || null;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const testsList = await assessRepo.getTypes();
  const history = await assessRepo.getResultsHistory(user.id);

  // If a test taking route is requested, load the questions
  let testQuestions: any[] = [];
  let activeTestName = '';
  
  if (targetTestId) {
    testQuestions = await assessRepo.getQuestions(targetTestId);
    activeTestName = testsList.find((t) => t.id === targetTestId)?.name || '';
  }

  // Server Action invocation handler for Form submission
  const handleQuizSubmit = async (formData: FormData) => {
    'use server';
    if (!targetTestId) return;

    const answersPayload = testQuestions.map((q) => {
      const valStr = formData.get(`q-${q.id}`) as string;
      return {
        questionId: q.id,
        value: parseInt(valStr || '0', 10),
      };
    });

    await submitAssessmentResult(
      process.env.NEXT_PUBLIC_TENANT_KEY || 'nmims',
      targetTestId,
      activeTestName,
      answersPayload
    );

    // Redirect to main assessments logs list page upon completion
    redirect('/assessments');
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-semibold text-neutral-800 tracking-tight">
          Clinical Assessments
        </h2>
        <p className="text-sm text-neutral-500 mt-1">
          Clinically validated questionnaires to evaluate symptoms of depression (PHQ-9) and anxiety (GAD-7).
        </p>
      </div>

      {targetTestId ? (
        /* Questionnaire taking wizard mode */
        <div className="p-8 bg-white/70 backdrop-blur-md border border-neutral-100 rounded-3xl space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
            <h3 className="text-lg font-semibold text-neutral-800 tracking-tight">
              Taking {activeTestName} Scale
            </h3>
            <a
              href="/assessments"
              className="text-xs text-neutral-500 hover:text-neutral-700 font-medium"
            >
              Cancel
            </a>
          </div>

          <form action={handleQuizSubmit} className="space-y-8">
            {testQuestions.map((q, index) => (
              <div key={q.id} className="space-y-4">
                <p className="text-sm font-medium text-neutral-700 leading-relaxed">
                  {index + 1}. {q.question_text}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {q.options.map((opt: any) => (
                    <label
                      key={opt.value}
                      className="flex items-center gap-3 p-4 bg-neutral-50 border border-neutral-200/50 rounded-2xl cursor-pointer hover:bg-neutral-100/30 transition"
                    >
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        value={opt.value}
                        required
                        className="w-4 h-4 text-neutral-800 focus:ring-neutral-500 cursor-pointer"
                      />
                      <span className="text-xs text-neutral-600 font-medium">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <button
              type="submit"
              className="w-full py-4 bg-neutral-900 hover:bg-neutral-800 text-white rounded-2xl text-sm font-semibold transition cursor-pointer"
            >
              Submit Responses
            </button>
          </form>
        </div>
      ) : (
        /* Default List Mode */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Tests Options */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-sm font-semibold text-neutral-800 uppercase tracking-wider mb-4">
              Select Assessment
            </h3>
            {testsList.map((t) => (
              <div
                key={t.id}
                className="p-6 bg-white/70 border border-neutral-100 rounded-3xl space-y-4 shadow-sm"
              >
                <div>
                  <h4 className="text-base font-semibold text-neutral-800">{t.name}</h4>
                  <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                    {t.description}
                  </p>
                </div>
                <a
                  href={`/assessments?take=${t.id}`}
                  className="inline-block px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold uppercase tracking-wider rounded-xl transition"
                >
                  Start Quiz
                </a>
              </div>
            ))}
          </div>

          {/* Test History logs */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-semibold text-neutral-800 uppercase tracking-wider mb-4">
              Score History
            </h3>

            <div className="space-y-4">
              {history.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-neutral-200 rounded-3xl text-sm text-neutral-400">
                  No completed assessments found. Complete a scale on the left.
                </div>
              ) : (
                history.map((row) => (
                  <div
                    key={row.id}
                    className="p-5 bg-white/70 border border-neutral-100 rounded-3xl flex items-center justify-between shadow-sm"
                  >
                    <div>
                      <span className="block text-xs font-bold text-neutral-400 uppercase tracking-wider">
                        {row.assessment_name}
                      </span>
                      <span className="block text-sm font-medium text-neutral-700 mt-1">
                        Result: <strong className="text-neutral-800">{row.severity_level}</strong>
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="block text-2xl font-semibold text-neutral-800">
                        {row.total_score}
                      </span>
                      <span className="block text-[9px] text-neutral-400 uppercase tracking-widest font-bold">
                        {new Date(row.completed_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
