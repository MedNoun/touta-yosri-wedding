/* ============================================================
   Eya & Yosri — scripts
   Overlay + musique · mascottes pixel (idle + coucou)
   Chorégraphie ScrollTrigger scrubbée sur tout le défilement :
   hero → poursuite (histoire) → sauts (programme) → cache-cache
   (lieu) → pointage du bouton (RSVP). Transform/opacity uniquement.
   ============================================================ */

gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);

// LA cause du « glitch » sur mobile déployé : la barre d'adresse qui se
// replie/déplie change innerHeight, et ScrollTrigger — via SON propre
// écouteur de resize interne — rafraîchit tout seul, recalcule end:'max'
// et remappe la progression du scrub en pleine scène (téléportation des
// mascottes). Notre garde plus bas n'empêchait que NOTRE reconstruction,
// pas celle de ScrollTrigger. Ce drapeau lui dit d'ignorer précisément
// les resize « barre mobile » (hauteur seule sur écran tactile).
ScrollTrigger.config({ ignoreMobileResize: true });

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = () => window.matchMedia('(max-width: 640px)').matches;

/* ---------- Overlay + musique ---------- */

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
  setTimeout(() => overlay.remove(), 800);

  if (audio) {
    audio.volume = 0.55;
    // La lecture ne peut démarrer que sur un geste utilisateur (iOS Safari inclus)
    audio.play().then(updateMusicUI).catch(updateMusicUI);
  }

  if (!reducedMotion) {
    wave('a');
    gsap.delayedCall(0.4, () => wave('b'));
  }

  // Le déverrouillage du scroll fait (ré)apparaître la barre de
  // défilement : la mise en page glisse de quelques pixels et toutes
  // les poses mesurées sous verrou deviennent fausses — on remesure
  scheduleBuild(200);
}

// Chaque bloc est gardé : si un élément manque (variante de la page,
// test), le script continue — sans garde, le TypeError au premier
// addEventListener tuerait TOUT (musique, compte à rebours, mascottes,
// envoi du RSVP).
if (overlay) {
  overlay.addEventListener('click', openInvitation);
  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      // Sans preventDefault, l'espace qui ouvre l'invitation fait
      // aussi défiler la page à peine déverrouillée
      e.preventDefault();
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

/* ---------- RSVP : formulaire intégré → Google Form ----------
   Les réponses tombent dans votre Google Sheet sans que l'invité
   ne quitte le site. Mode d'emploi complet dans le README :
   1. créez le Google Form (mêmes champs), 2. récupérez l'URL
   /formResponse et les identifiants entry.XXXX, 3. collez-les ici.
   Tant que 'VOTRE_ID' est présent, le formulaire tourne en mode
   démo : confirmation affichée, rien n'est envoyé. */

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

if (rsvpForm) {
  rsvpForm.addEventListener('submit', (e) => {
    e.preventDefault();
    // Double clic pendant que la célébration démarre : un seul envoi
    if (celebrating) return;
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
      // no-cors : Google n'autorise pas la lecture de la réponse,
      // l'envoi part et la confirmation s'affiche dans la foulée
      fetch(GOOGLE_FORM.action, { method: 'POST', mode: 'no-cors', body }).catch(() => { });
    } else {
      console.info('RSVP (mode démo, rien envoyé) :', values);
    }

    const attending = (data.get('attendance') || '').startsWith('Avec joie');
    const success = document.getElementById('rsvp-success');
    success.querySelector('.rsvp-success-text').textContent = attending
      ? 'Votre réponse est bien partie — on a déjà hâte de vous voir sous les lanternes ✨'
      : "Merci d'avoir pris le temps de répondre — vous nous manquerez 💛";

    // La carte se resserre autour du remerciement pendant que les
    // mascottes chutent (ou sont catapultées) sur son toit — celebrate()
    celebrate();
  });
}

/* ---------- Mascottes : constantes & placement ---------- */

const MASCOTS = {
  a: { el: '#mascot-a', inner: '#a-inner', legs: ['#a-leg-l', '#a-leg-r'], ratio: 96 / 110, seat: 0.84 },
  b: { el: '#mascot-b', inner: '#b-inner', legs: ['#b-leg-l', '#b-leg-r'], ratio: 96 / 104, seat: 0.78 },
};

const mascotH = () => (isMobile() ? 84 : 120);

function docRect(target) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  const r = el.getBoundingClientRect();
  return {
    left: r.left + window.scrollX,
    top: r.top + window.scrollY,
    right: r.right + window.scrollX,
    bottom: r.bottom + window.scrollY,
    width: r.width,
    height: r.height,
  };
}

const base = { a: { x: 0, y: 0 }, b: { x: 0, y: 0 } };

function placeHeroMascots() {
  if (!document.getElementById('hero-frame')) return;
  const r = docRect('#hero-frame');
  const h = mascotH();
  // Assis sur le bord bas du cadre : la "ligne d'assise" (bas de la robe /
  // hanches) est alignée sur le bord, les jambes pendent dans le vide.
  base.a = { x: r.left + r.width * 0.12, y: r.top + r.height - h * MASCOTS.a.seat };
  base.b = { x: r.left + r.width * 0.64, y: r.top + r.height - h * MASCOTS.b.seat };
  for (const k of ['a', 'b']) {
    const el = document.querySelector(MASCOTS[k].el);
    if (!el) continue;
    el.style.left = base[k].x + 'px';
    el.style.top = base[k].y + 'px';
    el.classList.add('is-placed');
  }
}

