-- Supabase Migration: 20260607000000_init_schema.sql
-- Description: Complete logical database schema for MindSpire digital mental wellness SaaS.
-- Incorporates multi-tenancy, custom user roles, RLS policies, audit triggers, localisations, notifications, and billing ledger.

-- =====================================================================
-- 0. EXTENSIONS & BOOTSTRAP ENVIRONMENT
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================================
-- 1. BASE SYSTEM TABLES (SUBSCRIPTIONS, INSTITUTIONS)
-- =====================================================================

-- SaaS Subscription Plans
CREATE TABLE public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    max_students INT NOT NULL CHECK (max_students > 0),
    price_amount NUMERIC(10, 2) NOT NULL CHECK (price_amount >= 0),
    pricing_model VARCHAR(50) NOT NULL DEFAULT 'flat_annual',
    features JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Institution (Tenant) registry
CREATE TABLE public.institutions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(63) NOT NULL UNIQUE,
    branding_config JSONB NOT NULL DEFAULT '{
        "primaryColor": "#0F4C81",
        "accentColor": "#F5AF8F",
        "logoUrl": "",
        "supportEmail": "support@mindspire.edu",
        "emergencyPhone": "911"
    }'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Subscription Instances mapped to institutions
CREATE TABLE public.institution_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('trialing', 'active', 'past_due', 'cancelled')),
    billing_cycle_start TIMESTAMPTZ NOT NULL,
    billing_cycle_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_active_institution_subscription UNIQUE (institution_id, status)
);

-- Payment Ledger
CREATE TABLE public.payment_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES public.institution_subscriptions(id) ON DELETE RESTRICT,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    payment_status VARCHAR(50) NOT NULL CHECK (payment_status IN ('paid', 'failed', 'refunded')),
    invoice_url TEXT,
    paid_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- 2. USER REGISTRY & SECURITY IDENTITY TABLES
-- =====================================================================

-- Custom User profiles linked to Supabase Auth profiles
CREATE TABLE public.users (
    id UUID PRIMARY KEY, -- Maps directly to auth.users.id
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'counselor', 'inst_admin', 'moderator', 'super_admin')),
    real_first_name TEXT, -- Application-level encrypted
    real_last_name TEXT,  -- Application-level encrypted
    anonymous_pseudonym VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Consent permissions (Granting counselor access to sensitive journals/AI chats)
CREATE TABLE public.consent_grants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    counselor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    grant_type VARCHAR(50) NOT NULL DEFAULT 'both' CHECK (grant_type IN ('journals', 'ai_chats', 'both')),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- 3. CLINICAL RECORDS TABLES (MOODS, JOURNALS, AI CHATS)
-- =====================================================================

-- Mood Check-ins
CREATE TABLE public.mood_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    score INT NOT NULL CHECK (score BETWEEN 1 AND 5),
    tags TEXT[] NOT NULL DEFAULT '{}'::text[],
    notes TEXT, -- Application-level encrypted
    logged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Private Wellness Journals (Server-Side Envelope Encrypted)
CREATE TABLE public.journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    encrypted_content TEXT NOT NULL,
    encrypted_dek TEXT NOT NULL,
    sentiment_score NUMERIC(3, 2),
    risk_level VARCHAR(50) NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AI Companion Sessions
CREATE TABLE public.ai_chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AI Companion Chat Messages (Encrypted at Rest)
CREATE TABLE public.ai_chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.ai_chat_sessions(id) ON DELETE CASCADE,
    sender_type VARCHAR(50) NOT NULL CHECK (sender_type IN ('student', 'assistant')),
    encrypted_content TEXT NOT NULL,
    risk_score NUMERIC(3, 2) NOT NULL DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- 4. CLINICAL ASSESSMENTS SCHEMAS
-- =====================================================================

