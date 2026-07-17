/* ============================================================
   Eya & Yosri — scripts
   Ouverture + musique · compte à rebours · RSVP → Google Form
   Scénographie GSAP : le ciel (#dusk) passe de l'après-midi à la
   nuit au fil du défilement, les rameaux d'olivier « poussent »
   entre les sections, les guirlandes du hero s'écartent, les
   photos dérivent en parallaxe et les lanternes s'élèvent dans
   le finale. Transform/opacity uniquement (+ une couleur de fond
   sur un calque fixe).
   ============================================================ */

const hasGsap = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
if (hasGsap) {
  gsap.registerPlugin(ScrollTrigger);
  // La barre d'adresse mobile qui se replie/déplie change innerHeight :
  // sans ce drapeau, ScrollTrigger rafraîchit en pleine scène et le
  // scrub saute. On ignore les resize « hauteur seule » sur tactile.
  ScrollTrigger.config({ ignoreMobileResize: true });
}

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const animate = hasGsap && !reducedMotion;

/* ---------- Ouverture + musique ---------- */

const overlay = document.getElementById('overlay');
const audio = document.getElementById('bg-music');
const musicBtn = document.getElementById('music-toggle');

function updateMusicUI() {
  if (!audio || !musicBtn) return;
  const playing = !audio.paused && !audio.muted;
  musicBtn.classList.toggle('is-playing', playing);
  musicBtn.setAttribute('aria-pressed', String(playing));
}

function openInvitation() {
  if (!overlay || overlay.classList.contains('is-open')) return;
  overlay.classList.add('is-open');
  document.body.classList.remove('locked');
  setTimeout(() => overlay.remove(), 900);

  if (audio) {
    audio.volume = 0.55;
    // La lecture ne peut démarrer que sur un geste utilisateur (iOS inclus)
    audio.play().then(updateMusicUI).catch(updateMusicUI);
  }

  heroIntro();
}

if (overlay) {
  overlay.addEventListener('click', openInvitation);
  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault(); // l'espace ne doit pas faire défiler la page
      openInvitation();
    }
  });
} else {
  document.body.classList.remove('locked');
}

if (audio && musicBtn) {
  audio.addEventListener('play', updateMusicUI);
  audio.addEventListener('pause', updateMusicUI);

  musicBtn.addEventListener('click', () => {
    if (audio.paused) {
      audio.muted = false;
      audio.play().catch(() => { });
    } else {
      audio.pause();
    }
    updateMusicUI();
  });
}

/* ---------- Compte à rebours ---------- */

// 26 septembre 2026, 20h00, heure tunisienne (UTC+1 toute l'année)
const WEDDING_DATE = new Date('2026-09-26T20:00:00+01:00');

function startCountdown() {
  const box = document.getElementById('hero-countdown');
  if (!box) return;
  const num = {
    d: document.getElementById('cd-days'),
    h: document.getElementById('cd-hours'),
    m: document.getElementById('cd-mins'),
    s: document.getElementById('cd-secs'),
  };
  const pad = (n) => String(n).padStart(2, '0');
  let timer = null;

  const tick = () => {
    const left = WEDDING_DATE - Date.now();
    if (left <= 0) {
      box.innerHTML = '<span class="cd-done">C\'est le grand jour</span>';
      if (timer) clearInterval(timer);
      return;
    }
    num.d.textContent = String(Math.floor(left / 86400000));
    num.h.textContent = pad(Math.floor(left / 3600000) % 24);
    num.m.textContent = pad(Math.floor(left / 60000) % 60);
    num.s.textContent = pad(Math.floor(left / 1000) % 60);
  };

  tick();
  if (WEDDING_DATE - Date.now() > 0) timer = setInterval(tick, 1000);
}

startCountdown();

/* ---------- RSVP : formulaire intégré → Google Form ----------
   Les réponses tombent dans votre Google Sheet sans que l'invité
   ne quitte le site. Mode d'emploi complet dans le README. */

const GOOGLE_FORM = {
  action: 'https://docs.google.com/forms/d/e/1FAIpQLSe_Rm8yV3Nh57kBmAzwuGEubrbuv47FEdbPymfEVgYQk3jg1A/formResponse',
  fields: {
    name: 'entry.1053621967',
    attendance: 'entry.738475011',
    plusone: 'entry.1117018756',
    diet: 'entry.1434836369',
    message: 'entry.216394993',
  },
};

const rsvpForm = document.getElementById('rsvp-form');
let celebrating = false;

