// src/lib/permissions/roles.ts
// Maps roles to specific permission rules and context-based condition helpers.
import { Permission, Action, Resource } from './permissions';

export type Role = 'student' | 'counselor' | 'inst_admin' | 'moderator' | 'super_admin';

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  student: [
    { action: 'read', resource: 'profile', conditions: (ctx) => ctx.userId === ctx.targetUserId },
    { action: 'update', resource: 'profile', conditions: (ctx) => ctx.userId === ctx.targetUserId },
    
    { action: 'create', resource: 'mood_logs' },
    { action: 'read', resource: 'mood_logs', conditions: (ctx) => ctx.userId === ctx.targetUserId },
    
    { action: 'create', resource: 'journals' },
    { action: 'read', resource: 'journals', conditions: (ctx) => ctx.userId === ctx.targetUserId },
    { action: 'update', resource: 'journals', conditions: (ctx) => ctx.userId === ctx.targetUserId },
    { action: 'delete', resource: 'journals', conditions: (ctx) => ctx.userId === ctx.targetUserId },
    
    { action: 'create', resource: 'chats' },
    { action: 'read', resource: 'chats', conditions: (ctx) => ctx.userId === ctx.targetUserId },
    { action: 'delete', resource: 'chats', conditions: (ctx) => ctx.userId === ctx.targetUserId },
    
    { action: 'create', resource: 'appointments' },
    { action: 'read', resource: 'appointments', conditions: (ctx) => ctx.userId === ctx.targetUserId },
    { action: 'delete', resource: 'appointments', conditions: (ctx) => ctx.userId === ctx.targetUserId },
    
    { action: 'create', resource: 'assessments' },
    { action: 'read', resource: 'assessments', conditions: (ctx) => ctx.userId === ctx.targetUserId },
    
    { action: 'create', resource: 'community_posts' },
    { action: 'read', resource: 'community_posts' },
    { action: 'update', resource: 'community_posts', conditions: (ctx) => ctx.userId === ctx.targetUserId },
    { action: 'delete', resource: 'community_posts', conditions: (ctx) => ctx.userId === ctx.targetUserId },

    { action: 'create', resource: 'community_comments' },
    { action: 'read', resource: 'community_comments' },
    { action: 'update', resource: 'community_comments', conditions: (ctx) => ctx.userId === ctx.targetUserId },
    { action: 'delete', resource: 'community_comments', conditions: (ctx) => ctx.userId === ctx.targetUserId },
    
    { action: 'read', resource: 'resources' },
  ],

  counselor: [
    { action: 'read', resource: 'profile', conditions: (ctx) => ctx.isAssigned || ctx.hasConsent },
    { action: 'read', resource: 'mood_logs', conditions: (ctx) => ctx.isAssigned || ctx.hasConsent },
    { action: 'read', resource: 'journals', conditions: (ctx) => ctx.hasConsent }, -- Assignment is not enough for journals
    { action: 'read', resource: 'chats', conditions: (ctx) => ctx.hasConsent },    -- Assignment is not enough for chats
    
    { action: 'create', resource: 'appointments' },
    { action: 'read', resource: 'appointments', conditions: (ctx) => ctx.counselorId === ctx.userId },
    { action: 'update', resource: 'appointments', conditions: (ctx) => ctx.counselorId === ctx.userId },
    { action: 'delete', resource: 'appointments', conditions: (ctx) => ctx.counselorId === ctx.userId },
    
    { action: 'create', resource: 'counselor_notes' },
    { action: 'read', resource: 'counselor_notes', conditions: (ctx) => ctx.counselorId === ctx.userId },
    { action: 'update', resource: 'counselor_notes', conditions: (ctx) => ctx.counselorId === ctx.userId },
    
    { action: 'read', resource: 'assessments', conditions: (ctx) => ctx.isAssigned || ctx.hasConsent },
    { action: 'read', resource: 'resources' },
  ],

  inst_admin: [
    { action: 'read', resource: 'profile' },
    { action: 'create', resource: 'resources' },
    { action: 'read', resource: 'resources' },
    { action: 'update', resource: 'resources' },
    { action: 'delete', resource: 'resources' },
    { action: 'read', resource: 'billing' },
  ],

  moderator: [
    { action: 'read', resource: 'community_posts' },
    { action: 'update', resource: 'community_posts' },
    { action: 'delete', resource: 'community_posts' },
    { action: 'read', resource: 'community_comments' },
    { action: 'update', resource: 'community_comments' },
    { action: 'delete', resource: 'community_comments' },
    { action: 'read', resource: 'moderation_queue' },
    { action: 'update', resource: 'moderation_queue' },
  ],

  super_admin: [], // Super Admin bypasses evaluation entirely
};
