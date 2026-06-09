-- Supabase Migration: 20260607000200_phase3_db_adjustments.sql
-- Description: Updates the schema to support Phase 3 revisions:
-- 1. Adds allowed_domains and access_code to institutions.
-- 2. Adds counselor_status to users for verification workflow.
-- 3. Implements a database function helper to bootstrap the first Super Admin safely.

-- Adjust institutions table
ALTER TABLE public.institutions 
ADD COLUMN IF NOT EXISTS access_code VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS allowed_domains TEXT[] NOT NULL DEFAULT '{}'::text[];

CREATE INDEX IF NOT EXISTS idx_inst_access_code ON public.institutions(access_code);

-- Adjust users table for counselor workflow
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS counselor_status VARCHAR(50) DEFAULT 'pending' CHECK (counselor_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_users_counselor_status ON public.users(counselor_status) WHERE role = 'counselor';

-- 4. Super Admin bootstrapping helper function
-- This allows creation of a Super Admin profile by inserting into public.users.
-- Since public.users is bound to auth.users, the Super Admin must exist in auth.users first.
-- This function can be called via secure RPC or direct query by a DB admin to link their Auth ID to the super_admin role.
CREATE OR REPLACE FUNCTION public.bootstrap_super_admin(
    p_user_id UUID,
    p_institution_id UUID,
    p_email VARCHAR(255),
    p_first_name TEXT,
    p_last_name TEXT
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.users (
        id,
        institution_id,
        email,
        role,
        real_first_name,
        real_last_name,
        is_approved
    ) VALUES (
        p_user_id,
        p_institution_id,
        p_email,
        'super_admin',
        p_first_name,
        p_last_name,
        true
    )
    ON CONFLICT (id) DO UPDATE
    SET role = 'super_admin',
        is_approved = true,
        updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
