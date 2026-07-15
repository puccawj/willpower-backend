-- Willpower Institute CRM — PostgreSQL schema
-- Generated from sdlc-architect design pass, see Willpower-Institute-CRM-Design.md
--
-- Open design decisions (defaulted here, revisit with analyst before locking down):
--   - donation_status has 4 states (pending/received/verified/rejected) matching admin-panel UI.
--   - donation_type is money/goods; goods_category (varchar) captures food/clothing/other as a sub-field.
--   - certificate_templates: at most one active template per (type, branch_id) — enforced via partial unique index.
--   - events/course_sessions.location stays free-text for v1 (no normalized locations table yet).
--   - users.email is reusable after soft-delete (partial unique index excludes deleted_at IS NOT NULL rows).
--   - created_by/updated_by (FK to users.id) added to every table that has both created_at and updated_at.
--     branches.created_by/updated_by FKs are added via ALTER TABLE after users exists (circular dependency:
--     users.primary_branch_id -> branches, branches.created_by -> users).
--   - user_role includes 'general': a public/unauthenticated-signup account that is not a student or
--     instructor, but can donate and RSVP/attend events.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid()

-- ============================================================
-- 1. Enum types
-- ============================================================

CREATE TYPE user_role AS ENUM ('superadmin', 'admin', 'instructor', 'student', 'general');
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'pending_verification');
CREATE TYPE registration_source AS ENUM ('admin', 'self', 'google', 'facebook');
CREATE TYPE branch_status AS ENUM ('active', 'inactive', 'deleted');
CREATE TYPE event_status AS ENUM ('draft', 'published', 'closed');
CREATE TYPE rsvp_status AS ENUM ('confirm', 'maybe', 'cancel');
CREATE TYPE checkin_method AS ENUM ('self_qr', 'staff_qr', 'manual');
CREATE TYPE donation_type AS ENUM ('money', 'goods');
CREATE TYPE donation_status AS ENUM ('pending', 'received', 'verified', 'rejected');
CREATE TYPE event_need_type AS ENUM ('money', 'goods');
CREATE TYPE course_need_type AS ENUM ('money', 'goods');
CREATE TYPE photo_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE course_status AS ENUM ('active', 'inactive');
CREATE TYPE offering_mode AS ENUM ('online', 'onsite');
CREATE TYPE offering_status AS ENUM ('draft', 'scheduled', 'ongoing', 'completed', 'cancelled');
CREATE TYPE enrollment_status AS ENUM ('enrolled', 'waitlist', 'completed', 'failed', 'dropped');
CREATE TYPE template_type AS ENUM ('certificate', 'donation_money', 'donation_goods');
CREATE TYPE device_platform AS ENUM ('ios', 'android', 'web');
CREATE TYPE notification_type AS ENUM (
  'event_published', 'event_updated', 'event_cancelled', 'rsvp_reminder',
  'waitlist_promoted', 'donation_verified', 'class_reminder', 'absence_alert',
  'course_completed', 'certificate_issued', 'system'
);

-- ============================================================
-- 2. branches
-- ============================================================

CREATE TABLE branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(120) NOT NULL,
  code varchar(10) NOT NULL,
  description text,
  city varchar(120),
  country varchar(80) NOT NULL DEFAULT 'Thailand',
  address text,
  zip_code varchar(20),
  phone_country_code varchar(5), -- dial code, e.g. '+1' (derived from selected country)
  phone_number varchar(30),
  email varchar(255),
  timezone varchar(60) NOT NULL DEFAULT 'Asia/Bangkok',
  logo_url text,
  status branch_status NOT NULL DEFAULT 'active',
  created_by uuid, -- FK to users.id added below, after users exists (avoids circular dependency)
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT uq_branches_code UNIQUE (code)
);

CREATE INDEX idx_branches_status ON branches (status);

