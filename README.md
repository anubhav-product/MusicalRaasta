# Two roads, one playlist

A multi-route animated storytelling site for two playlists. Each road is a sequence of real
pages with their own URLs — deep-linkable, refresh-safe, and navigable with browser
back/forward. It is not a single-page scroller.

## Routes

| Route | |
|---|---|
| `/` | The fork — choose a road |
| `/within-you` | Road intro / table of contents (6 stops) |
| `/within-you/:chapterSlug` | One stop, e.g. `/within-you/nostalgic-classics` |
| `/within-you/end` | Closing page + Buy Me a Coffee |
| `/for-fun` | Road intro / table of contents (6 stops) |
| `/for-fun/:chapterSlug` | One stop, e.g. `/for-fun/bass-drops-electronic` |
| `/for-fun/end` | Closing page + Buy Me a Coffee |

An unknown chapter slug redirects to that road's table of contents.

## The landing page

The landing page is the prologue of the journey, not a menu in front of it — five
movements you scroll through in order, in `src/pages/Landing.jsx`:

1. **The threshold.** A moodboard of every chapter's photography drifting behind the
   title, in seven columns at different speeds and directions. Each column's list is
   rendered twice and translated exactly `-50%`, which is what makes the loop seamless
   (`.drift-col`). The collage is graded warm on the left and hot on the right, so the
   fork is implied before it is drawn, and darkened in a pool under the type rather than
   sunk as a whole — the photographs stay alive around the edges. The drift is deliberately
   near-still (~200s a cycle, as is the stop marquee at ~150s): ambient motion should be
   something you notice only if you look for it, and at the original speeds both pulled
   the eye straight off the type.
2. **The fork.** A listener in over-ear headphones, seen from behind, standing where the
   road divides. He is drawn three times — once in Within You's amber shifted left, once
   in For Fun's magenta shifted right, then in near-black on top — so each road's light
   catches one side of him. The road splits under his feet and lands each branch on the
   panel it belongs to; below `lg` the panels stack, so it carries straight on instead.
   A panel cycles through its own stops' photography and takes room from the other on
   hover.
3. **The stops.** All twelve rooms as a pinboard you can walk straight into, skipping the
   fork entirely.
4. **The name.** What the site is called and why, set as a dictionary entry: रास्ता is the
   road it is built as, अनुभव is the Hindi word for experience — and the name of the person
   whose experience picked every song. It sits here rather than at the top because it is
   the answer to the question the wall of stops raises: who chose all of that, and on what
   authority. The byline is repeated at the end of each road (`src/pages/EndPage.jsx`),
   since a deep link can drop a visitor onto a stop without their ever seeing this page.
   The name lives in one place, `SITE.author` in `src/lib/roads.js`, in both scripts — the
   Devanagari is the name and the roman spelling only the gloss, so wherever both appear
   the Devanagari is the one set larger.

   It is the one fully bilingual passage on the site: Hindi first and English under it, in
   the same order as every stop's title. Running Hindi is set in Mukta (`--font-deva-text`)
   rather than the Rozha One used for the names — Rozha is a display face and goes muddy at
   paragraph sizes, and the two were drawn as a pair, so the headword and the prose still
   look related. The two languages are told apart by face and colour; what pairs them is
   spacing, so the gap inside a passage must stay clearly smaller than the gap between two.

Everything is client-rendered, so `index.html` is the only markup a crawler is guaranteed
to see before it runs any JavaScript. The description, Open Graph, and `WebSite`/`Person`
JSON-LD therefore state the whole premise in English there rather than leaving it to the
page — which is the other reason the name section carries an English translation instead
of Hindi alone. The canonical URL in that file is the GitHub Pages project site the
workflow publishes to; it is the one line to change if the deploy target moves.
5. **The dedication.**

Everything on it is built from the real backdrops and the real song counts, so the page
is a view of the thing rather than an advertisement for it.

Two things worth knowing before editing it:

- **The road panels are true duotones.** A `mix-blend-mode: color` layer only tints what
  is already neutral — laid over a blue night sky at half strength, Within You's amber
  came out mauve. The photograph is desaturated first and the road's colour put back at
  near-full strength; hover releases both, and the road returns to its own colours.
- **Pinboard tile ratios travel as a custom property** (`--tile-ar` / `--tile-ar-wide`,
  see `.stop-tile` in `index.css`), portrait while the column is narrow so a two-line stop
  name clears the road badge. They cannot be a `min-height`: with `aspect-ratio` set, a
  binding `min-height` makes the browser derive the tile's *width* from the ratio, which
  pushes the masonry column past its own bounds.

## The road index

`/within-you` and `/for-fun` are the map of a road, not a table of contents: a route drawn
top to bottom with the stops hung off a dashed centre line in the order you would drive
them, alternating sides so the eye is pulled down the road rather than down a column. The
header is a filmstrip of that road's own six backdrops, duotoned into its signature
colour.

## The end page

Arriving should feel like arriving somewhere, so `/{road}/end` is built out of the last
stop's light and carries a receipt of the drive — every stop you passed, in order, on one
dashed line you can step back onto — plus the other road offered as a place rather than a
footnote.

## The chapter experience

A chapter is a **full-screen stage, not a document**. There is no visible song list.

- The page holds a tall empty scroll track; everything on screen is pinned over it, so
  scrolling advances the imagery rather than moving content.
- Scroll acts as the chapter's timeline: **title card → player → the way onward**. The
  Continue control only appears once you have actually travelled the stop. The three
  layers hand off in sequence and never share the centre — each leaves along `-Y` as the
  next arrives from `+Y`, with disjoint opacity bands, so they cross in time without
  crossing in space.
- A **mini player** holds the bottom edge while the title card and the outro own the
  centre, and stands down while the hero player is up, so the transport is always
  available and never duplicated.
- The song list lives in a **queue sheet that stays hidden**. A slim now-playing bar is the
  only hint; scrolling *up* raises the full queue (`useScrollIntent`), as does dragging or
  clicking the handle. Scroll down, Escape, the scrim, or a downward drag puts it away.

### Playback

Audio is a single `<audio>` element in `PlayerProvider`, mounted above the router so sound
carries across route changes. It autoplays on arrival, auto-advances on `ended`, preloads
the next track, and exposes transport to OS media keys via the Media Session API.

There are two playback backends, chosen at runtime:

**`preview` (default).** 30-second clips from the public iTunes Lookup API, which exposes a
preview stream and artwork for the same track ids already in the embed URLs
(`scripts/enrich-tracks.mjs`; 547/547 resolved). No credentials, no sign-in, works for
everyone. The UI says "30-second preview" rather than hiding it.

Clips play through **two `<audio>` elements that crossfade into each other** on an
equal-power curve, so a queue of 30-second previews reads as a continuous mix instead of
music-then-silence 35 times in a row. `ended` stays wired as a safety net for a clip that
runs out early or a dead source.

> Why not full songs here: the Apple Music REST API is a **catalogue and metadata service
> only** — its `previews` field is 30 seconds and there is no endpoint anywhere in it that
> returns full-length audio. Confirmed against a real asset: a preview file is ~1 MB for a
> 260-second track. Full-length playback is DRM-licensed and only ever happens inside a
> licensed player (MusicKit, Spotify's SDK, YouTube's player) with an entitled listener.

**`youtube` (full songs, nothing required of the listener).** The YouTube IFrame player
streams the complete track. No subscription, no sign-in, no runtime API key — video ids are
resolved offline and baked into the song data, and embedding is free and unauthenticated.
This is the recommended route. Setup below.

**`apple` (full songs).** MusicKit JS streams the complete track. Two things gate it, and
neither can be shipped in code:

1. **A developer token.** Requires a paid Apple Developer account: create a MusicKit key,
   then sign an ES256 JWT with it. Put the result in `.env` as `VITE_MUSICKIT_TOKEN` — see
   `.env.example`. Tokens expire (180 days max), so they need rotating.