-- Types of Assessments (e.g. PHQ-9, GAD-7)
CREATE TABLE public.assessment_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    version VARCHAR(20) NOT NULL DEFAULT '1.0',
    scoring_guide JSONB NOT NULL DEFAULT '{}'::jsonb,
    translations JSONB NOT NULL DEFAULT '{}'::jsonb, -- Multilingual names/descriptions
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Assessment questions
CREATE TABLE public.assessment_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_type_id UUID NOT NULL REFERENCES public.assessment_types(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    display_order INT NOT NULL,
    options JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of values: [{"label": "Not at all", "value": 0}]
    translations JSONB NOT NULL DEFAULT '{}'::jsonb, -- Multilingual question labels & options
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Aggregated Result records
CREATE TABLE public.assessment_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    assessment_type_id UUID NOT NULL REFERENCES public.assessment_types(id) ON DELETE RESTRICT,
    total_score INT NOT NULL CHECK (total_score >= 0),
    severity_level VARCHAR(50) NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Detailed answers recorded per question
CREATE TABLE public.assessment_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_result_id UUID NOT NULL REFERENCES public.assessment_results(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.assessment_questions(id) ON DELETE RESTRICT,
    selected_value INT NOT NULL CHECK (selected_value >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- 5. COUNSELOR SCHEDULING & NOTES
-- =====================================================================

-- Counselor Calendars & Booking slots
CREATE TABLE public.appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    counselor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    scheduled_time TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
    meeting_link VARCHAR(512),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Clinical History notes (KMS Encrypted)
CREATE TABLE public.counselor_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    appointment_id UUID NOT NULL UNIQUE REFERENCES public.appointments(id) ON DELETE CASCADE,
    counselor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    encrypted_clinical_data TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Automated Risk Alerts
CREATE TABLE public.risk_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('mood', 'journal', 'assessment', 'ai', 'community')),
    severity VARCHAR(50) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'resolved')),
    resolution_notes TEXT, -- Application-level encrypted
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- 6. COMMUNITY PORTAL ARCHITECTURE
-- =====================================================================

-- Community posts (supports anonymous flag)
CREATE TABLE public.community_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    is_anonymous BOOLEAN NOT NULL DEFAULT true,
    status VARCHAR(50) NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'flagged', 'hidden')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Threaded Comments
CREATE TABLE public.community_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_anonymous BOOLEAN NOT NULL DEFAULT true,
    status VARCHAR(50) NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'flagged', 'hidden')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Social Reactions
CREATE TABLE public.reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    post_id UUID REFERENCES public.community_posts(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES public.community_comments(id) ON DELETE CASCADE,
    reaction_type VARCHAR(50) NOT NULL CHECK (reaction_type IN ('like', 'support', 'hug', 'thankful')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT reaction_target_check CHECK (
        (post_id IS NOT NULL AND comment_id IS NULL) OR
        (post_id IS NULL AND comment_id IS NOT NULL)
    ),
    CONSTRAINT unique_user_post_reaction UNIQUE(user_id, post_id, comment_id, reaction_type)
);

-- Moderation queue reports
CREATE TABLE public.moderation_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('post', 'comment')),
    target_id UUID NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'resolved', 'dismissed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Moderator actions history log
CREATE TABLE public.moderation_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    moderator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    report_id UUID REFERENCES public.moderation_reports(id) ON DELETE SET NULL,
    target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('post', 'comment', 'user')),
    target_id UUID NOT NULL,
    action_taken VARCHAR(50) NOT NULL CHECK (action_taken IN ('warn_user', 'hide_content', 'delete_content', 'ban_user')),
    reason TEXT NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- 7. CMS (CONTENT MANAGEMENT SYSTEM)
-- =====================================================================

-- Wellness Articles and Guides (With locales support)
CREATE TABLE public.resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content_markdown TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
    translations JSONB NOT NULL DEFAULT '{}'::jsonb, -- Localizations block
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Announcements Banner
CREATE TABLE public.announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    target_audience VARCHAR(50) NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all', 'students', 'counselors')),
    translations JSONB NOT NULL DEFAULT '{}'::jsonb,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- 8. NOTIFICATION ENGINE
-- =====================================================================

