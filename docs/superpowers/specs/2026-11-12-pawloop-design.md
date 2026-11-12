# Pawloop — pet GIF gallery and sharing community

## Intent

A personal pet showcase that grows into a place to find joyful GIFs for social messaging. First release includes real accounts, uploads/downloads, invitations, points, tasks, levels and badges. Default English, selectable languages in settings. A full discussion forum is a later release.

## Approach

Custom React + Node/Express application with SQLite on Node 24. Alternative: adapt an existing forum (faster discussion features but constrains gallery and growth design). User delegated implementation decisions after choosing to proceed with the recommended custom approach. Work in the existing isolated cloud checkout.

## Experience

Warm ivory canvas, orange accents, editorial pet hero, category chips and responsive masonry GIF gallery. Search by title/tags and filter by category; sort trending/newest. GIF detail supports download, like, save and comments. Separate collections, story, growth dashboard, upload, profile and settings. English, simplified/traditional Chinese initially; extensible locale dictionaries with English fallback, no claim of universal completed translations. Preserve original user content language. Responsive keyboard-accessible dialogs and reduced-motion support.

## Data and rules (implementation defaults)

SQLite persists users, hashed passwords, hashed session tokens, GIF metadata, likes, saves, comments, invitation attribution, points ledger and task claims. HTTP-only same-site session cookie, origin checks, rate limits, bounded validated uploads. Guests browse/download; registration required for uploading, liking, saving and commenting. Uploads require GIF signature and decoded dimensions, maximum 15 MB, pending administrator approval. Admin promotion is an explicit local CLI action; no default password. File content is stored separately from public assets; pending uploads accessible only to owner/admin.

Registration awards 20 points. Daily check-in 10 once per UTC day. Approved upload 25 with first-upload bonus 30 once. Invite reward 50 only when the invitee's first upload is approved, once per invitee, capped at 10 credited invitations per UTC day. Signup via valid invite code records immutable attribution. Points are not spendable; titles/badges unlock at 0, 100, 300, 700, 1500 points. All rewards transactional and idempotent. UI invitation text must accurately describe eligibility. Email is used as login identifier; no email sending or verification is claimed without a configured email provider.

## Constraints and release boundary

No real pet photos/name were supplied: clearly marked replaceable demo content, with source attribution. No payments, point redemption, auto-translated posts or full forum. Keep secrets/data out of Git. Single-instance local disk architecture; public deployment needs HTTPS, persistent volume and backups. No external email service required for local development.

## Verification

HTTP tests exercise signup/login/session/logout, duplicate emails, anonymous authorization, upload validation, moderation/privacy, repeat rewards, invite attribution, daily tasks and persistence. Browser tests cover search/filter, signup/login, upload pending state, download, saved collections, locale persistence and responsive dialogs. Production build and local HTTP check required.