2. **Each listener's own Apple Music subscription.** They tap "Play full songs with Apple
   Music" and sign in through Apple's sheet.

With a token present the upgrade button appears; without one the app never mentions it.
Any failure — no token, cancelled sign-in, a track missing from the listener's storefront —
falls straight back to previews. An authorised session is restored on the next visit.

> The Apple backend is written but **untested**, because testing it requires a paid Apple
> Developer token. It is strictly opt-in: with `VITE_MUSICKIT_TOKEN` empty, none of that
> code path runs.

## Full songs via YouTube

### 1. Get an API key (free, one-time — only for resolving, never at runtime)

1. <https://console.cloud.google.com> → create a project.
2. **APIs & Services → Library** → enable **YouTube Data API v3**.
3. **APIs & Services → Credentials → Create credentials → API key.**
4. Restrict it (**API restrictions → YouTube Data API v3**) and keep it out of git — it is
   only ever used from your machine by the resolver script.

### 2. Resolve your songs to videos

```bash
YOUTUBE_API_KEY=xxx npm run yt:resolve
```

The free quota is **100 searches/day**, and there are 547 tracks, so this is resumable:
it skips what is already resolved and picks up where it stopped. Run it daily for about a
week, or request a quota increase in the Cloud console to finish in one go.

### 3. Check it found *your* songs, not covers

Search alone returns karaoke, lyric videos, live cuts and reuploads, so matches are scored
rather than taken on trust:

- **Duration is the deciding signal.** iTunes gives the exact length of the real recording;
  a video within a couple of seconds of it is almost certainly the same master.
- **`<Artist> - Topic` channels rank highest** — those are YouTube Music's own uploads of
  the official audio, i.e. the same recording as Apple Music.
- Official/VEVO/artist channels and title agreement add to the score; `cover`, `karaoke`,
  `remix`, `live`, `slowed` and friends subtract from it, unless the track itself says so.

Every match is stored with a confidence, and anything uncertain is flagged rather than
guessed:

```bash
npm run yt:report      # -> youtube-review.html
```

Open that file and you get every non-`high` match as a playable embed next to the track it
is supposed to be. To correct one, put the ids in `src/data/youtube-overrides.json`:

```json
{ "1360772075": "correct_video_id" }
```

Overrides always win and are never re-searched. Re-run `npm run yt:resolve` to apply.

### 4. How it plays

The player shows a "Play full songs" button whenever the current chapter has resolved
videos. YouTube's terms require the video player be visible rather than used as a hidden
audio source, so it appears as a small persistent card above the mini player, and stays
mounted so a song is not cut off by scrolling. "Back to previews" returns to the clip mix.
A blocked or removed video skips to the next track instead of stalling the queue.

## The voice

Every stop is a feeling somebody arrived with, so the copy's job is recognition, not
description. The rule for anything visitor-facing: lead with a specific thing the reader
has actually *done* in that state — opening the chat and closing it again without typing
anything; saying you were not going to dance and then dancing — rather than with the
colour of the room. An atmosphere is admired from outside; a behaviour is recognised from
inside, and recognition is what makes somebody feel the stop is about them. Small and
slightly private beats grand and universal, because everyone quietly believes they are
the only one who does it.

Second person throughout, and no contractions — it is the register the whole site is
written in. Keep enough of the sensory grade to match the photography a stop is paired
with, but let it arrive second.

Chapter copy lives in **two** places that must not drift: `scripts/build-data.mjs` holds
chapter identity and is the source of truth, and `src/data/*-songs.json` is what the app
actually reads. Editing only the JSON means the next `npm run data` silently reverts it,
so change both.

## The two roads are deliberately different

They share every component; what changes is the **motion language**, not just the palette.

