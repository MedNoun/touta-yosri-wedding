/* ============================================================
   Eya & Yosri — LE FONDU DU JOUR
   ------------------------------------------------------------
   Remplace l'ancien shader WebGL plein écran. Le fond est
   maintenant CINQ ciels dessinés à la main (css/styles.css,
   section 3), empilés en position fixe : on croise leurs
   opacités au défilement.

     16h porcelaine → heure dorée → crépuscule
                    → heure bleue → la nuit

   Pourquoi c'est mieux, et pas seulement moins cher :
   · un ciel dessiné peut être BEAU ; une interpolation
     paramétrique entre six teintes traversait le bilieux,
   · plus aucun disque à bord dur en guise de soleil ou de lune :
     uniquement des lueurs à retombée douce,
   · plus de grille d'étoiles : un vrai champ, peint une fois.

   COÛT
   Cinq calques composités dont seule l'opacité change — le
   compositeur s'en charge, sans repeindre. La boucle n'est
   armée que par un événement (scroll, resize) et rend UNE image
   avant de s'éteindre : zéro image calculée à l'arrêt, quelle
   que soit la durée de la visite.

   Le défilement ne pilote plus la montée des lanternes : elles
   ont leur propre horloge (une animation CSS sans fin, cf.
   css/styles.css §13). Il ne reste ici que --lanterns, l'opacité
   du plan, qui suit la tombée de la nuit comme --stars.

   CONTRAT PARTAGÉ (window.__sky)
     · setProgress(p) — force la progression [0..1]
     · remeasure()    — re-mesure les bornes (appelé par main.js
                        à chaque ScrollTrigger.refresh)
     · progress()     — lecture
   ============================================================ */

