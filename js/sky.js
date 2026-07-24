/* ============================================================
   Eya & Yosri — le ciel vivant (WebGL, OGL)
   ------------------------------------------------------------
   Un seul shader plein écran peint la voûte du soir. Une uniforme
   uProgress (0 = après-midi → 1 = nuit) est pilotée par le
   défilement depuis main.js. Le shader dessine : le dégradé du
   ciel (calé sur la palette du site pour garder le texte lisible),
   un soleil qui se couche, la lueur de l'heure dorée à l'horizon,
   une lune, et des étoiles qui ne s'allument que dans la nuit.

   Contrat partagé (window.__sky) :
     · active        — true si le WebGL tourne
     · setProgress(p)— cible de progression [0..1], lissée dans le rendu
   Si le WebGL échoue, window.__sky.active reste false et main.js
   repeint #sky en couleur pleine (repli identique à l'ancien ciel).
   ============================================================ */

import { Renderer, Program, Mesh, Triangle, Vec2 }
  from 'https://cdn.jsdelivr.net/npm/ogl@1.0.11/+esm';

const api = { active: false, setProgress() {} };
window.__sky = api;

const skyEl = document.getElementById('sky');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const vertex = /* glsl */`
  attribute vec2 position;
  void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

const fragment = /* glsl */`
  precision highp float;
  uniform float uTime;
  uniform float uProgress;
  uniform vec2  uResolution;

  // Palette du crépuscule (après-midi -> nuit)
  const vec3 c0 = vec3(0.957, 0.937, 0.886); // ecru
  const vec3 c1 = vec3(0.925, 0.886, 0.796); // linen
  const vec3 c2 = vec3(0.902, 0.827, 0.663); // honey
  const vec3 c3 = vec3(0.773, 0.784, 0.635); // sage clair
  const vec3 c4 = vec3(0.663, 0.694, 0.537); // sage
  const vec3 c5 = vec3(0.235, 0.267, 0.165); // twilight (assombri)
  const vec3 c6 = vec3(0.055, 0.070, 0.038); // nuit

  vec3 skyBase(float p) {
    float t = clamp(p, 0.0, 1.0) * 6.0;
    if (t < 1.0) return mix(c0, c1, t);
    if (t < 2.0) return mix(c1, c2, t - 1.0);
    if (t < 3.0) return mix(c2, c3, t - 2.0);
    if (t < 4.0) return mix(c3, c4, t - 3.0);
    if (t < 5.0) return mix(c4, c5, t - 4.0);
    return mix(c5, c6, clamp(t - 5.0, 0.0, 1.0));
  }

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / uResolution.xy;  // origine en bas à gauche
    float aspect = uResolution.x / uResolution.y;
    float p = uProgress;

    vec3 col = skyBase(p);

    // Dégradé vertical : horizon plus lumineux, zénith plus profond
    col *= mix(1.06, 0.90, uv.y);
    // Chaleur basse qui s'estompe la nuit
    col += vec3(0.05, 0.03, 0.0) * (1.0 - uv.y) * (1.0 - smoothstep(0.62, 1.0, p));

    // ---- Soleil : descend et rougit ----
    float sunY = mix(0.80, -0.10, smoothstep(0.0, 0.72, p));
    vec2 d = uv - vec2(0.72, sunY);
    d.x *= aspect;
    float dist = length(d);
    vec3 sunCol = mix(vec3(1.0, 0.96, 0.82), vec3(1.0, 0.52, 0.26), smoothstep(0.15, 0.7, p));
    float setFade = 1.0 - smoothstep(0.66, 0.86, p);
    col += sunCol * exp(-dist * 4.2) * 0.5 * setFade;
    col = mix(col, sunCol, smoothstep(0.055, 0.042, dist) * setFade);

    // ---- Lueur d'horizon, pic à l'heure dorée ----
    float golden = clamp(1.0 - abs(p - 0.34) / 0.34, 0.0, 1.0);
    col += vec3(0.92, 0.56, 0.26) * smoothstep(0.36, 0.0, uv.y) * golden * 0.32;
    // Braise à l'horizon la nuit
    col += vec3(0.55, 0.27, 0.10) * smoothstep(0.16, 0.0, uv.y) * smoothstep(0.72, 1.0, p) * 0.5;

    // ---- Étoiles : points ronds et doux, seulement dans la nuit ----
    float night = smoothstep(0.62, 1.0, p);
    if (night > 0.001) {
      vec2 gv = uv * vec2(aspect, 1.0) * 62.0;
      vec2 id = floor(gv);
      vec2 f = fract(gv) - 0.5;
      float h = hash(id);
      float present = step(0.90, h);                       // ~10 % des cellules
      vec2 off = (vec2(hash(id + 1.7), hash(id + 4.2)) - 0.5) * 0.7;
      float d = length(f - off);
      float star = smoothstep(0.10, 0.0, d) * present;     // point rond
      float tw = 0.45 + 0.55 * sin(uTime * 2.0 + h * 40.0);
      col += vec3(1.0, 0.96, 0.86) * star * tw * night * smoothstep(0.10, 0.5, uv.y) * 0.85;
    }

    // ---- Lune, en fin de soirée ----
    float moon = smoothstep(0.72, 1.0, p);
    vec2 md = uv - vec2(0.26, 0.80);
    md.x *= aspect;
    float mdist = length(md);
    col += vec3(0.92, 0.94, 0.82) * smoothstep(0.05, 0.036, mdist) * moon;
    col += vec3(0.60, 0.66, 0.55) * exp(-mdist * 6.0) * moon * 0.4;

    // Souffle atmosphérique très léger
    col += (sin(uv.x * 3.0 + uTime * 0.05) * 0.5) * 0.008;

    gl_FragColor = vec4(col, 1.0);
  }
`;

try {
  if (!skyEl) throw new Error('no #sky');

  const renderer = new Renderer({
    alpha: false,
    antialias: false,
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    powerPreference: 'high-performance',
  });
  const gl = renderer.gl;
  gl.canvas.setAttribute('aria-hidden', 'true');
  skyEl.appendChild(gl.canvas);

  const program = new Program(gl, {
    vertex,
    fragment,
    uniforms: {
      uTime: { value: 0 },
      uProgress: { value: window.__skyProgress || 0 },
      uResolution: { value: new Vec2(1, 1) },
    },
  });
  const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

  function resize() {
    renderer.setSize(skyEl.clientWidth || window.innerWidth, skyEl.clientHeight || window.innerHeight);
    program.uniforms.uResolution.value.set(gl.canvas.width, gl.canvas.height);
  }
  window.addEventListener('resize', resize);
  resize();

  let target = window.__skyProgress || 0;
  let current = target;
  api.active = true;
  api.setProgress = (p) => { target = Math.max(0, Math.min(1, p)); };

  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    // Lissage supplémentaire de la progression : le ciel glisse
    current += (target - current) * Math.min(dt * 6.0, 1);
    program.uniforms.uProgress.value = current;
    if (!reduced) program.uniforms.uTime.value = now / 1000;
    renderer.render({ scene: mesh });
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Rendu immédiat pour éviter tout flash avant le premier rAF
  program.uniforms.uResolution.value.set(gl.canvas.width, gl.canvas.height);
  renderer.render({ scene: mesh });
} catch (err) {
  api.active = false;
  // main.js prendra le relais en repeignant #sky en couleur pleine
  console.info('[sky] WebGL indisponible, repli couleur :', err && err.message);
}
