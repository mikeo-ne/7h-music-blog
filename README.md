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
- **Releases**: `spotify` can be an album, track or artist URL — the ▶ preview button uses it.
- Links must be real URLs. Optional ones (e.g. an artist with no Spotify) can simply be left out — the button disappears.
- **Ali Boomaye** has no verified press photo or Spotify profile yet; his card shows an "AB" tile.
  Add `images/artists/ali-boomaye.jpg` and set his `img` to use it.

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
and 7H's own roster photos.
