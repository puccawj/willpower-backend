-- Migration: 2026-07-30 — add course_prerequisites table
--
-- A course can require completion of one or more other courses before a student can
-- self-enroll. Courses with no rows here have no prerequisite and can be enrolled in
-- freely. Admin-driven enrollment (via the admin Enrollment page) bypasses this check.
--
-- Safe to run multiple times.
-- Run against production with:
--   psql "$DATABASE_URL" -f database/migrations/2026-07-30-add-course-prerequisites.sql

BEGIN;

CREATE TABLE IF NOT EXISTS course_prerequisites (
  course_id uuid NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
  prerequisite_course_id uuid NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (course_id, prerequisite_course_id),
  CHECK (course_id <> prerequisite_course_id)
);

CREATE INDEX IF NOT EXISTS idx_course_prerequisites_prereq ON course_prerequisites (prerequisite_course_id);

COMMIT;
