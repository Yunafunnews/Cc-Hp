# Release verification — 2026-11-12

- Reproduced dependency installation with `npm ci --cache /tmp/pawloop-npm-cache --no-audit --no-fund` on Node 24.22.1.
- `npm test`: **9 passed** against real temporary SQLite databases and HTTP servers. Includes authentication/logout, malformed requests, pending media privacy, moderation, rewards, invite cap/rank, reporting and restoring sessions in a new application instance.
- `npm run test:e2e`: **6 passed** in system Chromium. Includes search/category filters, locale persistence, registration, collections, upload pending state, daily check-in, mobile overflow/escape, shared links beyond gallery results, delayed dashboard responses after logout, and removing saved GIFs in detail.
- `npm run build`: production frontend built successfully.
- `npm run format:check`: passed.
- `npm audit --omit=dev --audit-level=high`: **0 vulnerabilities** after updating sharp to 0.35.5.
- Production process tested with a separate temporary data directory and `COOKIE_SECURE=false` solely for local HTTP. Admin promotion CLI succeeded. Browser moderation approved a user upload, granting the invitee 25 upload XP + 30 first-upload XP and the inviter 50 invitation XP. Download returned valid GIF bytes. No browser or CSP errors were observed.
- Production desktop and mobile screenshots saved in `docs/screenshots/`.
- Independent code review completed. Shared-link resolution, delayed authentication state, saved-collection removal and capped-invitation status findings were fixed with regression coverage.
- Installation and startup instructions saved in the cloud configuration draft (`install_script`, `start_skill`); this is not publication. Current development process restarted on port 3000; `/api/health` and approved GIF listing responded successfully.

No public deployment has occurred. Demo GIFs must be replaced with the owner's authorized pet footage for a personalized public release. Initial translated languages are English, simplified Chinese and traditional Chinese; more locales and a standalone forum remain future work.

## cc&hp / work / worldwide locales update

- `npm test`: **15 passed** (existing authentication, moderation and rewards plus locale core coverage, RTL, Pages filtering/download bytes and bundled-media metadata refresh).
- Full-app browser workflow: **6 passed**. Pages build served at `/Cc-Hp/`: **3 browser tests passed** for branding, no missing API requests, real GIF downloads, 35-language selector, Japanese/German/French/Spanish persistence, Arabic mobile RTL, and base-aware shared URLs.
- Both full-app and Pages builds passed. Formatter passed. Every Pages action SHA was resolved against its official upstream tag (checkout/setup-node v7, upload-pages-artifact v3, deploy-pages v4).
- Follow-up independent review reported no Critical or Important findings. Metadata refresh regression was reproduced and fixed with a test.
- GitHub read and push dry-run to `work` succeeded. GitHub Pages API access is currently blocked by the runtime outbound network policy; `api.github.com` and `yunafunnews.github.io` have been saved as requested custom domain additions in the environment configuration draft. Remote Pages activation/publication is not claimed until checked.
- Site name is cc&hp. No CNAME or custom DNS record is supplied because no valid owned hostname was provided.

## cc&hp Admin increment

- Retained the custom React/Express/SQLite stack. Added protected overview, paginated GIF management/metadata editing, member lookup/detail and read-only points ledger; no additional dependencies.
- `npm test`: **21 passed**. Includes guest/member denial on every admin read route, explicit safe member output, literal wildcard searches, malformed paging, metadata-only edits without point awards, and existing approval/invitation reward behavior.
- Full-app Chromium suite: **9 passed**. New admin workflow uses real registration, explicit CLI role promotion, approval, editing, member detail, points search and mobile layout. Covers guest exclusion and correcting pagination after reviewing the final item on the last page.
- Pages Chromium suite: **3 passed**. Both production builds passed.
- Independent review found a data-tab result-shape race; fixed by associating results with the originating request key and ignoring stale responses. The failing admin workflow passed after the fix. Last-page review pagination was reproduced, corrected and covered by a failing-then-passing browser regression.
- `/admin` route, overview screenshot, all data-tab transitions and narrow viewport were exercised against a real temporary application/database with zero browser errors. Screenshot: `docs/screenshots/admin.png` (local demo accounts only).
- Admin backend remains undeployed pending a hosting choice with Node.js 24 and persistent storage. GitHub Pages remains a read-only public gallery. No admin account, credential or backend hosting is invented.