/* ---------- Idle : respiration + clignement ---------- */

function startIdle(p) {
  if (reducedMotion) return;

  gsap.to(`#${p}-inner`, {
    y: -2.5,
    duration: 1.7,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1,
  });

  const blink = () => {
    gsap.timeline({
      onComplete: () => gsap.delayedCall(gsap.utils.random(1.5, 4), blink),
    })
      .to(`#${p}-eyes`, { scaleY: 0.12, transformOrigin: '50% 60%', duration: 0.06 })
      .to(`#${p}-eyes`, { scaleY: 1, duration: 0.1 });
  };
  gsap.delayedCall(gsap.utils.random(0.8, 2.5), blink);
}

/* ---------- Coucou de bienvenue ---------- */

function wave(p) {
  gsap.timeline()
    .to(`#${p}-arm-r`, {
      rotation: -150,
      transformOrigin: '50% 10%',
      duration: 0.45,
      ease: 'back.out(2)',
    })
    .to(`#${p}-arm-r`, {
      rotation: -120,
      duration: 0.16,
      yoyo: true,
      repeat: 3,
      ease: 'sine.inOut',
    })
    .to(`#${p}-arm-r`, {
      rotation: 0,
      duration: 0.5,
      ease: 'power2.inOut',
      delay: 0.1,
    });
}

/* ---------- Compte à rebours (cadre du hero) ---------- */

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
      box.innerHTML = '<span class="cd-done">C\'est le grand jour ! 🎉</span>';
      if (timer) clearInterval(timer);
      return;
    }
    num.d.textContent = String(Math.floor(left / 86400000));
    num.h.textContent = pad(Math.floor(left / 3600000) % 24);
    num.m.textContent = pad(Math.floor(left / 60000) % 60);
    num.s.textContent = pad(Math.floor(left / 1000) % 60);
  };

  // Premier rendu immédiat : le cadre a sa taille définitive avant que
  // les mascottes ne soient assises sur son bord bas
  tick();
  if (WEDDING_DATE - Date.now() > 0) timer = setInterval(tick, 1000);
}

startCountdown();

/* ---------- Pose finale au RSVP (partagée scroll / célébration) ---------- */

// Dispose les mascottes autour d'un point d'intérêt : de part et d'autre
// du bouton (ou de la carte) s'il y a la place, sinon perchées sur le bord
// haut de la carte — chacune centrée à 20 % de son propre bord, symétrie
// oblige. btn et card sont des rectangles document (docRect ou calculés).
function layoutPoses(btn, card) {
  const h = mascotH();
  const wA = h * MASCOTS.a.ratio;
  const wB = h * MASCOTS.b.ratio;
  const vw = document.documentElement.clientWidth;
  const flanksFit = btn.left - wA - 14 >= 8 && btn.right + 14 + wB <= vw - 8;

  if (flanksFit) {
    return {
      card,
      a: { x: btn.left - wA - 14, y: btn.bottom - h },
      b: { x: btn.right + 14, y: btn.bottom - h },
      armA: -95,
      armB: 95,
    };
  }
  return {
    card,
    a: { x: card.left + card.width * 0.2 - wA / 2, y: card.top - h },
    b: { x: card.left + card.width * 0.8 - wB / 2, y: card.top - h },
    armA: -35,
    armB: 35,
  };
}

function rsvpPoses() {
  const cardEl = document.getElementById('rsvp-card');
  if (!cardEl) return null;
  const btnEl = document.querySelector('#rsvp-button');
  const btn = btnEl && btnEl.offsetParent !== null ? btnEl : cardEl;
  return layoutPoses(docRect(btn), docRect(cardEl));
}

/* ---------- Célébration post-RSVP ---------- */

let celebrating = false;

function swapToSuccess() {
  document.getElementById('rsvp-form').hidden = true;
  document.getElementById('rsvp-success').hidden = false;
}

// Hauteurs avant/après le morph : on montre furtivement le remerciement
// pour mesurer la hauteur cible (tout est synchrone, rien n'est peint)
function measureShrink(cardEl, form, success) {
  const startH = cardEl.offsetHeight;
  form.hidden = true;
  success.hidden = false;
  const endH = cardEl.offsetHeight;
  form.hidden = false;
  success.hidden = true;
  return { startH, endH, delta: Math.max(0, startH - endH) };
}

/* La boîte ne disparaît plus : son contenu s'efface et elle se resserre
   autour du mot de remerciement. Deux mises en scène, selon où se
   trouvent les mascottes au moment de l'envoi :
   — perchées sur le toit (mobile) : le bas de la carte reste fixe et le
     plafond tombe sous elles ; suspendues un instant dans le vide, elles
     chutent sur le nouveau toit et s'écrasent ;
   — au pied du bouton (desktop) : le haut reste fixe et le plancher
     remonte, les catapultant juste au-dessus du toit d'où elles
     retombent et s'écrasent.
   Ensuite, scénario commun : K.O. façon Minecraft, respawn en
   clignotant, puis la section verte se resserre (la marge qui compensait
   le delta pendant le spectacle est rendue en douceur, la carte glisse à
   sa place de repos avec ses passagers), applaudissements, retour en
   place. Pendant le spectacle, rien ne bouge autour de la section — pas
   de saut de scroll, pas de coupure d'image. */

