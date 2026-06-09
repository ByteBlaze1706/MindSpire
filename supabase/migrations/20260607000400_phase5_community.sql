-- Supabase Migration: 20260607000400_phase5_community.sql
-- Description: Database modifications for Phase 5 Community Portal, Reputation, Recommendation History, and Appeals.

-- 1. Adjust reactions check constraint
ALTER TABLE public.reactions DROP CONSTRAINT IF EXISTS reaction_target_check;
ALTER TABLE public.reactions DROP CONSTRAINT IF EXISTS reactions_reaction_type_check;

ALTER TABLE public.reactions ADD CONSTRAINT reactions_reaction_type_check CHECK (
    reaction_type IN ('support', 'helpful', 'relatable', 'encouraging')
);

ALTER TABLE public.reactions ADD CONSTRAINT reaction_target_check CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL) OR
    (post_id IS NULL AND comment_id IS NOT NULL)
);

-- 2. Add category to community_posts
ALTER TABLE public.community_posts 
ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'General Support' 
CHECK (category IN ('Academic Stress', 'Exam Anxiety', 'Relationships', 'Motivation', 'Career', 'Wellness', 'General Support'));

CREATE INDEX IF NOT EXISTS idx_posts_category ON public.community_posts(category);

-- 3. Add reputation metrics to anonymous_profiles
ALTER TABLE public.anonymous_profiles
ADD COLUMN IF NOT EXISTS helpful_score INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS report_count INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS positive_contributions INT NOT NULL DEFAULT 0;

-- 4. Add soft deletes and threaded parenting to community_comments
ALTER TABLE public.community_comments 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.community_comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_comments_deleted ON public.community_comments(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_comments_parent ON public.community_comments(parent_id);

-- 5. Resource Recommendation History Table
CREATE TABLE IF NOT EXISTS public.resource_recommendation_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
    recommended_reason VARCHAR(255) NOT NULL, -- e.g. 'mood:Stressed', 'assessment:PHQ-9'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rec_history_user ON public.resource_recommendation_history(user_id);
ALTER TABLE public.resource_recommendation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY manage_own_rec_history ON public.resource_recommendation_history
    FOR ALL TO authenticated USING (user_id = auth.uid());

-- 6. Moderation Appeals Table
CREATE TABLE IF NOT EXISTS public.moderation_appeals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    action_id UUID REFERENCES public.moderation_actions(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'rejected')),
    resolution_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appeals_institution ON public.moderation_appeals(institution_id);
CREATE INDEX IF NOT EXISTS idx_appeals_user ON public.moderation_appeals(user_id);

ALTER TABLE public.moderation_appeals ENABLE ROW LEVEL SECURITY;

CREATE POLICY student_manage_own_appeals ON public.moderation_appeals
    FOR ALL TO authenticated
    USING (user_id = auth.uid() AND institution_id = public.get_current_user_tenant());

CREATE POLICY moderator_manage_all_appeals ON public.moderation_appeals
    FOR ALL TO authenticated
    USING (
        institution_id = public.get_current_user_tenant() AND
        public.get_current_user_role() IN ('moderator', 'inst_admin')
    );

CREATE TRIGGER update_moderation_appeals_modtime 
BEFORE UPDATE ON public.moderation_appeals 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Audit trigger for moderation appeals
CREATE TRIGGER audit_moderation_appeals 
AFTER INSERT OR UPDATE OR DELETE ON public.moderation_appeals 
FOR EACH ROW EXECUTE FUNCTION public.log_security_audit_event();