(() => {
  const root = document.documentElement;
  const sky = document.getElementById('sky');
  if (!sky) return;

  const LAYERS = 5;                    // --w0 .. --w4
  const NIGHT_FROM = 0.74;             // les étoiles s'allument ici (nuit franche)
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Chaque section reçoit la valeur du fondu qu'elle doit atteindre.
     La transition se joue sur la fenêtre qui précède son entrée. */
  const STOPS = [
    ['#story', 0.10],
    ['#gallery', 0.24],    // « L'heure dorée » tombe pile à l'heure dorée
    ['#schedule', 0.36],
    ['#venue', 0.58],
    ['#rsvp', 0.82],
    ['.footer', 1.00],
  ];

  let segments = [];
  let current = -1;

  /* Le plan des lanternes s'allume avec la nuit, comme les étoiles. */
  const LANTERNS_FROM = 0.60;
  const LANTERNS_TO = 0.82;

  function measure() {
    const vh = innerHeight;
    let previous = 0;
    segments = [];
    for (const [selector, value] of STOPS) {
      const el = document.querySelector(selector);
      if (!el) continue;
      const top = el.getBoundingClientRect().top + scrollY;
      segments.push({
        start: top - vh * 0.92,
        end: top - vh * 0.34,
        from: previous,
        to: value,
      });
      previous = value;
    }
  }

  function progressAt(y) {
    let p = 0;
    for (const s of segments) {
      if (y <= s.start) break;
      p = y >= s.end ? s.to : s.from + (s.to - s.from) * ((y - s.start) / (s.end - s.start));
    }
    return p;
  }

  /* Poids en « tente » : à p = i/4 le calque i est seul à 1, et
     entre deux stops les deux voisins se croisent linéairement.
     La somme vaut toujours 1, donc pas de trou ni de surcharge. */
  function paint(p) {
    if (Math.abs(p - current) < 0.0004) return;
    current = p;

    const t = p * (LAYERS - 1);
    for (let i = 0; i < LAYERS; i++) {
      const w = Math.max(0, 1 - Math.abs(t - i));
      root.style.setProperty('--w' + i, w.toFixed(4));
    }

    const night = Math.max(0, (p - NIGHT_FROM) / (1 - NIGHT_FROM));
    root.style.setProperty('--stars', night.toFixed(3));

    const lanterns = (p - LANTERNS_FROM) / (LANTERNS_TO - LANTERNS_FROM);
    root.style.setProperty('--lanterns', Math.max(0, Math.min(1, lanterns)).toFixed(3));

    root.classList.toggle('is-night', p > 0.6);
  }

  /* ---------- boucle armée par événement ----------
     Aucun requestAnimationFrame permanent : on en demande un
     seulement quand quelque chose a bougé, et il s'arrête. */
  let queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      paint(progressAt(scrollY));
    });
  }

  /* ============================================================
     LE CHAMP D'ÉTOILES
     Trois toiles peintes UNE fois. Le placement est groupé (des
     amas, pas une grille), et rayon comme opacité varient — c'est
     exactement ce qui manquait à la version shader, où 10 % des
     cellules d'une grille 62×62 donnaient de la poussière d'écran.
     Le scintillement est une animation CSS d'opacité sur deux des
     trois toiles : il vit sur le compositeur, sans réveiller JS.
     ============================================================ */

  const starsHost = sky.querySelector('.sky-stars');

  function drawStars() {
    if (!starsHost) return;
    starsHost.textContent = '';

    const w = innerWidth;
    const h = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    // moins d'étoiles sur petit écran : même densité perçue
    const budget = w < 640 ? 130 : 260;
    const shares = [0.62, 0.21, 0.17];   // fixe / scintillant lent / rapide

    // Des amas, tirés une fois, partagés par les trois toiles
    const clusters = [];
    const clusterCount = 7;
    for (let i = 0; i < clusterCount; i++) {
      clusters.push({ x: Math.random() * w, y: Math.random() * h * 0.82, r: (0.16 + Math.random() * 0.26) * h });
    }

    for (const share of shares) {
      const c = document.createElement('canvas');
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      const g = c.getContext('2d');
      g.scale(dpr, dpr);

      const n = Math.round(budget * share);
      for (let i = 0; i < n; i++) {
        let x, y;
        if (Math.random() < 0.68) {
          // dans un amas : tirage gaussien approché (somme de deux uniformes)
          const cl = clusters[(Math.random() * clusters.length) | 0];
          const a = Math.random() * Math.PI * 2;
          const d = ((Math.random() + Math.random()) / 2) * cl.r;
          x = cl.x + Math.cos(a) * d;
          y = cl.y + Math.sin(a) * d;
        } else {
          x = Math.random() * w;
          y = Math.random() * h;
        }
        if (x < 0 || x > w || y < 0 || y > h) continue;

        // Le ciel bas est mangé par la braise de l'horizon :
        // les étoiles s'y raréfient, comme dans une vraie photo.
        const highness = 1 - y / h;
        if (Math.random() > 0.18 + highness * 0.94) continue;

        // Rayon et éclat corrélés, distribution en loi de puissance :
        // beaucoup de faibles, quelques-unes qui portent.
        const mag = Math.pow(Math.random(), 2.4);
        const r = 0.35 + mag * 1.25;
        const alpha = (0.22 + mag * 0.78) * (0.45 + highness * 0.55);

        // Halo très léger sur les plus brillantes seulement
        if (mag > 0.62) {
          const grd = g.createRadialGradient(x, y, 0, x, y, r * 4.5);
          grd.addColorStop(0, `rgba(255, 249, 236, ${(alpha * 0.5).toFixed(3)})`);
          grd.addColorStop(1, 'rgba(255, 249, 236, 0)');
          g.fillStyle = grd;
          g.beginPath();
          g.arc(x, y, r * 4.5, 0, Math.PI * 2);
          g.fill();
        }

        g.fillStyle = `rgba(255, 250, 240, ${alpha.toFixed(3)})`;
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
      }
      starsHost.appendChild(c);
    }
  }

  /* ---------- branchements ---------- */

  let resizeTimer = null;
  function onResize() {
    measure();
    schedule();
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(drawStars, 220);
  }

  measure();
  paint(progressAt(scrollY));
  drawStars();                        // le champ est statique : toujours peint

  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', onResize, { passive: true });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { measure(); schedule(); });
  }
  addEventListener('load', () => { measure(); schedule(); });

  window.__sky = {
    setProgress: (p) => paint(Math.max(0, Math.min(1, p))),
    remeasure: () => { measure(); current = -1; schedule(); },
    progress: () => current,
  };
})();