-- Active notification queue
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('appointment', 'risk_alert', 'community_reply', 'system')),
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    channels TEXT[] NOT NULL DEFAULT '{"in_app"}'::text[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Preferences config per user profile
CREATE TABLE public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    email_enabled BOOLEAN NOT NULL DEFAULT true,
    push_enabled BOOLEAN NOT NULL DEFAULT true,
    in_app_enabled BOOLEAN NOT NULL DEFAULT true,
    appointment_reminders BOOLEAN NOT NULL DEFAULT true,
    risk_alerts_subscribed BOOLEAN NOT NULL DEFAULT false, -- Set true only for counselor/admin
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Web Push Protocol registration
CREATE TABLE public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- 9. APPEND-ONLY AUDIT ENGINE
-- =====================================================================
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    target_resource VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- 10. SYSTEM PERFORMANCE INDEXES
-- =====================================================================

-- Tenant isolation lookup speedups
CREATE INDEX idx_users_institution ON public.users(institution_id);
CREATE INDEX idx_consent_institution ON public.consent_grants(institution_id);
CREATE INDEX idx_moods_institution ON public.mood_logs(institution_id);
CREATE INDEX idx_journals_institution ON public.journal_entries(institution_id);
CREATE INDEX idx_appointments_institution ON public.appointments(institution_id);
CREATE INDEX idx_counselor_notes_institution ON public.counselor_notes(institution_id);
CREATE INDEX idx_alerts_institution ON public.risk_alerts(institution_id);
CREATE INDEX idx_posts_institution ON public.community_posts(institution_id);
CREATE INDEX idx_comments_institution ON public.community_comments(institution_id);
CREATE INDEX idx_reports_institution ON public.moderation_reports(institution_id);
CREATE INDEX idx_cms_res_institution ON public.resources(institution_id);
CREATE INDEX idx_cms_ann_institution ON public.announcements(institution_id);
CREATE INDEX idx_notif_institution ON public.notifications(institution_id);

-- User matching indexes
CREATE INDEX idx_moods_user ON public.mood_logs(user_id);
CREATE INDEX idx_journals_user ON public.journal_entries(user_id);
CREATE INDEX idx_chat_sess_user ON public.ai_chat_sessions(user_id);
CREATE INDEX idx_chat_msg_session ON public.ai_chat_messages(session_id);
CREATE INDEX idx_assess_result_user ON public.assessment_results(user_id);
CREATE INDEX idx_appointments_student ON public.appointments(student_id);
CREATE INDEX idx_appointments_counselor ON public.appointments(counselor_id);
CREATE INDEX idx_notif_unread_user ON public.notifications(user_id) WHERE is_read = false;

-- Status and sorting indexes
CREATE INDEX idx_appointments_datetime ON public.appointments(scheduled_time DESC);
CREATE INDEX idx_alerts_status ON public.risk_alerts(status);
CREATE INDEX idx_reports_status ON public.moderation_reports(status);

-- =====================================================================
-- 11. DYNAMIC TENANT RESOLUTION HELPER FUNCTIONS
-- =====================================================================

-- Resolves calling user's tenant context in RLS queries safely
CREATE OR REPLACE FUNCTION public.get_current_user_tenant()
RETURNS UUID AS $$
    SELECT institution_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Resolves calling user's RBAC role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS VARCHAR AS $$
    SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- =====================================================================
-- 12. ROW LEVEL SECURITY (RLS) POLICIES ENFORCEMENT
-- =====================================================================

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mood_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counselor_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 12.1 Plans & Institutions (Global configuration data)
CREATE POLICY read_plans ON public.subscription_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY admin_manage_plans ON public.subscription_plans FOR ALL TO authenticated USING (public.get_current_user_role() = 'super_admin');

CREATE POLICY read_institution ON public.institutions FOR SELECT TO authenticated 
    USING (id = public.get_current_user_tenant() OR public.get_current_user_role() = 'super_admin');
CREATE POLICY super_manage_institutions ON public.institutions FOR ALL TO authenticated USING (public.get_current_user_role() = 'super_admin');

-- 12.2 User Directory RLS
CREATE POLICY view_profiles ON public.users FOR SELECT TO authenticated
    USING (
        institution_id = public.get_current_user_tenant() AND 
        (
            id = auth.uid() OR 
            public.get_current_user_role() IN ('counselor', 'inst_admin')
        )
    );
CREATE POLICY manage_own_profile ON public.users FOR UPDATE TO authenticated USING (id = auth.uid());

-- 12.3 Consent Grants RLS
CREATE POLICY student_manage_consent ON public.consent_grants FOR ALL TO authenticated
    USING (student_id = auth.uid() AND institution_id = public.get_current_user_tenant());
CREATE POLICY counselor_read_consent ON public.consent_grants FOR SELECT TO authenticated
    USING (counselor_id = auth.uid() AND institution_id = public.get_current_user_tenant());

-- 12.4 Mood Logs RLS
CREATE POLICY student_own_moods ON public.mood_logs FOR ALL TO authenticated
    USING (user_id = auth.uid() AND institution_id = public.get_current_user_tenant());
CREATE POLICY counselor_read_student_moods ON public.mood_logs FOR SELECT TO authenticated
    USING (
        institution_id = public.get_current_user_tenant() AND 
        public.get_current_user_role() = 'counselor'
    );

-- 12.5 Wellness Journals RLS (Consent-based sharing)
CREATE POLICY student_own_journals ON public.journal_entries FOR ALL TO authenticated
    USING (user_id = auth.uid() AND institution_id = public.get_current_user_tenant());
CREATE POLICY counselor_consent_read_journals ON public.journal_entries FOR SELECT TO authenticated
    USING (
        institution_id = public.get_current_user_tenant() AND
        public.get_current_user_role() = 'counselor' AND
        EXISTS (
            SELECT 1 FROM public.consent_grants
            WHERE consent_grants.student_id = journal_entries.user_id
              AND consent_grants.counselor_id = auth.uid()
              AND consent_grants.grant_type IN ('journals', 'both')
              AND consent_grants.status = 'active'
              AND consent_grants.expires_at > now()
        )
    );

-- 12.6 AI Chat Sessions & Messages RLS
CREATE POLICY student_own_chat_sessions ON public.ai_chat_sessions FOR ALL TO authenticated
    USING (user_id = auth.uid() AND institution_id = public.get_current_user_tenant());
CREATE POLICY counselor_consent_read_chats ON public.ai_chat_sessions FOR SELECT TO authenticated
    USING (
        institution_id = public.get_current_user_tenant() AND
        public.get_current_user_role() = 'counselor' AND
        EXISTS (
            SELECT 1 FROM public.consent_grants
            WHERE consent_grants.student_id = ai_chat_sessions.user_id
              AND consent_grants.counselor_id = auth.uid()
              AND consent_grants.grant_type IN ('ai_chats', 'both')
              AND consent_grants.status = 'active'
              AND consent_grants.expires_at > now()
        )
    );

CREATE POLICY student_own_chat_messages ON public.ai_chat_messages FOR ALL TO authenticated
    USING (
        institution_id = public.get_current_user_tenant() AND
        EXISTS (
            SELECT 1 FROM public.ai_chat_sessions
            WHERE ai_chat_sessions.id = ai_chat_messages.session_id
              AND ai_chat_sessions.user_id = auth.uid()
        )
    );
CREATE POLICY counselor_consent_read_messages ON public.ai_chat_messages FOR SELECT TO authenticated
    USING (
        institution_id = public.get_current_user_tenant() AND
        EXISTS (
            SELECT 1 FROM public.ai_chat_sessions
            WHERE ai_chat_sessions.id = ai_chat_messages.session_id
              AND EXISTS (
                SELECT 1 FROM public.consent_grants
                WHERE consent_grants.student_id = ai_chat_sessions.user_id
                  AND consent_grants.counselor_id = auth.uid()
                  AND consent_grants.grant_type IN ('ai_chats', 'both')
                  AND consent_grants.status = 'active'
                  AND consent_grants.expires_at > now()
              )
        )
    );

-- 12.7 Assessments RLS
CREATE POLICY read_assessment_definitions ON public.assessment_types FOR SELECT TO authenticated USING (true);
CREATE POLICY read_question_definitions ON public.assessment_questions FOR SELECT TO authenticated USING (true);

CREATE POLICY student_own_assessment_results ON public.assessment_results FOR ALL TO authenticated
    USING (user_id = auth.uid() AND institution_id = public.get_current_user_tenant());
CREATE POLICY counselor_read_student_assessments ON public.assessment_results FOR SELECT TO authenticated
    USING (
        institution_id = public.get_current_user_tenant() AND
        public.get_current_user_role() = 'counselor'
    );

CREATE POLICY student_own_assessment_responses ON public.assessment_responses FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.assessment_results
            WHERE assessment_results.id = assessment_responses.assessment_result_id
              AND assessment_results.user_id = auth.uid()
        )
    );
