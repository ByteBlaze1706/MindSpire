// src/lib/actions/assessment.actions.ts
'use server';

import { createClient } from '../supabase/server';
import { AssessmentRepository } from '../repositories/assessment.repository';
import { revalidatePath } from 'next/cache';

const assessRepo = new AssessmentRepository();

function evaluatePHQ9Severity(score: number): string {
  if (score >= 20) return 'Severe Depression';
  if (score >= 15) return 'Moderately Severe Depression';
  if (score >= 10) return 'Moderate Depression';
  if (score >= 5) return 'Mild Depression';
  return 'Minimal Depression';
}

function evaluateGAD7Severity(score: number): string {
  if (score >= 15) return 'Severe Anxiety';
  if (score >= 10) return 'Moderate Anxiety';
  if (score >= 5) return 'Mild Anxiety';
  return 'Minimal Anxiety';
}

export async function submitAssessmentResult(
  tenantSubdomain: string,
  typeId: string,
  typeName: 'PHQ-9' | 'GAD-7' | string,
  answers: { questionId: string; value: number }[]
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized: Session context missing.' };
  }

  const { data: profile } = await supabase
    .from('users')
    .select('institution_id')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return { success: false, error: 'Institution resolver mismatch.' };
  }

  // Calculate score total
  const totalScore = answers.reduce((acc, curr) => acc + curr.value, 0);
  const severity = typeName === 'PHQ-9' ? evaluatePHQ9Severity(totalScore) : evaluateGAD7Severity(totalScore);

  try {
    // 1. Save results dynamically in transactional repository flow
    await assessRepo.saveResult(
      {
        institution_id: profile.institution_id,
        user_id: user.id,
        assessment_type_id: typeId,
        total_score: totalScore,
        severity_level: severity,
      },
      answers.map((a) => ({
        question_id: a.questionId,
        selected_value: a.value,
      }))
    );

    // 2. Clinical safety check - suicidal ideation flag
    // In PHQ-9, question 9 tracks self-harm. Check if its value > 0
    const phq9Q9Value = answers.find(
      (a) => a.questionId === 'b1c2d3e4-9999-9999-9999-999999999999'
    )?.value || 0;

    const isCritical = phq9Q9Value > 0 || totalScore >= 20;

    if (isCritical) {
      // Spawn risk alert immediately
      await supabase.from('risk_alerts').insert({
        institution_id: profile.institution_id,
        user_id: user.id,
        source_type: 'assessment',
        severity: phq9Q9Value > 0 ? 'critical' : 'high',
        status: 'pending',
      });
    }

    revalidatePath('/assessments');
    return { success: true, severity, totalScore, isCritical };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
