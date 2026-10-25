/* Héros : la vraie baie de nuit, rendue en WebGL (OGL).
   Les lumières de la côte deviennent des bougies de graphique qui se dressent sur l'horizon ;
   l'eau ondule et reflète leurs couleurs ; la lanterne suit le curseur.
   Repli sans WebGL, sur processeur graphique logiciel ou appareil trop lent : la photo fixe. */
const OGL_BASE = window.OLLIZ_OGL || new URL("./vendor/ogl/", import.meta.url).href;
let Renderer, Program, Mesh, Triangle, Texture;

const host = document.querySelector(".hero-gl");
const O = window.OLLIZ || {};
const IMGS = window.OLLIZ_IMAGES || {};

function fallback() {
  if (!host) return;
  host.innerHTML = `<div class="visuel" data-scene="mer" data-img="hero-mer-nuit" data-notag data-eager data-sizes="100vw" data-alt="Baie méditerranéenne à l’heure bleue, lumières de la côte reflétées sur l’eau"></div>`;
  if (window.OLLIZ_SCENES) window.OLLIZ_SCENES.mount(host);
}

const forceNoGL = /[?&]nogl\b/.test(location.search);
const forceGL = /[?&]forcegl\b/.test(location.search);

const vertex = /* glsl */ `
attribute vec2 uv; attribute vec2 position; varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position, 0., 1.); }`;

