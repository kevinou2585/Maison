// Happiness : synchronisation de chaque appli avec la feuille Google du Drive (voir google/Code.gs).
// Chaque appli garde ses données dans le téléphone (marche sans internet) et échange ses changements
// avec la feuille : la modification la plus récente gagne, élément par élément.
(() => {
  const CFG = 'maison:drive';
  const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsJson = (k, d) => { try { return JSON.parse(lsGet(k)) || d; } catch (e) { return d; } };
  const SET = Storage.prototype.setItem, DEL = Storage.prototype.removeItem;
  const lsSet = (k, v) => { try { SET.call(localStorage, k, v); return true; } catch (e) { return false; } };
  const cfg = () => lsJson(CFG, {});
  const relie = () => { const c = cfg(); return !!(c.url && c.cle); };

  // Avant la toute première synchro d'un appareil, ce qu'il écrit tout seul au démarrage ne doit pas
  // écraser le Drive : ces écritures ont l'heure 0 tant que personne n'a touché l'écran.
  let touche = false;
  ['pointerdown', 'keydown'].forEach(ev => addEventListener(ev, () => { touche = true; }, {capture: true, passive: true}));

  const moteurs = [];
  const ecoute = new Set();
  let etat = 'off';
  function statut(s) { etat = s; ecoute.forEach(f => { try { f(s); } catch (e) {} }); }

  async function appel(c, corps, params, garder) {
    const r = corps
      ? await fetch(c.url, {method: 'POST', keepalive: !!garder, headers: {'Content-Type': 'text/plain;charset=utf-8'}, body: JSON.stringify(Object.assign({cle: c.cle, qui: c.qui || ''}, corps))})
      : await fetch(c.url + (c.url.includes('?') ? '&' : '?') + new URLSearchParams(Object.assign({cle: c.cle}, params)));
    const o = await r.json();
    if (!o.ok) throw new Error(o.err || 'erreur');
    return o;
  }

  const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) | 0; return String(h); };

  // m : nom du module ; a : {get(id), put(rec), dirty(), tables(), recu(ids, premier)}
  function moteur(m, a) {
    const MK = 'maison:sync:' + m;
    const meta = lsJson(MK, {r: 0, sale: {}, h: '', init: false});
    const svMeta = () => lsSet(MK, JSON.stringify(meta));
    let minuteur = null, enCours = false, encore = false;
    const e = {
      m, meta,
      // Nouvelle feuille Google : on repart de zéro et on lui envoie tout.
      neuf() { meta.r = 0; meta.h = ''; meta.init = false; meta.sale = {}; a.ids().forEach(id => { meta.sale[id] = 1; }); svMeta(); },
      sale(id) { meta.sale[id] = 1; svMeta(); e.bientot(); },
      poids() { return meta.init || touche ? Date.now() : 0; },
      // On quitte la page avant l'envoi prévu : on envoie tout de suite ce qui reste (sans attendre la réponse).
      partir() {
        clearTimeout(minuteur);
        const ids = Object.keys(meta.sale);
        if (!ids.length || !relie() || !navigator.onLine) return;
        const recs = ids.map(id => a.get(id)).filter(Boolean);
        let tables = null; try { tables = a.tables ? a.tables() : null; } catch (err) {}
        const corps = {m, recs, tables};
        if (JSON.stringify(corps).length > 60000) { delete corps.tables; if (JSON.stringify(corps).length > 60000) return; }
        appel(cfg(), corps, null, true).catch(() => {});
      },
      bientot(ms) { clearTimeout(minuteur); minuteur = setTimeout(e.cycle, ms == null ? 1200 : ms); },
      async cycle() {
        if (!relie()) { statut('off'); return; }
        if (!navigator.onLine) { statut('horsligne'); return; }
        if (enCours) { encore = true; return; }
        enCours = true; statut('sync');
        const c = cfg();
        if (meta.u && meta.u !== c.url) e.neuf();
        meta.u = c.url;
        try {
          // 1. Recevoir ce que les autres ont changé
          const p = await appel(c, null, {m, r: meta.init ? meta.r : 0});
          const recus = [];
          p.recs.forEach(rec => {
            const loc = a.get(rec.id);
            const t = loc ? +loc.t || 0 : -1;
            // Premier contact d'un appareil avec le Drive : la version du Drive l'emporte toujours, pour qu'un
            // téléphone pas encore relié n'écrase pas les données de l'ordinateur avec sa vieille copie.
            if ((+rec.t || 0) > t || !meta.init) {
              if (a.put(rec) !== false) recus.push(rec.id);
              delete meta.sale[rec.id];
            }
          });
          const premier = !meta.init;
          meta.r = p.r; meta.init = true; svMeta();
          if (recus.length && a.recu) a.recu(recus, premier);
          // 2. Envoyer les miens (et les onglets lisibles s'ils ont changé)
          const ids = Object.keys(meta.sale), recs = ids.map(id => a.get(id)).filter(Boolean);
          let tables = null, h = meta.h;
          try { tables = a.tables ? a.tables() : null; } catch (err) { tables = null; }
          if (tables) { h = hash(JSON.stringify(tables)); if (h === meta.h) tables = null; }
          if (recs.length || tables) {
            const envoi = {}; recs.forEach(r => { envoi[r.id] = +r.t || 0; });
            const o = await appel(c, {m, recs, tables});
            ids.forEach(id => { const r = a.get(id); if (!r || (+r.t || 0) === envoi[id]) delete meta.sale[id]; });
            meta.h = h;
            if (o.r === meta.r + recs.length) meta.r = o.r; // personne d'autre n'a écrit entre-temps
            svMeta();
          }
          statut('ok');
          lsSet('maison:derniere', String(Date.now()));
        } catch (err) {
          statut(/mot de passe/.test(err.message) ? 'cle' : 'erreur');
        } finally {
          enCours = false;
          if (encore) { encore = false; e.bientot(300); }
        }
      }
    };
    moteurs.push(e);
    setTimeout(e.cycle, 50);
    return e;
  }

  // ---------- Annuler / refaire (↶ ↷ en haut à droite) ----------
  // On note l'état d'avant et d'après de chaque élément changé par une action de l'utilisateur.
  // Les changements faits dans la même seconde forment une seule action. La pile est gardée pour
  // la page en cours (sessionStorage) : elle survit au rechargement des pages du plan.
  const PK = 'maison:annuler:' + location.pathname;
  const ANN = (() => { try { return JSON.parse(sessionStorage.getItem(PK)) || {p: [], r: []}; } catch (e) { return {p: [], r: []}; } })();
  const remet = {};          // module → fonction (id, valeur) qui remet un élément dans un état
  let rejoue = false;
  const majAnn = new Set();
  function garderAnn() {
    for (;;) {
      try { sessionStorage.setItem(PK, JSON.stringify(ANN)); break; }
      catch (e) { if (ANN.p.length > 1) ANN.p.shift(); else if (ANN.r.length) ANN.r.shift(); else { ANN.p = []; break; } }
    }
    majAnn.forEach(f => f());
  }
  function noter(m, id, avant, apres) {
    if (rejoue || !touche || avant === apres) return;
    const now = Date.now(), k = m + '\u0001' + id;
    let g = ANN.p[ANN.p.length - 1];
    if (!g || now - g.q > 1000) { g = {q: now, ch: {}}; ANN.p.push(g); if (ANN.p.length > 40) ANN.p.shift(); }
    g.q = now;
    if (g.ch[k]) g.ch[k].ap = apres; else g.ch[k] = {m, id, av: avant, ap: apres};
    ANN.r = [];
    garderAnn();
  }
  function rejouer(de, vers, cle) {
    const g = ANN[de].pop(); if (!g) return false;
    const parM = {};
    rejoue = true;
    try { Object.values(g.ch).forEach(c => { if (remet[c.m]) { remet[c.m].mettre(c.id, c[cle]); (parM[c.m] = parM[c.m] || []).push(c.id); } }); }
    finally { rejoue = false; }
    ANN[vers].push(g); garderAnn();
    Object.keys(parM).forEach(m => remet[m].apres(parM[m]));
    return true;
  }
  const annuler = () => rejouer('p', 'r', 'av'), refaire = () => rejouer('r', 'p', 'ap');
  // Ctrl+Z / Ctrl+Y (ou Maj+Ctrl+Z), sauf dans un champ de texte où le navigateur gère déjà
  addEventListener('keydown', e => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey || !Object.keys(remet).length) return;
    const t = e.target, champ = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    if (champ) return;
    const k = e.key.toLowerCase();
    if (k === 'z' && !e.shiftKey) { e.preventDefault(); annuler(); }
    else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); refaire(); }
  });

  // Applis Courses et To-Do : une liste d'éléments {id, type, ..., t, del}
  function store(m, opt) {
    const K = 'maison:' + m;
    let D = lsJson(K, {});
    const sv = () => lsSet(K, JSON.stringify(D));
    const plein = () => { (opt.plein || (() => alert("La mémoire de l'appli est pleine sur cet appareil : cette modification n'a pas pu être gardée.")))(); };
    (opt.graines || []).forEach(g => { if (!D[g.id]) D[g.id] = Object.assign({t: 1}, g); });
    // Copie de chaque élément tel qu'enregistré (les applis modifient souvent l'objet avant de l'enregistrer)
    const SN = {}, snap = id => { const r = D[id]; return r && !r.del ? JSON.stringify(r) : null; };
    Object.keys(D).forEach(id => { SN[id] = snap(id); });
    const vu = id => { const av = SN[id] === undefined ? null : SN[id], ap = snap(id); SN[id] = ap; noter(m, id, av, ap); };
    const e = moteur(m, {
      ids: () => Object.keys(D),
      get: id => D[id] || null,
      put: rec => { D[rec.id] = rec; sv(); SN[rec.id] = snap(rec.id); },
      tables: () => opt.tables ? opt.tables(Object.values(D).filter(r => !r.del)) : null,
      recu: () => { opt.recu && opt.recu(); }
    });
    sv();
    remet[m] = {
      mettre(id, v) { const t = Date.now(); D[id] = v == null ? {id, type: D[id] && D[id].type, del: 1, t} : Object.assign(JSON.parse(v), {t}); SN[id] = snap(id); e.sale(id); },
      apres() { sv(); e.bientot(); opt.recu ? opt.recu() : location.reload(); }
    };
    return {
      tous: type => Object.values(D).filter(r => !r.del && (!type || r.type === type)),
      get: id => (D[id] && !D[id].del) ? D[id] : null,
      put(rec) { rec.t = Date.now(); D[rec.id] = rec; if (!sv()) plein(); vu(rec.id); e.sale(rec.id); return rec; },
      // Plusieurs éléments d'un coup (import) : un seul enregistrement
      putTous(recs) { const t = Date.now(); recs.forEach(r => { r.t = t; D[r.id] = r; }); if (!sv()) plein(); recs.forEach(r => vu(r.id)); recs.forEach(r => { e.meta.sale[r.id] = 1; }); e.sale(recs.length ? recs[0].id : ''); },
      del(id) { if (!D[id]) return; D[id] = {id, type: D[id].type, del: 1, t: Date.now()}; sv(); vu(id); e.sale(id); },
      id: () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      synchro: () => e.cycle()
    };
  }

  // Jardin du Bonheur : chaque clé du stockage du jardin est un élément.
  function jardin(opt) {
    const TK = 'maison:jardin:t', T = lsJson(TK, {});
    const svT = () => lsSet(TK, JSON.stringify(T));
    const garde = k => typeof k === 'string' && opt.cles.test(k);
    let e = null;
    const get = id => { const v = lsGet(id); if (v == null && T[id] == null) return null; return v == null ? {id, del: 1, t: T[id] || 0} : {id, v, t: T[id] || 0}; };
    Storage.prototype.setItem = function (k, v) {
      const avant = this === localStorage && garde(k) ? lsGet(k) : undefined;
      SET.call(this, k, v);
      if (avant !== undefined && avant !== String(v)) { T[k] = e.poids(); svT(); e.sale(k); noter('jardin', k, avant, String(v)); }
    };
    Storage.prototype.removeItem = function (k) {
      const avait = this === localStorage && garde(k) ? lsGet(k) : null;
      DEL.call(this, k);
      if (avait != null) { T[k] = e.poids(); svT(); e.sale(k); noter('jardin', k, avait, null); }
    };
    e = moteur('jardin', {
      ids: () => { const o = []; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (garde(k)) o.push(k); } } catch (err) {} return o; },
      get,
      put(rec) {
        if (rec.del) DEL.call(localStorage, rec.id);
        else if (!lsSet(rec.id, rec.v)) { opt.plein && opt.plein(); return false; }
        T[rec.id] = +rec.t || 0; svT();
      },
      tables: opt.tables,
      recu: opt.recu
    });
    remet.jardin = {
      mettre(k, v) { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); },
      // Pages du plan : l'ancien jardin garde tout en mémoire, on recharge ; ailleurs on redessine
      apres(ids) { if (opt.annule) opt.annule(ids); else location.reload(); }
    };
    // Clés déjà présentes sur cet appareil (sauvegarde importée avant la synchro) : à envoyer.
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (garde(k) && T[k] == null) { T[k] = 0; e.meta.sale[k] = 1; } } svT(); } catch (err) {}
    return {synchro: () => e.cycle()};
  }

  function toutSynchro() { moteurs.forEach(e => e.cycle()); }
  setInterval(() => { if (document.visibilityState === 'visible') toutSynchro(); }, 15000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') toutSynchro(); else moteurs.forEach(e => e.partir()); });
  addEventListener('online', toutSynchro);
  addEventListener('pagehide', () => moteurs.forEach(e => e.partir()));

  // Petite pastille d'état, en haut à droite de chaque appli
  function pastille(lien) {
    const b = document.createElement('a');
    b.id = 'maison-nuage'; b.href = lien || '../#drive';
    const st = document.createElement('style');
    st.textContent = '#maison-nuage{position:fixed;top:calc(8px + env(safe-area-inset-top,0px));right:8px;z-index:9999;font:600 12px system-ui,-apple-system,sans-serif;padding:5px 9px;border-radius:99px;background:rgba(255,255,255,.92);color:#2e4a35;border:1px solid #c9d6cb;text-decoration:none;box-shadow:0 1px 4px #0002}#maison-nuage.err{color:#a3261b;border-color:#e6b0aa}#maison-nuage.off{color:#6b6b6b}';
    document.head.appendChild(st);
    const txt = {off: ['☁️ Drive non relié', 'off'], sync: ['☁️ …', ''], ok: ['☁️ ✓', ''], horsligne: ['☁️ hors ligne', 'off'], erreur: ['☁️ erreur', 'err'], cle: ['☁️ mot de passe ?', 'err']};
    const maj = s => { const [t, c] = txt[s] || txt.off; b.textContent = t; b.className = c; b.title = 'Sauvegarde Drive : ' + t; };
    ecoute.add(maj); maj(relie() ? etat : 'off');
    // ↶ ↷ : annuler / refaire la dernière action de cette page
    const z = document.createElement('div'); z.id = 'maison-haut';
    const bt = (t, l, f) => { const x = document.createElement('button'); x.type = 'button'; x.className = 'mh-z'; x.textContent = t; x.title = l; x.setAttribute('aria-label', l); x.onclick = f; return x; };
    const bA = bt('↶', 'Annuler la dernière action (Ctrl+Z)', () => { if (annuler()) bulle('↶ Annulé'); }), bR = bt('↷', 'Refaire (Ctrl+Y)', () => { if (refaire()) bulle('↷ Refait'); });
    st.textContent += '#maison-haut{position:fixed;top:calc(8px + env(safe-area-inset-top,0px));right:8px;z-index:9999;display:flex;gap:5px;align-items:center}#maison-haut #maison-nuage{position:static}.mh-z{font:700 16px/1 system-ui,-apple-system,sans-serif;width:30px;height:28px;padding:0;border-radius:99px;background:rgba(255,255,255,.92);color:#2e4a35;border:1px solid #c9d6cb;box-shadow:0 1px 4px #0002;cursor:pointer}.mh-z:disabled{opacity:.35;cursor:default}.mh-bulle{position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);background:#2b2b2b;color:#fff;padding:9px 16px;border-radius:12px;z-index:10000;font:600 14px system-ui,-apple-system,sans-serif}';
    const etatZ = () => { const actif = Object.keys(remet).length > 0; bA.hidden = bR.hidden = !actif; bA.disabled = !ANN.p.length; bR.disabled = !ANN.r.length; };
    majAnn.add(etatZ);
    z.append(bA, bR, b);
    (document.body ? Promise.resolve() : new Promise(ok => document.addEventListener('DOMContentLoaded', ok))).then(() => { document.body.appendChild(z); etatZ(); });
  }

  function bulle(t) { const d = document.createElement('div'); d.className = 'mh-bulle'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 1400); }

  // Bouton 🎤 à côté d'un champ, quand le navigateur sait faire la dictée (Chrome, Safari récents)
  function dictee(input, apres) {
    const R = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!R || !input || input.dataset.dictee) return;
    input.dataset.dictee = '1';
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'dictee'; b.textContent = '🎤'; b.setAttribute('aria-label', 'Dicter');
    b.style.cssText = 'flex:none;border:1px solid currentColor;border-color:rgba(127,127,127,.35);background:none;border-radius:10px;padding:0 11px;font-size:18px;cursor:pointer';
    b.onclick = () => {
      const r = new R(); r.lang = 'fr-FR'; r.interimResults = false; r.maxAlternatives = 1;
      b.textContent = '⏺'; b.style.color = '#c62828';
      r.onresult = e => { input.value = e.results[0][0].transcript.replace(/[.!?]$/, ''); input.dispatchEvent(new Event('input', {bubbles: true})); apres && apres(); };
      r.onend = () => { b.textContent = '🎤'; b.style.color = ''; };
      try { r.start(); } catch (err) { r.onend(); }
    };
    input.insertAdjacentElement('afterend', b);
  }

  // Fichiers joints : envoyés dans le dossier « Ma maison – fichiers » du Drive, relus via le script
  const b64 = f => new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1] || ''); r.onerror = ko; r.readAsDataURL(f); });
  async function envoyerFichier(blob, nom) {
    if (!relie()) throw new Error('drive');
    return appel(cfg(), {a: 'fichier', nom: nom || blob.name || 'fichier', type: blob.type || 'application/octet-stream', data: await b64(blob)});
  }
  async function lireFichier(id) {
    const o = await appel(cfg(), null, {a: 'fichier', id});
    const bin = atob(o.data), u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return new Blob([u], {type: o.type});
  }

  window.Maison = {
    dictee, envoyerFichier, lireFichier,
    cfg, relie, store, jardin, pastille, toutSynchro, annuler, refaire,
    regler(c) { lsSet(CFG, JSON.stringify(c)); toutSynchro(); },
    surStatut(f) { ecoute.add(f); f(relie() ? etat : 'off'); },
    tester: async c => appel(c, null, {m: 'todo', r: 1e15})
  };
})();

