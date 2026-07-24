/* ============================================================
   Eya & Yosri — scripts
   ------------------------------------------------------------
   · Défilement soyeux (Lenis) branché sur le ticker GSAP
   · Garde de robustesse (.js-anim) : le contenu est visible par
     défaut ; on ne le cache QU'UNE FOIS GSAP prêt, et un filet
     de sécurité révèle le hero si une timeline cale.
   · Ciel vivant piloté au scroll (voir js/sky.js), avec repli
     couleur si le WebGL manque.
   · Type cinématographique (SplitText), curseur sur-mesure,
     boutons magnétiques, finale des lanternes.
   · Ouverture + musique · compte à rebours · RSVP → Google Form.
   ============================================================ */

const hasGsap = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
const hasSplit = typeof SplitText !== 'undefined';
if (hasGsap) {
  gsap.registerPlugin(ScrollTrigger);
  if (hasSplit) gsap.registerPlugin(SplitText);
  ScrollTrigger.config({ ignoreMobileResize: true });
}

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const animate = hasGsap && !reduced;
const finePointer = window.matchMedia('(pointer: fine)').matches;
const root = document.documentElement;

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

/* ---------- Défilement soyeux (Lenis) ---------- */

let lenis = null;
if (animate && typeof Lenis !== 'undefined') {
  lenis = new Lenis({
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    wheelMultiplier: 0.9,
    touchMultiplier: 1.4,
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop(); // verrouillé tant que le carton d'invitation est là
}

/* ---------- Garde de robustesse ----------
   On ne pose .js-anim (qui cache les éléments à révéler) qu'après
   une frame : si le rAF ne tourne jamais, le contenu reste visible. */
if (animate) requestAnimationFrame(() => root.classList.add('js-anim'));

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

let heroIntroPlayed = false;
let heroIntroDone = false;
let heroSplit = null;

function openInvitation() {
  if (!overlay || overlay.classList.contains('is-open')) return;
  overlay.classList.add('is-open');
  document.body.classList.remove('locked');
  if (lenis) lenis.start();
  setTimeout(() => overlay.remove(), 1000);

  if (audio) {
    audio.volume = 0.55;
    audio.play().then(updateMusicUI).catch(updateMusicUI);
  }

  heroIntro();
  setTimeout(heroFailsafe, 2800); // filet : jamais de hero blanc
  if (hasGsap) ScrollTrigger.refresh();
}

if (overlay) {
  overlay.addEventListener('click', openInvitation);
  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openInvitation(); }
  });
} else {
  document.body.classList.remove('locked');
  if (lenis) lenis.start();
}

if (audio && musicBtn) {
  audio.addEventListener('play', updateMusicUI);
  audio.addEventListener('pause', updateMusicUI);
  musicBtn.addEventListener('click', () => {
    if (audio.paused) { audio.muted = false; audio.play().catch(() => {}); }
    else { audio.pause(); }
    updateMusicUI();
  });
}

/* ---------- Compte à rebours ---------- */

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
  const prev = {};
  let timer = null;

  const set = (el, val) => {
    if (!el || el.textContent === val) return;
    el.textContent = val;
    if (animate && heroIntroDone) {
      gsap.fromTo(el, { yPercent: -45, opacity: 0.4 },
        { yPercent: 0, opacity: 1, duration: 0.4, ease: 'power2.out', overwrite: true });
    }
  };

  const tick = () => {
    const left = WEDDING_DATE - Date.now();
    if (left <= 0) {
      box.innerHTML = '<span class="cd-done">C\'est le grand jour</span>';
      if (timer) clearInterval(timer);
      return;
    }
    set(num.d, String(Math.floor(left / 86400000)));
    set(num.h, pad(Math.floor(left / 3600000) % 24));
    set(num.m, pad(Math.floor(left / 60000) % 60));
    set(num.s, pad(Math.floor(left / 1000) % 60));
  };

  tick();
  if (WEDDING_DATE - Date.now() > 0) timer = setInterval(tick, 1000);
}

startCountdown();

/* ---------- RSVP : formulaire intégré → Google Form ---------- */

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
    if (celebrating) return;
    if (!rsvpForm.reportValidity()) return;

    const data = new FormData(rsvpForm);
    if (data.get('_gotcha')) return;

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
      fetch(GOOGLE_FORM.action, { method: 'POST', mode: 'no-cors', body }).catch(() => {});
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
  const startH = card.offsetHeight;
  form.hidden = true; success.hidden = false;
  const endH = card.offsetHeight;
  form.hidden = false; success.hidden = true;

  const tl = gsap.timeline({
    onComplete: () => {
      gsap.set(card, { clearProps: 'height,overflow' });
      celebrating = false;
      ScrollTrigger.refresh();
    },
  });

  tl.set(card, { height: startH, overflow: 'hidden' }, 0)
    .to(form, { opacity: 0, y: -12, duration: 0.35, ease: 'power1.in' }, 0)
    .to(card, { height: endH, duration: 0.75, ease: 'power3.inOut' }, 0.25)
    .add(() => { swap(); gsap.set(success, { opacity: 0, y: 16 }); }, 0.5)
    .to(success, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, 0.75);

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

