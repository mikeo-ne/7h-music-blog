# Official release desk

## Scope and schedule

The `Official music release desk` GitHub Actions workflow checks at 06:00 and
18:00 UTC (09:00 and 21:00 Kampala). Scheduled jobs may be delayed by GitHub.
It only runs from `main`, including manual dispatches. This requires the workflow
to be merged and Actions enabled; a branch preview alone is not live automation.

The first source is Apple's official catalogue lookup, using the artist IDs
already linked in `data.js` (29 roster entries initially). Exact normalized artist
name and ID must match. Artist aliases and mismatches are held, not guessed.
These are clearly labelled catalogue notices, not artist statements or reviews.
News, awards, events, rumours and third-party RSS never auto-publish.

The first successful check establishes a baseline of existing releases without
republishing an artist's back catalogue. New or previously future-dated entries
become eligible when released. The source's current date must be within 14 days;
older pending entries are held. Two new notices maximum per Kampala calendar day,
enforced transactionally in Postgres even if jobs overlap or are retried.

Each published notice also adds a dated source box to the roster's linked feature.
Original historical paragraphs remain unchanged. This is additive release updating,
not automatic fact-checking or rewriting of old claims. Latest six update boxes per
feature are shown. Public feed currently returns latest 100 published notices.

## Isolated storage and authentication

Project **1NE**, ref `vewkhidaajdrfkedeavs`, has three new tables:
`blog_auto_watch`, `blog_auto_items`, `blog_auto_runs`. RLS enabled, no anonymous
or authenticated table access. Existing application tables were not altered.
Two `blog_auto_*` RPCs are restricted to the service role.

The `blog-autopublish` edge function has a public **published-only GET**. POST
verifies GitHub's short-lived signed OIDC identity: repository ID, main branch,
exact workflow path, issuer, audience and scheduled/manual event. No Supabase
secret or GitHub token is stored in this repository or copied into Vercel.
Disabling Supabase gateway JWT verification is intentional: POST authentication
is performed by the function; GET serves only allowlisted published columns.

The browser calls `/api/updates`; Vercel reads the public edge feed. Share metadata
and comments recognize published dynamic articles. Provider outages leave static
articles usable. There is no generated biography, private name extraction, lyrics,
review, or copied full third-party article.

## Operations and limitations

Inspect workflow logs for per-artist failures; inspect `blog_auto_runs` and
`blog_auto_watch.last_error` privately in Supabase. Identity failures currently
appear there, **not in the separate RSS editorial inbox**. To retract, set an item
to `held` using an authorized Supabase dashboard session. Public responses may be
cached for a minute. Disable the workflow to pause collection; mark an item held
to remove its public notice/update. The legacy RSS inbox has its own optional
Redis/admin-token configuration and is not needed by this automatic release desk.

Function source: `supabase/functions/blog-autopublish/index.ts`.
Before calling this operational, merge the workflow, dispatch it once, verify the
baseline results, and verify the production `/api/updates` endpoint. First-run
baselining intentionally publishes no historical catalogue entries.
