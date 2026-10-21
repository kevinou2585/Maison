// Jardin du Bonheur : verger, potager, ornement, gestion du terrain, projets, pensée permacole.
// Une seule page ; l'adresse (#verger/mois, #potager/legume/Ail…) dit ce qui est affiché.
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const MOIS = M.map(m => m[0]);
const qui = () => Maison.cfg().qui || '';
const fmtJ = s => { const p = String(s || '').split('-'); return p.length === 3 ? +p[2] + ' ' + MOIS[+p[1] - 1].toLowerCase().slice(0, 4) + '.' : ''; };
const fmtT = t => new Date(t).toLocaleDateString('fr-BE', {day: 'numeric', month: 'short', year: 'numeric'});
const ANNEE = new Date().getFullYear();
let AN = ANNEE, MI = new Date().getMonth();
const ACCUEIL = '../';

const PARTIES = {
  verger: {nom: 'Verger', e: '🍎', c: '#c0392b', c3: '#e3683c', sous: 'Tes fruitiers : quoi faire, quand, et leur suivi',
    onglets: [['mois', 'Ce mois-ci'], ['arbres', 'Mes arbres'], ['plan', '🗺️ Plan', 'plan.html?k=f'], ['fiches', 'Fiches'], ['calendrier', 'Calendrier'], ['soins', 'Soins naturels']]},
  potager: {nom: 'Potager', e: '🥕', c: '#d9702a', c3: '#efa53a', sous: 'Semis, plantations, récoltes, sans bêcher',
    onglets: [['mois', 'Ce mois-ci'], ['legumes', 'Légumes'], ['calendrier', 'Calendrier'], ['conseils', 'Conseils'], ['compost', 'Compost']]},
  ornement: {nom: 'Ornement', e: '🌸', c: '#b8457f', c3: '#de7aa8', sous: 'Arbustes, fleurs, grimpantes et graminées',
    onglets: [['mois', 'Ce mois-ci'], ['plantes', 'Mes plantes'], ['plan', '🗺️ Plan', 'plan.html?k=o'], ['fiches', 'Fiches']]},
  terrain: {nom: 'Gestion du terrain', e: '🚜', c: '#5b7a1e', c3: '#8bb33a', sous: "L'entretien à se partager, semaine par semaine", lien: '../terrain/'},
  projets: {nom: 'Projets pour le terrain', e: '🏗️', c: '#2f6fb3', c3: '#4fa0d8', sous: 'Les idées et les chantiers, étape par étape'},
  pensees: {nom: 'Pensée permacole', e: '💬', c: '#6a55b8', c3: '#9a83e0', sous: 'Le carnet ouvert à tous pour échanger nos idées'}
};
const ST = {f: ST1, o: ST2};
// Paramètres : textes renommés, éléments cachés et blocs ajoutés sur n'importe quelle page (partagés via le Drive)
const RG = {
  textes: () => J.lit('jdb:textes:v1', {}), caches: () => J.lit('jdb:caches:v1', {}), blocs: () => J.lit('jdb:blocs:v1', {}),
  texte(cle, defaut) { const t = this.textes()[cle]; return t == null || t === '' ? defaut : t; },
  nommer(cle, v) { const t = this.textes(); if (v) t[cle] = v; else delete t[cle]; J.ecrit('jdb:textes:v1', t); },
  cache: cle => !!RG.caches()[cle],
  cacher(cle, oui) { const c = this.caches(); if (oui) c[cle] = 1; else delete c[cle]; J.ecrit('jdb:caches:v1', c); }
};
const nomP = k => RG.texte('nom:' + k, PARTIES[k].nom), sousP = k => RG.texte('sous:' + k, PARTIES[k].sous);
const edition = () => document.body.classList.contains('edition');
const crayon = (cle, defaut, titreDlg) => `<button type="button" class="crayon" data-texte="${esc(cle)}" data-def="${esc(defaut)}" data-tdlg="${esc(titreDlg)}" aria-label="Modifier">✎</button>`;
const groupeEmoji = g => (GC[g] || ['🌱', '#3f8f4a']);
const nomCourt = g => String(g).split(' (')[0];

// ---------- Synchro
const SYNC_J = Maison.jardin({
  cles: /^(plan:v2|plan:orn:v2|verger:edit:v1|suivi:v1|jdb:fond:v1|jdb:coche:.*|jdb:(textes|caches|blocs):v1|ph:.*)$/,
  plein: () => alert("Mémoire du téléphone pleine : certaines photos du Drive n'ont pas pu être copiées ici."),
  recu: () => { if (!$('dlg').open) rendre(); },
  annule: () => { if ($('dlg').open) $('dlg').close(); rendre(); },
  tables: () => J.tables()
});
const TS = Maison.store('terrain', {recu: () => { if (!$('dlg').open) rendre(); }, tables: recs => ECHANGES.tables(recs)});
Maison.pastille();

// ---------- Petits morceaux d'affichage
const onglets = (p, actif) => `<nav class="onglets">${PARTIES[p].onglets.filter(([k]) => k === actif || !RG.cache('onglet:' + p + '/' + k)).map(([k, l, u]) => `<a href="${u || '#' + p + '/' + k}" ${k === actif ? 'aria-current="page"' : ''}>${esc(RG.texte('onglet:' + p + '/' + k, l))}</a>`).join('')}</nav>`;
const titre = (p, sous) => { const P = PARTIES[p]; return `<div class="titre"><div class="ic" style="background:linear-gradient(150deg,${P.c},${P.c3})">${P.e}</div><div><h1>${esc(nomP(p))}${crayon('nom:' + p, P.nom, 'Nom de la page')}</h1><p>${esc(sous || sousP(p))}${sous ? '' : crayon('sous:' + p, P.sous, 'Sous-titre')}</p></div></div>`; };
const choixMois = () => `<div class="mois"><button data-mois="-1" aria-label="Mois précédent">◀</button><b>${MOIS[MI].toLowerCase()} ${AN}</b><button data-mois="1" aria-label="Mois suivant">▶</button></div>`;
const barre = (n, t) => t ? `<div class="barre"><i style="width:${Math.round(100 * n / t)}%"></i></div>` : '';
const ed = id => `<span class="ed"><button type="button" data-modif="${esc(id)}" aria-label="Modifier">✎</button><button type="button" data-suppr="${esc(id)}" aria-label="Supprimer">🗑</button></span>`;
const plusEd = (kind, txt, m) => `<button type="button" class="btn plein plus-ed" data-ajout="${kind}" ${m != null ? `data-m="${m}"` : ''}>＋ ${esc(txt)}</button>`;
const blocPhotos = k => `<div class="photos" data-ph="${esc(k)}">${J.photos(k).map((d, i) => `<div class="th"><img src="${d}" alt="" data-zoom><button type="button" data-phsup="${i}" aria-label="Enlever la photo">✕</button></div>`).join('')}<label>📷<br>Ajouter<input type="file" accept="image/*" multiple hidden data-phadd></label></div>`;
const vide = t => `<div class="vide">${t}</div>`;
const nomsArbres = c => c === 'all' ? 'Tous les arbres' : String(c).split(' ').map(k => N[k] || k).join(', ');

function svgLegume(x) { const k = x.id.startsWith('lg:') ? x.id.slice(3) : ''; return VI[k] ? `<svg viewBox="0 0 100 100" aria-hidden="true">${VI[k]}</svg>` : `<span style="font-size:34px">${esc(x.a[2] || '🌱')}</span>`; }

// ---------- Les arbres et leur calendrier
function suivis(k) {
  return J.arbres(k).filter(t => t.name || J.ficheDe(k, t)).map(t => ({k, t, key: k + ':' + t.id, s: J.calendrier(k, t)}))
    .sort((a, b) => (+a.t.n || 9999) - (+b.t.n || 9999) || String(a.t.name).localeCompare(String(b.t.name), 'fr'));
}
const etiquette = x => (x.t.n ? 'n° ' + x.t.n + ' · ' : '') + (x.t.name || 'À identifier');
function avatar(k, t) { const f = J.ficheDe(k, t); const [e, c] = f ? groupeEmoji(f.a[0]) : [k === 'f' ? '🌳' : '🌸', '#3f8f4a']; return `<span class="av" style="background:color-mix(in srgb,${c} 18%,transparent)">${e}</span>`; }
function ligneSuivi(x, champ, quand) {
  const v = J.suivi(AN, x.key)[champ];
  return `<li class="${v ? 'ok' : ''}"><button class="rond" data-sv="${x.key}" data-f="${champ}" aria-label="${v ? 'Décocher' : 'Cocher'}">${v ? '✓' : ''}</button>${avatar(x.k, x.t)}<a class="tx" href="#${x.k === 'f' ? 'verger/arbre' : 'ornement/plante'}/${x.t.id}"><b>${esc(etiquette(x))}</b><small class="${v ? 'v' : ''}">${v ? '✓ fait le ' + fmtJ(v) : esc(quand)}</small></a></li>`;
}

