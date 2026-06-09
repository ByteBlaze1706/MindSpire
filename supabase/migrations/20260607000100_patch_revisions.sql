-- Supabase Migration: 20260607000100_patch_revisions.sql
-- Description: Patch applying requested Phase 2 revisions:
-- 1. Creates auxiliary tables: languages, anonymous_profiles, risk_scores, feature_flags, institution_feature_flags.
-- 2. Adds encryption tracking metadata and soft deletes (deleted_at).
-- 3. Overhauls RLS policies for counselor scope checks, including super_admin bypass rules.

-- =====================================================================
-- 1. ADD NEW AUXILIARY DIRECTORIES AND SUPPORTING TABLES
-- =====================================================================

-- Languages Directory Table
CREATE TABLE public.languages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(10) NOT NULL UNIQUE CHECK (code ~ '^[a-z]{2}(-[A-Z]{2})?$'), -- Standard iso locales check (e.g. en, en-US)
    name VARCHAR(100) NOT NULL,
    native_name VARCHAR(100),
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Decoupled Anonymous Profiles (Replaces inline column on users)
CREATE TABLE public.anonymous_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    pseudonym VARCHAR(100) NOT NULL UNIQUE,
    avatar_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Decouple pseudonym column from users
ALTER TABLE public.users DROP COLUMN IF EXISTS anonymous_pseudonym;

-- Historical Risk Scoring Record Tracker
CREATE TABLE public.risk_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    score NUMERIC(5,2) NOT NULL CHECK (score BETWEEN 0.0 AND 100.0),
    indicators JSONB NOT NULL DEFAULT '{}'::jsonb, -- Store matching triggers: PHQ-9 Q9, low moods average etc.
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SaaS Global Feature Flags Catalog
CREATE TABLE public.feature_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    default_enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SaaS Tenant Feature Overrides
CREATE TABLE public.institution_feature_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    flag_id UUID NOT NULL REFERENCES public.feature_flags(id) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_institution_flag UNIQUE (institution_id, flag_id)
);

-- Enable updated_at auto-triggers on new tables
CREATE TRIGGER update_anonymous_profiles_modtime BEFORE UPDATE ON public.anonymous_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_feature_flags_modtime BEFORE UPDATE ON public.feature_flags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_institution_feature_flags_modtime BEFORE UPDATE ON public.institution_feature_flags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- 2. FIELD ALTERATIONS (ENCRYPTION METADATA & SOFT DELETES)
-- =====================================================================

-- Add key tracking pointers to encryptable targets
ALTER TABLE public.journal_entries 
ADD COLUMN IF NOT EXISTS key_reference VARCHAR(255),
ADD COLUMN IF NOT EXISTS encryption_version VARCHAR(50) DEFAULT 'v1';

ALTER TABLE public.ai_chat_messages 
ADD COLUMN IF NOT EXISTS key_reference VARCHAR(255),
ADD COLUMN IF NOT EXISTS encryption_version VARCHAR(50) DEFAULT 'v1';

ALTER TABLE public.counselor_notes 
ADD COLUMN IF NOT EXISTS key_reference VARCHAR(255),
ADD COLUMN IF NOT EXISTS encryption_version VARCHAR(50) DEFAULT 'v1';