| | Within You (`drift`) | For Fun (`cut`) |
|---|---|---|
| Backdrop | Continuous cross-dissolve, Ken Burns zoom unwinding against scroll | Hard step cuts on scroll boundaries, zoom-punch + colour flash |
| Palette between stops | Outgoing palette floods, incoming palette wipes down through it (~1s) | One hard strike of the incoming signature colour (~0.17s) |
| Page transition | Slow blur + lateral drift, 0.75s | Fast scale snap, 0.26s |
| Scroll | Free | `scroll-snap` proximity rhythm on the document |
| Display face | Cormorant Garamond (light old-style serif) | Anton (heavy condensed caps) |
| Song titles | Serif | Semibold sans |

Both roads share one player, one queue sheet, one progress indicator and one end-page
pattern — only the palette, type and motion timing differ.

`Open Road & Cruise` is the deliberate exception: it carries `"tempo": "slow"` in the data and
so borrows the drift language as a breather inside the fast road. That override lives in
`motionFor()` in `src/lib/roads.js`.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build && npm run preview
```

## Deploying

Targets Vercel. `vercel.json` rewrites all paths to `index.html` so client-side routes
resolve on a cold load — without it, `/within-you/ghazals-soul` would 404 on refresh.

```bash
npx vercel deploy --prod
```

Set the Buy Me a Coffee URL in `SITE.coffee` in `src/lib/roads.js` before shipping — it
currently points at the bare `buymeacoffee.com` domain.

## Data

`src/data/{within-you,for-fun}-songs.json` are generated, not hand-edited:

```bash
node scripts/build-data.mjs     # CSV -> JSON for both roads
```

Chapter identity — display name, blurb, palette, tempo — lives in `scripts/build-data.mjs`,
not in the CSVs, so re-running the build never loses it. 292 songs on Within You, 255 on
For Fun.

## Images

Ten curated backdrops per chapter in `src/assets/images/{road}/{chapterSlug}/01.jpg`…`10.jpg`,
downloaded locally rather than hotlinked, all **1920x1280** — full-bleed behind a chapter,
anything smaller shows.

Most of the site is not full-bleed, though. The landing-page moodboard, the pinboard tiles
and the end page's row of stops each render a photograph a few hundred pixels wide, and
serving 380 KB into a 170 px tile put **22 MB** on the landing page. So there is a second
set of 640 px variants under `src/assets/thumbs/`, same paths and same indices, reached
through `chapterThumbs()` instead of `chapterImages()`. That took the landing page to
**1.1 MB**. Regenerate them after changing any backdrop:

```bash
npm run thumbs
```

Tooling for curation itself:

```bash
CHAPTER_SPEC='[{"slug":"…","palette":["#…"],"queries":["…"]}]' node scripts/fetch-candidates.mjs
node scripts/contact-sheet.mjs <slug> /tmp/curation/<slug>/sheet.png   # visual review grid
PICKS="4,17,2,…" node scripts/download-picks.mjs <slug> src/assets/images/<road>/<slug>
node scripts/audit-images.mjs                                          # must report 0
```

`audit-images.mjs` guards against Unsplash+ premium assets, which carry a tiled watermark
that is invisible at thumbnail size and obvious at full resolution. Attribution: `CREDITS.md`.

## Tests

```bash
npm run dev &          # must be on :5188, or set BASE
node scripts/e2e.mjs
```

Drives a real browser through both roads: deep links, reload, autoplay on arrival, the
scroll-up queue, picking from the queue, auto-advance when a track ends, the Continue
flow, browser back/forward, the unknown-slug fallback, and `prefers-reduced-motion`.

## Accessibility

`prefers-reduced-motion: reduce` pins each backdrop to its first frame with no cycling and
no scroll scrub, disables the sheet drag and every looping animation, and collapses
transitions to short fades. The queue is a labelled dialog that traps Escape and restores
body scroll; the scrubber is a real `role="slider"` with arrow-key seeking; the progress
indicator is an ordered list with `aria-current="step"` and per-stop labels.

## Data pipeline

```bash
node scripts/build-data.mjs      # CSV -> JSON (chapters, palettes, tempo)
node scripts/enrich-tracks.mjs   # + preview stream, artwork, duration, Apple Music URL
```