// ---------- VERGER / ORNEMENT : ce mois-ci
function vueMoisArbres(k) {
  const L = suivis(k), d = (x, f) => J.suivi(AN, x.key)[f];
  const tT = L.filter(x => x.s.T.has(MI)), tR = k === 'f' ? L.filter(x => x.s.R.has(MI)) : [], fl = k === 'o' ? L.filter(x => x.s.F.has(MI)) : [];
  const mc = J.moisCle(AN, MI), gestes = k === 'f' ? J.liste('c', MI) : [];
  const total = tT.length + tR.length + gestes.length, fait = tT.filter(x => d(x, 't')).length + tR.filter(x => d(x, 'r')).length + gestes.filter(g => J.coche(mc, g.id)).length;
  const cur = AN === ANNEE ? new Date().getMonth() : -1;
  const retard = cur < 0 || MI !== cur ? [] : [...L.filter(x => x.s.T.size && !d(x, 't') && !x.s.T.has(cur) && [...x.s.T].every(m => m < cur)).map(x => [x, 't']),
    ...(k === 'f' ? L.filter(x => x.s.R.size && !d(x, 'r') && !x.s.R.has(cur) && [...x.s.R].every(m => m < cur)).map(x => [x, 'r']) : [])];
  let h = choixMois() + `<h2>En ${MOIS[MI].toLowerCase()}<span>${fait} / ${total} fait${fait > 1 ? 's' : ''}</span></h2>` + barre(fait, total);
  h += `<h2>✂️ À tailler</h2>` + (tT.length ? `<ul class="l">${tT.map(x => ligneSuivi(x, 't', x.s.tt)).join('')}</ul>` : vide('Rien à tailler ce mois-ci.'));
  if (k === 'f') h += `<h2>🧺 À récolter</h2>` + (tR.length ? `<ul class="l">${tR.map(x => ligneSuivi(x, 'r', x.s.rt)).join('')}</ul>` : vide('Rien à récolter ce mois-ci.'));
  if (k === 'o') h += `<h2>🌼 En fleur</h2>` + (fl.length ? `<ul class="l">${fl.map(x => `<li>${avatar(k, x.t)}<a class="tx" href="#ornement/plante/${x.t.id}"><b>${esc(etiquette(x))}</b><small>${esc(x.s.fc.a[2])}</small></a></li>`).join('')}</ul>` : vide('Rien de prévu en fleur ce mois-ci.'));
  if (k === 'f') h += blocGestes('c', MI, gestes, mc);
  if (retard.length) h += `<details class="acc" style="margin-top:16px"><summary>⏰ Période passée, pas encore cochés (${retard.length})</summary><div class="in"><ul class="l">${retard.map(([x, f]) => ligneSuivi(x, f, (f === 't' ? '✂️ taille : ' + x.s.tt : '🧺 récolte : ' + x.s.rt))).join('')}</ul></div></details>`;
  const sans = J.arbres(k).filter(t => t.name && !J.ficheDe(k, t)).length;
  if (sans) h += `<p class="mut">${sans} ${k === 'f' ? 'arbre' : 'plante'}${sans > 1 ? 's' : ''} sans fiche liée (donc sans dates) : ouvre-${sans > 1 ? 'les' : 'le'} dans « ${k === 'f' ? 'Mes arbres' : 'Mes plantes'} » pour choisir sa fiche.</p>`;
  return h;
}
let FILTRE_C = '', FILTRE_P = '';
const sousMois = (kind, mi) => RG.texte('mois:' + kind + ':' + mi, kind === 'c' ? M[mi][1] : PM[mi][0]);
function blocGestes(kind, mi, gestes, mc) {
  const f = kind === 'c' ? FILTRE_C : FILTRE_P;
  const chips = kind === 'c'
    ? [['', 'Tous'], ...Object.entries(N).filter(([c]) => gestes.some(g => g.a[1] !== 'all' && g.a[1].split(' ').includes(c)))]
    : [['', 'Tout'], ['🌱', '🌱 Semis'], ['🪴', '🪴 Plantation'], ['🧺', '🧺 Récolte'], ['🛠️', '🛠️ Entretien']];
  const l = gestes.filter(g => !f || (kind === 'c' ? g.a[1] === 'all' || g.a[1].split(' ').includes(f) : g.a[0] === f));
  const n = l.filter(g => J.coche(mc, g.id)).length;
  return `<h2>📋 Les gestes du mois<span>${n} / ${l.length}</span></h2><p class="mut" style="margin:-4px 0 0">${esc(sousMois(kind, mi))}${crayon('mois:' + kind + ':' + mi, kind === 'c' ? M[mi][1] : PM[mi][0], 'Titre du mois')}</p><div class="puces">${chips.map(([v, t]) => `<button data-filtre="${kind}" data-v="${esc(v)}" aria-pressed="${v === f}">${esc(t)}</button>`).join('')}</div>` +
    (l.length ? `<ul class="l" style="margin-top:10px">${l.map(g => ligneGeste(g, mc)).join('')}</ul>` : vide('Rien pour ce filtre.')) + plusEd(kind, 'Ajouter un geste en ' + MOIS[mi].toLowerCase(), mi);
}
function ligneGeste(g, mc) {
  const c = mc && J.coche(mc, g.id), a = g.a;
  const sujet = g.k === 'c' ? nomsArbres(a[1]) : a[1];
  return `<li class="${c ? 'ok' : ''}">${mc ? `<button class="rond" data-geste="${esc(g.id)}" aria-label="${c ? 'Décocher' : 'Cocher'}">${c ? '✓' : ''}</button>` : ''}<span class="av">${a[0]}</span><div class="tx"><span class="qui">${esc(sujet)}</span><b>${esc(a[2])}</b><small>${esc(a[3])}</small>${c ? `<small class="v">✓ ${c.par ? esc(c.par) + ' · ' : ''}${fmtJ(c.le)}</small>` : ''}</div>${ed(g.id)}</li>`;
}

// ---------- Mes arbres / mes plantes
let Q = '', FST = '';
const basculeBilan = (k, b) => { const base = k === 'f' ? 'verger/arbres' : 'ornement/plantes'; return `<div class="seg" style="margin-bottom:12px"><a class="segl" href="#${base}" aria-pressed="${!b}">${k === 'f' ? '🌳 Mes arbres' : '🌸 Mes plantes'}</a><a class="segl" href="#${base}/bilan" aria-pressed="${b}">📊 Bilan de l'année</a></div>`; };
function vueArbres(k) {
  const T = J.arbres(k).slice().sort((a, b) => (+a.n || 9999) - (+b.n || 9999) || String(a.name).localeCompare(String(b.name), 'fr'));
  const q = J.norm(Q), base = k === 'f' ? 'verger/arbre' : 'ornement/plante';
  const l = T.filter(t => (!FST || t.st === FST) && (!q || J.norm((t.name || '') + ' ' + (t.note || '') + ' ' + (t.n || '')).includes(q)));
  let h = basculeBilan(k, false) + `<div class="chercher"><input id="q" type="search" placeholder="🔎 Chercher ${k === 'f' ? 'un arbre' : 'une plante'}" value="${esc(Q)}" autocomplete="off"></div>`;
  h += `<div class="puces">${[['', 'Tous (' + T.length + ')'], ...Object.entries(ST[k]).map(([s, v]) => [s, v[0] + ' (' + T.filter(t => t.st === s).length + ')'])].map(([v, t]) => `<button data-fst="${v}" aria-pressed="${v === FST}">${esc(t)}</button>`).join('')}</div>`;
  h += `<button class="btn go plein" data-nouvel="${k}">＋ Ajouter ${k === 'f' ? 'un arbre' : 'une plante'}</button><div style="height:10px"></div>`;
  h += l.length ? `<ul class="l">${l.map(t => {
    const f = J.ficheDe(k, t), r = J.suivi(ANNEE, k + ':' + t.id), st = ST[k][t.st];
    const sous = [f ? f.a[1] : 'Pas de fiche liée', J.FORME[t.sz]].filter(Boolean).join(' · ');
    const badges = (r.t ? '✂️' : '') + (r.r ? '🧺' : '');
    return `<li>${avatar(k, t)}<a class="tx" href="#${base}/${t.id}"><b>${esc((t.n ? 'n° ' + t.n + ' · ' : '') + (t.name || 'À identifier'))}</b><small>${esc(sous)}</small></a>${badges ? `<span class="tag">${badges} ${ANNEE}</span>` : ''}${st ? `<span class="tag" style="background:color-mix(in srgb,${st[1]} 16%,transparent);color:${st[1]}">${esc(st[0])}</span>` : ''}<span class="chev">›</span></li>`;
  }).join('')}</ul>` : vide('Aucun résultat.');
  return h;
}
function vueArbre(k, id) {
  const t = J.arbres(k).find(x => x.id === +id);
  if (!t) return vide('Introuvable. <a href="#' + (k === 'f' ? 'verger/arbres' : 'ornement/plantes') + '">Retour à la liste</a>');
  const f = J.ficheDe(k, t), s = J.calendrier(k, t), key = k + ':' + t.id, r = J.suivi(AN, key), part = k === 'f' ? 'verger' : 'ornement';
  const L = J.fiches(k), od = k === 'f' ? GO : OG, gs = [...new Set([...od.filter(g => L.some(x => x.a[0] === g)), ...L.map(x => x.a[0])])];
  const opts = '<option value="">— Pas de fiche —</option>' + gs.map(g => `<optgroup label="${esc(nomCourt(g))}">${L.filter(x => x.a[0] === g).sort((a, b) => a.a[1].localeCompare(b.a[1], 'fr')).map(x => `<option value="${esc(x.id)}" ${f && x.id === f.id ? 'selected' : ''}>${esc(x.a[1])}</option>`).join('')}</optgroup>`).join('');
  const sel = (champ, o) => `<select data-svs="${key}" data-f="${champ}">${['', ...o].map(v => `<option ${v === (r[champ] || '') ? 'selected' : ''} value="${v}">${v || '—'}</option>`).join('')}</select>`;
  let h = `<a class="btn" href="#${part}/${k === 'f' ? 'arbres' : 'plantes'}">← ${k === 'f' ? 'Mes arbres' : 'Mes plantes'}</a>`;
  h += `<div class="titre" style="margin-top:14px">${avatar(k, t).replace('class="av"', 'class="av" style="width:58px;height:58px;font-size:32px"')}<div><h1>${esc(t.name || 'À identifier')}</h1><p>${t.n ? 'n° ' + t.n + ' · ' : ''}${esc(f ? nomCourt(f.a[0]) : 'Pas de fiche liée')}</p></div></div>`;
  h += `<div class="carte"><span class="lab" style="margin-top:0">Suivi</span><div class="ligne" style="justify-content:space-between"><div class="seg" style="flex:1">${[ANNEE - 1, ANNEE].map(y => `<button data-an="${y}" aria-pressed="${y === AN}">${y}</button>`).join('')}</div></div>
    <div class="bascule">${['t', ...(k === 'f' ? ['r'] : [])].map(c => `<button data-sv="${key}" data-f="${c}" aria-pressed="${!!r[c]}">${c === 't' ? '✂️ Taillé' : '🧺 Récolté'}${r[c] ? ' le ' + fmtJ(r[c]) : ''}</button>`).join('')}</div>
    <div class="champs" style="margin-top:10px">${k === 'f' ? `<div><label>Récolte</label>${sel('rec', ['aucune', 'petite', 'moyenne', 'bonne', 'très bonne'])}</div>` : ''}<div><label>Vigueur</label>${sel('vig', ['faible', 'moyenne', 'bonne', 'très bonne'])}</div>
    <div class="large"><label>Maladie, ravageur</label><input data-svs="${key}" data-f="mal" value="${esc(r.mal || '')}" placeholder="ex. tavelure, pucerons"></div><div class="large"><label>Note de l'année</label><input data-svs="${key}" data-f="note" value="${esc(r.note || '')}" placeholder="ex. gel tardif sur les fleurs"></div></div>
    ${s.fc ? `<p class="mut" style="margin-top:10px">✂️ ${esc(s.tt || '—')}${k === 'f' ? '<br>🧺 ' + esc(s.rt || '—') : ''}</p>` : ''}</div>`;
  const ca = J.carnet(k, t);
  if (ca.length) h += `<div class="carte"><span class="lab" style="margin-top:0">📒 Carnet</span>${ca.map(([y, x]) => `<p><b>${y}</b> : ${esc([x.t && '✂️ taillé le ' + fmtJ(x.t), x.r && '🧺 récolté le ' + fmtJ(x.r), x.rec && 'récolte ' + x.rec, x.vig && 'vigueur ' + x.vig, x.mal && 'problème : ' + x.mal, x.note].filter(Boolean).join(' · '))}</p>`).join('')}</div>`;
  h += `<div class="carte"><span class="lab" style="margin-top:0">Fiche d'identité</span><div class="champs" style="margin-top:8px">
    <div class="large"><label>Nom, variété</label><input data-arbre="name" value="${esc(t.name || '')}"></div>
    <div><label>Numéro</label><input data-arbre="n" type="number" inputmode="numeric" value="${t.n || ''}"></div>
    <div><label>Statut</label><select data-arbre="st">${Object.entries(ST[k]).map(([s2, v]) => `<option value="${s2}" ${s2 === t.st ? 'selected' : ''}>${esc(v[0])}</option>`).join('')}</select></div>
    ${k === 'f' ? `<div class="large"><label>Forme</label><select data-arbre="sz">${['', 'CO', 'BT', 'MT', 'DT', 'HT'].map(v => `<option value="${v}" ${v === (t.sz || '') ? 'selected' : ''}>${v ? J.FORME[v] : '—'}</option>`).join('')}</select></div>` : ''}
    <div class="large"><label>Fiche liée (donne les dates de taille et de récolte)</label><select data-arbre="fid">${opts}</select></div>
    <div class="large"><label>Note (année de plantation, porte-greffe…)</label><input data-arbre="note" value="${esc(t.note || '')}"></div></div>
    ${f ? `<a class="btn plein" href="#${part}/fiche/${encodeURIComponent(f.id)}">📖 Ouvrir la fiche ${esc(f.a[1])}</a>` : ''}</div>`;
  h += `<a class="btn plein" href="plan.html?k=${k}&id=${t.id}">🗺️ ${t.x != null ? 'Voir sur le plan' : 'Placer sur le plan'}</a><div style="height:12px"></div>`;
  h += `<div class="carte"><span class="lab" style="margin-top:0">📷 Photos</span>${blocPhotos('arbre-' + k + '-' + t.id)}</div>`;
  h += `<button class="btn danger plein" data-enlever="${k}:${t.id}">🗑 Enlever ${k === 'f' ? 'cet arbre' : 'cette plante'} de la liste</button>`;
  return h;
}