-- Add soft delete (deleted_at) fields
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Performance Indexes on soft delete scans
CREATE INDEX IF NOT EXISTS idx_journal_deleted ON public.journal_entries(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_appts_deleted ON public.appointments(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_posts_deleted ON public.community_posts(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_res_deleted ON public.resources(deleted_at) WHERE deleted_at IS NULL;

-- =====================================================================
-- 3. SECURITY DEFINER HELPER FUNCTION ADJUSTMENTS FOR RLS
-- =====================================================================

-- Helper: Checks if student has counselor assigned via appointment
CREATE OR REPLACE FUNCTION public.counselor_is_assigned_to_student(p_student_id UUID, p_counselor_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.appointments
    WHERE appointments.student_id = p_student_id
      AND appointments.counselor_id = p_counselor_id
      AND appointments.status IN ('scheduled', 'completed')
      AND appointments.deleted_at IS NULL
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper: Checks if counselor has active consent grant for student
CREATE OR REPLACE FUNCTION public.counselor_has_consent(p_student_id UUID, p_counselor_id UUID, p_grant_type VARCHAR)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.consent_grants
    WHERE consent_grants.student_id = p_student_id
      AND consent_grants.counselor_id = p_counselor_id
      AND consent_grants.grant_type IN (p_grant_type, 'both')
      AND consent_grants.status = 'active'
      AND consent_grants.expires_at > now()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- =====================================================================
-- 4. OVERHAUL ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================

-- Enable RLS on new tables
ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anonymous_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_feature_flags ENABLE ROW LEVEL SECURITY;

-- 4.1 Global tables super_admin bypasses and reads
CREATE POLICY read_languages ON public.languages FOR SELECT TO authenticated USING (is_enabled = true);
CREATE POLICY super_manage_languages ON public.languages FOR ALL TO authenticated USING (public.get_current_user_role() = 'super_admin');

CREATE POLICY read_global_flags ON public.feature_flags FOR SELECT TO authenticated USING (true);
CREATE POLICY super_manage_global_flags ON public.feature_flags FOR ALL TO authenticated USING (public.get_current_user_role() = 'super_admin');

CREATE POLICY view_institution_flags ON public.institution_feature_flags FOR SELECT TO authenticated 
    USING (institution_id = public.get_current_user_tenant() OR public.get_current_user_role() = 'super_admin');
CREATE POLICY super_manage_institution_flags ON public.institution_feature_flags FOR ALL TO authenticated USING (public.get_current_user_role() = 'super_admin');

-- 4.2 Anonymous Profiles RLS
CREATE POLICY student_own_anon_profile ON public.anonymous_profiles FOR ALL TO authenticated
    USING (user_id = auth.uid() AND institution_id = public.get_current_user_tenant());
CREATE POLICY view_anon_profiles ON public.anonymous_profiles FOR SELECT TO authenticated
    USING (institution_id = public.get_current_user_tenant()); -- Allow reading community names
CREATE POLICY super_admin_bypass_anon ON public.anonymous_profiles FOR ALL TO authenticated USING (public.get_current_user_role() = 'super_admin');

-- 4.3 Risk Scores RLS
CREATE POLICY counselor_view_manage_risk ON public.risk_scores FOR ALL TO authenticated
    USING (
        (institution_id = public.get_current_user_tenant() AND public.get_current_user_role() = 'counselor') OR
        public.get_current_user_role() = 'super_admin'
    );

-- 4.4 Overwrite Profiles Policy (Users)
DROP POLICY IF EXISTS view_profiles ON public.users;
CREATE POLICY view_profiles ON public.users FOR SELECT TO authenticated
    USING (
        public.get_current_user_role() = 'super_admin' OR
        (
            institution_id = public.get_current_user_tenant() AND 
            (
                id = auth.uid() OR 
                public.get_current_user_role() = 'inst_admin' OR
                (
                    public.get_current_user_role() = 'counselor' AND 
                    (
                        public.counselor_is_assigned_to_student(id, auth.uid()) OR
                        public.counselor_has_consent(id, auth.uid(), 'both')
                    )
                )
            )
        )
    );

-- 4.5 Overwrite Mood Logs Policy
DROP POLICY IF EXISTS counselor_read_student_moods ON public.mood_logs;
CREATE POLICY counselor_read_student_moods ON public.mood_logs FOR SELECT TO authenticated
    USING (
        public.get_current_user_role() = 'super_admin' OR
        (
            institution_id = public.get_current_user_tenant() AND 
            public.get_current_user_role() = 'counselor' AND 
            (
                public.counselor_is_assigned_to_student(user_id, auth.uid()) OR
                public.counselor_has_consent(user_id, auth.uid(), 'both')
            )
        )
    );

-- 4.6 Overwrite Journals Policy (Requires active consent ONLY, assignment is not enough to view raw journals)
DROP POLICY IF EXISTS counselor_consent_read_journals ON public.journal_entries;
CREATE POLICY counselor_consent_read_journals ON public.journal_entries FOR SELECT TO authenticated
    USING (
        deleted_at IS NULL AND
        (
            public.get_current_user_role() = 'super_admin' OR
            (
                institution_id = public.get_current_user_tenant() AND
                public.get_current_user_role() = 'counselor' AND
                public.counselor_has_consent(user_id, auth.uid(), 'journals')
            )
        )
    );

-- Filter deleted records for student own journals policy
DROP POLICY IF EXISTS student_own_journals ON public.journal_entries;
CREATE POLICY student_own_journals ON public.journal_entries FOR ALL TO authenticated
    USING (user_id = auth.uid() AND institution_id = public.get_current_user_tenant() AND deleted_at IS NULL);

-- 4.7 Overwrite AI Chats & Messages Policy (Consent required for raw AI chats)
DROP POLICY IF EXISTS counselor_consent_read_chats ON public.ai_chat_sessions;
CREATE POLICY counselor_consent_read_chats ON public.ai_chat_sessions FOR SELECT TO authenticated
    USING (
        public.get_current_user_role() = 'super_admin' OR
        (
            institution_id = public.get_current_user_tenant() AND
            public.get_current_user_role() = 'counselor' AND
            public.counselor_has_consent(user_id, auth.uid(), 'ai_chats')
        )
    );

DROP POLICY IF EXISTS counselor_consent_read_messages ON public.ai_chat_messages;
CREATE POLICY counselor_consent_read_messages ON public.ai_chat_messages FOR SELECT TO authenticated
    USING (
        public.get_current_user_role() = 'super_admin' OR
        (
            institution_id = public.get_current_user_tenant() AND
            EXISTS (
                SELECT 1 FROM public.ai_chat_sessions
                WHERE ai_chat_sessions.id = ai_chat_messages.session_id
                  AND public.counselor_has_consent(ai_chat_sessions.user_id, auth.uid(), 'ai_chats')
            )
        )
    );

-- 4.8 Overwrite Clinical Assessment Results Policy
DROP POLICY IF EXISTS counselor_read_student_assessments ON public.assessment_results;
CREATE POLICY counselor_read_student_assessments ON public.assessment_results FOR SELECT TO authenticated
    USING (
        public.get_current_user_role() = 'super_admin' OR
        (
            institution_id = public.get_current_user_tenant() AND
            public.get_current_user_role() = 'counselor' AND
            (
                public.counselor_is_assigned_to_student(user_id, auth.uid()) OR
                public.counselor_has_consent(user_id, auth.uid(), 'both')
            )
        )
    );

DROP POLICY IF EXISTS counselor_read_student_responses ON public.assessment_responses;
CREATE POLICY counselor_read_student_responses ON public.assessment_responses FOR SELECT TO authenticated
    USING (
        public.get_current_user_role() = 'super_admin' OR
        EXISTS (
            SELECT 1 FROM public.assessment_results
            WHERE assessment_results.id = assessment_responses.assessment_result_id
              AND assessment_results.institution_id = public.get_current_user_tenant()
              AND public.get_current_user_role() = 'counselor'
              AND (
                  public.counselor_is_assigned_to_student(assessment_results.user_id, auth.uid()) OR
                  public.counselor_has_consent(assessment_results.user_id, auth.uid(), 'both')
              )
        )
    );

-- 4.9 Super Admin Bypass Policies on Appointments, Community, and CMS
CREATE POLICY super_admin_bypass_appts ON public.appointments FOR ALL TO authenticated USING (public.get_current_user_role() = 'super_admin');
CREATE POLICY super_admin_bypass_posts ON public.community_posts FOR ALL TO authenticated USING (public.get_current_user_role() = 'super_admin');
CREATE POLICY super_admin_bypass_comments ON public.community_comments FOR ALL TO authenticated USING (public.get_current_user_role() = 'super_admin');
CREATE POLICY super_admin_bypass_resources ON public.resources FOR ALL TO authenticated USING (public.get_current_user_role() = 'super_admin');

-- Soft delete filters on standard view policies
DROP POLICY IF EXISTS view_appointments ON public.appointments;
CREATE POLICY view_appointments ON public.appointments FOR SELECT TO authenticated
    USING (
        deleted_at IS NULL AND
        institution_id = public.get_current_user_tenant() AND
        (student_id = auth.uid() OR counselor_id = auth.uid())
    );

DROP POLICY IF EXISTS view_community_posts ON public.community_posts;
CREATE POLICY view_community_posts ON public.community_posts FOR SELECT TO authenticated
    USING (deleted_at IS NULL AND institution_id = public.get_current_user_tenant() AND status = 'approved');

DROP POLICY IF EXISTS view_published_resources ON public.resources;
CREATE POLICY view_published_resources ON public.resources FOR SELECT TO authenticated
    USING (deleted_at IS NULL AND institution_id = public.get_current_user_tenant() AND status = 'published');

-- =====================================================================
-- 5. AUDIT LOG TRIGGER ATTACHMENTS FOR NEW TABLES
-- =====================================================================
CREATE TRIGGER audit_anonymous_profiles AFTER INSERT OR UPDATE OR DELETE ON public.anonymous_profiles FOR EACH ROW EXECUTE FUNCTION public.log_security_audit_event();
CREATE TRIGGER audit_risk_scores AFTER INSERT OR UPDATE ON public.risk_scores FOR EACH ROW EXECUTE FUNCTION public.log_security_audit_event();
CREATE TRIGGER audit_institution_feature_flags AFTER INSERT OR UPDATE OR DELETE ON public.institution_feature_flags FOR EACH ROW EXECUTE FUNCTION public.log_security_audit_event();
