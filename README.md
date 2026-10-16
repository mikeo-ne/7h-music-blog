# 7H Music Blog

Editorial site for **7H Music Group** (Kampala, Uganda) — news, reviews, interviews and *Fresh Finds* from the wider Ugandan scene.

Static HTML + vanilla JS, deployed on **Vercel**, with two tiny serverless functions (no npm dependencies):
real **comments** and per-article **link previews** for WhatsApp / X / Facebook.

## Structure

```
index.html          page layout + styles (Tailwind CDN)
data.js             ALL content: roster, Fresh Finds, releases, events, articles  ← edit this
app.js              behaviour: article reader, comments, sharing, ▶ previews
api/comments.js     comments API (Upstash Redis over HTTPS)
api/share.js        /a/<slug> share pages with the article's own preview card
images/artists/     artist photos used on cards and article previews
images/covers/      official release artwork supplied by the labels (e.g. jennifer.jpg)
images/articles/    article header images (collages, press shots, generated headers)
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
- **Cover rule**: an article about a single/album/EP sets `img` to that release's official artwork (and credits
  it in `imgCaption`); an article about an artist sets `img` to the artist's picture. Release rows always keep
  the original artwork, and songs discussed inside an article can also appear as `<figure>` blocks.
- **Proofing**: run `codespell` over the repo and re-read new prose before publishing. Song/album titles keep
  their official styling (`"Jus Sayin'"`, `LOVE ISNT ENOUGH`, `WHET`, `ASS TITUDE`, `Barna`, `Afro Netion`), so
  spellcheck flags on those are false positives. Pronouns: AYMA, Joka, Quency, Echoled, Senté, Tungi, Mike
  Mungu, Soundlykbb and the 7H roster are he/him; Amanya, Remz, Nana Nyadia and Amanda Moon are she/her.
  The site writes British English (organiser, behaviour, favourite).
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
- **Joka** (Spotify `7umpHJB8guUwgjaP2ZryKw`, Apple Music `1620053754`) joined Fresh Finds in Oct 2026 with the
  article `joka-sky-blue-to-no-condition`. His Spotify page was confirmed through his credits on "I Miss You"
  (Amanda Moon) and "I Give You My Life" (GEOXwill) — **two other acts share the name on Spotify** (a Polish
  rapper and a Dutch hardstyle project), so keep the ID, not a name search, as the reference. His own 2022-24
  albums remain Apple/Deezer-first, so his four release rows carry the Spotify *artist* link (the ▶ button
  plays his top tracks) alongside the Apple album link.
- **Quency** (Spotify `4cd1RhZnbFFkmPgY4rmj7R`, Apple Music `1587395509`) — the Fresh Find from Oct 2026 whose
  card, article and release rows opened *search* links until the artist supplied his profiles. Both are now
  wired in: `quency-jus-sayin-freestyle-spotlight` embeds "Jus Sayin' (Freestyle)" (Spotify album
  `2fNmYzBomojUZJYuwrPHfC`, the **May 20, 2026** edition with Pryce Teeba, 2:54; Apple Music
  `/us/album/jus-sayin-freestyle-feat-pryce-teeba-single/6768497351`), and his three release rows cover
  "Pg" (Sept 2026), the Pryce Teeba version and the solo version of the freestyle (Feb 27, 2026). His card
  photo is his official Spotify artist image, hot-linked, so no local file is added. Two notes for later
  edits: Apple also carries a **duplicate Quency profile** (`6773025034`, ℗ Uncle Q Records 2026) that holds
  "Pg"/"THR33 4 THR33" — the artist buttons stay on `1587395509`, which has the full catalogue and the bio;
  and `images/articles/quency-kampala-rap.jpg` is no longer used — his card and article hero now show a press
  shot from his Instagram (@quency_4sho), saved to `images/artists/quency.jpg`.
- **Mr Fallback's "Jennifer"** (Oct 16, 2026) is live on both platforms — Spotify album
  `4Vb1RrTyRhPfnJfiwNX9Rh`, Apple Music "Jennifer - Single" `6822713688`. The official 2Puff Records cover art
  (supplied by the label) is saved locally at `images/covers/jennifer.jpg` and used on the release card, as an
  in-article figure and in share previews; the article hero carries the cover art itself (song-article rule).
- **Joka's "READY"** (Oct 2, 2026 — Villaggio Media / Zonke Africa / Ria Entertainment; Apple album
  `6813492187`) has its own momentum article, `joka-ready-new-era`, plus a release row carrying the official
  Apple artwork and an updated "Latest" row in his spotlight factbox. As with his other rows, the Spotify
  button uses his artist page (`7umpHJB8guUwgjaP2ZryKw`) until the single's own Spotify URL is confirmed.
- **Fresh Finds round 3 (Oct 2026): ECEE & YUKO** — the "Focus" collaboration pair, each with a spotlight
  article, a Fresh Find card (Spotify artist photos) and release rows with official artwork on both platforms.
  ECEE: Spotify `4Fjy32nOkX6jFJlDjSjabL` / Apple `496045825` (Ecee UG). YUKO: Spotify `20AESzvXafH4xLWjicmKLV` /
  Apple `1772291652` (YUKOLAND; "Kingdom" on PALAGROOVE / RAIN. LABS) — note a second, unrelated Apple "yuko"
  profile (`1705448763`) exists with only an EMI feature; keep every button on `1772291652`.
- **AUMEX** (Amplify Ugandan Music Expo) gets an Industry Insights piece, `aumex-artist-accelerator-conference`:
  the 12-week Artist Accelerator Programme, the ARMC Johannesburg delegation (Mbeewo, Vini Mercy, Amanya,
  Matt Travers, Nana Nyadia — Uganda focus country, May 22-23, 2026) and the AUMEX Conference in Kampala on
  November 14, 2026, which is also in the events list and the live-season calendar. Its header is a generated
  illustration, `images/articles/aumex-conference-2026.jpg`. Nana Nyadia's spotlight says "the programme's
  second cohort" (the founder's wording) instead of "first". The piece now also covers the **2025 second
  edition** (November 7, 2025, MOTIV Kampala): the conference day under "Building a Scalable Future for
  Ugandan Music", the AUMEX Showcase — Son of Aboda, Vini Mercy, Tungi, Echoled, Expect Xhavi, DJ City Girl —
  and the headline set by **Nasty C** as part of his **Ivyson Tour** for the album *FREE* ("Strings and Bling",
  "Soft", "SMA"; on stage at 11pm), the tour's only East African stop, unlocked by fan ticket pledges. Its
  `listen` embed is therefore **Nasty C** (Spotify artist `2gzWmhOZhDN6gXL49JW9qj` / Apple Music artist
  `1041347781`) rather than Nana Nyadia.
- **Nasty C at AUMEX** has its own *News* piece, `aumex-nasty-c-showcase-2025` (id 43): the showcase bill, the
  panel names (Blessing Manafa/OneRPM, Motolani Alake/Virgin, Geoffrey Ekongot/UMA, David Tayebwa/Josplay;
  Jenny Tan/TOORLY, Ali Alibhai/Talent Africa Group, Ayanda Ngcobo — Nasty C's manager), the *FREE* chart
  facts (released Sept 30, 2025; #1 in Uganda; 44 countries; first SA artist with ten #1 territories; tour =
  11 countries, 18 stops) and a factbox. Header is a generated illustration,
  `images/articles/aumex-showcase-2025.jpg`; credits name Nile Post, Pulse Uganda, Sqoop, MBU, PML Daily,
  Voice of Uganda, Sanyu FM, MyJoyOnline. No events-calendar row — that calendar only lists upcoming dates.
- **Label correction (Oct 2026)**: Never write Nana Nyadia as a Party Wright Records artist — per the label
  side she has **left Party Wright Records and releases independently**. Her spotlight excerpt, the "label
  years" paragraph in `nana-nyadia-afro-fusion-spotlight` and the AUMEX party-circle sentence were corrected;
  the **Party Wright Records / Himaya Music** credit belongs to **AYMA** (`ayma-gone-ass-titude`, whose
  "Kampala-to-Juba axis" line now reads "also carried Nana Nyadia before she left Party Wright to go
  independent" and spells *licence* in British English), while **Amanya** is an **independent** artist
  (PALAGROOVE / RAIN. LABS; Mozaka, DJ Spinny) and is listed with the independent cohort around Mbeewo and
  Matt Travers. Her earlier singles (STAND FOR → Not Promised) keep their Party Wright ℗ credits — the split
  is not dated in the copy.
- **Strictly Nyigos (Oct 2026)**: two *Events* articles at the head of `articles` — the explainer
  `strictly-nyigos-in-the-jungle` (DJ Alza's "The Most Killa Experience" concept; the jungle edition ran a full
  24 hours, Oct 9 12:00 → Oct 10 12:00, at Nyungu Yamawe Forest Park, Kitukutwe; presented by **Club Canvas**
  with **Club Pilsner** backing the organising; flyer badges NO CAMERAS / NO MEDIA, 18+, early bird USh50,000
  and gate USh100,000; flyer bill headlined King Micheal, Soundlykbb ("Sound Lyk BB") and Beenie Gunter over
  Echoled, Eckostar, Ziggy Dee, Ali Bomaye and more — the flyer is archived, pause-icon cleaned, as
  `images/articles/strictly-nyigos-flyer.jpg`; residency home is **Silo 15**, Bandali Rise, Bugolobi; *nyigos*
  is Kampala slang for coupling up on the dancefloor, as in Koshen's "Couple Up") and the first-person diary
  `strictly-nyigos-first-timer-diary`, bylined **Mike 1ne**
  (label admin; avatar `artist-mike-1ne.jpg`; embeds Soundlykbb's top tracks with the matching Apple Music
  artist link, plus a Soundlykbb figure in the body). Both headers are generated illustrations:
  `images/articles/strictly-nyigos-jungle.jpg` and `images/articles/strictly-nyigos-dawn.jpg`. The party is
  past, so no row was added to the `events` calendar (rows there are for upcoming listings only).
- **Platform pairing is enforced**: every roster artist, Fresh Find, release and article must carry **both** a
  Spotify and an Apple Music link. There is **no single-platform fallback** — cards always render the pair
  (icons top-right, labelled *Spotify* + *Apple Music* buttons in the footer), built by `spotifyBtn()` /
  `appleBtn()` in `app.js`. `listen: { type, id, title }` plus `apple` is the pattern for articles — news and
  industry pieces pair a scene-relevant artist (the Nyege Nyege preview embeds King Saha, the Blankets & Wine
  piece embeds Fave, the streaming-trends piece embeds Kabza De Small). The validator fails if any link is
  missing.
- **Redirects always land**: every external link is tagged `data-out` and handled by one delegated click
  listener. A normal click opens the chosen platform in a new tab; if the environment blocks pop-ups (common
  inside sandboxed preview frames, where a bare `target="_blank"` silently does nothing) the handler falls back
  to navigating the top window. Modified clicks (ctrl/cmd/shift/middle) are never hijacked, and the real `href`
  stays on the anchor for right-click, keyboard and crawlers.
- **Events** (`data.js` → `events`) drive the `#events` section (*Events & Live Calendar*), rendered by
  `renderEvents()` in `app.js` and sorted earliest-first. Each row: `name`, `date` (`'Nov 19-22, 2026'`),
  `venue`, `city`, `note`, `link` (must be https). Listings are editor-curated from organiser/press listings —
  keep them factual, and never write a first-person "we were there" report.