// ---------- Bilan de l'année, arbre par arbre (comme le tableau de l'ancienne appli)
function vueBilan(k) {
  const fr = k === 'f', q = J.norm(Q), L = suivis(k), r = x => J.suivi(AN, x.key);
  const tT = L.filter(x => x.s.T.size), tR = L.filter(x => x.s.R.size), nB = L.filter(x => { const v = r(x); return v.rec || v.vig || v.mal || v.note; }).length;
  const sel = (x, champ, o) => `<select data-svs="${x.key}" data-f="${champ}" aria-label="${champ === 'rec' ? 'Récolte' : 'Vigueur'}">${['', ...o].map(v => `<option ${v === (r(x)[champ] || '') ? 'selected' : ''} value="${v}">${v || '—'}</option>`).join('')}</select>`;
  const coche = (x, c) => { const v = r(x)[c]; return `<td class="c"><button class="rond${v ? ' fait' : ''}" data-sv="${x.key}" data-f="${c}" aria-label="${c === 't' ? 'Taillé' : 'Récolté'}">${v ? '✓' : ''}</button>${v ? `<small>${fmtJ(v)}</small>` : ''}</td>`; };
  const l = L.filter(x => !q || J.norm(etiquette(x)).includes(q));
  let h = basculeBilan(k, true) + `<div class="seg">${[ANNEE - 2, ANNEE - 1, ANNEE].map(y => `<button data-an="${y}" aria-pressed="${y === AN}">${y}</button>`).join('')}</div>
  <div class="stats"><div><b>${L.length}</b><small>${fr ? 'arbres suivis' : 'plantes suivies'}</small></div><div><b>${tT.filter(x => r(x).t).length}/${tT.length}</b><small>✂️ taillé${fr ? '' : 'e'}s</small></div>${fr ? `<div><b>${tR.filter(x => r(x).r).length}/${tR.length}</b><small>🧺 récoltés</small></div>` : ''}<div><b>${nB}</b><small>📒 bilans notés</small></div></div>
  <div class="chercher"><input id="q" type="search" placeholder="🔎 Chercher ${fr ? 'un arbre' : 'une plante'}" value="${esc(Q)}" autocomplete="off"></div>`;
  h += l.length ? `<div class="tableau-bilan"><table><thead><tr><th>${fr ? 'Arbre' : 'Plante'}</th><th>✂️ Taillé</th>${fr ? '<th>🧺 Récolté</th><th>Récolte</th>' : ''}<th>Vigueur</th><th>Maladie, ravageur</th><th>Note</th></tr></thead><tbody>${l.map(x => { const v = r(x); return `<tr>
    <th><a href="#${fr ? 'verger/arbre' : 'ornement/plante'}/${x.t.id}">${esc(etiquette(x))}</a></th>${coche(x, 't')}${fr ? coche(x, 'r') + `<td>${sel(x, 'rec', ['aucune', 'petite', 'moyenne', 'bonne', 'très bonne'])}</td>` : ''}<td>${sel(x, 'vig', ['faible', 'moyenne', 'bonne', 'très bonne'])}</td>
    <td><input data-svs="${x.key}" data-f="mal" value="${esc(v.mal || '')}" placeholder="${fr ? 'ex. tavelure' : 'ex. oïdium'}"></td><td><input data-svs="${x.key}" data-f="note" value="${esc(v.note || '')}" placeholder="${fr ? 'ex. gel tardif' : 'ex. belle floraison'}"></td></tr>`; }).join('')}</tbody></table></div>
  <p class="mut">Glisse le tableau vers la gauche pour voir toutes les colonnes. Ce que tu notes ici s'ajoute au carnet de ${fr ? "l'arbre" : 'la plante'}.</p>` : vide('Aucun résultat.');
  return h;
}

// ---------- Fiches
function vueFiches(k, g) {
  const L = J.fiches(k), od = k === 'f' ? GO : OG, part = k === 'f' ? 'verger' : 'ornement';
  const gs = [...new Set([...od.filter(x => L.some(y => y.a[0] === x)), ...L.map(y => y.a[0])])];
  const q = J.norm(Q);
  if (q) {
    const l = L.filter(x => J.norm(x.a.join(' ')).includes(q));
    return chercheFiches(k) + (l.length ? `<ul class="l">${l.map(x => ligneFiche(k, x)).join('')}</ul>` : vide('Aucune fiche trouvée.'));
  }
  if (!g) return chercheFiches(k) + `<div class="grille">${gs.map(x => { const [e, c] = groupeEmoji(x), n = L.filter(y => y.a[0] === x).length; return `<a class="gt" style="--g:${c}" href="#${part}/fiches/${encodeURIComponent(x)}"><span class="e">${e}</span><b>${esc(nomCourt(x))}</b><small>${n} fiche${n > 1 ? 's' : ''}</small></a>`; }).join('')}</div>` + `<button class="btn plein" data-ajout="${k}">＋ Ajouter une fiche</button>`;
  const [e] = groupeEmoji(g), t = g.split(' (');
  return `<a class="btn" href="#${part}/fiches">← Toutes les catégories</a><h2 style="margin-top:16px">${e} ${esc(t[0])}</h2>${t[1] ? `<p class="mut">${esc(t[1].replace(')', ''))}</p>` : ''}<ul class="l">${L.filter(x => x.a[0] === g).map(x => ligneFiche(k, x)).join('')}</ul><button class="btn plein" data-ajout="${k}" data-g="${esc(g)}">＋ Ajouter une fiche ici</button>`;
}
const chercheFiches = k => `<div class="chercher"><input id="q" type="search" placeholder="🔎 Chercher une fiche" value="${esc(Q)}" autocomplete="off"></div>`;
function ligneFiche(k, x) {
  const [e, c] = groupeEmoji(x.a[0]), n = J.arbresDe(k, x.id).length, ph = J.photos(J.clePhoto(x));
  return `<li>${ph.length ? `<img src="${ph[0]}" alt="" style="width:42px;height:42px;border-radius:13px;object-fit:cover;flex:none">` : `<span class="av" style="background:color-mix(in srgb,${c} 18%,transparent)">${e}</span>`}<a class="tx" href="#${k === 'f' ? 'verger' : 'ornement'}/fiche/${encodeURIComponent(x.id)}"><b>${esc(x.a[1])}</b><small>🌼 ${esc(x.a[2])}</small></a>${n ? `<span class="tag">${n} chez toi</span>` : ''}<span class="chev">›</span></li>`;
}
function vueFiche(k, id) {
  const x = J.fiches(k).find(y => y.id === id), part = k === 'f' ? 'verger' : 'ornement';
  if (!x) return vide('Fiche introuvable.');
  const a = x.a, [e, c] = groupeEmoji(a[0]), labs = k === 'f' ? ['Floraison', 'Récolte', 'Soins', 'Pollinisation', 'Taille'] : ['Floraison', 'Taille', 'Entretien', 'À savoir'];
  let h = `<a class="btn" href="#${part}/fiches/${encodeURIComponent(a[0])}">← ${esc(nomCourt(a[0]))}</a>`;
  h += `<div class="titre" style="margin-top:14px"><div class="ic" style="background:color-mix(in srgb,${c} 22%,var(--surface))">${e}</div><div><h1>${esc(a[1])}</h1><p>${esc(nomCourt(a[0]))}</p></div></div>`;
  h += `<div class="carte">${labs.map((l, j) => `<span class="lab">${l}</span><p>${esc(a[j + 2])}</p>`).join('')}${a[7] && k === 'f' ? `<span class="lab">À vérifier</span><p class="chk">${esc(a[7])}</p>` : ''}
    <div class="ligne" style="margin-top:12px"><button class="btn" data-modif="${esc(x.id)}">✎ Modifier la fiche</button>${J.modifie(x.id) && !x.u ? `<button class="btn" data-retablir="${esc(x.id)}">↺ Texte d'origine</button>` : ''}<button class="btn danger" data-suppr="${esc(x.id)}">🗑 Supprimer</button></div></div>`;
  const T = J.arbresDe(k, x.id);
  h += `<div class="carte"><span class="lab" style="margin-top:0">${k === 'f' ? '🌳 Chez toi' : '🌸 Chez toi'}</span>${T.length ? `<ul class="l" style="margin-top:8px">${T.map(t => { const r = J.suivi(ANNEE, k + ':' + t.id); return `<li><a class="tx" href="#${k === 'f' ? 'verger/arbre' : 'ornement/plante'}/${t.id}"><b>${esc((t.n ? 'n° ' + t.n + ' · ' : '') + (t.name || '?'))}</b><small>${esc([r.t && '✂️ taillé le ' + fmtJ(r.t), r.r && '🧺 récolté le ' + fmtJ(r.r), r.mal].filter(Boolean).join(' · ') || 'Rien noté en ' + ANNEE)}</small></a><span class="chev">›</span></li>`; }).join('')}</ul>` : `<p class="mut">Aucun ${k === 'f' ? 'arbre' : 'plante'} de ta liste n'est lié à cette fiche.</p>`}</div>`;
  h += `<div class="carte"><span class="lab" style="margin-top:0">📷 Photos</span>${blocPhotos(J.clePhoto(x))}</div>`;
  return h;
}

