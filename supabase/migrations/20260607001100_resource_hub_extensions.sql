-- supabase/migrations/20260607001100_resource_hub_extensions.sql
-- Extend resources table to support complete wellness library content (thumbnails, summaries, reading times, media types, and YouTube video/ambience embeds)

ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS thumbnail_url VARCHAR(512);
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS reading_time VARCHAR(50);
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS media_type VARCHAR(50) DEFAULT 'article' CHECK (media_type IN ('article', 'video', 'audio'));
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS media_url VARCHAR(512);

-- Add performance indexes for faster search/filtering in the Resource Hub
CREATE INDEX IF NOT EXISTS idx_resources_media_type ON public.resources(media_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_resources_category ON public.resources(category) WHERE deleted_at IS NULL;
