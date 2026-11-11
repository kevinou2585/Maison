// Happiness est privée : un appareil inconnu doit demander l'accès, et kevin accepte (ou refuse) par e-mail.
// Passent tout de suite : les appareils déjà reliés au Drive de Happiness, et ceux que kevin a acceptés.
// Les demandes passent par le script Google de Happiness (a=acces) et sont rangées dans l'onglet « Accès ».
(() => {
  const SCRIPT = 'https://script.google.com/macros/s/AKfycbx--DY2I4FIoVvEgs8mAXhBaELZlBabLe49XQL0xsARiV2Xt2aA6P4dWxVDkvZPZWHx_g/exec';
  const K = 'maison:acces';
  const lit = k => { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch (e) { return {}; } };
  const ecrit = v => { try { localStorage.setItem(K, JSON.stringify(v)); } catch (e) {} };
  const drive = lit('maison:drive');
  if (drive.url && drive.cle) return;                       // appareil de la maison (relié au Drive)
  const A = lit(K);
  if (!A.id) { A.id = Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(36).padStart(2, '0')).join('').slice(0, 20); ecrit(A); }
  const url = SCRIPT.replace(/\/exec.*/, '/exec');
  const demander = params => fetch(url + '?' + new URLSearchParams(Object.assign({a: 'acces', id: A.id}, params))).then(r => r.json());

  if (A.etat === 'ok') {
    // Déjà accepté : on revérifie en silence (si kevin a retiré l'accès dans l'onglet « Accès », on referme).
    if (navigator.onLine) demander({}).then(o => { if (o && o.ok && (o.etat === 'refuse' || o.etat === 'inconnu')) { A.etat = o.etat; ecrit(A); location.reload(); } }).catch(() => {});
    return;
  }

  // Page cachée tant que l'accès n'est pas accordé
  const st = document.createElement('style');
  st.textContent = 'html.acces-ferme body>*:not(#acces-voile){display:none!important}html.acces-ferme body{background:#fff6ec!important}' +
    '#acces-voile{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:24px;background:linear-gradient(160deg,#ff8a65,#ffb74d 55%,#ffd54f);font:16px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;color:#3a1f0b}' +
    '#acces-voile .b{background:#fff;border-radius:22px;padding:24px 20px;max-width:380px;width:100%;box-shadow:0 10px 30px #0003;text-align:center}' +
    '#acces-voile h1{font-size:23px;margin:6px 0 6px}#acces-voile p{margin:8px 0;color:#5a4636}' +
    '#acces-voile input{width:100%;box-sizing:border-box;border:1px solid #e0cfc0;border-radius:12px;padding:13px;font:inherit;margin-top:10px;color:#222;background:#fff}' +
    '#acces-voile button{width:100%;border:0;border-radius:12px;padding:14px;margin-top:10px;font:inherit;font-weight:700;background:#2e6b3f;color:#fff;cursor:pointer}' +
    '#acces-voile .petit{font-size:13px;color:#8a7362}';
  document.documentElement.classList.add('acces-ferme');
  (document.head || document.documentElement).appendChild(st);

  const appareil = () => { const u = navigator.userAgent; return (/iPhone/.test(u) ? 'iPhone' : /iPad/.test(u) ? 'iPad' : /Android/.test(u) ? 'Android' : /Windows/.test(u) ? 'Windows' : /Mac/.test(u) ? 'Mac' : 'Appareil') + ' · ' + (/Edg\//.test(u) ? 'Edge' : /CriOS|Chrome/.test(u) ? 'Chrome' : /Safari/.test(u) ? 'Safari' : /Firefox/.test(u) ? 'Firefox' : 'navigateur'); };

  let minuteur = null;
  function montrer() {
    let v = document.getElementById('acces-voile');
    if (!v) { v = document.createElement('div'); v.id = 'acces-voile'; document.body.appendChild(v); }
    const attente = A.etat === 'attente', refuse = A.etat === 'refuse';
    v.innerHTML = '<div class="b"><div style="font-size:44px">🔐</div><h1>Happiness est privée</h1>' +
      (attente ? '<p><b>Demande envoyée.</b><br>Dès qu\'elle est acceptée, Happiness s\'ouvre toute seule ici.</p><p class="petit" id="acces-etat">En attente…</p><button type="button" id="acces-verif">🔄 Vérifier maintenant</button>'
        : refuse ? '<p>L\'accès n\'a pas été accordé à cet appareil.</p>'
        : '<p>Pour l\'ouvrir, demande l\'accès. Le propriétaire reçoit ta demande et l\'accepte.</p><input id="acces-nom" maxlength="40" placeholder="Ton prénom" autocomplete="given-name"><button type="button" id="acces-go">Demander l\'accès</button><p class="petit" id="acces-etat"></p>') +
      '</div>';
    const go = document.getElementById('acces-go');
    if (go) go.onclick = () => {
      const nom = document.getElementById('acces-nom').value.trim(), e = document.getElementById('acces-etat');
      if (!nom) { document.getElementById('acces-nom').focus(); return; }
      go.disabled = true; e.textContent = 'Envoi…';
      demander({nom, app: appareil()}).then(o => {
        if (!o || !o.ok) throw new Error(o && o.err || 'erreur');
        A.etat = o.etat === 'ok' ? 'ok' : 'attente'; ecrit(A);
        if (A.etat === 'ok') ouvrir(); else { montrer(); suivre(); }
      }).catch(err => { go.disabled = false; e.textContent = /trop/.test(err.message) ? 'Trop de demandes en attente. Réessaie plus tard.' : 'Pas de connexion. Réessaie dans un instant.'; });
    };
    const vf = document.getElementById('acces-verif');
    if (vf) vf.onclick = verifier;
  }
  function verifier() {
    const e = document.getElementById('acces-etat'); if (e) e.textContent = 'Vérification…';
    return demander({}).then(o => {
      if (!o || !o.ok) throw 0;
      if (o.etat === 'ok') { A.etat = 'ok'; ecrit(A); ouvrir(); }
      else if (o.etat === 'refuse') { A.etat = 'refuse'; ecrit(A); clearInterval(minuteur); montrer(); }
      else if (o.etat === 'inconnu') { A.etat = ''; ecrit(A); clearInterval(minuteur); montrer(); }
      else if (e) e.textContent = 'Toujours en attente…';
    }).catch(() => { if (e) e.textContent = 'Pas de connexion pour l\'instant.'; });
  }
  function suivre() { clearInterval(minuteur); minuteur = setInterval(() => { if (document.visibilityState === 'visible') verifier(); }, 8000); }
  function ouvrir() { clearInterval(minuteur); location.reload(); }

  const pret = () => { montrer(); if (A.etat === 'attente') { suivre(); verifier(); } };
  if (document.body) pret(); else document.addEventListener('DOMContentLoaded', pret);
})();