// To do et Courses : un petit code par habitat (maison, chalet), juste pour ne pas voir les listes de l'autre.
// Ce n'est pas une vraie protection. Une fois le code tapé, ce téléphone reste ouvert pour ce lieu.
Maison.lieu = (() => {
  const CODES = {maison: '123', chalet: '456'}, K = 'maison:lieux-ouverts';
  const lit = () => { try { return JSON.parse(localStorage.getItem(K)) || {}; } catch (e) { return {}; } };
  const ecrit = o => { try { localStorage.setItem(K, JSON.stringify(o)); } catch (e) {} };
  return {
    ouvert: l => !!lit()[l],
    fermer(l) { const o = lit(); delete o[l]; ecrit(o); },
    // Demande le code ; ok() est appelé quand il est bon
    demander(l, titre, ok) {
      let d = document.getElementById('dlg-lieu');
      if (!d) { d = document.createElement('dialog'); d.id = 'dlg-lieu'; document.body.appendChild(d); }
      d.innerHTML = `<form method="dialog" style="min-width:240px"><h3 style="margin:0 0 10px">${titre}</h3>
        <input id="lieu-c" type="password" inputmode="numeric" autocomplete="off" placeholder="Code" aria-label="Code" style="width:100%;box-sizing:border-box">
        <div id="lieu-m" style="color:#c0392b;font-size:14px;min-height:18px;margin-top:6px"></div>
        <div class="btns" style="display:flex;gap:8px;justify-content:flex-end;margin-top:6px"><button type="button" id="lieu-n">Annuler</button><button class="go" id="lieu-o">Ouvrir</button></div></form>`;
      d.querySelector('#lieu-n').onclick = () => d.close();
      d.querySelector('form').onsubmit = e => {
        e.preventDefault();
        if (d.querySelector('#lieu-c').value.trim() !== CODES[l]) { d.querySelector('#lieu-m').textContent = 'Ce n\'est pas le bon code.'; d.querySelector('#lieu-c').select(); return; }
        const o = lit(); o[l] = 1; ecrit(o); d.close(); ok();
      };
      d.showModal(); setTimeout(() => d.querySelector('#lieu-c').focus(), 50);
    }
  };
})();