- **News/events/trends coverage** (Oct 2026): seven articles sit at the head of `articles` —
  Nyege Nyege 2026 preview (`nyege-nyege-2026-wakaliwood-edition-preview`), Joshua Baraka × Tiwa Savage
  "Commando" (`joshua-baraka-tiwa-savage-commando`), the Kampala live-season calendar
  (`kampala-live-season-chameleone-levixone-mesach`), Blankets & Wine 2026 (`blankets-and-wine-2026-season`),
  East African streaming trends (`east-africa-streaming-2026-gen-z-amapiano`), the Uganda industry numbers
  (`uganda-music-economy-atlas-report-2026`) and African music on the global stage
  (`african-music-global-october-2026`). They introduced the new **Events** filter category, which must stay
  in `categories`.
- Cross-links between articles use `href="#article/<slug>"`; the validator checks every one resolves.

## Publishing workflow (how edits go live)

**Vercel deploys automatically on every push — there is no need to click "Redeploy".** The catch is which
branch you push to:

| Branch | Vercel environment | Effect on the live site |
| --- | --- | --- |
| `main` | **Production** | The live site (`https://7h-music-blog.vercel.app`) updates ~30s after the push |
| any other branch, incl. `arena/…` | **Preview** | Builds a throwaway `…-mike-1-ne.vercel.app` URL; the live site does **not** change |

