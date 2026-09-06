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

### The front door

Every visit opens on a sealed envelope. Tap it: the wax cracks in two, the flap falls
open, and **the couple's photograph rises out of the pocket, crosses the screen, and
settles into its place in the hero — and only then do the names close in around it.**
2.9 seconds to the landing, no video file, no library.

The photograph is the point. It is the *same file* on both sides of the transition —
same `srcset`, same `sizes`, so the browser picks one candidate and downloads it once.
Nothing is swapped and nothing is cross-faded: one object survives from the envelope
to the page, so **there is no cut to hide.** The porcelain veil that used to mask the
changeover is now just the ground turning from brown to daylight *behind* an object
you are watching the whole time.

The envelope itself is one photograph cut into three layers by
`tools/build-envelope.mjs` — body, flap, wax. Stacked back together they reproduce the
source pixel for pixel, so *at rest the gate simply is the picture*; only when it moves
does the seam exist. The lining, the back of the flap and the wax's scar are gradients,
because the camera never saw them.

The cut is not a hand-drawn polygon. The paper is deckled, so the silhouette is
segmented from the image: **saturation, not luminance.** Paper is neutral at every
light level (S 0.09–0.16) while linen is warm (S 0.23–0.41) — and sunlit linen is
*brighter* than the envelope's shadowed corners, so a luminance threshold sheared the
corners off and ate the "26.09" from the date. Largest connected component, morphological
close, hole fill, convex hull. The torn edge survives.

**Nothing under the wax was ever photographed**, so it is reconstructed rather than
covered. `inpaintDisc` samples the ring of paper just outside the seal, angle by angle,
and stretches it inward. That matters because the light rakes across the seal — the paper
reads `#F3DBC5` on the lit left and `#CFC0B2` where the wax casts its shadow to the right
— so a single-colour CSS disc could match neither, and it showed as a grey pastille the
moment the two halves flew off. The interior surfaces are sampled from the same
photograph (`#F6E2CE` lit, `#EDD8C4` mid, `#C5B9AF` in shadow); they used to borrow the
site's `--champagne` and `--sand`, which are cooler and pinker than this paper, and that
is what made the open envelope look like cut card rather than the same sheet.

**Cut pieces must overlap, never abut, and never be inset.** Two complementary cuts
sharing an edge each render it near 50% alpha, and 50% over 50% is not opaque — a grey
thread of background shows through. Worse, the lining was clipped *inside* the body's
punched triangle, leaving a wedge that neither painted: two dark lines down the folds
that changed thickness along their length, because the inset was constant in percent
while the triangle's edges converge. Every piece now laps over its neighbour.

**The physical lie.** A 2:3 portrait print cannot fit in a landscape envelope, and more
of it comes out than could have been inside. That is deliberate: it keeps the print in
the hero's own aspect from the first frame, so the flight never has to reshape the
photograph. Nobody reads geometry during a title sequence.

**Four traps, in the order they bite:**

1. **Safari flattens `preserve-3d`** the moment an *ancestor* carries `opacity < 1`,
   `clip-path`, `filter` or `overflow: hidden`. So `overflow` lives on `.overlay`,
   `perspective` on `.env-cam`, and the gate never fades itself out.
2. **`transform` is one property.** Two animations on it and one silently wins. One
   channel per element, and every static `translateZ` is rewritten into *each* keyframe.
   The print gets three separate channels — `transform` for depth, `translate` for the
   rise, `rotate` for its tilt — so none of them collide.
3. **The landing is the handoff.** The flying print is a child of the overlay, and the
   overlay's veil is opaque. Leaving it up after the print arrives paints porcelain over
   the hero — an empty screen between a photograph landing and the page it announces.
   The plate is revealed and the overlay removed in the *same frame*.
4. **Measure the target, not the transform.** `getBoundingClientRect()` returns the
   *visual* rect, transforms included. While the gate holds the plate still it must
   therefore hold it at `transform: none` — held at its entrance `scale(1.05)`, the
   plate reported 409×508 instead of 390×484 and the print landed 5 % too large and
   10 px off. The flight now lands within 0.03 px.
5. **The open flap must fall behind the print.** The body has the flap's triangle
   punched out, so the flap can sit *behind* the body (`translateZ(-6px)`) and still
   show through the hole exactly as if it were on top — and once open it can no longer
   draw its two edges across the rising photograph, which it did.
