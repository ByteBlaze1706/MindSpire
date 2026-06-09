// src/lib/permissions/rbac.ts
// Core authorization verification engine for Role-Based Access Controls.
import { Action, Resource } from './permissions';
import { Role, ROLE_PERMISSIONS } from './roles';

/**
 * Validates whether a user role is authorized to perform a specific action on a target resource.
 * Supports context-based condition evaluation for ownership and clinical consent.
 * 
 * @param role Active user role
 * @param action CRUD action (create, read, update, delete)
 * @param resource Target system resource
 * @param context Context properties (e.g. userId, targetUserId, hasConsent)
 * @returns boolean
 */
export function hasPermission(
  role: Role,
  action: Action,
  resource: Resource,
  context?: Record<string, any>
): boolean {
  // Super Admin bypasses evaluation entirely
  if (role === 'super_admin') {
    return true;
  }

  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) {
    return false;
  }

  // Find direct match for resource + action
  const permission = permissions.find(
    (p) => p.resource === resource && p.action === action
  );

  if (!permission) {
    return false;
  }

  // If a conditional check is defined, evaluate against context parameter
  if (permission.conditions) {
    return context ? permission.conditions(context) : false;
  }

  return true;
}