// ---------- Verger : calendrier et soins
function vueCalendrier(kind) {
  const cur = new Date().getMonth();
  return MOIS.map((m, mi) => {
    const l = J.liste(kind, mi), mc = J.moisCle(ANNEE, mi), n = l.filter(g => J.coche(mc, g.id)).length;
    return `<details class="acc" ${mi === cur ? 'open' : ''}><summary><span>${m}${mi === cur ? ' · ce mois-ci' : ''}<br><small class="mut" style="font-weight:500">${esc(sousMois(kind, mi))}</small></span><span class="tag">${n ? n + ' / ' : ''}${l.length}</span></summary><div class="in"><ul class="l">${l.map(g => ligneGeste(g, mc)).join('')}</ul>${plusEd(kind, 'Ajouter un geste en ' + m.toLowerCase(), mi)}</div></details>`;
  }).join('') + `<p class="mut">Coche les gestes faits dans « Ce mois-ci ». Pour ajouter ou modifier un geste, active ✏️ Modifier en bas de l'accueil du jardin.</p>`;
}
function vueSoins() {
  const tr = J.liste('t'), sv = J.liste('s'), rf = J.liste('r');
  return `<details class="acc" open><summary>🧪 Traitements naturels</summary><div class="in"><p class="mut">Pulvérise le soir, jamais en pleine floraison ni en plein soleil, et teste d'abord sur une branche.</p>${tr.map(x => `<div class="geste"><span class="e">🧪</span><div class="tx"><b>${esc(x.a[0])}</b><small class="qui">Contre : ${esc(x.a[1])}</small><small>${esc(x.a[2])}</small></div>${ed(x.id)}</div>`).join('')}${plusEd('t', 'Ajouter un traitement')}</div></details>
  <details class="acc"><summary>🔎 Ce qu'il faut surveiller, arbre par arbre</summary><div class="in">${sv.map(x => `<div class="geste"><span class="e">🔎</span><div class="tx"><b>${esc(x.a[0])}</b><small class="r">${esc(x.a[1])}</small><small>🌿 ${esc(x.a[2])}</small></div>${ed(x.id)}</div>`).join('')}${plusEd('s', 'Ajouter une ligne')}</div></details>
  <details class="acc"><summary>💡 Les réflexes qui font 80 % du travail</summary><div class="in">${rf.map(x => `<div class="geste"><span class="e">💡</span><div class="tx"><b>${esc(x.a[0])}</b><small>${esc(x.a[1])}</small></div>${ed(x.id)}</div>`).join('')}${plusEd('r', 'Ajouter un réflexe')}</div></details>
  <p class="mut">Un doute sur un symptôme ? Prends une photo de la feuille ou du fruit dans la fiche de l'arbre.</p>`;
}

// ---------- Potager
const calLeg = x => String(x.a[8] || '').split(',');
function vueMoisPotager() {
  const mc = J.moisCle(AN, MI), g = J.liste('p', MI), L = J.liste('lg');
  const quoi = ch => L.filter(x => (calLeg(x)[MI] || '').includes(ch));
  const puce = x => `<a class="btn" style="padding:6px 10px" href="#potager/legume/${encodeURIComponent(x.a[0])}">${esc(x.a[2] || '🌱')} ${esc(x.a[0])}</a>`;
  let h = choixMois();
  [['S', '🌱 À semer'], ['P', '🪴 À planter'], ['R', '🧺 À récolter']].forEach(([c, t]) => { const l = quoi(c); if (l.length) h += `<h2>${t}</h2><div class="ligne">${l.map(puce).join('')}</div>`; });
  return h + blocGestes('p', MI, g, mc);
}
function vueLegumes() {
  const q = J.norm(Q), L = J.liste('lg').filter(x => !q || J.norm(x.a[0] + ' ' + x.a[4]).includes(q));
  return `<div class="chercher"><input id="q" type="search" placeholder="🔎 Chercher un légume" value="${esc(Q)}" autocomplete="off"></div><div class="grille">${L.map(x => `<a class="gt" style="--g:${x.a[1] || '#3f8f4a'}" href="#potager/legume/${encodeURIComponent(x.a[0])}">${svgLegume(x)}<b>${esc(x.a[0])}</b><small>${esc(x.a[3])}</small></a>`).join('') || vide('Aucun légume trouvé.')}</div><button class="btn plein" data-ajout="lg">＋ Ajouter un légume</button>`;
}
function vueLegume(nom) {
  const x = J.liste('lg').find(y => y.a[0] === nom);
  if (!x) return vide('Légume introuvable.');
  const a = x.a, cal = calLeg(x), st = String(a[9] || '').split('\n').filter(Boolean), lab = ['🌱 Semer', '🪴 Planter', '💦 Soigner', '🧺 Récolter et conserver'];
  const ml = String(a[10] || '').split('\n').filter(Boolean).map(l => { const i = l.indexOf('|'); return i < 0 ? [l, ''] : [l.slice(0, i).trim(), l.slice(i + 1).trim()]; });
  const etoiles = n => '★'.repeat(+n || 1) + '☆'.repeat(3 - (+n || 1)), cur = new Date().getMonth();
  return `<a class="btn" href="#potager/legumes">← Tous les légumes</a>
  <div class="titre" style="margin-top:14px"><div class="bigic">${svgLegume(x)}</div><div><h1>${esc(a[0])}</h1><p>${esc(a[3])}</p></div></div>
  <div class="ligne"><span class="tag">🌿 ${esc(a[4])}</span><span class="tag">Difficulté ${etoiles(a[5])}</span><span class="tag">${esc(a[6])}</span><span class="tag">Eau ${'💧'.repeat(+a[7] || 1)}</span></div>
  <h2>📅 Quand ?</h2><div class="calmois">${MOIS.map((m, i) => `<div class="${i === cur ? 'cur' : ''}">${m[0]}${[...(cal[i] || '')].map(c => `<i class="d ${c}"></i>`).join('')}</div>`).join('')}</div>
  <div class="legende"><span><i class="d S"></i>Semis</span><span><i class="d P"></i>Plantation</span><span><i class="d R"></i>Récolte</span></div>
  <h2>🌱 De la graine à l'assiette</h2><div class="carte"><ol class="etapes">${st.map((t, i) => `<li><span class="n">${i + 1}</span><div><b>${lab[i] || 'Étape ' + (i + 1)}</b><br>${esc(t)}</div></li>`).join('')}</ol></div>
  <h2>👫 Les voisins</h2><div class="voisins"><div class="ok"><b>🤝 Bons voisins</b><br>${esc(a[11])}</div><div class="ko"><b>🚫 À éviter</b><br>${esc(a[12])}</div></div>
  <h2>🩺 Maladies et remèdes naturels</h2>${ml.map(([p, r]) => `<div class="mal"><b>${esc(p)}</b>🌿 ${esc(r)}</div>`).join('') || vide('Rien de noté.')}
  ${a[13] ? `<div class="astuce">💡 <b>Astuce sans bêcher :</b> ${esc(a[13])}</div>` : ''}
  <h2>📷 Mes photos</h2>${blocPhotos('lg-' + a[0])}
  <div class="ligne" style="margin-top:14px"><button class="btn" data-modif="${esc(x.id)}">✎ Modifier la fiche</button>${J.modifie(x.id) && !x.u ? `<button class="btn" data-retablir="${esc(x.id)}">↺ Texte d'origine</button>` : ''}<button class="btn danger" data-suppr="${esc(x.id)}">🗑 Supprimer</button></div>`;
}
function vueConseils() {
  return `<h2>💡 Les principes</h2>${J.liste('pc').map(x => `<div class="carte"><div class="ligne" style="justify-content:space-between;flex-wrap:nowrap"><b>${esc(x.a[0])}</b>${ed(x.id)}</div><p class="mut">${esc(x.a[1])}</p></div>`).join('')}${plusEd('pc', 'Ajouter un conseil')}
  <h2>🥬 Les légumes en un coup d'œil</h2>${J.liste('pl').map(x => `<details class="acc"><summary>${esc(x.a[0])}</summary><div class="in"><p><b>Semis :</b> ${esc(x.a[1])}</p><p><b>Plantation :</b> ${esc(x.a[2])}</p><p><b>Récolte :</b> ${esc(x.a[3])}</p><p class="mut">💡 ${esc(x.a[4])}</p><div class="ligne">${ed(x.id)}</div></div></details>`).join('')}${plusEd('pl', 'Ajouter un légume au tableau')}`;
}
function vueCompost() {
  return `<p class="mut">Tout pour réussir ton compost : la méthode, les bons équilibres et le dépannage.</p>${J.liste('cc').map(x => `<details class="acc"><summary>${esc(x.a[0])}</summary><div class="in"><p>${esc(x.a[1])}</p><div class="ligne">${ed(x.id)}</div></div></details>`).join('')}${plusEd('cc', 'Ajouter un conseil')}
  <h2>🆘 Mon compost a un problème</h2>${J.liste('ct').map(x => `<div class="carte"><div class="ligne" style="justify-content:space-between;flex-wrap:nowrap"><b>${esc(x.a[0])}</b>${ed(x.id)}</div><p class="mut">Cause : ${esc(x.a[1])}</p><p>✅ ${esc(x.a[2])}</p></div>`).join('')}${plusEd('ct', 'Ajouter un problème')}`;
}

