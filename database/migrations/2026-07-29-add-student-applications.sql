-- Migration: 2026-07-29 — add student_applications table
--
-- A "general" role account applies to become a "student" via a self-service form
-- (email, first/last name, nickname, optional phone/LINE ID). An admin/superadmin
-- reviews and approves/rejects — approval flips the user's role to 'student'.
--
-- Safe to run multiple times.
-- Run against production with:
--   psql "$DATABASE_URL" -f database/migrations/2026-07-29-add-student-applications.sql

BEGIN;

DO $$ BEGIN
  CREATE TYPE student_application_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS student_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  email varchar(255) NOT NULL,
  first_name varchar(100) NOT NULL,
  last_name varchar(100) NOT NULL,
  nickname varchar(100) NOT NULL,
  phone varchar(30),
  line_id varchar(100),
  status student_application_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES users (id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_applications_user ON student_applications (user_id);
CREATE INDEX IF NOT EXISTS idx_student_applications_status ON student_applications (status);

COMMIT;
