// Jardin du Bonheur : les données (mêmes clés que l'ancienne appli, donc rien n'est perdu)
// et leur synchro avec la feuille Google.
//   verger:edit:v1  ajouts, modifications et suppressions des fiches, calendriers, conseils
//   plan:v2 / plan:orn:v2  la liste des arbres et des plantes (le dessin du plan n'est plus utilisé)
//   suivi:v1        taillé, récolté, bilan, année par année
//   ph:<clé>        les photos
//   jdb:coche:<aaaa-mm>  les gestes du calendrier cochés ce mois-là
const J = (() => {
  const lit = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const ecrit = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { plein(); return false; } };
  const plein = () => alert("La mémoire de l'appli est pleine sur cet appareil : enlève quelques photos.");
  const norm = x => String(x || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const auj = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

  // ---- Modifications des listes de base (même format que l'ancienne appli)
  const UK = 'verger:edit:v1';
  const U = () => { const x = lit(UK, null); return x && x.add && x.ed && x.del ? x : {add: {}, ed: {}, del: {}}; };
  // kind : c calendrier verger, p potager, f fiches fruitiers, o fiches ornement, lg légumes, r réflexes,
  // s surveillance, t traitements, pc conseils potager, pl tableau légumes, cc conseils compost, ct problèmes compost
  const CLE = {c: (a, i, m) => m + '.' + i, p: (a, i, m) => m + '.' + i, f: a => a[1], o: a => a[1], lg: a => a[0], r: (a, i) => i, s: a => a[0], t: a => a[0], pc: (a, i) => i, pl: a => a[0], cc: (a, i) => i, ct: a => a[0]};
  const BASE = () => ({f: F, o: O, lg: LG, r: RF, s: SV, t: TR, pc: PGC, pl: PLT, cc: CMC, ct: CTT});
  function liste(kind, m) {
    const u = U(), o = [];
    const base = kind === 'c' ? M[m][3] : kind === 'p' ? PM[m][1] : BASE()[kind];
    base.forEach((a, i) => { const id = kind + ':' + CLE[kind](a, i, m); if (!u.del[id]) o.push({id, a: u.ed[id] || a, u: 0, k: kind}); });
    (u.add[kind] || []).forEach(x => { if (u.del[x.id] || ((kind === 'c' || kind === 'p') && x.m != m)) return; o.push({id: x.id, a: u.ed[x.id] || x.a, u: 1, k: kind, m: x.m}); });
    return o;
  }
  function modifier(id, a) { const u = U(); u.ed[id] = a; ecrit(UK, u); }
  function ajouter(kind, a, m) { const u = U(), id = 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); (u.add[kind] = u.add[kind] || []).push({id, a, m: m == null ? null : m}); ecrit(UK, u); return id; }
  function supprimer(id) {
    const u = U();
    if (id.includes(':')) u.del[id] = 1;
    else { Object.keys(u.add).forEach(k => u.add[k] = u.add[k].filter(x => x.id !== id)); delete u.ed[id]; }
    ecrit(UK, u);
  }
  const retablir = id => { const u = U(); delete u.ed[id]; ecrit(UK, u); };
  const modifie = id => !!U().ed[id];

  // ---- Arbres et plantes (la liste du plan, sans le dessin)
  const PK = {f: 'plan:v2', o: 'plan:orn:v2'};
  const graine = k => k === 'f'
    ? SEED.map((s, i) => ({id: i + 1, n: 0, name: s[2], sz: s[3], st: s[4], x: null, y: null, note: 'Ancien repère : zone ' + s[0] + ', n° ' + s[1], ic: '', isz: ''}))
    : O.map((o, i) => ({id: i + 1, n: 0, name: o[1], sz: '', st: 'c', x: null, y: null, note: '', ic: '', isz: ''}));
  const arbres = k => { const t = lit(PK[k], null); return Array.isArray(t) ? t : graine(k); };
  const garderArbres = (k, T) => ecrit(PK[k], T);
  // Verger : on ne montre que les arbres posés sur le plan (les autres restent gardés, juste cachés)
  const surPlan = k => k === 'f' ? arbres(k).filter(t => t.x != null) : arbres(k);
  function majArbre(k, id, o) { const T = arbres(k), t = T.find(x => x.id === id); if (t) { Object.assign(t, o); garderArbres(k, T); } return t; }
  function nouvelArbre(k, o) { const T = arbres(k), id = Math.max(0, ...T.map(t => +t.id || 0)) + 1; let n = 1; while (T.some(t => t.n == n)) n++; const t = Object.assign({id, n, name: '', sz: '', st: k === 'f' ? 'e' : 'c', x: null, y: null, note: '', ic: '', isz: ''}, o); T.push(t); garderArbres(k, T); return t; }
  function enleverArbre(k, id) { garderArbres(k, arbres(k).filter(t => t.id !== id)); }

  // ---- Fiches
  const fiches = k => liste(k === 'f' ? 'f' : 'o');
  // Fiche d'un arbre : celle choisie, sinon même nom, sinon la seule fiche qui partage le plus de mots avec son nom
  // (« Pomme Melrose » → Melrose ; « Poirier » seul reste sans fiche, car plusieurs poiriers sont possibles).
  const mots = s => norm(s).split(/[^a-z0-9]+/).filter(m => m.length > 2);
  const GENERIQUES = /^(pommm?e|pommier|poire|poirier|cerise|cerisier|prune|prunier|pecher|nashi|kiwi|kaki|figuier|baie|prunus|actinidia|asimina)$/;
  const ecart = (a, b) => { let v = [...Array(b.length + 1).keys()]; for (let i = 1; i <= a.length; i++) { const w = [i]; for (let j = 1; j <= b.length; j++) w[j] = Math.min(v[j] + 1, w[j - 1] + 1, v[j - 1] + (a[i - 1] !== b[j - 1])); v = w; } return v[b.length]; };
  const pareil = (f, m) => f === m || (m.length > 4 && f.length > 4 && (f.startsWith(m) || m.startsWith(f))) || (m.length > 5 && f.length > 5 && ecart(f, m) <= 2);
  const proche = (L, nom) => {
    const T = mots(nom); if (!T.length) return null;
    const freq = {}; L.forEach(x => new Set(mots(x.a[1])).forEach(m => freq[m] = (freq[m] || 0) + 1));
    let best = null, max = 0, egal = false;
    L.forEach(x => {
      const F = mots(x.a[1]), sc = T.reduce((n, m) => n + (F.some(f => pareil(f, m)) ? (freq[m] > 1 || GENERIQUES.test(m) ? 1 : 2) : 0), 0);
      if (sc > max) { max = sc; best = x; egal = false; } else if (sc && sc === max) egal = true;
    });
    return egal ? null : best;
  };
  const ficheDe = (k, t) => { const L = fiches(k); return (t.fid && L.find(x => x.id === t.fid)) || (t.name && (L.find(x => norm(x.a[1]) === norm(t.name)) || proche(L, t.name))) || null; };
  const arbresDe = (k, fid) => surPlan(k).filter(t => { const c = ficheDe(k, t); return c && c.id === fid; });

  // ---- Lire les mois dans les textes des fiches (repris de l'ancienne appli)
  const MRE = /\b(janv(?:ier)?|fev(?:r(?:ier)?)?|mars|avr(?:il)?|mai|juin|juil(?:let)?|aout|sept(?:embre)?|oct(?:obre)?|nov(?:embre)?|dec(?:embre)?)\b/g;
  const mIx = s => ['janv', 'fev', 'mars', 'avr', 'mai', 'juin', 'juil', 'aout', 'sep', 'oct', 'nov', 'dec'].findIndex(m => s.startsWith(m));
  function mois(txt, ns) {
    const s = norm(txt).replace(/[’`]/g, "'").replace(/(jamais|pas) (en |l'|d')?hiver/g, '').replace(/saigne[^)]*/g, ''), o = new Set(), ms = [...s.matchAll(MRE)];
    ms.forEach((m, i) => { const a = mIx(m[1]); o.add(a); const n = ms[i + 1]; if (n && /^\s*(-|–|a|jusqu'?(en|au)?)\s*(debut|mi|fin)?[\s-]*$/.test(s.slice(m.index + m[0].length, n.index))) { const b = mIx(n[1]); for (let k = a; k !== b; k = (k + 1) % 12) o.add(k); } });
    if (!o.size && !ns) {
      const add = a => a.forEach(x => o.add(x));
      if (/automne-hiver/.test(s)) add([9, 10, 11]); else if (/fin d'?hiver/.test(s)) add([1, 2]); else if (/hiver/.test(s)) add([11, 0, 1]);
      if (/automne-hiver/.test(s)) return o;
      if (/fin d'?ete/.test(s)) add([7, 8]); else if (/\bete\b/.test(s)) add([5, 6, 7]);
      if (/printemps/.test(s)) add([2, 3, 4]); if (/automne/.test(s)) add([8, 9, 10]);
    }
    return o;
  }
  const dernier = S => { const a = [...S]; return a.find(m => !S.has((m + 1) % 12)) ?? Math.max(...a); };
  function calendrier(k, t) {
    const x = ficheDe(k, t);
    if (!x) return {fc: null, T: new Set(), R: new Set(), F: new Set(), tt: '', rt: ''};
    const a = x.a, fl = mois(a[2] || ''), tt = String((k === 'f' ? a[6] : a[3]) || ''), rt = k === 'f' ? String(a[3] || '') : '', R = new Set();
    if (rt) { const r0 = rt.split(';')[0]; let q = mois(r0, 1); if (!q.size) q = mois(rt, 1); if (!q.size) q = mois(r0); q.forEach(m => R.add(m)); if (/gelee/.test(norm(r0)) && R.size) for (let m = dernier(R); m <= 9; m++) R.add(m); }
    let T = mois(tt);
    if (!T.size) { const s = norm(tt); if (/apres (la )?floraison/.test(s) && fl.size) T = new Set([(dernier(fl) + 1) % 12]); else if (/apres (la )?recolte/.test(s) && R.size) T = new Set([(dernier(R) + 1) % 12]); }
    return {fc: x, T, R, F: fl, tt, rt};
  }

  // ---- Suivi année par année
  const SVK = 'suivi:v1';
  const suivi = (y, key) => { const d = lit(SVK, {}); return (d[y] && d[y][key]) || {}; };
  function noter(y, key, o) {
    const d = lit(SVK, {}), Y = d[y] = d[y] || {}, r = Y[key] = Object.assign({}, Y[key], o);
    Object.keys(r).forEach(x => { if (r[x] === '' || r[x] == null) delete r[x]; });
    if (!Object.keys(r).length) delete Y[key]; if (!Object.keys(Y).length) delete d[y];
    ecrit(SVK, d);
  }
  const carnet = (k, t) => { const d = lit(SVK, {}); return Object.keys(d).sort((a, b) => b - a).map(y => [y, (d[y] || {})[k + ':' + t.id]]).filter(x => x[1] && Object.keys(x[1]).length); };

  // ---- Gestes du calendrier cochés (par mois)
  const ck = m => 'jdb:coche:' + m;
  const moisCle = (an, mi) => an + '-' + String(mi + 1).padStart(2, '0');
  const coche = (mc, id) => lit(ck(mc), {})[id] || null;
  function cocher(mc, id, oui, qui) { const d = lit(ck(mc), {}); if (oui) d[id] = {le: auj(), par: qui || ''}; else delete d[id]; if (Object.keys(d).length) ecrit(ck(mc), d); else localStorage.removeItem(ck(mc)); }

  // ---- Photos
  const photos = k => { try { const v = localStorage.getItem('ph:' + k); if (!v) return []; return v[0] === '[' ? JSON.parse(v) : [v]; } catch (e) { return []; } };
  const garderPhotos = (k, a) => { try { if (a.length) localStorage.setItem('ph:' + k, JSON.stringify(a)); else localStorage.removeItem('ph:' + k); return true; } catch (e) { plein(); return false; } };
  function ajouterPhoto(k, fichier) {
    return new Promise(ok => {
      const r = new FileReader();
      r.onload = () => { const m = new Image(); m.onload = () => { const q = Math.min(1, 900 / Math.max(m.width, m.height)), c = document.createElement('canvas'); c.width = m.width * q; c.height = m.height * q; c.getContext('2d').drawImage(m, 0, 0, c.width, c.height); const x = photos(k); x.push(c.toDataURL('image/jpeg', .72)); ok(garderPhotos(k, x)); }; m.onerror = () => ok(false); m.src = r.result; };
      r.readAsDataURL(fichier);
    });
  }
  // Clé photo d'une fiche : son nom (fiche de base) ou son identifiant (fiche ajoutée), comme avant
  const clePhoto = x => x.u ? x.id : x.id.split(':').slice(1).join(':');

  // ---- Sauvegarde fichier (compatible avec l'ancienne appli)
  function exporter() {
    const ph = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('ph:')) ph[k.slice(3)] = localStorage.getItem(k); }
    const co = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('jdb:coche:')) co[k] = localStorage.getItem(k); }
    const o = {version: 4, plan: arbres('f'), plan2: arbres('o'), fond: lit('jdb:fond:v1', null), edits: U(), suivi: lit(SVK, {}), photos: ph, coches: co, date: new Date().toISOString()};
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(o)], {type: 'application/json'}));
    a.download = 'jardin-du-bonheur-' + auj() + '.json'; a.click();
  }
  function importer(texte) {
    const o = JSON.parse(texte), pl = Array.isArray(o) ? o : o.plan;
    if (!Array.isArray(pl)) throw new Error('fichier non reconnu');
    garderArbres('f', pl); if (Array.isArray(o.plan2)) garderArbres('o', o.plan2);
    if (o.fond) ecrit('jdb:fond:v1', o.fond); // le dessin du plan (forme du terrain, éléments, stylo)
    if (o.edits && o.edits.add) ecrit(UK, o.edits);
    if (o.suivi) ecrit(SVK, o.suivi);
    if (o.photos) Object.entries(o.photos).forEach(([k, v]) => { try { localStorage.setItem('ph:' + k, v); } catch (e) {} });
    if (o.coches) Object.entries(o.coches).forEach(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} });
  }

  // ---- Onglets lisibles de la feuille Google
  const FORME = {BT: 'Basse-tige', MT: 'Mi-tige', DT: 'Demi-tige', HT: 'Haute-tige', CO: 'Conteneur / colonne'};
  function tables() {
    const plan = (k, ST) => arbres(k).slice().sort((a, b) => (+a.n || 1e9) - (+b.n || 1e9) || a.id - b.id).map(t => {
      const f = ficheDe(k, t);
      return [+t.n ? String(t.n) : '', t.name || 'À identifier', FORME[t.sz] || t.sz || '', (ST[t.st] || [''])[0], f ? f.a[0] : '', f ? f.a[1] : '', t.note || ''];
    });
    const tete = ['N°', 'Arbre / variété', 'Forme', 'Statut', 'Groupe', 'Fiche liée', 'Note'];
    const nom = (k, id) => { const t = arbres(k).find(x => String(x.id) === String(id)); return t ? [+t.n ? String(t.n) : '', t.name || 'À identifier'] : ['', '(retiré)']; };
    const dt = s => s ? String(s).split('-').reverse().join('/') : '';
    const d = lit(SVK, {}), sv = [];
    Object.keys(d).sort().forEach(y => Object.keys(d[y] || {}).forEach(key => {
      const [k, id] = key.split(':'), r = d[y][key] || {};
      if (!Object.keys(r).length) return;
      sv.push([y, k === 'f' ? 'Fruitiers' : 'Ornement', ...nom(k, id), dt(r.t), dt(r.r), r.rec || '', r.vig || '', r.mal || '', r.note || '']);
    }));
    const gestes = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i); if (!k || !k.startsWith('jdb:coche:')) continue;
      const mc = k.slice(10), mi = +mc.slice(5) - 1, c = lit(k, {});
      Object.keys(c).forEach(id => {
        const x = [...liste('c', mi), ...liste('p', mi)].find(y => y.id === id);
        if (x) gestes.push([dt(c[id].le), x.k === 'c' ? 'Verger' : 'Potager', M[mi][0] + ' ' + mc.slice(0, 4), x.a[0] + ' ' + x.a[2], c[id].par || '']);
      });
    }
    gestes.sort((a, b) => b[0].split('/').reverse().join('').localeCompare(a[0].split('/').reverse().join('')));
    return {
      'Verger – mes arbres': [tete, ...plan('f', ST1)],
      'Ornement – mes plantes': [tete, ...plan('o', ST2)],
      'Fiches fruitiers': [['Groupe', 'Nom', 'Floraison', 'Récolte', 'Soins', 'Pollinisation', 'Taille', 'À vérifier'], ...fiches('f').map(x => x.a.slice(0, 8))],
      'Fiches ornement': [['Groupe', 'Nom', 'Floraison', 'Taille', 'Entretien', 'À savoir'], ...fiches('o').map(x => x.a.slice(0, 6))],
      'Fiches légumes': [['Légume', 'Famille', 'Exposition', 'Bons voisins', 'À éviter', 'Astuce'], ...liste('lg').map(x => [x.a[0], x.a[4], x.a[6], x.a[11], x.a[12], x.a[13]])],
      'Suivi des arbres': [['Année', 'Plan', 'N°', 'Arbre', 'Taillé le', 'Récolté le', 'Récolte', 'Vigueur', 'Maladies', 'Note'], ...sv],
      'Jardin – gestes cochés': [['Fait le', 'Où', 'Mois', 'Geste', 'Par'], ...gestes]
    };
  }

  return {lit, ecrit, norm, auj, liste, modifier, ajouter, supprimer, retablir, modifie, arbres, surPlan, majArbre, nouvelArbre, enleverArbre,
    fiches, ficheDe, arbresDe, mois, calendrier, suivi, noter, carnet, moisCle, coche, cocher, photos, garderPhotos, ajouterPhoto, clePhoto,
    exporter, importer, tables, FORME};
})();
