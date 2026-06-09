-- Supabase Migration: 20260607000300_phase4_revisions.sql
-- Description: Phase 4 revisions database alignments:
-- 1. Adds gratitude flag and search indices for blind search hashing to journal_entries.
-- 2. Adds qualitative mood descriptors to mood_logs.
-- 3. Creates resource_bookmarks and resource_views tables for CMS enhancements.

-- Adjust journal_entries for search index and gratitude
ALTER TABLE public.journal_entries
ADD COLUMN IF NOT EXISTS is_gratitude BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS search_indices TEXT[] NOT NULL DEFAULT '{}'::text[];

CREATE INDEX IF NOT EXISTS idx_journal_search_indices ON public.journal_entries USING gin(search_indices);

-- Adjust mood_logs for qualitative descriptors
ALTER TABLE public.mood_logs
ADD COLUMN IF NOT EXISTS descriptor VARCHAR(50) CHECK (descriptor IN (
    'Happy', 'Calm', 'Motivated', 'Neutral', 'Stressed', 'Anxious', 'Exhausted', 'Sad'
));

-- Resource Bookmarks Table
CREATE TABLE public.resource_bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_user_bookmark UNIQUE (user_id, resource_id)
);

-- Resource Recently Viewed Tracker Table
CREATE TABLE public.resource_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.resource_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY manage_own_bookmarks ON public.resource_bookmarks FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY manage_own_views ON public.resource_views FOR ALL TO authenticated USING (user_id = auth.uid());

-- Indexes
CREATE INDEX idx_bookmarks_user ON public.resource_bookmarks(user_id);
CREATE INDEX idx_views_user ON public.resource_views(user_id);
