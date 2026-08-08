-- Migration: 2026-08-08 — add photo_url column to student_applications
--
-- Powers the optional photo upload on the mobile "Become a Student" form.
--
-- Safe to run multiple times.
-- Run against production with:
--   psql "$DATABASE_URL" -f database/migrations/2026-08-08-add-student-application-photo.sql

BEGIN;

ALTER TABLE student_applications ADD COLUMN IF NOT EXISTS photo_url varchar(500);

COMMIT;
