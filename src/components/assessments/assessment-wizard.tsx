// src/components/assessments/assessment-wizard.tsx
'use client';

import React, { useState, useTransition } from 'react';
import { submitAssessmentResult } from '../../lib/actions/assessment.actions';

interface QuestionOption {
  label: string;
  value: number;
}

interface Question {
  id: string;
  question_text: string;
  display_order: number;
  options: QuestionOption[];
}

interface AssessmentWizardProps {
  questions: Question[];
  testId: string;
  testName: string;
  tenantSubdomain: string;
}

export function AssessmentWizard({
  questions,
  testId,
  testName,
  tenantSubdomain,
}: AssessmentWizardProps) {
  const [isPending, startTransition] = useTransition();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  
  // Results view state
  const [showResult, setShowResult] = useState(false);
  const [resultData, setResultData] = useState<{
    severity: string;
    totalScore: number;
    isCritical: boolean;
    previousScore: number | null;
    previousSeverity: string | null;
    hasPrevious: boolean;
  } | null>(null);

  const activeQuestion = questions[currentStep];
  const isLastQuestion = currentStep === questions.length - 1;

  const handleSelectOption = (questionId: string, val: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: val }));
  };

  const handleNext = () => {
    if (answers[activeQuestion.id] === undefined) return;
    if (!isLastQuestion) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (answers[activeQuestion.id] === undefined || isPending) return;

    const answersPayload = questions.map((q) => ({
      questionId: q.id,
      value: answers[q.id] ?? 0,
    }));

    startTransition(async () => {
      const res = await submitAssessmentResult(
        tenantSubdomain,
        testId,
        testName,
        answersPayload
      );

      if (res.success) {
        setResultData({
          severity: res.severity!,
          totalScore: res.totalScore!,
          isCritical: res.isCritical!,
          previousScore: res.previousScore !== undefined ? res.previousScore : null,
          previousSeverity: res.previousSeverity !== undefined ? res.previousSeverity : null,
          hasPrevious: !!res.hasPrevious,
        });
        setShowResult(true);
      } else {
        alert(res.error || 'Failed to submit responses. Please try again.');
      }
    });
  };

  // 1. Intelligent Guidance Card Config Mapping
  const getIntelligentGuidance = (severity: string) => {
    const s = severity.toLowerCase();
    if (s.includes('severe') || s.includes('high')) {
      return {
        bg: 'bg-rose-50 border-rose-100 text-rose-800',
        title: 'Severe Symptoms Detected',
        text: 'Your responses indicate severe symptoms. We strongly recommend connecting with a counselor, trusted support person, or utilizing the emergency links below.',
      };
    }
    if (s.includes('moderately severe')) {
      return {
        bg: 'bg-orange-50 border-orange-100 text-orange-800',
        title: 'Moderately Severe Symptoms',
        text: 'Your responses indicate moderately severe symptoms. Regular self-care, campus wellness resources, and clinical counselor support are highly recommended.',
      };
    }
    if (s.includes('moderate')) {
      return {
        bg: 'bg-amber-50 border-amber-100 text-amber-800',
        title: 'Moderate Symptoms Detected',
        text: 'Your responses indicate moderate symptoms. Regular self-care, coping guides, and supportive peer conversations may be beneficial.',
      };
    }
    if (s.includes('mild')) {
      return {
        bg: 'bg-emerald-50 border-emerald-100 text-emerald-800',
        title: 'Mild Symptoms Detected',
        text: 'Your responses indicate mild symptoms. Consider maintaining healthy routines, tracking daily logs in your Wellness Journal, and monitoring your wellbeing.',
      };
    }
    // Minimal / Low
    return {
      bg: 'bg-sky-50 border-sky-100 text-sky-800',
      title: 'Minimal / Stable Symptoms',
      text: 'Your responses indicate minimal symptoms. Keep up your active self-care habits and daily wellness tracking!',
    };
  };

  // 2. Progress Difference Tracking Math
  const renderProgressIndicator = (curr: number, prev: number | null, type: string) => {
    if (prev === null) return null;
    const isWellness = type.toLowerCase().includes('wellness');
    const diff = curr - prev;

    if (diff === 0) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-neutral-100 border border-neutral-200 text-neutral-600 rounded-full text-xs font-semibold">
          Stable (No Change from previous score: {prev})
        </span>
      );
    }

    // For Wellness: higher is better (improvement)
    // For others (depression, anxiety, stress, burnout): lower is better (improvement)
    const isImprovement = isWellness ? diff > 0 : diff < 0;
    const absDiff = Math.abs(diff);

    if (isImprovement) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
          🎉 Improvement: {absDiff} {absDiff === 1 ? 'point' : 'points'} {diff < 0 ? 'lower' : 'higher'} than previous score ({prev})
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-100 text-rose-700 rounded-full text-xs font-semibold">
          ⚠️ Decline: {absDiff} {absDiff === 1 ? 'point' : 'points'} {diff > 0 ? 'higher' : 'lower'} than previous score ({prev})
        </span>
      );
    }
  };

  // RENDER RESULTS SCREEN
  if (showResult && resultData) {
    const guidance = getIntelligentGuidance(resultData.severity);
    return (
      <div className="p-8 bg-white/80 backdrop-blur-md border border-neutral-100 rounded-3xl space-y-8 shadow-sm animate-scale-up">
        {/* Header */}
        <div className="border-b border-neutral-100 pb-5">
          <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
            Assessment Completed
          </span>
          <h3 className="text-2xl font-bold text-neutral-800 mt-1 tracking-tight">
            {testName} Results
          </h3>
        </div>

        {/* Score & Comparison Display */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="p-6 bg-neutral-50 border border-neutral-100 rounded-2xl text-center md:col-span-1">
            <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
              Your Total Score
            </span>
            <span className="block text-5xl font-extrabold text-neutral-800 mt-2">
              {resultData.totalScore}
            </span>
            <span className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mt-2">
              {resultData.severity}
            </span>
          </div>

          <div className="md:col-span-2 space-y-3">
            <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Progress Tracking
            </h4>
            <div className="flex flex-wrap gap-2 items-center">
              {resultData.hasPrevious ? (
                renderProgressIndicator(
                  resultData.totalScore,
                  resultData.previousScore,
                  testName
                )
              ) : (
                <span className="inline-flex items-center px-3 py-1 bg-neutral-50 border border-neutral-100 text-neutral-400 rounded-full text-xs font-medium">
                  First completion of this scale. Keep taking it regularly to track progress.
                </span>
              )}
            </div>
            {resultData.hasPrevious && (
              <p className="text-xs text-neutral-500 leading-relaxed">
                Your previous score was <strong>{resultData.previousScore}</strong> ({resultData.previousSeverity}). Consistent check-ins help build an accurate picture of your mental wellness trajectory.
              </p>
            )}
          </div>
        </div>

        {/* Intelligent Guidance Explanation Box */}
        <div className={`p-6 border rounded-2xl space-y-2 ${guidance.bg}`}>
          <h4 className="text-sm font-bold tracking-tight">{guidance.title}</h4>
          <p className="text-xs leading-relaxed opacity-90">{guidance.text}</p>
        </div>

        {/* Crisis Detection Support Card */}
        {resultData.isCritical && (
          <div className="p-6 bg-rose-600 text-white rounded-2xl border border-rose-700 shadow-lg space-y-4 animate-pulse-subtle">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🚨</span>
              <h4 className="text-base font-bold tracking-tight">You Are Not Alone</h4>
            </div>
            <p className="text-xs leading-relaxed max-w-2xl opacity-90">
              You are experiencing significant distress. Please consider reaching out immediately to a counselor, trusted medical professional, or emergency support lines. We are here to support you safely.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <a
                href="tel:14416"
                className="px-4 py-2.5 bg-white text-rose-700 hover:bg-rose-50 text-xs font-semibold rounded-xl transition shadow-sm"
              >
                📞 Call Tele-MANAS (14416)
              </a>
              <a
                href="/dashboard"
                className="px-4 py-2.5 bg-rose-700 border border-rose-500 hover:bg-rose-800 text-white text-xs font-semibold rounded-xl transition"
              >
                🤝 Request Counselor Support
              </a>
              <a
                href="/resources"
                className="px-4 py-2.5 bg-rose-700/50 hover:bg-rose-800 text-white text-xs font-semibold rounded-xl transition"
              >
                📖 Explore Crisis Guides
              </a>
            </div>
          </div>
        )}

        {/* Recommended Next Steps */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-neutral-800 tracking-tight">
            Recommended Wellness Actions
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <a
              href="/resources"
              className="p-4 bg-white hover:bg-neutral-50 border border-neutral-100 rounded-2xl flex items-center gap-3 transition shadow-sm text-xs font-semibold text-neutral-700"
            >
              <span className="text-lg">📖</span>
              <span>Explore Self-Help Resource Hub</span>
            </a>
            <a
              href="/journal"
              className="p-4 bg-white hover:bg-neutral-50 border border-neutral-100 rounded-2xl flex items-center gap-3 transition shadow-sm text-xs font-semibold text-neutral-700"
            >
              <span className="text-lg">✍️</span>
              <span>Write a Journal Reflection Entry</span>
            </a>
            <a
              href="/community"
              className="p-4 bg-white hover:bg-neutral-50 border border-neutral-100 rounded-2xl flex items-center gap-3 transition shadow-sm text-xs font-semibold text-neutral-700"
            >
              <span className="text-lg">🤝</span>
              <span>Share Anonymously in Community Feed</span>
            </a>
            <a
              href="/playhub"
              className="p-4 bg-white hover:bg-neutral-50 border border-neutral-100 rounded-2xl flex items-center gap-3 transition shadow-sm text-xs font-semibold text-neutral-700"
            >
              <span className="text-lg">🧘</span>
              <span>Try Emotional Regulating Wellness Tools</span>
            </a>
            <a
              href="/dashboard"
              className="p-4 bg-white hover:bg-neutral-50 border border-neutral-100 rounded-2xl flex items-center gap-3 transition shadow-sm text-xs font-semibold text-neutral-700"
            >
              <span className="text-lg">📅</span>
              <span>Schedule Counselor Support Session</span>
            </a>
          </div>
        </div>

        {/* Reset / Return Button */}
        <div className="pt-4 border-t border-neutral-100 flex justify-end">
          <button
            onClick={() => {
              window.location.href = '/assessments';
            }}
            className="px-6 py-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-2xl text-xs font-semibold transition"
          >
            Return to Assessments Directory
          </button>
        </div>
      </div>
    );
  }

  // QUIZ STEPPER SCREEN
  const progressPercent = Math.round(((currentStep + 1) / questions.length) * 100);

  return (
    <div className="p-8 bg-white/70 backdrop-blur-md border border-neutral-100 rounded-3xl space-y-6 shadow-sm animate-scale-up">
      {/* Header Stepper Progress */}
      <div className="space-y-3">
        <div className="flex justify-between items-center text-xs font-bold text-neutral-400 uppercase tracking-widest">
          <span>Taking {testName}</span>
          <span>
            Question {currentStep + 1} of {questions.length}
          </span>
        </div>
        {/* Progress Bar */}
        <div className="w-full bg-neutral-100 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-neutral-800 h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Active Question Panel */}
      <div className="space-y-6 py-4">
        <p className="text-base font-semibold text-neutral-800 leading-relaxed">
          {activeQuestion.question_text}
        </p>

        {/* Radio Option Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {activeQuestion.options.map((opt) => {
            const isSelected = answers[activeQuestion.id] === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelectOption(activeQuestion.id, opt.value)}
                className={`p-4 rounded-2xl border text-left cursor-pointer transition duration-150 flex items-center justify-between group ${
                  isSelected
                    ? 'bg-neutral-800 text-white border-neutral-800 shadow-md'
                    : 'bg-neutral-50 hover:bg-neutral-100/50 text-neutral-700 border-neutral-200/50'
                }`}
              >
                <span className="text-xs font-semibold">{opt.label}</span>
                <span
                  className={`w-4 h-4 rounded-full border flex items-center justify-center transition ${
                    isSelected
                      ? 'border-white bg-white text-neutral-800'
                      : 'border-neutral-300 bg-white group-hover:border-neutral-400'
                  }`}
                >
                  {isSelected && <span className="w-2 h-2 rounded-full bg-neutral-800" />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="flex justify-between items-center pt-6 border-t border-neutral-100">
        <button
          onClick={handleBack}
          disabled={currentStep === 0}
          className="px-5 py-3 border border-neutral-200 hover:bg-neutral-50 text-neutral-600 disabled:opacity-30 rounded-2xl text-xs font-semibold transition"
        >
          Previous
        </button>

        {isLastQuestion ? (
          <button
            onClick={handleSubmit}
            disabled={answers[activeQuestion.id] === undefined || isPending}
            className="px-6 py-3 bg-neutral-900 hover:bg-neutral-800 text-white disabled:opacity-40 rounded-2xl text-xs font-semibold transition"
          >
            {isPending ? 'Submitting Responses...' : 'Finish & View Score'}
          </button>
        ) : (
          <button
            onClick={handleNext}
            disabled={answers[activeQuestion.id] === undefined}
            className="px-6 py-3 bg-neutral-900 hover:bg-neutral-800 text-white disabled:opacity-40 rounded-2xl text-xs font-semibold transition"
          >
            Next Question
          </button>
        )}
      </div>
    </div>
  );
}
