# Eya & Yosri — Wedding Invitation Site 🕯️

Single-page wedding invitation. Vanilla HTML/CSS/JS — **no build step, no framework, and no runtime dependencies at all.** Two small scripts, one stylesheet, no CDN.

**Date:** 26/09/2026 · **Venue:** Espace Mimosa, Sfax (outdoor) · **Guests arrive:** 8:00 PM, dinner 9:00 PM

---

## The design — « L'heure dorée »

**One thesis: the photographs *are* the design.** The site is a mat that holds them, not a world that competes with them. So the identity is lifted out of the couple's own film photography rather than imposed on it, and **no filter is ever applied to a photograph.**

- **Palette**, sampled from their frames: porcelain `#FAF6F0` · champagne `#EFE3D5` · sand `#D8C0A6` · clay `#7A5B48` · espresso `#2E231D`, with **marigold `#C85E24`** — the bouquet, the only saturated colour in any of their photographs — as the single accent, used about once per screen.
- **Type**, three voices with three jobs: **Instrument Serif** (names, titles — high contrast, set tight and large) · **Karla** (running text) · **DM Mono** (hours, coordinates, countdown digits, labels — digits that line up want a face designed for it, with `tabular-nums`, not a display serif borrowed for the job).
- **Signature moments:** the hero where the type interlocks with the photograph · the light score behind every section · the full-bleed detail triptych · the programme card · the lantern finale, closed by Eya & Yosri in pixel art.

### The hero, and why it is shaped like that

The source photograph is **800×1200 portrait**. Stretched into a full-bleed landscape hero it needed a 2.1× upscale on a phone and 3.6× on a laptop, and `object-fit: cover` threw the sides away and cropped the couple's heads. Softness at that ratio is the most reliable "cheap website" signal there is, and it was on the first screen.

So the hero doesn't ask the picture to be something it isn't. It keeps the portrait at its native aspect and composes the names *around* it — `Eya` · plate · `Yosri` on desktop, and on a phone the photograph runs edge-to-edge with `Eya & Yosri` set across the one band of the frame that is genuinely low in detail (dress and road), under a scrim limited to that band rather than a grey veil over a high-key image.

**If you get higher-resolution originals, the markup already uses them** — drop them in and re-run the image pipeline. Nothing needs changing.

### The light score (`js/sky.js`)

The background is **five hand-drawn skies**, stacked `position: fixed`, cross-faded by scroll: 4pm porcelain → golden hour → dusk → blue hour → night. `js/sky.js` writes five weights (`--w0`…`--w4`, tent-shaped so they always sum to 1) plus `--stars` and `--rise`.

Five composited layers whose *opacity* is all that changes — the compositor handles it without repainting. And the loop is **armed by events only**: it asks for one `requestAnimationFrame`, paints, and stops. Measured **0 page-requested rAF callbacks while idle**, however long the visit.

Blue hour is sampled from the real mauve sky in `photo-2.jpg`, and the stops are placed so that *L'heure dorée* — the gallery — actually falls at golden hour.

> The previous version painted this with a fullscreen WebGL shader. It rendered forever (backgrounded, static, under `prefers-reduced-motion`), interpolated `honey → sage` straight through bile, and drew the sun and moon as hard-edged discs that floated over the body copy. Hand-drawn skies are both prettier and nearly free. **Don't reintroduce a shader here.**

### Contrast is designed, not hoped for

The sky runs from near-white to near-black, so every ink is chosen against **the blended sky at the darkest point it appears**, not against porcelain. Story and gallery sit on the bare sky; from the programme onward each section carries its own **`.plate`** (a porcelain card), which guarantees contrast wherever the score happens to be. All body and label text measures ≥ 4.5:1.

### The lanterns

Each one is drawn — `<symbol id="lantern-body">`: eight panels with visible seams, a closed dome, a wide open mouth, hoops, a wire cradle, and a flame on its own CSS flicker timeline. The halo is a gradient painted once *behind* the lantern, never an animated `filter`.

The rise costs **no per-lantern JS**. `js/sky.js` writes one variable and each lantern derives its own position from its depth:

```css
transform: translate3d(0, calc(var(--y0) + var(--rise) * var(--sp)), 0);
```

Placement is rejection-sampled with a minimum gap, and the moon's zone is kept clear of anything that rises high — otherwise they end up stuck to it.

### Robustness

All content is visible by default. The `.js-anim` class — the only thing that hides pre-animation state — is added one frame after startup, so if `rAF` never runs, nothing is hidden. Reveals use `IntersectionObserver`, which recomputes its own thresholds, so a page that grows later (images loading, the RSVP card collapsing) can never leave an element stuck at `opacity: 0`. On any init error `.js-anim` is removed and everything shows. Verified with JS disabled, under `prefers-reduced-motion`, and at 360/390/430 px wide.

Reloads restart at the top (`history.scrollRestoration = 'manual'`) because the opening card greets every visit.

---

## Performance

Measured in headless Chromium at 390×844, dpr 3.

