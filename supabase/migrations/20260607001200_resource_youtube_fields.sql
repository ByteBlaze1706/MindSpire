-- supabase/migrations/20260607001200_resource_youtube_fields.sql
-- Add explicit columns to public.resources for YouTube video IDs and watch URLs to improve video storage and reliability

ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS youtube_video_id VARCHAR(100);
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS youtube_url VARCHAR(512);

-- Create index for faster lookup on video IDs
CREATE INDEX IF NOT EXISTS idx_resources_youtube_video_id ON public.resources(youtube_video_id) WHERE deleted_at IS NULL;
