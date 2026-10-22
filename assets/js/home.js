/* Accueil : ouverture, bandeau du lexique, sessions, parcours horizontal, lanterne, mosaïque, chat */
(function () {
  const O = window.OLLIZ; const G = window.gsap; const ST = window.ScrollTrigger;
  const still = O.still || !G;
  const desktop = () => window.matchMedia("(min-width: 900px)").matches;

  /* ---------- Ouverture ---------- */
  function heroIn(fast) {
    if (O.heroIntro) O.heroIntro(fast ? 0.6 : 1.8); else O.pendingHeroIntro = fast ? 0.6 : 1.8;
    if (still) return;
    const title = document.querySelector(".hero .display");
    if (title && window.SplitText) {
      const s = SplitText.create(title, { type: "lines", mask: "lines" });
      G.from(s.lines, { yPercent: 108, duration: 1.3, ease: "expo.out", stagger: 0.1 });
    }
    G.from(".hero [data-hero-fade]", { y: 24, autoAlpha: 0, duration: 1, ease: "power3.out", stagger: 0.08, delay: 0.35 });
  }
  function intro() {
    const el = document.querySelector(".intro");
    if (!el || still) { if (el) el.remove(); heroIn(true); return; }
    const seen = O.store.sget("ollizIntro") === "1"; O.store.sset("ollizIntro", "1");
    const tl = G.timeline({ onComplete: () => el.remove() });
    if (seen || O.store.sget("ollizNav") === "1") {
      tl.to(el, { autoAlpha: 0, duration: 0.45, ease: "power2.out" }); heroIn(true); return;
    }
    const word = el.querySelector(".word");
    const chars = window.SplitText ? SplitText.create(word, { type: "chars" }).chars : [word];
    G.set(el.querySelector(".candle"), { height: 0 });
    tl.from(el.querySelector(".horizon"), { scaleX: 0, duration: 0.6, ease: "expo.inOut" })
      .to(el.querySelector(".candle"), { height: 86, duration: 0.7, ease: "expo.out" }, "-=0.15")
      .from(el.querySelector(".wick"), { scaleY: 0, duration: 0.5, ease: "power3.out" }, "<0.1")
      .from(chars, { yPercent: 90, autoAlpha: 0, duration: 0.5, stagger: 0.025, ease: "power3.out" }, "-=0.45")
      .to(el.querySelector(".candle"), { height: 4, y: 0, duration: 0.35, ease: "power3.in" }, "+=0.15")
      .to(el, { autoAlpha: 0, duration: 0.5, ease: "power2.inOut" }, "-=0.1")
      .add(() => heroIn(false), "-=0.45");
  }

  /* ---------- Bandeau du lexique ---------- */
  function tape() {
    const wrap = document.querySelector(".tape"); if (!wrap) return;
    const track = wrap.querySelector(".tape-track");
    const data = window.OLLIZ_DATA; const terms = data.tape.map((id) => data.terms.find((t) => t.id === id)).filter(Boolean);
    const group = () => { const g = document.createElement("div"); g.className = "tape-group"; g.innerHTML = terms.map((t) => `<button type="button" data-term="${t.id}"><i aria-hidden="true"></i>${t.t}</button>`).join(""); return g; };
    track.innerHTML = ""; track.appendChild(group());
    if (still) { wrap.style.overflowX = "auto"; return; }
    const g2 = group(); g2.setAttribute("aria-hidden", "true"); g2.querySelectorAll("button").forEach((b) => (b.tabIndex = -1)); track.appendChild(g2);
    let x = 0, paused = false, boost = 0, visible = true;
    new IntersectionObserver((en) => { visible = en[0].isIntersecting; }).observe(wrap);
    wrap.addEventListener("pointerenter", () => (paused = true)); wrap.addEventListener("pointerleave", () => (paused = false));
    wrap.addEventListener("focusin", () => (paused = true)); wrap.addEventListener("focusout", () => (paused = false));
    let holdT; wrap.addEventListener("touchstart", () => { paused = true; clearTimeout(holdT); holdT = setTimeout(() => (paused = false), 3500); }, { passive: true });
    if (O.lenis) O.lenis.on("scroll", (l) => { boost = Math.min(14, Math.abs(l.velocity) * 0.6); });
    let w = 0; const measure = () => { w = track.firstElementChild.offsetWidth; }; measure(); window.addEventListener("resize", measure);
    G.ticker.add((t, dt) => {
      if (!visible || !w) return;
      const v = paused ? 0 : 0.05 + boost * 0.02; boost *= 0.92;
      x -= v * dt; if (x <= -w) x += w; track.style.transform = `translate3d(${x}px,0,0)`;
    });
  }

  /* ---------- Sessions : la journée défile pendant l’épinglage ---------- */
  function sessions() {
    const sec = document.querySelector("[data-sessions-pin]"); const box = document.querySelector("[data-sessions]");
    if (!sec || !box || still || !ST) return;
    const api = box._api; if (!api) return;
    ST.matchMedia({
      "(min-width: 900px) and (min-height: 760px)": () => {
        let start = 0;
        const st = ST.create({
          trigger: sec, start: "top top", end: "+=140%", pin: true, scrub: 0.6,
          onEnter: () => { start = O.sessions.parisHour(Date.now()); },
          onEnterBack: () => { start = O.sessions.parisHour(Date.now()); },
          onUpdate: (self) => { if (self.progress > 0.002 && self.progress < 0.998) api.setHour(start + self.progress * 24); },
          onLeave: () => api.setLive(), onLeaveBack: () => api.setLive()
        });
        return () => st.kill();
      }
    });
  }

  /* ---------- Parcours horizontal ---------- */
  function parcours() {
    const sec = document.querySelector(".parcours"); if (!sec) return;
    const scroller = sec.querySelector(".hscroll"), track = sec.querySelector(".htrack");
    const figs = [...sec.querySelectorAll(".visuel[data-draw-h]")];
    const drawAll = () => figs.forEach((f) => { f._p = 1; OLLIZ_SCENES.paint(f); });
    const drawOne = (f) => { const s = { p: f._p || 0 }; G.to(s, { p: 1, duration: 1.6, ease: "power2.inOut", onUpdate: () => { f._p = s.p; OLLIZ_SCENES.paint(f); } }); };
    if (still || !ST) { scroller.style.overflowX = "auto"; drawAll(); return; }
    ST.matchMedia({
      "(min-width: 760px)": () => {
        const dist = () => track.scrollWidth - scroller.clientWidth;
        const prog = sec.querySelector(".hprogress"), bar = prog && prog.querySelector("i"), count = prog && prog.querySelector(".count");
        const cards = [...track.querySelectorAll(".module")];
        const upd = (p) => {
          if (!prog) return; bar.style.transform = `scaleX(${p})`;
          const n = Math.min(cards.length, Math.max(1, Math.round(p * (cards.length - 1)) + 1));
          const txt = p > 0.97 ? "Fin du parcours" : `Module ${n} sur ${cards.length}`;
          if (count.textContent !== txt) count.textContent = txt;
        };
        const tween = G.to(track, { x: () => -dist(), ease: "none", onUpdate() { upd(this.progress()); },
          scrollTrigger: { trigger: sec.querySelector(".hpin"), start: "top top", end: () => "+=" + dist(), pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1 } });
        upd(0);
        const sts = figs.map((f) => ST.create({ trigger: f, containerAnimation: tween, start: "left 88%", once: true, onEnter: () => drawOne(f) }));
        const st = tween.scrollTrigger;
        const onFocus = (e) => {
          const card = e.target.closest(".module, .end-card"); if (!card) return;
          const p = Math.min(1, Math.max(0, (card.offsetLeft - 80) / dist()));
          const y = st.start + (st.end - st.start) * p;
          if (O.lenis) O.lenis.scrollTo(y, { immediate: true }); else window.scrollTo(0, y);
        };
        track.addEventListener("focusin", onFocus);
        return () => { sts.forEach((s) => s.kill()); track.removeEventListener("focusin", onFocus); };
      },
      "(max-width: 759px)": () => {
        const io = new IntersectionObserver((en) => en.forEach((e) => { if (e.isIntersecting) { drawOne(e.target); io.unobserve(e.target); } }), { root: scroller, threshold: 0.4 });
        figs.forEach((f) => io.observe(f));
        return () => io.disconnect();
      }
    });
  }

  /* ---------- Lanterne : le curseur éclaire le texte ---------- */
  function lantern() {
    const stage = document.querySelector(".lantern-stage"); if (!stage || still) return;
    const setX = G.quickTo(stage, "--x", { duration: 0.6, ease: "power3.out", unit: "px" });
    const setY = G.quickTo(stage, "--y", { duration: 0.6, ease: "power3.out", unit: "px" });
    const r = () => stage.getBoundingClientRect();
    G.set(stage, { "--x": r().width * 0.2 + "px", "--y": r().height * 0.5 + "px" });
    const sweep = G.timeline({ repeat: -1, yoyo: true, paused: true });
    sweep.to(stage, { "--x": () => r().width * 0.85 + "px", duration: 3.2, ease: "sine.inOut" })
      .to(stage, { "--y": () => r().height * 0.2 + "px", duration: 1.6, ease: "sine.inOut", yoyo: true, repeat: 1 }, 0);
    let manual = false;
    ST.create({ trigger: stage, start: "top 85%", end: "bottom 15%", onToggle: (s) => { if (!manual) s.isActive ? sweep.play() : sweep.pause(); } });
    if (O.fine) {
      stage.addEventListener("pointermove", (e) => { if (!manual) { manual = true; sweep.pause(); } const b = r(); setX(e.clientX - b.left); setY(e.clientY - b.top); });
    }
    const rTo = () => Math.hypot(r().width, r().height) * 1.1;
    G.timeline({ scrollTrigger: { trigger: stage, start: "top 80%", end: "bottom 20%", scrub: true } })
      .fromTo(stage, { "--r": "120px" }, { "--r": "280px", ease: "none", duration: 0.6 })
      .to(stage, { "--r": () => rTo() + "px", ease: "power2.in", duration: 0.4 });
  }

  /* ---------- La règle du 1 % ---------- */
  function hundred() {
    const grid = document.querySelector(".hundred"); if (!grid) return;
    grid.innerHTML = Array.from({ length: 100 }, () => "<span></span>").join("");
    const cells = [...grid.children];
    const fill = () => cells.forEach((c, i) => c.classList.add(i === 99 ? "risk" : "on"));
    if (still || !ST) { fill(); return; }
    ST.create({ trigger: grid, start: "top 80%", once: true, onEnter: () => {
      const tl = G.timeline(); cells.forEach((c, i) => tl.add(() => c.classList.add(i === 99 ? "risk" : "on"), i * 0.011));
      tl.fromTo(cells[99], { scale: 1 }, { scale: 1.6, duration: 0.25, yoyo: true, repeat: 1, ease: "power2.out" });
    } });
    document.querySelectorAll("[data-count]").forEach((el) => {
      const to = parseFloat(el.dataset.count), o = { v: 100 };
      G.to(o, { v: to, duration: 1.8, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 85%", once: true },
        onUpdate: () => (el.textContent = o.v.toFixed(1).replace(".", ",") + " %") });
    });
  }

  /* ---------- Forum Julii : la mosaïque devient un graphique ---------- */
  function mosaic() {
    const box = document.querySelector(".mosaic"); if (!box) return;
    const cv = box.querySelector("canvas"), ctx = cv.getContext("2d");
    const SC = OLLIZ_SCENES; const C = SC.colors;
    let tiles = [], cols = 0, rows = 0, s = 0, W = 0, H = 0, prog = still ? 1 : 0;
    function build() {
      const b = box.getBoundingClientRect(); W = Math.round(b.width); H = Math.round(b.height);
      const dpr = Math.min(devicePixelRatio || 1, 2); cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = W < 520 ? 30 : 42; s = W / cols; rows = Math.ceil(H / s);
      const r = SC.rng(1931); let data = SC.walk(SC.rng(77), Math.floor(cols / 2), 0.07);
      if (data[data.length - 1].c < data[0].o) data = data.map((d) => ({ o: 1 - d.o, c: 1 - d.c, hi: 1 - d.lo, lo: 1 - d.hi }));
      const A = ["#e8dcc2", "#d9c8a4", "#d9c8a4", "#e8dcc2"];
      tiles = [];
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        let a = A[Math.floor(r() * A.length)];
        if (SC.meander(x, y)) a = (x + y) % 5 === 0 ? "#b14a30" : "#8c3524";
        if (y % 14 === 0 || y % 14 === 13) a = "#2a5866";
        if (r() > 0.975) a = "#b98b4e";
        // état B : graphique en chandeliers (2 colonnes par bougie, une pour le corps)
        const ci = Math.floor(x / 2), d = data[ci], col = x % 2 === 0;
        const vy = 1 - (y + 0.5) / rows; const margin = 0.12; const v = (vy - margin) / (1 - margin * 2);
        let b2 = (x + y) % 2 ? "#0c1d23" : "#0a191e";
        if (d) {
          const up = d.c >= d.o, top = Math.max(d.o, d.c), bot = Math.min(d.o, d.c);
          if (col && v <= top + 0.012 && v >= bot - 0.012) b2 = up ? C.hausse : C.baisse;
        }
        tiles.push({ x, y, a, b: b2, delay: (x / cols) * 0.6 + r() * 0.25, j: [r(), r()] });
      }
      draw();
    }
    function draw() {
      const kb = Math.max(0, Math.min(1, (prog - 0.25) / 0.6));
      const mixc = (a, b) => Math.round(a + (b - a) * kb);
      ctx.fillStyle = `rgb(${mixc(201, 10)},${mixc(190, 25)},${mixc(166, 30)})`; ctx.fillRect(0, 0, W, H);
      const g = s * 0.1;
      for (const t of tiles) {
        const lt = Math.max(0, Math.min(1, (prog - t.delay) / 0.22));
        const sh = Math.abs(Math.cos(lt * Math.PI));
        const color = lt < 0.5 ? t.a : t.b;
        const px = t.x * s + g * t.j[0] * 0.6, py = t.y * s + g * t.j[1] * 0.6, sz = s - g * 1.4, hh = sz * Math.max(0.22, sh);
        ctx.fillStyle = color; ctx.fillRect(px, py + (sz - hh) / 2, sz, hh);
      }
      const k = Math.max(0, Math.min(1, (prog - 0.6) / 0.4));
      if (k > 0) { ctx.fillStyle = `rgba(8,22,27,${0.5 * k})`; ctx.fillRect(0, 0, W, H); for (const t of tiles) if (t.b === C.hausse || t.b === C.baisse) { ctx.fillStyle = t.b; ctx.fillRect(t.x * s + g * 0.3, t.y * s + g * 0.3, s - g * 1.4, s - g * 1.4); } }
    }
    build(); let rt; window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(build, 150); });
    if (still || !ST) return;
    ST.create({ trigger: box, start: "top 80%", end: "center 45%", scrub: 0.5, onUpdate: (self) => { prog = self.progress * 1.12; draw(); } });
  }

  /* ---------- Chat de démonstration ---------- */
  function chat() {
    const body = document.querySelector(".chat-body"); if (!body) return;
    const script = [
      ["me", "Bonjour, je débute. C’est quoi exactement un pip ?"],
      ["them", "Bonjour ! C’est la plus petite variation habituelle d’une paire : 0,0001 pour EUR/USD, 0,01 pour les paires contre le yen."],
      ["me", "Et ça représente combien en euros ?"],
      ["them", "Ça dépend de la taille de la position. Le calculateur de la page Outils fait le calcul pour vous, on le reprend ensemble au module 4."]
    ];
    const add = (who, txt) => { const m = document.createElement("div"); m.className = "msg " + who; m.textContent = txt; body.appendChild(m); return m; };
    if (still || !ST) { script.forEach(([w, t]) => add(w, t)); } else {
      ST.create({ trigger: body, start: "top 75%", once: true, onEnter: () => {
        let t = 0; const tl = G.timeline();
        script.forEach(([w, txt]) => {
          if (w === "them") { let typing; tl.add(() => { typing = add("them typing", ""); typing.innerHTML = "<i></i><i></i><i></i>"; typing.setAttribute("aria-hidden", "true"); }, t); t += 1.1; tl.add(() => typing.remove(), t); }
          tl.add(() => { const m = add(w, txt); G.from(m, { y: 14, autoAlpha: 0, duration: 0.45, ease: "power3.out" }); }, t); t += w === "me" ? 0.9 : 1.4;
        });
      } });
    }
    const form = document.querySelector(".chat-input");
    const norm = (t) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const findTerm = (q) => {
      const n = " " + norm(q).replace(/[^a-z0-9/ -]/g, " ") + " ";
      const terms = window.OLLIZ_DATA.terms.slice().sort((a, b) => b.t.length - a.t.length);
      const alias = { levier: "effet-de-levier", "stop loss": "stop-loss", stop: "stop-loss", "take profit": "take-profit", pips: "pip", chandelier: "chandelier", bougie: "chandelier", bougies: "chandelier", demo: "compte-demo", journal: "journal", plan: "plan", short: "position-courte", long: "position-longue" };
      const hit = terms.find((t) => n.includes(" " + norm(t.t) + " ") || n.includes(" " + norm(t.en) + " "));
      if (hit) return hit;
      const k = Object.keys(alias).find((a) => n.includes(" " + a + " "));
      return k ? terms.find((t) => t.id === alias[k]) : null;
    };
    const reply = (q) => {
      const t = findTerm(q);
      const m = add("them", "");
      if (t) { m.textContent = t.d + " "; const a = document.createElement("a"); a.href = "lexique.html#" + t.id; a.textContent = "Voir « " + t.t + " » dans le lexique"; m.appendChild(a); }
      else m.textContent = "Bonne question. Dans l’espace membre, un formateur vous répond ici. Dans cette démonstration, seules les définitions du lexique sont disponibles : essayez « spread » ou « effet de levier ».";
    };
    const ask = (v) => {
      add("me", v);
      if (still) return reply(v);
      const typing = add("them typing", ""); typing.innerHTML = "<i></i><i></i><i></i>"; typing.setAttribute("aria-hidden", "true");
      setTimeout(() => { typing.remove(); reply(v); body.scrollTop = body.scrollHeight; }, 900);
    };
    if (form) form.addEventListener("submit", (e) => {
      e.preventDefault(); const inp = form.querySelector("input"); const v = inp.value.trim(); if (!v) { inp.focus(); return; }
      inp.value = ""; ask(v);
    });
    document.querySelectorAll(".chat-suggest button").forEach((b) => b.addEventListener("click", () => ask(b.dataset.q)));
  }

  O.onReady.push(intro, tape, sessions, parcours, lantern, hundred, mosaic, chat);
})();