function celebrate() {
  const form = document.getElementById('rsvp-form');
  const success = document.getElementById('rsvp-success');
  const cardEl = document.getElementById('rsvp-card');
  if (!form || !success || !cardEl) return;
  // Double-clic sur "J'envoie" pendant que la fête démarre : on ignore,
  // sinon la deuxième passe tuerait les tweens de la première en plein vol
  if (celebrating || form.hidden) return;

  const { startH, endH, delta } = measureShrink(cardEl, form, success);
  const rect = docRect(cardEl); // carte avant rétrécissement
  const h = mascotH();

  const cur = {
    a: { x: Number(gsap.getProperty('#mascot-a', 'x')), y: Number(gsap.getProperty('#mascot-a', 'y')) },
    b: { x: Number(gsap.getProperty('#mascot-b', 'x')), y: Number(gsap.getProperty('#mascot-b', 'y')) },
  };
  // Mascottes au-dessus du toit (perchées / en l'air) ou en bas ?
  const onTop = base.a.y + cur.a.y + h <= rect.top + h * 0.5;

  if (reducedMotion) {
    // Pas de compensation : échange immédiat, la section se resserre
    swapToSuccess();
    scheduleBuild();
    return;
  }

  // On libère les mascottes du scroll le temps de la fête ; le drapeau
  // bloque toute reconstruction (resize, barre d'adresse mobile…) qui
  // écraserait la célébration en cours
  celebrating = true;
  clearTimeout(buildTimer);
  if (master) {
    // kill(false) : surtout ne pas "revert" l'animation liée, sinon
    // ScrollTrigger renvoie les mascottes à leur état initial (siège du
    // hero) — téléportation invisible autrefois (l'ancienne séquence les
    // replaçait aussitôt), fatale ici où tout part de leur position
    if (master.scrollTrigger) master.scrollTrigger.kill(false);
    master.kill();
    master = null;
  }
  // Tue aussi les tweens des membres : un coucou (wave) encore en vol
  // écrirait sur les bras en même temps que le moulinet du crash
  gsap.killTweensOf([
    '#mascot-a', '#mascot-b',
    '#a-arm-l', '#a-arm-r', '#b-arm-l', '#b-arm-r',
    '#a-leg-l', '#a-leg-r', '#b-leg-l', '#b-leg-r',
  ]);
  // Ceinture et bretelles : on les refixe exactement où elles étaient
  gsap.set('#mascot-a', { x: cur.a.x, y: cur.a.y });
  gsap.set('#mascot-b', { x: cur.b.x, y: cur.b.y });

  // Marges de base : gonflées pendant le spectacle pour que rien ne
  // bouge autour de la section, puis rendues à la fin (glissé de repos)
  const cs = getComputedStyle(cardEl);
  const baseMt = parseFloat(cs.marginTop) || 0;
  const baseMb = parseFloat(cs.marginBottom) || 0;

  // Carte pendant le spectacle : bas fixe si elles sont sur le toit
  // (le plafond tombe), haut fixe sinon (le plancher remonte)
  const fTop = onTop ? rect.bottom - endH : rect.top;
  const fRect = {
    left: rect.left,
    right: rect.right,
    width: rect.width,
    top: fTop,
    bottom: fTop + endH,
    height: endH,
  };
  // Carte au repos, marge rendue : bord haut d'origine dans les deux cas
  const gRect = {
    left: rect.left,
    right: rect.right,
    width: rect.width,
    top: rect.top,
    bottom: rect.top + endH,
    height: endH,
  };
  const pose = layoutPoses(gRect, gRect); // pose finale (plus de bouton après envoi)

  const wA = h * MASCOTS.a.ratio;
  const cx = rect.left + rect.width / 2;
  const roofY = fRect.top - h;
  // Point de crash sur le toit : à la verticale de leur perchoir si elles
  // tombent, sinon groupées au centre du toit après la catapulte
  const aLand = onTop
    ? { x: cur.a.x, y: roofY - base.a.y }
    : { x: cx - wA - 3 - base.a.x, y: roofY - base.a.y };
  const bLand = onTop
    ? { x: cur.b.x, y: roofY - base.b.y }
    : { x: cx + 3 - base.b.x, y: roofY - base.b.y };
  // Position après le glissé de repos (sur mobile, le toit — et ses
  // passagers — remonte de delta quand la marge est rendue)
  const aRest = onTop ? { x: aLand.x, y: aLand.y - delta } : aLand;
  const bRest = onTop ? { x: bLand.x, y: bLand.y - delta } : bLand;
  const aEnd = { x: pose.a.x - base.a.x, y: pose.a.y - base.a.y };
  const bEnd = { x: pose.b.x - base.b.x, y: pose.b.y - base.b.y };

  const arms = ['#a-arm-l', '#a-arm-r', '#b-arm-l', '#b-arm-r'];
  const legs = ['#a-leg-l', '#a-leg-r', '#b-leg-l', '#b-leg-r'];
  const both = ['#mascot-a', '#mascot-b'];

  // Recadrage doux : pendant le glissé de repos, le viewport vient
  // centrer la carte pour que l'invité voie le tableau final. Jamais
  // bloquant : le moindre geste (molette, doigt, clavier) l'annule.
  let autoScrollOK = true;
  const cancelAutoScroll = () => { autoScrollOK = false; };
  const gestures = ['wheel', 'touchstart', 'pointerdown', 'keydown'];
  gestures.forEach((ev) => window.addEventListener(ev, cancelAutoScroll, { passive: true }));
  const dropGestures = () => gestures.forEach((ev) => window.removeEventListener(ev, cancelAutoScroll));

  // Position de scroll qui correspond EXACTEMENT à l'atterrissage : la carte
  // au repos (gRect) centrée dans le viewport. C'est elle qui pilote — la
  // reconstruction relira ce scroll et la chorégraphie (scène RSVP figée sur
  // sa pose finale au-delà de tPoint) reposera les mascottes là même où le
  // spectacle les laisse. « settling » : pendant le glissé la marge n'est pas
  // encore rendue, on retranche delta pour viser la hauteur de page FINALE.
  const landingScroll = (settling) => {
    const vh = window.innerHeight;
    const pageH = document.documentElement.scrollHeight - (settling ? delta : 0);
    const maxY = Math.max(0, pageH - vh);
    return gsap.utils.clamp(0, maxY, gRect.top + endH / 2 - vh / 2);
  };

  const tl = gsap.timeline({
    onComplete: () => {
      dropGestures();
      // Les valeurs inline valent alors leurs valeurs CSS : nettoyage sûr
      gsap.set(cardEl, { clearProps: 'height,marginTop,marginBottom' });
      celebrating = false;
      // On cale le scroll sur l'atterrissage AVANT de reconstruire : ainsi
      // master.progress(scroll) retombe pile sur la pose finale, aucun saut.
      // (Si l'invité a repris la main entre-temps, on respecte sa position.)
      if (autoScrollOK) window.scrollTo({ top: landingScroll(false), behavior: 'instant' });
      scheduleBuild(120);
    },
  });

  /* -- La boîte : le contenu s'efface, elle rétrécit, le mot arrive -- */

  tl.set(cardEl, { height: startH }, 0)
    .to(form, { opacity: 0, duration: 0.3, ease: 'power1.in' }, 0)
    .to(cardEl, {
      height: endH,
      ...(onTop ? { marginTop: baseMt + delta } : { marginBottom: baseMb + delta }),
      duration: 0.6,
      ease: 'power2.inOut',
    }, 0.2)
    .add(() => {
      gsap.set(success, { opacity: 0 });
      swapToSuccess();
    }, 0.72)
    .to(success, { opacity: 1, duration: 0.35, ease: 'power1.out' }, 0.85);

  /* -- Les mascottes : un seul plan-séquence, calé pour que les deux
        variantes s'écrasent au même moment (A à 1.3 s, B à 1.4 s) -- */

  // pose neutre en douceur (au cas où le scroll les a laissées penchées)
  tl.to(both, { scaleX: 1, scaleY: 1, rotation: 0, duration: 0.2 }, 0);

  if (onTop) {
    // Le plafond est parti : un temps de flottement, puis la gravité
    tl.to('#mascot-a', { y: aLand.y, duration: 0.45, ease: 'power2.in' }, 0.85)
      .to('#mascot-b', { y: bLand.y, duration: 0.45, ease: 'power2.in' }, 0.95);
  } else {
    // Le plancher les propulse au-dessus du toit, puis elles retombent
    const boost = gsap.utils.clamp(40, 90, delta * 0.25);
    tl.to('#mascot-a', { y: roofY - boost - base.a.y, duration: 0.7, ease: 'power1.out' }, 0.25)
      .to('#mascot-b', { y: roofY - boost - base.b.y, duration: 0.7, ease: 'power1.out' }, 0.33)
      .to('#mascot-a', { x: aLand.x, duration: 1.05, ease: 'power1.inOut' }, 0.25)
      .to('#mascot-b', { x: bLand.x, duration: 1.07, ease: 'power1.inOut' }, 0.33)
      .to('#mascot-a', { y: aLand.y, duration: 0.35, ease: 'power2.in' }, 0.95)
      .to('#mascot-b', { y: bLand.y, duration: 0.37, ease: 'power2.in' }, 1.03);
  }

  tl
    // bras et jambes qui moulinent jusqu'au crash
    .to(arms, {
      rotation: (i) => (i % 2 ? -150 : 150),
      transformOrigin: '50% 12%',
      duration: 0.09,
      yoyo: true,
      repeat: 11,
      ease: 'sine.inOut',
    }, 0.3)
    .to(legs, {
      rotation: (i) => (i % 2 ? 24 : -24),
      transformOrigin: '50% 10%',
      duration: 0.12,
      yoyo: true,
      repeat: 7,
      ease: 'sine.inOut',
    }, 0.3)
    // CRASH sur le toit…
    .to('#mascot-a', { scaleY: 0.12, scaleX: 1.9, transformOrigin: '50% 100%', duration: 0.09, ease: 'power4.out' }, 1.3)
    .to('#mascot-b', { scaleY: 0.12, scaleX: 1.9, transformOrigin: '50% 100%', duration: 0.09, ease: 'power4.out' }, 1.4)
    .set([...arms, ...legs], { rotation: 0 }, 1.51)
    // …K.O. : bascule sur le côté et fondu — vers l'INTÉRIEUR de la
    // carte quand elles sont perchées à ses bords, sinon Yosri (bord
    // droit) basculerait hors carte / hors écran, effet "glitch" ;
    // groupées au centre du toit, l'extérieur reste le bon côté
    .to(both, {
      rotation: (i) => (i ? 1 : -1) * (onTop ? -90 : 90),
      scaleY: 0.7,
      scaleX: 1.15,
      opacity: 0,
      transformOrigin: '50% 100%',
      duration: 0.55,
      ease: 'power1.in',
    }, 1.65)
    // …respawn en clignotant, comme il se doit (orientés comme la pose
    // finale de scroll pour que la reconstruction ne change rien)
    .set(both, { rotation: 0, scaleX: 1, scaleY: 1, opacity: 0 }, 2.4)
    .set('#a-inner', { scaleX: 1 }, 2.4)
    .set('#b-inner', { scaleX: -1 }, 2.4)
    .to(both, { opacity: 1, duration: 0.08, yoyo: true, repeat: 4, ease: 'none' }, 2.45)
    .set(both, { opacity: 1 }, 2.9);

  /* -- La section verte se resserre : la marge qui compensait le delta
        est rendue, la carte glisse à sa place de repos — sur mobile les
        mascottes voyagent avec le toit -- */

  tl.to(cardEl, {
    ...(onTop ? { marginTop: baseMt } : { marginBottom: baseMb }),
    duration: 0.55,
    ease: 'power2.inOut',
  }, 2.95);
  if (onTop) {
    tl.to('#mascot-a', { y: aRest.y, duration: 0.55, ease: 'power2.inOut' }, 2.95)
      .to('#mascot-b', { y: bRest.y, duration: 0.55, ease: 'power2.inOut' }, 2.95);
  }

  // Le recadrage accompagne le glissé : cible calculée sur la carte au
  // repos (gRect), création paresseuse pour partir du scroll du moment.
  // behavior:'instant' à chaque tick — sans lui, le scroll-behavior:smooth
  // du CSS lisserait chaque pas et transformerait le tween en bouillie.
  tl.add(() => {
    if (!autoScrollOK) return; // l'invité a déjà repris la main
    const target = landingScroll(true); // marge pas encore rendue → settling
    if (Math.abs(target - window.scrollY) < 30) return; // déjà bien cadré
    const pos = { y: window.scrollY };
    gsap.to(pos, {
      y: target,
      duration: 0.9,
      ease: 'power2.inOut',
      onUpdate() {
        if (!autoScrollOK) {
          this.kill();
          return;
        }
        window.scrollTo({ top: pos.y, behavior: 'instant' });
      },
    });
  }, 2.95);

  tl
    // applaudissements + petits sauts de joie
    .to(['#a-arm-l', '#b-arm-l'], { rotation: -50, transformOrigin: '50% 12%', duration: 0.11, yoyo: true, repeat: 7, ease: 'sine.inOut' }, 3.55)
    .to(['#a-arm-r', '#b-arm-r'], { rotation: 50, transformOrigin: '50% 12%', duration: 0.11, yoyo: true, repeat: 7, ease: 'sine.inOut' }, 3.55)
    .to(both, { y: '-=10', duration: 0.14, yoyo: true, repeat: 5, ease: 'power1.out' }, 3.6);

  // chacun regagne sa place — inutile quand le crash EST la place finale
  // (chute verticale sur mobile : elles atterrissent sur leur perchoir)
  const hop = (el, from, to, at) => {
    if (Math.abs(to.x - from.x) < 4 && Math.abs(to.y - from.y) < 4) return;
    // Même garde-fou que jump() : pour un grand saut, un pic calé sur le
    // point haut ferait une épingle que la courbe compenserait par un
    // débordement latéral (le groom qui part sur le côté). On mélange donc
    // le pic vers le milieu à mesure que le saut s'allonge.
    const span = Math.hypot(to.x - from.x, to.y - from.y);
    const blend = gsap.utils.clamp(0, 1, span / 500);
    const ctrlY = gsap.utils.interpolate(Math.min(from.y, to.y) - 45, (from.y + to.y) / 2 - 45, blend);
    tl.to(el, {
      motionPath: {
        path: [{ x: (from.x + to.x) / 2, y: ctrlY }, to],
        curviness: 1.2,
      },
      duration: 0.4,
      ease: 'power1.inOut',
    }, at);
  };
  hop('#mascot-a', aRest, aEnd, 4.55);
  hop('#mascot-b', bRest, bEnd, 4.62);

  // bras pointés vers la carte, comme la pose de scroll — la
  // reconstruction qui suit retrouve exactement cet état
  tl.to('#a-arm-r', { rotation: pose.armA, transformOrigin: '50% 12%', duration: 0.25, ease: 'power1.inOut' }, 5.02)
    .to('#b-arm-l', { rotation: pose.armB, transformOrigin: '50% 12%', duration: 0.25, ease: 'power1.inOut' }, 5.02);
}

