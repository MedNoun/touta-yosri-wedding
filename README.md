# Eya & Yosri — Wedding Invitation Site 🕊️

Single-page wedding invitation. Vanilla HTML/CSS/JS — **no build step, no framework**. Everything ships from CDNs: GSAP 3.13 (ScrollTrigger + SplitText), Lenis (smooth scroll) and OGL (a tiny WebGL library for the living sky).

**Date:** 26/09/2026 · **Venue:** Espace Mimosa, Sfax (outdoor, Mediterranean) · **Guests arrive:** 8:00 PM, dinner 9:00 PM

## The design — « L'oliveraie au crépuscule, réinventée »

The page is **one continuous evening**, told cinematically. You arrive at golden hour on a full-bleed photograph of the couple; as you scroll, the photo lifts and fades to reveal a **living dusk sky** rendered in WebGL — a real gradient with a sun that sets, a golden-hour horizon glow, a moon, and stars that emerge as night falls. That sky stays behind every (transparent) section and darkens to full night by the lantern finale, echoing the real lantern release that closes the reception.

- **Palette:** ecru / linen / honey / sage / twilight / olive / night, with candlelight gold accents (tokens at the top of `css/styles.css`).
- **Type:** **Fraunces** (variable, high-contrast — names & titles) · **Marcellus** (tracked uppercase labels, times) · **Mulish** (body).
- **Signature moments:** the photographic hero that lifts to reveal the sky · masked line-by-line name/title reveals (SplitText) · an editorial, asymmetric story timeline with an oversized "ghost" year and a scroll-drawn rail · a vellum-matted photo mosaic with parallax · an engraved location plate (no map iframe) · a custom cursor + magnetic buttons on desktop · the lantern finale under a real night sky.
- **Reduced motion / no JS / no WebGL:** everything stays readable and complete — smoothing and reveals switch off, the sky falls back to a scroll-driven flat colour, content is visible by default.

### How it's wired

- **`js/sky.js`** (ES module) — the living sky. One fullscreen OGL fragment shader; a single `uProgress` uniform (0 = afternoon → 1 = night) is driven by scroll. It exposes `window.__sky = { active, setProgress(p) }`. If WebGL is unavailable the module leaves `active:false` and `main.js` repaints `#sky` with a flat colour instead (the old "dusk" behaviour).
- **`js/main.js`**
  - **Smooth scroll:** Lenis runs on the GSAP ticker (`gsap.ticker.add(t => lenis.raf(t*1000))`) and feeds `ScrollTrigger.update` — one shared loop. Disabled under `prefers-reduced-motion`.
  - **Robust first paint:** all content is visible by default. The `.js-anim` class (which hides elements before they animate in) is only added **after** GSAP is confirmed and one `requestAnimationFrame` has fired. If a timeline ever stalls, a **failsafe** reveals the hero — the first screen can never go blank. On any init error, `.js-anim` is removed and everything shows.
  - **The sky painter:** a single deterministic `ScrollTrigger` recomputes progress from scroll position (segment boundaries re-measured on every `refresh()`), so resizes and reflows — like the RSVP card shrinking after submit — can never leave the sky wrong. Don't replace it with chained tweens.
  - **Reveals / parallax / rails / cursor / magnetic / lanterns** are all built on `load`, transform/opacity only (plus the WebGL layer).
  - Reloads restart at the top (`history.scrollRestoration = 'manual'`) because the opening overlay greets every visit.

### Web assets (`assets/web/`)

Trimmed, resized, 256-colour-quantised copies of the original artwork (which lives untouched in `assets/botanicals/` and `assets/lanterns/`). To regenerate, rerun `optimize_assets.py` (needs Python + Pillow: alpha-bbox trim → LANCZOS resize → FASTOCTREE quantize with dithering). The lanterns in the finale are drawn in CSS/JS, not images.

## Run it