So a commit that only lands on a side branch produces a green preview deployment and a live site that looks
unchanged — which is exactly the "why isn't Vercel updating?" symptom. **Anything meant to be public has to
reach `main`.**

The day-to-day flow for this repo:

1. Content changes are made in `data.js` (articles, Fresh Finds, releases, events) — everything else
   (`index.html`, `app.js`) only changes when the layout itself changes.
2. Changes are committed and pushed to the working branch.
3. That branch is merged into `main` (via pull request).
4. Vercel sees the new commit on `main` and builds a **Production** deployment automatically.

`data.js` is served with `must-revalidate`, so readers see new content as soon as the deploy finishes — no
cache purging needed. If a browser still shows an old article list, a hard refresh (Ctrl/Cmd + Shift + R)
clears the local copy.

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
Remz's portrait is her Spotify artist photo; Ali Bomaye's Fresh Find card and article hero use his Spotify
artist photo while his release card keeps the official *Ali Bomaye the Ep* cover (Apple Music).
`images/articles/ali-bomaye-card.jpg` is a 7H-designed card (regenerated when the artist's
name was corrected to **Ali Bomaye**). Fresh Finds round 2 (Tai Dai, Amanda Moon, AYMA, Nana Nyadia) uses
official Spotify artist photos, hot-linked, on both the Fresh Find cards and the article heroes (credited in
each `imgCaption`). No local image files were added for these artists.
Since the Oct 2026 artwork pass the cover rule is: **if an article speaks about a song, album or EP, its hero
and share preview carry that release's official artwork; if it speaks about an artist (spotlight, Fresh Find,
signing, profile), they carry the artist's own picture** (roster photo, Spotify artist photo, press photo or
the artist's own Instagram shot). Release rows always keep their original cover artwork. So the *Jennifer*,
*Kiwatto*, *Chapters I Never Wrote* (press release + review), *Badman*, *Siteesa*, *Ali Bomaye the Ep*,
*Recess II*, *Commando*, *ASS TITUDE*, *READY* and *Kush After Hour* articles wear cover art, while Joka's and
Quency's cards and spotlights use the Instagram shots saved to `images/artists/joka.jpg` and
`images/artists/quency.jpg`. Only the news/events/trends pieces with no single featured artist keep
original 7H-generated header illustrations in `images/articles/` (no press photos, no logos, no identifiable
faces) — `nyege-nyege-2026-nile.jpg`, `blankets-and-wine-2026.jpg`, `kampala-live-season.jpg`,
`uganda-music-economy.jpg`, `east-africa-streaming-wave.jpg`, `african-music-global-2026.jpg` and
`aumex-showcase-2025.jpg` (the Nasty C/AUMEX showcase piece) — each
credited as an illustration in its article's `imgCaption`. Event listings carry a source link instead of a photo.