/* ---------- Rameau qui pousse (remerciement RSVP) ---------- */

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

document.querySelectorAll('.branch-divider').forEach((el) => { el.innerHTML = branchSVG(); });

/* ============================================================
   Le ciel vivant : progression au scroll
   ------------------------------------------------------------
   Un seul « peintre » déterministe calcule une progression 0..1
   depuis la position de défilement (bornes re-mesurées à chaque
   refresh). On la donne au shader (window.__sky) ; si le WebGL
   manque, on repeint #sky en couleur pleine — repli identique à
   l'ancien ciel.
   ============================================================ */

const SKY_STOPS = [
  ['#story', 0.12], ['#gallery', 0.30], ['#schedule', 0.48],
  ['#venue', 0.62], ['#rsvp', 0.82], ['.footer', 1.0],
];

// Palette (mêmes teintes que le shader) pour le repli couleur
const SKY_RGB = [
  [244, 239, 226], [236, 226, 203], [230, 211, 169], [197, 200, 162],
  [169, 177, 137], [60, 68, 42], [14, 18, 9],
];
function skyFallbackColor(p) {
  const t = Math.max(0, Math.min(1, p)) * 6;
  const i = Math.min(5, Math.floor(t));
  const f = t - i;
  const a = SKY_RGB[i], b = SKY_RGB[i + 1];
  const c = (j) => Math.round(a[j] + (b[j] - a[j]) * f);
  return `rgb(${c(0)}, ${c(1)}, ${c(2)})`;
}

function buildSky() {
  const skyEl = document.getElementById('sky');
  let segments = [];

  const measure = () => {
    const vh = window.innerHeight;
    let previous = 0;
    segments = [];
    for (const [selector, value] of SKY_STOPS) {
      const section = document.querySelector(selector);
      if (!section) continue;
      const top = section.getBoundingClientRect().top + window.scrollY;
      segments.push({ start: top - vh * 0.92, end: top - vh * 0.38, from: previous, to: value });
      previous = value;
    }
  };

  const paint = () => {
    const y = window.scrollY;
    let prog = 0;
    for (const seg of segments) {
      if (y <= seg.start) break;
      prog = y >= seg.end ? seg.to
        : seg.from + (seg.to - seg.from) * ((y - seg.start) / (seg.end - seg.start));
    }
    window.__skyProgress = prog;
    if (window.__sky && window.__sky.active) window.__sky.setProgress(prog);
    else if (skyEl) skyEl.style.backgroundColor = skyFallbackColor(prog);
  };

  if (hasGsap) {
    ScrollTrigger.create({ start: 0, end: 'max', onUpdate: paint, onRefresh: () => { measure(); paint(); } });
  } else {
    measure(); paint();
    window.addEventListener('scroll', paint, { passive: true });
    window.addEventListener('resize', () => { measure(); paint(); });
  }
}

/* ============================================================
   Scénographie GSAP
   ============================================================ */

/* --- Entrée du hero, jouée à l'ouverture --- */

function heroIntro() {
  if (!animate || heroIntroPlayed) { heroIntroDone = true; return; }
  heroIntroPlayed = true;

  const names = document.querySelector('.hero-names');
  let lines = [];
  if (names && hasSplit) {
    try {
      heroSplit = SplitText.create(names, { type: 'lines', mask: 'lines', linesClass: 'sl' });
      lines = heroSplit.lines;
      gsap.set(names, { opacity: 1 });
    } catch (e) { gsap.set(names, { opacity: 1 }); }
  } else if (names) { gsap.set(names, { opacity: 1 }); }

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, onComplete: () => { heroIntroDone = true; } });

  tl.from('.hero-media', { scale: 1.16, autoAlpha: 0, duration: 1.7, ease: 'power2.out' }, 0)
    .fromTo('.hero-kicker', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.9 }, 0.4);

  if (lines.length) tl.from(lines, { yPercent: 120, opacity: 0, duration: 1.1, stagger: 0.12, ease: 'power4.out' }, 0.55);
  else tl.fromTo('.hero-names', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1.1 }, 0.55);

  tl.fromTo('.hero-rule', { opacity: 0, scaleX: 0 }, { opacity: 1, scaleX: 1, duration: 0.9, ease: 'power2.inOut' }, 0.95)
    .fromTo('.hero-meta', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.8 }, 1.05)
    .set('#hero-countdown', { opacity: 1 }, 1.1)
    .fromTo('.cd-cell', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.09 }, 1.15)
    .fromTo('.scroll-cue', { opacity: 0 }, { opacity: 1, duration: 0.8 }, 1.7);
}

