-- Adds an optional short code/nickname to course_offerings so admins can distinguish
-- multiple offerings of the same course (e.g. "Morning Batch" vs "Evening Batch") both
-- in the admin panel and on the public site.

BEGIN;

ALTER TABLE course_offerings
  ADD COLUMN IF NOT EXISTS code varchar(60);

COMMIT;
