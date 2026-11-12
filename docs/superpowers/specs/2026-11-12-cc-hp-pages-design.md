# cc&hp branding, worldwide language selection and Pages

User request: name the site cc&hp, deploy GitHub Pages from current work branch rather than main, add Japanese/German/French/Spanish and dozens of mainstream languages. No valid custom domain supplied; `&` is not a DNS hostname character, so use the default GitHub Pages project URL until a full owned domain is supplied.

## Implementation decisions

- Preserve existing account/database IDs and sessions; update visible brand, title, metadata and project package name.
- Offer 35 languages with translated required core navigation/gallery/account/growth phrases. English, Chinese, Japanese, Korean, German, French and Spanish include longer secondary text. Other languages fall back to English for untranslated secondary text, disclosed in settings. Locale persists and is validated; ar/he/fa/ur set RTL.
- Use an Actions Pages deployment triggered only on pushes to work. Checkout the triggering commit; manual runs restricted to work; no main trigger or checkout. Build Pages artifact with relative asset URLs for /Cc-Hp/ project base; preserve Node backend build for full app.
- Pages is static. Public gallery/filter/sort/download and collections/story/language work from a local manifest without attempting nonexistent /api requests. Clearly disclose that account/upload features on this public gallery are not open until a backend is connected. Never simulate real accounts or reward data. Keep existing backend fully functional in normal dev/production builds.
- Keep the full Node application available for a future backend deployment. No external backend, cross-domain cookie or CORS configuration is invented in this change.
- Push reviewed implementation to work after tests. Enable Pages with existing scoped GitHub authentication if available. Do not alter main, force-push, add tokens, invent a CNAME or claim remote publication when blocked by permissions/network.

## Validation

Backend suite remains green; locale core coverage and real Japanese/German/French/Spanish rendering, persistence and RTL; separate Pages-mode browser test at a /Cc-Hp/ subpath with zero API calls, media/font resolution, search, download and honest account limitations. Production build, formatter, work-only workflow and remote status check.
