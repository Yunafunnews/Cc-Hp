# cc&hp Pages and worldwide languages implementation plan

**Goal:** Brand cc&hp, offer 35 real language choices and publish a functional static gallery from work.
**Spec:** ../specs/2026-11-12-cc-hp-pages-design.md

- [x] Write locale and Pages adapter behavioral tests, observe missing-feature failures.
- [x] Translate independent language data packs in parallel; integrate a validated persistent locale registry and RTL.
- [x] Update visible brand and metadata while preserving existing database/session identifiers.
- [x] Build an explicit read-only Pages adapter from attributed local media; fix subpath asset/download/font URLs and accurately disclose community availability.
- [x] Add work-only GitHub Pages workflow and isolated static browser test server.
- [x] Run all API/locale/browser/build/format tests; inspect important languages and mobile RTL.
- [ ] Commit and push work without changing main. Configure/verify Pages through existing authentication, or report the exact access blocker and prepared configuration.
