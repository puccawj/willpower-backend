-- Migration: 2026-07-27 — add broadcast fields to notifications
--
-- Adds broadcast_id (groups the per-recipient rows created by one admin
-- broadcast send), target_branch_id (which branch the broadcast was scoped
-- to, null = all), and created_by (who sent it) to the existing
-- `notifications` table, so the admin panel can show a broadcast history.
--
-- Safe to run multiple times.
--   psql "$DATABASE_URL" -f database/migrations/2026-07-27-add-notification-broadcast-fields.sql

BEGIN;

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS broadcast_id uuid;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS target_branch_id uuid;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS created_by uuid;

CREATE INDEX IF NOT EXISTS idx_notifications_broadcast_id ON notifications (broadcast_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_notifications_target_branch') THEN
    ALTER TABLE notifications
      ADD CONSTRAINT fk_notifications_target_branch FOREIGN KEY (target_branch_id) REFERENCES branches (id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_notifications_created_by') THEN
    ALTER TABLE notifications
      ADD CONSTRAINT fk_notifications_created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
  END IF;
END $$;

COMMIT;
