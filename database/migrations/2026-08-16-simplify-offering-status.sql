-- Collapses course_offerings.status from ('draft','scheduled','ongoing','completed','cancelled')
-- down to ('draft','published','completed','cancelled') — 'scheduled' and 'ongoing' were a
-- date-driven distinction admins had to babysit manually; 'published' now covers both (a computed,
-- display-only badge in the admin UI still shows draft/published/completed for guidance).
-- Postgres enums can't drop values in place, so the type is recreated.

BEGIN;

ALTER TYPE offering_status RENAME TO offering_status_old;

CREATE TYPE offering_status AS ENUM ('draft', 'published', 'completed', 'cancelled');

ALTER TABLE course_offerings ALTER COLUMN status DROP DEFAULT;

ALTER TABLE course_offerings
  ALTER COLUMN status TYPE offering_status
  USING (
    CASE status::text
      WHEN 'scheduled' THEN 'published'
      WHEN 'ongoing' THEN 'published'
      ELSE status::text
    END
  )::offering_status;

ALTER TABLE course_offerings ALTER COLUMN status SET DEFAULT 'draft';

DROP TYPE offering_status_old;

COMMIT;
