-- Migration: 2026-07-29 — add ratings table (5-star feedback on Events and Course Offerings)
--
-- Members rate an event or a course offering 1-5 stars with an optional private note.
-- The note is admin-only feedback (never shown on the public site) so admins can see who
-- gave what rating and why, to improve future events/courses. Public pages only ever show
-- the aggregate average + count via a SUM/AVG query, never the raw notes.
--
-- Safe to run multiple times.
-- Run against production with:
--   psql "$DATABASE_URL" -f database/migrations/2026-07-29-add-ratings.sql

BEGIN;

DO $$ BEGIN
  CREATE TYPE rating_target_type AS ENUM ('event', 'offering');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type rating_target_type NOT NULL,
  target_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  stars smallint NOT NULL CHECK (stars BETWEEN 1 AND 5),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (target_type, target_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_ratings_target ON ratings (target_type, target_id);

COMMIT;