CREATE POLICY counselor_read_student_responses ON public.assessment_responses FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.assessment_results
            WHERE assessment_results.id = assessment_responses.assessment_result_id
              AND assessment_results.institution_id = public.get_current_user_tenant()
              AND public.get_current_user_role() = 'counselor'
        )
    );

-- 12.8 Appointments & Notes RLS
CREATE POLICY view_appointments ON public.appointments FOR SELECT TO authenticated
    USING (
        institution_id = public.get_current_user_tenant() AND
        (student_id = auth.uid() OR counselor_id = auth.uid())
    );
CREATE POLICY student_create_appointments ON public.appointments FOR INSERT TO authenticated
    WITH CHECK (
        student_id = auth.uid() AND
        institution_id = public.get_current_user_tenant()
    );
CREATE POLICY counselor_update_appointments ON public.appointments FOR UPDATE TO authenticated
    USING (counselor_id = auth.uid() AND institution_id = public.get_current_user_tenant());

CREATE POLICY counselor_manage_own_notes ON public.counselor_notes FOR ALL TO authenticated
    USING (counselor_id = auth.uid() AND institution_id = public.get_current_user_tenant());

-- 12.9 Risk Alerts RLS
CREATE POLICY counselor_view_manage_alerts ON public.risk_alerts FOR ALL TO authenticated
    USING (
        institution_id = public.get_current_user_tenant() AND
        public.get_current_user_role() = 'counselor'
    );