// ---------- Projets
const STAT = ECHANGES.STATUTS;
function vueProjets() {
  const P = TS.tous('projet');
  let h = `<button class="btn go plein" data-nouveau="projet">＋ Nouveau projet</button>`;
  Object.keys(STAT).forEach(s => {
    const l = P.filter(p => (p.statut || 'idee') === s).sort((a, b) => (a.quand || '9').localeCompare(b.quand || '9') || b.cree - a.cree);
    if (!l.length && s === 'fait') return;
    h += `<h2>${STAT[s]}<span>${l.length || ''}</span></h2>` + (l.length ? `<ul class="l">${l.map(p => { const e = p.etapes || [], n = e.filter(x => x.fait).length; return `<li><span class="av">${{Verger: '🍎', Potager: '🥕', Ornement: '🌸', Terrain: '🚜', Maison: '🏡'}[p.zone] || '🏗️'}</span><a class="tx" href="#projet/${p.id}"><b>${esc(p.titre)}</b><small>${esc([p.zone, p.quand && 'pour le ' + fmtJ(p.quand), e.length && n + ' / ' + e.length + ' étapes'].filter(Boolean).join(' · '))}</small>${e.length ? barre(n, e.length) : ''}</a><span class="chev">›</span></li>`; }).join('')}</ul>` : vide(s === 'idee' ? 'Note ici les idées, même vagues.' : 'Rien pour l\'instant.'));
  });
  return h;
}
function vueProjet(id) {
  const p = TS.get(id);
  if (!p) return vide('Projet introuvable.');
  const e = p.etapes || [], n = e.filter(x => x.fait).length;
  return `<a class="btn" href="#projets">← Tous les projets</a>
  <div class="carte" style="margin-top:14px"><label class="lab" style="margin-top:0">Projet</label><input data-projet="titre" value="${esc(p.titre)}" style="font-size:19px;font-weight:700">
  <span class="lab">Statut</span><div class="seg">${Object.entries(STAT).map(([k, v]) => `<button data-statut="${k}" aria-pressed="${(p.statut || 'idee') === k}">${v}</button>`).join('')}</div>
  <div class="champs" style="margin-top:10px"><div><label>Où</label><select data-projet="zone">${['', ...ECHANGES.ZONES].map(z => `<option ${z === (p.zone || '') ? 'selected' : ''} value="${z}">${z || '—'}</option>`).join('')}</select></div><div><label>Pour quand</label><input type="date" data-projet="quand" value="${esc(p.quand || '')}"></div>
  <div class="large"><label>Détails, matériel, budget…</label><textarea data-projet="note" rows="3">${esc(p.note || '')}</textarea></div></div>
  <p class="mut">Proposé par ${esc(p.par || '?')} le ${fmtT(p.cree)}</p></div>
  <h2>✅ Étapes<span>${e.length ? n + ' / ' + e.length : ''}</span></h2>${e.length ? barre(n, e.length) : ''}
  <ul class="l" style="margin-top:8px">${e.map((x, i) => `<li class="${x.fait ? 'ok' : ''}"><button class="rond" data-etape="${i}" aria-label="${x.fait ? 'Décocher' : 'Cocher'}">${x.fait ? '✓' : ''}</button><div class="tx"><b>${esc(x.t)}</b>${x.fait ? `<small class="v">✓ ${esc(x.par || '')} ${x.le ? fmtJ(x.le) : ''}</small>` : ''}</div><span class="ed" style="display:flex"><button data-etsup="${i}" aria-label="Enlever l'étape">✕</button></span></li>`).join('')}
  <li><form id="f-etape" class="ligne" style="flex:1;flex-wrap:nowrap"><input id="i-etape" placeholder="＋ Ajouter une étape" autocomplete="off" enterkeyhint="done"><button class="btn go" aria-label="Ajouter">＋</button></form></li></ul>
  <button class="btn go plein" data-projsauve="${p.id}" style="margin-top:16px">💾 Sauver</button>
  <p class="mut" style="text-align:center;margin:6px 0 14px">Tout est aussi enregistré au fur et à mesure.</p>
  <button class="btn danger plein" data-projsup="${p.id}">🗑 Supprimer ce projet</button>`;
}

// ---------- Pensée permacole
function vuePensees() {
  const P = TS.tous('pensee').sort((a, b) => (b.maj || b.cree) - (a.maj || a.cree)), R = TS.tous('reponse');
  let h = `<button class="btn go plein" data-nouveau="pensee">＋ Partager une pensée</button><div style="height:12px"></div>`;
  h += P.length ? P.map(p => { const n = R.filter(r => r.parent === p.id).length; return `<a class="message" href="#pensee/${p.id}" style="display:block;text-decoration:none"><div class="de"><b>${esc(p.par || '?')}</b> · ${fmtT(p.cree)}</div><h3>${esc(p.titre || 'Sans titre')}</h3><p>${esc(String(p.texte || '').slice(0, 220))}${String(p.texte || '').length > 220 ? '…' : ''}</p><div class="mut">💬 ${n ? n + ' réponse' + (n > 1 ? 's' : '') : 'Répondre'}</div></a>`; }).join('') : vide('Rien encore. Après une discussion au jardin, note ici les idées qui en sont sorties.');
  return h;
}
function vuePensee(id) {
  const p = TS.get(id);
  if (!p) return vide('Pensée introuvable.');
  const R = TS.tous('reponse').filter(r => r.parent === id).sort((a, b) => a.cree - b.cree), moi = qui();
  return `<a class="btn" href="#pensees">← Toutes les pensées</a>
  <div class="message" style="margin-top:14px"><div class="de"><b>${esc(p.par || '?')}</b> · ${fmtT(p.cree)}</div><h3>${esc(p.titre || 'Sans titre')}</h3><p>${esc(p.texte || '')}</p>
  ${R.map(r => `<div class="reponse"><div class="de"><b>${esc(r.par || '?')}</b> · ${fmtT(r.cree)}${r.par === moi || !r.par ? ` · <button class="btn" style="padding:2px 8px;font-size:12px" data-repsup="${r.id}">effacer</button>` : ''}</div><p>${esc(r.texte)}</p></div>`).join('')}</div>
  <form id="f-rep" class="carte"><label class="lab" style="margin-top:0" for="i-rep">Ta réponse</label><textarea id="i-rep" rows="3" placeholder="Ton idée, ton avis, une question…"></textarea><div class="ligne" style="margin-top:8px"><button class="btn go">Envoyer</button></div></form>
  <div class="ligne"><button class="btn" data-pensmod="${p.id}">✎ Modifier</button><button class="btn danger" data-penssup="${p.id}">🗑 Supprimer</button></div>`;
}

// ---------- Accueil du jardin
function vueAccueil() {
  const mc = J.moisCle(ANNEE, new Date().getMonth()), m = new Date().getMonth();
  const reste = (k) => { const L = suivis(k), d = (x, f) => J.suivi(ANNEE, x.key)[f]; return L.filter(x => x.s.T.has(m) && !d(x, 't')).length + (k === 'f' ? L.filter(x => x.s.R.has(m) && !d(x, 'r')).length : 0); };
  const gv = J.liste('c', m).filter(g => !J.coche(mc, g.id)).length, gp = J.liste('p', m).filter(g => !J.coche(mc, g.id)).length;
  const bulles = {verger: reste('f') + gv, potager: gp, ornement: reste('o'), projets: TS.tous('projet').filter(p => p.statut === 'encours').length, pensees: TS.tous('pensee').length};
  const sous = {verger: (reste('f') + gv) + ' chose(s) à faire en ' + MOIS[m].toLowerCase(), potager: gp + ' geste(s) en ' + MOIS[m].toLowerCase(), ornement: reste('o') + ' à tailler ce mois-ci'};
  let h = `<div class="titre"><div class="ic" style="background:linear-gradient(150deg,#3f8f4a,#9ccc65)">🌳</div><div><h1>${esc(RG.texte('nom:jardin', 'Jardin du Bonheur'))}${crayon('nom:jardin', 'Jardin du Bonheur', 'Nom du jardin')}</h1><p>${esc(RG.texte('sous:jardin', 'Verger, potager, ornement et terrain, en permaculture'))}${crayon('sous:jardin', 'Verger, potager, ornement et terrain, en permaculture', 'Sous-titre')}</p></div></div><div class="hub">`;
  Object.entries(PARTIES).filter(([k]) => !RG.cache('tuile:' + k)).forEach(([k, P]) => {
    h += `<a class="tuile" href="${P.lien || '#' + k + (P.onglets ? '/' + P.onglets[0][0] : '')}" style="--c:${P.c};--c3:${P.c3}">${bulles[k] ? `<span class="bulle">${bulles[k]}</span>` : ''}<span class="e">${P.e}</span><b>${esc(nomP(k))}</b><small>${esc(sous[k] || sousP(k))}</small></a>`;
  });
  h += `</div>`;
  return h;
}

