BEGIN;

ALTER TYPE registration_source ADD VALUE IF NOT EXISTS 'apple';

COMMIT;
