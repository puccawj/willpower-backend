-- Migration: 2026-08-12 — add line_id and photo_url columns to users
--
-- Promotes these from student_applications (only editable while an application was
-- pending) to the general account profile, so they stay editable in Edit Profile after
-- a student application is approved instead of becoming permanently locked.
--
-- Safe to run multiple times.
-- Run against production with:
--   psql "$DATABASE_URL" -f database/migrations/2026-08-12-add-user-lineid-photo.sql

BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS line_id varchar(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url varchar(500);

COMMIT;
