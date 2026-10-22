/* Lexique : recherche, index alphabétique et petits schémas */
(function () {
  const O = window.OLLIZ; const G = window.gsap; const still = O.still || !G;
  const T = { up: "style=\"stroke:var(--hausse)\"", down: "style=\"stroke:var(--baisse)\"", lamp: "style=\"stroke:var(--lanterne)\"", ink: "style=\"stroke:var(--calcaire)\"", mute: "style=\"stroke:var(--mer-4)\"" };
  const txt = (x, y, s, anchor, color) => `<text x="${x}" y="${y}" text-anchor="${anchor || "start"}" style="fill:var(${color || "--calcaire-2"});font:500 10px 'Geist Mono',monospace">${s}</text>`;
  const DIA = {
    spread: `<svg viewBox="0 0 240 110" role="img" aria-label="Schéma : l’ask au-dessus, le bid en dessous, le spread entre les deux">
      <line x1="10" y1="36" x2="190" y2="36" ${T.up} stroke-width="1.5" class="draw"/>${txt(196, 39, "Ask")}
      <line x1="10" y1="72" x2="190" y2="72" ${T.down} stroke-width="1.5" class="draw"/>${txt(196, 75, "Bid")}
      <path d="M120 40 L120 68 M114 40 L126 40 M114 68 L126 68" ${T.lamp} fill="none" class="draw"/>${txt(130, 58, "spread", "start", "--lanterne-2")}</svg>`,
    candle: `<svg viewBox="0 0 240 120" role="img" aria-label="Schéma d’un chandelier haussier : haut, clôture, ouverture, bas">
      <line x1="80" y1="10" x2="80" y2="110" ${T.ink} class="draw"/><rect x="66" y="30" width="28" height="56" style="fill:var(--hausse)"/>
      <path d="M100 10 H130 M100 30 H130 M100 86 H130 M100 110 H130" ${T.mute} class="draw"/>
      ${txt(136, 13, "Haut")}${txt(136, 33, "Clôture")}${txt(136, 89, "Ouverture")}${txt(136, 113, "Bas")}</svg>`,
    drawdown: `<svg viewBox="0 0 240 110" role="img" aria-label="Schéma : courbe d’un compte, du plus haut au plus bas suivant">
      <polyline points="8,80 40,62 70,30 100,48 130,76 160,60 190,40 230,22" fill="none" ${T.ink} stroke-width="1.5" class="draw"/>
      <circle cx="70" cy="30" r="3.5" style="fill:var(--hausse)"/><circle cx="130" cy="76" r="3.5" style="fill:var(--baisse)"/>
      <path d="M70 30 H140 M140 30 V76" ${T.down} stroke-dasharray="3 3" fill="none" class="draw"/>${txt(146, 58, "drawdown", "start", "--baisse")}</svg>`,
    pip: `<svg viewBox="0 0 240 110" role="img" aria-label="Schéma : EUR/USD passe de 1,1000 à 1,1025, soit 25 pips">
      <polyline points="10,86 50,80 80,70 110,62 140,48 170,40 200,30" fill="none" ${T.up} stroke-width="1.5" class="draw"/>
      ${txt(10, 104, "1,1000")}${txt(232, 26, "1,1025", "end")}
      <path d="M212 34 V86 M206 86 H218 M206 34 H218" ${T.lamp} fill="none" class="draw"/>${txt(206, 64, "25 pips", "end", "--lanterne-2")}</svg>`,
    rr: `<svg viewBox="0 0 240 120" role="img" aria-label="Schéma : risque de 1 sous l’entrée, objectif de 2 au-dessus">
      <rect x="20" y="20" width="150" height="56" style="fill:var(--hausse);opacity:.16"/><rect x="20" y="76" width="150" height="28" style="fill:var(--baisse);opacity:.18"/>
      <line x1="20" y1="76" x2="170" y2="76" ${T.lamp} stroke-width="1.5" class="draw"/>
      ${txt(176, 24, "Objectif : 2")}${txt(176, 80, "Entrée")}${txt(176, 106, "Stop : 1")}</svg>`,
    sr: `<svg viewBox="0 0 240 110" role="img" aria-label="Schéma : le prix rebondit entre un support et une résistance">
      <rect x="0" y="18" width="240" height="12" style="fill:var(--baisse);opacity:.18"/><rect x="0" y="80" width="240" height="12" style="fill:var(--hausse);opacity:.18"/>
      <polyline points="6,70 36,26 66,84 98,24 128,86 160,28 190,82 230,20" fill="none" ${T.ink} stroke-width="1.5" class="draw"/>
      ${txt(6, 13, "Résistance")}${txt(6, 106, "Support")}</svg>`,
    stop: `<svg viewBox="0 0 240 110" role="img" aria-label="Schéma : le prix baisse jusqu’au stop-loss et la position se ferme">
      <line x1="10" y1="30" x2="230" y2="30" ${T.lamp} stroke-dasharray="4 4" class="draw"/>${txt(10, 24, "Entrée")}
      <line x1="10" y1="82" x2="230" y2="82" ${T.down} stroke-dasharray="4 4" class="draw"/>${txt(10, 98, "Stop-loss")}
      <polyline points="20,30 60,40 90,34 120,56 150,62 176,82" fill="none" ${T.ink} stroke-width="1.5" class="draw"/>
      <circle cx="176" cy="82" r="4" style="fill:var(--baisse)"/>${txt(186, 72, "fermée")}</svg>`
  };
  document.querySelectorAll(".diagram[data-dia]").forEach((d) => { d.innerHTML = DIA[d.dataset.dia] || ""; });

  if (!still && window.ScrollTrigger) {
    document.querySelectorAll(".diagram .draw").forEach((p) => {
      let len = 0; try { len = p.getTotalLength(); } catch (e) { return; }
      p.style.strokeDasharray = p.getAttribute("stroke-dasharray") ? p.getAttribute("stroke-dasharray") : len;
      if (p.getAttribute("stroke-dasharray")) return;
      p.style.strokeDashoffset = len;
      ScrollTrigger.create({ trigger: p.closest(".term"), start: "top 85%", once: true, onEnter: () => G.to(p, { strokeDashoffset: 0, duration: 1.2, ease: "power2.inOut" }) });
    });
  }

  /* Recherche */
  const input = document.getElementById("lex-q"); const items = [...document.querySelectorAll(".term")]; const groups = [...document.querySelectorAll(".lex-group")];
  const empty = document.querySelector(".lex-empty"); const count = document.querySelector("[data-lex-count]");
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  function filter() {
    const q = norm(input.value.trim()); let n = 0;
    items.forEach((it) => { const on = !q || norm(it.textContent).includes(q); it.hidden = !on; if (on) n++; });
    groups.forEach((g) => { g.hidden = ![...g.querySelectorAll(".term")].some((t) => !t.hidden); });
    empty.hidden = n > 0; count.textContent = n === items.length ? `${n} définitions` : `${n} résultat${n > 1 ? "s" : ""} sur ${items.length}`;
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }
  if (input) { input.addEventListener("input", filter); filter(); }
  const clear = document.querySelector("[data-lex-clear]"); if (clear) clear.addEventListener("click", () => { input.value = ""; filter(); input.focus(); });

  /* Arrivée sur une définition précise (#pip) */
  if (location.hash.length > 1) {
    const t = document.getElementById(location.hash.slice(1));
    if (t) setTimeout(() => { if (O.lenis) O.lenis.scrollTo(t, { offset: -200, immediate: true }); else t.scrollIntoView(); }, 300);
  }
})();
