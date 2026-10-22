/* Héros : mer de nuit en WebGL (OGL). Les vagues suivent une courbe de cours,
   des bougies se dressent sur l'horizon et se reflètent dans l'eau.
   La teinte du ciel suit l'heure réelle à Fréjus. Repli sans WebGL : scène 2D. */
const OGL_BASE = window.OLLIZ_OGL || new URL("./vendor/ogl/", import.meta.url).href;
let Renderer, Program, Mesh, Triangle;

const host = document.querySelector(".hero-gl");
const O = window.OLLIZ || {};

function fallback() {
  if (!host) return;
  let hz = 0.56;
  const title = document.querySelector(".hero .display");
  if (title) { const hr = host.getBoundingClientRect(), tr = title.getBoundingClientRect(); hz = Math.max(0.2, Math.min(0.64, (tr.top - hr.top - 18) / hr.height)); }
  host.innerHTML = `<div class="visuel" data-scene="mer" data-img="hero-mer-nuit" data-hz="${hz.toFixed(3)}" data-notag data-eager data-alt="Mer de nuit, des bougies de graphique se reflètent sur l’eau"></div>`;
  if (window.OLLIZ_SCENES) window.OLLIZ_SCENES.mount(host);
}

const hasImage = window.OLLIZ_IMAGES && window.OLLIZ_IMAGES["hero-mer-nuit"];
const forceNoGL = /[?&]nogl\b/.test(location.search);
const forceGL = /[?&]forcegl\b/.test(location.search);

function hexToVec(hex) { const n = parseInt(hex.slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; }
function mix(a, b, t) { return a.map((v, i) => v + (b[i] - v) * t); }
/* Palette selon l'heure de Paris : nuit, aube, jour, crépuscule */
function palette() {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
  const h = (+p.find((x) => x.type === "hour").value % 24) + +p.find((x) => x.type === "minute").value / 60;
  const keys = [
    { h: 0, top: "#061318", low: "#15323c", glow: "#f2b64b" },
    { h: 5, top: "#081820", low: "#1a3a45", glow: "#f2b64b" },
    { h: 7, top: "#13283a", low: "#9a6a5a", glow: "#ffd58a" },
    { h: 10, top: "#0f2f3b", low: "#3f7480", glow: "#fff0c4" },
    { h: 17, top: "#0f2c38", low: "#3d6b74", glow: "#ffe2a0" },
    { h: 19.5, top: "#0e2029", low: "#8a4a3c", glow: "#ffb36b" },
    { h: 21.5, top: "#071419", low: "#17343e", glow: "#f2b64b" },
    { h: 24, top: "#061318", low: "#15323c", glow: "#f2b64b" }
  ];
  let i = 0; while (i < keys.length - 1 && keys[i + 1].h <= h) i++;
  const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)];
  const t = b.h === a.h ? 0 : (h - a.h) / (b.h - a.h);
  return { top: mix(hexToVec(a.top), hexToVec(b.top), t), low: mix(hexToVec(a.low), hexToVec(b.low), t), glow: mix(hexToVec(a.glow), hexToVec(b.glow), t) };
}

const vertex = /* glsl */ `
attribute vec2 uv; attribute vec2 position; varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position, 0., 1.); }`;