if (rsvpForm) {
  rsvpForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (celebrating) return; // double clic : un seul envoi
    if (!rsvpForm.reportValidity()) return;

    const data = new FormData(rsvpForm);
    if (data.get('_gotcha')) return; // robot pris au piège

    const values = {
      name: data.get('name') || '',
      attendance: data.get('attendance') || '',
      plusone: data.get('plusone') ? 'Oui, +1' : 'Non',
      diet: data.get('diet') || '',
      message: data.get('message') || '',
    };

    const configured = !GOOGLE_FORM.action.includes('VOTRE_ID');
    if (configured) {
      const body = new URLSearchParams();
      for (const [key, entry] of Object.entries(GOOGLE_FORM.fields)) {
        body.append(entry, values[key] || '');
      }
      // no-cors : Google n'autorise pas la lecture de la réponse ;
      // l'envoi part et la confirmation s'affiche dans la foulée
      fetch(GOOGLE_FORM.action, { method: 'POST', mode: 'no-cors', body }).catch(() => { });
    } else {
      console.info('RSVP (mode démo, rien envoyé) :', values);
    }

    const attending = (data.get('attendance') || '').startsWith('Avec joie');
    const success = document.getElementById('rsvp-success');
    success.querySelector('.rsvp-success-text').textContent = attending
      ? 'Votre réponse est bien partie — nous avons déjà hâte de vous voir sous les lanternes.'
      : "Merci d'avoir pris le temps de répondre — vous nous manquerez.";

    celebrate();
  });
}

/* Le panneau ne disparaît pas : le formulaire s'efface et le panneau se
   resserre en douceur autour du remerciement, pendant qu'un petit rameau
   d'olivier se dessine au-dessus du « Merci ». */
function celebrate() {
  const form = document.getElementById('rsvp-form');
  const success = document.getElementById('rsvp-success');
  const card = document.getElementById('rsvp-card');
  if (!form || !success || !card || form.hidden) return;

  const swap = () => { form.hidden = true; success.hidden = false; };

  if (!animate) {
    swap();
    if (hasGsap) ScrollTrigger.refresh();
    return;
  }

  celebrating = true;

  // Hauteurs avant/après : on montre furtivement le remerciement pour
  // mesurer la cible (tout est synchrone, rien n'est peint)
  const startH = card.offsetHeight;
  form.hidden = true; success.hidden = false;
  const endH = card.offsetHeight;
  form.hidden = false; success.hidden = true;

  const tl = gsap.timeline({
    onComplete: () => {
      gsap.set(card, { clearProps: 'height,overflow' });
      celebrating = false;
      ScrollTrigger.refresh(); // la page a changé de hauteur
    },
  });

  tl.set(card, { height: startH, overflow: 'hidden' }, 0)
    .to(form, { opacity: 0, y: -12, duration: 0.35, ease: 'power1.in' }, 0)
    .to(card, { height: endH, duration: 0.75, ease: 'power3.inOut' }, 0.25)
    .add(() => {
      swap();
      gsap.set(success, { opacity: 0, y: 16 });
    }, 0.5)
    .to(success, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, 0.75);

  // Le rameau du merci pousse
  const stem = success.querySelector('.dv-stem');
  if (stem) {
    const leaves = success.querySelectorAll('.dv-leaf');
    const olives = success.querySelectorAll('.dv-olive');
    tl.fromTo(stem, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1, ease: 'power1.inOut' }, 0.8);
    leaves.forEach((leaf, i) => {
      tl.fromTo(leaf, { scale: 0, svgOrigin: leaf.dataset.o },
        { scale: 1, duration: 0.4, ease: 'back.out(2.2)' }, 0.9 + i * 0.05);
    });
    tl.fromTo(olives, { opacity: 0 }, { opacity: 1, duration: 0.4, stagger: 0.08 }, 1.6);
  }
}

/* ============================================================
   Les rameaux qui poussent (séparateurs SVG)
   ------------------------------------------------------------
   Le SVG est injecté par JS : une tige (pathLength=1 → dasharray
   sans mesure), des feuilles ancrées sur la tige (data-o = point
   d'attache pour svgOrigin) et quelques olives. Sans JS ou en
   mouvement réduit, le rameau est simplement complet.
   ============================================================ */

const BRANCH_LEAVES = [
  [45, 25, 22], [81, 25, 148], [118, 27, 18], [154, 31, 152],
  [190, 34, 26], [226, 34, 144], [286, 28, 18], [323, 28, 156],
  [360, 29, 24], [399, 31, 146], [439, 32, 16], [482, 31, 150],
];
const BRANCH_OLIVES = [[252, 36, 5], [243, 40, 4], [462, 35, 4.5]];

