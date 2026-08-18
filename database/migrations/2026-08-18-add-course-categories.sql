-- Course "category" was a freeform text field (typos/inconsistent capitalization possible,
-- no way to browse "what categories exist" from the admin UI). Replaces it with a small
-- managed lookup table (same lightweight pattern as course offering status, not as heavy as
-- Branches — no soft delete, just active/inactive) and backfills existing distinct values.

BEGIN;

CREATE TABLE course_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(100) NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_course_categories_name UNIQUE (name)
);

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES course_categories (id) ON DELETE SET NULL;

INSERT INTO course_categories (name)
SELECT DISTINCT category FROM courses WHERE category IS NOT NULL AND btrim(category) <> ''
ON CONFLICT (name) DO NOTHING;

UPDATE courses c
SET category_id = cc.id
FROM course_categories cc
WHERE c.category = cc.name;

ALTER TABLE courses DROP COLUMN IF EXISTS category;

COMMIT;
