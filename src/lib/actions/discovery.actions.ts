// src/lib/actions/discovery.actions.ts
'use server';

import { TenantRepository } from '../repositories/tenant.repository';

const tenantRepo = new TenantRepository();

/**
 * Searches for institutions by name.
 */
export async function searchInstitutionsByName(query: string) {
  try {
    const list = await tenantRepo.searchInstitutions(query);
    return { success: true, data: list };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Validates an access code and returns the subdomain for redirection.
 */
export async function verifyInstitutionCode(code: string) {
  try {
    const tenant = await tenantRepo.verifyAccessCode(code);
    if (!tenant) {
      return { success: false, error: 'Invalid institution access code.' };
    }
    return { success: true, subdomain: tenant.subdomain };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
