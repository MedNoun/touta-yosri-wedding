# Eya & Yosri — Wedding Invitation Site 🕊️

Single-page wedding invitation. Vanilla HTML/CSS/JS + GSAP (ScrollTrigger via CDN). No frameworks, no build step.

**Date:** 26/09/2026 · **Venue:** Espace Mimosa (outdoor, Mediterranean) · **Guests arrive:** 8:00 PM, dinner 9:00 PM

## The design — « L'oliveraie au crépuscule »

The page is one continuous evening in an olive grove: a fixed backdrop (`#dusk`) shifts from afternoon ecru to deep night as the guest scrolls, sections are transparent on top of it, and the visit ends under a sky of rising lanterns — echoing the real lantern release that closes the reception.

- **Palette:** ecru / linen / honey / sage / olive / night, with candlelight gold accents (all tokens at the top of `css/styles.css`).
- **Type:** Cormorant Garamond (names, titles, countdown numerals) · Marcellus (tracked uppercase labels & times) · Mulish (body).
- **Signature elements:** watercolor olive garlands that part as the hero scrolls away; SVG olive branches that "grow" between sections (stem draws in, leaves bud, olives appear); vellum-matted photos with a slow parallax drift inside their frames; a gold rail threading the schedule; the lantern finale.
- **Reduced motion / no JS:** everything is readable and complete — branches render fully drawn, content is visible by default, the RSVP thank-you swaps instantly.

### How the animation is wired (`js/main.js`)

- `buildDusk()` — one deterministic "painter": a single ScrollTrigger spanning the page recomputes the backdrop color from the scroll position. Segment boundaries are re-measured on every `ScrollTrigger.refresh()`, so resizes and layout changes (like the RSVP card shrinking after submit) can never leave the sky the wrong color. Don't replace this with chained tweens on the same property — that's the bug it fixed.
- `buildDividers()` — the injected branch SVGs use `pathLength="1"` so the stem draws with `stroke-dasharray: 1` and no path measuring; leaves scale in around their attachment point (`data-o` → `svgOrigin`).
- `heroIntro()` / `buildHeroParallax()` — entrance timeline plays when the invitation opens, then the garlands part on scroll.
- `buildReveals()` — once-only fade-ups per section; `buildParallax()` — branches and photos drift (transform-only); `buildLanterns()` — scroll-scrubbed rise + wind sway that only runs while the footer is on screen.
- Reloads always restart at the top (`history.scrollRestoration = 'manual'`) because the opening overlay greets every visit.

### Web assets (`assets/web/`)

The original artwork lives untouched in `assets/botanicals/` and `assets/lanterns/`. The site loads trimmed, resized, 256-color-quantized copies from `assets/web/` (~1.3 MB total). To regenerate them (needs Python + Pillow), rerun the `optimize_assets.py` script (alpha-bbox trim → LANCZOS resize → FASTOCTREE quantize with dithering).

## Run it

Any static server works:

```
npx serve .
# or
python -m http.server 8000
```

Then open the printed URL. (Opening `index.html` directly via `file://` also works, but audio + fonts behave better over http.)

## Where to put your music

Drop your track at **`assets/music.mp3`** (MP3, ideally < 3 MB). It starts looping after the guest taps the opening overlay — browsers only allow audio after a user gesture, which is exactly what the overlay is for. Style suggestion (from the reception brief): a soft Arabic instrumental — voice + violin, elegant and unobtrusive.

## Where to put your photos

Drop the 4 golden-hour photos in **`assets/photos/`** as `photo-1.jpg` … `photo-4.jpg`. They appear in the vellum mats of the « L'heure dorée » section; if a file is missing, a labeled placeholder frame shows instead, so the layout never breaks. Portrait crop (3:4), ~1200px wide is plenty. The venue photo lives at `assets/mimosa/mimosa.jpg`.

## RSVP form → your Google Sheet (no backend needed)

The RSVP form is embedded directly in the page, styled like the site. Guests never leave the invitation: on submit, the answers are silently POSTed to a Google Form, so they land in your Google Sheet (free, unlimited — fine for 220 guests). **This is already configured and live** — the `GOOGLE_FORM` block at the top of `js/main.js` holds the form URL and field IDs.

