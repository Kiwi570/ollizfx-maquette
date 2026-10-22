/* Scènes provisoires dessinées en code.
   Chaque emplacement d'image reçoit une scène tant que la vraie image n'est pas fournie (voir images.js). */
(function () {
  const C = {
    mer: "#0f2229", mer2: "#142d36", mer3: "#1d404c", mer4: "#2a5866", encre: "#08161b",
    calcaire: "#ece4d4", calcaire2: "#a9bab6", lanterne: "#f2b64b", lanterne2: "#ffd58a",
    hausse: "#79d2b5", baisse: "#d4633f", porphyre: "#8c3524"
  };

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function alpha(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp01(v) { return Math.max(0, Math.min(1, v)); }

  let grainPattern = null;
  function grain(ctx, w, h, amount) {
    if (!grainPattern) {
      const g = document.createElement("canvas"); g.width = g.height = 128;
      const gx = g.getContext("2d"); const img = gx.createImageData(128, 128); const r = rng(7);
      for (let i = 0; i < img.data.length; i += 4) { const v = r() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
      gx.putImageData(img, 0, 0); grainPattern = g;
    }
    ctx.save(); ctx.globalAlpha = amount; ctx.globalCompositeOperation = "overlay";
    ctx.fillStyle = ctx.createPattern(grainPattern, "repeat"); ctx.fillRect(0, 0, w, h); ctx.restore();
  }
  function vignette(ctx, w, h, a) {
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, `rgba(3,10,13,${a})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }
  // Marche aléatoire lissée pour les séries de bougies
  function walk(r, n, vol) {
    const out = []; let v = 0.5, drift = 0;
    for (let i = 0; i < n; i++) {
      drift = drift * 0.8 + (r() - 0.5) * vol + (0.5 - v) * vol * 0.35;
      const o = v; v = Math.max(0.08, Math.min(0.92, v + drift));
      const c = v;
      out.push({ o, c, hi: Math.max(o, c) + r() * vol * 1.2, lo: Math.min(o, c) - r() * vol * 1.2 });
    }
    return out;
  }
  function drawCandles(ctx, data, x0, y0, w, h, opts) {
    const n = data.length, step = w / n, bw = Math.max(2, step * (opts.body || 0.56));
    const p = opts.p == null ? 1 : opts.p;
    const shown = Math.floor(n * p);
    ctx.save();
    if (opts.glow) { ctx.shadowBlur = opts.glow; }
    for (let i = 0; i < shown; i++) {
      const d = data[i], x = x0 + i * step + step / 2;
      const up = d.c >= d.o, col = up ? (opts.up || C.hausse) : (opts.down || C.baisse);
      const Y = (v) => y0 + h - v * h;
      ctx.strokeStyle = alpha(col, opts.wickA || 0.8); ctx.lineWidth = Math.max(1, (opts.wick || 1));
      ctx.beginPath(); ctx.moveTo(x, Y(d.hi)); ctx.lineTo(x, Y(d.lo)); ctx.stroke();
      if (opts.glow) ctx.shadowColor = col;
      ctx.fillStyle = alpha(col, opts.a || 1);
      const top = Y(Math.max(d.o, d.c)), bot = Y(Math.min(d.o, d.c));
      ctx.fillRect(x - bw / 2, top, bw, Math.max(1.5, bot - top));
    }
    ctx.restore();
  }
  function gridLines(ctx, w, h, step, col) {
    if (!(step > 1)) return;
    ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 1;
    for (let x = step; x < w; x += step) { ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, 0); ctx.lineTo(Math.round(x) + 0.5, h); ctx.stroke(); }
    for (let y = step; y < h; y += step) { ctx.beginPath(); ctx.moveTo(0, Math.round(y) + 0.5); ctx.lineTo(w, Math.round(y) + 0.5); ctx.stroke(); }
    ctx.restore();
  }

  const S = {};

  /* Mer de nuit : bougies sur l'horizon et leurs reflets */
  S.mer = function (ctx, w, h, r, p, opt) {
    const hz = h * (opt && opt.hz ? +opt.hz : 0.56);
    let g = ctx.createLinearGradient(0, 0, 0, hz);
    g.addColorStop(0, "#071419"); g.addColorStop(0.7, "#12303a"); g.addColorStop(1, "#22495a");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, hz);
    const glow = ctx.createRadialGradient(w * 0.68, hz, 0, w * 0.68, hz, w * 0.5);
    glow.addColorStop(0, alpha(C.lanterne, 0.28)); glow.addColorStop(1, alpha(C.lanterne, 0));
    ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 120; i++) { ctx.fillStyle = `rgba(236,228,212,${r() * 0.5})`; ctx.fillRect(r() * w, r() * hz * 0.75, 1, 1); }
    g = ctx.createLinearGradient(0, hz, 0, h);
    g.addColorStop(0, "#1a3c47"); g.addColorStop(1, "#061115");
    ctx.fillStyle = g; ctx.fillRect(0, hz, w, h - hz);
    const n = Math.max(24, Math.round(w / 16)); const data = walk(r, n, 0.05);
    drawCandles(ctx, data, 0, hz - h * 0.2, w, h * 0.16, { glow: 10, a: 0.85, wickA: 0.6 });
    // reflets
    const step = w / n;
    for (let i = 0; i < n; i++) {
      const d = data[i], up = d.c >= d.o, col = up ? C.hausse : C.baisse, x = i * step + step / 2;
      for (let y = hz + 2; y < h; y += 3 + (y - hz) * 0.04) {
        const k = 1 - (y - hz) / (h - hz);
        if (r() > 0.55) continue;
        ctx.fillStyle = alpha(col, 0.32 * k * k);
        const ww = step * 0.5 * (0.6 + r() * 0.8);
        ctx.fillRect(x - ww / 2 + Math.sin(y * 0.3) * 2, y, ww, 1.4);
      }
    }
    for (let y = hz + 4; y < h; y += 4 + (y - hz) * 0.06) {
      ctx.fillStyle = alpha(C.lanterne2, 0.18 * (1 - (y - hz) / (h - hz)));
      const ww = 30 + (y - hz) * 0.6 * r();
      ctx.fillRect(w * 0.68 - ww / 2 + (r() - 0.5) * 20, y, ww, 1.3);
    }
    ctx.fillStyle = alpha(C.calcaire, 0.25); ctx.fillRect(0, hz, w, 1);
    vignette(ctx, w, h, 0.55); grain(ctx, w, h, 0.09);
  };

  /* Falaises de porphyre au-dessus d'une eau turquoise */
  function vnoise(r, n) { const v = Array.from({ length: n + 2 }, r); return (x) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return v[i % (n + 1)] * (1 - u) + v[(i + 1) % (n + 1)] * u; }; }
  S.falaise = function (ctx, w, h, r) {
    let g = ctx.createLinearGradient(0, 0, 0, h * 0.62);
    g.addColorStop(0, "#22414c"); g.addColorStop(0.65, "#b88a6c"); g.addColorStop(1, "#f0c08c");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h * 0.62);
    const sun = ctx.createRadialGradient(w * 0.78, h * 0.5, 0, w * 0.78, h * 0.5, w * 0.35);
    sun.addColorStop(0, "rgba(255,226,170,0.55)"); sun.addColorStop(1, "rgba(255,226,170,0)");
    ctx.fillStyle = sun; ctx.fillRect(0, 0, w, h);
    g = ctx.createLinearGradient(0, h * 0.58, 0, h);
    g.addColorStop(0, "#3d8f8a"); g.addColorStop(0.5, "#1f5f63"); g.addColorStop(1, "#0a2428");
    ctx.fillStyle = g; ctx.fillRect(0, h * 0.58, w, h * 0.42);
    for (let y = h * 0.6; y < h; y += 2 + (y - h * 0.58) * 0.03) {
      ctx.fillStyle = `rgba(255,236,200,${0.25 * (1 - (y - h * 0.58) / (h * 0.42)) * r()})`;
      const ww = 8 + r() * 60; ctx.fillRect(w * 0.78 - ww / 2 + (r() - 0.5) * w * 0.12, y, ww, 1);
    }
    const layers = [
      { top: 0.3, bot: 0.6, col: ["#6b2a1f", "#8c3524"], x0: -0.05, x1: 0.7, rough: 0.09 },
      { top: 0.4, bot: 0.66, col: ["#8c3524", "#b14a30"], x0: 0.42, x1: 1.05, rough: 0.07 },
      { top: 0.5, bot: 0.8, col: ["#a8432d", "#c35a3a"], x0: -0.05, x1: 0.5, rough: 0.06 },
      { top: 0.7, bot: 1.0, col: ["#3b140e", "#5a1d14"], x0: 0.55, x1: 1.05, rough: 0.05 }
    ];
    layers.forEach((L) => {
      const n1 = vnoise(r, 64), n2 = vnoise(r, 64);
      const xa = L.x0 * w, xb = L.x1 * w, pts = 90, top = [];
      for (let i = 0; i <= pts; i++) {
        const t = i / pts, x = xa + (xb - xa) * t;
        const env = Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, t))), 0.7);
        const n = n1(t * 6) * 0.7 + n2(t * 22) * 0.3;
        const y = h * L.bot - env * (h * (L.bot - L.top)) * (0.55 + n * 0.6) + (r() - 0.5) * h * L.rough * 0.25;
        top.push([x, y]);
      }
      ctx.beginPath(); ctx.moveTo(xa, h);
      top.forEach(([x, y]) => ctx.lineTo(x, y));
      ctx.lineTo(xb, h); ctx.closePath();
      const lg = ctx.createLinearGradient(xa, 0, xb, 0);
      lg.addColorStop(0, L.col[0]); lg.addColorStop(1, L.col[1]);
      ctx.fillStyle = lg; ctx.fill();
      ctx.save(); ctx.clip();
      for (let s = 0; s < 70; s++) {
        const y0 = h * (L.top + r() * (1 - L.top)), x0 = xa + (xb - xa) * r();
        ctx.strokeStyle = r() > 0.5 ? "rgba(255,200,160,0.10)" : "rgba(20,4,2,0.22)"; ctx.lineWidth = 1 + r() * 1.5;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + (r() - 0.3) * w * 0.12, y0 + h * (0.04 + r() * 0.14)); ctx.stroke();
      }
      const shade = ctx.createLinearGradient(0, h * L.top, 0, h);
      shade.addColorStop(0, "rgba(255,190,140,0.16)"); shade.addColorStop(1, "rgba(10,2,0,0.35)");
      ctx.fillStyle = shade; ctx.fillRect(xa, 0, xb - xa, h);
      ctx.restore();
    });
    vignette(ctx, w, h, 0.45); grain(ctx, w, h, 0.1);
  };

  /* Carnet : bougies dessinées au crayon */
  S.carnet = function (ctx, w, h, r, p) {
    ctx.fillStyle = "#e7dfcc"; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(60,70,70,0.22)";
    const s = Math.max(14, w / 30);
    for (let x = s; x < w; x += s) for (let y = s; y < h; y += s) ctx.fillRect(x, y, 1.4, 1.4);
    const n = 18, step = (w * 0.76) / n, x0 = w * 0.12, y0 = h * 0.18, hh = h * 0.56;
    let data = walk(r, n, 0.08);
    if (data[n - 1].c < data[0].o) data = data.map((d) => ({ o: 1 - d.o, c: 1 - d.c, hi: 1 - d.lo, lo: 1 - d.hi }));
    const shown = Math.floor(n * (p == null ? 1 : p));
    for (let i = 0; i < shown; i++) {
      const d = data[i], x = x0 + i * step + step / 2, Y = (v) => y0 + hh - v * hh, up = d.c >= d.o;
      ctx.strokeStyle = "rgba(40,44,44,0.85)"; ctx.lineWidth = 1.3;
      for (let k = 0; k < 2; k++) { ctx.beginPath(); ctx.moveTo(x + (r() - 0.5), Y(d.hi)); ctx.lineTo(x + (r() - 0.5), Y(d.lo)); ctx.stroke(); }
      const top = Y(Math.max(d.o, d.c)), bot = Y(Math.min(d.o, d.c)), bw = step * 0.5;
      ctx.strokeRect(x - bw / 2 + (r() - 0.5), top, bw, Math.max(3, bot - top));
      if (!up) { ctx.save(); ctx.beginPath(); ctx.rect(x - bw / 2, top, bw, Math.max(3, bot - top)); ctx.clip();
        for (let k = -hh; k < hh; k += 3) { ctx.beginPath(); ctx.moveTo(x - bw, top + k); ctx.lineTo(x + bw, top + k + bw); ctx.stroke(); } ctx.restore(); }
    }
    ctx.strokeStyle = alpha("#c98a1a", 0.9); ctx.lineWidth = 2; ctx.beginPath();
    const ly = y0 + hh * 0.42; ctx.moveTo(x0 - 8, ly); for (let x = x0; x < x0 + w * 0.78; x += 12) ctx.lineTo(x, ly + (r() - 0.5) * 2); ctx.stroke();
    ctx.save(); ctx.translate(w * 0.7, h * 0.86); ctx.rotate(-0.42);
    ctx.fillStyle = "#2d5763"; ctx.fillRect(-w * 0.22, -6, w * 0.4, 12);
    ctx.fillStyle = "#e3c08a"; ctx.beginPath(); ctx.moveTo(w * 0.18, -6); ctx.lineTo(w * 0.23, 0); ctx.lineTo(w * 0.18, 6); ctx.fill();
    ctx.fillStyle = "#333"; ctx.beginPath(); ctx.moveTo(w * 0.215, -1.6); ctx.lineTo(w * 0.23, 0); ctx.lineTo(w * 0.215, 1.6); ctx.fill();
    ctx.restore();
    const lamp = ctx.createRadialGradient(w * 0.15, h * 0.1, 0, w * 0.15, h * 0.1, w * 0.9);
    lamp.addColorStop(0, "rgba(255,214,140,0.25)"); lamp.addColorStop(1, "rgba(20,30,30,0.35)");
    ctx.fillStyle = lamp; ctx.fillRect(0, 0, w, h);
    grain(ctx, w, h, 0.12);
  };

  /* Écran dans une pièce sombre */
  S.ecran = function (ctx, w, h, r) {
    ctx.fillStyle = "#061014"; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) {
      const x = r() * w, y = r() * h * 0.6, rad = 6 + r() * Math.min(w, h) * 0.08;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      const col = r() > 0.6 ? C.lanterne : (r() > 0.5 ? C.hausse : C.calcaire2);
      g.addColorStop(0, alpha(col, 0.18)); g.addColorStop(1, alpha(col, 0));
      ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    const mx = w * 0.18, my = h * 0.2, mw = w * 0.64, mh = h * 0.46;
    const halo = ctx.createRadialGradient(w / 2, my + mh / 2, 0, w / 2, my + mh / 2, w * 0.6);
    halo.addColorStop(0, "rgba(121,210,181,0.16)"); halo.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = halo; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#0e2a33"; ctx.fillRect(mx, my, mw, mh);
    ctx.save(); ctx.translate(mx, my);
    ctx.strokeStyle = "rgba(169,186,182,0.12)";
    for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(0, (mh / 6) * i); ctx.lineTo(mw, (mh / 6) * i); ctx.stroke(); }
    drawCandles(ctx, walk(r, 40, 0.05), mw * 0.04, mh * 0.12, mw * 0.92, mh * 0.76, { glow: 6, a: 0.9 });
    ctx.restore();
    ctx.fillStyle = "#03090b"; ctx.fillRect(w * 0.47, my + mh, w * 0.06, h * 0.12);
    const desk = ctx.createLinearGradient(0, h * 0.78, 0, h);
    desk.addColorStop(0, "#14262b"); desk.addColorStop(1, "#050c0e");
    ctx.fillStyle = desk; ctx.fillRect(0, h * 0.78, w, h * 0.22);
    ctx.fillStyle = "rgba(121,210,181,0.08)"; ctx.fillRect(mx, h * 0.8, mw, h * 0.05);
    vignette(ctx, w, h, 0.6); grain(ctx, w, h, 0.12);
  };

  /* Tour de pierre et faisceau de lanterne */
  S.lanterne = function (ctx, w, h, r) {
    let g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#050f13"); g.addColorStop(0.62, "#0f2731"); g.addColorStop(1, "#04090b");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const tx = w * 0.74, ty = h * 0.34, tw = w * 0.07;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const beam = ctx.createLinearGradient(tx, ty, 0, ty + h * 0.1);
    beam.addColorStop(0, "rgba(242,182,75,0.42)"); beam.addColorStop(1, "rgba(242,182,75,0)");
    ctx.fillStyle = beam; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(-w * 0.1, ty - h * 0.22); ctx.lineTo(-w * 0.1, ty + h * 0.32); ctx.closePath(); ctx.fill();
    const halo = ctx.createRadialGradient(tx, ty, 0, tx, ty, w * 0.12);
    halo.addColorStop(0, "rgba(255,213,138,0.9)"); halo.addColorStop(1, "rgba(255,213,138,0)");
    ctx.fillStyle = halo; ctx.fillRect(tx - w * 0.12, ty - w * 0.12, w * 0.24, w * 0.24);
    ctx.restore();
    ctx.fillStyle = "#1b2528";
    ctx.beginPath(); ctx.moveTo(tx - tw * 0.6, h * 0.66); ctx.lineTo(tx - tw * 0.38, ty + 8); ctx.lineTo(tx + tw * 0.38, ty + 8); ctx.lineTo(tx + tw * 0.6, h * 0.66); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    for (let y = ty + 16; y < h * 0.66; y += 9) { ctx.beginPath(); ctx.moveTo(tx - tw, y); ctx.lineTo(tx + tw, y); ctx.stroke(); }
    ctx.fillStyle = "#0b1518"; ctx.fillRect(0, h * 0.66, w, h * 0.34);
    for (let y = h * 0.67; y < h; y += 3 + (y - h * 0.66) * 0.05) {
      const k = 1 - (y - h * 0.66) / (h * 0.34);
      ctx.fillStyle = `rgba(255,213,138,${0.22 * k})`; const ww = 10 + 120 * (1 - k) * r();
      ctx.fillRect(tx - ww / 2 + (r() - 0.5) * 16, y, ww, 1.3);
    }
    const mist = ctx.createLinearGradient(0, h * 0.5, 0, h * 0.75);
    mist.addColorStop(0, "rgba(169,186,182,0)"); mist.addColorStop(0.5, "rgba(169,186,182,0.08)"); mist.addColorStop(1, "rgba(169,186,182,0)");
    ctx.fillStyle = mist; ctx.fillRect(0, 0, w, h);
    vignette(ctx, w, h, 0.5); grain(ctx, w, h, 0.1);
  };

  /* Mosaïque romaine (statique) */
  S.mosaique = function (ctx, w, h, r) {
    ctx.fillStyle = "#cfc4ad"; ctx.fillRect(0, 0, w, h);
    const s = Math.max(8, Math.round(w / 46)), cols = Math.ceil(w / s), rows = Math.ceil(h / s);
    const pal = ["#e8dcc2", "#d9c8a4", "#b98b4e", "#8c3524", "#2a5866", "#1d404c"];
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const m = meander(x, y);
      let c = m ? pal[3 + ((x + y) % 2 ? 0 : 1) * 0] : pal[r() > 0.5 ? 0 : 1];
      if (!m && (y % 14 === 0 || y % 14 === 13)) c = pal[4];
      if (!m && r() > 0.97) c = pal[2];
      ctx.fillStyle = c;
      const j = s * 0.12;
      ctx.fillRect(x * s + j * r(), y * s + j * r(), s - j * 1.6, s - j * 1.6);
    }
    vignette(ctx, w, h, 0.4); grain(ctx, w, h, 0.14);
  };
  function meander(x, y) {
    const yy = ((y % 14) + 14) % 14; if (yy < 3 || yy > 10) return false;
    const u = x % 8, v = yy - 3;
    const pat = ["11111111", "10000001", "10111101", "10100101", "10100101", "10001101", "11111001", "00000001"];
    return pat[v] && pat[v][u] === "1";
  }

  /* Terre de nuit vue de l'orbite */
  S.globe = function (ctx, w, h, r) {
    ctx.fillStyle = "#03080a"; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 220; i++) { ctx.fillStyle = `rgba(236,228,212,${r() * 0.6})`; ctx.fillRect(r() * w, r() * h * 0.5, 1, 1); }
    const R = w * 1.1, cx = w * 0.5, cy = h * 0.55 + R;
    const atm = ctx.createRadialGradient(cx, cy, R * 0.98, cx, cy, R * 1.06);
    atm.addColorStop(0, "rgba(121,210,181,0.5)"); atm.addColorStop(1, "rgba(121,210,181,0)");
    ctx.fillStyle = atm; ctx.beginPath(); ctx.arc(cx, cy, R * 1.06, 0, Math.PI * 2); ctx.fill();
    const body = ctx.createRadialGradient(cx, cy - R * 0.9, R * 0.1, cx, cy, R);
    body.addColorStop(0, "#14303a"); body.addColorStop(1, "#061216");
    ctx.fillStyle = body; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
    const clusters = 14;
    for (let c = 0; c < clusters; c++) {
      const a = -Math.PI / 2 + (r() - 0.5) * 0.9, dist = R * (0.86 + r() * 0.13);
      const px = cx + Math.cos(a) * dist, py = cy + Math.sin(a) * dist;
      for (let k = 0; k < 60; k++) {
        const ox = (r() - 0.5) * w * 0.08, oy = (r() - 0.5) * h * 0.04;
        ctx.fillStyle = `rgba(255,213,138,${0.25 + r() * 0.6})`; ctx.fillRect(px + ox, py + oy, 1.4, 1.4);
      }
      const gl = ctx.createRadialGradient(px, py, 0, px, py, w * 0.06);
      gl.addColorStop(0, "rgba(242,182,75,0.25)"); gl.addColorStop(1, "rgba(242,182,75,0)");
      ctx.fillStyle = gl; ctx.fillRect(px - w * 0.06, py - w * 0.06, w * 0.12, w * 0.12);
    }
    vignette(ctx, w, h, 0.5); grain(ctx, w, h, 0.08);
  };

  /* Atelier : petit groupe vu de dos devant un écran de cours, lumière de fenêtre */
  S.atelier = function (ctx, w, h, r) {
    let g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#24383d"); g.addColorStop(1, "#0a1417");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const wx = w * 0.04, wy = h * 0.08, ww = w * 0.2, wh = h * 0.56;
    const light = ctx.createLinearGradient(wx, wy, wx + ww, wy + wh);
    light.addColorStop(0, "#f6dba6"); light.addColorStop(1, "#d5965a");
    ctx.fillStyle = light; ctx.fillRect(wx, wy, ww, wh);
    ctx.fillStyle = "#1a2a2e"; ctx.fillRect(wx + ww / 2 - 2, wy, 4, wh); ctx.fillRect(wx, wy + wh * 0.45, ww, 4);
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    const beam = ctx.createLinearGradient(wx + ww, wy, w * 0.7, h);
    beam.addColorStop(0, "rgba(255,210,150,0.2)"); beam.addColorStop(1, "rgba(255,210,150,0)");
    ctx.fillStyle = beam; ctx.beginPath(); ctx.moveTo(wx + ww, wy); ctx.lineTo(wx + ww, wy + wh); ctx.lineTo(w * 0.75, h); ctx.lineTo(w * 1.05, h); ctx.closePath(); ctx.fill();
    ctx.restore();
    const sx = w * 0.4, sy = h * 0.12, sw = w * 0.48, sh = h * 0.44;
    const halo = ctx.createRadialGradient(sx + sw / 2, sy + sh / 2, 0, sx + sw / 2, sy + sh / 2, sw);
    halo.addColorStop(0, "rgba(121,210,181,0.18)"); halo.addColorStop(1, "rgba(121,210,181,0)");
    ctx.fillStyle = halo; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#0e2a33"; ctx.fillRect(sx, sy, sw, sh);
    ctx.strokeStyle = "rgba(169,186,182,0.12)";
    for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(sx, sy + (sh / 5) * i); ctx.lineTo(sx + sw, sy + (sh / 5) * i); ctx.stroke(); }
    drawCandles(ctx, walk(r, 30, 0.06), sx + sw * 0.04, sy + sh * 0.1, sw * 0.92, sh * 0.8, { glow: 8, a: 0.95 });
    const people = 6;
    for (let i = 0; i < people; i++) {
      const x = w * (0.06 + i * 0.17) + (r() - 0.5) * w * 0.03, base = h * (0.93 + r() * 0.04), s = h * (0.14 + r() * 0.03);
      const tone = 8 + Math.floor(r() * 10);
      const body = ctx.createRadialGradient(x, base, s * 0.2, x, base, s * 1.8);
      body.addColorStop(0, `rgba(${tone},${tone + 8},${tone + 10},0.97)`); body.addColorStop(0.75, `rgba(${tone},${tone + 8},${tone + 10},0.9)`); body.addColorStop(1, "rgba(5,12,14,0)");
      ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(x, base, s * 1.55, s * 1.05, 0, Math.PI, 0); ctx.fill();
      const head = ctx.createRadialGradient(x, base - s * 1.45, s * 0.1, x, base - s * 1.45, s * 0.62);
      head.addColorStop(0, `rgba(${tone},${tone + 8},${tone + 10},0.98)`); head.addColorStop(0.8, `rgba(${tone},${tone + 8},${tone + 10},0.92)`); head.addColorStop(1, "rgba(5,12,14,0)");
      ctx.fillStyle = head; ctx.beginPath(); ctx.ellipse(x, base - s * 1.45, s * 0.6, s * 0.68, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(255,214,150,0.18)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, base - s * 1.45, s * 0.5, s * 0.6, 0, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke();
    }
    vignette(ctx, w, h, 0.55); grain(ctx, w, h, 0.12);
  };

  /* Carte marine, règle et compas */
  S.instruments = function (ctx, w, h, r) {
    ctx.fillStyle = "#d8d3c2"; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(42,88,102,0.35)"; ctx.lineWidth = 1;
    for (let k = 0; k < 14; k++) {
      ctx.beginPath(); const base = (k / 14) * h * 1.2 - h * 0.1;
      for (let x = 0; x <= w; x += 8) { const y = base + Math.sin(x * 0.012 + k) * 18 + Math.sin(x * 0.031 + k * 2) * 8; x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(140,53,36,0.35)";
    for (let i = 0; i < 10; i++) { ctx.beginPath(); ctx.moveTo((i / 10) * w, 0); ctx.lineTo((i / 10) * w, h); ctx.stroke(); }
    ctx.save(); ctx.translate(w * 0.42, h * 0.56); ctx.rotate(-0.28);
    const rg = ctx.createLinearGradient(0, -h * 0.07, 0, h * 0.07);
    rg.addColorStop(0, "#e2b45e"); rg.addColorStop(1, "#9a6b22");
    ctx.fillStyle = rg; ctx.fillRect(-w * 0.42, -h * 0.06, w * 0.84, h * 0.12);
    ctx.strokeStyle = "rgba(40,24,6,0.7)";
    for (let i = 0; i < 60; i++) { const x = -w * 0.4 + i * (w * 0.8 / 60); ctx.beginPath(); ctx.moveTo(x, -h * 0.06); ctx.lineTo(x, -h * 0.06 + (i % 5 ? 6 : 12)); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = "#1d404c"; ctx.lineWidth = 3;
    const cx = w * 0.74, cy = h * 0.3;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx - w * 0.08, cy + h * 0.38); ctx.moveTo(cx, cy); ctx.lineTo(cx + w * 0.1, cy + h * 0.36); ctx.stroke();
    ctx.fillStyle = "#1d404c"; ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(29,64,76,0.35)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, h * 0.38, 1.2, 2.1); ctx.stroke();
    const sh = ctx.createLinearGradient(0, 0, w, h);
    sh.addColorStop(0, "rgba(255,230,180,0.18)"); sh.addColorStop(1, "rgba(5,15,18,0.45)");
    ctx.fillStyle = sh; ctx.fillRect(0, 0, w, h);
    grain(ctx, w, h, 0.12);
  };

  /* Fiches empilées */
  S.fiches = function (ctx, w, h, r) {
    ctx.fillStyle = "#16313a"; ctx.fillRect(0, 0, w, h);
    const lamp = ctx.createRadialGradient(w * 0.3, h * 0.2, 0, w * 0.3, h * 0.2, w);
    lamp.addColorStop(0, "rgba(255,213,138,0.2)"); lamp.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = lamp; ctx.fillRect(0, 0, w, h);
    const cw = w * 0.5, ch = cw * 0.62;
    for (let i = 0; i < 7; i++) {
      ctx.save(); ctx.translate(w * (0.32 + r() * 0.36), h * (0.3 + r() * 0.4)); ctx.rotate((r() - 0.5) * 0.7);
      ctx.shadowColor = "rgba(0,0,0,0.45)"; ctx.shadowBlur = 24; ctx.shadowOffsetY = 10;
      ctx.fillStyle = i % 3 === 0 ? "#efe7d6" : "#e4dac5"; ctx.fillRect(-cw / 2, -ch / 2, cw, ch);
      ctx.shadowColor = "transparent";
      ctx.strokeStyle = "rgba(42,88,102,0.3)";
      for (let k = 1; k < 7; k++) { ctx.beginPath(); ctx.moveTo(-cw / 2 + 10, -ch / 2 + k * ch / 7); ctx.lineTo(cw / 2 - 10, -ch / 2 + k * ch / 7); ctx.stroke(); }
      ctx.strokeStyle = "rgba(212,99,63,0.6)"; ctx.beginPath(); ctx.moveTo(-cw / 2 + 24, -ch / 2); ctx.lineTo(-cw / 2 + 24, ch / 2); ctx.stroke();
      if (i === 6) {
        ctx.strokeStyle = "rgba(30,30,30,0.7)"; ctx.lineWidth = 1.4; ctx.beginPath();
        for (let x = -cw / 2 + 36; x < cw / 2 - 20; x += 6) ctx.lineTo(x, -ch * 0.2 + Math.sin(x * 0.08) * 6 + (r() - 0.5) * 3); ctx.stroke();
        ctx.beginPath(); for (let x = -cw / 2 + 36; x < cw / 2 - 70; x += 6) ctx.lineTo(x, ch * 0.05 + (r() - 0.5) * 2); ctx.stroke();
      }
      ctx.restore();
    }
    vignette(ctx, w, h, 0.5); grain(ctx, w, h, 0.1);
  };

  /* Rue provençale */
  S.rue = function (ctx, w, h, r) {
    let g = ctx.createLinearGradient(0, 0, 0, h * 0.3);
    g.addColorStop(0, "#7fb3c0"); g.addColorStop(1, "#e9d2ac");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const vp = { x: w * 0.55, y: h * 0.42 };
    ctx.fillStyle = "#d9a877"; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(vp.x - w * 0.06, vp.y - h * 0.3); ctx.lineTo(vp.x - w * 0.06, vp.y + h * 0.08); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#c98863"; ctx.beginPath(); ctx.moveTo(w, 0); ctx.lineTo(vp.x + w * 0.06, vp.y - h * 0.28); ctx.lineTo(vp.x + w * 0.06, vp.y + h * 0.08); ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#8b7a64"; ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(vp.x - w * 0.06, vp.y + h * 0.08); ctx.lineTo(vp.x + w * 0.06, vp.y + h * 0.08); ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
    for (let side = 0; side < 2; side++) {
      for (let k = 0; k < 5; k++) {
        const t = k / 5, x = side ? lerp(w * 0.96, vp.x + w * 0.08, t) : lerp(w * 0.04, vp.x - w * 0.08, t);
        const s = lerp(1, 0.18, t);
        for (let f = 0; f < 3; f++) {
          const y = lerp(h * 0.12, vp.y - h * 0.2, t) + f * h * 0.24 * s;
          ctx.fillStyle = f === 2 ? "#2a5866" : "#3d7f8a";
          ctx.fillRect(x - (side ? w * 0.06 : 0) * s, y, w * 0.06 * s, h * 0.14 * s);
        }
      }
    }
    ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.beginPath(); ctx.moveTo(w, 0); ctx.lineTo(vp.x + w * 0.06, vp.y - h * 0.28); ctx.lineTo(vp.x + w * 0.06, vp.y + h * 0.08); ctx.lineTo(w, h); ctx.fill();
    vignette(ctx, w, h, 0.35); grain(ctx, w, h, 0.12);
  };

  /* --- Mini-scènes des modules (dessin progressif avec p) --- */
  function miniBase(ctx, w, h) {
    ctx.fillStyle = C.mer2; ctx.fillRect(0, 0, w, h);
    gridLines(ctx, w, h, Math.max(18, w / 10), "rgba(169,186,182,0.07)");
  }
  S.paire = function (ctx, w, h, r, p) {
    miniBase(ctx, w, h); p = p == null ? 1 : p;
    const R = Math.min(w, h) * 0.24, cy = h * 0.5, off = R * 0.62 * p;
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = C.hausse; ctx.beginPath(); ctx.arc(w / 2 - off, cy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = C.lanterne; ctx.beginPath(); ctx.arc(w / 2 + off, cy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = C.calcaire; ctx.font = `400 ${Math.round(R * 0.5)}px "Instrument Serif", Georgia, serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.globalAlpha = p; ctx.fillText("EUR", w / 2 - off - R * 0.2, cy); ctx.fillText("USD", w / 2 + off + R * 0.2, cy); ctx.globalAlpha = 1;
    ctx.font = `500 ${Math.round(R * 0.22)}px "Geist Mono", monospace`; ctx.fillStyle = C.calcaire2;
    ctx.fillText("1,1002 / 1,1004", w / 2, h * 0.86);
  };
  S.chandeliers = function (ctx, w, h, r, p) {
    miniBase(ctx, w, h);
    drawCandles(ctx, walk(r, 22, 0.07), w * 0.06, h * 0.12, w * 0.88, h * 0.76, { p, glow: 6 });
  };
  S.ordres = function (ctx, w, h, r, p) {
    miniBase(ctx, w, h); p = p == null ? 1 : p;
    const lv = [{ y: 0.32, c: C.hausse, t: "Take-profit" }, { y: 0.55, c: C.lanterne, t: "Entrée" }, { y: 0.72, c: C.baisse, t: "Stop-loss" }];
    ctx.font = `500 ${Math.max(10, Math.round(w / 34))}px "Geist Mono", monospace`; ctx.textBaseline = "bottom";
    lv.forEach((l) => { ctx.strokeStyle = l.c; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(0, h * l.y); ctx.lineTo(w * p, h * l.y); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = l.c; ctx.fillText(l.t, 10, h * l.y - 4); });
    ctx.strokeStyle = C.calcaire; ctx.lineWidth = 1.6; ctx.beginPath();
    let y = h * 0.55; for (let x = 0; x <= w * 0.55 * p + w * 0.4 * p; x += 6) { y += (r() - 0.52) * 7; y = Math.max(h * 0.3, Math.min(h * 0.8, y)); x === 0 ? ctx.moveTo(x + w * 0.04, y) : ctx.lineTo(x + w * 0.04, y); } ctx.stroke();
  };
  S.risque = function (ctx, w, h, r, p) {
    miniBase(ctx, w, h); p = p == null ? 1 : p;
    const n = 10, s = Math.min(w, h) * 0.07, gap = s * 0.28, tot = n * s + (n - 1) * gap, x0 = (w - tot) / 2, y0 = (h - tot) / 2;
    const lit = Math.floor(100 * p);
    for (let i = 0; i < 100; i++) {
      const x = x0 + (i % n) * (s + gap), y = y0 + Math.floor(i / n) * (s + gap);
      ctx.fillStyle = i === 99 && p >= 1 ? C.baisse : (i < lit ? alpha(C.hausse, 0.85) : C.mer3);
      ctx.fillRect(x, y, s, s);
    }
  };
  S.technique = function (ctx, w, h, r, p) {
    miniBase(ctx, w, h); p = p == null ? 1 : p;
    ctx.fillStyle = alpha(C.baisse, 0.14); ctx.fillRect(0, h * 0.24, w, h * 0.08);
    ctx.fillStyle = alpha(C.hausse, 0.14); ctx.fillRect(0, h * 0.66, w, h * 0.08);
    ctx.strokeStyle = C.calcaire; ctx.lineWidth = 1.6; ctx.beginPath();
    for (let x = 0; x <= w * p; x += 4) { const y = h * 0.49 + Math.sin(x * 0.045) * h * 0.19 + Math.sin(x * 0.13) * h * 0.03; x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke();
  };
  S.fondamental = function (ctx, w, h, r, p) {
    miniBase(ctx, w, h); p = p == null ? 1 : p;
    const cols = 7, rows = 4, cw = w * 0.8 / cols, ch = h * 0.5 / rows, x0 = w * 0.1, y0 = h * 0.12;
    for (let i = 0; i < cols * rows; i++) {
      const x = x0 + (i % cols) * cw, y = y0 + Math.floor(i / cols) * ch;
      ctx.strokeStyle = "rgba(169,186,182,0.25)"; ctx.strokeRect(x + 2, y + 2, cw - 4, ch - 4);
      if (i === 17) { ctx.fillStyle = alpha(C.lanterne, 0.85 * p); ctx.fillRect(x + 2, y + 2, cw - 4, ch - 4); }
    }
    ctx.strokeStyle = C.calcaire; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let x = 0; x <= w * p; x += 4) { const spike = Math.exp(-Math.pow((x - w * 0.6) / (w * 0.03), 2)) * h * 0.18; const y = h * 0.85 - spike + Math.sin(x * 0.2) * 2; x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();
  };
  S.plan = function (ctx, w, h, r, p) {
    miniBase(ctx, w, h); p = p == null ? 1 : p;
    for (let i = 0; i < 4; i++) {
      const y = h * (0.16 + i * 0.1);
      ctx.strokeStyle = C.calcaire2; ctx.strokeRect(w * 0.08, y, 10, 10);
      if (i / 4 < p) { ctx.strokeStyle = C.hausse; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(w * 0.08 + 2, y + 5); ctx.lineTo(w * 0.08 + 5, y + 8); ctx.lineTo(w * 0.08 + 9, y + 1); ctx.stroke(); ctx.lineWidth = 1; }
      ctx.fillStyle = "rgba(169,186,182,0.35)"; ctx.fillRect(w * 0.08 + 20, y + 3, w * (0.3 + (i % 2) * 0.12), 4);
    }
    ctx.strokeStyle = C.lanterne; ctx.lineWidth = 1.6; ctx.beginPath();
    let y = h * 0.86; for (let x = w * 0.08; x <= w * 0.08 + w * 0.84 * p; x += 6) { y -= (r() - 0.42) * 4; y = Math.max(h * 0.58, Math.min(h * 0.92, y)); x === w * 0.08 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();
  };
  S.psy = function (ctx, w, h, r, p) {
    miniBase(ctx, w, h); p = p == null ? 1 : p;
    ctx.lineWidth = 1.6; ctx.strokeStyle = C.calcaire; ctx.beginPath();
    for (let x = 0; x <= w * p; x += 3) {
      const t = x / w, calm = clamp01((t - 0.35) * 2.2);
      const amp = lerp(h * 0.26, h * 0.04, calm), f = lerp(0.12, 0.04, calm);
      const y = h * 0.5 + Math.sin(x * f) * amp * (0.6 + Math.sin(x * 0.37) * 0.4);
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  };

  /* --- Montage dans la page --- */
  const ratioOf = (el) => { const r = getComputedStyle(el).aspectRatio; return r; };
  function paint(fig) {
    const canvas = fig.querySelector("canvas.ph"); if (!canvas) return;
    const rect = fig.getBoundingClientRect(); if (rect.width < 2 || rect.height < 2) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(rect.width), h = Math.round(rect.height);
    if (canvas._w === w && canvas._h === h && canvas._p === fig._p) return;
    canvas._w = w; canvas._h = h; canvas._p = fig._p;
    canvas.width = w * dpr; canvas.height = h * dpr;
    const ctx = canvas.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const fn = S[fig.dataset.scene] || S.mer;
    fn(ctx, w, h, rng(hashStr(fig.dataset.img || fig.dataset.scene || "x")), fig._p, fig.dataset);
  }

  function mount(root) {
    const imgs = window.OLLIZ_IMAGES || {};
    (root || document).querySelectorAll(".visuel[data-scene]").forEach((fig) => {
      if (fig._mounted) return; fig._mounted = true;
      const name = fig.dataset.img; const host = fig.querySelector(".parallax-inner") || fig;
      if (name && imgs[name]) {
        const img = new Image(); img.decoding = "async"; img.loading = fig.hasAttribute("data-eager") ? "eager" : "lazy";
        img.alt = imgs[name].alt || fig.dataset.alt || "";
        img.src = `assets/img/${name}.webp`;
        img.srcset = `assets/img/${name}-800.webp 800w, assets/img/${name}.webp 1800w`;
        img.sizes = fig.dataset.sizes || "100vw";
        if (imgs[name + "-mobile"]) {
          const pic = document.createElement("picture"), src = document.createElement("source");
          src.media = "(max-width: 760px)"; src.srcset = `assets/img/${name}-mobile.webp`;
          pic.appendChild(src); pic.appendChild(img); pic.style.cssText = "position:absolute;inset:0"; img.style.cssText = "width:100%;height:100%;object-fit:cover";
          host.appendChild(pic);
        } else host.appendChild(img);
        return;
      }
      const c = document.createElement("canvas"); c.className = "ph";
      c.setAttribute("role", "img"); c.setAttribute("aria-label", fig.dataset.alt || "Visuel provisoire");
      host.appendChild(c);
      if (name && !fig.hasAttribute("data-notag")) {
        const tag = document.createElement("span"); tag.className = "ph-tag"; tag.textContent = `Visuel provisoire, ${name}.webp`;
        tag.setAttribute("aria-hidden", "true"); fig.appendChild(tag);
      }
      if (fig.hasAttribute("data-draw") || fig.hasAttribute("data-draw-h")) fig._p = 0;
      paint(fig);
    });
  }
  let t; window.addEventListener("resize", () => { clearTimeout(t); t = setTimeout(() => document.querySelectorAll(".visuel[data-scene]").forEach(paint), 180); });

  window.OLLIZ_SCENES = { mount, paint, painters: S, colors: C, rng, walk, drawCandles, alpha, meander, grain, vignette };
})();
