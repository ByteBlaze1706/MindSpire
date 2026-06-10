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

function evaluateStressSeverity(score: number): string {
  if (score >= 13) return 'High Stress';
  if (score >= 6) return 'Moderate Stress';
  return 'Low Stress';
}

function evaluateBurnoutSeverity(score: number): string {
  if (score >= 13) return 'High Burnout Risk';
  if (score >= 6) return 'Moderate Burnout Risk';
  return 'Low Burnout Risk';
}

function evaluateWellnessSeverity(score: number): string {
  if (score >= 19) return 'High Wellbeing';
  if (score >= 10) return 'Moderate Wellbeing';
  return 'Low Wellbeing';
}

export async function submitAssessmentResult(
  tenantSubdomain: string,
  typeId: string,
  typeName: string,
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
  
  let severity = 'Minimal';
  if (typeName === 'PHQ-9') {
    severity = evaluatePHQ9Severity(totalScore);
  } else if (typeName === 'GAD-7') {
    severity = evaluateGAD7Severity(totalScore);
  } else if (typeName.includes('Stress')) {
    severity = evaluateStressSeverity(totalScore);
  } else if (typeName.includes('Burnout')) {
    severity = evaluateBurnoutSeverity(totalScore);
  } else if (typeName.includes('Wellness')) {
    severity = evaluateWellnessSeverity(totalScore);
  } else {
    severity = totalScore >= 10 ? 'Moderate' : 'Mild';
  }

  try {
    // Fetch the most recent past result of the same type for comparison (before inserting)
    const { data: lastResult } = await supabase
      .from('assessment_results')
      .select('total_score, severity_level')
      .eq('user_id', user.id)
      .eq('assessment_type_id', typeId)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const previousScore = lastResult ? lastResult.total_score : null;
    const previousSeverity = lastResult ? lastResult.severity_level : null;

    // 2. Save results dynamically in transactional repository flow
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

    // 3. Clinical safety check - suicidal ideation flag or severe distress
    const phq9Q9Value = typeName === 'PHQ-9'
      ? (answers.find((a) => a.questionId === 'b1c2d3e4-9999-9999-9999-999999999999')?.value || 0)
      : 0;

    const isCritical = (typeName === 'PHQ-9' && (phq9Q9Value > 0 || totalScore >= 20)) ||
                       (typeName === 'GAD-7' && totalScore >= 15);

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
    return {
      success: true,
      severity,
      totalScore,
      isCritical,
      previousScore,
      previousSeverity,
      hasPrevious: lastResult !== null
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
