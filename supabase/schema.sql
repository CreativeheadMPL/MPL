-- =====================================================================
-- MOTION PULSE SAMPLE SPACE - SUPABASE POSTGRESQL SCHEMA
-- Paste this script into your Supabase SQL Editor (https://supabase.com/dashboard)
-- =====================================================================

-- Enable pgcrypto / uuid-ossp for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tracks Table
CREATE TABLE IF NOT EXISTS public.tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    composer TEXT,
    project TEXT,
    description TEXT,
    artwork TEXT DEFAULT '/artwork/sample-01.svg',
    audio_file TEXT NOT NULL, -- Google Drive sharing URL or File ID
    duration INTEGER DEFAULT 180,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Links Table
CREATE TABLE IF NOT EXISTS public.links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    track_id UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    has_password BOOLEAN DEFAULT false NOT NULL,
    password_hash TEXT,
    expires_at TIMESTAMPTZ,
    status TEXT DEFAULT 'ACTIVE' NOT NULL CHECK (status IN ('ACTIVE', 'EXPIRED', 'REVOKED')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    revoked_at TIMESTAMPTZ
);

-- Indexes for ultra-fast lookup by token and track_id
CREATE INDEX IF NOT EXISTS idx_links_token ON public.links(token);
CREATE INDEX IF NOT EXISTS idx_links_track_id ON public.links(track_id);
CREATE INDEX IF NOT EXISTS idx_tracks_created_at ON public.tracks(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS automatically (used by backend API routes)
-- Public read policy for token verification and listening (anonymous clients)
CREATE POLICY "Public links lookup" ON public.links
    FOR SELECT USING (true);

CREATE POLICY "Public tracks lookup" ON public.tracks
    FOR SELECT USING (true);

-- Allow full access to service_role (Next.js server-side backend)
CREATE POLICY "Service role full access tracks" ON public.tracks
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access links" ON public.links
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Initial Demo Sample
INSERT INTO public.tracks (id, title, artist, composer, project, description, artwork, audio_file, duration)
VALUES (
    '87a56b59-0667-48eb-8684-9ebb44b95023',
    'After Midnight (Acoustic Preview)',
    'Motion Pulse Studio',
    'Motion Pulse Sound Labs',
    'Motion Pulse Demo 2026',
    'Confidential late-night ambient chord exploration for upcoming score.',
    '/artwork/sample-01.svg',
    'https://drive.google.com/file/d/1_DEMO_DRIVE_SAMPLE_ID/view?usp=sharing',
    180
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.links (id, track_id, token, has_password, expires_at, status)
VALUES (
    'd4cb9774-eb7f-4649-92c2-cd277982275e',
    '87a56b59-0667-48eb-8684-9ebb44b95023',
    'MP-ELEEVZQB',
    false,
    null,
    'ACTIVE'
) ON CONFLICT (token) DO NOTHING;
