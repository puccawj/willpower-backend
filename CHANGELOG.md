# Changelog

Product-impacting changes to the API. Newest first.

## 2026-07-30 (1)

- Added `student_applications` table + endpoints: `POST/GET /me/student-application`
  (self-service — general accounts apply with email/name/nickname, optional
  phone/LINE ID) and `GET /student-applications`, `PATCH
  /student-applications/:id/approve|reject` (admin, roles-gated). Approving
  flips the applicant's role from `general` to `student`.

## 2026-07-29 (5)

- Added `GET /ratings/count` (admin, roles-gated) — total rating count
  across all events/offerings, for the admin Module Usage report.

## 2026-07-29 (4)

- Added a `ratings` table + 5-star feedback system for Events and Course
  Offerings: `PUT/GET /me/events/:id/rating` and
  `PUT/GET /me/course-offerings/:id/rating` (self-service, upserts),
  `GET /events/:id/ratings` and `GET /course-offerings/:id/ratings`
  (admin-only — full list with rater name/email + private note, for
  improvement purposes), and `GET /public/ratings/:targetType/:targetId`
  (+ bulk `?ids=` variant) returning only the aggregate average/count —
  notes are never exposed publicly.

## 2026-07-29 (3)

- Fixed `home_banners.linkUrl` validation: it required a fully-qualified URL
  (`@IsUrl`), rejecting the relative paths (`/events`, `/courses`) the admin
  panel's own hint text tells admins to use — every relative-path banner
  link would fail to save with a 400. Found via a full system smoke test
  (see below) that exercises every module end-to-end. Now accepts any
  string.

## 2026-07-29 (2)

- Added `home_banners` table + `/home-banners` (admin, roles-gated) and
  `/public/home-banners` (public) endpoints for the Home page banner
  carousel. Each banner has an optional `startDate`/`endDate` scheduling
  window (no end date = shows indefinitely) and an `isActive` on/off flag;
  the public endpoint only returns banners currently active and within
  their window, ordered by `sortOrder`. Seeded with 3 sample banners on a
  fresh install.

## 2026-07-29 (1)

- Added `site_content` table + `/site-content/:slug` (admin, roles-gated) and
  `/public/site-content/:slug` (public) endpoints — a generic JSON key-value
  store letting admins edit public-site page content (About, Privacy Policy)
  without a code deploy. Seeded with `about` and `privacy-policy` rows
  matching the previously hardcoded content.

## 2026-07-20

- Added remember-me sessions: login now accepts `rememberMe`, issuing a 30-day
  token instead of the default short-lived one.
- Added optional server-side Cloudflare Turnstile verification on login
  (`TURNSTILE_SECRET_KEY`). Skipped gracefully when unconfigured, so it never
  blocks environments that haven't set it up yet.
