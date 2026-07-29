-- Migration: 2026-07-29 — add home_banners table for the public-site Home page banner carousel
--
-- Admin-managed banner images with an optional scheduling window (start/end date) and an
-- active on/off flag. Public endpoint only returns rows that are active AND within their
-- date window (no end date = shows indefinitely once started).
--
-- Safe to run multiple times.
-- Run against production with:
--   psql "$DATABASE_URL" -f database/migrations/2026-07-29-add-home-banners.sql

BEGIN;

CREATE TABLE IF NOT EXISTS home_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  link_url text,
  start_date date,
  end_date date,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Sample banners so the carousel isn't empty on a fresh install. Safe to delete/edit from
-- the admin panel (Site → Home Banners) once real artwork is ready.
INSERT INTO home_banners (image_url, link_url, is_active, sort_order)
SELECT * FROM (VALUES
  ('https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=1800&auto=format&fit=crop', '/events', true, 0),
  ('https://images.unsplash.com/photo-1508672019048-805c876b67e2?q=80&w=1800&auto=format&fit=crop', '/courses', true, 1),
  ('https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=1800&auto=format&fit=crop', '/about', true, 2)
) AS seed(image_url, link_url, is_active, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM home_banners);

COMMIT;
