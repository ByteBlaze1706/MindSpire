// src/lib/repositories/assessment.repository.ts
// Data access methods for PHQ-9 and GAD-7 clinical questionnaires.
import { createClient } from '../supabase/server';

export interface AssessmentType {
  id: string;
  name: string;
  description: string;
  version: string;
  scoring_guide: Record<string, any>;
  translations: Record<string, any>;
}

export interface AssessmentQuestion {
  id: string;
  assessment_type_id: string;
  question_text: string;
  display_order: number;
  options: { label: string; value: number }[];
  translations: Record<string, any>;
}

export interface AssessmentResult {
  id: string;
  institution_id: string;
  user_id: string;
  assessment_type_id: string;
  total_score: number;
  severity_level: string;
  completed_at: string;
}

export class AssessmentRepository {
  /**
   * Fetches available assessment test types.
   */
  async getTypes(): Promise<AssessmentType[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from('assessment_types').select('*');
    if (error || !data) return [];
    return data as AssessmentType[];
  }

  /**
   * Fetches questions belonging to an assessment type.
   */
  async getQuestions(typeId: string): Promise<AssessmentQuestion[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('assessment_questions')
      .select('*')
      .eq('assessment_type_id', typeId)
      .order('display_order', { ascending: true });

    if (error || !data) return [];
    return data as AssessmentQuestion[];
  }

  /**
   * Commits the test results and responses atomically.
   */
  async saveResult(
    result: Omit<AssessmentResult, 'id' | 'completed_at'>,
    responses: { question_id: string; selected_value: number }[]
  ): Promise<string> {
    const supabase = await createClient();

    // 1. Commit main result summary
    const { data: resData, error: resError } = await supabase
      .from('assessment_results')
      .insert(result)
      .select('id')
      .single();

    if (resError || !resData) {
      throw new Error(`Failed to commit assessment summary: ${resError?.message}`);
    }

    const resultId = resData.id;

    // 2. Commit detailed responses
    const responsesPayload = responses.map((r) => ({
      assessment_result_id: resultId,
      question_id: r.question_id,
      selected_value: r.selected_value,
    }));

    const { error: respError } = await supabase
      .from('assessment_responses')
      .insert(responsesPayload);

    if (respError) {
      throw new Error(`Failed to commit assessment responses: ${respError.message}`);
    }

    return resultId;
  }

  /**
   * Fetches student assessment score history.
   */
  async getResultsHistory(userId: string): Promise<(AssessmentResult & { assessment_name: string })[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('assessment_results')
      .select('*, assessment_types(name)')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });

    if (error || !data) return [];

    return data.map((row: any) => ({
      id: row.id,
      institution_id: row.institution_id,
      user_id: row.user_id,
      assessment_type_id: row.assessment_type_id,
      total_score: row.total_score,
      severity_level: row.severity_level,
      completed_at: row.completed_at,
      assessment_name: row.assessment_types?.name || 'Unknown Scale',
    }));
  }
}
