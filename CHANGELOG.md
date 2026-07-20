# Changelog

Product-impacting changes to the API. Newest first.

## 2026-07-20

- Added remember-me sessions: login now accepts `rememberMe`, issuing a 30-day
  token instead of the default short-lived one.
- Added optional server-side Cloudflare Turnstile verification on login
  (`TURNSTILE_SECRET_KEY`). Skipped gracefully when unconfigured, so it never
  blocks environments that haven't set it up yet.
