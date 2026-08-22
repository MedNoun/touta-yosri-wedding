/* ============================================================
   Eya & Yosri — scripts
   ------------------------------------------------------------
   Aucune dépendance. GSAP, ScrollTrigger, SplitText et Lenis ont
   été retirés : 79 ko de moins, un CDN de moins, et surtout plus
   de ticker permanent. Le ticker de GSAP garde une boucle
   requestAnimationFrame en vie pour toujours dès que ScrollTrigger
   existe — mesuré à ~64 appels/seconde page à l'arrêt. Sur un
   téléphone c'est de la batterie brûlée pour rien.

   Ce qui les remplace :
   · révélations      → IntersectionObserver + transition CSS
   · titres           → balayage par masque CSS (@property)
   · entrée du hero   → transitions CSS échelonnées (html.is-open)
   · lanternes        → UNE variable CSS (--rise), écrite par la
                        boucle du ciel ; chaque lanterne en déduit sa
                        position, côté compositeur, pas côté JS
   · repli RSVP       → transition CSS sur la hauteur mesurée
   · défilement       → natif. Sur iOS il est plus fluide que tout
                        ce que JS peut lui superposer, et c'était la
                        première cause de « ça rame sur mon téléphone ».

   GARDE DE ROBUSTESSE
   Tout le contenu est visible par défaut. Les états cachés ne
   s'appliquent QUE sous html.js-anim, posée une image après le
   démarrage. Sans JS, ou sur une erreur d'init, rien ne reste
   jamais en blanc.
   ============================================================ */

