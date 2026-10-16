# 7H Music Blog

Editorial site for **7H Music Group** (Kampala, Uganda) — news, reviews, interviews and *Fresh Finds* from the wider Ugandan scene.

Static HTML + vanilla JS, deployed on **Vercel**, with two tiny serverless functions (no npm dependencies):
real **comments** and per-article **link previews** for WhatsApp / X / Facebook.

## Structure

```
index.html          page layout + styles (Tailwind CDN)
data.js             ALL content: roster, Fresh Finds, releases, articles  ← edit this
app.js              behaviour: article reader, comments, sharing, ▶ previews
api/comments.js     comments API (Upstash Redis over HTTPS)
api/share.js        /a/<slug> share pages with the article's own preview card
images/artists/     artist photos used on cards
images/articles/    article header images (collages, press shots)
images/brand/       7H avatar / favicon
vercel.json         clean URLs, /a/:slug rewrite, cache headers
scripts/dev-server.mjs  local server that mimics Vercel (not deployed)
```

## Editing content (`data.js`)

- **Articles** need a unique `slug` (used in `#article/<slug>`, share links `/a/<slug>` and as the comments key —
  don't rename a slug once it's live or its comments won't be found).
- `img` — a file in `images/` or a full `https://` URL. `imgPos` (optional) is a CSS `object-position`
  such as `'center 25%'` to keep faces in frame.
- `listen: { type: 'album' | 'track' | 'artist', id, title }` adds a Spotify player inside the article;
  `apple` adds an Apple Music button.
- `imgCaption` (optional) prints a "Pictured: …" credit on the article hero — use it for press photos.
- `category` must be one of `categories` (All · News · Press Release · Album Review · Interview · Industry Insights);
  the filter pills are generated from that list.
- Article bodies are plain HTML. Besides `<p>`, `<h3 ' + H3 + '>`, links and `<em>`, these styled blocks are available:
  `<figure><img src="images/…"><figcaption>…</figcaption></figure>` (inline photo),
  `<blockquote>"…"<cite>Name</cite></blockquote>` (pull quote),
  `<div class="factbox"><p class="factbox-title">…</p><ul><li><span class="k">When</span><span class="v">…</span></li></ul></div>`
  (event facts) and `<ul class="winners">` with the same `k`/`v` rows (award lists). Wrap each value in
  `<span class="v">` so links or italics stay in the value column.
- **Releases**: `spotify` can be an album, track or artist URL — the ▶ preview button uses it. A Spotify
  `prerelease/…` (pre-save) link shows the Spotify button without a preview. **Recess II** (Joshua Baraka) is a
  pre-save until **Nov 12, 2026** — then swap its `spotify` link for the album URL and drop "Pre-save" from `type`.
- Links must be real URLs. Optional ones (e.g. an artist with no Spotify) can simply be left out — the button disappears.
- **Ali Bomaye** (Spotify artist `4H285cJrK0S0I7vtraU1Z3`, Apple Music artist `488394174`) now has a verified
  Spotify profile — his card photo is the official Spotify artist image, his card, EP release card and article
  all carry the artist link (and the in-article ▶ player). The release card and article hero still use the
  "Ali Bomaye the Ep" cover from Apple's CDN; drop a portrait in `images/artists/ali-bomaye.jpg` and set `img`
  if a separate press photo turns up. His article slug stays `ali-boomaye-new-single` (live comments key).
- **Remz** (Spotify `2UJWgPQKyu8nm5eHE2WAL8`, Apple Music `1873055478`) joined Fresh Finds in Oct 2026 with
  the article `remz-down-new-wave-spotlight`; all of her artwork is hot-linked from Apple/Spotify CDNs.
- **Fresh Finds round 2** (Oct 2026) added four artists, each with a Fresh Find card, release cards and a
  spotlight article. All card photos are official Spotify artist images (hot-linked, 640px):
  **Tai Dai** (`77G1P2NHQOnx0leyvpN3ym` · Apple `1426402603` · `tai-dai-whet-new-wave-spotlight`),
  **Amanda Moon** (`5lqRfQ6FpBufPWHpXy8HeO` · Apple `1746973428` · `amanda-moon-afro-pop-singles`),
  **AYMA** (`45p8xCFhR0gkXgzyWW0Wos` · Apple `1818880233` · `ayma-gone-ass-titude`) and
  **Nana Nyadia** (`2SzY2nJnBs8mzh2jgqOmdL` · Apple `1766006884` · `nana-nyadia-afro-fusion-spotlight`).
  The four `listen` ids used in those articles are the same Spotify artist ids.

## Comments — one-time setup (≈2 minutes)

Comments are stored in Redis so every visitor sees them. Until storage is connected, the site still works:
comments are saved in the visitor's own browser and labelled **"On this device"**.

1. Vercel dashboard → this project → **Storage** → **Create Database** → **Upstash for Redis** (free plan) →
   connect it to the project (all environments).
2. **Redeploy** (Deployments → ⋯ → Redeploy). That's it.

The API accepts `KV_REST_API_URL`/`KV_REST_API_TOKEN`, `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`, or the
same names with a custom prefix (e.g. `STORAGE_KV_REST_API_URL`).

Built-in protection: name/length validation, a hidden honeypot field for bots, max 2 links per comment,
one comment per device every 15 s, and at most 30 comments per IP address per 10 minutes.

### Moderation

- **Easiest:** Upstash console → your database → **Data Browser** → key `comments:<article-slug>` → delete the entry.
- **Or via API:** add an env var `COMMENTS_ADMIN_TOKEN` (any long random string), redeploy, then

  ```bash
  curl -X DELETE "https://<your-domain>/api/comments?article=<slug>&id=<comment-id>" -H "x-admin-token: <token>"
  ```

  (Comment ids are in `GET /api/comments?article=<slug>`.)

## Sharing & link previews

The share buttons (WhatsApp, X, Facebook, copy link, and the phone's native share sheet) use `https://<domain>/a/<slug>`.
That page carries the article's own title, excerpt and photo for social previews, then opens the article
on the blog (`/#article/<slug>`). Old `#article-<id>` links still work.

## Article reader

Articles open in a reader that can always be closed: the **✕** and **← Back to articles** buttons stay pinned at
the top while scrolling, plus **Esc**, clicking outside, the phone/browser **Back** button, and a button at the end.

## Run locally

```bash
node scripts/dev-server.mjs          # http://localhost:3000
```

Serves the site exactly like Vercel (clean URLs, rewrites, `/api` functions) and runs a local stand-in for
Redis so comments work end-to-end (stored in `.dev-data/`, git-ignored). `USE_MOCK_KV=0` tests the
no-storage fallback.

Spotify embeds and external links work on the real site; some sandboxed preview frames block iframes and pop-ups.

## Image credits

Artist photos are official artist/press images: Spotify artist profile photos and cover art (Spotify CDN),
Apple Music "Up Next" artwork (Kyle Simbwa), the "Treasure" press photo (Mike Mungu & Darkua — cropped),
and 7H's own roster photos. Press photos (credited on each article): Joshua Baraka on the Brakaland Tour —
Sqoop (Mbarara) and Nile Post (Mbale); Echoled — Nile Post; UG Hip Hop Awards '25 launch — Nile Post.
Remz's portrait is her Spotify artist photo; Ali Bomaye's Fresh Find card uses his Spotify artist photo while
his release card and article hero use the official *Ali Bomaye the Ep* cover (Apple Music).
`images/articles/ali-bomaye-card.jpg` is a 7H-designed card (regenerated when the artist's
name was corrected to **Ali Bomaye**). Fresh Finds round 2 (Tai Dai, Amanda Moon, AYMA, Nana Nyadia) uses
official Spotify artist photos, hot-linked, on both the Fresh Find cards and the article heroes (credited in
each `imgCaption`). No local image files were added for these artists.