/* ---------- Galerie : apparition des polaroids ---------- */

function revealGallery() {
  if (reducedMotion) return;
  gsap.utils.toArray('.polaroid').forEach((el, i) => {
    gsap.from(el, {
      y: 46,
      opacity: 0,
      duration: 0.7,
      ease: 'power2.out',
      delay: (i % 4) * 0.08,
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });
}

/* ============================================================
   Chorégraphie ScrollTrigger
   ------------------------------------------------------------
   Une seule timeline maîtresse (durée 1) scrubbée sur toute la
   hauteur de la page : chaque scène est placée à la fraction de
   défilement où sa section devient visible. Les positions sont
   des offsets x/y (transform) par rapport au siège du hero, donc
   tout est recalculé/reconstruit au resize. scrub → remonter la
   page rejoue tout à l'envers proprement.
   ============================================================ */

let master = null;

function buildScenes() {
  if (reducedMotion) return;

  if (master) {
    if (master.scrollTrigger) master.scrollTrigger.kill();
    master.kill();
    master = null;
  }

  // Pose neutre avant mesures/reconstruction — après célébration on
  // reset à la pose RSVP mesurée live plutôt qu'au hero : les mascottes
  // sont déjà là (onComplete les y a calées), donc aucun saut visible.
  const formEl = document.getElementById('rsvp-form');
  const submitted = formEl ? formEl.hidden : false;
  const prepose = submitted ? rsvpPoses() : null;
  if (prepose) {
    gsap.set('#mascot-a', { x: prepose.a.x - base.a.x, y: prepose.a.y - base.a.y, scaleX: 1, scaleY: 1, rotation: 0 });
    gsap.set('#mascot-b', { x: prepose.b.x - base.b.x, y: prepose.b.y - base.b.y, scaleX: 1, scaleY: 1, rotation: 0 });
    gsap.set('#a-inner', { scaleX: 1, transformOrigin: '50% 50%' });
    gsap.set('#b-inner', { scaleX: -1, transformOrigin: '50% 50%' });
    gsap.set(['#a-leg-l', '#a-leg-r', '#b-leg-l', '#b-leg-r'], { rotation: 0 });
    gsap.set('#a-arm-r', { rotation: prepose.armA, transformOrigin: '50% 12%' });
    gsap.set('#b-arm-l', { rotation: prepose.armB, transformOrigin: '50% 12%' });
  } else {
    gsap.set(['#mascot-a', '#mascot-b'], { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 });
    gsap.set(['#a-inner', '#b-inner'], { scaleX: 1, transformOrigin: '50% 50%' });
    gsap.set(['#a-leg-l', '#a-leg-r', '#b-leg-l', '#b-leg-r'], { rotation: 0 });
    gsap.set(['#a-arm-r', '#b-arm-l'], { rotation: 0 });
  }

  const required = ['#story-frame', '.schedule-card', '#map-frame'];
  if (required.some((s) => !document.querySelector(s))) return;

  const pose = rsvpPoses();
  if (!pose) return;

  const vh = window.innerHeight;
  const total = Math.max(1, document.documentElement.scrollHeight - vh);
  const F = (scrollPos) => gsap.utils.clamp(0.001, 0.985, scrollPos / total);
  const D = (x) => Math.max(0.003, x);

  const sf = docRect('#story-frame');
  const cards = Array.from(document.querySelectorAll('.schedule-card')).map(docRect);
  const map = docRect('#map-frame');

  const h = mascotH();
  const JUMP = isMobile() ? 60 : 90;
  const A = { key: 'a', ...MASCOTS.a, w: h * MASCOTS.a.ratio, pos: { x: 0, y: 0 } };
  const B = { key: 'b', ...MASCOTS.b, w: h * MASCOTS.b.ratio, pos: { x: 0, y: 0 } };

  // Coordonnées document → offset transform depuis le siège du hero
  const O = (key, x, y) => ({ x: x - base[key].x, y: y - base[key].y });

  master = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      id: 'mascot-master',
      // Scrub numérique sur toute la hauteur de la page — pas d'élément
      // déclencheur, donc pas de mesure qui puisse donner NaN
      start: 0,
      end: 'max',
      scrub: 0.7,
    },
  });
  // Cale la durée totale à 1 pour que les fractions collent au défilement
  master.to({ _: 0 }, { _: 1, duration: 1 }, 0);

  const flip = (m, dir, at) => {
    master.set(m.inner, { scaleX: dir, transformOrigin: '50% 50%' }, at);
  };

  // Déplacement simple (sans cycle de course)
  const move = (m, to, at, dur, vars) => {
    master.to(m.el, { x: to.x, y: to.y, duration: D(dur), ...vars }, at);
    m.pos = to;
  };

  // Course : translation + cycle de jambes, flip selon la direction
  const run = (m, to, at, dur, cycles) => {
    if (to.x !== m.pos.x) flip(m, to.x < m.pos.x ? -1 : 1, at);
    master.to(m.el, { x: to.x, y: to.y, duration: D(dur) }, at);
    const n = cycles * 2 + 1;
    master.to(m.legs, {
      rotation: (i) => (i ? 22 : -22),
      transformOrigin: '50% 10%',
      yoyo: true,
      repeat: n,
      ease: 'sine.inOut',
      duration: D(dur) / (n + 1),
    }, at);
    m.pos = to;
  };

  // Saut en arc (MotionPath) + squash & stretch à l'atterrissage
  const jump = (m, to, at, dur, opts = {}) => {
    dur = D(dur);
    if (to.x !== m.pos.x) flip(m, to.x < m.pos.x ? -1 : 1, at);
    // Point de contrôle de l'arc. Pour un petit saut, on cale le pic
    // juste au-dessus du point le plus haut : bel arc « par-dessus ».
    // Pour un GRAND saut (ex. de la galerie à la 1re carte, ~2300 px),
    // ce pic près du sommet crée une épingle à cheveux que la courbe
    // MotionPath compense par un débordement latéral de ~300 px hors
    // écran, puis retour — LE « glitch » (Yosri part à droite et revient).
    // On rapproche donc le pic du milieu à mesure que le saut s'allonge :
    // les hops courts gardent leur arc, les longs descendent droit, sans
    // épingle ni écart latéral.
    const span = Math.hypot(to.x - m.pos.x, to.y - m.pos.y);
    const blend = gsap.utils.clamp(0, 1, span / 500);
    const peakY = Math.min(m.pos.y, to.y) - JUMP;   // arc au-dessus (courts)
    const midY = (m.pos.y + to.y) / 2 - JUMP;        // pas d'épingle (longs)
    const ctrlY = gsap.utils.interpolate(peakY, midY, blend);
    master.to(m.el, {
      motionPath: {
        path: [
          { x: (m.pos.x + to.x) / 2, y: ctrlY },
          { x: to.x, y: to.y },
        ],
        curviness: 1.3,
      },
      duration: dur,
      ...opts,
    }, at);
    master.to(m.legs, { rotation: (i) => (i ? -16 : 16), transformOrigin: '50% 10%', duration: dur * 0.4 }, at)
      .to(m.legs, { rotation: 0, duration: dur * 0.3 }, at + dur * 0.7);
    master.to(m.el, { scaleY: 0.8, scaleX: 1.14, transformOrigin: '50% 100%', duration: dur * 0.3 }, at + dur)
      .to(m.el, { scaleY: 1, scaleX: 1, duration: dur * 0.35 }, at + dur * 1.3);
    m.pos = to;
  };

  // Jalons croissants garantis (marge mini entre scènes)
  let cursor = 0;
  const seq = (v) => (cursor = Math.max(v, cursor + 0.008));

  /* --- 2. Notre histoire : Eya poursuivie par Yosri sur le cadre --- */

  const tHop = seq(F(sf.top - vh * 1.1));
  const tChase = seq(F(sf.top - vh * 0.85));
  const tTop = seq(F(sf.top - vh * 0.5));
  const tDown = seq(F(sf.bottom - vh * 0.55));

  jump(A, O('a', sf.left + 4, sf.top - h), tHop, (tChase - tHop) * 0.6);
  run(A, O('a', sf.right - A.w - 4, sf.top - h), tChase, tTop - tChase, isMobile() ? 3 : 5);
  if (isMobile()) {
    // Descente en un saut : suivre le contenu visible plutôt que de
    // rester perchés sur un bord qui sort de l'écran
    jump(A, O('a', sf.right - A.w - 8, sf.bottom - h), tTop, (tDown - tTop) * 0.5);
  } else {
    run(A, O('a', sf.right - A.w * 0.6, sf.bottom - h), tTop, tDown - tTop, 2);
  }

  const bLag = D((tTop - tChase) * 0.22);
  jump(B, O('b', sf.left + 4, sf.top - h), tHop + bLag, (tChase - tHop) * 0.6);
  run(B, O('b', sf.right - A.w - B.w - 14, sf.top - h), tChase + bLag, tTop - tChase - bLag, isMobile() ? 3 : 4);
  if (isMobile()) {
    jump(B, O('b', sf.right - A.w - B.w - 20, sf.bottom - h), tTop + bLag, (tDown - tTop) * 0.5);
  } else {
    run(B, O('b', sf.right - B.w * 0.6, sf.bottom - h - 40), tTop + bLag, tDown - tTop - bLag, 2);
  }

  /* --- 2bis. Photos : pause perchés sur les polaroids --- */

  if (document.querySelector('#gallery .polaroids')) {
    const gal = docRect('#gallery .polaroids');
    const tGal = seq(F(gal.top - vh * 0.7));
    const tGalEnd = seq(F(gal.top - vh * 0.45));
    jump(A, O('a', gal.left + gal.width * 0.28, gal.top - h), tGal, (tGalEnd - tGal) * 0.6);
    jump(B, O('b', gal.left + gal.width * 0.55, gal.top - h), tGal + (tGalEnd - tGal) * 0.25, (tGalEnd - tGal) * 0.6);
  }

  /* --- 3. Programme : sauts de carte en carte --- */

  // Chaque saut est calé sur l'entrée de SA carte dans l'écran, pour que
  // les mascottes restent toujours visibles — avant, la scène s'étalait
  // et elles sautaient hors champ. Le saut démarre un peu plus tôt (85 %
  // de la hauteur) et s'étale sur plus de défilement (dJ plus grand) :
  // l'arc est plus lent et plus doux sans quitter le cadre.
  const dJ = 0.02;
  cards.forEach((c) => {
    const at = (cursor = Math.max(F(c.top - vh * 0.85), cursor + 0.026));
    jump(A, O('a', c.left + c.width * 0.3 - A.w / 2, c.top - h), at, dJ);
    jump(B, O('b', c.left + c.width * 0.68 - B.w / 2, c.top - h), at + dJ * 0.6, dJ);
  });
  cursor += 0.026;

  /* --- 4. Lieu : Eya assise sur le cadre de la carte, Yosri joue à cache-cache --- */

  const tV = seq(F(map.top - vh * 0.8));
  const tVmid = seq(F(map.top - vh * 0.55));
  const tPeek = seq(F(map.top - vh * 0.4));
  const tPeekEnd = seq(F(map.top - vh * 0.22));

  jump(A, O('a', map.left + map.width * 0.12, map.top - h * MASCOTS.a.seat), tV, (tVmid - tV) * 0.8);
  // Yosri saute derrière le cadre (z-index de la carte > calque) puis dépasse
  jump(B, O('b', map.right - B.w - 8, map.top + map.height * 0.25), tV + (tVmid - tV) * 0.3, (tVmid - tV) * 0.7);
  if (isMobile()) {
    // Coucou vertical : la tête surgit au-dessus du coin haut droit
    // (le coucou latéral déborderait de l'écran sur mobile)
    move(B, O('b', map.right - B.w - 8, map.top - h * 0.45), tPeek, tPeekEnd - tPeek, {
      ease: 'power1.inOut',
    });
  } else {
    move(B, O('b', map.right - B.w * 0.35, map.top + map.height * 0.2), tPeek, tPeekEnd - tPeek, {
      rotation: -12,
      transformOrigin: '50% 85%',
      ease: 'power1.inOut',
    });
  }

  /* --- 5. RSVP : pointage (pose partagée avec la célébration) --- */

  // Après l'envoi (formulaire caché), la scène est ancrée plus tôt : dès
  // que la carte pointe à l'écran la pose est déjà finale. Sans ça, la
  // reconstruction post-célébration — la carte rétrécie ayant son bord
  // haut bien plus bas — renverrait une mascotte en plein saut
  // (téléportation visible) alors que celebrate() vient de la poser.
  const rsvpTop = submitted ? pose.card.top - vh * 0.6 : pose.card.top;
  const tR = seq(F(rsvpTop - vh * 0.85));
  const tRmid = seq(F(rsvpTop - vh * 0.55));
  const tPoint = seq(F(rsvpTop - vh * 0.4));

  master.to(B.el, { rotation: 0, duration: 0.004 }, tR);

  jump(A, O('a', pose.a.x, pose.a.y), tR, (tRmid - tR) * 0.6);
  jump(B, O('b', pose.b.x, pose.b.y), tR + (tRmid - tR) * 0.2, (tRmid - tR) * 0.6);
  flip(A, 1, tPoint);
  flip(B, -1, tPoint);
  master.to('#a-arm-r', { rotation: pose.armA, transformOrigin: '50% 12%', duration: 0.012 }, tPoint);
  master.to('#b-arm-l', { rotation: pose.armB, transformOrigin: '50% 12%', duration: 0.012 }, tPoint);
}

