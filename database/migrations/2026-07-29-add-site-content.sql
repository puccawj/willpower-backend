-- Migration: 2026-07-29 — add site_content table for admin-editable public pages
--
-- Generic key-value store for public-site pages an admin can edit (About, Privacy
-- Policy, ...) without a code deploy. `content` is a free-form JSON blob whose shape
-- is defined by convention per slug, not enforced by the schema.
--
-- Safe to run multiple times.
-- Run against production with:
--   psql "$DATABASE_URL" -f database/migrations/2026-07-29-add-site-content.sql

BEGIN;

CREATE TABLE IF NOT EXISTS site_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug varchar(50) NOT NULL UNIQUE,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES users (id) ON DELETE SET NULL
);

-- Seed defaults matching the current hardcoded About/Privacy Policy content, so
-- nothing changes visually until an admin actually edits a page.
INSERT INTO site_content (slug, content)
VALUES (
  'about',
  '{
    "eyebrow": "Since 1932",
    "heroTitle": "A discipline of the heart, carried across generations",
    "heroLead": "The Willpower Institute preserves a lineage of meditation teaching devoted to cultivating willpower — the steady, patient strength that turns intention into daily practice. What began as a single hall now welcomes students on three continents.",
    "carouselImages": ["https://images.unsplash.com/photo-1665849050332-8d5d7e59afb6?q=80&w=1600&auto=format&fit=crop"],
    "timeline": [
      { "year": "1932", "title": "The first hall opens", "desc": "The institute is founded as a single meditation hall dedicated to the study of willpower and mind." },
      { "year": "1978", "title": "A teaching lineage takes shape", "desc": "A formal curriculum is established, training the first generation of resident teachers." },
      { "year": "2004", "title": "Crossing continents", "desc": "The first international branch opens, carrying the practice to a new community abroad." },
      { "year": "2019", "title": "Three branches, one practice", "desc": "With centres in the USA, Canada, and Australia, the institute serves students across three continents." }
    ]
  }'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- Sections mirror the original static page's 11-part layout (sticky table-of-contents +
-- numbered sections) so the public page keeps that look even though content is now
-- admin-editable. `id` is the anchor slug used by the TOC links.
INSERT INTO site_content (slug, content)
VALUES (
  'privacy-policy',
  $json$
  {
    "lastUpdated": "July 14, 2026",
    "lead": "This Privacy Policy explains how the Willpower Institute (\"we,\" \"us,\" \"our\") collects, uses, shares, and protects personal information when you visit our website, enroll in a course, RSVP to an event, or make a donation — across our branches in the United States, Canada, and Australia.",
    "sections": [
      {
        "id": "overview",
        "title": "Overview & scope",
        "bodyHtml": "<p>This Policy applies to personal information we collect through our public website, admin systems, and any related services (course enrollment, event RSVP and check-in, certificates, and donations). By using our services, you agree to the collection and use of information as described here.</p><p>Where a specific jurisdiction grants you additional rights — such as California's Consumer Privacy Act (CCPA/CPRA) — those rights are set out in the dedicated section below, in addition to the general terms that apply to everyone.</p>"
      },
      {
        "id": "information-we-collect",
        "title": "Information we collect",
        "bodyHtml": "<ul><li><strong>Account &amp; profile:</strong> name, email address, phone number, and login credentials.</li><li><strong>Course &amp; event activity:</strong> enrollments, RSVPs, attendance/check-in records, and certificates issued.</li><li><strong>Donation records:</strong> donor name, contact details, donation amount or item description, and payment proof/slip images you upload.</li><li><strong>Technical data:</strong> IP address, browser/device type, and general usage data collected automatically when you use our website.</li></ul>"
      },
      {
        "id": "how-we-use-information",
        "title": "How we use information",
        "bodyHtml": "<ul><li>To operate core services: course enrollment, event RSVP/check-in, certificate issuance, and donation processing.</li><li>To communicate with you about your account, enrollments, events, or donations.</li><li>To verify donations and issue certificates of appreciation.</li><li>To maintain the security and integrity of our systems.</li><li>To comply with legal obligations and respond to lawful requests.</li></ul>"
      },
      {
        "id": "sharing-disclosure",
        "title": "Sharing & disclosure",
        "bodyHtml": "<p>We do not sell your personal information. We may share information with:</p><ul><li>Staff and administrators at the branch associated with your activity, to operate courses, events, and donations.</li><li>Service providers who help us run the website and process data on our behalf, under confidentiality obligations.</li><li>Authorities, where required by law or to protect the rights, safety, or property of the Institute or others.</li></ul><p>Donor names may be shown publicly on an event's donor list unless you choose to donate anonymously.</p>"
      },
      {
        "id": "cookies-tracking",
        "title": "Cookies & tracking",
        "bodyHtml": "<p>We use essential cookies/local storage to keep you signed in and remember your preferences. We do not use third-party advertising trackers.</p>"
      },
      {
        "id": "data-retention-security",
        "title": "Data retention & security",
        "bodyHtml": "<p>We retain personal information for as long as needed to provide our services and to meet legal, accounting, or reporting obligations. We use reasonable administrative and technical safeguards to protect your information, though no system can be guaranteed 100% secure.</p>"
      },
      {
        "id": "your-rights",
        "title": "Your rights (general)",
        "bodyHtml": "<p>Wherever you are located, you may generally ask us to: access the personal information we hold about you; correct inaccurate information; delete your information, subject to legal retention requirements; and withdraw consent where processing is based on consent. Contact us using the details in the Contact section to exercise these rights.</p>"
      },
      {
        "id": "california-privacy-rights",
        "title": "California — CCPA/CPRA",
        "bodyHtml": "<p>If you are a California resident, the California Consumer Privacy Act, as amended by the California Privacy Rights Act (CCPA/CPRA), gives you additional rights over your personal information.</p><ul><li><strong>Right to know:</strong> what categories of personal information we collect, use, and disclose, as described in the Information we collect section.</li><li><strong>Right to delete:</strong> request deletion of personal information we have collected from you, subject to certain exceptions.</li><li><strong>Right to correct:</strong> request correction of inaccurate personal information.</li><li><strong>Right to opt out:</strong> we do not sell or share personal information for cross-context behavioral advertising, so no opt-out is required for that purpose.</li><li><strong>Right to non-discrimination:</strong> we will not discriminate against you for exercising any of these rights.</li></ul><p>To exercise a California privacy right, contact us using the details in the Contact section. We may need to verify your identity before completing your request.</p>"
      },
      {
        "id": "childrens-privacy",
        "title": "Children's privacy",
        "bodyHtml": "<p>Our services are not directed to children under 13, and we do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal information, please contact us so we can remove it.</p>"
      },
      {
        "id": "changes",
        "title": "Changes to this policy",
        "bodyHtml": "<p>We may update this Policy from time to time. The \"Last updated\" date at the top of this page reflects the most recent revision. Material changes will be communicated through our website or by email where appropriate.</p>"
      },
      {
        "id": "contact",
        "title": "Contact us",
        "bodyHtml": "<p>If you have questions about this Policy or wish to exercise your privacy rights, contact us at <a href=\"mailto:privacy@willpower.org\">privacy@willpower.org</a>.</p>"
      }
    ]
  }
  $json$::jsonb
)
ON CONFLICT (slug) DO NOTHING;

COMMIT;
