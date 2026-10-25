/* Page parcours : test de niveau et demande d’inscription simulée */
(function () {
  const O = window.OLLIZ; const G = window.gsap; const still = O.still || !G;

  /* ---------- Test de niveau ---------- */
  const Q = [
    { q: "Avez-vous déjà ouvert une position, même sur un compte de démonstration ?", a: ["Jamais", "Quelques fois, en démonstration", "Oui, régulièrement"] },
    { q: "Que représente le spread ?", a: ["Je ne sais pas encore", "Un frais du courtier, je crois", "L’écart entre l’ask et le bid"] },
    { q: "Votre stop-loss, vous le placez…", a: ["Rarement, voire jamais", "Parfois, une fois la position ouverte", "Toujours, avant d’entrer"] },
    { q: "Savez-vous calculer une taille de position à partir de ce que vous acceptez de perdre ?", a: ["Non", "À peu près", "Oui, à chaque fois"] },
    { q: "Tenez-vous un journal de vos positions ?", a: ["Non", "De temps en temps", "Oui, et je le relis"] },
    { q: "Le calendrier économique, pour vous, c’est…", a: ["Je ne connais pas", "Je le regarde parfois", "Je le consulte avant chaque séance"] }
  ];
  const quiz = document.getElementById("quiz");
  if (quiz) {
    const qEl = quiz.querySelector(".quiz-q"), opts = quiz.querySelector(".quiz-opts"), bar = quiz.querySelector(".quiz-progress i"), res = quiz.querySelector(".quiz-result"), count = quiz.querySelector("[data-count-q]");
    let i = 0, score = 0;
    function show() {
      const item = Q[i];
      qEl.textContent = item.q; count.textContent = `Question ${i + 1} sur ${Q.length}`;
      opts.innerHTML = item.a.map((t, k) => `<button type="button" data-v="${k}">${t}</button>`).join("");
      bar.style.width = (i / Q.length) * 100 + "%";
      if (!still) G.from([qEl, ...opts.children], { y: 14, autoAlpha: 0, duration: 0.45, stagger: 0.05, ease: "power3.out" });
      const first = opts.querySelector("button"); if (first && i > 0) first.focus({ preventScroll: true });
    }
    opts.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      score += +b.dataset.v; i++;
      if (i < Q.length) show(); else finish();
    });
    function finish() {
      bar.style.width = "100%";
      const inter = score >= 7;
      quiz.querySelector(".quiz-body").hidden = true; res.hidden = false;
      res.querySelector("[data-r-lvl]").textContent = inter ? "Niveau intermédiaire" : "Niveau débutant";
      res.querySelector("[data-r-txt]").textContent = inter
        ? "Vous avez les bases. Le parcours intermédiaire (modules 5 à 8) vous aidera à structurer votre pratique. Si le calcul de taille de position n’est pas encore un réflexe, commencez par revoir le module 4."
        : "Commencez par le parcours débutant (modules 1 à 4). Vous y apprendrez à lire un graphique, à passer un ordre et, surtout, à mesurer votre risque avant d’entrer.";
      res.querySelector("[data-r-score]").textContent = `${score} sur ${Q.length * 2}`;
      const go = res.querySelector("[data-r-go]"); go.dataset.lvl = inter ? "Intermédiaire" : "Débutant";
      go.textContent = inter ? "Demander le parcours intermédiaire" : "Demander le parcours débutant";
      if (!still) G.from(res.children, { y: 18, autoAlpha: 0, duration: 0.6, stagger: 0.07, ease: "power3.out" });
      res.setAttribute("tabindex", "-1"); res.focus({ preventScroll: true });
    }
    quiz.querySelector("[data-r-again]").addEventListener("click", () => { i = 0; score = 0; res.hidden = true; quiz.querySelector(".quiz-body").hidden = false; show(); });
    quiz.querySelector("[data-r-go]").addEventListener("click", (e) => {
      const lvl = e.currentTarget.dataset.lvl; const r = document.querySelector(`#inscription input[name="niveau"][value="${lvl}"]`); if (r) r.checked = true;
    });
    show();
  }

  /* ---------- Demande d’inscription en plusieurs étapes (simulée) ---------- */
  const form = document.getElementById("inscription");
  if (form) {
    const steps = [...form.querySelectorAll("[data-step]")], chips = [...form.querySelectorAll(".steps-nav span")];
    let cur = 0;
    function go(n, initial) {
      steps.forEach((s, k) => (s.hidden = k !== n));
      chips.forEach((c, k) => { c.classList.toggle("on", k === n); c.classList.toggle("done", k < n); });
      const fp = form.querySelector(".form-progress i"); if (fp) fp.style.width = ((n + 1) / steps.length) * 100 + "%";
      cur = n;
      if (n === steps.length - 1) recap();
      if (initial) return;
      if (!still) G.from(steps[n], { x: 24, autoAlpha: 0, duration: 0.5, ease: "power3.out" });
      const f = steps[n].querySelector("input, select, button"); if (f) f.focus({ preventScroll: true });
    }
    function valid(step) {
      let ok = true;
      step.querySelectorAll(".field").forEach((field) => {
        const req = field.querySelectorAll("[required]"); if (!req.length) return;
        let good = true;
        const group = field.querySelector('input[type="radio"][required]');
        if (group) good = !!field.querySelector(`input[name="${group.name}"]:checked`);
        else req.forEach((el) => { if (!el.checkValidity()) good = false; });
        let err = field.querySelector(".err");
        if (!good) {
          ok = false; if (!err) { err = document.createElement("span"); err.className = "err"; field.appendChild(err); }
          const em = field.querySelector('input[type="email"]');
          err.textContent = group ? "Choisissez une option pour continuer." : (em && em.value ? "Adresse e-mail incomplète : vérifiez le @ et le domaine." : (field.querySelector('input[type="checkbox"][required]') ? "Cochez cette case pour que nous puissions vous répondre." : "Ce champ est nécessaire pour traiter la demande."));
        } else if (err) err.remove();
      });
      if (!ok) { const e = step.querySelector(".err"); if (e) e.closest(".field").querySelector("input, select").focus(); }
      return ok;
    }
    function recap() {
      const fd = new FormData(form);
      const rows = [
        ["Niveau", fd.get("niveau")], ["Objectif", fd.get("objectif")],
        ["Disponibilités", fd.getAll("dispo").join(", ") || "Non précisé"], ["Format souhaité", fd.get("format")],
        ["Nom", `${fd.get("prenom") || ""} ${fd.get("nom") || ""}`.trim()], ["E-mail", fd.get("email")], ["Téléphone", fd.get("tel") || "Non renseigné"]
      ];
      form.querySelector(".recap").innerHTML = rows.map(([k, v]) => `<div><span class="k">${k}</span><span></span></div>`).join("");
      form.querySelectorAll(".recap div span:last-child").forEach((s, k) => (s.textContent = rows[k][1] || ""));
    }
    form.addEventListener("click", (e) => {
      const b = e.target.closest("[data-next], [data-prev]"); if (!b) return;
      if (b.hasAttribute("data-next")) { if (valid(steps[cur])) go(cur + 1); } else go(cur - 1);
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (cur < steps.length - 1) { if (valid(steps[cur])) go(cur + 1); return; }
      form.querySelector(".steps-wrap").hidden = true; const ok = form.querySelector("[data-done]"); ok.hidden = false; ok.focus();
      if (!still) G.from(ok, { y: 20, autoAlpha: 0, duration: 0.6, ease: "power3.out" });
    });
    go(0, true);
  }
})();
