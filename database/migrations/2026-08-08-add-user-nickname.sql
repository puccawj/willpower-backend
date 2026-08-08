-- Migration: 2026-08-08 — add nickname column to users
--
-- Powers the mobile app's "Edit Profile" feature (name/nickname/phone editable by the
-- user themselves). Separate from student_applications.nickname (that one is specific
-- to a single application record; this one is the general account nickname).
--
-- Safe to run multiple times.
-- Run against production with:
--   psql "$DATABASE_URL" -f database/migrations/2026-08-08-add-user-nickname.sql

BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS nickname varchar(100);

COMMIT;
