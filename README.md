# Eya & Yosri — Wedding Invitation Site 💌

Single-page wedding invitation. Vanilla HTML/CSS/JS + GSAP (ScrollTrigger & MotionPathPlugin via CDN). No frameworks, no build step.

**Date:** 26/09/2026 · **Venue:** MIMOSA (outdoor, Mediterranean) · **Guests arrive:** 8:00 PM, dinner 9:00 PM · **Palette (bride's brief):** soft ivory / natural linen / sage / olive / candlelight gold · **Fonts:** Pacifico + Nunito

The design follows the bride's reception brief: intimate outdoor evening (~220 close guests), earthy Mediterranean palette, candlelight warmth, live voice + violin, and a floating-lantern release as the finale — echoed by the pixel lanterns rising in the night-sky footer.

## Run it

Any static server works:

```
npx serve .
# or
python -m http.server 8000
```

Then open the printed URL. (Opening `index.html` directly via `file://` also works, but audio + fonts behave better over http.)

## Where to put your music

Drop your track at **`assets/music.mp3`** (MP3, ideally < 3 MB). It starts looping after the guest taps the "Vous êtes invités 💌" overlay — browsers only allow audio after a user gesture, which is exactly what the overlay is for.

Style suggestion (from the reception brief): a soft Arabic instrumental — voice + violin, elegant and unobtrusive.

## Where to put your photos

Drop the 4 golden-hour photos in **`assets/photos/`** as `photo-1.jpg` … `photo-4.jpg` (see the note file in that folder for which is which). They appear as tilted polaroids in the "La golden hour" section; until a file exists, a placeholder frame with the expected filename is shown, so the layout never breaks. Portrait crop (3:4), ~1200px wide is plenty.

## RSVP form → your Google Sheet (no backend needed)

The RSVP form is embedded directly in the page, styled like the site. Guests never leave the invitation: on submit, the answers are silently POSTed to a Google Form, so they land in your Google Sheet (free, unlimited — fine for 220 guests). Until you configure it, the form runs in **demo mode**: the confirmation shows, nothing is sent, and the answers are logged to the browser console.

Setup (~5 minutes):

1. **Create a Google Form** at [forms.google.com](https://forms.google.com) with exactly these 5 questions, in this order and with these types:
   - "Nom & prénom" — short answer
   - "Serez-vous des nôtres ?" — multiple choice with exactly two options: `Avec joie !` and `Avec regret, non`
   - "Un +1 ?" — multiple choice with exactly two options: `Oui, +1` and `Non` (the site sends one of these two values from the checkbox)
   - "Allergies ou régime" — short answer
   - "Un petit mot pour nous ?" — paragraph
2. In the form's Responses tab, click the Sheets icon to **link a Google Sheet**.
3. Click ⋮ → **"Get pre-filled link"**, type something in every field, click "Get link", and copy it. The URL contains one `entry.XXXXXXXXX=...` per question — those are your field IDs, in question order.
4. Open `js/main.js`, find the `GOOGLE_FORM` block at the top, and:
   - replace the `action` URL with your form's URL, swapping the final `/viewform` for `/formResponse` (keep the `https://docs.google.com/forms/d/e/…` shape from the pre-filled link);
   - paste each `entry.XXXXXXXXX` into the matching field (`name`, `attendance`, `guests`, `diet`, `message`).
5. Test once on the live site, then check the Sheet — your answer should be there.

Notes: the radio values in `index.html` must match the Google Form options character for character (they do if you copy the labels above). The POST uses `mode: no-cors`, so the browser can't read Google's reply — the site optimistically shows the thank-you card, which is standard for this technique. A honeypot field filters basic spam bots, and a mailto fallback is shown under the button.

## Deploy on Vercel (with analytics)

The site is deploy-ready: `vercel.json` is included (clean URLs + sensible cache headers) and `index.html` already loads Vercel Web Analytics **only when the site runs on a real domain** (nothing loads on localhost, so local dev stays clean).

Two ways to deploy:

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

**Turn on analytics (one click, required once):** in the Vercel dashboard open the project → **Analytics** tab → **Enable**. From then on, page views and visitors appear there; the script tag in `index.html` does the rest. If you skip this step the script simply 404s silently — the site itself is unaffected.

Remember to do the RSVP → Google Form setup (section above) *before* sharing the link, and test one real submission on the deployed URL.

## Things to replace

| What | Where |
|---|---|
| Google Form IDs for the RSVP | `js/main.js`, `GOOGLE_FORM` block (see section above) |
| Fallback contact email | `index.html`, mailto link under the RSVP button |
| Map | done — Espace Mimosa embedded (no API key); adjust the iframe `src` in `index.html` if you want another zoom level |
| Story milestones | `index.html`, `.timeline-item` texts |
| Schedule times/labels | `index.html`, `.schedule-card` contents |
| Gallery captions | `index.html`, `.polaroid figcaption` texts |

## Project status

- ✅ Phase 1 — page scaffold, opening overlay + looping music + mute button, mascot idle animations (breathing bob, random blinks) and welcome waves.
- ✅ Phase 2 — both mascots personalized from the couple's photos (Eya: champagne hijab with side bun, pushed-up red sunglasses, shimmery high-neck dress, bouquet · Yosri: beige linen suit, beard, dark shades in his hair, boutonniere, white sneakers) + full ScrollTrigger choreography:
  1. **Hero** — both sit on the title frame's bottom edge, legs dangling; they wave when the invitation opens.
  2. **Our story** — Eya runs along the story frame's border chased by Yosri (leg run-cycles, sprite flips via `scaleX`).
  3. **Schedule** — they jump card to card with squash & stretch landings (MotionPathPlugin arcs).
  4. **Venue** — Eya sits on the map frame's top edge; Yosri hides behind it and peeks out (the map frame's `z-index` sits above the mascot layer).
  5. **RSVP** — both land beside the button and point at it; the button has a heartbeat pulse.

  One master timeline with `scrub: 0.7` spans the whole page, so scrolling back up reverses everything. All movement is transform-only; everything is rebuilt on resize; mobile (< 640px) shrinks mascots and simplifies the chase path; `prefers-reduced-motion` keeps them in static hero poses.

## Test checklist

- [ ] **iOS Safari audio**: tap the overlay → music starts and loops; lock/unlock the phone and check it resumes or can be restarted from the mute button; mute switch on the side of the phone behaves as expected.
- [ ] **Mute button**: toggles playback, equalizer bars animate only while playing, slash icon shows when muted/paused.
- [ ] **Scroll jank**: with DevTools Performance panel, scroll the whole page — target 60 fps; all mascot animation must be transform/opacity only (no layout properties).
- [ ] **Reduced motion**: enable "prefers reduced motion" (OS setting or DevTools rendering emulation) → mascots stay in static poses, no scroll-driven movement, no pulsing button.
- [ ] **Small screens (< 640px)**: mascots shrink (84px), schedule cards stack, no horizontal overflow.
- [ ] **Scroll back up** (phase 2): animations reverse gracefully, no mascot left stranded mid-path.
