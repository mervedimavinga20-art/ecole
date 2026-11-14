/* Sécurité partagée par admin.html, espace.html et enseignant.html.
   Rien de secret ici : seulement des aides (mot de passe, déconnexion, inactivité, journal de connexion). */
(function () {
  "use strict";

  // 1) Anti-clickjacking : si la page est ouverte dans le cadre d'un autre site, on la cache.
  try { if (window.top !== window.self) document.documentElement.style.display = "none"; }
  catch (e) { document.documentElement.style.display = "none"; }

  // 2) Mot de passe : 8 caractères minimum, lettres ET chiffres, pas un mot de passe courant.
  const FAIBLES = ["12345678", "123456789", "1234567890", "password", "password1", "motdepasse", "motdepasse1", "azerty123", "azertyuiop", "qwerty123", "abcd1234", "kinshasa1", "kinshasa123", "congo123", "ecole123"];
  function verifierMotDePasse(m) {
    m = String(m || "");
    if (m.length < 8) return "Le mot de passe doit avoir au moins 8 caractères.";
    if (!/[A-Za-z]/.test(m) || !/[0-9]/.test(m)) return "Mélange des lettres et des chiffres dans ton mot de passe.";
    if (FAIBLES.includes(m.toLowerCase()) || /^(.)\1+$/.test(m)) return "Ce mot de passe est trop facile à deviner. Choisis-en un autre.";
    return "";
  }

  // 3) Messages d'erreur en français.
  function messageAuth(e) {
    const t = String((e && e.message) || e || "");
    if (/Failed to fetch|NetworkError|Load failed/i.test(t)) return "Pas de connexion Internet.";
    if (/Invalid login/i.test(t)) return "Email ou mot de passe incorrect.";
    if (/already registered|already been registered/i.test(t)) return "Un compte existe déjà avec cet email. Connecte-toi.";
    if (/Password should be at least|weak password|known to be weak/i.test(t)) return "Mot de passe refusé : au moins 8 caractères, avec des lettres et des chiffres.";
    if (/same password|different from the old/i.test(t)) return "Choisis un mot de passe différent de l'ancien.";
    if (/Email not confirmed/i.test(t)) return "Confirme d'abord ton email avec le lien reçu.";
    if (/rate limit|too many|after \d+ seconds|over_.*_rate/i.test(t)) return "Trop de demandes. Attends quelques minutes puis réessaie.";
    if (/Trop de tentatives|Service momentan/i.test(t)) return t.slice(0, 140);
    if (/session.*missing|not authenticated|JWT/i.test(t)) return "Ta session a expiré. Reconnecte-toi.";
    return t.slice(0, 140);
  }

  // 4) Freinage visible des essais de connexion (le vrai blocage est côté Supabase).
  function limiteur(nom) {
    const cle = "essais-" + nom;
    const lire = () => { try { return JSON.parse(sessionStorage.getItem(cle)) || { n: 0, jusque: 0 }; } catch (e) { return { n: 0, jusque: 0 }; } };
    const ecrire = (v) => { try { sessionStorage.setItem(cle, JSON.stringify(v)); } catch (e) { /* ignoré */ } };
    return {
      attente() { const s = Math.ceil((lire().jusque - Date.now()) / 1000); return s > 0 ? s : 0; },
      echec() { const v = lire(); v.n++; if (v.n >= 5) v.jusque = Date.now() + Math.min(300, 15 * Math.pow(2, v.n - 5)) * 1000; ecrire(v); },
      succes() { ecrire({ n: 0, jusque: 0 }); }
    };
  }

  // 5) Déconnexion automatique après inactivité (vérifie aussi au réveil du téléphone).
  function surveillerInactivite(minutes, rappel) {
    let dernier = Date.now(), actif = true;
    const ping = () => { dernier = Date.now(); };
    for (const e of ["pointerdown", "keydown", "touchstart", "scroll", "input"]) window.addEventListener(e, ping, { passive: true, capture: true });
    function verifier() { if (actif && Date.now() - dernier >= minutes * 60000) { actif = false; try { rappel(); } catch (e) { /* ignoré */ } } }
    setInterval(verifier, 15000);
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") verifier(); });
    return { reprendre() { dernier = Date.now(); actif = true; }, pause() { actif = false; } };
  }

  // 6) Trace de connexion (admin et enseignants seulement ; ignorée si la base n'est pas à jour).
  function noterConnexion(sb, appli) {
    try { Promise.resolve(sb.rpc("noter_connexion", { p_app: appli })).then(() => {}, () => {}); } catch (e) { /* ignoré */ }
  }

  // 7) Mot de passe oublié : même réponse que le compte existe ou non (pas d'espionnage des comptes).
  async function motDePasseOublie(sb, email) {
    email = String(email || "").trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) return "Écris d'abord ton adresse email dans la case au-dessus.";
    try {
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
      if (error && /rate limit|seconds|too many/i.test(error.message)) return messageAuth(error);
    } catch (e) { return messageAuth(e); }
    return "Si un compte existe avec cet email, un lien de réinitialisation vient d'être envoyé. Regarde aussi dans les courriers indésirables.";
  }

  // ---------- Petites fenêtres (changer le mot de passe, déconnecter les appareils) ----------
  const STYLE = ".cm-fond{--cm-c:#fff;--cm-t:#12212b;--cm-d:#566873;--cm-b:#d9e1e5;--cm-a:#0b7a75;--cm-r:#a11e17;position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:16px;font:16px/1.45 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}" +
    "@media(prefers-color-scheme:dark){.cm-fond{--cm-c:#14232e;--cm-t:#e6eef3;--cm-d:#9db0bc;--cm-b:#29404f;--cm-a:#4cc2bb;--cm-r:#f2a39d}}" +
    ".cm-boite{background:var(--cm-c);color:var(--cm-t);border:1px solid var(--cm-b);border-radius:14px;max-width:420px;width:100%;max-height:92vh;overflow:auto;padding:18px;display:flex;flex-direction:column;gap:10px}" +
    ".cm-boite h2{margin:0;font-size:20px}.cm-boite h3{margin:8px 0 0;font-size:16px}.cm-boite p{margin:0;color:var(--cm-d);font-size:14px;overflow-wrap:anywhere}" +
    ".cm-boite input{width:100%;min-height:48px;padding:0 12px;border:1px solid var(--cm-b);border-radius:10px;background:var(--cm-c);color:var(--cm-t);font:inherit;box-sizing:border-box}" +
    ".cm-boite button{min-height:48px;border-radius:12px;border:1.5px solid var(--cm-a);background:var(--cm-c);color:var(--cm-a);font:inherit;font-weight:700;cursor:pointer;padding:0 14px}" +
    ".cm-boite button.cm-p{background:var(--cm-a);color:#fff}.cm-boite button.cm-d{border-color:var(--cm-r);color:var(--cm-r)}" +
    ".cm-boite button:disabled{opacity:.6}.cm-boite [role=alert]{min-height:1.2em;color:var(--cm-r)}.cm-boite [role=alert].cm-ok{color:var(--cm-a)}";
  function h(tag, props, ...enfants) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) { if (k === "class") n.className = v; else if (k === "text") n.textContent = v; else n.setAttribute(k, v); }
    for (const c of enfants) if (c != null) n.append(c);
    return n;
  }
  function fenetre(titre, contenu, fermable) {
    if (!document.getElementById("cm-style")) { const s = document.createElement("style"); s.id = "cm-style"; s.textContent = STYLE; document.head.appendChild(s); }
    const fond = h("div", { class: "cm-fond" });
    const boite = h("div", { class: "cm-boite", role: "dialog", "aria-modal": "true", "aria-label": titre });
    boite.append(h("h2", { text: titre }), ...contenu);
    if (fermable) { const f = h("button", { type: "button", text: "Fermer" }); f.addEventListener("click", () => fond.remove()); boite.appendChild(f); }
    fond.appendChild(boite); document.body.appendChild(fond);
    const premier = boite.querySelector("input,button"); if (premier) setTimeout(() => premier.focus(), 30);
    return fond;
  }
  function formulaireMdp(sb, texteBouton, apres) {
    const a = h("input", { type: "password", autocomplete: "new-password", "aria-label": "Nouveau mot de passe", placeholder: "Nouveau mot de passe" });
    const b = h("input", { type: "password", autocomplete: "new-password", "aria-label": "Répéter le mot de passe", placeholder: "Répète le mot de passe" });
    const msg = h("p", { role: "alert" });
    const ok = h("button", { type: "button", class: "cm-p", text: texteBouton });
    ok.addEventListener("click", async () => {
      msg.className = ""; msg.textContent = "";
      const pb = verifierMotDePasse(a.value); if (pb) { msg.textContent = pb; return; }
      if (a.value !== b.value) { msg.textContent = "Les deux mots de passe sont différents."; return; }
      ok.disabled = true; msg.textContent = "Un instant…";
      try {
        const { error } = await sb.auth.updateUser({ password: a.value });
        if (error) { ok.disabled = false; msg.textContent = messageAuth(error); return; }
        a.value = ""; b.value = ""; msg.className = "cm-ok"; msg.textContent = "Mot de passe changé."; ok.disabled = false;
        if (apres) apres();
      } catch (e) { ok.disabled = false; msg.textContent = messageAuth(e); }
    });
    return [a, b, msg, ok];
  }
  // Fenêtre « Mon compte » : changer le mot de passe, déconnecter tous les appareils.
  function ouvrirCompte(sb, opts) {
    opts = opts || {};
    const sortir = h("button", { type: "button", class: "cm-d", text: "Déconnecter tous mes appareils" });
    const msg = h("p", { role: "alert" });
    let fond;
    sortir.addEventListener("click", async () => {
      if (!confirm("Te déconnecter de tous tes appareils, y compris celui-ci ?")) return;
      sortir.disabled = true;
      try {
        const { error } = await sb.auth.signOut({ scope: "global" });
        if (error) { sortir.disabled = false; msg.textContent = messageAuth(error); return; }
      } catch (e) { sortir.disabled = false; msg.textContent = messageAuth(e); return; }
      fond.remove(); if (opts.apresDeconnexion) opts.apresDeconnexion();
    });
    fond = fenetre("Mon compte", [
      h("p", { text: opts.email ? "Connecté : " + opts.email : "" }),
      h("h3", { text: "Changer mon mot de passe" }), ...formulaireMdp(sb, "Enregistrer le mot de passe"),
      h("h3", { text: "Sécurité" }), h("p", { text: "Si tu as perdu ton téléphone ou prêté ton compte, coupe toutes les connexions." }), sortir, msg
    ], true);
  }
  // Après un clic sur le lien « mot de passe oublié » reçu par email.
  function ecouterRecuperation(sb, apres) {
    try {
      sb.auth.onAuthStateChange((evt) => {
        if (evt !== "PASSWORD_RECOVERY") return;
        setTimeout(() => {
          try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { /* ignoré */ }
          fenetre("Nouveau mot de passe", [h("p", { text: "Choisis un nouveau mot de passe pour ton compte." }), ...formulaireMdp(sb, "Enregistrer", () => { setTimeout(() => { document.querySelectorAll(".cm-fond").forEach((n) => n.remove()); if (apres) apres(); }, 900); })], false);
        }, 0);
      });
    } catch (e) { /* ignoré */ }
  }

  window.COMMUN = { verifierMotDePasse, messageAuth, limiteur, surveillerInactivite, noterConnexion, motDePasseOublie, ouvrirCompte, ecouterRecuperation };
})();
