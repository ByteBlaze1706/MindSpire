// src/lib/actions/journal.actions.ts
'use server';

import { createClient } from '../supabase/server';
import { JournalRepository } from '../repositories/journal.repository';
import { revalidatePath } from 'next/cache';

const journalRepo = new JournalRepository();

export async function submitJournalLog(
  tenantSubdomain: string,
  rawText: string,
  isGratitude: boolean,
  sentimentScore: number | null,
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
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

  try {
    await journalRepo.createEntry(
      user.id,
      profile.institution_id,
      rawText,
      isGratitude,
      sentimentScore,
      riskLevel
    );
    
    revalidatePath('/journal');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteJournal(tenantSubdomain: string, entryId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized: Session context missing.' };
  }

  try {
    await journalRepo.softDeleteEntry(entryId, user.id);
    revalidatePath('/journal');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
