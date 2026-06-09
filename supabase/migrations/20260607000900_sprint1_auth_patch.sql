-- Supabase Migration: 20260607000900_sprint1_auth_patch.sql
-- Description: Add password hashing, brute-force lockout, and approval columns to users.

-- 1. Alter users table to support backend authentication, lockout, and approval status
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS password_hash TEXT,
ADD COLUMN IF NOT EXISTS failed_login_attempts INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS lockout_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS counselor_status VARCHAR(50) DEFAULT 'pending' CHECK (counselor_status IN ('pending', 'approved', 'rejected'));

-- 2. Add verification domain verification table for institutions
CREATE TABLE IF NOT EXISTS public.institution_domains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    domain VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_institution_domain UNIQUE (institution_id, domain)
);

-- Enable RLS for domains
ALTER TABLE public.institution_domains ENABLE ROW LEVEL SECURITY;

-- Policy for viewing domains
CREATE POLICY view_institution_domains ON public.institution_domains
    FOR SELECT TO authenticated, anon
    USING (true);

-- 3. Pre-seed default institution for local evaluation and presenter testing
INSERT INTO public.institutions (id, name, subdomain, branding_config)
VALUES (
    'c0a80101-9999-0000-0000-000000000001',
    'IIT Bombay',
    'iitb',
    '{"primaryColor": "#8EADC2", "accentColor": "#F5AF8F", "logoUrl": "", "supportEmail": "support@iitb.ac.in", "emergencyPhone": "14416"}'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Seed default domains for IIT Bombay
INSERT INTO public.institution_domains (id, institution_id, domain)
VALUES (
    'c0a80101-9999-0000-0000-000000000002',
    'c0a80101-9999-0000-0000-000000000001',
    'iitb.ac.in'
) ON CONFLICT (id) DO NOTHING;
