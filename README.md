# cc&hp

A warm, self-hosted pet GIF showcase and sharing community. Built with React, Vite, Express and SQLite (Node.js 24).

## Run locally

```sh
npm ci --cache /tmp/pawloop-npm-cache
npm run dev
```

The app listens on port **3000**. `PORT` changes the port. Development serves the UI and API from the same process, with hot module reload. Use the existing isolated checkout in cloud tasks; no additional worktree is needed.

```sh
npm run build
npm start
```

Production uses secure cookies by default and expects HTTPS. For a **local HTTP-only production smoke test**, use `COOKIE_SECURE=false npm start`. Never use that override on a public deployment.

## Included

- Responsive animated GIF gallery, title/tag search, categories, featured/newest/most-loved sorting.
- Real registration, sign-in/out and persistent HTTP-only cookie sessions. Passwords use salted scrypt hashes; raw session tokens are never stored in SQLite.
- Anonymous GIF downloads. Members can like, save to a personal collection and leave comments.
- GIF uploads (15 MB maximum), signature/decode checks, private pending/rejected files and a moderation queue.
- Points ledger, daily check-in, upload tasks, five levels, titles and unlockable badges.
- Personal invitation codes and links, immutable signup attribution, qualification on first approved upload and a daily reward cap.
- Default English with 35 selectable languages, persisted per browser. Extend the packs in `src/locales/`; missing secondary translations fall back to English. User content is never silently translated.
- Curated topic collections and an about page. A standalone discussion forum is a future phase; GIF comments already work.

## Admin and moderation

Register an account normally, then explicitly promote the registered email using the same data directory as the running app:

```sh
npm run admin -- you@example.com
# For a custom data directory:
DATA_DIR=/absolute/path/to/data npm run admin -- you@example.com
```

Reload the website or sign back in. **Moderation** appears in the sidebar. Approve or reject pending uploads. Member reports enter the same queue; reporting alone does not hide published GIFs. Review resolves outstanding reports. No default admin password is shipped.

## Points rules

| Event                 |       XP | Eligibility                                                                                      |
| --------------------- | -------: | ------------------------------------------------------------------------------------------------ |
| Register              |       20 | Once per account                                                                                 |
| Daily check-in        |       10 | Once per UTC day, resets 00:00 UTC                                                               |
| Upload approved       |       25 | Once per GIF, even if re-reviewed                                                                |
| First approved upload | 30 bonus | Once per account                                                                                 |
| Invite a friend       |       50 | After invitee's first approved GIF; once per invitee; maximum 10 credits per inviter per UTC day |

Levels: **Curious Paw** (0), **Happy Camper** (100), **Joy Collector** (300), **Loop Legend** (700), **Paw Royalty** (1500). Each unlocks a badge. Points are not spendable. Invites whose qualifying upload occurs after the daily cap do not earn a later deferred reward. Email identifies the account; no email delivery or verification is claimed. Authentication and upload rate limits reduce local abuse, while human moderation gates upload/invite rewards.

## Data and configuration

`DATA_DIR` defaults to `./data`, containing `pawloop.sqlite`, its WAL files and uploaded media. It is Git-ignored. The filesystem is the persistence layer: use a persistent volume and backups when deploying. Stop the process before copying the full data directory, or use SQLite's backup tooling for a live database. Changing `DATA_DIR` creates a separate installation.

| Variable        | Default            | Purpose                                                      |
| --------------- | ------------------ | ------------------------------------------------------------ |
| `PORT`          | `3000`             | Listen port                                                  |
| `DATA_DIR`      | `./data`           | Persistent SQLite/upload directory                           |
| `NODE_ENV`      | development        | `production` serves the built frontend                       |
| `COOKIE_SECURE` | true in production | HTTPS-only session cookies; false only for local HTTP checks |

No third-party API keys are needed. All demo media and fonts are served locally. Browser state stores only the language preference; accounts and growth data are stored on the server.

## Verification

```sh
npm test                 # HTTP integration tests against real temporary SQLite databases
npm run build            # Production frontend build
npm run test:e2e         # Chromium browser workflow tests
```

The browser tests use `/usr/bin/chromium` by default; set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to an installed Chromium path, or `npx playwright install chromium` and remove the explicit executable setting if using Playwright-managed browsers. Tests run against a fresh temporary data directory, separate from normal application data.

## Media and release boundary

This is a working local first release, not a deployed public service. The gallery uses attributed **demo pet GIFs**, not photos of the owner's pet. See [media attribution](public/gifs/ATTRIBUTION.md) and included upstream license. Replace demo footage with your own authorized GIFs before public release. DM Sans is self-hosted under the [SIL Open Font License](public/fonts/OFL.txt).

Before public deployment, configure HTTPS and persistent storage/backups. Email verification/password recovery, sophisticated abuse controls, account deletion/export, a standalone forum, and native-speaker translation review remain future work. No credentials, email service, hosting, or deployment have been invented or configured.

## GitHub Pages: publish `work`, preserve `main`

`.github/workflows/pages.yml` builds and deploys **only `work`**. It has no `main` trigger; manual runs also check that the selected ref is `work`. The workflow uses Node 24, runs the API/static-gallery/translation tests, builds a Pages artifact, and deploys with the minimum Pages permissions. Official actions are pinned to verified commit SHAs.

In GitHub repository **Settings → Pages → Build and deployment**, choose **GitHub Actions** as the source. In **Settings → Environments → github-pages**, allow deployment from **work** if an existing branch restriction prevents it. Push a commit to `work` to trigger deployment. The project address is `https://yunafunnews.github.io/Cc-Hp/` once GitHub confirms deployment.

`cc&hp` is the website name. A custom DNS hostname cannot contain `&` and needs a suffix such as `.com`; no custom domain or CNAME is invented. Provide the complete domain you own before configuring DNS.

```sh
npm run build:pages      # read-only gallery, base /Cc-Hp/
npm run test:pages       # browser checks served below the real project subpath
```

GitHub Pages hosts the **public gallery**: browsing, categories, search, GIF downloads, curated collections, sharing and language settings. It cannot run Express/SQLite. Account registration, uploads, comments, invitation rewards and growth tasks continue to work in the full Node application; on Pages their entry points explain that the community is not open yet and do not simulate accounts or saved points. A backend hosting decision is needed to make those services available publicly.

The Pages build is explicit (`VITE_STATIC_MODE=true`, `VITE_BASE_PATH=/Cc-Hp/`). `npm run build` still creates the full application frontend for `npm start`. Absolute API paths are never requested by the Pages adapter; demo media, fonts and download/share URLs remain under the project base. All bundled demo files are encoded as real GIF bytes, including upstream assets originally served with misleading extensions.

## Language coverage

Settings offer **35 languages**: English, simplified/traditional Chinese, Japanese, Korean, German, French, Spanish, Portuguese, Italian, Dutch, Polish, Russian, Ukrainian, Turkish, Greek, Swedish, Danish, Norwegian, Finnish, Arabic, Hebrew, Hindi, Bengali, Urdu, Persian, Indonesian, Malay, Thai, Vietnamese, Filipino, Swahili, Romanian, Hungarian and Czech.

Every offered locale covers the required gallery, navigation, account and growth vocabulary. Japanese, Korean, German, French and Spanish additionally translate longer explanatory text. Untranslated secondary copy falls back to English and settings disclose that fallback. Arabic, Hebrew, Persian and Urdu switch the document to right-to-left layout. Locale preference is preserved across reloads; legacy language preferences are migrated. User posts and GIF titles stay in their original language. These translations have not received independent native-speaker editorial review.