function branchSVG() {
  const leaf = 'M0 0 C4 -6 7 -14 4 -23 C1 -16 -3 -8 0 0 Z';
  const leaves = BRANCH_LEAVES.map(([x, y, a]) =>
    `<path class="dv-leaf" data-o="${x} ${y}" transform="translate(${x} ${y}) rotate(${a})" d="${leaf}"/>`
  ).join('');
  const olives = BRANCH_OLIVES.map(([x, y, r]) =>
    `<circle class="dv-olive" cx="${x}" cy="${y}" r="${r}"/>`
  ).join('');
  return `<svg viewBox="0 0 520 60" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path class="dv-stem" pathLength="1" d="M8 30 C90 12 170 44 250 32 C330 20 410 40 512 28"/>
    ${leaves}${olives}</svg>`;
}

document.querySelectorAll('.branch-divider').forEach((el) => {
  el.innerHTML = branchSVG();
});

/* ============================================================
   Scénographie GSAP
   ============================================================ */

/* --- Entrée du hero, jouée à l'ouverture de l'invitation --- */

let heroIntroPlayed = false;

function heroIntro() {
  if (!animate || heroIntroPlayed) { buildHeroParallax(); return; }
  heroIntroPlayed = true;

  const tl = gsap.timeline({
    defaults: { ease: 'power3.out' },
    onComplete: buildHeroParallax,
  });

  tl.from('.hero-garland--top', { yPercent: -45, autoAlpha: 0, duration: 1.5, ease: 'power2.out' }, 0)
    .from('.hero-garland--bottom', { yPercent: 45, autoAlpha: 0, duration: 1.5, ease: 'power2.out' }, 0)
    .from('.hero-kicker', { y: 18, autoAlpha: 0, duration: 0.8 }, 0.35)
    .from('.hero-names', { y: 30, scale: 1.04, autoAlpha: 0, duration: 1.1 }, 0.5)
    .from('.hero-rule', { scaleX: 0, duration: 0.9, ease: 'power2.inOut' }, 0.85)
    .from('.hero-meta', { y: 14, autoAlpha: 0, duration: 0.8 }, 1.0)
    .from('.cd-cell', { y: 18, autoAlpha: 0, duration: 0.7, stagger: 0.09 }, 1.15)
    .from('.scroll-cue', { autoAlpha: 0, duration: 0.8 }, 1.7);
}

/* --- Les guirlandes s'écartent quand la soirée commence --- */

let heroParallaxBuilt = false;

function buildHeroParallax() {
  if (!animate || heroParallaxBuilt) return;
  heroParallaxBuilt = true;

  gsap.fromTo('.hero-garland--top', { yPercent: 0 }, {
    yPercent: -50,
    ease: 'none',
    scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom 35%', scrub: true },
  });
  gsap.fromTo('.hero-garland--bottom', { yPercent: 0 }, {
    yPercent: 50,
    ease: 'none',
    scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom 35%', scrub: true },
  });
  gsap.to('.scroll-cue', {
    autoAlpha: 0,
    ease: 'none',
    scrollTrigger: { trigger: '#hero', start: '4% top', end: '16% top', scrub: true },
  });
}

/* --- Le ciel : de l'après-midi à la nuit --- */

const DUSK_STOPS = [
  ['#story', '#ECE2CB'],
  ['#gallery', '#E6D3A9'],
  ['#schedule', '#C5C8A2'],
  ['#venue', '#A9B189'],
  ['#rsvp', '#55603C'],
  ['.footer', '#161A0F'],
];

function buildDusk() {
  const dusk = document.getElementById('dusk');
  if (!dusk) return;
  let previous = '#F4EFE2';
  for (const [selector, color] of DUSK_STOPS) {
    const section = document.querySelector(selector);
    if (!section) continue;
    gsap.fromTo(dusk, { backgroundColor: previous }, {
      backgroundColor: color,
      ease: 'none',
      immediateRender: false,
      scrollTrigger: { trigger: section, start: 'top 92%', end: 'top 38%', scrub: true },
    });
    previous = color;
  }
}

/* --- Les rameaux poussent entre les sections --- */

function buildDividers() {
  document.querySelectorAll('.branch-divider').forEach((div) => {
    if (div.closest('#rsvp-success')) return; // celui-là pousse dans celebrate()
    const stem = div.querySelector('.dv-stem');
    if (!stem) return;

    const tl = gsap.timeline({
      scrollTrigger: { trigger: div, start: 'top 96%', end: 'top 52%', scrub: 0.5 },
    });
    tl.fromTo(stem, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.65, ease: 'none' }, 0);
    div.querySelectorAll('.dv-leaf').forEach((leaf, i) => {
      tl.fromTo(leaf, { scale: 0, svgOrigin: leaf.dataset.o },
        { scale: 1, duration: 0.16, ease: 'back.out(2)' }, 0.06 + i * 0.045);
    });
    tl.fromTo(div.querySelectorAll('.dv-olive'),
      { opacity: 0, scale: 0.4, transformOrigin: '50% 50%' },
      { opacity: 1, scale: 1, duration: 0.18, stagger: 0.06 }, 0.62);
  });
}