-- 12.10 Community Portal RLS
CREATE POLICY view_community_posts ON public.community_posts FOR SELECT TO authenticated
    USING (institution_id = public.get_current_user_tenant() AND status = 'approved');
CREATE POLICY student_create_posts ON public.community_posts FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid() AND institution_id = public.get_current_user_tenant());
CREATE POLICY student_manage_own_posts ON public.community_posts FOR UPDATE TO authenticated
    USING (user_id = auth.uid());
CREATE POLICY mod_hide_posts ON public.community_posts FOR UPDATE TO authenticated
    USING (
        institution_id = public.get_current_user_tenant() AND
        public.get_current_user_role() IN ('moderator', 'inst_admin')
    );

CREATE POLICY view_community_comments ON public.community_comments FOR SELECT TO authenticated
    USING (institution_id = public.get_current_user_tenant() AND status = 'approved');
CREATE POLICY student_create_comments ON public.community_comments FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid() AND institution_id = public.get_current_user_tenant());
CREATE POLICY student_manage_own_comments ON public.community_comments FOR UPDATE TO authenticated
    USING (user_id = auth.uid());
CREATE POLICY mod_hide_comments ON public.community_comments FOR UPDATE TO authenticated
    USING (
        institution_id = public.get_current_user_tenant() AND
        public.get_current_user_role() IN ('moderator', 'inst_admin')
    );

CREATE POLICY manage_reactions ON public.reactions FOR ALL TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY create_moderation_reports ON public.moderation_reports FOR INSERT TO authenticated
    WITH CHECK (reporter_id = auth.uid() AND institution_id = public.get_current_user_tenant());
CREATE POLICY mod_manage_reports ON public.moderation_reports FOR ALL TO authenticated
    USING (
        institution_id = public.get_current_user_tenant() AND
        public.get_current_user_role() IN ('moderator', 'inst_admin')
    );

CREATE POLICY mod_record_actions ON public.moderation_actions FOR ALL TO authenticated
    USING (
        institution_id = public.get_current_user_tenant() AND
        public.get_current_user_role() IN ('moderator', 'inst_admin')
    );

-- 12.11 CMS Content RLS
CREATE POLICY view_published_resources ON public.resources FOR SELECT TO authenticated
    USING (institution_id = public.get_current_user_tenant() AND status = 'published');
CREATE POLICY admin_manage_resources ON public.resources FOR ALL TO authenticated
    USING (
        institution_id = public.get_current_user_tenant() AND
        public.get_current_user_role() = 'inst_admin'
    );

CREATE POLICY view_announcements ON public.announcements FOR SELECT TO authenticated
    USING (
        institution_id = public.get_current_user_tenant() AND
        (expires_at IS NULL OR expires_at > now()) AND
        (
            target_audience = 'all' OR 
            (target_audience = 'students' AND public.get_current_user_role() = 'student') OR
            (target_audience = 'counselors' AND public.get_current_user_role() = 'counselor')
        )
    );
CREATE POLICY admin_manage_announcements ON public.announcements FOR ALL TO authenticated
    USING (
        institution_id = public.get_current_user_tenant() AND
        public.get_current_user_role() = 'inst_admin'
    );

-- 12.12 Billing & Audit RLS
CREATE POLICY admin_view_subscriptions ON public.institution_subscriptions FOR SELECT TO authenticated
    USING (
        institution_id = public.get_current_user_tenant() AND
        public.get_current_user_role() = 'inst_admin'
    );
CREATE POLICY super_manage_subscriptions ON public.institution_subscriptions FOR ALL TO authenticated
    USING (public.get_current_user_role() = 'super_admin');

CREATE POLICY admin_view_payments ON public.payment_records FOR SELECT TO authenticated
    USING (
        institution_id = public.get_current_user_tenant() AND
        public.get_current_user_role() = 'inst_admin'
    );

CREATE POLICY super_view_audit ON public.audit_logs FOR SELECT TO authenticated
    USING (public.get_current_user_role() = 'super_admin');
