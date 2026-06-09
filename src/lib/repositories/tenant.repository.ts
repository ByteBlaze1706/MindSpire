// src/lib/repositories/tenant.repository.ts
// Data access methods for the institutions (tenants) configuration.
import { createClient } from '../supabase/server';

export interface Institution {
  id: string;
  name: string;
  subdomain: string;
  branding_config: {
    primaryColor: string;
    accentColor: string;
    logoUrl: string;
    supportEmail: string;
    emergencyPhone: string;
  };
  access_code: string | null;
  allowed_domains: string[];
  created_at: string;
}

export class TenantRepository {
  /**
   * Fetches tenant configuration by subdomain/slug path key.
   */
  async getBySubdomain(subdomain: string): Promise<Institution | null> {
    console.log('[TenantRepository.getBySubdomain START] subdomain:', subdomain);
    console.log('[TenantRepository.getBySubdomain ENV] URL:', process.env.NEXT_PUBLIC_SUPABASE_URL, 'KEY PRESENT:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('institutions')
        .select('*')
        .eq('subdomain', subdomain)
        .single();

      if (error) {
        console.error('[TenantRepository.getBySubdomain DB ERROR]:', error);
      }
      if (!data) {
        console.warn('[TenantRepository.getBySubdomain NO DATA]');
      } else {
        console.log('[TenantRepository.getBySubdomain SUCCESS] Found tenant:', data.name);
      }

      if (error || !data) {
        return null;
      }

      return data as Institution;
    } catch (e: any) {
      console.error('[TenantRepository.getBySubdomain EXCEPTION]:', e.message, e.stack);
      return null;
    }
  }

  /**
   * Searches institutions matching a text query (for the discovery search portal).
   */
  async searchInstitutions(query: string): Promise<Pick<Institution, 'id' | 'name' | 'subdomain'>[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('institutions')
      .select('id, name, subdomain')
      .ilike('name', `%${query}%`)
      .limit(10);

    if (error || !data) {
      return [];
    }

    return data;
  }

  /**
   * Validates an access code and returns the matching tenant info.
   */
  async verifyAccessCode(code: string): Promise<Institution | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('institutions')
      .select('*')
      .eq('access_code', code)
      .single();

    if (error || !data) {
      return null;
    }

    return data as Institution;
  }
}
