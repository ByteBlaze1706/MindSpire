-- Supabase Migration: 20260607000500_phase6_counselor.sql
-- Description: Database alterations and additions for Counselor Dashboard features.

-- 1. Add encrypted_dek to counselor_notes for envelope encryption
ALTER TABLE public.counselor_notes
ADD COLUMN IF NOT EXISTS encrypted_dek TEXT;

-- 2. Create Counselor Availability Table
CREATE TABLE IF NOT EXISTS public.counselor_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    counselor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    is_booked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance indices
CREATE INDEX IF NOT EXISTS idx_counselor_availability_counselor ON public.counselor_availability(counselor_id);
CREATE INDEX IF NOT EXISTS idx_counselor_availability_times ON public.counselor_availability(start_time, end_time);

-- Enable RLS
ALTER TABLE public.counselor_availability ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
CREATE POLICY counselor_manage_availability ON public.counselor_availability
    FOR ALL TO authenticated
    USING (counselor_id = auth.uid() AND institution_id = public.get_current_user_tenant());

CREATE POLICY student_view_availability ON public.counselor_availability
    FOR SELECT TO authenticated
    USING (
        institution_id = public.get_current_user_tenant() AND 
        is_booked = false AND
        public.get_current_user_role() = 'student'
    );

-- 4. Triggers
CREATE TRIGGER update_counselor_availability_modtime 
BEFORE UPDATE ON public.counselor_availability 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Audit trigger for availability modifications
CREATE TRIGGER audit_counselor_availability 
AFTER INSERT OR UPDATE OR DELETE ON public.counselor_availability 
FOR EACH ROW EXECUTE FUNCTION public.log_security_audit_event();