// ---------- Blocs ajoutés par l'utilisateur, sur n'importe quelle page
// Une page = sa partie et son onglet (les pages d'un arbre ou d'une fiche partagent le bloc « fiche »).
const pageCle = (p, v, arg) => !p ? 'accueil' : ['projet', 'pensee'].includes(p) ? p : (p + '/' + (v || 'mois') + (v === 'arbres' || v === 'plantes' ? (arg === 'bilan' ? '/bilan' : '') : ''));
function blocsDe(cle) {
  const B = (RG.blocs()[cle] || []);
  return B.map(b => `<div class="carte bloc"><div class="ligne" style="justify-content:space-between;flex-wrap:nowrap"><b>${esc(b.titre)}</b><span class="ed"><button type="button" data-bloc="${esc(cle)}" data-bid="${b.id}" aria-label="Modifier">✎</button><button type="button" data-blocsup="${esc(cle)}" data-bid="${b.id}" aria-label="Supprimer">🗑</button></span></div>${b.texte ? `<p>${esc(b.texte).replace(/\n/g, '<br>')}</p>` : ''}${(b.cases || []).length ? `<ul class="l" style="margin-top:8px">${b.cases.map((c, i) => `<li class="${c.f ? 'ok' : ''}"><button class="rond" data-bcase="${esc(cle)}" data-bid="${b.id}" data-i="${i}" aria-label="${c.f ? 'Décocher' : 'Cocher'}">${c.f ? '✓' : ''}</button><div class="tx"><b>${esc(c.t)}</b></div></li>`).join('')}</ul>` : ''}</div>`).join('')
    + `<button type="button" class="btn plein plus-ed" data-bloc="${esc(cle)}">＋ Ajouter un bloc sur cette page (texte, liste à cocher)</button>`;
}
function formBloc(cle, id) {
  const T = RG.blocs(), L = T[cle] || [], b = L.find(x => x.id === id);
  dialogue(b ? 'Modifier le bloc' : 'Ajouter un bloc', `<div><label for="bl-t">Titre</label><input id="bl-t" value="${esc(b ? b.titre : '')}" placeholder="ex. Mes idées pour la haie"></div><div><label for="bl-x">Texte (facultatif)</label><textarea id="bl-x" rows="4">${esc(b ? b.texte : '')}</textarea></div><div><label for="bl-c">Liste à cocher (facultatif, une ligne par case)</label><textarea id="bl-c" rows="4" placeholder="Acheter du paillage\nRéparer le grillage">${esc(b ? (b.cases || []).map(c => c.t).join('\n') : '')}</textarea></div>`,
    `<button type="button" class="btn" data-annule>Annuler</button><button class="btn go">Enregistrer</button>`, () => {
      const t = $('bl-t').value.trim(); if (!t) { $('dlg-e').textContent = 'Donne un titre au bloc.'; return; }
      const anc = b ? (b.cases || []) : [], cases = $('bl-c').value.split('\n').map(x => x.trim()).filter(Boolean).map(x => ({t: x, f: (anc.find(c => c.t === x) || {}).f || false}));
      const n = Object.assign(b || {id: Date.now().toString(36)}, {titre: t, texte: $('bl-x').value.trim(), cases});
      if (!b) L.push(n); T[cle] = L; J.ecrit('jdb:blocs:v1', T); $('dlg').close(); rendre();
    });
  ['bl-t', 'bl-x', 'bl-c'].forEach(i => Maison.dictee($(i)));
}
function formTexte(cle, defaut, t) {
  dialogue(t, `<div><label for="tx-v">Texte</label><input id="tx-v" value="${esc(RG.texte(cle, defaut))}"></div><p class="mut">Laisse vide pour revenir au texte d'origine : « ${esc(defaut)} ».</p>`,
    `<button type="button" class="btn" data-annule>Annuler</button><button class="btn go">Enregistrer</button>`, () => { const v = $('tx-v').value.trim(); RG.nommer(cle, v === defaut ? '' : v); $('dlg').close(); rendre(); });
  Maison.dictee($('tx-v'));
}

// ---------- Le menu Paramètres
function parametres() {
  const ligne = (cle, nom, defNom) => `<label class="opt"><input type="checkbox" data-montre="${cle}" ${RG.cache(cle) ? '' : 'checked'}><span>${esc(nom)}</span></label>`;
  const parts = Object.entries(PARTIES);
  dialogue('⚙️ Paramètres', `
    <button type="button" class="btn ${edition() ? '' : 'go'} plein" id="p-edit">${edition() ? '✓ Mode modification activé : le couper' : "✏️ Activer le mode modification"}</button>
    <p class="mut" style="margin:6px 0 0">En mode modification, chaque page montre ✎ pour renommer, 🗑 pour enlever et ＋ pour ajouter (gestes, fiches, légumes, conseils, et tes propres blocs).</p>
    <span class="lab">Tuiles affichées dans le jardin</span><div class="opts">${parts.map(([k]) => ligne('tuile:' + k, nomP(k))).join('')}</div>
    ${parts.filter(([, P]) => P.onglets).map(([k, P]) => `<span class="lab">Onglets de ${esc(nomP(k))}</span><div class="opts">${P.onglets.map(([o, l]) => ligne('onglet:' + k + '/' + o, RG.texte('onglet:' + k + '/' + o, l))).join('')}</div>`).join('')}
    <span class="lab">Noms des onglets</span><p class="mut" style="margin:0">Touche un onglet pour le renommer.</p><div class="opts">${parts.filter(([, P]) => P.onglets).flatMap(([k, P]) => P.onglets.map(([o, l]) => `<button type="button" class="btn" data-texte="onglet:${k}/${o}" data-def="${esc(l)}" data-tdlg="Nom de l'onglet">${P.e} ${esc(RG.texte('onglet:' + k + '/' + o, l))}</button>`)).join('')}</div>
    <span class="lab">Sauvegarde</span><div class="ligne"><button type="button" class="btn" id="b-exp">💾 Exporter une sauvegarde</button><label class="btn">📂 Importer une sauvegarde<input type="file" id="b-imp" accept=".json" hidden></label></div>
    <div class="ligne" style="margin-top:8px"><button type="button" class="btn" id="b-rest">↺ Restaurer les éléments supprimés</button><button type="button" class="btn" id="b-raz">↺ Remettre noms et onglets d'origine</button></div>
    <p class="mut">Tout se sauvegarde déjà tout seul sur le Drive, pour toute la famille. Le fichier de sauvegarde sert seulement de copie de sécurité.</p>`,
    `<button type="button" class="btn go" data-annule>Fermer</button>`, () => $('dlg').close());
}

// ---------- Rendu selon l'adresse
let derniere = '';
function rendre() {
  const h = decodeURIComponent(location.hash.slice(1)), [p, v, ...reste] = h.split('/'), arg = reste.join('/');
  if (h !== derniere) { Q = ''; FST = ''; }
  const changement = h !== derniere; derniere = h;
  const x = scrollY;
  let html = '', retour = [ACCUEIL, '‹ Happiness'];
  const P = PARTIES[p];
  document.documentElement.style.setProperty('--c', P ? P.c : ({projet: PARTIES.projets.c, pensee: PARTIES.pensees.c}[p] || '#3f8f4a'));
  if (p === 'verger') { html = titre('verger') + onglets('verger', v === 'arbre' ? 'arbres' : v === 'fiche' ? 'fiches' : v);
    html += v === 'arbres' ? (arg === 'bilan' ? vueBilan('f') : vueArbres('f')) : v === 'arbre' ? vueArbre('f', arg) : v === 'fiches' ? vueFiches('f', arg) : v === 'fiche' ? vueFiche('f', arg) : v === 'calendrier' ? vueCalendrier('c') : v === 'soins' ? vueSoins() : vueMoisArbres('f'); }
  else if (p === 'ornement') { html = titre('ornement') + onglets('ornement', v === 'plante' ? 'plantes' : v === 'fiche' ? 'fiches' : v);
    html += v === 'plantes' ? (arg === 'bilan' ? vueBilan('o') : vueArbres('o')) : v === 'plante' ? vueArbre('o', arg) : v === 'fiches' ? vueFiches('o', arg) : v === 'fiche' ? vueFiche('o', arg) : vueMoisArbres('o'); }
  else if (p === 'potager') { html = titre('potager') + onglets('potager', v === 'legume' ? 'legumes' : v);
    html += v === 'legumes' ? vueLegumes() : v === 'legume' ? vueLegume(arg) : v === 'calendrier' ? vueCalendrier('p') : v === 'conseils' ? vueConseils() : v === 'compost' ? vueCompost() : vueMoisPotager(); }
  else if (p === 'projets') html = titre('projets') + vueProjets();
  else if (p === 'projet') html = titre('projets') + vueProjet(v);
  else if (p === 'pensees') html = titre('pensees') + vuePensees();
  else if (p === 'pensee') html = titre('pensees') + vuePensee(v);
  else html = vueAccueil();
  html = (edition() ? `<div class="bandeau">✏️ <span>Mode modification : touche ✎ pour renommer, 🗑 pour enlever, ＋ pour ajouter.</span><button class="btn" id="b-fin">Terminer</button></div>` : '') + html + blocsDe(pageCle(p, v, arg));
  if (p) retour = ['#', '‹ ' + RG.texte('nom:jardin', 'Jardin du Bonheur')];
  $('retour').href = retour[0]; $('retour').textContent = retour[1];
  const tb = document.querySelector('.tableau-bilan'), sl = tb ? tb.scrollLeft : 0;
  $('vue').innerHTML = html;
  if (!changement && sl && document.querySelector('.tableau-bilan')) document.querySelector('.tableau-bilan').scrollLeft = sl;
  const q = $('q'); if (q) { q.oninput = () => { Q = q.value; const pos = q.selectionStart; rendre(); const n = $('q'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} } }; Maison.dictee(q); }
  if ($('i-etape')) Maison.dictee($('i-etape'));
  if ($('i-rep')) Maison.dictee($('i-rep'));
  if (changement) scrollTo(0, 0); else scrollTo(0, x);
}
addEventListener('hashchange', rendre);