/* --- Apparitions douces (une seule fois) --- */

function revealUp(targets, trigger, options = {}) {
  const els = gsap.utils.toArray(targets);
  if (!els.length) return;
  gsap.from(els, {
    y: options.y ?? 32,
    autoAlpha: 0,
    duration: options.duration ?? 1,
    ease: 'power3.out',
    stagger: options.stagger ?? 0.12,
    scrollTrigger: {
      trigger: trigger,
      start: options.start ?? 'top 78%',
      once: true,
    },
  });
}

function buildReveals() {
  revealUp('#story .eyebrow, #story .section-title', '#story');
  document.querySelectorAll('#story .chapter').forEach((c) => revealUp(c, c, { start: 'top 85%' }));

  revealUp('#gallery .eyebrow, #gallery .section-title', '#gallery');
  document.querySelectorAll('.gallery-figure').forEach((f) => revealUp(f, f, { y: 44, start: 'top 88%' }));

  revealUp('#schedule .eyebrow, #schedule .section-title, #schedule .section-sub', '#schedule');
  document.querySelectorAll('.moment').forEach((m) => revealUp(m, m, { start: 'top 85%' }));

  revealUp('#venue .eyebrow, #venue .section-title', '#venue');
  revealUp('.venue-photo', '.venue-body', { y: 40 });
  revealUp('.venue-note, .map-frame, .map-actions', '.venue-body', { start: 'top 72%' });

  revealUp('.rsvp-panel', '#rsvp', { y: 48, start: 'top 82%' });
  revealUp('.footer-content', '.footer', { y: 36, start: 'top 62%' });
}

/* --- Parallaxes : branches, photos, arche --- */

function buildParallax() {
  const drift = (target, trigger, fromY, toY, extra = {}) => {
    const el = document.querySelector(target);
    if (!el) return;
    gsap.fromTo(el, { y: fromY, ...extra.from }, {
      y: toY,
      ...extra.to,
      ease: 'none',
      scrollTrigger: { trigger: trigger, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  };

  drift('.story-branch', '#story', 70, -70, { from: { rotation: 2 }, to: { rotation: -3 } });
  drift('.gallery-branch', '#gallery', 40, -40);
  drift('.schedule-branch', '#schedule', 50, -30);

  // Les photos dérivent dans leur passe-partout (elles sont sur-échelonnées en CSS)
  document.querySelectorAll('.gallery-photo img, .venue-photo img').forEach((img) => {
    gsap.fromTo(img, { yPercent: 4.5 }, {
      yPercent: -4.5,
      ease: 'none',
      scrollTrigger: { trigger: img.closest('figure, .venue-photo'), start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });
}

/* --- Le fil d'or du programme --- */

function buildScheduleRail() {
  const rail = document.querySelector('.schedule-rail');
  if (!rail) return;
  gsap.fromTo(rail, { scaleY: 0 }, {
    scaleY: 1,
    ease: 'none',
    scrollTrigger: { trigger: '.schedule-list', start: 'top 78%', end: 'bottom 55%', scrub: 0.6 },
  });
}

/* --- Le finale : les lanternes s'élèvent --- */

function buildLanterns() {
  const footer = document.querySelector('.footer');
  if (!footer) return;

  gsap.fromTo('.lanterns-sky', { autoAlpha: 0, y: 70 }, {
    autoAlpha: 0.5,
    y: 0,
    ease: 'none',
    scrollTrigger: { trigger: footer, start: 'top 90%', end: 'top 15%', scrub: true },
  });

  document.querySelectorAll('.f-lantern').forEach((lantern) => {
    const speed = parseFloat(lantern.dataset.speed || '1');

    // La montée, liée au défilement
    gsap.fromTo(lantern, { y: 120 }, {
      y: () => -window.innerHeight * 0.85 * speed,
      ease: 'none',
      scrollTrigger: {
        trigger: footer,
        start: 'top 95%',
        end: 'bottom bottom',
        scrub: 1,
        invalidateOnRefresh: true,
      },
    });

    // La dérive du vent, continue
    gsap.to(lantern, {
      x: gsap.utils.random(-26, 26),
      rotation: gsap.utils.random(-4, 4),
      duration: gsap.utils.random(3.2, 5.6),
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    });
  });
}

/* ---------- Init ---------- */

window.addEventListener('load', () => {
  if (!animate) return;
  buildDusk();
  buildDividers();
  buildReveals();
  buildParallax();
  buildScheduleRail();
  buildLanterns();
  ScrollTrigger.refresh();
});

// Re-mesurer quand les polices finissent d'arriver
if (hasGsap && document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => ScrollTrigger.refresh());
}
