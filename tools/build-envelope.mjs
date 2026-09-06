/* ============================================================
   build-envelope.mjs — découpe l'enveloppe de la porte d'entrée
   ============================================================

   Outil de développement, une seule fois. Le site n'a pas d'étape
   de build : ce script prend la photographie d'origine et en sort
   les trois calques que l'animation d'ouverture empile.

     npm i sharp
     node tools/build-envelope.mjs

   Source : assets/envelope/source.jpg (non déployée, cf .vercelignore)
   Sortie : assets/img/env-{body,flap,seal}-{480,720,960}.{avif,webp,png}

   POURQUOI TROIS CALQUES
   Le rabat doit pouvoir s'ouvrir, le cachet se briser. On découpe
   donc la même photographie en trois masques complémentaires :

     env-body  l'enveloppe moins le triangle du rabat, cachet évidé
     env-flap  le seul triangle du rabat, cachet évidé
     env-seal  la cire seule, sur son propre petit cadre

   body + flap recomposent la photographie au pixel près : tant que
   rien ne bouge, l'écran d'accueil EST la photographie.

   POURQUOI PAS UN POLYGONE À LA MAIN
   Le bord du papier est déchiré (deckle). Un polygone l'aurait
   raboté. On segmente donc à la vraie silhouette : seuil sur la
   luminance, plus grande composante connexe, puis bouchage des
   trous — l'encre des prénoms et la cire sont des trous internes,
   pas du fond.
   ============================================================ */

import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const SRC = 'assets/envelope/source.jpg';
const OUT = 'assets/img';

/* Le cachet fait 222 px de large à la source : lui demander 480 px
   serait un agrandissement, et emit() l'aurait sauté en silence.
   Chaque calque porte donc ses propres largeurs. */
const WIDTHS = { 'env-body': [480, 720, 960], 'env-flap': [480, 720, 960], 'env-seal': [148, 222] };

/* Pas de repli PNG. Le repli existant du site est le JPEG, qui n'a pas
   de canal alpha ; et tout navigateur qui sait lire @property (déjà
   utilisé, styles.css:1365) et clip-path lit le WebP depuis 2020.
   Un PNG de repli pesait 364 ko pour le seul corps à 960 px — plus que
   la plus grosse image déployée du site, pour personne. */
const FORMATS = [
  ['avif', (s) => s.avif({ quality: 54, effort: 4 })],
  ['webp', (s) => s.webp({ quality: 80 })],
];

/* Échelle de travail pour la segmentation. La silhouette n'a pas
   besoin des 1536 px : on segmente à 512 et on ré-échantillonne le
   masque, ce qui lisse le bruit de la toile de lin au passage. */
const SC = 3;

const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const sat = (r, g, b) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mx ? (mx - mn) / mx : 0; };

/* ---------- 1 · silhouette ---------- */

const { data, info } = await sharp(SRC)
  .resize({ width: Math.round(1536 / SC) })
  .removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;

const fg = new Uint8Array(W * H);
for (let i = 0; i < W * H; i++) {
  const p = i * 3, r = data[p], g = data[p + 1], b = data[p + 2];
  /* C'est la SATURATION qui sépare, pas la luminance.
     Relevé sur cette photographie :
       papier, à l'ombre   L 172-185   S 0,088-0,115
       papier, en lumière  L 231-233   S 0,142-0,161
       lin, ombre → soleil L  98-218   S 0,232-0,408
     Le lin est chaud à toute heure, le papier reste neutre. Un seuil de
     luminance ne pouvait pas trancher : le lin ensoleillé est plus clair
     que les coins d'enveloppe tombés dans l'ombre portée — et c'est
     exactement ainsi qu'on perdait le coin bas-gauche et le « 26.09 »
     de la date. Le plancher de luminance ne sert plus qu'à écarter le
     fond le plus sombre. */
  fg[i] = (lum(r, g, b) > 140 && sat(r, g, b) < 0.20) ? 1 : 0;
}

