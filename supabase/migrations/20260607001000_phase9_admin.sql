-- Supabase Migration: 20260607001000_phase9_admin.sql
-- Description: Adds department, academic_year, and program attributes to users table for Wellness Heatmap groupings.

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS department VARCHAR(100),
ADD COLUMN IF NOT EXISTS academic_year VARCHAR(50),
ADD COLUMN IF NOT EXISTS program VARCHAR(100);

-- Update existing seeded student to have some cohort parameters for testing
UPDATE public.users
SET department = 'Computer Science',
    academic_year = 'Senior',
    program = 'B.Tech'
WHERE id = '44444444-4444-4444-4444-444444444444';