If you ever need to rewire it to a new form:

1. **Create a Google Form** at [forms.google.com](https://forms.google.com) with exactly these 5 questions, in this order and with these types:
   - "Nom & prénom" — short answer
   - "Serez-vous des nôtres ?" — multiple choice with exactly two options: `Avec joie !` and `Avec regret, non`
   - "Un +1 ?" — multiple choice with exactly two options: `Oui, +1` and `Non` (the site sends one of these two values from the checkbox)
   - "Allergies ou régime" — short answer
   - "Un petit mot pour nous ?" — paragraph
2. In the form's Responses tab, click the Sheets icon to **link a Google Sheet**.
3. Click ⋮ → **"Get pre-filled link"**, type something in every field, click "Get link", and copy it. The URL contains one `entry.XXXXXXXXX=...` per question — those are your field IDs, in question order.
4. In `js/main.js`, update the `GOOGLE_FORM` block: the `action` URL (swap the final `/viewform` for `/formResponse`) and each `entry.XXXXXXXXX`.
5. Test once on the live site, then check the Sheet.

Notes: the radio values in `index.html` must match the Google Form options character for character. The POST uses `mode: no-cors`, so the browser can't read Google's reply — the site optimistically shows the thank-you card, which is standard for this technique. A honeypot field filters basic spam bots, and a mailto fallback is shown under the button.

## Deploy on Vercel (with analytics)

The site is deploy-ready: `vercel.json` is included (clean URLs + sensible cache headers) and `index.html` already loads Vercel Web Analytics **only when the site runs on a real domain** (nothing loads on localhost, so local dev stays clean).

**A. From the dashboard (recommended)**
1. Push this folder to a GitHub/GitLab repo (or drag-and-drop the folder at [vercel.com/new](https://vercel.com/new)).
2. Import the repo on Vercel. If the repo root is the parent folder, set **Root Directory** to `eya-yosri-wedding`. Framework preset: **Other** (static, no build step, no output directory needed).
3. Deploy — you get an `https://….vercel.app` URL immediately (custom domain optional under Project → Settings → Domains).

**B. From the CLI**
```
cd eya-yosri-wedding
npx vercel          # first run: log in + create the project
npx vercel --prod   # production deploy
```

**Turn on analytics (one click, required once):** in the Vercel dashboard open the project → **Analytics** tab → **Enable**. If you skip this step the script simply 404s silently — the site itself is unaffected.

## Things to replace

| What | Where |
|---|---|
| Google Form IDs for the RSVP | `js/main.js`, `GOOGLE_FORM` block (already live) |
| Fallback contact email | `index.html`, mailto link under the RSVP button |
| Map | done — Espace Mimosa embedded (no API key); adjust the iframe `src` in `index.html` for another zoom level |
| Story chapters | `index.html`, `.chapter` texts |
| Schedule times/labels | `index.html`, `.moment` contents |
| Gallery captions | `index.html`, `figcaption` texts |

## Test checklist

- [ ] **iOS Safari audio**: tap the overlay → music starts and loops; the mute button toggles it; equalizer bars animate only while playing.
- [ ] **Dusk backdrop**: scroll the whole page down and back up — the sky darkens smoothly section by section and lightens again on the way up, including **after** submitting the RSVP form.
- [ ] **RSVP flow**: submit once for real, check the Google Sheet, and verify the card shrinks gracefully around the thank-you + growing branch.
- [ ] **Scroll jank**: DevTools Performance panel while scrolling — target 60 fps; all scroll animation is transform/opacity, plus one background-color on the fixed `#dusk` layer.
- [ ] **Reduced motion**: enable "prefers reduced motion" → no scroll choreography, branches fully drawn, everything readable.
- [ ] **Small screens (< 640px)**: single-column gallery, schedule rail hugging the left edge, no horizontal overflow.
- [ ] **Reload mid-page**: the site restarts at the top with the opening overlay (by design — the invitation greets every visit).