// plus grande composante connexe : l'enveloppe, pas le ruban ni le lin éclairé
const lab = new Int32Array(W * H);
const stack = new Int32Array(W * H);
let cur = 0, best = 0, bestN = 0;
for (let s = 0; s < W * H; s++) {
  if (!fg[s] || lab[s]) continue;
  cur++; let sp = 0, n = 0; stack[sp++] = s; lab[s] = cur;
  while (sp) {
    const i = stack[--sp]; n++; const x = i % W, y = (i / W) | 0;
    if (x > 0     && fg[i - 1] && !lab[i - 1]) { lab[i - 1] = cur; stack[sp++] = i - 1; }
    if (x < W - 1 && fg[i + 1] && !lab[i + 1]) { lab[i + 1] = cur; stack[sp++] = i + 1; }
    if (y > 0     && fg[i - W] && !lab[i - W]) { lab[i - W] = cur; stack[sp++] = i - W; }
    if (y < H - 1 && fg[i + W] && !lab[i + W]) { lab[i + W] = cur; stack[sp++] = i + W; }
  }
  if (n > bestN) { bestN = n; best = cur; }
}
const env = new Uint8Array(W * H);
for (let i = 0; i < W * H; i++) env[i] = lab[i] === best ? 1 : 0;

/* Fermeture morphologique (dilatation puis érosion, r = 2 px de travail
   soit 6 px source). Les plis du rabat sont des lignes d'ombre étroites
   qui touchent le bord : sans cette fermeture elles relient l'intérieur
   au fond, l'inondation passe par la fente et la cire n'est jamais
   bouchée. */
{
  const R = 2, tmpm = new Uint8Array(W * H);
  const box = (srcArr, dstArr, want) => {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let hit = 0;
      for (let dy = -R; dy <= R && !hit; dy++) for (let dx = -R; dx <= R; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        if (srcArr[ny * W + nx] === want) { hit = 1; break; }
      }
      dstArr[y * W + x] = want ? (hit ? 1 : 0) : (hit ? 0 : 1);
    }
  };
  box(env, tmpm, 1);          // dilatation
  box(tmpm, env, 0);          // érosion
}

// bouchage des trous : on inonde le fond depuis le bord ; ce qui
// n'est pas atteint et n'est pas l'enveloppe est un trou interne.
{
  const seen = new Uint8Array(W * H); let sp = 0;
  const push = (i) => { if (!env[i] && !seen[i]) { seen[i] = 1; stack[sp++] = i; } };
  for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
  while (sp) {
    const i = stack[--sp], x = i % W, y = (i / W) | 0;
    if (x > 0) push(i - 1); if (x < W - 1) push(i + 1);
    if (y > 0) push(i - W); if (y < H - 1) push(i + W);
  }
  for (let i = 0; i < W * H; i++) if (!env[i] && !seen[i]) env[i] = 1;
}

