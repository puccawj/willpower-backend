# Changelog

Product-impacting changes to the API. Newest first.

## 2026-09-01 (15) — Expose registered branches on /me, and let students apply for more

- `GET /me` / `PATCH /me` now return `branches: {branchId, branchName}[]` — the
  account's actual `user_branches` membership. Previously `/me` carried no
  branch information at all, so the mobile Profile page had no way to show
  which branch(es) a member is registered at.
- `POST /me/student-application` (apply to become a student) previously
  rejected anyone whose role wasn't `general`, so an already-approved
  `student` had no way to register at a second branch through the app. Now
  accepts `student` too, and rejects branch ids the account already belongs
  to with a clear message instead of silently re-approving them.
- `GET /me/certificates` now also returns `templateType`
  (`certificate`/`donation_money`/`donation_goods`) so a client can group or
  filter certificates by type — needed by the mobile My Certificates filter.

## 2026-08-31 (14) — Broadcast now reaches every branch a user belongs to, not just their primary

- `POST /notifications/broadcast` with `scope: "branch"` matched
  recipients on `users.primary_branch_id` only — a user assigned to
  more than one branch via `user_branches` (e.g. an admin covering two
  branches) never received a broadcast targeted at their non-primary
  branch. Every other branch-scoped feature in the app (Users,
  Donations, Student Applications, Dashboard) checks full
  `user_branches` membership, not just the primary one; broadcast now
  matches that pattern via `EXISTS (... user_branches ...)`. Verified
  locally: `admin@willpower.org` (primary = USA, also a Canada member)
  now receives a broadcast sent to Canada.

## 2026-08-31 (13) — Restrict Reports/Home Hero/Home Banners/About/Privacy to superadmin

- `ReportsController`, `HomeBannersController`, and
  `SiteContentController` (serves Home Hero, About Page, and Privacy
  Policy, keyed by slug) now require the `superadmin` role — regular
  admin accounts can no longer view or edit these.

## 2026-08-28 (12) — Student applications: pick multiple branches, each decided independently

- Applying to become a student previously collected no branch at all,
  and approval never granted branch membership — an approved student
  ended up with zero branches. `POST /me/student-application` now
  requires `branchIds: string[]` (one or more); each becomes its own
  `student_application_branches` row with its own pending/approved/
  rejected status, so a student can be approved at one branch while
  still pending or rejected at another.
- `GET /student-applications` now returns one row per (application,
  branch) and scopes to the admin's own branches via `user_branches`
  (superadmin sees/acts on every branch). Approve grants that branch
  via `user_branches` (first-ever approval also sets `primaryBranchId`
  and flips role to `student`); reject only affects that one branch.
- Migration: `database/migrations/2026-08-28-add-student-application-branches.sql`
  adds the new table and drops the now-unused parent-level `status`/
  `reviewed_by`/`reviewed_at` columns from `student_applications`.

## 2026-08-27 (11) — Return the logged-in user's real assigned branches from login

- `/auth/login`, `/auth/register`, and SSO login now return
  `user.branchNames` — the caller's actual branches from
  `user_branches`, resolved fresh on every login. Needed by the admin
  panel's topbar, which previously hardcoded "USA · Canada" for every
  admin account regardless of their real assignment.

## 2026-08-27 (10) — Capacity only blocks self-enroll, not admin-driven enrollment

- The capacity check added in CHANGELOG (9) blocked every enrollment
  path uniformly. Narrowed so it only applies to self-service
  enrollment (public-site/mobile) — an admin/instructor adding a
  student directly can still exceed capacity as a deliberate
  exception, same as the existing prerequisite override.

## 2026-08-27 (9) — Close three more integrity gaps found via a systematic audit

- `enroll()` now rejects once an offering's enrolled count reaches its
  `capacity` — previously unenforced, a class could be over-booked
  past what was configured.
- `removeSession()` now rejects removing a session from a published
  offering, and `courses.update()` now rejects changing `totalSessions`
  on a course with published offerings — both would otherwise break
  the "session count == totalSessions" invariant added in CHANGELOG
  (8), silently shifting every enrolled student's attendance %.

## 2026-08-27 (8) — Enforce session count against the course's Total Sessions

- `POST /course-offerings/:id/sessions` now rejects adding a session
  once the offering already has as many sessions as the course's
  `totalSessions` calls for — nothing previously stopped building more
  (or fewer) sessions than that number.
- `PATCH /course-offerings/:id` now rejects setting `status: 'published'`
  unless the built session count exactly equals `totalSessions`, so an
  incomplete schedule can no longer go live.

## 2026-08-27 (7) — Expose certificate template background/layout from /me/certificates

- `GET /me/certificates` now also returns `backgroundImageUrl` and
  `layoutConfig` from the issuing template, so a client can render the
  certificate the way it was actually designed instead of guessing.
  Needed by the mobile app's "certificate received" screen, which
  previously showed a generic mock-up unrelated to the real template.

## 2026-08-27 (6) — Scope instructor visibility to offerings they actually teach

- Instructors were scoped by branch only, identically to admins — a
  newly created instructor with no offerings assigned to them could
  see, and open the roster/attendance/session schedule for, every
  other instructor's class in the same branch. `GET /course-offerings`
  (list + detail), `GET /course-offerings/:id/sessions`, and every
  roster/enrollment/attendance/check-in-QR endpoint under
  `/course-offerings/:offeringId/...` now scope the instructor role to
  `offering.instructorId === actor.id`. Admins/superadmin are
  unaffected.