-- ============================================================
-- 3. users
-- ============================================================

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role user_role NOT NULL,
  primary_branch_id uuid REFERENCES branches (id) ON DELETE SET NULL,
  first_name varchar(100) NOT NULL,
  last_name varchar(100) NOT NULL,
  email varchar(255) NOT NULL,
  password_hash varchar(255) NOT NULL,
  phone_country_code varchar(5), -- dial code, e.g. '+1' (derived from selected country)
  phone_number varchar(30),
  status user_status NOT NULL DEFAULT 'pending_verification',
  registration_source registration_source NOT NULL DEFAULT 'admin',
  email_verified_at timestamptz,
  last_login_at timestamptz,
  created_by uuid REFERENCES users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX uq_users_email_active ON users (email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users (role);
CREATE INDEX idx_users_primary_branch_id ON users (primary_branch_id);
CREATE INDEX idx_users_status ON users (status);

-- Deferred FK now that users exists (branches.created_by/updated_by declared above, before users)
ALTER TABLE branches
  ADD CONSTRAINT fk_branches_created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_branches_updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;

-- ============================================================
-- 4. refresh_tokens
-- ============================================================

CREATE TABLE refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash varchar(255) NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_refresh_tokens_token_hash UNIQUE (token_hash)
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens (user_id);

-- ============================================================
-- 5. admin_branch_access
-- ============================================================

CREATE TABLE admin_branch_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES branches (id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  granted_by uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_aba_admin_branch UNIQUE (admin_id, branch_id)
);

CREATE INDEX idx_aba_admin_id ON admin_branch_access (admin_id);
CREATE INDEX idx_aba_branch_id ON admin_branch_access (branch_id);
CREATE UNIQUE INDEX uq_aba_one_primary_per_admin ON admin_branch_access (admin_id) WHERE is_primary;

-- ============================================================
-- 5b. user_branches (general multi-branch membership, any role)
-- ============================================================

CREATE TABLE user_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES branches (id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_branches_user_branch UNIQUE (user_id, branch_id)
);

CREATE INDEX idx_user_branches_user_id ON user_branches (user_id);
CREATE INDEX idx_user_branches_branch_id ON user_branches (branch_id);
CREATE UNIQUE INDEX uq_user_branches_one_primary_per_user ON user_branches (user_id) WHERE is_primary;

-- ============================================================
-- 6. certificate_templates
-- ============================================================

CREATE TABLE certificate_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(150) NOT NULL,
  type template_type NOT NULL,
  background_image_url text NOT NULL,
  layout_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  year smallint,
  branch_id uuid REFERENCES branches (id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT false,
  uploaded_by uuid REFERENCES users (id) ON DELETE SET NULL,
  created_by uuid REFERENCES users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cert_templates_type_active ON certificate_templates (type, is_active);
CREATE INDEX idx_cert_templates_branch_id ON certificate_templates (branch_id);
CREATE UNIQUE INDEX uq_cert_templates_one_active_per_scope
  ON certificate_templates (type, COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'))
  WHERE is_active;

-- ============================================================
-- 7. courses
-- ============================================================

CREATE TABLE courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(200) NOT NULL,
  description text,
  syllabus text, -- freeform teaching topics/curriculum, one item per line, shown on the public course detail page
  category varchar(100),
  image_url text,
  total_sessions integer NOT NULL,
  passing_attendance_percent numeric(5,2) NOT NULL DEFAULT 80.00,
  passing_criteria jsonb,
  default_template_id uuid REFERENCES certificate_templates (id) ON DELETE SET NULL,
  status course_status NOT NULL DEFAULT 'active',
  created_by uuid REFERENCES users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT chk_courses_total_sessions CHECK (total_sessions > 0)
);

CREATE INDEX idx_courses_status ON courses (status);
CREATE INDEX idx_courses_category ON courses (category);

-- ============================================================
-- 8. events
-- ============================================================

CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches (id) ON DELETE RESTRICT,
  created_by uuid REFERENCES users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES users (id) ON DELETE SET NULL,
  title varchar(200) NOT NULL,
  description text,
  cover_image_url text,
  location varchar(255),
  capacity integer,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  rsvp_cutoff_at timestamptz,
  publish_at timestamptz,
  status event_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT chk_events_capacity CHECK (capacity IS NULL OR capacity > 0),
  CONSTRAINT chk_events_end_after_start CHECK (end_at > start_at)
);

CREATE INDEX idx_events_branch_status_start ON events (branch_id, status, start_at);

-- ============================================================
-- 9. event_rsvp / event_waitlist / event_attendance / event_photos
-- ============================================================

CREATE TABLE event_rsvp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  status rsvp_status NOT NULL,
  responded_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_event_rsvp_event_user UNIQUE (event_id, user_id)
);

CREATE INDEX idx_event_rsvp_event_status ON event_rsvp (event_id, status);

CREATE TABLE event_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  position integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_event_waitlist_event_user UNIQUE (event_id, user_id),
  CONSTRAINT uq_event_waitlist_event_position UNIQUE (event_id, position)
);

CREATE INDEX idx_event_waitlist_event_position ON event_waitlist (event_id, position);

CREATE TABLE event_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  checked_in_at timestamptz NOT NULL DEFAULT now(),
  checked_out_at timestamptz,
  checked_in_by uuid REFERENCES users (id) ON DELETE SET NULL,
  method checkin_method NOT NULL,
  CONSTRAINT uq_event_attendance_event_user UNIQUE (event_id, user_id)
);