/* Enveloppe convexe.
   Les coins de l'enveloppe tombent dans l'ombre portée et passent sous
   le seuil : sans cette étape, la silhouette revient rognée en biais,
   le coin haut-droit et le coin bas-gauche disparaissent, et « 26.09 »
   est amputé de la date. Une enveloppe est convexe — on peut donc
   refermer le contour sans rien inventer. Les échancrures du bord
   déchiré sont pontées, ses saillies gardées. */
{
  const pts = [];
  for (let y = 0; y < H; y++) {
    let a = -1, b = -1;
    for (let x = 0; x < W; x++) if (env[y * W + x]) { if (a < 0) a = x; b = x; }
    if (a >= 0) { pts.push([a, y], [b, y]); }
  }
  pts.sort((u, v) => u[0] - v[0] || u[1] - v[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (src) => {
    const out = [];
    for (const q of src) {
      while (out.length > 1 && cross(out[out.length - 2], out[out.length - 1], q) <= 0) out.pop();
      out.push(q);
    }
    out.pop(); return out;
  };
  const hull = half(pts).concat(half([...pts].reverse()));

  // rastérisation du polygone, par balayage de lignes
  env.fill(0);
  const n = hull.length;
  for (let y = 0; y < H; y++) {
    const xs = [];
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const [xi, yi] = hull[i], [xj, yj] = hull[j];
      if ((yi > y) !== (yj > y)) xs.push(xi + (y - yi) / (yj - yi) * (xj - xi));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2)
      for (let x = Math.ceil(xs[k]); x <= Math.floor(xs[k + 1]); x++)
        if (x >= 0 && x < W) env[y * W + x] = 1;
  }
}

let bx0 = W, by0 = H, bx1 = 0, by1 = 0;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (env[y * W + x]) {
  if (x < bx0) bx0 = x; if (x > bx1) bx1 = x;
  if (y < by0) by0 = y; if (y > by1) by1 = y;
}

/* ---------- 2 · le cachet de cire ---------- */
// L'orange saturé est aussi celui du souci du bouquet, qui est hors
// de l'enveloppe : on ne cherche donc que dans la silhouette.
/* Quelques pixels chauds égarés sur le papier passent le seuil et,
   pris dans le même sac, décalent le centre et gonflent le rayon. On
   étiquette donc l'orange et on ne garde que la plus grosse tache :
   la cire est, de loin, le plus grand objet orange de l'enveloppe. */
const orange = new Uint8Array(W * H);
for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) {
  const i = y * W + x, p = i * 3, r = data[p], g = data[p + 1], b = data[p + 2];
  if (r > 150 && sat(r, g, b) > 0.45 && r > g * 1.5 && g >= b) orange[i] = 1;
}
let sx = 0, sy = 0, sn = 0, sx0 = W, sy0 = H, sx1 = 0, sy1 = 0;
{
  const seen = new Uint8Array(W * H);
  let bn = 0, bpx = null;
  for (let s0 = 0; s0 < W * H; s0++) {
    if (!orange[s0] || seen[s0]) continue;
    let sp = 0, n = 0; const px = []; stack[sp++] = s0; seen[s0] = 1;
    while (sp) {
      const i = stack[--sp]; n++; px.push(i);
      const x = i % W, y = (i / W) | 0;
      if (x > 0     && orange[i - 1] && !seen[i - 1]) { seen[i - 1] = 1; stack[sp++] = i - 1; }
      if (x < W - 1 && orange[i + 1] && !seen[i + 1]) { seen[i + 1] = 1; stack[sp++] = i + 1; }
      if (y > 0     && orange[i - W] && !seen[i - W]) { seen[i - W] = 1; stack[sp++] = i - W; }
      if (y < H - 1 && orange[i + W] && !seen[i + W]) { seen[i + W] = 1; stack[sp++] = i + W; }
    }
    if (n > bn) { bn = n; bpx = px; }
  }
  if (bpx) for (const i of bpx) {
    const x = i % W, y = (i / W) | 0;
    sx += x; sy += y; sn++;
    if (x < sx0) sx0 = x; if (x > sx1) sx1 = x;
    if (y < sy0) sy0 = y; if (y > sy1) sy1 = y;
  }
}

if (!sn) throw new Error('cachet introuvable — vérifier le seuil de saturation');

/* La cire est plus sombre que le seuil du papier : quoi qu'il arrive
   elle doit appartenir à la silhouette, sinon les trois calques se
   retrouvent troués là où le cachet devrait être. */
{
  const cx = sx / sn, cy = sy / sn, rr = Math.max(sx1 - sx0, sy1 - sy0) / 2 + 3;
  for (let y = Math.floor(cy - rr); y <= Math.ceil(cy + rr); y++)
    for (let x = Math.floor(cx - rr); x <= Math.ceil(cx + rr); x++)
      if (x >= 0 && y >= 0 && x < W && y < H && (x - cx) ** 2 + (y - cy) ** 2 <= rr * rr)
        env[y * W + x] = 1;
}

/* ---------- 3 · repères, en pixels source ---------- */
const S = (v) => Math.round(v * SC);
const box  = { x: S(bx0), y: S(by0), w: S(bx1 - bx0 + 1), h: S(by1 - by0 + 1) };
const seal = {
  cx: S(sx / sn), cy: S(sy / sn),
  r: Math.round(Math.max(sx1 - sx0, sy1 - sy0) * SC / 2)
};
/* Le rayon relevé ne tient qu'à l'orange saturé. Le biseau extérieur de
   la cire est trop sombre pour passer le seuil : évidé à ce rayon-là, il
   resterait un liseré orange sur le corps. On perce 10 % plus large, et
   ce MÊME rayon sert au perçage, au recadrage du cachet et au repère
   CSS — sinon la cire ne retombe pas dans son trou. */
const PUNCH = Math.round(seal.r * 1.10);

/* RECOUVREMENT — la raison d'être de ce nombre.
   Deux découpes complémentaires qui partagent une arête ne se
   recollent JAMAIS proprement : chacune rend son bord à ~50 %
   d'opacité, et 50 % posé sur 50 % ne fait pas 100 %. Il reste un
   filet par lequel on voit le fond — gris sur le papier crème, gris
   dans la cire fendue, gris le long du rabat.
   La parade n'est pas d'affiner les bords mais de les FAIRE SE
   CHEVAUCHER : les deux pièces montrent la même photographie, donc
   quelques pixels de recouvrement sont rigoureusement invisibles,
   là où l'accolement, lui, se voit toujours. */
