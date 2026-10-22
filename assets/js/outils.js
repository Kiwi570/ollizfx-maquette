/* Outils pédagogiques : taille de position, effet de levier, heat map (fictive) */
(function () {
  const O = window.OLLIZ; const G = window.gsap;
  const nf = (d) => new Intl.NumberFormat("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
  const eur = (v, d = 2) => nf(d).format(v) + " €";
  const num = (el) => parseFloat(String(el.value).replace(",", "."));

  /* ---------- Taille de position ---------- */
  const PAIRS = {
    "EUR/USD": { quote: "USD", pip: 0.0001, ex: 1.1 },
    "GBP/USD": { quote: "USD", pip: 0.0001, ex: 1.1 },
    "USD/JPY": { quote: "JPY", pip: 0.01, ex: 160 },
    "EUR/GBP": { quote: "GBP", pip: 0.0001, ex: 0.85 },
    "USD/CHF": { quote: "CHF", pip: 0.0001, ex: 0.95 }
  };
  O.positionSize = function (capital, riskPct, stopPips, pipSize, eurToQuote) {
    const risk = capital * riskPct / 100;
    const pipValueLot = (100000 * pipSize) / eurToQuote; // en euros, pour 1 lot standard
    const lots = risk / (stopPips * pipValueLot);
    const lotsRounded = Math.floor(lots * 100 + 1e-9) / 100;
    return { risk, pipValueLot, lots, lotsRounded, units: lotsRounded * 100000, lossAtStop: lotsRounded * stopPips * pipValueLot };
  };
  const calc = document.getElementById("calc-size");
  if (calc) {
    const f = {
      cap: calc.querySelector("#cap"), risk: calc.querySelector("#risk"), pair: calc.querySelector("#pair"),
      stop: calc.querySelector("#stop"), conv: calc.querySelector("#conv"), convLabel: calc.querySelector("#conv-label")
    };
    const out = document.getElementById("calc-out");
    let lastPair = f.pair.value;
    function run() {
      const p = PAIRS[f.pair.value];
      if (f.pair.value !== lastPair) { f.conv.value = String(p.ex).replace(".", ","); lastPair = f.pair.value; }
      f.convLabel.textContent = `Cours EUR/${p.quote} (1 euro en ${p.quote})`;
      const cap = num(f.cap), risk = num(f.risk), stop = num(f.stop), conv = num(f.conv);
      const err = out.querySelector(".err");
      if (!(cap > 0) || !(risk > 0) || !(stop > 0) || !(conv > 0)) {
        err.hidden = false; err.textContent = "Renseignez un capital, un risque, un stop et un cours supérieurs à zéro.";
        return;
      }
      err.hidden = true;
      const r = O.positionSize(cap, risk, stop, p.pip, conv);
      out.querySelector("[data-o=lots]").textContent = nf(2).format(r.lotsRounded);
      out.querySelector("[data-o=risk]").textContent = eur(r.risk);
      out.querySelector("[data-o=pip]").textContent = eur(r.pipValueLot);
      out.querySelector("[data-o=exact]").textContent = nf(3).format(r.lots) + " lot";
      out.querySelector("[data-o=units]").textContent = nf(0).format(r.units) + " " + f.pair.value.slice(0, 3);
      out.querySelector("[data-o=loss]").textContent = eur(r.lossAtStop);
      const warn = out.querySelector("[data-o=warn]");
      warn.hidden = !(risk > 2);
      if (G && !O.still) G.fromTo(out.querySelector("[data-o=lots]"), { opacity: 0.4 }, { opacity: 1, duration: 0.4 });
    }
    calc.addEventListener("input", run); calc.addEventListener("change", run); calc.addEventListener("submit", (e) => e.preventDefault());
    run();
  }

  /* ---------- Effet de levier ---------- */
  const lev = document.getElementById("calc-lev");
  if (lev) {
    const m = lev.querySelector("#marge"), l = lev.querySelector("#levier"), v = lev.querySelector("#var");
    const lOut = lev.querySelector("#levier-out"), vOut = lev.querySelector("#var-out");
    const res = document.getElementById("lev-out");
    function run() {
      const marge = num(m), L = num(l), pct = num(v);
      lOut.textContent = L + ":1"; vOut.textContent = nf(2).format(pct) + " %";
      if (!(marge > 0)) { res.querySelector(".err").hidden = false; res.querySelector(".err").textContent = "Indiquez une marge supérieure à zéro."; return; }
      res.querySelector(".err").hidden = true;
      const expo = marge * L, move = expo * pct / 100, ofMargin = (move / marge) * 100;
      res.querySelector("[data-o=expo]").textContent = eur(expo, 0);
      res.querySelector("[data-o=up]").textContent = "+" + eur(move);
      res.querySelector("[data-o=down]").textContent = "−" + eur(Math.min(move, marge));
      res.querySelector("[data-o=upPct]").textContent = "+" + nf(1).format(ofMargin) + " %";
      res.querySelector("[data-o=downPct]").textContent = "−" + nf(1).format(Math.min(100, ofMargin)) + " %";
      res.querySelector("[data-o=wipe]").textContent = nf(2).format(100 / L) + " %";
      const k = Math.min(1, ofMargin / 100);
      res.querySelectorAll(".fill").forEach((f) => (f.style.transform = `scaleX(${k})`));
      res.querySelector("[data-o=gone]").hidden = ofMargin < 100;
    }
    lev.addEventListener("input", run); lev.addEventListener("submit", (e) => e.preventDefault()); run();
  }

  /* ---------- Heat map des devises (données fictives) ---------- */
  const hm = document.getElementById("heatmap");
  if (hm) {
    const CUR = ["EUR", "USD", "GBP", "JPY", "CHF", "CAD", "AUD", "NZD"];
    const rnd = OLLIZ_SCENES.rng(20260);
    const s = {}; CUR.forEach((c) => (s[c] = (rnd() - 0.5) * 0.8));
    const cells = {};
    let html = '<div class="hd" aria-hidden="true"></div>' + CUR.map((c) => `<div class="hd" role="columnheader">${c}</div>`).join("");
    CUR.forEach((b) => {
      html += `<div class="hd" role="rowheader">${b}</div>`;
      CUR.forEach((q) => { html += b === q ? `<div class="cell self" role="cell" aria-label="${b}/${q}">·</div>` : `<div class="cell" role="cell" data-p="${b}${q}"></div>`; });
    });
    hm.innerHTML = html;
    hm.querySelectorAll(".cell[data-p]").forEach((c) => (cells[c.dataset.p] = c));
    const bars = document.getElementById("strength");
    bars.innerHTML = CUR.map((c) => `<div><span>${c}</span><span class="bar"><i data-c="${c}"></i></span><span data-v="${c}"></span></div>`).join("");
    const colorFor = (v) => {
      const k = Math.min(1, Math.abs(v) / 1.2);
      const base = v >= 0 ? [121, 210, 181] : [212, 99, 63];
      return `rgba(${base[0]},${base[1]},${base[2]},${0.12 + k * 0.78})`;
    };
    function paint() {
      CUR.forEach((b) => CUR.forEach((q) => {
        if (b === q) return; const v = s[b] - s[q]; const c = cells[b + q];
        c.style.backgroundColor = colorFor(v); c.textContent = (v > 0 ? "+" : "") + nf(2).format(v);
        c.setAttribute("aria-label", `${b}/${q} ${(v > 0 ? "+" : "") + nf(2).format(v)} %`);
        c.style.color = Math.abs(v) > 0.7 ? "#08161b" : "";
      }));
      CUR.forEach((c) => {
        const v = s[c], i = bars.querySelector(`i[data-c="${c}"]`), k = Math.min(1, Math.abs(v) / 0.8) * 50;
        i.style.left = v >= 0 ? "50%" : 50 - k + "%"; i.style.width = k + "%"; i.style.background = v >= 0 ? "var(--hausse)" : "var(--baisse)";
        bars.querySelector(`[data-v="${c}"]`).textContent = (v > 0 ? "+" : "") + nf(2).format(v) + " %";
      });
    }
    function step() { CUR.forEach((c) => { s[c] = Math.max(-0.9, Math.min(0.9, s[c] * 0.96 + (rnd() - 0.5) * 0.14)); }); paint(); }
    paint();
    if (!O.still) {
      let timer = null;
      new IntersectionObserver((en) => { if (en[0].isIntersecting) { if (!timer) timer = setInterval(step, 2600); } else { clearInterval(timer); timer = null; } }).observe(hm);
    }
    const btn = document.getElementById("hm-step"); if (btn) btn.addEventListener("click", step);
  }
})();