/* ---------- Init ---------- */

// Sérialise les reconstructions (load / fonts / resize peuvent arriver
// presque en même temps) : un seul build, puis refresh global.
let buildTimer;
function scheduleBuild(delay = 120) {
  clearTimeout(buildTimer);
  buildTimer = setTimeout(() => {
    // Pas de reconstruction pendant la célébration post-RSVP
    if (celebrating) return;
    placeHeroMascots();
    buildScenes();
    ScrollTrigger.refresh();
    // Rendu immédiat à la position de scroll courante : sans ça, la
    // reconstruction repart du hero et les mascottes disparaissent
    // puis "volent" vers leur pose (flash visible). Il faut aussi
    // terminer le tween de lissage du scrub, sinon il rejoue le vol.
    if (master && master.scrollTrigger) {
      const st = master.scrollTrigger;
      master.progress(st.progress);
      const smoothing = typeof st.getTween === 'function' ? st.getTween() : null;
      if (smoothing) smoothing.progress(1);
    }

  }, delay);
}

window.addEventListener('load', () => {
  startIdle('a');
  startIdle('b');
  revealGallery();
  scheduleBuild();
});

// Repositionner + reconstruire quand la police script finit de charger
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => scheduleBuild());
}

// Sur téléphone, la barre d'adresse qui se replie/déplie au fil du scroll
// déclenche des resize « hauteur seule » : innerHeight change mais pas la
// page (100vh reste calé sur le grand viewport). Reconstruire remapperait
// alors la progression du scrub et téléporterait les mascottes en pleine
// scène — le « glitch » observé sur le site déployé. On ne reconstruit
// que si la largeur change ou si la hauteur varie franchement (rotation,
// clavier, vraie fenêtre redimensionnée) ; lastVh n'est mis à jour qu'à
// la reconstruction pour que les petites variations ne s'accumulent pas.
let lastVw = window.innerWidth;
let lastVh = window.innerHeight;
window.addEventListener('resize', () => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (vw === lastVw && Math.abs(vh - lastVh) < 150) return;
  lastVw = vw;
  lastVh = vh;
  scheduleBuild(250);
});