6. **The hero plate is not 2:3 on a phone.** It is `aspect-ratio: auto` at
   `height: max(18rem, 100svh - 22.5rem)` — 390×484 on a 390-wide screen, against
   365×548 on a laptop. A non-uniform scale would stretch the couple. So the flight
   animates the *frame's geometry* and lets `object-fit: cover` re-crop each frame: the
   photograph is never distorted, only the window over it changes. It is the one place
   this site animates layout instead of transform, on one fixed, out-of-flow element,
   for 0.9 s — a deliberate exception, written down rather than hidden.

There is no camera dolly any more. It existed only to cover the cut, and a camera that
pushes in would fight an object that has to land somewhere measured. The envelope
recedes on its own; the print travels on its own. That also deletes the real performance
risk of the earlier version — Chrome re-rasterising a photographic layer at 5×.

**The hero's entrance fires on the landing, not during the flight.** The flying print
covers exactly the plate's rectangle, so anything overlapping it — the names on a phone,
the ampersand on a laptop, the plate's own foot gradient — would play its entrance
*hidden underneath* and then appear already finished the instant the print was removed.
Triggered at the landing, the whole cascade runs in view. The print carries the phone's
foot falloff with it for the same reason: the plate must not arrive wearing something
the print never had.

That falloff is a **mask, not a painted veil.** A cream gradient laid over the photograph
has to end on exactly the colour of the sky beneath it, and it can only do that at one
screen height and one scroll position — everywhere else it leaves a hairline along the
plate's bottom edge (measured: 3.6 tone levels). Masking the photograph instead means
there is no second colour to match, at any height, at any scroll. The mask reaches *full*
transparency slightly before the edge: the last 3 % of image opacity was itself enough to
darken the final row by three levels, which is precisely the line it was meant to remove.

The scrollbar is hidden (`scrollbar-width: none`). It only ever appeared when the body
was unlocked — which is the exact instant the print lands — and its arrival narrows the
window by ~15 px, jolting every centred element sideways at the worst possible moment.
`scrollbar-gutter: stable` is the alternative if it should come back.

### Robustness

All content is visible by default. The `.js-anim` class — the only thing that hides pre-animation state — is added one frame after startup, so if `rAF` never runs, nothing is hidden. Reveals use `IntersectionObserver`, which recomputes its own thresholds, so a page that grows later (images loading, the RSVP card collapsing) can never leave an element stuck at `opacity: 0`. On any init error `.js-anim` is removed and everything shows. Verified with JS disabled, under `prefers-reduced-motion`, and at 360/390/430 px wide.

**With JavaScript off, the gate is removed outright.** `<body class="locked">` is
hard-coded and the envelope is `position: fixed; z-index: 300`, so without the
`<noscript>` block in `<head>` a visitor with JS disabled would be sealed out of the
invitation entirely — scroll locked, content covered. That block is load-bearing.

Reloads restart at the top (`history.scrollRestoration = 'manual'`) because the opening card greets every visit.

---

## Performance

Measured in headless Chromium at 390×844, dpr 3.

| | before | now |
|---|---|---|
| First screen (gzipped) | 2.17 MB | **≈ 120 KB** |
| Runtime dependencies | GSAP + ScrollTrigger + SplitText + Lenis + OGL (79 KB, 2 CDNs) | **none** |
| rAF callbacks while idle | unbounded (fullscreen shader + fullscreen `mix-blend-mode` layer) | **0** |
| Permanent composited layers | 21 | 5 (`.sky-layer`, opacity only) |
| Gate layers | — | 7, all torn down at 2.9 s |
| Worst text contrast | 1.24:1 | **≥ 4.5:1** |
| Longest main-thread task | 1,000 ms | none measurable |
| Deployed assets | 49.6 MB (47.1 MB unreferenced) | **5.1 MB** |
| Page height | 8,359 px for 4 filtered photos | 7,226 px for 7 unfiltered ones |

The first screen carries the photograph now. It is no longer something that loads
quietly behind a closed envelope — it *is* the opening, out of the pocket at 0.6 s — so
it gets `fetchpriority="high"` back and counts against the first paint: 39 KB of code,
29 KB of envelope, 51 KB of photograph. That is the honest price of the transition, and
it is still well under the 160 KB this site started from.

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

`assets/img/` is generated from the untouched originals. The site ships no build step; these are one-off dev tools.

Two of them. `build-images.mjs` makes the photograph variants. **`build-envelope.mjs`
cuts the front door's envelope into its three layers** and prints the CSS landmarks
(seal centre, seal diameter, flap apex) that `styles.css` §4 is written against — if
you ever replace `assets/envelope/source.png`, re-run it and paste the new numbers in.

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
