-- Migration: 2026-07-24 — add per-offering scoping to course_needs and donations
--
-- Adds `offering_id` to `course_needs` (added 2026-07-23) and `donations`
-- (added 2026-07-24), so a course wishlist item or a donation can target a
-- specific course offering (branch/run) instead of only the whole course.
-- Both columns are nullable — existing rows are unaffected (null = whole course).
--
-- Safe to run multiple times (every statement is guarded).
-- Run against production with:
--   psql "$DATABASE_URL" -f database/migrations/2026-07-24-add-offering-scoping.sql

BEGIN;

-- course_needs.offering_id -------------------------------------------------

ALTER TABLE course_needs
  ADD COLUMN IF NOT EXISTS offering_id uuid;

CREATE INDEX IF NOT EXISTS idx_course_needs_offering_id ON course_needs (offering_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_course_needs_offering') THEN
    ALTER TABLE course_needs
      ADD CONSTRAINT fk_course_needs_offering FOREIGN KEY (offering_id) REFERENCES course_offerings (id) ON DELETE SET NULL;
  END IF;
END $$;

-- donations.offering_id ------------------------------------------------------

ALTER TABLE donations
  ADD COLUMN IF NOT EXISTS offering_id uuid;

CREATE INDEX IF NOT EXISTS idx_donations_offering_id ON donations (offering_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_donations_offering') THEN
    ALTER TABLE donations
      ADD CONSTRAINT fk_donations_offering FOREIGN KEY (offering_id) REFERENCES course_offerings (id) ON DELETE SET NULL;
  END IF;
END $$;

COMMIT;