function heroFailsafe() {
  if (heroIntroDone || !hasGsap) return;
  heroIntroDone = true;
  gsap.set('#hero .reveal-fade, #hero .reveal-line, #hero-countdown, .scroll-cue',
    { opacity: 1, y: 0, clearProps: 'visibility' });
  gsap.set('.hero-names', { opacity: 1 });
  gsap.set('.hero-media', { clearProps: 'all' });
  if (heroSplit) { try { gsap.set(heroSplit.lines, { yPercent: 0, opacity: 1 }); } catch (e) {} }
}

/* --- Révélations douces (une seule fois) --- */

function reveal(el, opts = {}) {
  if (!el) return;
  gsap.fromTo(el, { opacity: 0, y: opts.y ?? 30 },
    { opacity: 1, y: 0, duration: opts.d ?? 1, ease: 'power3.out',
      scrollTrigger: { trigger: opts.trigger || el, start: opts.start || 'top 84%', once: true } });
}

function splitReveal(el, opts = {}) {
  if (!el) return;
  if (!hasSplit) { el.style.opacity = '1'; return; }
  try {
    const split = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'sl' });
    gsap.set(el, { opacity: 1 });
    gsap.from(split.lines, {
      yPercent: 118, opacity: 0, duration: 1.05, ease: 'power4.out', stagger: 0.13,
      scrollTrigger: { trigger: opts.trigger || el, start: opts.start || 'top 84%', once: true },
      onComplete: () => { try { split.revert(); } catch (e) {} },
    });
  } catch (e) { el.style.opacity = '1'; }
}

function buildReveals() {
  document.querySelectorAll('.reveal-fade, .reveal-line').forEach((el) => {
    if (el.closest('#hero')) return;
    reveal(el, { y: el.classList.contains('reveal-line') ? 14 : 30 });
  });
  document.querySelectorAll('[data-split]').forEach((el) => {
    if (el.closest('#hero')) return;
    splitReveal(el, { start: el.closest('.footer') ? 'top 78%' : 'top 84%' });
  });

  document.querySelectorAll('.tl-item').forEach((item) => {
    reveal(item.querySelector('.tl-body'), { trigger: item, y: 34, start: 'top 82%' });
    const year = item.querySelector('.tl-year');
    if (year) gsap.fromTo(year, { opacity: 0, y: 46, scale: 0.9 },
      { opacity: 0.85, y: 0, scale: 1, duration: 1.2, ease: 'power3.out',
        scrollTrigger: { trigger: item, start: 'top 86%', once: true } });
  });

  document.querySelectorAll('.gallery-figure').forEach((f) => reveal(f, { y: 46, start: 'top 88%' }));
  document.querySelectorAll('.moment').forEach((m) => reveal(m, { y: 26, start: 'top 86%' }));
}

/* --- Parallaxes & fils d'or --- */