Any static server works — **serve over http** (ES modules + the WebGL CDN import need it; `file://` won't load `js/sky.js`):

```
npx serve .
# or
python -m http.server 8000
```

Then open the printed URL. Tip: test the animations in a **focused/foreground tab** — background tabs throttle `requestAnimationFrame`, which pauses GSAP timelines and the sky's render loop.

## Where to put your music

Drop your track at **`assets/music.mp3`** (MP3, ideally < 3 MB). It starts looping after the guest taps the opening overlay — browsers only allow audio after a user gesture, which is exactly what the overlay is for. Style suggestion: a soft Arabic instrumental — voice + violin, elegant and unobtrusive.

## Where to put your photos

- **Hero:** the full-bleed hero uses `assets/photos/photo-3.jpg`. To use a dedicated hero shot, replace that file (landscape, ~2000px wide, faces in the upper-middle) or point `.hero-photo` in `index.html` at a new file. A short muted-loop `<video>` can be dropped in there too.
- **Gallery:** drop the 4 golden-hour photos in `assets/photos/` as `photo-1.jpg … photo-4.jpg` (portrait ~1200px is plenty). Missing files show a labelled placeholder, so the layout never breaks.
- **Venue:** `assets/mimosa/mimosa.jpg`.

## RSVP form → your Google Sheet (no backend needed)

The RSVP form is embedded in the page and styled like the site. Guests never leave the invitation: on submit, answers are silently POSTed to a Google Form, so they land in your Google Sheet (free, unlimited — fine for 220 guests). **Already configured and live** — the `GOOGLE_FORM` block at the top of `js/main.js` holds the form URL and field IDs.

To rewire it to a new form:

1. **Create a Google Form** at [forms.google.com](https://forms.google.com) with exactly these 5 questions, in this order and with these types:
   - "Nom & prénom" — short answer
   - "Serez-vous des nôtres ?" — multiple choice: `Avec joie !` and `Avec regret, non`
   - "Un +1 ?" — multiple choice: `Oui, +1` and `Non` (the site sends one of these from the checkbox)
   - "Allergies ou régime" — short answer
   - "Un petit mot pour nous ?" — paragraph
2. In the Responses tab, link a Google Sheet.
3. ⋮ → **"Get pre-filled link"**, fill every field, "Get link", copy it. The URL's `entry.XXXXXXXXX=…` values are your field IDs, in question order.
4. In `js/main.js`, update the `GOOGLE_FORM` block: the `action` URL (swap `/viewform` for `/formResponse`) and each `entry.XXXXXXXXX`.
5. Test once on the live site, then check the Sheet.

Notes: radio values in `index.html` must match the Google Form options character-for-character. The POST uses `mode:no-cors`, so the browser can't read Google's reply — the site optimistically shows the thank-you, which is standard. A honeypot filters basic spam bots; a mailto fallback is shown under the button. **When testing submits locally, stub `window.fetch` first** so you don't pollute the live Sheet.

## Deploy on Vercel (with analytics)

Deploy-ready: `vercel.json` is included (clean URLs + cache headers) and `index.html` loads Vercel Web Analytics **only on a real domain** (nothing on localhost).

1. Push this folder to a repo (or drag-and-drop at [vercel.com/new](https://vercel.com/new)). Framework preset: **Other** (static, no build).
2. Deploy → you get an `https://….vercel.app` URL immediately.
3. **Enable analytics once:** project → **Analytics** → **Enable** (otherwise the script just 404s silently — the site is unaffected).

## Things to replace

| What | Where |
|---|---|
| Hero photo | `assets/photos/photo-3.jpg` (or repoint `.hero-photo` in `index.html`) |
| Google Form IDs for the RSVP | `js/main.js`, `GOOGLE_FORM` block (already live) |
| Fallback contact email | `index.html`, mailto link under the RSVP button |
| Venue address / coordinates / map link | `index.html`, `.venue-plate` + the "Ouvrir dans Google Maps" link |
| Story chapters | `index.html`, `.tl-item` texts |
| Schedule times/labels | `index.html`, `.moment` contents |
| Gallery captions | `index.html`, `figcaption` texts |

## Test checklist

- [ ] **First-paint safety:** load with JS disabled, with the CDN blocked, and with CPU throttled — the hero and all content must be visible every time (never blank).
- [ ] **Living sky:** scroll top→bottom in a focused tab — sky goes afternoon → golden hour (sun setting) → dusk → twilight (stars appear) → night (moon + ember), and back on the way up, including **after** submitting the RSVP.
- [ ] **No-WebGL fallback:** disable WebGL → `#sky` still transitions as a flat colour.
- [ ] **Smooth scroll:** inertial glide on wheel/trackpad; masked line reveals fire once per section.
- [ ] **Interactions:** custom cursor + magnetic buttons on desktop, absent on touch; countdown digits roll on tick.
- [ ] **RSVP:** submit once for real (or with `fetch` stubbed), check the Sheet, verify the card shrinks gracefully around the thank-you + growing branch.
- [ ] **Reduced motion:** no smoothing/cursor/reveals, sky static, everything readable.
- [ ] **iOS Safari audio:** tap the overlay → music starts and loops; mute button toggles it.
- [ ] **Small screens (< 640px):** single-column gallery, timeline & schedule rails hugging the left edge, no horizontal overflow.
