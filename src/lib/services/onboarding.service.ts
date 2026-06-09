// src/lib/services/onboarding.service.ts
// Handles the multi-step onboarding wizard execution. Includes server-side envelope name encryption.
import crypto from 'crypto';
import { UserRepository } from '../repositories/user.repository';
import { ConsentRepository } from '../repositories/consent.repository';

// Server-side envelope encryption helper
function encryptFieldName(name: string): string {
  const masterKey = process.env.ENCRYPTION_MASTER_KEY || 'mindspire-super-secret-key-phrase';
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(masterKey, 'mindspire-salt', 32);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(name, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

export class OnboardingService {
  private userRepo = new UserRepository();
  private consentRepo = new ConsentRepository();

  /**
   * Completes atomic student onboarding.
   */
  async onboardStudent(
    userId: string,
    payload: {
      realFirstName: string;
      realLastName: string;
      pseudonym: string;
      tokenId: string;
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
    const profile = await this.userRepo.getById(userId);
    if (!profile) {
      throw new Error('User profile not found.');
    }

    // 1. Verify Pseudonym uniqueness
    const isPseudonymTaken = await this.userRepo.pseudonymExists(payload.pseudonym);
    if (isPseudonymTaken) {
      throw new Error('Pseudonym already in use. Please select a different handle.');
    }

    // 2. Encrypt real name fields prior to database write
    const encryptedFirst = encryptFieldName(payload.realFirstName);
    const encryptedLast = encryptFieldName(payload.realLastName);

    // 3. Save name updates
    await this.userRepo.updateOnboardingProfile(userId, encryptedFirst, encryptedLast);

    // 4. Create anonymous profile
    await this.userRepo.createAnonymousProfile({
      user_id: userId,
      institution_id: profile.institution_id,
      pseudonym: payload.pseudonym,
      avatar_config: payload.avatarConfig,
      token_id: payload.tokenId,
    });

    // 5. Update notification preferences
    await this.userRepo.updateNotificationPreferences(userId, {
      email_enabled: payload.notifications.email,
      push_enabled: payload.notifications.push,
      in_app_enabled: payload.notifications.in_app,
    });

    // 6. Record optional consent grant if counselor was selected
    if (payload.counselorConsent) {
      const expires = new Date();
      expires.setDate(expires.getDate() + payload.counselorConsent.daysValid);

      await this.consentRepo.createConsentGrant({
        institution_id: profile.institution_id,
        student_id: userId,
        counselor_id: payload.counselorConsent.counselorId,
        grant_type: payload.counselorConsent.grantType,
        expires_at: expires.toISOString(),
      });
    }
  }
}
