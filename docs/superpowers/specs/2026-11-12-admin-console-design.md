# cc&hp Admin

Continue the existing custom React + Express + SQLite stack. User previously delegated implementation choices and now requests continued development and a backend management recommendation. A new CMS would duplicate the existing account, points and approval rules. Reuse server-checked administrator roles and the existing CLI promotion mechanism. No new default credentials.

This increment adds an Admin console available to authenticated administrators in the full Node application. Tabs: overview (real counts and reward distribution); GIF management (server-side search/status filter/pagination, existing approve/reject/report workflow, editing title/category/tags); member lookup/details (email, level, points, invitations and recent ledger); read-only points ledger (search, pagination). No account deletion, point balance editing, privilege delegation, or destructive file deletion in this increment. Task rules and site settings remain code-configured.

All /api/admin routes require current session and server-side admin authorization. Only explicit safe user columns may be returned. Limit/page parameters are bounded; SQL values bound and LIKE wildcards escaped. Existing GET /api/admin/gifs without arguments keeps its review-queue meaning. Existing moderation and reward rules remain unchanged. Changes to GIF metadata cannot grant points. Retain legacy storage/session identifiers. Ignore stale UI results after tab/navigation change; pending files remain private.

The interface uses existing components/style and no new admin framework dependency. English plus Chinese admin labels; untranslated secondary admin copy uses existing English fallback. Responsive tables scroll internally, dialogs support keyboard use. Existing #moderation links remain compatible; new entry is #admin.

GitHub Pages remains the read-only public gallery. Do not pretend the admin or account backend is deployed there. Backend hosting is a pending user preference; local development and tests proceed independently.