// ---------- Formulaires (ajout et modification)
const SCH = {
  c: {t: 'un geste du verger', req: 2, f: [['Type', 'sel', ['✂️', '🛡️', '🧺', '🌱'], 0], ['Arbres concernés', 'tags', null, 1], ['Action à faire', 'ta', null, 2], ['Pourquoi', 'ta', null, 3]]},
  p: {t: 'un geste du potager', req: 2, f: [['Type', 'sel', ['🌱', '🪴', '🧺', '🛠️'], 0], ['Légumes ou sujet', 'tx', null, 1], ['Action à faire', 'ta', null, 2], ['Pourquoi', 'ta', null, 3]]},
  s: {t: 'une ligne de surveillance', req: 0, f: [['Arbre', 'tx', null, 0], ['Problèmes fréquents', 'ta', null, 1], ['Prévention naturelle', 'ta', null, 2]]},
  r: {t: 'un réflexe', req: 0, f: [['Titre', 'tx', null, 0], ['Texte', 'ta', null, 1]]},
  t: {t: 'un traitement naturel', req: 0, f: [['Nom', 'tx', null, 0], ['Contre quoi', 'ta', null, 1], ['Préparation et usage', 'ta', null, 2]]},
  pc: {t: 'un conseil du potager', req: 0, f: [['Titre', 'tx', null, 0], ['Texte', 'ta', null, 1]]},
  pl: {t: 'un légume du tableau', req: 0, f: [['Légume', 'tx', null, 0], ['Semis', 'ta', null, 1], ['Plantation', 'ta', null, 2], ['Récolte', 'ta', null, 3], ['Astuce', 'ta', null, 4]]},
  cc: {t: 'un conseil de compostage', req: 0, f: [['Titre', 'tx', null, 0], ['Texte', 'ta', null, 1]]},
  ct: {t: 'un problème de compost', req: 0, f: [['Problème', 'tx', null, 0], ['Cause probable', 'ta', null, 1], ['Solution', 'ta', null, 2]]},
  f: {t: 'une fiche fruitier', req: 1, f: [['Groupe', 'dl', GO, 0], ['Nom', 'tx', null, 1], ['Floraison', 'ta', null, 2], ['Récolte', 'ta', null, 3], ['Soins', 'ta', null, 4], ['Pollinisation', 'ta', null, 5], ['Taille', 'ta', null, 6], ['À vérifier (facultatif)', 'ta', null, 7]]},
  o: {t: "une fiche plante d'ornement", req: 1, f: [['Groupe', 'dl', OG, 0], ['Nom', 'tx', null, 1], ['Floraison', 'ta', null, 2], ['Taille', 'ta', null, 3], ['Entretien', 'ta', null, 4], ['À savoir', 'ta', null, 5]]},
  lg: {t: 'une fiche légume', req: 0, f: [['Nom du légume', 'tx', null, 0], ['Emoji', 'tx', null, 2], ['Slogan', 'tx', null, 3], ['Famille', 'tx', null, 4], ['Difficulté (1 facile à 3 exigeant)', 'sel', ['1', '2', '3'], 5], ['Exposition', 'tx', null, 6], ['Besoin en eau (1 à 3)', 'sel', ['1', '2', '3'], 7], ['Calendrier : 12 mois séparés par des virgules (S semis, P plantation, R récolte)', 'tx', null, 8], ['Étapes (une par ligne : semis, plantation, entretien, récolte)', 'ta', null, 9], ['Maladies et remèdes (une par ligne : Problème | Remède naturel)', 'ta', null, 10], ['Bons voisins', 'tx', null, 11], ['À éviter', 'tx', null, 12], ['Astuce sans bêcher', 'ta', null, 13]]}
};
// Trouver un élément par son identifiant, quel que soit son type
function trouver(id) {
  const kinds = ['f', 'o', 'lg', 'r', 's', 't', 'pc', 'pl', 'cc', 'ct'];
  for (const k of kinds) { const x = J.liste(k).find(y => y.id === id); if (x) return x; }
  for (let mi = 0; mi < 12; mi++) for (const k of ['c', 'p']) { const x = J.liste(k, mi).find(y => y.id === id); if (x) return Object.assign(x, {m: mi}); }
  return null;
}
function dialogue(t, contenu, boutons, valider) {
  $('dlg-t').textContent = t; $('dlg-c').innerHTML = contenu; $('dlg-e').textContent = '';
  $('dlg-b').innerHTML = boutons; $('dlg-f').onsubmit = e => { e.preventDefault(); valider(); };
  $('dlg-b').querySelector('[data-annule]').onclick = () => $('dlg').close();
  $('dlg').showModal();
}
function formulaire(kind, id, m, g) {
  const s = SCH[kind], x = id ? trouver(id) : null, a = x ? x.a.slice() : (g ? [g] : []), v = i => a[i] == null ? '' : a[i];
  const champs = s.f.map(([l, t, o, i], n) => {
    const c = 'e' + n; let w;
    if (t === 'tx') w = `<input id="${c}" value="${esc(v(i))}">`;
    else if (t === 'ta') w = `<textarea id="${c}" rows="3">${esc(v(i))}</textarea>`;
    else if (t === 'sel') w = `<select id="${c}">${o.map(z => `<option ${z == v(i) ? 'selected' : ''}>${z}</option>`).join('')}</select>`;
    else if (t === 'dl') w = `<input id="${c}" list="${c}l" value="${esc(v(i))}"><datalist id="${c}l">${o.map(z => `<option value="${esc(z)}">`).join('')}</datalist>`;
    else { const sel = String(v(i) || 'all').split(' '); w = `<div class="tags" id="${c}">${[['all', 'Tous les arbres'], ...Object.entries(N)].map(([k2, n2]) => `<label><input type="checkbox" value="${k2}" ${sel.includes(k2) ? 'checked' : ''}>${esc(n2)}</label>`).join('')}</div>`; }
    return `<div><label for="${c}">${esc(l)}</label>${w}</div>`;
  }).join('');
  const moisSel = (kind === 'c' || kind === 'p') && !id ? `<div><label for="emo">Mois</label><select id="emo">${MOIS.map((z, i) => `<option value="${i}" ${i == m ? 'selected' : ''}>${z}</option>`).join('')}</select></div>` : '';
  dialogue((id ? 'Modifier ' : 'Ajouter ') + s.t, moisSel + champs, `<button type="button" class="btn" data-annule>Annuler</button><button class="btn go">Enregistrer</button>`, () => {
    s.f.forEach(([l, t, o, i], n) => { const e = $('e' + n); a[i] = t === 'tags' ? (c => !c.length || c.includes('all') ? 'all' : c.join(' '))([...e.querySelectorAll('input:checked')].map(z => z.value)) : e.value.trim(); });
    if (!a[s.req]) { $('dlg-e').textContent = 'Le champ « ' + s.f.find(f => f[3] === s.req)[0] + ' » est obligatoire.'; return; }
    if (id) J.modifier(id, a); else J.ajouter(kind, a, $('emo') ? +$('emo').value : null);
    $('dlg').close(); rendre();
  });
  s.f.forEach(([l, t], n) => { if (t === 'tx' || t === 'ta') Maison.dictee($('e' + n)); });
}