const fragment = /* glsl */ `
precision highp float;
uniform float uTime; uniform vec2 uRes; uniform vec2 uMouse; uniform float uScroll; uniform float uIntro; uniform float uHz;
uniform vec3 uTop; uniform vec3 uLow; uniform vec3 uGlow;
varying vec2 vUv;
const vec3 UP = vec3(0.475, 0.824, 0.71);
const vec3 DOWN = vec3(0.831, 0.388, 0.247);
float h1(float n){ return fract(sin(n * 12.9898) * 43758.5453); }
float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n1(float x){ float i = floor(x), f = fract(x); return mix(h1(i), h1(i + 1.), f * f * (3. - 2. * f)); }
float n2(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(h2(i), h2(i + vec2(1, 0)), u.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), u.x), u.y); }
float fbm(float x){ float v = 0., a = .5; for (int i = 0; i < 4; i++){ v += a * n1(x); x *= 2.07; a *= .5; } return v; }
// valeur d'une bougie k : ouverture, clôture, haut, bas (0..1)
vec4 candle(float k){
  float o = fbm(k * .13), c = fbm((k + 1.) * .13);
  float hi = max(o, c) + h1(k * 7.31) * .06, lo = min(o, c) - h1(k * 3.17) * .06;
  return vec4(o, c, hi, lo);
}
void main(){
  vec2 uv = vUv; float asp = uRes.x / uRes.y; float px = 1. / uRes.y;
  vec2 p = vec2(uv.x * asp, uv.y);
  float hz = uHz + uScroll * .08;                      // ligne d'horizon, juste au-dessus du titre
  vec2 m = vec2(uMouse.x * asp, uMouse.y);
  float cw = .022;                                      // largeur d'une bougie
  float speed = uTime * .006;
  float X = (p.x + speed) / cw; float k = floor(X); float fx = fract(X);
  vec4 cd = candle(k);
  float isUp = step(cd.x, cd.y);
  vec3 ccol = mix(DOWN, UP, isUp);
  float base = hz + .015, H = .2 * uIntro;
  float bTop = base + max(cd.x, cd.y) * H, bBot = base + min(cd.x, cd.y) * H;
  float wTop = base + cd.z * H, wBot = base + max(cd.w, 0.) * H;
  float edge = .03;
  float bodyX = smoothstep(.2 - edge, .2, fx) * (1. - smoothstep(.8, .8 + edge, fx));
  float wickX = 1. - smoothstep(0., .9 * px / cw, abs(fx - .5));
  vec3 col;
  if (uv.y >= hz) {
    float t = smoothstep(hz, 1., uv.y);
    col = mix(uLow, uTop, pow(t, .55));
    // étoiles
    vec2 sp = floor(uv * uRes / 3.);
    float st = step(.9965, h2(sp)) * smoothstep(hz + .1, 1., uv.y) * (.5 + .5 * sin(uTime * 2. + h2(sp) * 30.));
    col += st * .55;
    // halo de lanterne autour du curseur
    float d = length((p - vec2(m.x, hz)) * vec2(1., 2.6));
    col += uGlow * exp(-d * 3.2) * .38;
    // bougies
    float inBody = bodyX * step(bBot, uv.y) * step(uv.y, bTop + .0015);
    float inWick = wickX * step(wBot, uv.y) * step(uv.y, wTop);
    float glowB = bodyX * exp(-max(0., uv.y - bTop) * 90.) * step(bBot, uv.y) * .25;
    float fade = .55 + .45 * smoothstep(0., .35, abs(p.x - m.x));
    fade = mix(1., fade, .0);
    col = mix(col, ccol, clamp(inBody * .92 + inWick * .7, 0., 1.));
    col += ccol * glowB;
  } else {
    float d = hz - uv.y;
    float persp = 1. / (d * 9. + .18);
    float wave = (n2(vec2(p.x * 2.4 * persp * .25, d * 28. * persp - uTime * .35)) - .5);
    float ox = wave * .045 * (d * 6. + .25);
    // reflet des bougies : on relit la colonne décalée par la houle
    float Xr = (p.x + ox + speed) / cw; float kr = floor(Xr); float fr = fract(Xr);
    vec4 cr = candle(kr);
    vec3 rcol = mix(DOWN, UP, step(cr.x, cr.y));
    float rx = smoothstep(.12, .3, fr) * (1. - smoothstep(.7, .88, fr));
    float shimmer = smoothstep(.35, .85, n2(vec2(p.x * 60., d * 160. - uTime * 1.6)));
    float reach = (max(cr.x, cr.y) * .2 * uIntro + .03);
    float refl = rx * shimmer * exp(-d / max(.02, reach) * 1.2);
    vec3 sea = mix(uLow * .62, vec3(.016, .045, .055), smoothstep(0., hz * .9, d));
    col = sea + rcol * refl * .55;
    // traînée lumineuse sous le curseur
    float lane = exp(-abs(p.x + ox * 2. - m.x) * (6. + 30. * d));
    col += uGlow * lane * shimmer * .32 * exp(-d * 2.2);
    // houle fine
    col += vec3(.75, .8, .8) * smoothstep(.48, .5, wave) * .03 * (1. - d * 1.6);
  }
  // ligne d'horizon et graduation de cours
  col += vec3(.92, .89, .83) * (1. - smoothstep(0., 1.6 * px, abs(uv.y - hz))) * .22;
  float tick = step(.97, fract((p.x + speed) / (cw * 5.))) * (1. - smoothstep(0., 7. * px, abs(uv.y - hz + 4. * px)));
  col += tick * .12;
  // vignette et grain
  vec2 q = uv - .5; col *= 1. - dot(q, q) * .55;
  col += (h2(uv * uRes + fract(uTime) * 91.) - .5) * .035;
  gl_FragColor = vec4(col, 1.);
}`;