## 2026-08-26 (5) — Auto-confirm RSVP on QR self check-in

- `POST /me/events/:eventId/checkin` previously required an existing
  confirmed RSVP and threw a ConflictException otherwise, forcing a
  member who scans an event's QR at the venue without having RSVP'd
  online to first go find the event and tap "I'll attend". Scanning
  the code already means they're there — self check-in now
  auto-confirms the RSVP instead of requiring the separate step
  (bypassing capacity/waitlist, since they're already present).

## 2026-08-26 (4) — Expose donation certificate URL from /me/donations

- `GET /me/donations` now returns `certificateUrl`, the PDF link already
  stored on the donation once an admin issues a donation certificate.
  It was being written but never selected, so the public-site/mobile
  "My Donations" screens had no data to build a download link from.

## 2026-08-18 (3) — Course category becomes a managed list

- Replaced `Course.category` (freeform text) with a `course_categories`
  lookup table — `GET/POST /course-categories`, `PATCH/DELETE
  /course-categories/:id` (admin), `GET /public/course-categories`
  (active only, public). Course create/update now take `categoryId`
  instead of a typed string; every response resolves it back to a
  display name. Migration `2026-08-18-add-course-categories.sql`
  backfills the 5 distinct category values already in the database.
  Deleting a category in use by a course is blocked.

## 2026-08-18 (2) — Auto-transition offering status to completed

- Offerings now flip from `published` to `completed` automatically once
  their end date passes (hourly `@nestjs/schedule` job, plus a sweep on
  boot) — previously this only happened if an admin manually changed the
  dropdown, so a stale `published` offering could stay open for
  enrollment on the public site indefinitely.

## 2026-08-18 (1) — Full per-session attendance matrix on enrollments

- `GET /course-offerings/:id/enrollments` now returns
  `sessionAttendance: {sessionId, present}[]` per student (every session
  of the offering, not just the one passed via `?sessionId=`) — powers
  the admin panel's new attendance grid (one column per session) instead
  of a session-by-session picker. No schema change; existing
  `presentThisSession`/`attendedSessions` fields are unchanged.

## 2026-08-17 (1) — Course Offering redesign, phase 3 (backend)

- Simplified offering `status` from a wider set down to
  `draft`/`published`/`completed`/`cancelled` (migration
  `2026-08-16-simplify-offering-status.sql`), and enforced real business
  rules around it: self- and admin-driven enrollment now requires the
  offering to be `published`; once `completed`, the offering is locked
  against further enrollment/session edits.
- Added an optional `code` (short code/nickname) field on course offerings
  (migration `2026-08-17-add-offering-code.sql`), so admins can tell apart
  multiple offerings of the same course (e.g. two "Mindfulness Retreat"
  runs) without relying on dates alone. Exposed on offering
  create/update/list responses and the public offering listing.
- Offering list/detail responses now include the parent course's
  active/inactive flag, so the admin UI can flag "course inactive" on an
  offering even when the offering itself is still `Published` — an
  inactive course already hides all its offerings from the public site,
  but that state wasn't visible anywhere in the offering list before.

## 2026-08-15 (1) — Course Offering redesign, phase 1 (backend)

- **Sessions are no longer auto-generated on a fixed 7-day cadence.**
  `POST /course-offerings` creates an offering with zero sessions; admins now
  build the schedule by hand via new `POST`/`PATCH`/`DELETE
  /course-offerings/:id/sessions[/:sessionId]` endpoints, with fully custom
  per-session dates/times/topic/location.
- Unified attendance %/pass-status calculation into one place
  (`EnrollmentService.getCompletionStatus()`); certificate issuance now
  calls it instead of independently recomputing, and also writes
  `completed`/`failed` onto the enrollment once the offering ends (was
  never written before).
- Prerequisite courses are now enforced on **every** enrollment path,
  including admin-driven enrollment (previously silently bypassed) —
  admins can explicitly override via a `force` flag.
- Student-facing enrollment rows (`/me/enrollments`) now include
  `passingPercent`/`isPassing`.

## 2026-07-31 (1)

- Added `POST /auth/apple` — Sign in with Apple, verified against Apple's
  published JWKS (`aud` = the mobile app's bundle ID). Added for the
  upcoming iOS app, which App Store guideline 4.8 requires whenever
  Google/Facebook sign-in is offered. Added `'apple'` to the
  `registration_source` enum.

## 2026-07-30 (2)

- Added `course_prerequisites` table + `prerequisiteCourseIds` on course
  create/update (admin) — a course can require completion of one or more
  other courses before self-enrollment is allowed. Public course
  list/detail now expose `prerequisiteTitles`. Self-service enrollment
  (`/me/enrollments`) is blocked with a 400 until the member has a
  `completed` enrollment in every prerequisite course; admin-driven
  enrollment (`POST /course-offerings/:id/enrollments`) intentionally
  bypasses the gate. Courses with no prerequisites enroll exactly as
  before.
- `GET /public/courses/offerings` (the offering-card listing used on Home
  and the Courses page) now also carries `prerequisiteTitles` per row.

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
