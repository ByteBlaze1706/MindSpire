// src/lib/actions/onboarding.actions.ts
'use server';

import { createClient } from '../supabase/server';
import { OnboardingService } from '../services/onboarding.service';

const onboardingService = new OnboardingService();

export async function submitOnboardingFlow(
  tenantSubdomain: string,
  payload: {
    realFirstName: string;
    realLastName: string;
    pseudonym: string;
    avatarConfig: Record<string, any>;
    languagePreference: string;
    counselorConsent?: {
      counselorId: string;
      grantType: 'journals' | 'ai_chats' | 'both';
      daysValid: number;
    };
    notifications: {
      email: boolean;
      push: boolean;
      in_app: boolean;
    };
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized: Session user context missing.' };
  }

  try {
    await onboardingService.onboardStudent(user.id, payload);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
