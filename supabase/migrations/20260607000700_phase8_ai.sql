-- Supabase Migration: 20260607000700_phase8_ai.sql
-- Description: Create tables for AI Chat sessions, messages, and usage analytics.

-- 1. Create AI Chat Sessions Table
DROP TABLE IF EXISTS public.ai_chat_messages CASCADE;
DROP TABLE IF EXISTS public.ai_chat_sessions CASCADE;
CREATE TABLE IF NOT EXISTS public.ai_chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Conversation',
    memory_preference TEXT NOT NULL DEFAULT 'session_memory' CHECK (memory_preference IN ('no_memory', 'session_memory', 'persistent_memory')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance index
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user ON public.ai_chat_sessions(user_id);

-- Enable RLS
ALTER TABLE public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;

-- 2. Create AI Chat Messages Table
DROP TABLE IF EXISTS public.ai_chat_messages CASCADE;
CREATE TABLE IF NOT EXISTS public.ai_chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.ai_chat_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'model')),
    encrypted_content TEXT NOT NULL,
    encrypted_dek TEXT NOT NULL,
    key_reference TEXT NOT NULL,
    encryption_version TEXT NOT NULL DEFAULT 'v1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance index
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session ON public.ai_chat_messages(session_id);

-- Enable RLS
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- 3. Create AI Usage Analytics Table
CREATE TABLE IF NOT EXISTS public.ai_usage_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.ai_chat_sessions(id) ON DELETE SET NULL,
    prompt_tokens INT NOT NULL DEFAULT 0,
    completion_tokens INT NOT NULL DEFAULT 0,
    feedback_rating TEXT CHECK (feedback_rating IN ('HELPFUL', 'NOT_RELEVANT', 'TOO_GENERIC', 'NEEDS_HUMAN_SUPPORT')),
    feedback_comments TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance index
CREATE INDEX IF NOT EXISTS idx_ai_usage_analytics_user ON public.ai_usage_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_analytics_session ON public.ai_usage_analytics(session_id);

-- Enable RLS
ALTER TABLE public.ai_usage_analytics ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Users can manage their own sessions
CREATE POLICY user_manage_own_ai_sessions ON public.ai_chat_sessions
    FOR ALL TO authenticated
    USING (user_id = auth.uid() AND institution_id = public.get_current_user_tenant());

-- Users can manage messages in their own sessions
CREATE POLICY user_manage_own_ai_messages ON public.ai_chat_messages
    FOR ALL TO authenticated
    USING (
        session_id IN (
            SELECT id FROM public.ai_chat_sessions 
            WHERE user_id = auth.uid() AND institution_id = public.get_current_user_tenant()
        )
    );

-- Users can view and manage their own usage analytics
CREATE POLICY user_manage_own_ai_analytics ON public.ai_usage_analytics
    FOR ALL TO authenticated
    USING (user_id = auth.uid() AND institution_id = public.get_current_user_tenant());

-- 5. Triggers
DROP TRIGGER IF EXISTS update_ai_chat_sessions_modtime ON public.ai_chat_sessions;
CREATE TRIGGER update_ai_chat_sessions_modtime 
BEFORE UPDATE ON public.ai_chat_sessions 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Audit trigger for sessions modifications
DROP TRIGGER IF EXISTS audit_ai_chat_sessions ON public.ai_chat_sessions;
CREATE TRIGGER audit_ai_chat_sessions 
AFTER INSERT OR UPDATE OR DELETE ON public.ai_chat_sessions 
FOR EACH ROW EXECUTE FUNCTION public.log_security_audit_event();

