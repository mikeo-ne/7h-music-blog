# Private editorial inbox — first version

Open **`/editorial`** for the separate review queue. RSS leads never auto-publish.
The new official-catalogue automation is documented in [automatic-publishing.md](automatic-publishing.md).

## Available now

- A server-protected shared inbox for Uganda/Kenya music leads.
- On-demand RSS collection from MBU’s Music feed and KBC’s Music feed. A collection
  attempt is limited to once per ten minutes, with per-source success/failure
  reporting. No paid news API key is required.
- Regional relevance filtering using place terms and the blog’s artist roster.
  Scene labels inherit the publisher’s country and are editorial hints, not
  nationality or geographical verification. Type labels are keyword suggestions.
- Manual references for official artist announcements, streaming releases,
  organiser posters, ticket pages and other reporting links. Manual URLs are
  stored as references, **never fetched** by the server.
- Canonical URL deduplication (tracking links collapse into one lead), plus
  conservative headline-overlap warnings. Existing reviews survive re-collection.
- Short publisher excerpts only (280 characters), source/publication/collection
  dates, missing-date and future-date warnings, and older-source reminders.
- Pending, follow-up, approved-for-drafting and rejected states with private notes.
  Approval requires source/identity, date and key-detail checks.
- Approved leads can be exported as a private JSON drafting queue. Exported files
  contain private notes; keep them out of public folders and Git.
- No public article creation, automatic publication or modification of `data.js`.
  “Approved” is an internal editorial decision only. Original reporting and a
  separate publication step are still needed.

This is **not** an unattended news service, social-media scraper, event database,
Spotify release monitor, or automated fact checker. Feed collection is currently
button-triggered, not scheduled. Public feeds usually expose only recent items;
this does not backfill a full history. Some events/releases will require manual
links until suitable official integrations are configured. Sources, permissions
and editorial coverage should be reviewed before expanding collection.

## Production setup (server settings, not chat)

1. Configure **`EDITORIAL_ADMIN_TOKEN`**, a random secret of at least 32 characters
   (prefer a password manager-generated 64-character token). Store it only in the
   server environment and the editor’s password manager. Enter that token into
   the password field on `/editorial`. Do not use a provider API key as this token.
2. Connect Redis storage using the existing blog conventions:
   `KV_REST_API_URL` + `KV_REST_API_TOKEN`, or
   `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`. The prefixed equivalents
   recognised by the comments API are also supported. An existing Redis instance
   can be reused: inbox keys are isolated under **`editorial:v1:*`**.
3. Redeploy after changing environment variables. Verify unauthenticated requests
   to `/api/editorial` return 401 once configured. Without configuration, the API
   fails closed with 503—there is no public or browser-local fallback for real leads.

The HTML/JS login shell is public; private data and notes are returned only after
server authorization. Do not embed the admin token in HTML, JavaScript, URLs, Git,
logs or a public environment variable. The browser keeps the entered token in
memory only, clears the input, and discards access/data on Lock or page reload.
API responses are private/no-store and excluded from indexing. The shell has
noindex and no-referrer metadata; no public navigation link is added.

The previously exposed financial-provider key is not used or stored. Rotate it
in its provider dashboard. No Supabase project or Vercel setting was changed by
this implementation: the connected projects were not clearly identified as this
blog’s storage. Supabase is not a dependency of this version.

## Local development and sample mode

```
npm ci
npm run dev
```

Visit `/editorial` and choose **Explore a sample inbox** to review the UI without
credentials. All sample leads are explicitly fictional, stored in memory only,
and vanish when locked/refreshed. Collection is disabled in sample mode.

For a real local inbox, set your own `EDITORIAL_ADMIN_TOKEN` in the server process
environment before starting it. The existing development server supplies a mock
Redis endpoint and persists inbox hashes to ignored `.dev-data/kv.json`; never
commit that file, which can contain private notes. Restart the server after
changing environment variables. No real credentials are bundled with sample mode.

The sandbox’s outbound network policy can block publisher domains, even when
those public feeds exist. In that case the UI reports per-source errors and
retains saved leads. A deployment with outbound access must be used to validate
live collection. Feeds were inspected through the research tool, while collector
and failure paths were tested with fixtures—not represented as successful live
imports from this sandbox.

## Implementation and checks

- `lib/editorial.js`: fixed RSS allowlist, bounded XML fetching/parsing, title and
  excerpt sanitisation, regional filtering, stable URL identities and similarity.
- `api/editorial.js`: timing-safe access-token comparison, fail-closed storage,
  independent candidate/review records, atomic insert-if-absent and cooldown.
- `editorial.html`, `.css`, `.js`: responsive independent desk; no CDN dependency.
- `npm test`: parser/security/storage/review tests and existing content checks.
- `npm run test:ui`: public-blog regressions plus inbox DOM flow tests.
- `npm audit --omit=dev`: production dependency audit.

DOM tests do not assert real-browser visual layout or external media playback.
RSS fetches accept only fixed HTTPS publishers, disallow redirects/DOCTYPE/entity
declarations, use an 8-second timeout and cap response bodies at 1.5 MB. Upstream
feed failures do not delete previous entries. Separate Redis hashes preserve
original source provenance independently of review notes. Like most shared-token
admin tools, editors share one role; individual accounts/audit trails, scheduled
jobs, retention management and a dedicated auth provider are future extensions.