CREATE INDEX idx_event_attendance_event_id ON event_attendance (event_id);

CREATE TABLE event_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  user_id uuid REFERENCES users (id) ON DELETE SET NULL,
  image_url text NOT NULL,
  caption varchar(300),
  status photo_status NOT NULL DEFAULT 'pending',
  moderated_by uuid REFERENCES users (id) ON DELETE SET NULL,
  moderated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_photos_event_status ON event_photos (event_id, status);

CREATE TABLE event_needs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  title varchar(200) NOT NULL,
  type event_need_type NOT NULL,
  unit varchar(30), -- e.g. 'bags', 'pieces'; unused for type='money'
  target_quantity numeric(12,2) NOT NULL,
  received_quantity numeric(12,2) NOT NULL DEFAULT 0, -- denormalized sum of verified donations against this need
  created_by uuid REFERENCES users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT chk_event_needs_target_positive CHECK (target_quantity > 0)
);

CREATE INDEX idx_event_needs_event_id ON event_needs (event_id);

CREATE TABLE course_needs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
  session_number integer, -- optional: which class session (1..courses.total_sessions) this need is for; null = whole course
  title varchar(200) NOT NULL,
  type course_need_type NOT NULL,
  unit varchar(30), -- e.g. 'bags', 'pieces'; unused for type='money'
  target_quantity numeric(12,2) NOT NULL,
  received_quantity numeric(12,2) NOT NULL DEFAULT 0, -- denormalized sum of verified donations against this need
  created_by uuid REFERENCES users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT chk_course_needs_target_positive CHECK (target_quantity > 0),
  CONSTRAINT chk_course_needs_session_positive CHECK (session_number IS NULL OR session_number > 0)
);

CREATE INDEX idx_course_needs_course_id ON course_needs (course_id);

CREATE TABLE course_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
  user_id uuid REFERENCES users (id) ON DELETE SET NULL,
  image_url text NOT NULL,
  caption varchar(300),
  status photo_status NOT NULL DEFAULT 'pending',
  moderated_by uuid REFERENCES users (id) ON DELETE SET NULL,
  moderated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_course_photos_course_status ON course_photos (course_id, status);

-- ============================================================
-- 10. donations
-- ============================================================

CREATE TABLE donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events (id) ON DELETE SET NULL,
  course_id uuid REFERENCES courses (id) ON DELETE SET NULL,
  branch_id uuid NOT NULL REFERENCES branches (id) ON DELETE RESTRICT,
  user_id uuid REFERENCES users (id) ON DELETE SET NULL,
  donor_name varchar(150) NOT NULL, -- captured at donation time; walk-in donors may not have a user_id
  donor_phone_country_code varchar(5), -- dial code, e.g. '+66' (derived from selected country)
  donor_phone_number varchar(30) NOT NULL,
  donor_email varchar(255) NOT NULL,
  receipt_number varchar(60),
  type donation_type NOT NULL,
  goods_category varchar(60),
  amount numeric(12,2),
  currency varchar(3) DEFAULT 'USD',
  item_description text,
  proof_image_url text,
  need_id uuid REFERENCES event_needs (id) ON DELETE SET NULL, -- optional: which event wishlist item this targets
  course_need_id uuid REFERENCES course_needs (id) ON DELETE SET NULL, -- optional: which course wishlist item this targets
  quantity numeric(12,2), -- units donated toward a need's target when type='goods' and need_id/course_need_id is set
  status donation_status NOT NULL DEFAULT 'pending',
  is_anonymous boolean NOT NULL DEFAULT false,
  verified_by uuid REFERENCES users (id) ON DELETE SET NULL,
  verified_at timestamptz,
  certificate_no varchar(60),
  certificate_template_id uuid REFERENCES certificate_templates (id) ON DELETE SET NULL,
  certificate_url text,
  certificate_issued_at timestamptz,
  created_by uuid REFERENCES users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT uq_donations_certificate_no UNIQUE (certificate_no),
  CONSTRAINT chk_donations_money_amount CHECK (type <> 'money' OR amount IS NOT NULL),
  CONSTRAINT chk_donations_goods_description CHECK (type <> 'goods' OR item_description IS NOT NULL)
);

CREATE INDEX idx_donations_event_type ON donations (event_id, type);
CREATE INDEX idx_donations_course_type ON donations (course_id, type);
CREATE INDEX idx_donations_branch_status ON donations (branch_id, status);
CREATE INDEX idx_donations_user_id ON donations (user_id);
CREATE INDEX idx_donations_need_id ON donations (need_id);
CREATE INDEX idx_donations_course_need_id ON donations (course_need_id);