const fragment = /* glsl */ `
precision highp float;
uniform sampler2D uTex;      // photo de la baie
uniform sampler2D uProf;     // profil des lumières le long de l'horizon (1 ligne)
uniform vec4 uRect;          // position de la photo à l'écran : x, y, largeur, hauteur (px, origine en haut)
uniform vec2 uRes;
uniform float uHzImg;        // horizon dans la photo (0 = haut)
uniform float uTime, uIntro, uReveal, uMouseX;
varying vec2 vUv;
const vec3 UP = vec3(0.475, 0.824, 0.71);
const vec3 DOWN = vec3(0.831, 0.388, 0.247);
const vec3 GLOW = vec3(1.0, 0.78, 0.42);
float h1(float n){ return fract(sin(n * 12.9898) * 43758.5453); }
float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n1(float x){ float i = floor(x), f = fract(x); return mix(h1(i), h1(i + 1.), f * f * (3. - 2. * f)); }
float n2(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(h2(i), h2(i + vec2(1, 0)), u.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), u.x), u.y); }
float fbm(float x){ float v = 0., a = .5; for (int i = 0; i < 4; i++){ v += a * n1(x); x *= 2.07; a *= .5; } return v; }
// une bougie k : ouverture, clôture, plus haut, plus bas (0..1)
vec4 candle(float k){
  float o = fbm(k * .13), c = fbm((k + 1.) * .13);
  return vec4(o, c, max(o, c) + h1(k * 7.31) * .07, min(o, c) - h1(k * 3.17) * .07);
}
float lights(float sx){ return texture2D(uProf, vec2(clamp((sx - uRect.x) / uRect.z, 0., 1.), .5)).r; }
void main(){
  float S = uRes.y;
  vec2 sp = vec2(vUv.x * uRes.x, (1. - vUv.y) * uRes.y);       // pixel, origine en haut
  float hz = uRect.y + uHzImg * uRect.w;                          // horizon à l'écran
  float up = (hz - sp.y) / S;                                      // > 0 : ciel, < 0 : eau
  float t = uTime;
  vec2 iuv = (sp - uRect.xy) / uRect.zw;
  float wave = 0.;
  if (up < 0.) {
    float d = -up, persp = 1. / (d * 9. + .15);
    wave = n2(vec2(sp.x / S * .6 * persp, d * 28. * persp - t * .35)) - .5;
    float w2 = n2(vec2(sp.x / S * 2.2 * persp, d * 70. * persp - t * .7)) - .5;
    iuv.x += (wave * .010 + w2 * .004) * (d * 3. + .12);
    iuv.y += w2 * .0025 * d;
  }
  vec3 col = texture2D(uTex, iuv).rgb;

  float cw = .019, speed = t * .005, Hn = .12 * uIntro, base = .004, px = 1. / S;
  if (up > 0.) {
    float X = (sp.x / S + speed) / cw, k = floor(X), fx = fract(X);
    vec4 cd = candle(k);
    float a = mix(.1, 1., lights(((k + .5) * cw - speed) * S)) * uIntro;
    vec3 c = mix(DOWN, UP, step(cd.x, cd.y));
    float bTop = base + max(cd.x, cd.y) * Hn, bBot = base + min(cd.x, cd.y) * Hn;
    float wTop = base + cd.z * Hn, wBot = base + max(cd.w, 0.) * Hn;
    float bodyX = smoothstep(.2, .25, fx) * (1. - smoothstep(.75, .8, fx));
    float wickX = 1. - smoothstep(0., .9 * px / cw, abs(fx - .5));
    float inBody = bodyX * step(bBot, up) * step(up, bTop + px);
    float inWick = wickX * step(wBot, up) * step(up, wTop);
    float mid = (bTop + bBot) * .5, hb = max((bTop - bBot) * .5, px * 2.);
    float halo = exp(-max(0., abs(up - mid) - hb) / (Hn * .18 + px)) * exp(-pow(abs(fx - .5) * 2.2, 2.)) * .22;
    col = mix(col, c, clamp(inBody * .9 + inWick * .55 * smoothstep(.2, .6, a), 0., 1.) * a);
    col += c * halo * a;
  } else {
    float d = -up;
    float Xr = (sp.x / S + wave * .05 * (d * 6. + .25) + speed) / cw, kr = floor(Xr), fr = fract(Xr);
    vec4 cr = candle(kr);
    float mr = lights(((kr + .5) * cw - speed) * S);
    vec3 rc = mix(DOWN, UP, step(cr.x, cr.y));
    float rx = smoothstep(.15, .32, fr) * (1. - smoothstep(.68, .85, fr));
    float shimmer = smoothstep(.35, .85, n2(vec2(sp.x / S * 60., d * 160. - t * 1.6)));
    float reach = max(cr.x, cr.y) * Hn + .02;
    col += rc * rx * shimmer * exp(-d / reach * 1.1) * mix(.12, .55, mr) * uIntro;
    float lane = exp(-abs(sp.x / S - uMouseX * uRes.x / S + wave * .09) * (7. + 30. * d));
    col += GLOW * lane * shimmer * .16 * exp(-d * 2.4) * uIntro;
  }
  col += vec3(.95, .9, .8) * (1. - smoothstep(0., 1.5 * px, abs(up))) * .08 * uIntro;
  vec2 q = vUv - .5; col *= 1. - dot(q, q) * .3;
  col = mix(vec3(.059, .133, .161), col, uReveal);
  col += (h2(vUv * uRes + fract(t) * 91.) - .5) * .022;
  gl_FragColor = vec4(col, 1.);
}`;

/* Profil lumineux de la côte : pour chaque colonne de la photo, l'éclat juste au-dessus de l'eau. */
function lightProfile(img, hz) {
  const W = 256, H = Math.round((img.naturalHeight / img.naturalWidth) * W);
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(img, 0, 0, W, H);
  const y0 = Math.max(0, Math.round((hz - 0.035) * H)), y1 = Math.min(H - 1, Math.round((hz + 0.004) * H));
  const data = x.getImageData(0, y0, W, y1 - y0 + 1).data, rows = y1 - y0 + 1;
  const raw = new Float32Array(W);
  for (let i = 0; i < W; i++) {
    let m = 0;
    for (let r = 0; r < rows; r++) { const o = (r * W + i) * 4; const l = (data[o] * 0.299 + data[o + 1] * 0.587 + data[o + 2] * 0.114) / 255; if (l > m) m = l; }
    raw[i] = m;
  }
  const out = document.createElement("canvas"); out.width = W; out.height = 1;
  const ox = out.getContext("2d"), id = ox.createImageData(W, 1);
  const sorted = Array.from(raw).sort((a, b) => a - b), lo = sorted[Math.floor(W * 0.2)], hi = sorted[Math.floor(W * 0.97)] || 1;
  for (let i = 0; i < W; i++) {
    let s = 0, n = 0;
    for (let j = -6; j <= 6; j++) { const k = i + j; if (k >= 0 && k < W) { s += raw[k]; n++; } }
    const v = Math.max(0, Math.min(1, (s / n - lo) / Math.max(0.05, hi - lo)));
    id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = Math.round(Math.pow(v, 0.8) * 255); id.data[i * 4 + 3] = 255;
  }
  ox.putImageData(id, 0, 0);
  return out;
}

