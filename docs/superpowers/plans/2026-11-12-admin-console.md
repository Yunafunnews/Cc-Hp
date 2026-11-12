# cc&hp Admin Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline and perform a final independent review.

**Goal:** Expand existing moderation into a usable administration center.
**Architecture:** Authenticated Express admin routes, existing SQLite and React UI. No additional dependencies.
**Tech Stack:** React 19, Express 5, Node 24 SQLite, Playwright.
**Spec:** ../specs/2026-11-12-admin-console-design.md

## Global Constraints

All admin endpoints require live administrator authorization. Keep existing point awards unchanged. Preserve user data. No public admin account or default password. Pages stays static.

## Review Focus

- Unauthenticated/member access and password/session data leakage.
- Search wildcards and malformed pagination.
- Approval side effects versus metadata-only editing.
- Stale UI responses during navigation.
- Small-screen table and dialog accessibility.

### Task 1: Administrative API

Files: server/admin-api.js, server/app.js, tests/admin.test.js.

- [x] Write HTTP tests for auth, real counters, review compatibility, editable metadata, safe member detail and filtered points.
- [x] Run node --test tests/admin.test.js; expect missing endpoints to fail.
- [x] Implement registerAdminRoutes(app,{db,auth,admin,gifData}) and retain existing review POST.
- [x] Run npm test; expect all tests pass.

### Task 2: Admin console

Files: src/components/AdminConsole.jsx, src/App.jsx, src/locales/admin.js, src/i18n.js, src/styles.css, tests/browser.spec.js, playwright.config.js.

- [x] Write browser workflow covering actual registration/CLI promotion, approval, metadata editing, member details, ledger, mobile layout and guest exclusion; observe failure.
- [x] Implement overview/content/users/points tabs with controlled query state and bounded paging.
- [x] Run full-app and Pages browser suites and both builds.

### Task 3: Review and delivery

- [x] Independently review permission/data/stale-state boundaries and fix material defects with regression tests.
- [x] Update documentation with admin entry, capability boundaries and pending backend hosting.
- [x] Verify formatter and tests; retain changes on work, preserve main.