const OVERLAP = 4;

// Sommet du rabat : la cire se pose sur la pointe, un rien plus bas.
const apex = { x: seal.cx, y: seal.cy + 40 };

console.log(`enveloppe  ${box.w}×${box.h} @ (${box.x},${box.y})`);
console.log(`cachet     centre (${seal.cx},${seal.cy})  r=${seal.r}`);
console.log(`rabat      sommet (${apex.x},${apex.y})`);
console.log(`\nrepères CSS (en % du cadre de l'enveloppe) :`);
console.log(`  --seal-x: ${((seal.cx - box.x) / box.w * 100).toFixed(2)}%`);
console.log(`  --seal-y: ${((seal.cy - box.y) / box.h * 100).toFixed(2)}%`);
const sealD = (PUNCH + OVERLAP) * 2 / box.w * 100;
const sealX = (seal.cx - box.x) / box.w * 100;
const sealY = (seal.cy - box.y) / box.h * 100;
console.log(`  --seal-d: ${sealD.toFixed(2)}%   (pastille, recouvrement compris)`);
console.log(`\n  .env-seal { left: ${(sealX - sealD / 2).toFixed(2)}%; top: ${(sealY - sealD / 2 * box.w / box.h).toFixed(2)}%; width: ${sealD.toFixed(2)}%; }`);
console.log(`  rabat    : ratio hauteur ${((apex.y - box.y) / box.h * 100).toFixed(2)}%\n`);

/* ---------- 4 · les masques ---------- */
// Coordonnées locales au cadre découpé.
const lx = (v) => v - box.x, ly = (v) => v - box.y;
const svgMask = (inner) =>
  Buffer.from(`<svg width="${box.w}" height="${box.h}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`);

/* ATTENTION — blend:'dest-in' lit le canal ALPHA du masque, pas sa
   luminance. Un masque « blanc = garder, noir = jeter » est opaque
   partout : il ne découpe rien. Les zones à retirer doivent donc être
   RÉELLEMENT transparentes, ce qu'on obtient avec un seul tracé en
   fill-rule="evenodd" — les sous-tracés intérieurs percent le tracé
   extérieur au lieu d'être peints par-dessus. */
const flapTri = `M 0 0 L ${box.w} 0 L ${lx(apex.x)} ${ly(apex.y)} Z`;
const SCX = lx(seal.cx), SCY = ly(seal.cy);
const disc = (r) => `M ${SCX - r} ${SCY} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0 Z`;
/* Le trou percé dans le corps et le rabat garde le rayon PUNCH ; la
   pastille de cire, elle, est découpée un peu plus large et vient
   donc mordre sur la lèvre du trou au lieu de s'y aboutir. */
const sealCircle = disc(PUNCH);
const sealDisc   = disc(PUNCH + OVERLAP);
const cut = (d) => `<path fill="#fff" fill-rule="evenodd" d="${d}"/>`;
/* Même principe pour le rabat : on le grossit d'un liseré tracé vers
   l'extérieur, si bien qu'il déborde sur le corps le long des deux
   plis. Le corps, lui, reste découpé sur le triangle exact. */
const grow = (d, w) => `<path fill="#fff" fill-rule="evenodd" stroke="#fff" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round" d="${d}"/>`;

// silhouette (alpha), recadrée
const silRgba = Buffer.alloc(W * H * 4);
for (let i = 0; i < W * H; i++) {
  silRgba[i * 4] = 255; silRgba[i * 4 + 1] = 255; silRgba[i * 4 + 2] = 255;
  silRgba[i * 4 + 3] = env[i] ? 255 : 0;
}
const silhouette = await sharp(silRgba, { raw: { width: W, height: H, channels: 4 } })
  .resize({ width: 1536, height: 2752, kernel: 'cubic' }).blur(1.1)
  .extract({ left: box.x, top: box.y, width: box.w, height: box.h })
  .png().toBuffer();

const plate = await sharp(SRC)
  .extract({ left: box.x, top: box.y, width: box.w, height: box.h })
  .ensureAlpha()
  .composite([{ input: silhouette, blend: 'dest-in' }])
  .png().toBuffer();