// ---------- Les gestes de l'utilisateur
function modeEdition(oui) { document.body.classList.toggle('edition', oui); try { localStorage.setItem('jdb:edition', oui ? '1' : ''); } catch (e) {} rendre(); }
try { if (localStorage.getItem('jdb:edition')) document.body.classList.add('edition'); } catch (e) {}
// Les boutons du menu Paramètres (dans la fenêtre)
document.addEventListener('click', e => {
  const b = e.target.closest('#dlg button'); if (!b) return; const d = b.dataset;
  if (b.id === 'p-edit') { $('dlg').close(); modeEdition(!edition()); }
  else if (d.texte) { $('dlg').close(); formTexte(d.texte, d.def, d.tdlg); }
  else if (b.id === 'b-exp') J.exporter();
  else if (b.id === 'b-rest') { const u = J.lit('verger:edit:v1', null); if (u && u.del) { u.del = {}; J.ecrit('verger:edit:v1', u); } alert('Les éléments supprimés sont revenus.'); rendre(); }
  else if (b.id === 'b-raz') { if (confirm('Remettre les noms d\'origine et réafficher toutes les tuiles et tous les onglets ? Tes blocs ajoutés restent.')) { J.ecrit('jdb:textes:v1', {}); J.ecrit('jdb:caches:v1', {}); $('dlg').close(); rendre(); } }
});
document.addEventListener('change', e => { const i = e.target; if (i.dataset && i.dataset.montre && i.closest('#dlg')) { RG.cacher(i.dataset.montre, !i.checked); rendre(); } });
document.addEventListener('click', async e => {
  const b = e.target.closest('button,[data-zoom]');
  if (!b || b.closest('dialog')) return;
  const d = b.dataset;
  if (d.mois) { MI += +d.mois; if (MI < 0) { MI = 11; AN--; } if (MI > 11) { MI = 0; AN++; } rendre(); return; }
  if (d.an) { AN = +d.an; rendre(); return; }
  if (d.sv) { const [y, key] = [AN, d.sv], v = J.suivi(y, key)[d.f]; J.noter(y, key, {[d.f]: v ? '' : (y === ANNEE ? J.auj() : y + '-' + String(MI + 1).padStart(2, '0') + '-15')}); rendre(); return; }
  if (d.geste) { const mc = J.moisCle(AN, MI); J.cocher(mc, d.geste, !J.coche(mc, d.geste), qui()); rendre(); return; }
  if (d.filtre) { if (d.filtre === 'c') FILTRE_C = d.v; else FILTRE_P = d.v; rendre(); return; }
  if (d.fst != null && b.matches('[data-fst]')) { FST = d.fst; rendre(); return; }
  if (d.modif) { const x = trouver(d.modif); if (x) formulaire(x.k, x.id, x.m); return; }
  if (d.suppr) { const x = trouver(d.suppr); if (x && confirm('Supprimer « ' + (x.a[x.k === 'c' || x.k === 'p' ? 2 : (x.k === 'f' || x.k === 'o') ? 1 : 0]) + ' » ?')) { J.supprimer(x.id); if (x.k === 'f' || x.k === 'o' || x.k === 'lg') history.back(); else rendre(); } return; }
  if (d.retablir) { J.retablir(d.retablir); rendre(); return; }
  if (d.ajout) { formulaire(d.ajout, null, d.m != null ? +d.m : MI, d.g); return; }
  if (d.nouvel) { const t = J.nouvelArbre(d.nouvel, {}); location.hash = (d.nouvel === 'f' ? 'verger/arbre/' : 'ornement/plante/') + t.id; return; }
  if (d.enlever) { const [k, id] = d.enlever.split(':'), t = J.arbres(k).find(x => x.id === +id); if (t && confirm('Enlever « ' + (t.name || 'cet élément') + ' » de la liste ?')) { J.enleverArbre(k, +id); location.hash = k === 'f' ? 'verger/arbres' : 'ornement/plantes'; } return; }
  if (b.matches('[data-zoom]')) { const z = document.createElement('div'); z.className = 'zoom'; z.innerHTML = `<img src="${b.src}" alt="">`; z.onclick = () => z.remove(); document.body.appendChild(z); return; }
  if (d.phsup != null) { const k = b.closest('[data-ph]').dataset.ph, a = J.photos(k); if (confirm('Enlever cette photo ?')) { a.splice(+d.phsup, 1); J.garderPhotos(k, a); rendre(); } return; }
  if (b.id === 'b-param') { parametres(); return; }
  if (b.id === 'b-fin') { modeEdition(false); return; }
  if (d.texte) { formTexte(d.texte, d.def, d.tdlg); return; }
  if (d.bloc) { formBloc(d.bloc, d.bid); return; }
  if (d.blocsup) { const T = RG.blocs(), L = T[d.blocsup] || [], x = L.find(y => y.id === d.bid); if (x && confirm('Supprimer le bloc « ' + x.titre + ' » ?')) { T[d.blocsup] = L.filter(y => y !== x); J.ecrit('jdb:blocs:v1', T); rendre(); } return; }
  if (d.bcase) { const T = RG.blocs(), x = (T[d.bcase] || []).find(y => y.id === d.bid); if (x) { x.cases[+d.i].f = !x.cases[+d.i].f; J.ecrit('jdb:blocs:v1', T); rendre(); } return; }
  if (b.id === 'b-rest') { const u = J.lit('verger:edit:v1', null); if (u && u.del) { u.del = {}; J.ecrit('verger:edit:v1', u); } alert('Les éléments supprimés sont revenus.'); rendre(); return; }
  if (b.id === 'b-exp') { J.exporter(); return; }
  // Projets
  if (d.nouveau === 'projet') { nouveauProjet(); return; }
  if (d.projsauve) {   // Sauver : reprend chaque case (et l'étape en cours de frappe), puis retour à la liste
    const p = TS.get(d.projsauve); if (!p) return;
    document.querySelectorAll('[data-projet]').forEach(i => { const v = i.value.trim(); if (i.dataset.projet !== 'titre' || v) p[i.dataset.projet] = v; });
    const et = $('i-etape') && $('i-etape').value.trim(); if (et) (p.etapes = p.etapes || []).push({t: et[0].toUpperCase() + et.slice(1), fait: false});
    TS.put(p); location.hash = 'projets';
    const t = document.createElement('div'); t.textContent = '✓ Projet « ' + p.titre + ' » enregistré'; t.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#2b2b2b;color:#fff;padding:10px 16px;border-radius:12px;z-index:50;font-weight:600;max-width:90vw';
    document.body.appendChild(t); setTimeout(() => t.remove(), 2200); return;
  }
  if (d.statut) { const p = TS.get(derniere.split('/')[1]); if (p) { p.statut = d.statut; TS.put(p); rendre(); } return; }
  if (d.etape != null) { const p = TS.get(derniere.split('/')[1]); if (p) { const x = p.etapes[+d.etape]; x.fait = !x.fait; x.par = x.fait ? qui() : ''; x.le = x.fait ? J.auj() : ''; if (p.etapes.length && p.etapes.every(y => y.fait) && p.statut !== 'fait') p.statut = 'fait'; else if (p.statut === 'idee' || p.statut === 'prevu' || (p.statut === 'fait' && !p.etapes.every(y => y.fait))) p.statut = 'encours'; TS.put(p); rendre(); } return; }
  if (d.etsup != null) { const p = TS.get(derniere.split('/')[1]); if (p) { p.etapes.splice(+d.etsup, 1); TS.put(p); rendre(); } return; }
  if (d.projsup) { const p = TS.get(d.projsup); if (p && confirm('Supprimer le projet « ' + p.titre + ' » ?')) { TS.del(p.id); location.hash = 'projets'; } return; }
  // Pensées
  if (d.nouveau === 'pensee') { formPensee(null); return; }
  if (d.pensmod) { formPensee(TS.get(d.pensmod)); return; }
  if (d.penssup) { const p = TS.get(d.penssup); if (p && confirm('Supprimer cette pensée et ses réponses ?')) { TS.tous('reponse').filter(r => r.parent === p.id).forEach(r => TS.del(r.id)); TS.del(p.id); location.hash = 'pensees'; } return; }
  if (d.repsup) { if (confirm('Effacer cette réponse ?')) { TS.del(d.repsup); rendre(); } return; }
});
document.addEventListener('change', async e => {
  const i = e.target, d = i.dataset || {};
  if (i.id === 'b-imp' && i.files[0]) { const r = new FileReader(); r.onload = () => { try { J.importer(r.result); alert('Sauvegarde importée.'); rendre(); } catch (err) { alert("Ce fichier n'est pas une sauvegarde du Jardin du Bonheur."); } }; r.readAsText(i.files[0]); return; }
  if (d.phadd != null && i.files.length) { const k = i.closest('[data-ph]').dataset.ph; for (const f of i.files) await J.ajouterPhoto(k, f); rendre(); return; }
  if (d.svs) { J.noter(AN, d.svs, {[d.f]: i.value.trim()}); if (i.tagName === 'SELECT') rendre(); return; }
  if (d.arbre) {
    const [, , id] = derniere.split('/'), k = derniere.startsWith('verger') ? 'f' : 'o', o = {};
    if (d.arbre === 'n') o.n = +i.value || 0;
    else if (d.arbre === 'fid') { o.fid = i.value; const x = J.fiches(k).find(y => y.id === i.value); if (x) { o.name = x.a[1]; const t = J.arbres(k).find(z => z.id === +id); if (t && t.st === 'i') o.st = 'c'; } }
    else o[d.arbre] = i.value.trim();
    J.majArbre(k, +id, o); rendre(); return;
  }
  if (d.projet) { const p = TS.get(derniere.split('/')[1]); if (p) { p[d.projet] = i.value.trim(); if (d.projet === 'titre' && !p.titre) return; TS.put(p); if (i.tagName === 'SELECT') rendre(); } }
});
document.addEventListener('submit', e => {
  if (e.target.id === 'f-etape') { e.preventDefault(); const v = $('i-etape').value.trim(), p = TS.get(derniere.split('/')[1]); if (!v || !p) return; (p.etapes = p.etapes || []).push({t: v[0].toUpperCase() + v.slice(1), fait: false}); if (p.statut === 'fait') p.statut = 'encours'; TS.put(p); rendre(); const n = $('i-etape'); if (n) n.focus(); }
  if (e.target.id === 'f-rep') { e.preventDefault(); const v = $('i-rep').value.trim(), id = derniere.split('/')[1], p = TS.get(id); if (!v || !p) return; TS.put({id: TS.id(), type: 'reponse', parent: id, texte: v, par: qui(), cree: Date.now()}); p.maj = Date.now(); TS.put(p); rendre(); }
});
function nouveauProjet() {
  dialogue('Nouveau projet', `<div><label for="np-t">Quel projet ?</label><input id="np-t" placeholder="ex. Mare pour les grenouilles" autocomplete="off"></div><div><label for="np-z">Où</label><select id="np-z">${['', ...ECHANGES.ZONES].map(z => `<option value="${z}">${z || '—'}</option>`).join('')}</select></div>`,
    `<button type="button" class="btn" data-annule>Annuler</button><button class="btn go">Créer</button>`, () => {
      const t = $('np-t').value.trim(); if (!t) { $('dlg-e').textContent = 'Donne un nom au projet.'; return; }
      const p = TS.put({id: TS.id(), type: 'projet', titre: t[0].toUpperCase() + t.slice(1), zone: $('np-z').value, statut: 'idee', quand: '', note: '', etapes: [], cree: Date.now(), par: qui()});
      $('dlg').close(); location.hash = 'projet/' + p.id;
    });
  Maison.dictee($('np-t'));
}
function formPensee(p) {
  dialogue(p ? 'Modifier la pensée' : 'Partager une pensée', `<div><label for="pe-t">Sujet</label><input id="pe-t" value="${esc(p ? p.titre : '')}" placeholder="ex. Faire une haie fruitière le long du chemin" autocomplete="off"></div><div><label for="pe-x">Ce qu'on s'est dit, ton idée</label><textarea id="pe-x" rows="6">${esc(p ? p.texte : '')}</textarea></div>`,
    `<button type="button" class="btn" data-annule>Annuler</button><button class="btn go">${p ? 'Enregistrer' : 'Partager'}</button>`, () => {
      const t = $('pe-t').value.trim(), x = $('pe-x').value.trim(); if (!t && !x) { $('dlg-e').textContent = 'Écris au moins le sujet.'; return; }
      const r = p || {id: TS.id(), type: 'pensee', cree: Date.now(), par: qui()};
      Object.assign(r, {titre: t, texte: x, maj: Date.now()}); TS.put(r); $('dlg').close();
      if (p) rendre(); else location.hash = 'pensee/' + r.id;
    });
  Maison.dictee($('pe-t')); Maison.dictee($('pe-x'));
}

rendre();
// Changement de mois pendant que l'appli reste ouverte
setInterval(() => { if (document.visibilityState === 'visible' && !$('dlg').open && !document.activeElement.matches('input,textarea,select')) rendre(); }, 60000);
