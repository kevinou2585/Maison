// Happiness : sauvegarde complète en un seul fichier .zip (l'appli elle-même + toutes les données),
// et restauration de ce fichier. Les données viennent du Drive (feuille Google) quand l'appareil y est
// relié, complétées par ce qui est sur cet appareil ; la plus récente gagne, élément par élément.
(() => {
  const MODULES = ['jardin', 'courses', 'todo', 'terrain', 'mdp', 'notes'];
  const DEPOT = 'kevinou2585/Maison';
  const enc = new TextEncoder(), dec = new TextDecoder();

  // ---------- Petit zip (sans compression), lisible par Windows, Mac et téléphones ----------
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = u => { let c = 0xFFFFFFFF; for (let i = 0; i < u.length; i++) c = CRC[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  function zip(fichiers) {   // [{nom, data: Uint8Array}]
    const parts = [], centre = []; let pos = 0;
    const d = new Date(), heure = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), jour = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    for (const f of fichiers) {
      const n = enc.encode(f.nom), c = crc32(f.data), h = new DataView(new ArrayBuffer(30));
      [[0, 0x04034b50, 4], [4, 20, 2], [6, 0x0800, 2], [8, 0, 2], [10, heure, 2], [12, jour, 2], [14, c, 4], [18, f.data.length, 4], [22, f.data.length, 4], [26, n.length, 2], [28, 0, 2]]
        .forEach(([o, v, l]) => l === 4 ? h.setUint32(o, v, true) : h.setUint16(o, v, true));
      const ce = new DataView(new ArrayBuffer(46));
      [[0, 0x02014b50, 4], [4, 20, 2], [6, 20, 2], [8, 0x0800, 2], [10, 0, 2], [12, heure, 2], [14, jour, 2], [16, c, 4], [20, f.data.length, 4], [24, f.data.length, 4], [28, n.length, 2], [30, 0, 2], [32, 0, 2], [34, 0, 2], [36, 0, 2], [38, 0, 4], [42, pos, 4]]
        .forEach(([o, v, l]) => l === 4 ? ce.setUint32(o, v, true) : ce.setUint16(o, v, true));
      parts.push(h, n, f.data); centre.push(ce, n); pos += 30 + n.length + f.data.length;
    }
    const tailleC = centre.reduce((s, x) => s + x.byteLength, 0), fin = new DataView(new ArrayBuffer(22));
    [[0, 0x06054b50, 4], [8, fichiers.length, 2], [10, fichiers.length, 2], [12, tailleC, 4], [16, pos, 4]].forEach(([o, v, l]) => l === 4 ? fin.setUint32(o, v, true) : fin.setUint16(o, v, true));
    return new Blob([...parts, ...centre, fin], {type: 'application/zip'});
  }
  function dezip(buf) {      // lit les zips faits ci-dessus (sans compression) : {nom: Uint8Array}
    const v = new DataView(buf), u = new Uint8Array(buf), out = {};
    let e = buf.byteLength - 22; while (e >= 0 && v.getUint32(e, true) !== 0x06054b50) e--;
    if (e < 0) throw new Error("Ce fichier n'est pas une sauvegarde Happiness.");
    let p = v.getUint32(e + 16, true);
    for (let i = 0, n = v.getUint16(e + 10, true); i < n; i++) {
      const meth = v.getUint16(p + 10, true), t = v.getUint32(p + 20, true), ln = v.getUint16(p + 28, true), lx = v.getUint16(p + 30, true), lc = v.getUint16(p + 32, true), off = v.getUint32(p + 42, true);
      const nom = dec.decode(u.subarray(p + 46, p + 46 + ln));
      if (meth === 0) { const d0 = off + 30 + v.getUint16(off + 26, true) + v.getUint16(off + 28, true); out[nom] = u.subarray(d0, d0 + t); }
      p += 46 + ln + lx + lc;
    }
    return out;
  }

  // ---------- Données ----------
  const lsJson = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
  function locaux(m) {       // les éléments de ce module présents sur cet appareil
    if (m !== 'jardin') return Object.values(lsJson('maison:' + m, {}));
    const T = lsJson('maison:jardin:t', {});
    return Object.keys(T).map(k => { const v = localStorage.getItem(k); return v == null ? {id: k, del: 1, t: T[k] || 0} : {id: k, v, t: T[k] || 0}; });
  }
  const fusion = (...ls) => { const o = {}; ls.flat().forEach(r => { if (r && r.id != null && (!o[r.id] || (+r.t || 0) >= (+o[r.id].t || 0))) o[r.id] = r; }); return Object.values(o); };
  const cfg = () => lsJson('maison:drive', {});
  const relie = () => { const c = cfg(); return !!(c.url && c.cle); };
  async function duDrive(m) {
    const c = cfg(), r = await fetch(c.url + (c.url.includes('?') ? '&' : '?') + new URLSearchParams({cle: c.cle, m, r: 0}));
    const o = await r.json(); if (!o.ok) throw new Error(o.err || 'erreur'); return o.recs;
  }
  async function versDrive(m, recs) {
    const c = cfg();
    for (let i = 0; i < recs.length; i += 150) {
      const r = await fetch(c.url, {method: 'POST', headers: {'Content-Type': 'text/plain;charset=utf-8'}, body: JSON.stringify({cle: c.cle, qui: c.qui || '', m, recs: recs.slice(i, i + 150)})});
      const o = await r.json(); if (!o.ok) throw new Error(o.err || 'erreur');
    }
  }
  // Fichiers joints des notes : copie dans l'appareil (IndexedDB « maison-notes »)
  const base = () => new Promise((ok, ko) => { const r = indexedDB.open('maison-notes', 1); r.onupgradeneeded = () => r.result.createObjectStore('f'); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });
  const idb = (mode, f) => base().then(db => new Promise((ok, ko) => { const tx = db.transaction('f', mode), r = f(tx.objectStore('f')); tx.oncomplete = () => ok(r && r.result); tx.onerror = () => ko(tx.error); }));

  // ---------- Sauvegarder ----------
  async function listeAppli() {
    try {
      const r = await fetch(`https://api.github.com/repos/${DEPOT}/git/trees/main?recursive=1`);
      const o = await r.json(); const l = (o.tree || []).filter(x => x.type === 'blob').map(x => x.path);
      if (l.length > 10) return l;
    } catch (e) {}
    // Sans GitHub : la liste des fichiers que l'appli garde pour marcher hors ligne
    const sw = await (await fetch('sw.js')).text();
    const l = [...(sw.match(/FICHIERS = \[([\s\S]*?)\]/) || ['', ''])[1].matchAll(/'\.\/([^']*)'/g)].map(x => x[1] === '' || x[1].endsWith('/') ? x[1] + 'index.html' : x[1]);
    return [...new Set(['sw.js', 'google/Code.gs', 'google/index.html', 'README.md', '.nojekyll', ...l])];
  }

  async function sauvegarder(dire) {
    const F = [], date = new Date().toISOString().slice(0, 10);
    dire('Je rassemble l\'appli…');
    const liste = await listeAppli();
    for (const [i, p] of liste.entries()) {
      try { const r = await fetch(p); if (r.ok) F.push({nom: 'appli/' + p, data: new Uint8Array(await r.arrayBuffer())}); } catch (e) {}
      if (i % 10 === 0) dire(`Je rassemble l'appli… ${i}/${liste.length}`);
    }
    const D = {app: 'Happiness', version: 1, date: new Date().toISOString(), drive: relie(), modules: {}, appareil: {}};
    for (const m of MODULES) {
      dire('Je récupère les données : ' + m + '…');
      let dr = [];
      if (relie() && navigator.onLine) { try { dr = await duDrive(m); } catch (e) { if (/mot de passe/.test(e.message)) throw new Error('Le mot de passe du Drive est refusé. Vérifie-le dans « Sauvegarde sur le Drive ».'); D.drive = false; } }
      D.modules[m] = fusion(dr, locaux(m));
    }
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (!/^maison:sync:/.test(k)) D.appareil[k] = localStorage.getItem(k); }
    // Fichiers joints des notes
    let nf = 0;
    for (const n of D.modules.notes) for (const f of (n.fichiers || [])) {
      dire('Je récupère les fichiers des notes… ' + (++nf));
      let b = null;
      try { if (f.lid) b = await idb('readonly', st => st.get(f.lid)); } catch (e) {}
      try { if (!b && f.id && window.Maison && Maison.lireFichier) b = await Maison.lireFichier(f.id); } catch (e) {}
      if (b) F.push({nom: `donnees/fichiers/${f.lid || f.id}`, data: new Uint8Array(await b.arrayBuffer())});
    }
    F.push({nom: 'donnees/happiness-donnees.json', data: enc.encode(JSON.stringify(D))});
    const n = Object.values(D.modules).reduce((s, l) => s + l.filter(r => !r.del).length, 0);
    F.push({nom: 'LISEZ-MOI.txt', data: enc.encode(LISEZ(date, n, D.drive))});
    dire('Je prépare le fichier…');
    const z = zip(F), a = document.createElement('a');
    a.href = URL.createObjectURL(z); a.download = `happiness-sauvegarde-${date}.zip`; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    return {n, taille: z.size, drive: D.drive};
  }

  const LISEZ = (date, n, drive) => `SAUVEGARDE COMPLÈTE DE HAPPINESS du ${date}
${n} éléments (jardin, courses, to do, terrain, mots de passe, notes)${drive ? ', repris de la feuille Google du Drive' : ' (copie de cet appareil : il n\'était pas relié au Drive)'}.

Garde ce fichier sur ton ordinateur (et une copie sur une clé USB). Il contient tes mots de passe : ne l'envoie à personne.
Les mots de passe des comptes chiffrés restent chiffrés : il faut ton code pour les relire.

DANS CE FICHIER
- appli/      : l'appli elle-même (toutes ses pages), telle qu'elle est en ligne.
- donnees/    : toutes tes données (happiness-donnees.json) et les fichiers joints des notes.

1. REMETTRE TES DONNÉES (le plus courant)
   Ouvre Happiness, en bas de l'accueil : ⚙️ Paramètres › 💾 Sauvegarde complète › Restaurer une sauvegarde,
   et choisis ce fichier .zip (pas besoin de le décompresser).
   Si l'appareil est relié au Drive, tout repart aussi dans la feuille Google. Rien de plus récent n'est écrasé.

2. LA FEUILLE GOOGLE A ÉTÉ EFFACÉE
   Recrée-la comme la première fois avec le script appli/google/Code.gs (ouvre-le avec le Bloc-notes),
   relie l'appli à la nouvelle adresse, puis fais l'étape 1.

3. L'APPLI N'EST PLUS EN LIGNE
   Décompresse ce fichier. Sur github.com, crée un dépôt (par exemple « Maison »), touche « Add file › Upload files »
   et glisse-y tout le contenu du dossier appli/. Puis Settings › Pages › Branch : main › Save.
   Quelques minutes plus tard, l'appli est en ligne à l'adresse https://TON-NOM.github.io/Maison/ ; fais ensuite l'étape 1.
   (Ou donne simplement ce fichier à Claude : il saura tout remettre en ligne.)
`;

  // ---------- Restaurer ----------
  async function restaurer(fichier, dire) {
    const Z = dezip(await fichier.arrayBuffer()), j = Z['donnees/happiness-donnees.json'];
    if (!j) throw new Error("Ce fichier n'est pas une sauvegarde Happiness.");
    const D = JSON.parse(dec.decode(j)); let n = 0;
    // Réglages de l'appareil (si celui-ci n'en a pas encore)
    Object.entries(D.appareil || {}).forEach(([k, v]) => {
      if (/^maison:(sync:|derniere|jardin:t$|courses$|todo$|terrain$|mdp$|notes$)/.test(k)) return;
      if (localStorage.getItem(k) == null) try { localStorage.setItem(k, v); } catch (e) {}
    });
    const pret = relie() && navigator.onLine;
    for (const m of MODULES) {
      let recs = D.modules[m] || [];
      dire('Je remets : ' + m + '…');
      let vide = false;
      if (pret) { try { vide = !(await duDrive(m)).length; } catch (e) { if (/mot de passe/.test(e.message)) throw new Error('Le mot de passe du Drive est refusé. Vérifie-le dans « Sauvegarde sur le Drive ».'); } }
      if (m === 'notes') {   // fichiers joints : remis dans l'appareil ; renvoyés au Drive si la feuille est neuve
        for (const nt of recs) for (const f of (nt.fichiers || [])) {
          const d = Z['donnees/fichiers/' + (f.lid || f.id)]; if (!d) continue;
          f.lid = f.lid || 'f' + Math.random().toString(36).slice(2, 10);
          try { await idb('readwrite', st => st.put(new Blob([d.slice()], {type: f.type || ''}), f.lid)); } catch (e) {}
          if (vide) { f.id = ''; f.url = ''; }
        }
      }
      // Sur cet appareil : la version la plus récente gagne
      if (m === 'jardin') {
        const T = lsJson('maison:jardin:t', {});
        recs.forEach(r => { if ((+r.t || 0) >= (T[r.id] || 0)) { if (r.del) localStorage.removeItem(r.id); else localStorage.setItem(r.id, r.v); T[r.id] = +r.t || 0; } });
        localStorage.setItem('maison:jardin:t', JSON.stringify(T));
      } else {
        const L = lsJson('maison:' + m, {});
        recs.forEach(r => { if (!L[r.id] || (+r.t || 0) >= (+L[r.id].t || 0)) L[r.id] = r; });
        localStorage.setItem('maison:' + m, JSON.stringify(L));
      }
      // Synchro de cette appli remise à zéro ; sans Drive pour l'instant, tout partira à la prochaine synchro
      const sale = {}; if (!pret) recs.forEach(r => { sale[r.id] = 1; });
      localStorage.setItem('maison:sync:' + m, JSON.stringify({r: 0, sale, h: '', init: false}));
      if (pret && recs.length) { dire('J\'envoie au Drive : ' + m + '…'); await versDrive(m, recs); }
      n += recs.filter(r => !r.del).length;
    }
    return {n, drive: pret, date: D.date};
  }

  window.Sauvegarde = {sauvegarder, restaurer, _zip: zip, _dezip: dezip};
})();