function init() {
  if (!host) return;
  if (forceNoGL) return fallback();
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
  gl.clearColor(0.06, 0.13, 0.16, 1);
  gl.canvas.setAttribute("aria-hidden", "true");
  host.appendChild(gl.canvas);
  const pal = palette();
  const geometry = new Triangle(gl);
  let program;
  try {
    program = new Program(gl, {
      vertex, fragment,
      uniforms: {
        uTime: { value: 0 }, uHz: { value: 0.56 }, uRes: { value: [1, 1] }, uMouse: { value: [0.68, 0.5] }, uScroll: { value: 0 }, uIntro: { value: O.still ? 1 : 0 },
        uTop: { value: pal.top }, uLow: { value: pal.low }, uGlow: { value: pal.glow }
      }
    });
  } catch (e) { host.innerHTML = ""; return fallback(); }
  const mesh = new Mesh(gl, { geometry, program });
  function resize() {
    const r = host.getBoundingClientRect();
    renderer.setSize(Math.max(1, r.width), Math.max(1, r.height));
    program.uniforms.uRes.value = [gl.canvas.width, gl.canvas.height];
    const title = document.querySelector(".hero .display");
    if (title) {
      const tr = title.getBoundingClientRect();
      const fromBottom = 1 - (tr.top - r.top - 18) / r.height;
      program.uniforms.uHz.value = Math.max(0.36, Math.min(0.8, fromBottom));
    }
  }
  window.addEventListener("resize", resize); resize();
  if (document.fonts) document.fonts.ready.then(resize);

  let mx = 0.68, my = 0.5, tx = 0.68, ty = 0.5, visible = true, t0 = performance.now();
  window.addEventListener("pointermove", (e) => {
    const r = host.getBoundingClientRect();
    tx = (e.clientX - r.left) / r.width; ty = 1 - (e.clientY - r.top) / r.height;
  }, { passive: true });
  new IntersectionObserver((en) => { visible = en[0].isIntersecting; lastT = 0; if (visible && !O.still && !degraded) requestAnimationFrame(loop); }).observe(host);

  function frame(now) {
    const t = (now - t0) / 1000;
    if (!O.fine) { tx = 0.5 + Math.sin(t * 0.13) * 0.3; }
    mx += (tx - mx) * 0.05; my += (ty - my) * 0.05;
    program.uniforms.uTime.value = t;
    program.uniforms.uMouse.value = [mx, my];
    const sy = O.scrollY ? O.scrollY() : window.scrollY;
    program.uniforms.uScroll.value = Math.min(1, sy / Math.max(1, host.offsetHeight));
    renderer.render({ scene: mesh });
  }
  /* Garde-fou : si l'appareil peine (moins de 25 images/s en moyenne), on passe à l'image fixe */
  const deltas = []; let lastT = 0, degraded = false;
  function loop(now) {
    if (!visible || degraded) return;
    if (lastT) { deltas.push(now - lastT); if (deltas.length === 60) { const avg = deltas.slice(10).reduce((a, b) => a + b, 0) / 50; if (avg > 40 && !forceGL) { degraded = true; gl.canvas.remove(); fallback(); return; } } }
    lastT = now; frame(now); requestAnimationFrame(loop);
  }
  if (O.still) { frame(performance.now() + 4000); window.addEventListener("resize", () => frame(performance.now())); }
  else requestAnimationFrame(loop);

  O.heroIntro = (dur) => {
    if (!window.gsap) { program.uniforms.uIntro.value = 1; return; }
    gsap.to(program.uniforms.uIntro, { value: 1, duration: dur || 1.6, ease: "power3.out" });
  };
  if (O.pendingHeroIntro) O.heroIntro(O.pendingHeroIntro);
}
if (host && !forceNoGL) {
  Promise.all(["core/Renderer.js", "core/Program.js", "core/Mesh.js", "extras/Triangle.js"].map((f) => import(OGL_BASE + f)))
    .then(([a, b, c, d]) => { Renderer = a.Renderer; Program = b.Program; Mesh = c.Mesh; Triangle = d.Triangle; init(); })
    .catch(() => fallback());
} else init();
