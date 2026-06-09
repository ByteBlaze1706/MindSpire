// src/lib/actions/mood.actions.ts
'use server';

import { createClient } from '../supabase/server';
import { MoodRepository, MoodDescriptor } from '../repositories/mood.repository';
import { revalidatePath } from 'next/cache';

const moodRepo = new MoodRepository();

export async function submitDailyMoodCheckIn(
  tenantSubdomain: string,
  descriptor: MoodDescriptor,
  tags: string[],
  notes: string | null
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
    await moodRepo.logMood({
      institution_id: profile.institution_id,
      user_id: user.id,
      descriptor,
      tags,
      notes,
    });
    
    revalidatePath(`/${tenantSubdomain}/dashboard`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