(() => {
  'use strict';

  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const animate = !reduced;

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  scrollTo(0, 0);

  /* On ne cache les éléments à révéler qu'après une image : si le rAF
     ne tourne jamais, le contenu reste visible. */
  if (animate) requestAnimationFrame(() => root.classList.add('js-anim'));

  /* ============================================================
     Ouverture + musique
     ============================================================ */

  const overlay = document.getElementById('overlay');
  const audio = document.getElementById('bg-music');
  const musicBtn = document.getElementById('music-toggle');

  function updateMusicUI() {
    if (!audio || !musicBtn) return;
    const playing = !audio.paused && !audio.muted;
    musicBtn.classList.toggle('is-playing', playing);
    musicBtn.setAttribute('aria-pressed', String(playing));
  }

  let opened = false;

  function openInvitation() {
    if (opened || !overlay) return;
    opened = true;
    overlay.classList.add('is-open');
    document.body.classList.remove('locked');
    setTimeout(() => { overlay.remove(); }, 1000);

    if (audio) {
      // preload="none" en HTML : le fichier ne part qu'ici, au geste,
      // qui est de toute façon la seule chose qui autorise la lecture.
      audio.volume = 0.5;
      audio.load();
      audio.play().then(updateMusicUI).catch(updateMusicUI);
    }

    root.classList.add('is-open');   // déclenche l'entrée du hero (CSS)
    if (window.__sky) window.__sky.remeasure();
  }

  if (overlay) {
    overlay.addEventListener('click', openInvitation);
    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openInvitation(); }
    });
  } else {
    document.body.classList.remove('locked');
    root.classList.add('is-open');
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

  /* ============================================================
     Compte à rebours
     ============================================================ */

  const WEDDING_DATE = new Date('2026-09-26T20:00:00+01:00');

  (function countdown() {
    const box = document.getElementById('hero-countdown');
    if (!box) return;
    const cells = {
      d: document.getElementById('cd-days'),
      h: document.getElementById('cd-hours'),
      m: document.getElementById('cd-mins'),
      s: document.getElementById('cd-secs'),
    };
    const pad = (n) => String(n).padStart(2, '0');
    let timer = null;

    const set = (el, val) => {
      if (!el || el.textContent === val) return;
      el.textContent = val;
      if (!animate) return;
      // Le roulement du chiffre est une animation CSS, relancée en
      // retirant puis remettant la classe.
      el.classList.remove('is-tick');
      void el.offsetWidth;
      el.classList.add('is-tick');
    };

    const tick = () => {
      const left = WEDDING_DATE - Date.now();
      if (left <= 0) {
        const done = document.createElement('span');
        done.className = 'cd-done';
        done.textContent = "C'est le grand jour";
        box.replaceChildren(done);
        if (timer) clearInterval(timer);
        return;
      }
      set(cells.d, String(Math.floor(left / 86400000)));
      set(cells.h, pad(Math.floor(left / 3600000) % 24));
      set(cells.m, pad(Math.floor(left / 60000) % 60));
      set(cells.s, pad(Math.floor(left / 1000) % 60));
    };

    tick();
    if (WEDDING_DATE - Date.now() > 0) timer = setInterval(tick, 1000);
  })();

  /* ============================================================
     Révélations au défilement
     L'IntersectionObserver recalcule ses seuils tout seul : une page
     qui grandit après coup (images chargées, carte RSVP repliée) ne
     peut pas laisser un élément coincé à opacity 0.
     ============================================================ */

  function buildReveals() {
    const items = [...document.querySelectorAll('.reveal, [data-split]')]
      .filter((el) => !el.closest('#hero'));
    if (!items.length) return;

    const io = new IntersectionObserver((entries, obs) => {
      let n = 0;
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.style.setProperty('--rd', (n++ * 80) + 'ms');
        e.target.classList.add('is-in');
        obs.unobserve(e.target);
      }
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.01 });

    for (const el of items) io.observe(el);
  }

  /* ============================================================
     LA NUIT DES LANTERNES
     ------------------------------------------------------------
     Chaque lanterne est un dessin (<symbol id="lantern-body"> dans
     index.html) : huit panneaux, coutures visibles, cerceaux, panier
     de fil, flamme sur sa propre timeline CSS. Le halo est un dégradé
     peint UNE fois derrière elle — pas un `filter` animé, qui
     repeindrait à chaque image.

     La montée ne coûte AUCUN travail JS par lanterne. La boucle du
     ciel écrit une seule variable, --rise, et chaque lanterne en
     déduit sa position selon sa profondeur :

         translate3d(0, calc(var(--y0) + var(--rise) * var(--sp)), 0)

     Placement par rejet : distance minimale entre voisines, et la
     zone de la lune reste libre pour celles qui montent haut — sinon
     elles finissent collées dessus.
     ============================================================ */

  const MOON = { x: 21, pad: 15 };   // en % de largeur, cf. .sky-layer[data-t="4"]

  function svgEl(tag, attrs) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
    return el;
  }

  function placeLanterns(n) {
    const out = [];
    let guard = 0;
    while (out.length < n && guard++ < 900) {
      const depth = Math.random();                 // 0 = loin, 1 = proche
      const w = 26 + depth * 74;                   // 26–100 px
      const speed = 0.55 + depth * 1.05;           // les proches montent plus haut
      const lift = Math.random() * 0.5;            // départ échelonné
      const x = 2 + Math.random() * 94;

      if (speed > 0.95 && Math.abs(x - MOON.x) < MOON.pad) continue;

      const minGap = 5 + (w / innerWidth) * 90;
      if (out.some((o) => Math.abs(o.x - x) < minGap && Math.abs(o.speed - speed) < 0.45)) continue;

      out.push({ x, w, speed, depth, lift });
    }
    return out;
  }

  function buildLanterns() {
    const field = document.querySelector('.lantern-field');
    if (!field) return;

    const n = innerWidth < 640 ? 6 : 14;
    const frag = document.createDocumentFragment();

    for (const l of placeLanterns(n)) {
      const el = document.createElement('div');
      el.className = 'lantern';
      el.style.setProperty('--x', l.x + '%');
      el.style.setProperty('--w', l.w + 'px');
      el.style.setProperty('--sp', (l.speed + l.lift).toFixed(3));
      el.style.setProperty('--y0', (-l.lift * 55).toFixed(1) + 'vh');
      el.style.setProperty('--o', (0.42 + l.depth * 0.58).toFixed(2));
      // Les lointaines vacillent et se balancent plus lentement.
      el.style.setProperty('--fl', (3.4 - l.depth * 1.2).toFixed(2) + 's');
      el.style.setProperty('--sw', (7.6 - l.depth * 2.6).toFixed(2) + 's');
      el.style.setProperty('--sx', (9 + l.depth * 17).toFixed(0) + 'px');
      // Délai négatif : chacune démarre à un point différent du cycle,
      // sinon elles se balancent toutes en phase.
      el.style.setProperty('--sd', (-Math.random() * 8).toFixed(2) + 's');

      const halo = document.createElement('div');
      halo.className = 'lantern-halo';

      const svg = svgEl('svg', { viewBox: '0 0 60 84' });
      svg.appendChild(svgEl('use', { href: '#lantern-body' }));

      /* La flamme est dessinée ICI, pas dans le <symbol> : les
         sélecteurs CSS n'entrent pas dans l'arbre fantôme d'un <use>,
         seules les propriétés héritées le font. Hors du symbole,
         .flame redevient stylable. */
      const flame = svgEl('g', { class: 'flame' });
      flame.append(
        svgEl('ellipse', { cx: 30, cy: 60, rx: 4.6, ry: 7.2, fill: '#FFF0C4', opacity: '.8' }),
        svgEl('ellipse', { cx: 30, cy: 61, rx: 2.2, ry: 4.2, fill: '#FFFDF2' }),
      );
      svg.appendChild(flame);

      el.append(halo, svg);
      frag.appendChild(el);
    }
    field.appendChild(frag);
  }

  /* ============================================================
     RSVP → Google Form
     ============================================================ */

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
  let sending = false;

  if (rsvpForm) {
    rsvpForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (sending) return;
      if (!rsvpForm.reportValidity()) return;

      const data = new FormData(rsvpForm);
      if (data.get('_gotcha')) return;

      const values = {
        name: data.get('name') || '',
        attendance: data.get('attendance') || '',
        plusone: data.get('plusone') ? 'Oui, +1' : 'Non',
        // Le champ « allergies » a été retiré du formulaire ; l'entrée
        // part vide pour ne rien casser côté Google Form.
        diet: '',
        message: data.get('message') || '',
      };

      const body = new URLSearchParams();
      for (const [key, entry] of Object.entries(GOOGLE_FORM.fields)) {
        body.append(entry, values[key] || '');
      }
      fetch(GOOGLE_FORM.action, { method: 'POST', mode: 'no-cors', body }).catch(() => {});

      const success = document.getElementById('rsvp-success');
      success.querySelector('.rsvp-success-text').textContent =
        values.attendance.startsWith('Avec joie')
          ? 'Votre réponse est bien partie — nous avons déjà hâte de vous voir sous les lanternes.'
          : "Merci d'avoir pris le temps de répondre — vous nous manquerez.";

      celebrate();
    });
  }

  /* La carte se referme sur le remerciement. On mesure la hauteur
     d'arrivée avant d'animer, puis une transition CSS fait le trajet :
     pas de tween JS, donc aucune boucle ouverte. */
  function celebrate() {
    const form = document.getElementById('rsvp-form');
    const success = document.getElementById('rsvp-success');
    const card = document.getElementById('rsvp-card');
    if (!form || !success || !card || form.hidden) return;
    const intro = card.querySelector('.rsvp-text');

    const swap = () => {
      form.hidden = true;
      success.hidden = false;
      if (intro) intro.hidden = true;
    };

    if (!animate) { swap(); return; }

    sending = true;

    // Mesure : hauteur de départ, puis hauteur d'arrivée, puis retour
    // à l'état de départ pour pouvoir transiter entre les deux.
    const startH = card.offsetHeight;
    swap();
    const endH = card.offsetHeight;
    form.hidden = false;
    success.hidden = true;
    if (intro) intro.hidden = false;

    card.style.height = startH + 'px';
    card.style.overflow = 'hidden';

    requestAnimationFrame(() => {
      card.classList.add('is-closing');
      form.classList.add('is-out');
      if (intro) intro.classList.add('is-out');

      setTimeout(() => {
        swap();
        success.classList.add('is-in');
        card.style.height = endH + 'px';
      }, 300);

      setTimeout(() => {
        card.style.height = '';
        card.style.overflow = '';
        card.classList.remove('is-closing');
        sending = false;
        if (window.__sky) window.__sky.remeasure();
      }, 1250);
    });
  }

  /* ============================================================
     Init
     ============================================================ */

  function init() {
    try {
      buildReveals();
      buildLanterns();
      if (window.__sky) window.__sky.remeasure();
    } catch (err) {
      console.warn('[init] repli, révélation complète :', err);
      root.classList.remove('js-anim');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