function pickImage(cssW, cssH, dpr) {
  if (cssW / cssH < 0.85 && IMGS["hero-mer-nuit-mobile"]) return { src: "assets/img/hero-mer-nuit-mobile.webp", meta: IMGS["hero-mer-nuit-mobile"], fx: 0.32 };
  const m = IMGS["hero-mer-nuit"] || { w: 1672, h: 940, hz: 0.347 };
  return { src: cssW * dpr <= 900 ? "assets/img/hero-mer-nuit-800.webp" : "assets/img/hero-mer-nuit.webp", meta: m, fx: 0.72 };
}

function loadImage(src) {
  return new Promise((res, rej) => { const i = new Image(); i.decoding = "async"; i.onload = () => res(i); i.onerror = rej; i.src = src; });
}

function init() {
  if (!host) return;
  if (forceNoGL) return fallback();
  try { const c = document.createElement("canvas"); if (!(c.getContext("webgl") || c.getContext("experimental-webgl"))) return fallback(); } catch (e) { return fallback(); }
  let renderer;
  try {
    renderer = new Renderer({ dpr: Math.max(1, Math.min(window.devicePixelRatio || 1, 1.5, 2600 / Math.max(1, host.clientWidth))), alpha: false, antialias: false, powerPreference: "high-performance" });
    if (!renderer.gl) throw new Error("WebGL indisponible");
  } catch (e) { return fallback(); }
  const gl = renderer.gl;
  try {
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    const name = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "";
    if (!forceGL && /swiftshader|llvmpipe|software/i.test(name)) return fallback();
  } catch (e) {}
  gl.clearColor(0.059, 0.133, 0.161, 1);
  gl.canvas.setAttribute("aria-hidden", "true");
  host.appendChild(gl.canvas);

  const texOpts = { generateMipmaps: false, minFilter: gl.LINEAR, magFilter: gl.LINEAR, flipY: false, wrapS: gl.CLAMP_TO_EDGE, wrapT: gl.CLAMP_TO_EDGE };
  const tex = new Texture(gl, texOpts), prof = new Texture(gl, texOpts);
  let program;
  try {
    program = new Program(gl, {
      vertex, fragment,
      uniforms: {
        uTex: { value: tex }, uProf: { value: prof }, uRect: { value: [0, 0, 1, 1] }, uRes: { value: [1, 1] }, uHzImg: { value: 0.347 },
        uTime: { value: 0 }, uIntro: { value: O.still ? 1 : 0 }, uReveal: { value: 0 }, uMouseX: { value: 0.66 }
      }
    });
  } catch (e) { gl.canvas.remove(); return fallback(); }
  const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

  let current = null, imgMeta = null, fx = 0.7, ready = false;
  function layout() {
    const r = host.getBoundingClientRect();
    renderer.setSize(Math.max(1, r.width), Math.max(1, r.height));
    const W = gl.canvas.width, H = gl.canvas.height, k = W / Math.max(1, r.width);
    program.uniforms.uRes.value = [W, H];
    if (!imgMeta) return;
    const iw = imgMeta.w, ih = imgMeta.h || Math.round(iw * 0.5625), hz = imgMeta.hz || 0.347;
    const title = document.querySelector(".hero .display");
    let target = H * 0.36;
    if (title) target = (title.getBoundingClientRect().top - r.top) * k - 22 * k;
    target = Math.max(target, 96 * k);
    /* assez grande pour que l'horizon tombe juste au-dessus du titre, même sur un écran bas */
    const s = Math.max(W / iw, H / ih, (H - target) / ((1 - hz) * ih)) * 1.04, dw = iw * s, dh = ih * s;
    let oy = target - hz * dh; oy = Math.max(H - dh, Math.min(0, oy));
    const ox = (W - dw) * fx;
    program.uniforms.uRect.value = [ox, oy, dw, dh];
    program.uniforms.uHzImg.value = hz;
  }
  async function setImage() {
    const r = host.getBoundingClientRect();
    const pick = pickImage(r.width, r.height, Math.min(window.devicePixelRatio || 1, 2));
    if (current === pick.src) return;
    current = pick.src;
    try {
      const img = await loadImage(pick.src);
      if (current !== pick.src) return;
      tex.image = img; tex.needsUpdate = true;
      prof.image = lightProfile(img, pick.meta.hz || 0.347); prof.needsUpdate = true;
      imgMeta = pick.meta; fx = pick.fx; layout();
      if (!ready) {
        ready = true;
        if (window.gsap && !O.still) gsap.to(program.uniforms.uReveal, { value: 1, duration: 1.4, ease: "power2.out" });
        else program.uniforms.uReveal.value = 1;
        if (O.still) frame(performance.now() + 4000);
      }
    } catch (e) { gl.canvas.remove(); fallback(); }
  }
  let rt;
  window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { layout(); setImage(); if (O.still) frame(performance.now()); }, 120); });
  layout(); setImage();
  if (document.fonts) document.fonts.ready.then(layout);

  let mx = 0.66, tx = 0.66, visible = true, t0 = performance.now();
  window.addEventListener("pointermove", (e) => { const r = host.getBoundingClientRect(); tx = (e.clientX - r.left) / r.width; }, { passive: true });

  function frame(now) {
    const t = (now - t0) / 1000;
    if (!O.fine) tx = 0.55 + Math.sin(t * 0.13) * 0.28;
    mx += (tx - mx) * 0.05;
    program.uniforms.uTime.value = t;
    program.uniforms.uMouseX.value = mx;
    const sy = O.scrollY ? O.scrollY() : window.scrollY;
    if (!O.still) host.style.transform = sy > 0 ? `translate3d(0, ${Math.min(sy, host.offsetHeight) * 0.3}px, 0)` : "";
    renderer.render({ scene: mesh });
  }
  /* une seule boucle à la fois ; garde-fou si l'appareil peine (moins de 25 images/s en moyenne) */
  let enCours = false, lastT = 0, degraded = false; const deltas = [];
  function loop(now) {
    if (!visible || degraded) { enCours = false; return; }
    if (lastT && ready) { deltas.push(now - lastT); if (deltas.length === 60) { const avg = deltas.slice(10).reduce((a, b) => a + b, 0) / 50; if (avg > 40 && !forceGL) { degraded = true; gl.canvas.remove(); host.style.transform = ""; fallback(); return; } } }
    lastT = now; frame(now); requestAnimationFrame(loop);
  }
  new IntersectionObserver((en) => { visible = en[0].isIntersecting; lastT = 0; if (visible && !O.still && !degraded && !enCours) { enCours = true; requestAnimationFrame(loop); } }).observe(host);
  if (O.still) { frame(performance.now() + 4000); }
  else if (!enCours) { enCours = true; requestAnimationFrame(loop); }

  O.heroIntro = (dur) => {
    if (!window.gsap) { program.uniforms.uIntro.value = 1; return; }
    gsap.to(program.uniforms.uIntro, { value: 1, duration: dur || 1.6, ease: "power3.out", delay: 0.15 });
  };
  if (O.pendingHeroIntro) O.heroIntro(O.pendingHeroIntro);
}

if (host && !forceNoGL) {
  Promise.all(["core/Renderer.js", "core/Program.js", "core/Mesh.js", "extras/Triangle.js", "core/Texture.js"].map((f) => import(OGL_BASE + f)))
    .then(([a, b, c, d, e]) => { Renderer = a.Renderer; Program = b.Program; Mesh = c.Mesh; Triangle = d.Triangle; Texture = e.Texture; init(); })
    .catch(() => fallback());
} else init();