| | before | now |
|---|---|---|
| First screen (gzipped) | 2.17 MB | **≈ 160 KB** |
| Runtime dependencies | GSAP + ScrollTrigger + SplitText + Lenis + OGL (79 KB, 2 CDNs) | **none** |
| rAF callbacks while idle | unbounded (fullscreen shader + fullscreen `mix-blend-mode` layer) | **0** |
| Permanent composited layers | 21 | 5 (`.sky-layer`, opacity only) |
| Worst text contrast | 1.24:1 | **≥ 4.5:1** |
| Longest main-thread task | 1,000 ms | none measurable |
| Deployed assets | 49.6 MB (47.1 MB unreferenced) | **5.1 MB** |
| Page height | 8,359 px for 4 filtered photos | 7,226 px for 7 unfiltered ones |

Held by design decisions, not luck:

- `preload="none"` on the audio — the 1 MB track only downloads on the tap that is, in any case, the only thing that lets it play.
- AVIF → WebP → JPEG through `<picture>`, `srcset` at every width that doesn't upscale the source.
- **Native scroll.** No smooth-scroll library. On iOS, native momentum and rubber-banding beat anything JS can layer on top, and hijacking touch scroll is the single most common cause of "it feels laggy on my phone" on sites like this.
- No `mix-blend-mode` grain layer, no `backdrop-filter`, no custom cursor. The film grain in the photographs is the real thing.
- `transform` and `opacity` only.

---

## Run it

Any static server. Serve over http (`file://` won't do):

```
npx serve .
# or
python -m http.server 8000
```

## Image pipeline

`assets/img/` is generated from the untouched originals. The site ships no build step; this is a one-off dev tool.

```
npm i sharp        # anywhere
node tools/build-images.mjs
```

It writes AVIF + WebP + JPEG at every width that does **not** upscale the source, so the widest candidate in each `srcset` is always real pixels. `photo-1.jpg` is a stacked three-panel collage — the script lifts each panel out (row deltas put the seams at y=400 and y=800) so the gallery can use them as three real photographs.

Originals stay in the repo and are excluded from the deploy by `.vercelignore`.

## Where to put your files

| What | Where |
|---|---|
| Music | `assets/music.mp3` (< 3 MB; soft Arabic instrumental — voice + violin) |
| Photographs | `assets/photos/`, `assets/mimosa/`, then re-run the pipeline |
| Google Form IDs | `js/main.js`, `GOOGLE_FORM` block (already live) |
| Fallback contact email | `index.html`, mailto under the RSVP button |
| Venue address / coordinates / map link | `index.html`, `.venue-facts` |
| Story chapters · schedule · captions | `index.html` |

## RSVP → your Google Sheet (no backend)

Answers are POSTed to a Google Form on submit, so they land in your Sheet. **Already configured and live** — see the `GOOGLE_FORM` block at the top of `js/main.js`.

To rewire it to a new form: create a Form with these questions, in this order — *Nom & prénom* (short) · *Serez-vous des nôtres ?* (`Avec joie !` / `Avec regret, non`) · *Un +1 ?* (`Oui, +1` / `Non`) · *Allergies ou régime* (short) · *Un petit mot pour nous ?* (paragraph) — link a Sheet, then ⋮ → **Get pre-filled link** and read the `entry.XXXXXXXXX` ids out of the URL. Update `action` (swap `/viewform` for `/formResponse`) and each id.

Notes: radio values in `index.html` must match the Form options character-for-character. The *+1* and allergies fields were removed from the UI; their entries are still sent empty so the Form doesn't reject the post. The POST uses `mode: no-cors`, so the browser can't read Google's reply — the site optimistically shows the thank-you, which is standard. A honeypot filters basic bots and a mailto fallback sits under the button. **When testing submits locally, stub `window.fetch` first** so you don't pollute the live Sheet.

## Deploy on Vercel

Deploy-ready: `vercel.json` (clean URLs + cache headers) and analytics that load **only on a real domain**.

1. Push, or drag-and-drop at [vercel.com/new](https://vercel.com/new). Framework preset: **Other** (static, no build).
2. Deploy.
3. **Enable analytics once:** project → Analytics → Enable (otherwise the script 404s silently; the site is unaffected).

## Test checklist

- [ ] **First paint:** load with JS disabled and with CPU throttled — every screen readable, never blank.
- [ ] **Light score:** scroll top→bottom — porcelain → golden hour → dusk → blue hour → night, and back up, including **after** submitting the RSVP.
- [ ] **Contrast:** no body or label text below 4.5:1 at any scroll position.
- [ ] **Hero fits:** the countdown stays above the fold at 360×640, 390×844 and 430×932.
- [ ] **RSVP:** submit once with `fetch` stubbed — the card collapses onto the thank-you, no jump.
- [ ] **Reduced motion:** no reveals, no flicker, no sway, sky static, everything readable.
- [ ] **iOS Safari:** tap the card → music starts and loops; the mute button toggles it; scrolling feels native.
- [ ] **Small screens:** no horizontal overflow, no wrapped button labels, no orphaned separators.

## Known content issue

The copy describes the evening as an open-air garden with a flowered aisle and candles. `mimosa.jpg` shows magenta roses and crystal chandeliers. The copy was softened to stop contradicting the photograph, but **a photograph of the setup actually planned would be better than either.** This is the one thing that can't be fixed in code.
