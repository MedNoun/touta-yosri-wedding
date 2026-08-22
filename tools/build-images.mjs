/* ============================================================
   Image pipeline — a one-off dev tool, not part of the site.
   The site itself still ships with no build step; this script
   just regenerates assets/img/ from the untouched originals.

     npm i sharp        (anywhere)
     node tools/build-images.mjs

   For every source it writes AVIF + WebP + JPEG at every width
   that does NOT upscale the original. Never invents pixels: if
   a requested width is larger than the source, it is skipped,
   so the widest candidate in each srcset is always real.
   ============================================================ */

import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const OUT = 'assets/img';

/* photo-1.jpg is a stacked three-panel collage. Row deltas put the
   seams at y=400 and y=800 exactly; we lift each panel out so the
   gallery can use them as three real photographs. */
const COLLAGE = {
  src: 'assets/photos/photo-1.jpg',
  panels: [
    { name: 'detail-dress',   top: 2,   height: 396 },
    { name: 'detail-bouquet', top: 402, height: 396 },
    { name: 'detail-lapel',   top: 802, height: 396 },
  ],
};

const SOURCES = [
  { src: 'assets/photos/photo-3.jpg', name: 'couple-embrace', widths: [480, 640, 800] },
  { src: 'assets/photos/photo-2.jpg', name: 'couple-dusk',    widths: [480, 640, 800] },
  { src: 'assets/photos/photo-4.jpg', name: 'couple-walking', widths: [480, 640, 800] },
  { src: 'assets/mimosa/mimosa.jpg',  name: 'venue',          widths: [640, 960, 1440, 1916] },
];

const FORMATS = [
  ['avif', { quality: 52, effort: 4 }],
  ['webp', { quality: 78 }],
  ['jpg',  { quality: 82, mozjpeg: true, chromaSubsampling: '4:4:4' }],
];

const written = [];

async function emit(pipeline, name, srcWidth, widths) {
  for (const w of widths) {
    if (w > srcWidth) continue; // never upscale
    for (const [ext, opts] of FORMATS) {
      const buf = await pipeline
        .clone()
        .resize({ width: w, withoutEnlargement: true, kernel: 'lanczos3' })
        .toFormat(ext === 'jpg' ? 'jpeg' : ext, opts)
        .toBuffer();
      const file = path.join(OUT, `${name}-${w}.${ext}`);
      await writeFile(file, buf);
      written.push([file, buf.length]);
    }
  }
}

await mkdir(OUT, { recursive: true });

for (const { src, name, widths } of SOURCES) {
  const base = sharp(src);
  const { width } = await base.metadata();
  await emit(base, name, width, widths);
}

const sheet = sharp(COLLAGE.src);
const { width: sheetW } = await sheet.metadata();
for (const p of COLLAGE.panels) {
  const panel = sharp(COLLAGE.src).extract({ left: 0, top: p.top, width: sheetW, height: p.height });
  await emit(panel, p.name, sheetW, [480, 640, 960]);
}

written.sort((a, b) => a[0].localeCompare(b[0]));
const total = written.reduce((n, [, s]) => n + s, 0);
for (const [f, s] of written) console.log(`${String(Math.round(s / 1024)).padStart(5)} KB  ${f}`);
console.log(`\n${written.length} files, ${(total / 1048576).toFixed(2)} MB total`);