/* body : hors du triangle, cire évidée */
const bodyMask = svgMask(cut(`M 0 0 H ${box.w} V ${box.h} H 0 Z ` + flapTri));
/* flap : le seul triangle */
const flapMask = svgMask(grow(flapTri, OVERLAP * 2));
/* La cire se perce À PART, en seconde passe.
   evenodd compte les croisements : le disque du cachet tombe DANS le
   triangle du rabat, donc « rectangle + triangle + disque » en fait
   trois — impair — et le cachet se retrouvait repeint au lieu d'être
   évidé. Une différence d'unions ne s'écrit pas en un seul tracé. */
const sealPunch = svgMask(cut(`M 0 0 H ${box.w} V ${box.h} H 0 Z ` + sealCircle));

/* ---------- LE DÉBORDEMENT DE COULEUR (alpha bleed) ----------

   Un découpage laisse du noir dans les zones transparentes. À la
   réduction, l'interpolation mélange ce noir aux pixels du bord :
   il en sort un liseré gris sombre tout autour de l'enveloppe, du
   triangle du rabat et du disque de cire — mesuré rgb(185,165,145)
   au bord contre rgb(221,205,188) à l'intérieur, avec des pixels
   jusqu'à L=6. C'est le « trait gris » visible sur la cire brisée et
   sur les arêtes du papier.

   On étale donc la couleur du papier DANS le transparent avant de
   réduire : l'alpha ne bouge pas, mais l'interpolation ne mélange
   plus que du papier avec du papier. */
async function bleed(buf, passes = 14) {
  const { data, info } = await sharp(buf).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const px = Buffer.from(data);
  // « connu » = le pixel porte une vraie couleur (alpha non nul)
  let known = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) known[i] = px[i * 4 + 3] > 0 ? 1 : 0;

  for (let p = 0; p < passes; p++) {
    const next = Uint8Array.from(known);
    let filled = 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (known[i]) continue;
        let r = 0, g = 0, b = 0, n = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const j = ny * W + nx;
          if (!known[j]) continue;
          r += px[j * 4]; g += px[j * 4 + 1]; b += px[j * 4 + 2]; n++;
        }
        if (!n) continue;
        px[i * 4] = Math.round(r / n);
        px[i * 4 + 1] = Math.round(g / n);
        px[i * 4 + 2] = Math.round(b / n);
        // l'alpha reste à zéro : on ne peint rien, on ne fait que
        // donner une couleur au vide pour que le filtre ait de quoi
        // interpoler proprement.
        next[i] = 1; filled++;
      }
    }
    known = next;
    if (!filled) break;
  }
  return sharp(px, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
}

/* ---------- LE RAPIÉÇAGE DE LA CIRE (inpaint) ----------

   Sous la cire il y a du papier, et ce papier n'a jamais été
   photographié. On le reconstruit donc à partir de ce qui l'entoure,
   au lieu de boucher le trou avec une pastille dessinée en CSS.

   Pourquoi : autour du cachet la lumière rase — relevé #F3DBC5 à
   gauche, #CFC0B2 à droite, où la cire jette son ombre. Un disque
   d'une seule couleur ne peut convenir aux deux, et il se lisait
   comme une pastille grise posée sur le papier dès que les deux
   moitiés s'envolaient. En prolongeant l'anneau qui entoure le trou,
   le rapiéçage hérite du dégradé réel, y compris de cette ombre.

   Méthode : on échantillonne un anneau juste à l'extérieur du trou,
   angle par angle, puis chaque pixel intérieur reprend la couleur de
   son angle, fondue vers la moyenne de l'anneau à mesure qu'on
   approche du centre. Pas de texture inventée : rien que du papier
   voisin, étiré vers l'intérieur. */
