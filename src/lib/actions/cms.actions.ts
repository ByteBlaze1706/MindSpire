// src/lib/actions/cms.actions.ts
'use server';

import { createClient } from '../supabase/server';
import { CMSRepository } from '../repositories/cms.repository';
import { revalidatePath } from 'next/cache';

const cmsRepo = new CMSRepository();

export async function toggleBookmarkResource(tenantSubdomain: string, resourceId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized: Session context missing.' };
  }

  try {
    const isBookmarked = await cmsRepo.toggleBookmark(user.id, resourceId);
    revalidatePath(`/${tenantSubdomain}/resources`);
    return { success: true, isBookmarked };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function logResourceViewEvent(resourceId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return;

  try {
    await cmsRepo.logResourceView(user.id, resourceId);
  } catch (error) {
    // Ignore error
  }
}
