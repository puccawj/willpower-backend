-- Migration: 2026-08-28 — split student_applications into per-branch decisions
--
-- Previously an applicant couldn't pick a branch at all, and approval never assigned one
-- either — an approved student ended up with zero branch membership. Now an applicant picks
-- one or more branches when applying, and each branch's admin approves/rejects independently
-- (a new student_application_branches row per branch). Status/reviewed_by/reviewed_at move
-- from the parent application to this per-branch table.
--
-- Safe to run multiple times.
-- Run against production with:
--   psql "$DATABASE_URL" -f database/migrations/2026-08-28-add-student-application-branches.sql

BEGIN;

CREATE TABLE IF NOT EXISTS student_application_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES student_applications (id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES branches (id) ON DELETE CASCADE,
  status student_application_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES users (id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (application_id, branch_id)
);

CREATE INDEX IF NOT EXISTS idx_student_application_branches_application ON student_application_branches (application_id);
CREATE INDEX IF NOT EXISTS idx_student_application_branches_branch ON student_application_branches (branch_id);
CREATE INDEX IF NOT EXISTS idx_student_application_branches_status ON student_application_branches (status);

-- Backfill: any existing application had no branch at all, so there's nothing meaningful to
-- carry over per-branch — an admin will need to re-triage old rows once branch data exists.
-- The parent table's own status/reviewed_* columns are no longer read by the app; dropped here
-- since they can't represent "different outcome per branch" and every use of them has moved.
ALTER TABLE student_applications DROP COLUMN IF EXISTS status;
ALTER TABLE student_applications DROP COLUMN IF EXISTS reviewed_by;
ALTER TABLE student_applications DROP COLUMN IF EXISTS reviewed_at;

COMMIT;