async function inpaintDisc(buf, cx, cy, R) {
  const { data, info } = await sharp(buf).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const px = Buffer.from(data);
  const N = 720, ring = new Float64Array(N * 3);
  let mr = 0, mg = 0, mb = 0;
  for (let k = 0; k < N; k++) {
    const a = k * 2 * Math.PI / N;
    let r = 0, g = 0, b = 0, n = 0;
    for (let rr = R + 5; rr <= R + 18; rr++) {
      const x = Math.round(cx + rr * Math.cos(a)), y = Math.round(cy + rr * Math.sin(a));
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const i = (y * W + x) * 4;
      if (px[i + 3] < 200) continue;
      r += px[i]; g += px[i + 1]; b += px[i + 2]; n++;
    }
    if (!n) { n = 1; r = 230; g = 212; b = 193; }
    ring[k * 3] = r / n; ring[k * 3 + 1] = g / n; ring[k * 3 + 2] = b / n;
    mr += r / n; mg += g / n; mb += b / n;
  }
  mr /= N; mg /= N; mb /= N;
  // lissage angulaire : sans lui, le rapiéçage part en rayons
  const sm = new Float64Array(N * 3), K = 24;
  for (let k = 0; k < N; k++) {
    let r = 0, g = 0, b = 0;
    for (let d = -K; d <= K; d++) {
      const j = ((k + d) % N + N) % N;
      r += ring[j * 3]; g += ring[j * 3 + 1]; b += ring[j * 3 + 2];
    }
    sm[k * 3] = r / (2 * K + 1); sm[k * 3 + 1] = g / (2 * K + 1); sm[k * 3 + 2] = b / (2 * K + 1);
  }
  for (let y = Math.floor(cy - R - 2); y <= Math.ceil(cy + R + 2); y++) {
    for (let x = Math.floor(cx - R - 2); x <= Math.ceil(cx + R + 2); x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy);
      if (d > R) continue;
      const k = (Math.round((Math.atan2(dy, dx) + 2 * Math.PI) % (2 * Math.PI) / (2 * Math.PI) * N)) % N;
      const f = d / R;                       // 0 au centre, 1 au bord
      const w = f * f;                       // le bord commande, le centre se moyenne
      const i = (y * W + x) * 4;
      px[i]     = Math.round(sm[k * 3]     * w + mr * (1 - w));
      px[i + 1] = Math.round(sm[k * 3 + 1] * w + mg * (1 - w));
      px[i + 2] = Math.round(sm[k * 3 + 2] * w + mb * (1 - w));
      px[i + 3] = 255;
    }
  }
  return sharp(px, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
}

const punch = await sharp(sealPunch).png().toBuffer();
/* Le corps et le rabat sont découpés dans la planche RAPIÉCÉE : plus
   de trou sous la cire, donc plus rien à boucher côté CSS. La pastille
   de cire, elle, se découpe dans la planche d'origine — c'est la seule
   pièce qui a besoin de la cire. */
const patched = await inpaintDisc(plate, lx(seal.cx), ly(seal.cy), PUNCH + 2);

const carve = async (maskSvg) => sharp(patched)
  .composite([{ input: await sharp(maskSvg).png().toBuffer(), blend: 'dest-in' }])
  .png().toBuffer();

const layers = {
  'env-body': await bleed(await carve(bodyMask)),
  'env-flap': await bleed(await carve(flapMask)),
};

/* seal : la cire seule, sur son propre cadre carré */
const sd = (PUNCH + OVERLAP) * 2;
const sealCanvas = svgMask(cut(sealDisc));
layers['env-seal'] = await bleed(await sharp(
  await sharp(plate)
    .composite([{ input: await sharp(sealCanvas).png().toBuffer(), blend: 'dest-in' }])
    .png().toBuffer())
  .extract({
    left: Math.round(lx(seal.cx) - sd / 2), top: Math.round(ly(seal.cy) - sd / 2),
    width: sd, height: sd
  })
  .png().toBuffer());

/* ---------- 5 · encodage ---------- */
// Pas de JPEG ici : ces calques ont besoin de leur canal alpha.
await mkdir(OUT, { recursive: true });
let total = 0;
for (const [name, buf] of Object.entries(layers)) {
  const src = sharp(buf);
  const { width: nw } = await src.metadata();
  for (const w of WIDTHS[name]) {
    if (w > nw) continue;                       // jamais d'agrandissement
    const base = sharp(buf).resize({ width: w, withoutEnlargement: true, kernel: 'lanczos3' });
    for (const [ext, fn] of FORMATS) {
      const file = `${OUT}/${name}-${w}.${ext}`;
      const { size } = await fn(base.clone()).toFile(file);
      total += size;
      console.log(`  ${file.padEnd(34)} ${(size / 1024).toFixed(1)} kB`);
    }
  }
}
console.log(`\ntotal ${(total / 1024).toFixed(1)} kB`);