function buildParallax() {
  const drift = (sel, trig, from, to, extra = {}) => {
    const el = document.querySelector(sel);
    if (!el) return;
    gsap.fromTo(el, { y: from, ...extra.from },
      { y: to, ...extra.to, ease: 'none',
        scrollTrigger: { trigger: trig, start: 'top bottom', end: 'bottom top', scrub: true } });
  };
  drift('.story-branch', '#story', 80, -80, { from: { rotation: 3 }, to: { rotation: -4 } });
  drift('.schedule-branch', '#schedule', 60, -40, { from: { rotation: 16 }, to: { rotation: 10 } });

  document.querySelectorAll('.gallery-photo img, .venue-photo img').forEach((img) => {
    gsap.fromTo(img, { yPercent: 5 }, { yPercent: -5, ease: 'none',
      scrollTrigger: { trigger: img.closest('figure, .venue-photo'), start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  // Le hero se soulève et s'efface pour révéler le ciel vivant
  gsap.to('.hero-media', { yPercent: -12, scale: 1.14, autoAlpha: 0, ease: 'none',
    scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } });
}

function buildRails() {
  const sr = document.querySelector('.story-rail');
  if (sr) gsap.fromTo(sr, { scaleY: 0 }, { scaleY: 1, ease: 'none',
    scrollTrigger: { trigger: '.timeline', start: 'top 80%', end: 'bottom 60%', scrub: 0.6 } });
  const rail = document.querySelector('.schedule-rail');
  if (rail) gsap.fromTo(rail, { scaleY: 0 }, { scaleY: 1, ease: 'none',
    scrollTrigger: { trigger: '.schedule-list', start: 'top 78%', end: 'bottom 60%', scrub: 0.6 } });
}

/* --- Curseur sur-mesure + boutons magnétiques --- */

function buildCursor() {
  if (!finePointer || reduced) return;
  const cur = document.getElementById('cursor');
  if (!cur) return;
  const dot = cur.querySelector('.cursor-dot');
  const ring = cur.querySelector('.cursor-ring');
  root.classList.add('has-cursor');

  let mx = window.innerWidth / 2, my = window.innerHeight / 2, rx = mx, ry = my;
  window.addEventListener('mousemove', (e) => {
    mx = e.clientX; my = e.clientY;
    dot.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%)`;
  }, { passive: true });

  const tick = () => {
    rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  document.querySelectorAll('a, button, [role="button"], .magnetic, .pill, input, textarea').forEach((el) => {
    el.addEventListener('mouseenter', () => root.classList.add('cursor-hover'));
    el.addEventListener('mouseleave', () => root.classList.remove('cursor-hover'));
  });
}

function buildMagnetic() {
  if (!finePointer || !animate) return;
  document.querySelectorAll('.magnetic').forEach((el) => {
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      gsap.to(el, { x: (e.clientX - (r.left + r.width / 2)) * 0.3,
        y: (e.clientY - (r.top + r.height / 2)) * 0.4, duration: 0.4, ease: 'power3.out' });
    });
    el.addEventListener('mouseleave', () => gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' }));
  });
}

/* --- Le finale : les lanternes s'élèvent dans la nuit --- */

function buildLanterns() {
  const field = document.querySelector('.lantern-field');
  const footer = document.querySelector('.footer');
  if (!field || !footer) return;

  const N = window.innerWidth < 640 ? 10 : 18;
  const frag = document.createDocumentFragment();
  const items = [];

  for (let i = 0; i < N; i++) {
    const depth = Math.random();               // 0 = loin, 1 = proche
    const w = 34 + depth * 92;                  // 34–126px
    const x = Math.random() * 96 + 2;
    const el = document.createElement('div');
    el.className = 'f-lantern';
    el.style.setProperty('--x', x + '%');
    el.style.setProperty('--w', w + 'px');
    el.style.opacity = String(0.4 + depth * 0.6);
    el.style.filter = `drop-shadow(0 0 ${16 + depth * 26}px rgba(216,156,85,.5)) blur(${(1 - depth) * 1.4}px)`;
    el.innerHTML = '<div class="lantern-body"></div>';
    frag.appendChild(el);
    items.push({ el, speed: 0.6 + depth * 1.1 });
  }
  field.appendChild(frag);

  const rsvp = document.querySelector('#rsvp') || footer;

  if (!animate) {
    // Statique : lanternes déjà montées, plan visible seulement au finale
    field.classList.add('lantern-static');
    items.forEach(({ el }) => { el.style.transform = `translateY(${-window.innerHeight * (0.2 + Math.random() * 0.6)}px)`; });
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { field.style.opacity = e.isIntersecting ? '1' : '0'; }),
      { threshold: 0 });
    io.observe(footer);
    return;
  }

  // Le plan apparaît pendant la transition RSVP → finale, puis reste
  gsap.fromTo(field, { autoAlpha: 0 }, {
    autoAlpha: 1, ease: 'none',
    scrollTrigger: { trigger: rsvp, start: 'top 65%', end: 'top 5%', scrub: true },
  });

  const sways = [];
  items.forEach(({ el, speed }) => {
    // Montée continue sur toute la traversée des deux dernières sections,
    // dans un plan fixe : aucune coupure à la frontière RSVP / finale
    gsap.fromTo(el, { y: 60 }, {
      y: () => -window.innerHeight * speed, ease: 'none',
      scrollTrigger: { trigger: rsvp, start: 'top bottom', endTrigger: footer, end: 'bottom bottom', scrub: 1, invalidateOnRefresh: true },
    });
    sways.push(gsap.to(el, {
      x: gsap.utils.random(-30, 30), rotation: gsap.utils.random(-5, 5),
      duration: gsap.utils.random(3.2, 6), ease: 'sine.inOut', yoyo: true, repeat: -1, paused: true,
    }));
  });

  // Le vent ne souffle que dans la zone du finale (RSVP → bas de page)
  ScrollTrigger.create({
    trigger: rsvp, start: 'top center', endTrigger: footer, end: 'bottom top',
    onToggle: (self) => sways.forEach((s) => (self.isActive ? s.play() : s.pause())),
  });
}

/* ---------- Init ---------- */

buildCursor();

window.addEventListener('load', () => {
  try {
    buildSky();
    if (animate) {
      buildReveals();
      buildParallax();
      buildRails();
      buildMagnetic();
    }
    buildLanterns();
    if (hasGsap) ScrollTrigger.refresh();
  } catch (err) {
    console.warn('[init] fallback, révélation complète :', err);
    root.classList.remove('js-anim'); // rien ne reste caché
  }
});

if (hasGsap && document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => ScrollTrigger.refresh());
}