-- ============================================================
-- 11. course_offerings
-- ============================================================

CREATE TABLE course_offerings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses (id) ON DELETE RESTRICT,
  branch_id uuid NOT NULL REFERENCES branches (id) ON DELETE RESTRICT,
  instructor_id uuid REFERENCES users (id) ON DELETE SET NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  capacity integer,
  location varchar(255),
  mode offering_mode NOT NULL,
  status offering_status NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT chk_offerings_end_after_start CHECK (end_date >= start_date),
  CONSTRAINT chk_offerings_capacity CHECK (capacity IS NULL OR capacity > 0)
);

CREATE INDEX idx_offerings_branch_status ON course_offerings (branch_id, status);
CREATE INDEX idx_offerings_course_id ON course_offerings (course_id);
CREATE INDEX idx_offerings_instructor_id ON course_offerings (instructor_id);

-- ============================================================
-- 12. course_sessions
-- ============================================================

CREATE TABLE course_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offering_id uuid NOT NULL REFERENCES course_offerings (id) ON DELETE CASCADE,
  session_no integer NOT NULL,
  session_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  duration_minutes integer,
  location varchar(255),
  topic varchar(255),
  created_by uuid REFERENCES users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_course_sessions_offering_no UNIQUE (offering_id, session_no),
  CONSTRAINT chk_course_sessions_end_after_start CHECK (end_time > start_time)
);

CREATE INDEX idx_course_sessions_offering_date ON course_sessions (offering_id, session_date);

-- ============================================================
-- 13. course_enrollments
-- ============================================================

CREATE TABLE course_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offering_id uuid NOT NULL REFERENCES course_offerings (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  status enrollment_status NOT NULL DEFAULT 'enrolled',
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  approved_by uuid REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT uq_course_enrollments_offering_user UNIQUE (offering_id, user_id)
);

CREATE INDEX idx_enrollments_offering_status ON course_enrollments (offering_id, status);
CREATE INDEX idx_enrollments_user_id ON course_enrollments (user_id);

-- ============================================================
-- 14. class_attendance
-- ============================================================

CREATE TABLE class_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES course_sessions (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  checked_in_at timestamptz NOT NULL DEFAULT now(),
  checked_out_at timestamptz,
  checked_in_by uuid REFERENCES users (id) ON DELETE SET NULL,
  method checkin_method NOT NULL,
  CONSTRAINT uq_class_attendance_session_user UNIQUE (session_id, user_id)
);

CREATE INDEX idx_class_attendance_session_id ON class_attendance (session_id);
CREATE INDEX idx_class_attendance_user_id ON class_attendance (user_id);

-- ============================================================
-- 15. certificates
-- ============================================================

CREATE TABLE certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users (id) ON DELETE SET NULL,
  offering_id uuid REFERENCES course_offerings (id) ON DELETE SET NULL,
  template_id uuid NOT NULL REFERENCES certificate_templates (id) ON DELETE RESTRICT,
  certificate_no varchar(60) NOT NULL,
  attendance_percent numeric(5,2) NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  issued_by uuid REFERENCES users (id) ON DELETE SET NULL,
  file_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_certificates_certificate_no UNIQUE (certificate_no)
);

CREATE INDEX idx_certificates_user_id ON certificates (user_id);
CREATE INDEX idx_certificates_offering_id ON certificates (offering_id);

-- ============================================================
-- 16. team_members
-- ============================================================

CREATE TABLE team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users (id) ON DELETE SET NULL,
  branch_id uuid NOT NULL REFERENCES branches (id) ON DELETE CASCADE,
  name varchar(150) NOT NULL,
  position varchar(150),
  bio text,
  photo_url text,
  display_order integer NOT NULL DEFAULT 0,
  is_shown boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_team_members_branch_order ON team_members (branch_id, display_order);

-- ============================================================
-- 17. user_devices
-- ============================================================

CREATE TABLE user_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  platform device_platform NOT NULL,
  push_token varchar(255) NOT NULL,
  device_model varchar(120),
  app_version varchar(30),
  last_active_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_devices_user_token UNIQUE (user_id, push_token)
);

CREATE INDEX idx_user_devices_user_id ON user_devices (user_id);

-- ============================================================
-- 18. notifications
-- ============================================================

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title varchar(200) NOT NULL,
  message text NOT NULL,
  related_entity varchar(50),
  related_entity_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread ON notifications (user_id, is_read);

-- ============================================================
-- 19. audit_logs (append-only)
-- ============================================================

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users (id) ON DELETE SET NULL,
  action varchar(100) NOT NULL,
  entity varchar(60) NOT NULL,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_entity ON audit_logs (entity, entity_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs (user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at);

COMMIT;
