// src/lib/permissions/permissions.ts
// Defines resources, actions, and key permission definitions for the MindSpire RBAC system.

export type Action = 'create' | 'read' | 'update' | 'delete';

export type Resource =
  | 'profile'
  | 'mood_logs'
  | 'journals'
  | 'chats'
  | 'appointments'
  | 'counselor_notes'
  | 'assessments'
  | 'community_posts'
  | 'community_comments'
  | 'resources'
  | 'billing'
  | 'moderation_queue'
  | 'feature_flags';

export interface Permission {
  action: Action;
  resource: Resource;
  conditions?: (context: any) => boolean;
}