-- Write is permitted solely through trigger executions

-- 12.13 Notifications Preferences RLS
CREATE POLICY user_read_write_notif ON public.notifications FOR ALL TO authenticated
    USING (user_id = auth.uid() AND institution_id = public.get_current_user_tenant());

CREATE POLICY user_manage_preferences ON public.notification_preferences FOR ALL TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY user_manage_push ON public.push_subscriptions FOR ALL TO authenticated
    USING (user_id = auth.uid());

-- =====================================================================
-- 13. TRIGGERS & AUTOMATION SERVICES
-- =====================================================================

-- Auto-update updated_at timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply timestamp update rules to tables
CREATE TRIGGER update_subscription_plans_modtime BEFORE UPDATE ON public.subscription_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_institutions_modtime BEFORE UPDATE ON public.institutions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_institution_subscriptions_modtime BEFORE UPDATE ON public.institution_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_users_modtime BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_consent_grants_modtime BEFORE UPDATE ON public.consent_grants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_journal_entries_modtime BEFORE UPDATE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ai_chat_sessions_modtime BEFORE UPDATE ON public.ai_chat_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_assessment_types_modtime BEFORE UPDATE ON public.assessment_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_assessment_questions_modtime BEFORE UPDATE ON public.assessment_questions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_appointments_modtime BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_counselor_notes_modtime BEFORE UPDATE ON public.counselor_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_risk_alerts_modtime BEFORE UPDATE ON public.risk_alerts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_community_posts_modtime BEFORE UPDATE ON public.community_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_community_comments_modtime BEFORE UPDATE ON public.community_comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_moderation_reports_modtime BEFORE UPDATE ON public.moderation_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_resources_modtime BEFORE UPDATE ON public.resources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_announcements_modtime BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_notification_preferences_modtime BEFORE UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- 14. APPEND-ONLY SECURITY AUDIT LOG TRIGGERS
-- =====================================================================

-- General modification audit logger function
CREATE OR REPLACE FUNCTION public.log_security_audit_event()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_institution_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    -- Extract tenant reference safely based on operation type
    BEGIN
        IF TG_OP = 'DELETE' THEN
            v_institution_id := OLD.institution_id;
        ELSE
            v_institution_id := NEW.institution_id;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_institution_id := NULL;
    END;

    INSERT INTO public.audit_logs (
        institution_id,
        user_id,
        action,
        target_resource
    ) VALUES (
        v_institution_id,
        v_user_id,
        TG_OP || ' ON ' || TG_TABLE_NAME,
        COALESCE(NEW.id::text, OLD.id::text)
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach audit hooks to high-value clinical and authorization tables
CREATE TRIGGER audit_consent_logs AFTER INSERT OR UPDATE OR DELETE ON public.consent_grants FOR EACH ROW EXECUTE FUNCTION public.log_security_audit_event();
CREATE TRIGGER audit_counselor_notes AFTER INSERT OR UPDATE OR DELETE ON public.counselor_notes FOR EACH ROW EXECUTE FUNCTION public.log_security_audit_event();
CREATE TRIGGER audit_risk_alerts AFTER INSERT OR UPDATE ON public.risk_alerts FOR EACH ROW EXECUTE FUNCTION public.log_security_audit_event();
CREATE TRIGGER audit_moderation_actions AFTER INSERT ON public.moderation_actions FOR EACH ROW EXECUTE FUNCTION public.log_security_audit_event();
CREATE TRIGGER audit_billing_subscriptions AFTER INSERT OR UPDATE ON public.institution_subscriptions FOR EACH ROW EXECUTE FUNCTION public.log_security_audit_event();
CREATE TRIGGER audit_payment_records AFTER INSERT ON public.payment_records FOR EACH ROW EXECUTE FUNCTION public.log_security_audit_event();

-- Block modification of audit logs via trigger guard
CREATE OR REPLACE FUNCTION public.prevent_audit_alterations()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are immutable append-only structures and cannot be modified or deleted.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lock_audit_logs BEFORE UPDATE OR DELETE ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_alterations();

-- =====================================================================
-- 15. PROFILE BOOTSTRAP AUTO-TRIGGERS
-- =====================================================================

-- Auto-provision user preferences configuration on signup
CREATE OR REPLACE FUNCTION public.auto_provision_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notification_preferences (user_id, email_enabled, push_enabled, in_app_enabled)
    VALUES (NEW.id, true, true, true);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER provision_preferences_on_signup AFTER INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION public.auto_provision_user_preferences();
