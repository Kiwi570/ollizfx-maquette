/* OLLIZ FX — comportements communs à toutes les pages */
(function () {
  const html = document.documentElement;
  html.classList.remove("no-js");
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    sget(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    sset(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  };
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const calm = store.get("ollizCalm") === "1";
  if (reduce) html.classList.add("reduce");
  if (calm) html.classList.add("calme");
  const still = reduce || calm;
  const hasGsap = typeof window.gsap !== "undefined";
  const fine = window.matchMedia("(pointer: fine)").matches;

  const O = (window.OLLIZ = { calm, reduce, still, store, fine, onReady: [] });

  if (hasGsap) {
    const plugins = [window.ScrollTrigger, window.SplitText].filter(Boolean);
    gsap.registerPlugin(...plugins);
  }

  /* ---------- Scènes provisoires ---------- */
  if (window.OLLIZ_SCENES) OLLIZ_SCENES.mount(document);

  /* ---------- Défilement fluide ---------- */
  let lenis = null;
  if (!still && window.Lenis && hasGsap) {
    lenis = new Lenis({ autoRaf: false, lerp: 0.11, smoothWheel: true, wheelMultiplier: 0.95 });
    if (window.ScrollTrigger) lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  O.lenis = lenis;
  O.scrollY = () => (lenis ? lenis.scroll : window.scrollY);

  // ancres de la page courante, écrites « #id » ou « page.html#id » : défilement sans rechargement
  const pageDe = (p) => p.replace(/\/index(\.html)?$/, "/").replace(/\.html$/, "");
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a || a.target === "_blank" || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const u = new URL(a.getAttribute("href"), location.href);
    if (u.origin !== location.origin || pageDe(u.pathname) !== pageDe(location.pathname) || !u.hash) return;
    const id = decodeURIComponent(u.hash.slice(1)); if (!id) return;
    const target = document.getElementById(id); if (!target) return;
    if (history.replaceState) history.replaceState(null, "", u.hash);
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { offset: -80, duration: 1.4 });
    else target.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" });
    target.setAttribute("tabindex", "-1"); target.focus({ preventScroll: true });
  });

  /* ---------- En-tête ---------- */
  const header = document.querySelector(".header");
  let lastY = 0;
  function onScrollHeader() {
    const y = O.scrollY();
    if (!header) return;
    header.classList.toggle("is-solid", y > 24);
    const down = y > lastY;
    header.classList.toggle("is-hidden", down && y > 420 && !document.querySelector(".mobile-nav:not([hidden])"));
    lastY = y;
  }
  if (lenis) lenis.on("scroll", onScrollHeader); else window.addEventListener("scroll", onScrollHeader, { passive: true });
  onScrollHeader();

  const menuBtn = document.querySelector(".menu-btn");
  const mnav = document.querySelector(".mobile-nav");
  if (menuBtn && mnav) {
    const close = () => { mnav.hidden = true; menuBtn.setAttribute("aria-expanded", "false"); html.style.overflow = ""; if (lenis) lenis.start(); menuBtn.focus(); };
    menuBtn.addEventListener("click", () => {
      mnav.hidden = false; menuBtn.setAttribute("aria-expanded", "true"); html.style.overflow = "hidden"; if (lenis) lenis.stop();
      const first = mnav.querySelector("a"); if (first) first.focus();
      if (hasGsap && !still) gsap.from(mnav.querySelectorAll("a"), { yPercent: 60, autoAlpha: 0, stagger: 0.05, duration: 0.6, ease: "power3.out" });
    });
    mnav.querySelector(".close").addEventListener("click", close);
    mnav.addEventListener("keydown", (e) => {
      if (e.key === "Escape") return close();
      if (e.key !== "Tab") return;
      const f = [...mnav.querySelectorAll("a, button")]; const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    mnav.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => { mnav.hidden = true; menuBtn.setAttribute("aria-expanded", "false"); html.style.overflow = ""; if (lenis) lenis.start(); }));
  }

  /* ---------- Mode calme ---------- */
  document.querySelectorAll(".calm-toggle").forEach((b) => {
    b.setAttribute("aria-pressed", calm ? "true" : "false");
    b.addEventListener("click", () => {
      store.set("ollizCalm", calm ? "0" : "1");
      store.sset("ollizNav", "0");
      location.reload();
    });
  });

  /* ---------- Rideau de bougies (transition de page) ---------- */
  let curtain = null;
  if (!still && hasGsap) {
    curtain = document.createElement("div"); curtain.className = "curtain"; curtain.setAttribute("aria-hidden", "true");
    for (let i = 0; i < 12; i++) curtain.appendChild(document.createElement("span"));
    document.body.appendChild(curtain);
    const spans = curtain.querySelectorAll("span");
    if (store.sget("ollizNav") === "1") {
      curtain.classList.add("cover");
      gsap.set(spans, { transformOrigin: "50% 0%" });
      gsap.to(spans, { scaleY: 0, duration: 0.5, ease: "power3.inOut", stagger: { each: 0.022, from: "center" }, delay: 0.02,
        onComplete: () => curtain.classList.remove("cover") });
    }
    store.sset("ollizNav", "0");
    document.addEventListener("click", (e) => {
      const a = e.target.closest("a[href]"); if (!a || e.defaultPrevented) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || a.target === "_blank" || a.hasAttribute("download") || /^(mailto|tel|sms|https?):/i.test(href) || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      store.sset("ollizNav", "1");
      gsap.set(spans, { transformOrigin: "50% 100%", scaleY: 0 });
      gsap.to(spans, { scaleY: 1, duration: 0.38, ease: "power3.in", stagger: { each: 0.018, from: "edges" }, onComplete: () => { window.location.href = href; } });
    });
    window.addEventListener("pageshow", (e) => { if (e.persisted) gsap.set(spans, { scaleY: 0 }); });
  }

  /* ---------- Réticule ---------- */
  const paris = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  O.parisTime = () => paris.format(new Date());
  if (fine && !still) {
    const ch = document.createElement("div"); ch.className = "crosshair"; ch.setAttribute("aria-hidden", "true");
    ch.innerHTML = '<div class="h"></div><div class="v"></div><div class="dot"></div><div class="tag-y"></div><div class="tag-x"></div>';
    document.body.appendChild(ch); html.classList.add("has-crosshair");
    const ZONES = ".hero, .ring-box, .mosaic, .heatmap-wrap, .module .visuel, .tool-out .visuel, .diagram, .map";
    const H = ch.querySelector(".h"), V = ch.querySelector(".v"), D = ch.querySelector(".dot"), TY = ch.querySelector(".tag-y"), TX = ch.querySelector(".tag-x");
    let tx = innerWidth / 2, ty = innerHeight / 2, x = tx, y = ty, last = "", lastY = "", running = false, docH = 1;
    const measure = () => { docH = Math.max(1, document.documentElement.scrollHeight); };
    measure(); window.addEventListener("resize", measure); if (window.ScrollTrigger) ScrollTrigger.addEventListener("refresh", measure);
    const wake = () => { if (!running) { running = true; requestAnimationFrame(loop); } };
    window.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      tx = e.clientX; ty = e.clientY;
      const zone = e.target.closest && e.target.closest(ZONES);
      const inter = e.target.closest && e.target.closest("a, button, input, select, textarea, label, summary, [data-cursor]");
      const on = !!zone && !inter;
      ch.classList.toggle("on", on); html.classList.toggle("cross-active", on);
      if (on) wake();
    }, { passive: true });
    document.addEventListener("pointerleave", () => ch.classList.remove("on"));
    window.addEventListener("blur", () => ch.classList.remove("on"));
    function loop() {
      x += (tx - x) * 0.32; y += (ty - y) * 0.32;
      H.style.transform = `translateY(${y}px)`; V.style.transform = `translateX(${x}px)`;
      D.style.transform = `translate(${x}px, ${y}px)`;
      const pct = ((O.scrollY() + y) / docH) * 100;
      const ytxt = pct.toFixed(1).replace(".", ",") + "\u00a0%";
      TY.style.top = y + "px"; if (ytxt !== lastY) { TY.textContent = ytxt; lastY = ytxt; }
      TX.style.left = x + "px";
      const now = paris.format(new Date()); if (now !== last) { TX.textContent = now; last = now; }
      if (Math.abs(tx - x) < 0.3 && Math.abs(ty - y) < 0.3) { running = false; return; }
      requestAnimationFrame(loop);
    }
    H.style.top = V.style.left = D.style.left = D.style.top = "0px";
    if (lenis) lenis.on("scroll", () => { if (ch.classList.contains("on")) { lastY = ""; wake(); } }); else window.addEventListener("scroll", wake, { passive: true });
    setInterval(() => { if (ch.classList.contains("on")) wake(); }, 1000);
    wake();
  }

  /* ---------- Axe de prix : progression de lecture ---------- */
  const axis = document.querySelector(".axis");
  if (axis) {
    const cv = axis.querySelector("canvas"), chip = axis.querySelector(".now");
    const ctx = cv.getContext("2d");
    const noise = (v) => Math.sin(v * 0.9) * 0.5 + Math.sin(v * 2.3 + 1.7) * 0.3 + Math.sin(v * 5.1 + 0.3) * 0.2;
    function drawAxis() {
      if (getComputedStyle(axis).display === "none") return;
      const w = axis.clientWidth, h = axis.clientHeight, dpr = Math.min(devicePixelRatio || 1, 2);
      if (cv.width !== w * dpr || cv.height !== h * dpr) { cv.width = w * dpr; cv.height = h * dpr; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
      const sy = O.scrollY(), docH = Math.max(1, document.documentElement.scrollHeight);
      ctx.font = '500 10px "Geist Mono", ui-monospace, monospace'; ctx.textBaseline = "middle";
      for (let pct = 0; pct <= 100; pct += 2.5) {
        const yy = (pct / 100) * docH - sy; if (yy < -10 || yy > h + 10) continue;
        const major = pct % 10 === 0;
        ctx.fillStyle = major ? "rgba(169,186,182,0.7)" : "rgba(169,186,182,0.28)";
        ctx.fillRect(0, Math.round(yy), major ? 10 : 5, 1);
        if (major) ctx.fillText(String(pct), 16, yy);
      }
      ctx.strokeStyle = "rgba(121,210,181,0.55)"; ctx.lineWidth = 1; ctx.beginPath();
      for (let yy = 0; yy <= h; yy += 4) {
        const v = noise((sy + yy) * 0.006); const xx = w * 0.62 + v * w * 0.22;
        yy === 0 ? ctx.moveTo(xx, yy) : ctx.lineTo(xx, yy);
      }
      ctx.stroke();
      const prog = Math.min(100, Math.max(0, ((sy + h / 2) / docH) * 100));
      chip.style.top = h / 2 + "px"; chip.textContent = prog.toFixed(1).replace(".", ",");
    }
    if (lenis) lenis.on("scroll", drawAxis); else window.addEventListener("scroll", drawAxis, { passive: true });
    window.addEventListener("resize", drawAxis); drawAxis();
    if (document.fonts) document.fonts.ready.then(drawAxis);
  }

  /* ---------- Boutons magnétiques ---------- */
  if (fine && !still && hasGsap) {
    document.querySelectorAll(".btn, .magnetic").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        gsap.to(el, { x: ((e.clientX - r.left) / r.width - 0.5) * 14, y: ((e.clientY - r.top) / r.height - 0.5) * 10, duration: 0.4, ease: "power3.out" });
      });
      el.addEventListener("pointerleave", () => gsap.to(el, { x: 0, y: 0, duration: 0.8, ease: "elastic.out(1, 0.4)" }));
    });
  }

  /* ---------- Révélations au défilement ---------- */
  function setupReveals() {
    if (still || !hasGsap || !window.ScrollTrigger) return;
    document.querySelectorAll("[data-split]").forEach((el) => {
      if (!window.SplitText || el.closest(".hero")) return;
      const split = SplitText.create(el, { type: "lines", mask: "lines", linesClass: "sl", reduceWhiteSpace: false });
      gsap.from(split.lines, { yPercent: 105, duration: 1.1, ease: "expo.out", stagger: 0.08, scrollTrigger: { trigger: el, start: "top 86%", once: true }, onComplete: () => split.revert() });
    });
    document.querySelectorAll("[data-reveal]").forEach((el) => {
      gsap.from(el, { y: 36, autoAlpha: 0, duration: 1, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 90%", once: true } });
    });
    document.querySelectorAll("[data-stagger]").forEach((el) => {
      gsap.from(el.children, { y: 28, autoAlpha: 0, duration: 0.9, ease: "power3.out", stagger: 0.07, scrollTrigger: { trigger: el, start: "top 88%", once: true } });
    });
    document.querySelectorAll(".visuel[data-clip]").forEach((el) => {
      gsap.fromTo(el, { clipPath: "inset(14% 8% 14% 8%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.5, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 88%", once: true } });
    });
    document.querySelectorAll(".visuel[data-parallax]").forEach((el) => {
      const inner = el.querySelector(".parallax-inner"); if (!inner) return;
      gsap.fromTo(inner, { yPercent: -6 }, { yPercent: 6, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } });
    });
    document.querySelectorAll(".visuel[data-draw]").forEach((el) => {
      const st = { p: 0 };
      gsap.to(st, { p: 1, duration: 1.8, ease: "power2.inOut", scrollTrigger: { trigger: el, start: "top 92%", once: true, horizontal: false },
        onUpdate: () => { el._p = st.p; OLLIZ_SCENES.paint(el); } });
    });
  }
  O.finishDraw = () => document.querySelectorAll(".visuel[data-draw], .visuel[data-draw-h]").forEach((el) => { el._p = 1; OLLIZ_SCENES.paint(el); });
  if (still) O.finishDraw();

  /* ---------- Accordéons ---------- */
  document.querySelectorAll(".qa").forEach((qa, i) => {
    const btn = qa.querySelector("button"), ans = qa.querySelector(".answer");
    if (!btn || !ans) return;
    const id = ans.id || `qa-${i}`; ans.id = id; btn.setAttribute("aria-controls", id); btn.setAttribute("aria-expanded", "false");
    ans.setAttribute("role", "region");
    btn.addEventListener("click", () => {
      const open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!open));
      if (hasGsap && !still) {
        gsap.to(ans, { height: open ? 0 : "auto", duration: 0.6, ease: "power3.inOut", onComplete: () => window.ScrollTrigger && ScrollTrigger.refresh() });
      } else { ans.style.height = open ? "0px" : "auto"; }
    });
  });

  /* ---------- Copier ---------- */
  document.querySelectorAll("[data-copy]").forEach((b) => {
    b.addEventListener("click", () => {
      const txt = b.dataset.copy; const label = b.textContent;
      const done = () => { b.textContent = "Copié"; setTimeout(() => (b.textContent = label), 1600); };
      const fallback = () => {
        const target = document.getElementById(b.dataset.target);
        if (target) { const r = document.createRange(); r.selectNodeContents(target); const s = getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = "Sélectionné"; setTimeout(() => (b.textContent = label), 1600); }
      };
      try { navigator.clipboard.writeText(txt).then(done, fallback); } catch (e) { fallback(); }
    });
  });

  /* ---------- Formulaires simulés ---------- */
  document.querySelectorAll("form[data-sim-form]").forEach((f) => {
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      let ok = true;
      f.querySelectorAll("[required]").forEach((el) => {
        const field = el.closest(".field"); let err = field && field.querySelector(".err");
        const valid = el.checkValidity();
        if (!valid) {
          ok = false;
          if (field && !err) { err = document.createElement("span"); err.className = "err"; field.appendChild(err); }
          if (err) { err.textContent = el.type === "email" && el.value ? "Adresse e-mail incomplète : vérifiez le @ et le domaine." : "Ce champ est nécessaire pour répondre à votre demande."; err.id = err.id || (el.id || el.name || "f") + "-err"; el.setAttribute("aria-describedby", err.id); }
          el.setAttribute("aria-invalid", "true");
        } else { if (err) err.remove(); el.removeAttribute("aria-invalid"); }
      });
      if (!ok) { const first = f.querySelector("[aria-invalid]"); if (first) first.focus(); return; }
      const out = f.querySelector("[data-sim-ok]");
      if (out) { out.hidden = false; out.focus && out.focus(); }
      f.querySelectorAll("button[type=submit]").forEach((b) => (b.disabled = true));
    });
  });

  /* ---------- Lexique : fenêtre de définition ---------- */
  let pop = null;
  O.openTerm = function (id, anchor) {
    const data = (window.OLLIZ_DATA || { terms: [] }).terms.find((t) => t.id === id); if (!data) return;
    if (pop) pop.remove();
    pop = document.createElement("div"); pop.className = "popover"; pop.setAttribute("role", "dialog"); pop.setAttribute("aria-label", data.t);
    pop.innerHTML = `<button type="button" aria-label="Fermer la définition">×</button><h3></h3><p></p><a href="lexique.html#${data.id}">Voir dans le lexique</a>`;
    pop.querySelector("h3").textContent = data.t; pop.querySelector("p").textContent = data.d;
    document.body.appendChild(pop);
    const r = anchor.getBoundingClientRect(), pw = pop.offsetWidth, ph = pop.offsetHeight;
    let left = Math.min(Math.max(16, r.left + r.width / 2 - pw / 2), innerWidth - pw - 16);
    let top = r.bottom + 12; if (top + ph > innerHeight - 16) top = Math.max(16, r.top - ph - 12);
    pop.style.left = left + "px"; pop.style.top = top + "px";
    if (hasGsap && !still) gsap.from(pop, { y: 12, autoAlpha: 0, duration: 0.35, ease: "power2.out" });
    const closeBtn = pop.querySelector("button"); closeBtn.focus({ preventScroll: true });
    const close = () => { if (pop) { pop.remove(); pop = null; } anchor.focus({ preventScroll: true }); document.removeEventListener("pointerdown", outside, true); };
    const outside = (e) => { if (pop && !pop.contains(e.target) && e.target !== anchor) close(); };
    closeBtn.addEventListener("click", close);
    pop.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    setTimeout(() => document.addEventListener("pointerdown", outside, true), 0);
  };
  const dropPop = () => { if (pop) { pop.remove(); pop = null; } };
  if (lenis) lenis.on("scroll", dropPop); else window.addEventListener("scroll", dropPop, { passive: true });
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-term]"); if (b) { e.preventDefault(); O.openTerm(b.dataset.term, b); } });

  /* ---------- Horloge des sessions de marché ---------- */
  const SESSIONS = [
    { id: "sydney", name: "Sydney", tz: "Australia/Sydney", open: 8, close: 17, c: "#a9bab6" },
    { id: "tokyo", name: "Tokyo", tz: "Asia/Tokyo", open: 9, close: 18, c: "#79d2b5" },
    { id: "londres", name: "Londres", tz: "Europe/London", open: 8, close: 17, c: "#f2b64b" },
    { id: "newyork", name: "New York", tz: "America/New_York", open: 8, close: 17, c: "#d4633f" }
  ];
  const fmtCache = {};
  function parts(date, tz) {
    const f = fmtCache[tz] || (fmtCache[tz] = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", weekday: "short" }));
    const o = {}; f.formatToParts(date).forEach((p) => (o[p.type] = p.value)); o.hour = +o.hour % 24; return o;
  }
  function offsetMin(date, tz) { const p = parts(date, tz); return (Date.UTC(+p.year, +p.month - 1, +p.day, p.hour, +p.minute, +p.second) - date.getTime()) / 60000; }
  function zonedToUtc(y, m, d, h, tz) { const guess = Date.UTC(y, m, d, h); let t = guess - offsetMin(new Date(guess), tz) * 60000; t = guess - offsetMin(new Date(t), tz) * 60000; return t; }
  function parisHour(ms) { const p = parts(new Date(ms), "Europe/Paris"); return p.hour + +p.minute / 60; }
  const WD = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 };
  function sessionWindows(now) {
    return SESSIONS.map((s) => {
      const p = parts(now, s.tz);
      const a = zonedToUtc(+p.year, +p.month - 1, +p.day, s.open, s.tz), b = zonedToUtc(+p.year, +p.month - 1, +p.day, s.close, s.tz);
      const localH = p.hour + +p.minute / 60, wd = WD[p.weekday];
      const live = wd >= 1 && wd <= 5 && localH >= s.open && localH < s.close;
      return Object.assign({}, s, { from: parisHour(a), to: parisHour(b), live });
    });
  }
  function marketOpen(now) {
    const p = parts(now, "America/New_York"); const wd = WD[p.weekday], h = p.hour + +p.minute / 60;
    if (wd === 6) return false; if (wd === 5 && h >= 17) return false; if (wd === 0 && h < 17) return false; return true;
  }
  function inArc(h, a, b) { return a <= b ? h >= a && h < b : h >= a || h < b; }
  function fmtH(h) { const hh = Math.floor(h) % 24, mm = Math.round((h - Math.floor(h)) * 60); return mm ? `${hh} h ${String(mm).padStart(2, "0")}` : `${hh} h`; }
  function overlap(a, b) { if (a.from > a.to || b.from > b.to) return null; const s = Math.max(a.from, b.from), e = Math.min(a.to, b.to); return e > s ? [s, e] : null; }
  O.sessions = { SESSIONS, sessionWindows, marketOpen, parisHour, fmtH, overlap, inArc };

  function polar(cx, cy, r, h) { const a = (h / 24) * Math.PI * 2 - Math.PI / 2; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; }
  function arcPath(cx, cy, r, h1, h2) {
    let span = h2 - h1; if (span <= 0) span += 24;
    const [x1, y1] = polar(cx, cy, r, h1), [x2, y2] = polar(cx, cy, r, h1 + span);
    return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 ${span > 12 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  }
  O.mountSessions = function (root) {
    const svg = root.querySelector("svg.ring"), list = root.querySelector(".session-list"), clock = root.querySelector(".clock"), where = root.querySelector(".where");
    const range = root.querySelector('input[type="range"]'), nowBtn = root.querySelector("[data-now]"), note = root.querySelector(".overlap-note"), market = root.querySelector("[data-market]");
    const NS = "http://www.w3.org/2000/svg";
    let wins = sessionWindows(new Date()); let live = true; let vh = parisHour(Date.now());
    svg.innerHTML = "";
    const g = (tag, attrs) => { const el = document.createElementNS(NS, tag); for (const k in attrs) el.setAttribute(k, attrs[k]); svg.appendChild(el); return el; };
    g("circle", { cx: 200, cy: 200, r: 188, fill: "none", stroke: "rgba(169,186,182,0.18)" });
    for (let h = 0; h < 24; h++) {
      const [x1, y1] = polar(200, 200, 188, h), [x2, y2] = polar(200, 200, h % 3 ? 182 : 176, h);
      g("line", { x1, y1, x2, y2, stroke: "rgba(169,186,182,0.45)", "stroke-width": 1 });
      if (h % 3 === 0) { const [tx, ty] = polar(200, 200, 204, h); const t = g("text", { x: tx, y: ty, "text-anchor": "middle", "dominant-baseline": "middle", fill: "#86a19f", "font-size": 11, "font-family": "Geist Mono, monospace" }); t.textContent = String(h).padStart(2, "0"); }
    }
    // graduations : au moins 12 px à l'écran, quelle que soit la réduction du viewBox (448 unités)
    const ticks = [...svg.querySelectorAll("text")];
    const sizeTicks = () => { const w = svg.getBoundingClientRect().width; if (!w) return; const fs = Math.max(11, (12 * 448) / w).toFixed(1); ticks.forEach((t) => t.setAttribute("font-size", fs)); };
    sizeTicks(); if ("ResizeObserver" in window) new ResizeObserver(sizeTicks).observe(svg);
    const radii = [160, 140, 120, 100];
    const arcs = wins.map((s, i) => {
      g("circle", { cx: 200, cy: 200, r: radii[i], fill: "none", stroke: "rgba(29,64,76,0.9)", "stroke-width": 12 });
      const p = g("path", { d: arcPath(200, 200, radii[i], s.from, s.to), fill: "none", stroke: s.c, "stroke-width": 12, "stroke-linecap": "butt", opacity: 0.35 });
      const len = p.getTotalLength(); p.style.strokeDasharray = len; p.style.strokeDashoffset = still ? 0 : len; p._len = len;
      return p;
    });
    const needle = g("line", { x1: 200, y1: 200, x2: 200, y2: 18, stroke: "#ece4d4", "stroke-width": 1.4 });
    const knob = g("circle", { cx: 200, cy: 18, r: 5, fill: "#f2b64b" });
    const ghost = g("line", { x1: 200, y1: 200, x2: 200, y2: 26, stroke: "rgba(236,228,212,0.45)", "stroke-width": 1, "stroke-dasharray": "3 4" });
    g("circle", { cx: 200, cy: 200, r: 90, fill: "#0f2229" });
    root._arcs = arcs;
    list.innerHTML = wins.map((s) => `<li data-id="${s.id}" style="--c:${s.c}"><span class="sw"></span><span><span class="name">${s.name}</span><span class="state"></span></span><span class="hours">${fmtH(s.from)} à ${fmtH(s.to)}</span></li>`).join("");
    const ldn = wins.find((s) => s.id === "londres"), ny = wins.find((s) => s.id === "newyork"), tk = wins.find((s) => s.id === "tokyo");
    if (note) {
      const o1 = overlap(ldn, ny), o2 = overlap(tk, ldn);
      note.textContent = (o1 ? `Londres et New York se chevauchent de ${fmtH(o1[0])} à ${fmtH(o1[1])}, heure de Paris : c’est souvent le moment le plus actif de la journée. ` : "") + (o2 ? `Tokyo et Londres se croisent de ${fmtH(o2[0])} à ${fmtH(o2[1])}.` : "");
    }
    function render() {
      const now = new Date(); if (live) { vh = parisHour(now.getTime()); wins = sessionWindows(now); }
      const ang = (vh / 24) * 360;
      needle.setAttribute("transform", `rotate(${ang} 200 200)`); knob.setAttribute("transform", `rotate(${ang} 200 200)`);
      const hh = Math.floor(vh), mm = Math.floor((vh - hh) * 60);
      clock.textContent = live ? new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" }).format(now) : `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
      const nowTxt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" }).format(now);
      where.textContent = live ? "Heure de Paris, maintenant" : `Exploration. Il est ${nowTxt} à Paris`;
      ghost.style.display = live ? "none" : ""; ghost.setAttribute("transform", `rotate(${(parisHour(now.getTime()) / 24) * 360} 200 200)`);
      const open = live ? marketOpen(now) : true;
      wins.forEach((s, i) => {
        const on = live ? s.live : inArc(vh, s.from, s.to);
        arcs[i].setAttribute("opacity", on ? 1 : 0.32);
        const li = list.children[i]; li.classList.toggle("is-on", on);
        li.querySelector(".state").textContent = on ? (live ? "Ouvert maintenant" : "Ouvert à cette heure") : (live && !open ? "Marché fermé le week-end" : "Fermé");
      });
      if (market) market.textContent = open ? "Ouvert" : "Fermé (week-end)";
      if (range) { range.value = vh.toFixed(2); range.setAttribute("aria-valuetext", fmtH(Math.round(vh * 4) / 4) + ", heure de Paris"); }
      if (nowBtn) nowBtn.hidden = live;
    }
    O.renderSessionsFor = O.renderSessionsFor || [];
    const api = { setHour(h) { live = false; vh = ((h % 24) + 24) % 24; render(); }, setLive() { live = true; render(); }, render, isLive: () => live, drawArcs(p) { arcs.forEach((a) => (a.style.strokeDashoffset = a._len * (1 - p))); } };
    if (range) { range.addEventListener("input", () => api.setHour(parseFloat(range.value))); }
    if (nowBtn) nowBtn.addEventListener("click", () => api.setLive());
    render(); setInterval(() => { if (live) render(); }, 15000);
    if (!still && hasGsap && window.ScrollTrigger) {
      const st = { p: 0 };
      gsap.to(st, { p: 1, duration: 2.2, ease: "power2.inOut", onUpdate: () => api.drawArcs(st.p), scrollTrigger: { trigger: svg, start: "top 80%", once: true } });
    }
    return api;
  };
  document.querySelectorAll("[data-sessions]").forEach((el) => { el._api = O.mountSessions(el); });

  /* Carte de contact : étiquettes à 12 px minimum à l'écran, cartouche élargi au besoin */
  document.querySelectorAll(".map svg").forEach((svg) => {
    const vb = svg.viewBox.baseVal.width || 400, labels = [...svg.querySelectorAll("text")];
    const box = svg.querySelector("rect[x]"), boxW = box ? +box.getAttribute("width") : 0;
    const inBox = box ? labels.filter((t) => +t.getAttribute("x") > +box.getAttribute("x") && +t.getAttribute("x") < +box.getAttribute("x") + boxW) : [];
    const size = () => {
      const w = svg.getBoundingClientRect().width; if (!w) return;
      const fs = Math.max(11, (12 * vb) / w).toFixed(1); labels.forEach((t) => (t.style.fontSize = fs + "px"));
      if (inBox.length) { const need = Math.max(...inBox.map((t) => t.getComputedTextLength())) + 16; box.setAttribute("width", Math.max(boxW, Math.ceil(need))); }
    };
    size(); if ("ResizeObserver" in window) new ResizeObserver(size).observe(svg);
  });

  /* Lectures du héros (heure, marché, sessions actives) */
  const readout = document.querySelector("[data-readout]");
  if (readout) {
    const upd = () => {
      const now = new Date(); const w = sessionWindows(now).filter((s) => s.live).map((s) => s.name);
      readout.querySelector("[data-r-time]").textContent = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" }).format(now);
      readout.querySelector("[data-r-market]").textContent = marketOpen(now) ? "Ouvert" : "Fermé, week-end";
      readout.querySelector("[data-r-sessions]").textContent = w.length ? w.join(" et ") : "Aucune";
    };
    upd(); setInterval(upd, 30000);
  }

  /* ---------- Typographie française : espaces insécables ---------- */
  const NB = "\u00a0";
  const frFix = (t) => t.replace(/ ([:;!?»%€])/g, NB + "$1").replace(/« /g, "«" + NB).replace(/(\d) (h|lot|pips?)\b/g, "$1" + NB + "$2");
  O.fr = frFix;
  function frWalk(root) {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) { const n = w.currentNode; const p = n.parentElement; if (!p || p.closest("script, style, textarea, .crosshair, .axis")) continue; const v = frFix(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v; }
  }
  frWalk(document.body);
  new MutationObserver((list) => {
    for (const m of list) {
      const t = m.target.nodeType === 3 ? m.target.parentElement : m.target;
      if (!t || t.closest(".crosshair, .axis")) continue;
      if (m.type === "characterData") { const v = frFix(m.target.nodeValue); if (v !== m.target.nodeValue) m.target.nodeValue = v; }
      else m.addedNodes.forEach((n) => { if (n.nodeType === 3) { const v = frFix(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v; } else if (n.nodeType === 1) frWalk(n); });
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true });

  /* Revenir en haut */
  document.querySelectorAll("[data-top]").forEach((b) => b.addEventListener("click", () => { if (lenis) lenis.scrollTo(0, { duration: 1.6 }); else window.scrollTo({ top: 0, behavior: still ? "auto" : "smooth" }); const h = document.querySelector("h1"); if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); } }));

  /* ---------- Démarrage ---------- */
  function ready() {
    O.onReady.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
    setupReveals();
    if (window.ScrollTrigger) { ScrollTrigger.sort && ScrollTrigger.sort(); ScrollTrigger.refresh(); }
    // arrivée par une ancre depuis une autre page : on recale après la création des épinglages
    if (location.hash.length > 1) {
      const cible = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (cible) requestAnimationFrame(() => { if (lenis) lenis.scrollTo(cible, { offset: -80, immediate: true, force: true }); else cible.scrollIntoView({ block: "start" }); });
    }
  }
  O.ready = ready;
  const start = () => (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => setTimeout(ready, 0));
  if (document.readyState === "complete") start(); else document.addEventListener("DOMContentLoaded", start);
})();
