// Renforcement : appli de Kevin (pubalgie, genou, épaule, plancher pelvien, journal de santé).
// Données dans le téléphone + feuille Google à part (clé maison:drive-renfo), voir renfo/google/Code.gs.
(() => {
'use strict';
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const CFG = 'maison:drive-renfo';
// Adresse du script de la feuille « Renforcement » de Kevin (pré-remplie : il ne reste qu'à taper le mot de passe).
const SCRIPT = 'https://script.google.com/macros/s/AKfycbzSS-fcohaOUAaGv89dz1XiJUYZQNjz5d-iaeoeuvHFswddjw0fZW8vhZqRwAVyIAcP0g/exec';

// ---------- Dates (format AAAA-MM-JJ, heure locale) ----------
const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const dt = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const plus = (s, n) => { const d = dt(s); d.setDate(d.getDate() + n); return iso(d); };
const jourSem = s => (dt(s).getDay() + 6) % 7; // 0 = lundi
const lundiDe = s => plus(s, -jourSem(s));
const auj = () => iso(new Date());
const ecart = (a, b) => Math.round((dt(b) - dt(a)) / 864e5);
const joli = (s, o) => dt(s).toLocaleDateString('fr-BE', o || {weekday: 'long', day: 'numeric', month: 'long'});
const court = s => dt(s).toLocaleDateString('fr-BE', {day: 'numeric', month: 'short'});

// ---------- Données ----------
// Onglets lisibles de la feuille Google (les plus récents en haut, dates au format belge)
const tables = recs => {
  const by = t => recs.filter(r => r.type === t).sort((a, b) => (b.date + (b.heure || '')).localeCompare(a.date + (a.heure || '')));
  const D = ['Aucune', 'Légère gêne', 'Douleur', 'Forte douleur'], dl = v => v == null ? '' : D[v];
  const fd = s => s ? s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4) : '';
  const nj = s => JOURS[jourSem(s)];
  const nomS = k => (SEANCES[k] || {}).nom || k;
  const dates = [...new Set(recs.filter(r => ['jour', 'seance', 'padel', 'selle'].includes(r.type) && r.date).map(r => r.date))].sort().reverse();
  const J = {}; recs.filter(r => r.type === 'jour').forEach(j => { J[j.date] = j; });
  const o = {};
  o['Journal'] = [['Date', 'Jour', 'Aine / adducteur', 'Genou gauche', 'Épaule gauche', 'Épaule droite', 'Test du ballon /10', 'Activité', 'Selles', '« Cloc » la nuit', 'Plancher pelvien', 'Note']]
    .concat(dates.map(s => {
      const j = J[s] || {}, d = j.d || {};
      const act = recs.filter(r => r.date === s && r.type === 'padel').map(p => '🎾 Padel' + (p.duree ? ' ' + p.duree + ' min' : ''))
        .concat(recs.filter(r => r.date === s && r.type === 'seance' && !['pp', 'echauf'].includes(r.cle)).map(x => nomS(x.cle) + ' (' + ((NIVEAUX[x.niveau] || {}).nom || '').toLowerCase() + ')'));
      const sl = recs.filter(r => r.date === s && r.type === 'selle');
      return [fd(s), nj(s), dl(d.aine), dl(d.genou), dl(d.epG), dl(d.epD), j.test == null ? '' : j.test, act.join(' · '),
        sl.length ? sl.map(x => [x.aide, x.consist ? x.consist.toLowerCase() : ''].filter(Boolean).join(', ')).join(' / ') : (j.sansSelle ? 'Pas de selle' : ''),
        j.cloc || '', j.pp ? 'fait' : '', j.note || ''];
    }));
  o['Séances'] = [['Date', 'Jour', 'Séance', 'Niveau', 'Durée (min)', 'Exercices faits', 'Ressenti après']]
    .concat(by('seance').map(x => [fd(x.date), nj(x.date), nomS(x.cle), (NIVEAUX[x.niveau] || {}).nom || '', x.duree || '', x.faits + ' / ' + x.total, x.ressenti || '']));
  o['Padel'] = [['Date', 'Jour', 'Durée (min)', 'Type', 'Smashs main gauche', 'Manchons', 'Douleur aine le lendemain', 'Test du ballon le lendemain', 'Note']]
    .concat(by('padel').map(p => { const l = J[plus(p.date, 1)] || {}; return [fd(p.date), nj(p.date), p.duree || '', p.genre || '', p.smashs == null ? '' : p.smashs, p.manchons ? 'oui' : 'non', dl((l.d || {}).aine), l.test == null ? '' : l.test, p.note || '']; }));
  o['Selles'] = [['Date', 'Jour', 'Heure', 'Aide', 'Selles', 'Passage', 'Note']]
    .concat(by('selle').map(x => [fd(x.date), nj(x.date), x.heure || '', x.aide || '', x.consist || '', x.passage || '', x.note || '']));
  o['Semaines'] = [['Semaine du', 'Cours le lundi', 'Padel', ...JOURS]]
    .concat(by('semaine').map(x => [fd(x.date), x.cours ? 'oui' : 'non', ({ven: 'Vendredi', sam: 'Samedi', aucun: 'Pas de padel'})[x.padel] || '', ...planSemaine(x.date).map(j => j.map(nomElement).join(' + '))]));
  // Le programme complet, dose par niveau
  const prog = [['Séance', 'N°', 'Exercice', 'Intensité', 'Douce', 'Normale', 'À fond', 'Comment', 'Conseil / à éviter']];
  ['pub', 'epaule', 'soupleTout', 'pp', 'echauf'].forEach(k => SEANCES[k].liste.forEach((id, i) => {
    const e = EX[id], dose = n => e.copenhague ? (e.niv[n] ? 'selon l\'étape (1 à 4)' : 'remplacé par l\'élastique') : e.lancers ? (e.niv[n] ? 'selon la semaine' : '—') : (e.niv[n] ? e.niv[n].d : '—');
    prog.push([SEANCES[k].nom, String(i + 1), e.nom, COULEURS[e.coul][1], dose('douce'), dose('normale'), dose('forte'), (e.comment || []).join(' '), [e.conseil, e.eviter ? 'À éviter : ' + e.eviter : ''].filter(Boolean).join(' ')]);
  }));
  o['Mon programme'] = prog;
  o['Mes règles'] = [['N°', 'Règle']].concat(REGLES.map((t, i) => [String(i + 1), t])).concat([['', ''], ['Si ça revient', '']]).concat(RECHUTE.map(t => ['•', t]));
  return o;
};
const R = Maison.store('renfo', {cfg: CFG, tables, recu: () => rendre()});
Maison.pastille('#reglages', CFG);

const reg = () => Object.assign({cop: 1, marche: 10, options: true, padelDefaut: 'ven', coursDefaut: false, epDebut: '2026-11-02'}, R.get('reglages') || {});
const setReg = o => R.put(Object.assign({}, reg(), o, {id: 'reglages', type: 'reglages'}));
const jour = s => R.get('j-' + s) || {id: 'j-' + s, type: 'jour', date: s};
const setJour = (s, o) => { const j = jour(s); R.put(Object.assign(j, o)); };
const parDate = (type, s) => R.tous(type).filter(r => r.date === s);

// ---------- Semaine ----------
const semaine = l => R.get('s-' + l);
const reglageSemaine = l => { const s = semaine(l), r = reg(); return {cours: s ? !!s.cours : !!r.coursDefaut, padel: s ? s.padel : r.padelDefaut}; };
function planSemaine(l) {
  const s = semaine(l), rs = reglageSemaine(l), rt = ROUTINES[(rs.cours ? 'o' : 'n') + '-' + rs.padel] || ROUTINES['n-ven'];
  return rt.jours.map((j, i) => (s && s.jours && s.jours[i]) ? s.jours[i] : j);
}
const routineDe = l => { const rs = reglageSemaine(l); return ROUTINES[(rs.cours ? 'o' : 'n') + '-' + rs.padel] || ROUTINES['n-ven']; };
const planJour = s => planSemaine(lundiDe(s))[jourSem(s)];
const nomElement = e => { const [k, n] = e.split(':'); return (ELEMENTS[k] || k) + (n ? ' (' + NIVEAUX[n].nom.toLowerCase() + ' maximum)' : ''); };
const ICO = {pub: '🦵', verts: '🟢', epaule: '💪', combi: '⚡', padel: '🎾', repos: '🚶', test: '⚽', soupleTout: '🧘', soupleBas: '🧘', soupleHaut: '🧘', pp: '🌬️', echauf: '🎾'};

// ---------- Test du ballon, rechute, niveau conseillé ----------
const tests = () => R.tous('jour').filter(j => j.test != null).sort((a, b) => a.date.localeCompare(b.date));
function alerte() {
  const T = tests().filter(j => ecart(j.date, auj()) <= 10);
  for (let i = T.length - 1; i >= 0; i--) {
    const t = T[i], av = tests().filter(j => j.date < t.date).pop();
    if (t.test >= 5) return {date: t.date, txt: 'Test du ballon à ' + t.test + '/10 le ' + court(t.date) + '.'};
    if (av && t.test - av.test >= 2) return {date: t.date, txt: 'Test du ballon : +' + (t.test - av.test) + ' points le ' + court(t.date) + ' (' + av.test + ' → ' + t.test + ').'};
  }
  return null;
}
function rechute() {
  const a = alerte(); if (!a) return null;
  // Fini quand le test est revenu au niveau habituel (≤ 2) après l'alerte
  const apres = tests().filter(j => j.date > a.date);
  if (apres.length && apres[apres.length - 1].test <= 2) return null;
  return a;
}
function conseil(s) {
  if (rechute()) return 'douce';
  const T = tests(), t = T.length ? T[T.length - 1] : null, j = jour(s), dAine = j.d ? j.d.aine : null;
  if ((t && ecart(t.date, s) <= 3 && t.test >= 3) || dAine >= 2) return dAine >= 3 ? 'douce' : 'normale';
  if (dAine === 1) return 'normale';
  if (t && ecart(t.date, s) <= 3 && t.test <= 1 && (dAine == null || dAine === 0)) return 'forte';
  return 'normale';
}
const semEp = () => Math.max(1, Math.floor(ecart(reg().epDebut, auj()) / 7) + 1);

// ---------- Critères pour passer à 2 padels (routine C) ----------
function criteres() {
  const r = reg(), T = tests(), der = T.slice(-2);
  const padels = R.tous('padel').filter(p => ecart(p.date, auj()) <= 21 && p.date < auj());
  const okPadel = padels.filter(p => {
    const j = jour(plus(p.date, 1)), av = T.filter(x => x.date <= p.date).pop();
    const testOk = j.test == null || !av || j.test - av.test < 2;
    return testOk && j.test !== undefined && (j.test == null || j.test <= 2) && !(j.d && j.d.aine >= 2) && !(j.d && j.d.genou >= 2);
  });
  return [
    ['Test du ballon à 0 ou 1 sur 10 (les 2 derniers)', der.length >= 2 && der.every(j => j.test <= 1)],
    ['Copenhague étape 3 sans douleur', r.cop >= 3],
    ['Descente de marche de 20 cm sans douleur au genou', r.marche >= 20 && r.marcheOk],
    ['3 semaines sans réaction le lendemain du padel (' + okPadel.length + ' padel' + (okPadel.length > 1 ? 's' : '') + ' sans réaction sur 3 semaines)', okPadel.length >= 3 && okPadel.length === padels.length]
  ];
}

// ---------- Rendu ----------
let onglet = 'aujourdhui', jSel = auj(), periode = 30, moisCal = auj().slice(0, 7);
const vue = () => $('vue');
function rendre() {
  if (!$('lecteur').hidden) return;
  const h = (location.hash || '#aujourdhui').slice(1);
  onglet = ['aujourdhui', 'seances', 'journal', 'suivi', 'reglages'].includes(h) ? h : 'aujourdhui';
  document.querySelectorAll('nav.onglets a').forEach(a => a.classList.toggle('on', a.dataset.o === onglet));
  ({aujourdhui: vAujourdhui, seances: vSeances, journal: vJournal, suivi: vSuivi, reglages: vReglages})[onglet]();
}
addEventListener('hashchange', () => { rendre(); scrollTo(0, 0); });

const segHtml = (nom, opts, val, cls) => `<div class="seg ${cls || ''}" data-seg="${nom}">${opts.map(([v, t]) => `<button type="button" data-v="${v}" class="${String(val) === String(v) ? 'on' : ''}">${t}</button>`).join('')}</div>`;
const DOUL = [[0, 'Aucune'], [1, 'Légère gêne'], [2, 'Douleur'], [3, 'Forte']];
const ZONES = [['aine', 'Aine / adducteur droit'], ['genou', 'Genou gauche'], ['epG', 'Épaule gauche'], ['epD', 'Épaule droite (SLAP)']];

// ===== Aujourd'hui =====
function vAujourdhui() {
  const s = auj(), l = lundiDe(s), plan = planJour(s), rc = rechute(), j = jour(s);
  const veillePadel = planJour(plus(s, 1)).some(e => e.startsWith('padel'));
  const lendemainPadel = parDate('padel', plus(s, -1)).length || planJour(plus(s, -1)).some(e => e.startsWith('padel'));
  const apresPadel2 = parDate('padel', plus(s, -2)).length;
  let h = '';
  if (rc) h += `<div class="banniere alerte"><b>⚠️ On allège 7 à 10 jours</b><br>${esc(rc.txt)}<ul style="margin:6px 0 0;padding-left:20px">${RECHUTE.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>`;
  h += `<div class="carte"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><div><b style="font-size:18px">${esc(joli(s))}</b><div class="note">${esc(routineDe(l).nom)}</div></div><button type="button" class="lien" id="b-sem">Ma semaine ›</button></div>
    ${bandeSemaine(l)}</div>`;
  if (jourSem(s) === 6) {
    const ln = plus(l, 7), rs = reglageSemaine(ln);
    h += `<div class="carte"><b>🗓️ Prépare ta semaine prochaine</b><div class="note">Semaine du ${esc(joli(ln, {day: 'numeric', month: 'long'}))}</div>${formSemaine(ln, rs)}</div>`;
  }
  const sm = semaine(l), modifie = !!(sm && sm.jours && sm.jours[jourSem(s)]);
  h += `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin:22px 0 8px"><h2 style="margin:0">À faire aujourd'hui</h2><button type="button" id="b-chg">✎ Changer</button></div>`;
  if (modifie) h += `<p class="note" style="margin:0 0 6px">Tu as changé le programme du jour. <button type="button" class="lien" id="b-prog">Revenir au programme prévu</button></p>`;
  plan.forEach(e => { h += itemJour(e, s); });
  // Plancher pelvien, chaque jour
  const ppFait = j.pp || parDate('seance', s).some(x => x.cle === 'pp' || (SEANCES[x.cle] && SEANCES[x.cle].liste.includes('pp') && x.ppFait));
  h += `<div class="item ${ppFait ? 'ok' : ''}"><div class="ico">🌬️</div><div class="txt"><b>Plancher pelvien</b><span class="note">5 min de relâchement, chaque jour (le soir au lit par exemple)</span></div><button type="button" data-lancer="pp">${ppFait ? 'Refaire' : 'Guider'}</button></div>`;
  // Rappels
  const rap = [];
  if (veillePadel) rap.push('Demain c\'est padel : pas d\'épaule aujourd\'hui, seulement les exercices verts.');
  if (lendemainPadel || apresPadel2) rap.push('Les deux nuits après le padel : dors sur le dos ou sur le côté droit, pas sur l\'épaule gauche.');
  if (plan.some(e => e.startsWith('padel'))) rap.push('Manchons au genou gauche, même s\'il fait chaud. Main gauche seulement en jeu tranquille.');
  if (rap.length) h += `<div class="banniere info">${rap.map(t => '💡 ' + esc(t)).join('<br>')}</div>`;
  // Journal rapide
  h += `<h2>Comment ça va aujourd'hui ?</h2><div class="carte">${ZONES.map(([k, t]) => `<label class="l">${t}</label>${segHtml('d-' + k, DOUL, j.d ? j.d[k] : '', 'douleur')}`).join('')}
    <label class="l">🚽 Selles</label>${blocSelles(s)}
    <p class="note" style="margin:12px 0 0">Le test du ballon, le « cloc » et une note : <a href="#journal">Journal du jour</a>.</p></div>`;
  vue().innerHTML = h;
  brancherSeg(s);
  brancherSelles(s);
  $('b-sem').onclick = () => ouvrirSemaine(l);
  $('b-chg').onclick = () => changerJour(l, jourSem(s), () => {});
  if ($('b-prog')) $('b-prog').onclick = () => { const x = semaine(l); x.jours[jourSem(s)] = null; R.put(x); rendre(); };
  brancherSemaine();
  vue().querySelectorAll('[data-lancer]').forEach(b => b.onclick = () => choisirNiveau(b.dataset.lancer, s, b.dataset.max));
  vue().querySelectorAll('[data-padel]').forEach(b => b.onclick = () => dlgPadel(s));
  vue().querySelectorAll('[data-test]').forEach(b => b.onclick = () => dlgTest(s));
  vue().querySelectorAll('.semaine button').forEach(b => b.onclick = () => ouvrirSemaine(l, +b.dataset.i));
}
function itemJour(e, s) {
  const [k, max] = e.split(':');
  if (k === 'repos') return `<div class="item"><div class="ico">🚶</div><div class="txt"><b>Repos actif</b><span class="note">Marche, plancher pelvien. Rien d'autre.</span></div></div>`;
  if (k === 'test') { const t = jour(s).test; return `<div class="item ${t != null ? 'ok' : ''}"><div class="ico">⚽</div><div class="txt"><b>Test du ballon le matin</b><span class="note">${t != null ? 'Noté : ' + t + '/10' : 'Lendemain de padel : 3 s de serrage, douleur sur 10'}</span></div><button type="button" data-test="1">${t != null ? 'Changer' : 'Noter'}</button></div>`; }
  if (k === 'padel') {
    const p = parDate('padel', s)[0], ech = parDate('seance', s).some(x => x.cle === 'echauf');
    return `<div class="item ${ech ? 'ok' : ''}"><div class="ico">🔥</div><div class="txt"><b>Échauffement padel</b><span class="note">10 min avant de jouer</span></div><button type="button" data-lancer="echauf">${ech ? 'Refaire' : 'Guider'}</button></div>
    <div class="item ${p ? 'ok' : ''}"><div class="ico">🎾</div><div class="txt"><b>Padel</b><span class="note">${p ? esc(resumePadel(p)) : 'Rien d\'autre aujourd\'hui. Note ta partie après.'}</span></div><button type="button" data-padel="1">${p ? 'Modifier' : 'Noter'}</button></div>`;
  }
  const S = SEANCES[k]; if (!S) return '';
  const fait = parDate('seance', s).filter(x => x.cle === k);
  const n = max || conseil(s), d = duree(construire(k, n === 'forte' && max ? max : n, ctx()));
  return `<div class="item ${fait.length ? 'ok' : ''}"><div class="ico">${S.ico}</div><div class="txt"><b>${esc(S.nom)}</b><span class="note">${esc(S.txt)} · environ ${d} min${max ? ' · sans forcer le rouge' : ''}${k === 'epaule' && max === 'douce' ? ' · le matin, en douceur' : ''}</span></div><button type="button" class="${fait.length ? '' : 'go'}" data-lancer="${k}" ${max ? `data-max="${max}"` : ''}>${fait.length ? 'Refaire' : 'Commencer'}</button></div>`;
}
const resumePadel = p => [p.duree ? p.duree + ' min' : '', p.genre, p.smashs != null && p.smashs !== '' ? p.smashs + ' smashs main gauche' : '', p.manchons ? 'manchons ✓' : 'sans manchons'].filter(Boolean).join(' · ');
function bandeSemaine(l) {
  const plan = planSemaine(l), a = auj();
  return `<div class="semaine">${plan.map((j, i) => { const s = plus(l, i), fait = parDate('seance', s).length || parDate('padel', s).length;
    return `<button type="button" data-i="${i}" class="${s === a ? 'auj' : ''} ${s < a ? 'passe' : ''} ${fait ? 'fait' : ''}"><b>${JOURS[i].slice(0, 3)}</b><span class="i">${j.filter(e => e !== 'test').map(e => ICO[e.split(':')[0]] || '•').join('') || '·'}</span><span class="note petit">${dt(s).getDate()}</span></button>`; }).join('')}</div>`;
}
function formSemaine(l, rs) {
  return `<div data-sem="${l}"><label class="l">Cours de padel le lundi</label>${segHtml('cours', [[1, 'Oui'], [0, 'Non']], rs.cours ? 1 : 0)}
    <label class="l">Padel de la fin de semaine</label>${segHtml('padel', [['ven', 'Vendredi'], ['sam', 'Samedi'], ['aucun', 'Pas de padel']], rs.padel)}</div>`;
}
function brancherSemaine() {
  vue().querySelectorAll('[data-sem]').forEach(z => z.querySelectorAll('.seg button').forEach(b => b.onclick = () => {
    const l = z.dataset.sem, seg = b.parentNode.dataset.seg, s = Object.assign({id: 's-' + l, type: 'semaine', date: l}, reglageSemaine(l), semaine(l) || {});
    if (seg === 'cours') s.cours = b.dataset.v === '1'; else s.padel = b.dataset.v;
    delete s.jours; // on repart de la routine
    if (s.cours && !criteres().every(c => c[1])) bulle('Rappel : les critères pour 2 padels ne sont pas encore tous remplis (onglet Suivi).');
    R.put(s); rendre();
  }));
}
function brancherSeg(s) {
  vue().querySelectorAll('[data-seg^="d-"]').forEach(z => z.querySelectorAll('button').forEach(b => b.onclick = () => {
    const k = z.dataset.seg.slice(2), j = jour(s), d = Object.assign({}, j.d || {});
    d[k] = d[k] === +b.dataset.v ? null : +b.dataset.v; setJour(s, {d}); rendre();
  }));
}

// ===== Ma semaine (dialogue) =====
function ouvrirSemaine(l, iSel) {
  const dlg = dialogue(), rs = reglageSemaine(l);
  const dessiner = () => {
    const plan = planSemaine(l), sm = semaine(l), modif = sm && sm.jours && sm.jours.some(Boolean);
    dlg.innerHTML = `<h3 style="margin-top:0">Semaine du ${esc(joli(l, {day: 'numeric', month: 'long'}))}</h3><div class="note">${esc(routineDe(l).nom)}</div>
      ${formSemaine(l, reglageSemaine(l))}
      <h3>Jour par jour</h3><p class="note" style="margin:0 0 6px">Touche un jour pour changer ce qui est prévu.</p>
      ${plan.map((j, i) => `<div class="item" style="padding:9px 12px;${i === iSel ? 'border:2px solid var(--accent)' : ''}"><div class="txt"><b>${JOURS[i]} ${dt(plus(l, i)).getDate()}</b><span class="note">${esc(j.map(nomElement).join(' + '))}</span></div><button type="button" data-j="${i}">Changer</button></div>`).join('')}
      <div class="btns">${modif ? '<button type="button" id="sem-raz">Revenir à la routine</button>' : ''}<button type="button" class="go" id="sem-ok">Fermer</button></div>`;
    dlg.querySelectorAll('.seg button').forEach(b => b.onclick = () => {
      const seg = b.parentNode.dataset.seg, s = Object.assign({id: 's-' + l, type: 'semaine', date: l}, reglageSemaine(l), semaine(l) || {});
      if (seg === 'cours') s.cours = b.dataset.v === '1'; else s.padel = b.dataset.v;
      delete s.jours; R.put(s); dessiner(); rendre();
    });
    dlg.querySelectorAll('[data-j]').forEach(b => b.onclick = () => changerJour(l, +b.dataset.j, dessiner));
    $('sem-ok').onclick = () => dlg.close();
    if ($('sem-raz')) $('sem-raz').onclick = () => { const s = semaine(l); delete s.jours; R.put(s); dessiner(); rendre(); };
  };
  dessiner(); dlg.showModal();
  void rs;
}
function changerJour(l, i, apres) {
  const plan = planSemaine(l), cur = plan[i].map(e => e.split(':')[0]);
  const d2 = document.createElement('dialog'); document.body.appendChild(d2);
  d2.innerHTML = `<h3 style="margin-top:0">${JOURS[i]} ${dt(plus(l, i)).getDate()}</h3><p class="note">Coche ce que tu veux faire ce jour-là. Prévu au programme : ${esc(routineDe(l).jours[i].map(nomElement).join(' + '))}.</p>
    ${Object.keys(ELEMENTS).map(k => `<label class="item" style="padding:8px 12px;margin:5px 0"><input type="checkbox" value="${k}" ${cur.includes(k) ? 'checked' : ''} style="width:22px;height:22px;flex:none"><span class="txt">${ICO[k] || ''} ${ELEMENTS[k]}</span></label>`).join('')}
    <p id="cj-av" class="note"></p><div class="btns"><button type="button" id="cj-n">Annuler</button><button type="button" class="go" id="cj-o">Enregistrer</button></div>`;
  const verif = () => {
    const ch = [...d2.querySelectorAll('input:checked')].map(x => x.value), msgs = [];
    const avant = planSemaine(l).map(j => j.map(e => e.split(':')[0])); avant[i] = ch;
    const padel = k => k >= 0 && k < 7 && avant[k].includes('padel');
    if (ch.includes('padel') && ch.some(k => !['padel', 'test'].includes(k))) msgs.push('Le jour du padel : rien d\'autre que le padel.');
    if ((ch.includes('epaule') || ch.includes('combi')) && padel(i + 1)) msgs.push('Épaule la veille d\'un padel : à éviter.');
    if ((ch.includes('pub') || ch.includes('combi')) && padel(i + 1)) msgs.push('La veille du padel : plutôt les exercices verts.');
    const ep = avant.map((j, k) => j.includes('epaule') || j.includes('combi') ? k : -1).filter(k => k >= 0);
    for (let a = 1; a < ep.length; a++) if (ep[a] - ep[a - 1] < 2) msgs.push('Moins de 48 h entre deux séances d\'épaule.');
    const dur = ch.filter(k => SEANCES[k]).reduce((a, k) => a + duree(construire(k, 'normale', ctx())), 0);
    if (dur > 45) msgs.push('Ça fait environ ' + dur + ' min de séance ce jour-là (plus de 45 min). « Épaule + pubalgie » fait les deux en 45 min.');
    $('cj-av').innerHTML = msgs.map(m => '⚠️ ' + esc(m)).join('<br>');
  };
  d2.querySelectorAll('input').forEach(x => x.onchange = verif); verif();
  $('cj-n').onclick = () => { d2.close(); d2.remove(); };
  $('cj-o').onclick = () => {
    const ch = [...d2.querySelectorAll('input:checked')].map(x => x.value);
    const s = Object.assign({id: 's-' + l, type: 'semaine', date: l}, reglageSemaine(l), semaine(l) || {});
    s.jours = s.jours || [null, null, null, null, null, null, null];
    s.jours[i] = ch.length ? ch.sort((a, b) => a === 'test' ? -1 : b === 'test' ? 1 : 0) : ['repos'];
    R.put(s); d2.close(); d2.remove(); apres(); rendre();
  };
  d2.showModal();
}
function dialogue() {
  let d = $('dlg'); if (!d) { d = document.createElement('dialog'); d.id = 'dlg'; document.body.appendChild(d); }
  return d;
}
function bulle(t) { const d = document.createElement('div'); d.className = 'mh-bulle'; d.style.cssText = 'position:fixed;left:50%;bottom:calc(84px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);background:#2b2b2b;color:#fff;padding:10px 16px;border-radius:12px;z-index:300;font-weight:600;font-size:14px;max-width:90vw;text-align:center'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 2600); }

// ===== Test du ballon, padel (dialogues) =====
function dlgTest(s) {
  const d = dialogue(), j = jour(s);
  d.innerHTML = `<h3 style="margin-top:0">⚽ Test du ballon</h3><p class="note">Sur le dos, genoux pliés, ballon entre les genoux. Serre le plus fort possible 3 secondes, une seule fois. Douleur sur 10 :</p>
    <div class="dix">${[...Array(11).keys()].map(v => `<button type="button" data-v="${v}" class="${j.test === v ? 'on' : ''}">${v}</button>`).join('')}</div>
    <p class="note">0-2 feu vert · 3-4 prudence · 5 et plus : on allège</p><div class="btns"><button type="button" id="t-x">Fermer</button></div>`;
  d.querySelectorAll('.dix button').forEach(b => b.onclick = () => { setJour(s, {test: +b.dataset.v}); d.close(); rendre(); if (+b.dataset.v >= 5 || alerte()) bulle('Test noté. On allège quelques jours (voir Aujourd\'hui).'); });
  $('t-x').onclick = () => d.close(); d.showModal();
}
function dlgPadel(s, id) {
  const d = dialogue(), p = (id ? R.get(id) : parDate('padel', s)[0]) || {id: 'pa-' + R.id(), type: 'padel', date: s, manchons: true, genre: 'Tranquille'};
  d.innerHTML = `<h3 style="margin-top:0">🎾 Mon padel</h3>
    <label class="l">Date</label><input type="date" id="pa-date" value="${esc(p.date)}">
    <label class="l">Durée (minutes)</label><input type="number" inputmode="numeric" id="pa-duree" value="${esc(p.duree || '')}" placeholder="90">
    <label class="l">Type</label>${segHtml('genre', [['Cours', 'Cours'], ['Tranquille', 'Tranquille'], ['Match', 'Match']], p.genre)}
    <label class="l">Smashs main gauche</label><input type="number" inputmode="numeric" id="pa-sm" value="${esc(p.smashs == null ? '' : p.smashs)}" placeholder="10">
    <label class="l">Manchons au genou gauche</label>${segHtml('manchons', [[1, 'Oui'], [0, 'Non']], p.manchons ? 1 : 0)}
    <label class="l">Note</label><textarea id="pa-note" placeholder="Sensations, adducteur, genou…">${esc(p.note || '')}</textarea>
    <div class="btns">${R.get(p.id) ? '<button type="button" id="pa-del">Supprimer</button>' : ''}<button type="button" id="pa-n">Annuler</button><button type="button" class="go" id="pa-o">Enregistrer</button></div>`;
  d.querySelectorAll('.seg button').forEach(b => b.onclick = () => { b.parentNode.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); });
  const val = seg => { const b = d.querySelector(`[data-seg="${seg}"] .on`); return b ? b.dataset.v : null; };
  $('pa-n').onclick = () => d.close();
  if ($('pa-del')) $('pa-del').onclick = () => { if (confirm('Supprimer ce padel ?')) { R.del(p.id); d.close(); rendre(); } };
  $('pa-o').onclick = () => {
    Object.assign(p, {date: $('pa-date').value || s, duree: $('pa-duree').value ? +$('pa-duree').value : null, smashs: $('pa-sm').value === '' ? null : +$('pa-sm').value,
      genre: val('genre'), manchons: val('manchons') === '1', note: $('pa-note').value.trim()});
    R.put(p); d.close(); rendre();
  };
  d.showModal();
}

// ===== Séances (hors programme) =====
const ctx = () => { const r = reg(); return {cop: r.cop, semEp: semEp(), options: r.options !== false}; };
function vSeances() {
  const c = conseil(auj());
  const grp = [['Renforcement', ['pub', 'verts', 'epaule', 'combi']], ['Souplesse', ['soupleTout', 'soupleBas', 'soupleHaut']], ['Tous les jours et padel', ['pp', 'echauf']]];
  let h = `<p class="note">Hors programme : choisis la séance que tu veux faire maintenant. Le niveau se choisit juste avant de commencer.</p>`;
  const demainPadel = planJour(plus(auj(), 1)).some(e => e.startsWith('padel'));
  if (demainPadel) h += `<div class="banniere info">💡 Demain c'est padel : pas d'épaule aujourd'hui, seulement les exercices verts.</div>`;
  grp.forEach(([t, ks]) => {
    h += `<h2>${t}</h2><div class="liste-seances">` + ks.map(k => {
      const S = SEANCES[k], ds = ['douce', 'normale', 'forte'].map(n => duree(construire(k, n, ctx())));
      const dtxt = ds[0] === ds[2] ? ds[0] + ' min' : ds[0] + ' à ' + ds[2] + ' min';
      return `<div class="item" data-lancer="${k}"><div class="ico">${S.ico}</div><div class="txt"><b>${esc(S.nom)}</b><span class="note">${esc(S.txt)} · ${dtxt}</span></div><span style="font-size:22px;color:var(--muted)">›</span></div>`;
    }).join('') + '</div>';
  });
  h += `<h2>💬 La souplesse, pourquoi et quand ?</h2><div class="carte note" style="color:var(--fg)">
    <p style="margin-top:0">Oui, un peu de souplesse t'aide, à condition qu'elle soit douce. Ce qui est déconseillé pour l'instant, ce sont les étirements <b>forcés</b> des adducteurs (grand écart) : ils tirent sur la zone de la pubalgie.</p>
    <ul style="padding-left:20px"><li><b>Genou</b> : quadriceps, côté de la cuisse et mollets souples tirent moins sur la rotule.</li><li><b>Pubalgie et bassin</b> : le devant de la hanche et les fessiers raides font travailler le pubis de travers.</li><li><b>Plancher pelvien</b> : l'enfant, le bébé heureux et le papillon aident à le relâcher.</li><li><b>Épaules</b> : arrière de l'épaule et haut du dos pour le smash. Pour l'épaule droite (SLAP), jamais de bras tiré vers l'arrière ni au-dessus de la tête en force.</li></ul>
    <p style="margin-bottom:0"><b>Quand ?</b> Un jour de repos actif, ou le soir, 1 à 2 fois par semaine. Pas juste avant le padel (là, c'est l'échauffement qui bouge), et pas la veille d'un padel si tu sens que ça tire. Toujours 3/10 maximum, sans à-coups, 30 s par position.</p></div>`;
  vue().innerHTML = h;
  vue().querySelectorAll('[data-lancer]').forEach(b => b.onclick = () => {
    const k = b.dataset.lancer;
    if (demainPadel && (k === 'epaule' || k === 'combi') && !confirm('Demain c\'est padel : on évite l\'épaule la veille. Faire quand même la séance ?')) return;
    choisirNiveau(k, auj());
  });
}

// ===== Choix du niveau, puis séance guidée =====
function choisirNiveau(k, s, max) {
  const S = SEANCES[k], d = dialogue(), cons = conseil(s), ordre = ['douce', 'normale', 'forte'];
  let n = max && ordre.indexOf(cons) > ordre.indexOf(max) ? max : cons;
  const unique = ['pp', 'echauf'].includes(k);
  if (unique) { lancer(k, 'normale', s); return; }
  const T = tests(), t = T.length ? T[T.length - 1] : null;
  const dessiner = () => {
    const l = construire(k, n, ctx());
    d.innerHTML = `<h3 style="margin-top:0">${S.ico} ${esc(S.nom)}</h3>
      <p class="note" style="margin:0 0 8px">Comment tu te sens ? ${t ? 'Dernier test du ballon : ' + t.test + '/10 (' + court(t.date) + ').' : ''}</p>
      <div class="niv">${ordre.map(v => `<button type="button" data-n="${v}" class="${v === n ? 'on' : ''} ${v === cons ? 'conseille' : ''}"><span>${NIVEAUX[v].ico}</span>${NIVEAUX[v].nom}<small>${duree(construire(k, v, ctx()))} min</small></button>`).join('')}</div>
      <p class="note">${esc(NIVEAUX[n].txt)}${max && n !== 'douce' && ordre.indexOf(n) > ordre.indexOf(max) ? ' ⚠️ Aujourd\'hui, la routine conseille de ne pas forcer le rouge.' : ''}${rechute() && n !== 'douce' ? ' ⚠️ Tu es en période où on allège : Douce est conseillé.' : ''}</p>
      <p class="note" style="margin:6px 0"><b>🧰 Matériel :</b> ${esc(materiel(l).join(', ') || 'rien')}</p>
      <details><summary class="note">Voir les ${l.length} exercices (environ ${duree(l)} min)</summary><ol class="apercu note">${l.map(x => `<li>${COULEURS[EX[x.id].coul][0]} ${esc(EX[x.id].nom)} : ${esc(x.dose.d || '')}</li>`).join('')}</ol></details>
      <div class="btns"><button type="button" id="n-x">Annuler</button><button type="button" class="go" id="n-go" style="flex:1">▶ Commencer</button></div>`;
    d.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { n = b.dataset.n; dessiner(); });
    $('n-x').onclick = () => d.close();
    $('n-go').onclick = () => { d.close(); lancer(k, n, s); };
  };
  dessiner(); d.showModal();
}

// ---------- Lecteur de séance ----------
let L = null, minuteur = null, verrouEcran = null;
// ---------- Voix : l'appli parle pour qu'on n'ait pas à regarder le téléphone ----------
const VOIX = 'maison:renfo-voix';
const voixOn = () => { try { return localStorage.getItem(VOIX) !== '0'; } catch (e) { return true; } };
let voixFr = null;
function choisirVoix() { try { const v = speechSynthesis.getVoices(); voixFr = v.find(x => /^fr[-_](FR|BE)/i.test(x.lang) && /Google|Amélie|Thomas|Audrey|Marie/i.test(x.name)) || v.find(x => /^fr/i.test(x.lang)) || null; } catch (e) {} }
try { choisirVoix(); speechSynthesis.onvoiceschanged = choisirVoix; } catch (e) {}
function dire(t, garder) {
  if (!voixOn() || !('speechSynthesis' in window)) return false;
  try { if (!garder) speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = 'fr-FR'; if (voixFr) u.voice = voixFr; u.rate = 1.02; speechSynthesis.speak(u); return true; } catch (e) { return false; }
}
const NOMBRES = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf', 'vingt'];
const nb = n => NOMBRES[n] || String(n);
const enSec = s => s >= 60 ? (s % 60 ? Math.floor(s / 60) + ' minute ' + (s % 60) : (s / 60 === 1 ? 'une minute' : s / 60 + ' minutes')) : s + ' secondes';
const doseParlee = d => (d || '').replace(/ × /g, ' fois ').replace(/(\d+) s\b/g, '$1 secondes').replace(/(\d+) min\b/g, '$1 minutes').replace(/(\d+),(\d)/g, '$1 virgule $2');
function bip(long) {
  try { const a = bip.ctx || (bip.ctx = new (window.AudioContext || window.webkitAudioContext)()); const o = a.createOscillator(), g = a.createGain();
    o.frequency.value = long ? 660 : 880; g.gain.value = .15; o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime + (long ? .5 : .15)); } catch (e) {}
  try { navigator.vibrate && navigator.vibrate(long ? [200, 80, 200] : 120); } catch (e) {}
}
async function garderEcran() { try { if ('wakeLock' in navigator) verrouEcran = await navigator.wakeLock.request('screen'); } catch (e) {} }
document.addEventListener('visibilitychange', () => { if (L && document.visibilityState === 'visible') garderEcran(); });
function lancer(k, n, s) {
  L = {k, n, s, liste: construire(k, n, ctx()), i: 0, faits: {}, debut: Date.now(), ppFait: false, annonce: -1};
  $('lecteur').hidden = false; document.body.style.overflow = 'hidden'; document.body.classList.add('lecture'); garderEcran();
  L.st = etatEx();
  const mat = materiel(L.liste);
  if (!mat.length) { dire(SEANCES[k].nom + '. C\'est parti.'); dessinerEx(); return; }
  $('lect').innerHTML = `<div class="lh"><button type="button" class="lien" id="l-q0">✕ Fermer</button><span class="note">${L.liste.length} exercice${L.liste.length > 1 ? 's' : ''} · ~${duree(L.liste)} min</span></div>
    <h2 class="exnom" style="margin-top:14px">${SEANCES[k].ico} ${esc(SEANCES[k].nom)}</h2><p class="note" style="margin:0">${['pp', 'echauf'].includes(k) ? '' : 'Niveau ' + esc(NIVEAUX[n].nom)}</p>
    <h3>🧰 Prépare ton matériel</h3><div class="carte">${mat.map((m, i) => `<label class="item" style="padding:9px 12px;margin:5px 0"><input type="checkbox" data-m="${i}" style="width:22px;height:22px;flex:none"><span class="txt">${esc(m)}</span></label>`).join('')}</div>
    <button type="button" class="go bouton-plein" id="l-pret">▶ C'est prêt, on commence</button>`;
  $('lecteur').scrollTop = 0;
  dire(SEANCES[k].nom + '. Prépare ton matériel : ' + mat.map(m => m.replace(/\(.*?\)/g, '')).join(', ') + '.');
  $('l-q0').onclick = fermerLecteur;
  $('l-pret').onclick = () => { dire('C\'est parti.'); dessinerEx(); };
}
// Annonce le nouvel exercice à voix haute (une seule fois)
function annoncer() {
  if (L.annonce === L.i) return; L.annonce = L.i;
  const x = L.liste[L.i], e = EX[x.id];
  if (e.type === 'pp') return dire('Plancher pelvien. Installe-toi sur le dos, une main sur le ventre. Touche Commencer quand tu es prêt.', true);
  dire((L.i ? 'Exercice suivant : ' : '') + e.nom + '. ' + (x.dose.txt ? x.dose.txt + '. ' : '') + doseParlee(x.dose.d) + '.', true);
}
function etatEx() { return {cote: 0, serie: 1, phase: 'pret', reste: 0, rep: 1}; }
const tempo = id => TEMPO[id] || 3;
const stop = () => { clearInterval(minuteur); clearTimeout(minuteur); minuteur = null; if (L && L.tm) { L.tm.forEach(clearTimeout); L.tm = []; } };
const plusTard = (f, ms) => { L.tm = L.tm || []; L.tm.push(setTimeout(f, ms)); };
function fermerLecteur() {
  stop(); clearTimeout(minuteur); try { speechSynthesis.cancel(); } catch (e) {} $('lecteur').hidden = true; document.body.style.overflow = ''; document.body.classList.remove('lecture'); L = null;
  try { verrouEcran && verrouEcran.release(); } catch (e) {} verrouEcran = null; rendre();
}
function dessinerEx() {
  stop();
  const x = L.liste[L.i], e = EX[x.id], ds = x.dose, st = L.st, n = L.liste.length;
  const reste = L.liste.slice(L.i).reduce((a, y) => a + (y.dose.m || 0), 0);
  const cotes = ds.c === 2 ? ['côté gauche', 'côté droit'] : [''];
  let h = `<div class="lh"><button type="button" class="lien" id="l-q">✕ Arrêter</button><button type="button" class="lien" id="l-voix">${voixOn() ? '🔊 Voix' : '🔇 Muet'}</button><span class="note">${L.i + 1} / ${n} · encore ~${Math.round(reste)} min</span></div>
    <div class="prog"><i style="width:${(L.i / n) * 100}%"></i></div>
    <span class="pill">${COULEURS[e.coul][0]} ${COULEURS[e.coul][1]}</span>${e.bloc ? ` <span class="pill">${esc(e.bloc)}</span>` : ''}
    <h2 class="exnom">${esc(e.nom)}</h2>${e.quoi ? `<p class="note" style="margin:0">${esc(e.quoi)}</p>` : ''}
    ${ds.txt ? `<p style="margin:8px 0 0;font-weight:600">${esc(ds.txt)}</p>` : ''}
    <div class="dose">${esc(ds.d || '')}</div>`;
  // Zone d'action
  if (e.type === 'test') {
    const t = jour(L.s).test;
    h += `<div class="carte"><b>Douleur sur 10</b><div class="dix" style="margin-top:8px">${[...Array(11).keys()].map(v => `<button type="button" data-t="${v}" class="${t === v ? 'on' : ''}">${v}</button>`).join('')}</div><p class="note" style="margin-bottom:0">0-2 feu vert · 3-4 prudence, pas de hausse · 5 et plus : on allège</p></div>`;
  } else if (e.type === 'pp') {
    h += zonePP();
  } else if (e.type === 'etapes') {
    const et = e.etapes[st.rep - 1] || e.etapes[0];
    h += `<div class="chrono"><div class="gros" id="c-n">${st.phase === 'pret' ? fmt(et[1]) : fmt(st.reste)}</div><div class="quoi">${esc(et[0])}</div><div class="sous">Étape ${st.rep} / ${e.etapes.length}</div></div>
      <button type="button" class="go bouton-plein" id="c-go">${st.phase === 'pret' ? '▶ Démarrer' : st.phase === 'pause' ? '▶ Reprendre' : '⏸ Pause'}</button>`;
  } else if (ds.t) {
    const tot = ds.r > 1 ? ` · tenue ${st.rep} / ${ds.r}` : '';
    const lab = st.phase === 'tenue' ? (x.id === 'p8' ? 'Serre !' : 'Tiens !') : st.phase === 'relache' ? 'Relâche' : st.phase === 'repos' ? 'Repos' : st.phase === 'fini' ? 'Terminé ✓' : 'Prêt ?';
    h += `<div class="chrono"><div class="gros" id="c-n">${st.phase === 'pret' ? fmt(ds.t) : st.phase === 'fini' ? '✓' : fmt(st.reste)}</div><div class="quoi" id="c-q">${lab}</div><div class="sous">Série ${Math.min(st.serie, ds.s)} / ${ds.s}${cotes[st.cote] ? ' · ' + cotes[st.cote] : ''}${tot}</div></div>
      ${st.phase === 'fini' ? '' : `<button type="button" class="go bouton-plein" id="c-go">${st.phase === 'pret' ? '▶ Démarrer' : st.phase === 'pause' ? '▶ Reprendre' : '⏸ Pause'}</button>`}`;
  } else if (ds.s) {
    const enRepos = st.phase === 'repos', compte = st.phase === 'compte' || st.phase === 'pausec';
    h += `<div class="chrono"><div class="gros" id="c-n">${st.phase === 'fini' ? '✓' : enRepos ? fmt(st.reste) : compte ? st.rep : (ds.r > 1 ? ds.r : '')}</div><div class="quoi">${st.phase === 'fini' ? 'Terminé ✓' : enRepos ? 'Repos' : compte ? 'sur ' + ds.r : (ds.r > 1 ? 'répétitions' : 'série')}</div><div class="sous">Série ${Math.min(st.serie, ds.s)} / ${ds.s}${cotes[st.cote] ? ' · ' + cotes[st.cote] : ''}${ds.r > 1 ? ' · une répétition toutes les ' + tempo(x.id) + ' s' : ''}</div></div>
      ${st.phase === 'fini' ? '' : enRepos ? `<button type="button" class="go bouton-plein" id="c-ok">⏭ Passer le repos</button>`
        : ds.r > 1 ? `<button type="button" class="go bouton-plein" id="c-cpt">${st.phase === 'compte' ? '⏸ Pause' : st.phase === 'pausec' ? '▶ Reprendre' : '🔊 Démarrer, je compte pour toi'}</button><button type="button" class="bouton-plein" id="c-ok">✓ Série faite (j'ai compté seul)</button>`
        : `<button type="button" class="go bouton-plein" id="c-ok">✓ Série faite</button>`}`;
  } else {
    h += `<p class="note">Fais l'exercice à ton rythme, puis passe au suivant.</p>`;
  }
  h += `<ol class="etapes">${(e.comment || []).map(t => `<li>${esc(t)}</li>`).join('')}</ol>
    ${e.conseil ? `<div class="conseil">💡 ${esc(e.conseil)}</div>` : ''}${e.eviter ? `<div class="eviter">⛔ À éviter : ${esc(e.eviter)}</div>` : ''}
    ${e.video ? `<p class="note"><a href="${VIDEO}" target="_blank" rel="noopener">▶ Voir la vidéo Clairefontaine</a></p>` : ''}
    ${x.id === 'p6b' ? `<div class="carte"><b>Genou gauche après la descente</b>${segHtml('genou-marche', DOUL, (jour(L.s).d || {}).genou, 'douleur')}</div>` : ''}
    ${e.copenhague ? `<p class="note">Étape actuelle : ${ds.etape}/4. <button type="button" class="lien" id="c-cop">Changer d'étape</button></p>` : ''}
    <div class="bas-lecteur"><button type="button" id="l-av" ${L.i ? '' : 'disabled'}>‹ Précédent</button><button type="button" class="${st.phase === 'fini' || e.type === 'test' ? 'go' : ''}" id="l-ap">${L.i === n - 1 ? 'Terminer ✓' : 'Suivant ›'}</button></div>`;
  $('lect').innerHTML = h; $('lecteur').scrollTop = 0;
  $('l-q').onclick = () => { if (Object.keys(L.faits).length === 0 || confirm('Arrêter la séance ? Ce qui est fait sera enregistré.')) finir(true); };
  $('l-voix').onclick = () => { try { localStorage.setItem(VOIX, voixOn() ? '0' : '1'); } catch (er) {} if (!voixOn()) try { speechSynthesis.cancel(); } catch (er) {} $('l-voix').textContent = voixOn() ? '🔊 Voix' : '🔇 Muet'; };
  $('l-av').onclick = () => { L.i--; L.st = etatEx(); dessinerEx(); };
  $('l-ap').onclick = () => { L.faits[x.id] = 1; suivant(); };
  $('lect').querySelectorAll('[data-t]').forEach(b => b.onclick = () => { setJour(L.s, {test: +b.dataset.t}); L.faits.p0 = 1; dessinerEx(); });
  $('lect').querySelectorAll('[data-seg="genou-marche"] button').forEach(b => b.onclick = () => { const j = jour(L.s), d = Object.assign({}, j.d || {}); d.genou = +b.dataset.v; setJour(L.s, {d}); dessinerEx(); });
  if ($('c-cop')) $('c-cop').onclick = () => { const v = prompt('Étape du Copenhague (1 à 4) :', ds.etape); if (v && +v >= 1 && +v <= 4) { setReg({cop: +v}); L.liste[L.i] = construire(L.k, L.n, ctx()).find(y => y.id === 'p10') || x; L.st = etatEx(); dessinerEx(); } };
  if ($('c-ok')) $('c-ok').onclick = () => { stop(); serieFaite(); };
  if ($('c-cpt')) $('c-cpt').onclick = () => { if (st.phase === 'compte') { st.phase = 'pausec'; stop(); dire('Pause'); dessinerEx(); } else compter(); };
  if (st.phase === 'fini' && !st.suiteLancee) suite();
  annoncer();
  if ($('c-go')) $('c-go').onclick = () => { if (st.phase === 'pret' || st.phase === 'pause') demarrer(); else { st.phase = 'pause'; stop(); dessinerEx(); } };
  if (e.type === 'pp') brancherPP();
}
// Compte les répétitions à voix haute, au rythme de l'exercice, puis enchaîne repos et série suivante
function compter() {
  const x = L.liste[L.i], ds = x.dose, st = L.st, cotes = ds.c === 2 ? ['côté gauche', 'côté droit'] : [''];
  const reprise = st.phase === 'pausec';
  st.phase = 'compte'; if (!reprise) st.rep = 0;
  dessinerEx();
  if (!reprise) dire((ds.s > 1 ? 'Série ' + nb(st.serie) + '. ' : '') + (cotes[st.cote] ? cotes[st.cote] + '. ' : '') + 'Prêt ? Partez.');
  stop();
  const un = () => {
    if (!L || L.liste[L.i] !== x || st.phase !== 'compte') return;
    st.rep++; const c = $('c-n'); if (c) c.textContent = st.rep;
    if (!dire(nb(st.rep))) bip();
    if (st.rep >= ds.r) { stop(); setTimeout(() => { if (L && L.liste[L.i] === x && st.phase === 'compte') serieFaite(); }, tempo(x.id) * 600); }
  };
  setTimeout(() => { if (st.phase === 'compte' && !minuteur) { un(); minuteur = setInterval(un, tempo(x.id) * 1000); } }, reprise ? 300 : 2200);
}
// Exercice fini : on annonce le suivant et on y passe tout seul après 20 s (le temps de s'installer)
function suite() {
  const st = L.st; st.suiteLancee = true;
  if (L.i >= L.liste.length - 1) { dire('Dernier exercice terminé. Bravo ! Touche Terminer.'); return; }
  const nx = L.liste[L.i + 1], e = EX[nx.id];
  dire('Terminé. Prochain exercice dans 20 secondes : ' + e.nom + '.');
  let r = 20; const i0 = L.i;
  const b = document.createElement('div'); b.className = 'banniere info'; b.id = 'suite';
  b.innerHTML = `⏭ <b>${esc(e.nom)}</b> dans <b id="s-n">20</b> s <button type="button" class="lien" id="s-stop">Attendre</button>`;
  $('lect').querySelector('.bas-lecteur').before(b);
  $('s-stop').onclick = () => { stop(); b.remove(); dire('D\'accord, touche Suivant quand tu es prêt.'); };
  stop();
  minuteur = setInterval(() => {
    if (!L || L.i !== i0) { stop(); return; }
    r--; const n = $('s-n'); if (n) n.textContent = r;
    if (r === 5) dire('5 secondes. Mets-toi en place.');
    if (r <= 0) { stop(); L.faits[L.liste[L.i].id] = 1; L.i++; L.st = etatEx(); dessinerEx(); }
  }, 1000);
}
const fmt = s => s >= 60 ? Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') : String(s);
function tic(fin) {
  stop();
  minuteur = setInterval(() => {
    L.st.reste--; const c = $('c-n'); if (c) c.textContent = fmt(Math.max(0, L.st.reste));
    if (L.st.reste <= 3 && L.st.reste > 0) { if (!dire(nb(L.st.reste))) bip(); }
    else if (L.st.phase === 'repos' && L.st.reste === 10) dire('10 secondes');
    if (L.st.reste <= 0) { stop(); fin(); }
  }, 1000);
}
function serieFaite() {
  const x = L.liste[L.i], ds = x.dose, st = L.st;
  if (st.phase === 'repos') { stop(); avancerSerie(); return; }
  L.faits[x.id] = 1;
  const derniere = st.serie >= ds.s && st.cote >= (ds.c === 2 ? 1 : 0);
  if (st.phase === 'compte') st.auto = true;
  if (derniere) { st.phase = 'fini'; bip(true); dessinerEx(); return; }
  if (ds.p) { st.phase = 'repos'; st.reste = ds.p; dire('Repos, ' + enSec(ds.p) + '.'); dessinerEx(); tic(() => { bip(true); avancerSerie(); }); }
  else avancerSerie();
}
function avancerSerie() {
  const ds = L.liste[L.i].dose, st = L.st;
  // On fait toutes les séries d'un côté, puis de l'autre
  if (st.serie < ds.s) st.serie++; else { st.serie = 1; st.cote++; }
  st.phase = ds.t ? 'pret' : 'go'; st.rep = 1; dessinerEx();
  if (ds.t) demarrer(); // les séries suivantes s'enchaînent toutes seules
  else if (ds.r > 1 && st.auto) compter();
}
function demarrer() {
  const x = L.liste[L.i], e = EX[x.id], ds = x.dose, st = L.st;
  if (e.type === 'etapes') {
    if (st.phase !== 'pause') { st.reste = e.etapes[st.rep - 1][1]; dire(e.etapes[st.rep - 1][0] + ', ' + enSec(st.reste) + '.'); }
    st.phase = 'go'; dessinerEx();
    tic(() => { bip(true); L.faits[x.id] = 1; if (st.rep < e.etapes.length) { st.rep++; st.phase = 'pret'; demarrer(); } else { st.phase = 'fini'; dessinerEx(); } });
    return;
  }
  const cotesD = ds.c === 2 ? ['côté gauche. ', 'côté droit. '] : [''];
  if (st.phase === 'pause' && st.ph2) { st.phase = st.ph2; } else { st.phase = 'tenue'; st.reste = ds.t; dire((ds.s > 1 && st.rep === 1 ? 'Série ' + nb(st.serie) + ', ' : '') + (st.rep === 1 ? cotesD[st.cote] : '') + (x.id === 'p8' ? 'Serre' : 'Tiens') + ', ' + enSec(ds.t) + '.'); }
  dessinerEx();
  const apresTenue = () => {
    bip(true); L.faits[x.id] = 1;
    if (st.rep < (ds.r || 1)) { st.phase = 'relache'; st.ph2 = 'relache'; st.reste = ds.rel || 5; dire('Relâche.'); dessinerEx(); tic(() => { st.rep++; st.phase = 'tenue'; st.ph2 = 'tenue'; st.reste = ds.t; dire((x.id === 'p8' ? 'Serre' : 'Tiens') + '. ' + nb(st.rep) + ' sur ' + nb(ds.r) + '.'); dessinerEx(); tic(apresTenue); }); return; }
    const derniere = st.serie >= ds.s && st.cote >= (ds.c === 2 ? 1 : 0);
    if (derniere) { st.phase = 'fini'; dessinerEx(); return; }
    if (ds.p) { st.phase = 'repos'; st.ph2 = 'repos'; st.reste = ds.p; dire('Repos, ' + enSec(ds.p) + '.'); dessinerEx(); tic(() => { bip(true); avancerSerie(); }); }
    else avancerSerie();
  };
  st.ph2 = st.phase;
  if (st.phase === 'tenue') tic(apresTenue);
  else if (st.phase === 'relache') tic(() => { st.rep++; st.phase = 'tenue'; st.reste = ds.t; dessinerEx(); tic(apresTenue); });
  else if (st.phase === 'repos') tic(() => { bip(true); avancerSerie(); });
}
// Plancher pelvien : 10 respirations (4 s / 7 s), puis bébé heureux et papillon (1 min chacun)
function zonePP() {
  const st = L.st;
  if (st.phase === 'fini') return `<div class="chrono"><div class="gros">✓</div><div class="quoi">Bravo, c'est fait</div></div>`;
  if (st.pp === 'posture') return `<div class="chrono"><div class="gros" id="c-n">${fmt(st.reste)}</div><div class="quoi">${st.rep === 1 ? 'Bébé heureux' : 'Papillon'}</div><div class="sous">${st.rep === 1 ? 'Sur le dos, mains sur les pieds, genoux vers les aisselles' : 'Assis, plantes des pieds collées, genoux qui tombent'} · respire pareil</div></div>`;
  return `<div class="souffle ${st.souffle || ''}" id="souffle"></div><div class="chrono"><div class="quoi" id="pp-q">${st.phase === 'pret' ? 'Installe-toi' : st.souffle === 'in' ? 'Inspire par le nez… le ventre gonfle' : 'Expire par la bouche… doucement'}</div><div class="sous" id="pp-s">${st.phase === 'pret' ? '10 respirations, puis 2 postures' : 'Respiration ' + st.rep + ' / 10'}</div></div>
    ${st.phase === 'pret' ? '<button type="button" class="go bouton-plein" id="pp-go">▶ Commencer</button>' : ''}`;
}
function brancherPP() {
  const st = L.st;
  if ($('pp-go')) $('pp-go').onclick = () => { st.phase = 'go'; st.rep = 1; respirer(); };
}
function respirer() {
  const st = L.st, x = L.liste[L.i];
  if (!L || EX[x.id].type !== 'pp') return;
  stop();
  const cycle = () => {
    if (!L || L.liste[L.i] !== x) return;
    st.souffle = 'in'; dessinerEx();
    dire(st.rep === 1 ? 'Inspire par le nez, le ventre gonfle' : 'Inspire');
    [2, 3, 4].forEach(k => plusTard(() => dire(nb(k), true), (k - 1) * 1000 + (st.rep === 1 ? 600 : 0)));
    requestAnimationFrame(() => { const b = $('souffle'); if (b) { b.classList.remove('out'); b.classList.add('in'); } });
    minuteur = setTimeout(() => {
      if (!L || L.liste[L.i] !== x) return;
      st.souffle = 'out'; const b = $('souffle'), q = $('pp-q');
      if (b) { b.style.transitionDuration = '7s'; b.classList.remove('in'); b.classList.add('out'); }
      if (q) q.textContent = 'Expire par la bouche… doucement';
      dire(st.rep === 1 ? 'Expire doucement par la bouche' : 'Expire');
      [2, 3, 4, 5, 6, 7].forEach(k => plusTard(() => dire(nb(k), true), (k - 1) * 1000 + (st.rep === 1 ? 600 : 0)));
      minuteur = setTimeout(() => {
        if (!L || L.liste[L.i] !== x) return;
        if (st.rep < 10) { st.rep++; cycle(); }
        else { bip(true); st.pp = 'posture'; st.rep = 1; st.reste = 60; dire('Très bien. Maintenant, bébé heureux, pendant une minute. Sur le dos, mains sur les pieds, genoux vers les aisselles. Continue à respirer pareil.'); dessinerEx(); posture(); }
      }, 7000);
    }, 4000);
  };
  cycle();
}
function posture() {
  const st = L.st;
  tic(() => { bip(true); if (st.rep === 1) { st.rep = 2; st.reste = 60; dire('Papillon, une minute. Assis, plantes des pieds collées, laisse tomber les genoux.'); dessinerEx(); posture(); } else { st.phase = 'fini'; L.faits.pp = 1; L.ppFait = true; setJour(L.s, {pp: true}); dire('C\'est fini. Bravo.'); dessinerEx(); } });
  plusTard(() => dire('Encore 30 secondes', true), 30000);
}
// stop() doit aussi arrêter les setTimeout de la respiration
const stopInterval = stop;
void stopInterval;
function suivant() {
  stop(); clearTimeout(minuteur);
  if (L.i < L.liste.length - 1) { L.i++; L.st = etatEx(); dessinerEx(); }
  else finir(false);
}
function finir(arret) {
  stop(); clearTimeout(minuteur);
  const faits = Object.keys(L.faits).length;
  if (!faits) { fermerLecteur(); return; }
  if (L.faits.pp) setJour(L.s, {pp: true});
  const rec = {id: 'se-' + R.id(), type: 'seance', date: L.s, cle: L.k, niveau: L.n, duree: Math.max(1, Math.round((Date.now() - L.debut) / 60000)), faits, total: L.liste.length, ppFait: !!L.faits.pp};
  R.put(rec);
  if (['pp', 'echauf'].includes(L.k)) { bulle('Enregistré ✓'); fermerLecteur(); return; }
  $('lect').innerHTML = `<div style="text-align:center;padding-top:30px"><div style="font-size:64px">${arret ? '👍' : '🎉'}</div><h2>${arret ? 'Séance arrêtée' : 'Séance terminée !'}</h2>
    <p class="note">${faits} exercice${faits > 1 ? 's' : ''} sur ${L.liste.length} · ${rec.duree} min</p></div>
    <div class="carte"><b>Comment tu te sens après ?</b>${segHtml('ressenti', [['Très bien', 'Très bien'], ['Ça va', 'Ça va'], ['Un peu mal', 'Un peu mal'], ['Mal', 'Mal']], '')}
    <p class="note">Douleur 3/10 maximum, revenue à la normale demain matin. Sinon, la prochaine fois : niveau Douce.</p></div>
    <button type="button" class="go bouton-plein" id="f-ok">Fermer</button>`;
  $('lect').querySelectorAll('[data-seg] button').forEach(b => b.onclick = () => { rec.ressenti = b.dataset.v; R.put(rec); b.parentNode.querySelectorAll('button').forEach(y => y.classList.toggle('on', y === b)); });
  $('f-ok').onclick = fermerLecteur;
}

// ===== Journal =====
function vJournal() {
  const s = jSel, j = jour(s), sel = parDate('selle', s).sort((a, b) => (a.heure || '').localeCompare(b.heure || '')), se = parDate('seance', s), pa = parDate('padel', s);
  let h = `<div class="carte" style="display:flex;align-items:center;justify-content:space-between;gap:8px"><button type="button" id="j-av">‹</button><div style="text-align:center"><b>${esc(joli(s))}</b><div class="note">${s === auj() ? 'Aujourd\'hui' : '<button type="button" class="lien" id="j-auj">Revenir à aujourd\'hui</button>'}</div></div><button type="button" id="j-ap" ${s >= auj() ? 'disabled' : ''}>›</button></div>`;
  h += `<h2>Douleurs</h2><div class="carte">${ZONES.map(([k, t]) => `<label class="l">${t}</label>${segHtml('d-' + k, DOUL, j.d ? j.d[k] : '', 'douleur')}`).join('')}
    <label class="l">Test du ballon (sur 10)</label><div class="dix" id="j-test">${[...Array(11).keys()].map(v => `<button type="button" data-v="${v}" class="${j.test === v ? 'on' : ''}">${v}</button>`).join('')}</div>
    <label class="l">« Cloc » de l'épaule gauche cette nuit</label>${segHtml('cloc', [['oui', 'Oui'], ['non', 'Non']], j.cloc || '')}
    <label class="item" style="margin-top:12px;padding:10px 12px"><input type="checkbox" id="j-pp" ${j.pp ? 'checked' : ''} style="width:22px;height:22px;flex:none"><span class="txt">🌬️ Plancher pelvien fait</span></label></div>`;
  if (s !== auj()) h += `<h2>🚽 Selles</h2><div class="carte">${blocSelles(s)}</div>`;
  else h += `<p class="note">🚽 Les selles d'aujourd'hui se notent dans <a href="#aujourdhui">Aujourd'hui</a>.</p>`;
  h += `<h2>Activité</h2><div class="carte">${se.length || pa.length ? '' : '<p class="note" style="margin:0">Aucune séance notée.</p>'}
    ${se.map(x => `<div class="selle"><span>${(SEANCES[x.cle] || {}).ico || ''} <b>${esc((SEANCES[x.cle] || {}).nom || x.cle)}</b> · ${esc((NIVEAUX[x.niveau] || {}).nom || '')} · ${x.duree} min${x.ressenti ? ' · ' + esc(x.ressenti) : ''}</span><button type="button" data-se="${x.id}">🗑</button></div>`).join('')}
    ${pa.map(x => `<div class="selle"><span>🎾 <b>Padel</b> · ${esc(resumePadel(x))}</span><button type="button" data-pa="${x.id}">✎</button></div>`).join('')}
    <div class="btns"><button type="button" id="j-padel">＋ Padel</button><button type="button" id="j-fait">＋ Séance faite sans l'appli</button></div></div>`;
  h += `<h2>Note</h2><textarea id="j-note" placeholder="Sensations, ce qui a aidé, ce qui a gêné…">${esc(j.note || '')}</textarea>`;
  vue().innerHTML = h;
  $('j-av').onclick = () => { jSel = plus(jSel, -1); rendre(); };
  $('j-ap').onclick = () => { jSel = plus(jSel, 1); rendre(); };
  if ($('j-auj')) $('j-auj').onclick = () => { jSel = auj(); rendre(); };
  brancherSeg(s);
  vue().querySelectorAll('#j-test button').forEach(b => b.onclick = () => { setJour(s, {test: j.test === +b.dataset.v ? null : +b.dataset.v}); rendre(); });
  vue().querySelectorAll('[data-seg="cloc"] button').forEach(b => b.onclick = () => { setJour(s, {cloc: j.cloc === b.dataset.v ? '' : b.dataset.v}); rendre(); });
  $('j-pp').onchange = e => setJour(s, {pp: e.target.checked});
  $('j-note').onchange = e => setJour(s, {note: e.target.value.trim()});
  brancherSelles(s);
  vue().querySelectorAll('[data-pa]').forEach(b => b.onclick = () => dlgPadel(s, b.dataset.pa));
  vue().querySelectorAll('[data-se]').forEach(b => b.onclick = () => { if (confirm('Supprimer cette séance du journal ?')) { R.del(b.dataset.se); rendre(); } });
  $('j-padel').onclick = () => dlgPadel(s, 'nouveau');
  $('j-fait').onclick = () => dlgSeanceFaite(s);
}
// Selles du jour : liste des passages + boutons (dans Aujourd'hui, et dans le Journal pour les jours passés)
function blocSelles(s) {
  const j = jour(s), sel = parDate('selle', s).sort((a, b) => (a.heure || '').localeCompare(b.heure || ''));
  return `${sel.length ? sel.map(x => `<div class="selle"><span><b>${esc(x.heure || '')}</b> ${esc([x.aide, x.consist, x.passage].filter(Boolean).join(' · '))}${x.note ? '<br><span class="note">' + esc(x.note) + '</span>' : ''}</span><button type="button" data-sl="${x.id}">✎</button></div>`).join('') : `<p class="note" style="margin:4px 0 0">${j.sansSelle ? 'Pas de selle ce jour-là.' : 'Rien de noté.'}</p>`}
    <div class="btns"><button type="button" class="go" id="j-selle">＋ Noter un passage</button>${sel.length ? '' : `<button type="button" id="j-sans">${j.sansSelle ? 'Annuler « pas de selle »' : (s === auj() ? 'Pas de selle aujourd\'hui' : 'Pas de selle ce jour-là')}</button>`}</div>`;
}
function brancherSelles(s) {
  if ($('j-selle')) $('j-selle').onclick = () => dlgSelle(s);
  if ($('j-sans')) $('j-sans').onclick = () => { setJour(s, {sansSelle: !jour(s).sansSelle}); rendre(); };
  vue().querySelectorAll('[data-sl]').forEach(b => b.onclick = () => dlgSelle(s, b.dataset.sl));
}
function dlgSelle(s, id) {
  const d = dialogue(), now = new Date();
  const x = (id && R.get(id)) || {id: 'sl-' + R.id(), type: 'selle', date: s, heure: s === auj() ? String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0') : ''};
  d.innerHTML = `<h3 style="margin-top:0">🚽 Passage aux toilettes</h3>
    <label class="l">Heure</label><input type="time" id="sl-h" value="${esc(x.heure || '')}">
    <label class="l">Aide</label>${segHtml('aide', [['Sans aide', 'Sans aide'], ['Poire', 'Poire'], ['Lavement', 'Lavement']], x.aide || '')}
    <label class="l">Selles</label>${segHtml('consist', [['Dures', 'Dures'], ['Normales', 'Normales'], ['Molles', 'Molles'], ['Liquides', 'Liquides']], x.consist || '')}
    <label class="l">Passage</label>${segHtml('passage', [['Facile', 'Facile'], ['Difficile', 'Difficile'], ['Douloureux', 'Douloureux']], x.passage || '')}
    <label class="l">Note</label><input id="sl-n" value="${esc(x.note || '')}" placeholder="Sphincter serré, eau bue, argile…">
    <div class="btns">${id ? '<button type="button" id="sl-del">Supprimer</button>' : ''}<button type="button" id="sl-x">Annuler</button><button type="button" class="go" id="sl-o">Enregistrer</button></div>`;
  d.querySelectorAll('.seg button').forEach(b => b.onclick = () => b.parentNode.querySelectorAll('button').forEach(y => y.classList.toggle('on', y === b && !y.classList.contains('on'))));
  const val = k => { const b = d.querySelector(`[data-seg="${k}"] .on`); return b ? b.dataset.v : ''; };
  $('sl-x').onclick = () => d.close();
  if ($('sl-del')) $('sl-del').onclick = () => { R.del(x.id); d.close(); rendre(); };
  $('sl-o').onclick = () => { Object.assign(x, {heure: $('sl-h').value, aide: val('aide'), consist: val('consist'), passage: val('passage'), note: $('sl-n').value.trim()}); R.put(x); if (jour(s).sansSelle) setJour(s, {sansSelle: false}); d.close(); rendre(); };
  d.showModal();
}
function dlgSeanceFaite(s) {
  const d = dialogue();
  d.innerHTML = `<h3 style="margin-top:0">Séance faite sans l'appli</h3><label class="l">Séance</label><select id="sf-k">${Object.keys(SEANCES).map(k => `<option value="${k}">${esc(SEANCES[k].nom)}</option>`).join('')}</select>
    <label class="l">Niveau</label>${segHtml('niv', Object.keys(NIVEAUX).map(k => [k, NIVEAUX[k].nom]), 'normale')}
    <label class="l">Durée (min)</label><input type="number" id="sf-d" inputmode="numeric" placeholder="40">
    <div class="btns"><button type="button" id="sf-x">Annuler</button><button type="button" class="go" id="sf-o">Ajouter</button></div>`;
  d.querySelectorAll('.seg button').forEach(b => b.onclick = () => b.parentNode.querySelectorAll('button').forEach(y => y.classList.toggle('on', y === b)));
  $('sf-x').onclick = () => d.close();
  $('sf-o').onclick = () => { const k = $('sf-k').value, n = (d.querySelector('[data-seg="niv"] .on') || {dataset: {v: 'normale'}}).dataset.v, l = construire(k, n, ctx());
    R.put({id: 'se-' + R.id(), type: 'seance', date: s, cle: k, niveau: n, duree: +$('sf-d').value || duree(l), faits: l.length, total: l.length, ppFait: SEANCES[k].liste.includes('pp')});
    if (SEANCES[k].liste.includes('pp')) setJour(s, {pp: true}); d.close(); rendre(); };
  d.showModal();
}

// ===== Suivi =====
function joursPeriode(n, fin) { const o = []; fin = fin || auj(); for (let i = n - 1; i >= 0; i--) o.push(plus(fin, -i)); return o; }
function semainesPeriode(n) { const fin = lundiDe(auj()), o = []; const k = Math.ceil(n / 7); for (let i = k - 1; i >= 0; i--) o.push(plus(fin, -7 * i)); return o; }
const moy = a => { const v = a.filter(x => x != null && !isNaN(x)); return v.length ? v.reduce((p, x) => p + x, 0) / v.length : null; };
const f1 = v => v == null ? '–' : (Math.round(v * 10) / 10).toString().replace('.', ',');
function stats(js) {
  const J = js.map(jour), aine = J.map(j => j.d ? j.d.aine : null), notes = J.filter(j => j.d && ZONES.some(([k]) => j.d[k] != null));
  const sel = R.tous('selle').filter(x => js.includes(x.date));
  return {
    aine: moy(aine), genou: moy(J.map(j => j.d ? j.d.genou : null)), epG: moy(J.map(j => j.d ? j.d.epG : null)), epD: moy(J.map(j => j.d ? j.d.epD : null)),
    sansDouleur: notes.length ? notes.filter(j => ZONES.every(([k]) => !j.d[k])).length / notes.length : null, nNotes: notes.length,
    padels: R.tous('padel').filter(p => js.includes(p.date)).length,
    seances: R.tous('seance').filter(p => js.includes(p.date) && !['pp', 'echauf'].includes(p.cle)).length,
    pp: J.filter(j => j.pp).length,
    selles: sel.length, sansAide: sel.length ? sel.filter(x => x.aide === 'Sans aide').length / sel.length : null,
    dures: sel.length ? sel.filter(x => x.consist === 'Dures').length / sel.length : null,
    test: moy(J.map(j => j.test))
  };
}
function vSuivi() {
  const P = [[30, '1 mois'], [91, '3 mois'], [182, '6 mois'], [365, '1 an']];
  const js = joursPeriode(periode), av = joursPeriode(periode, plus(auj(), -periode)), a = stats(js), b = stats(av);
  const pct = v => v == null ? '–' : Math.round(v * 100) + ' %';
  const diff = (x, y, inv, p) => { if (x == null || y == null) return ''; const d = x - y; if (Math.abs(d) < (p ? .02 : .05)) return 'pareil qu\'avant'; const mieux = inv ? d > 0 : d < 0; return (mieux ? '✅ ' : '⚠️ ') + (d > 0 ? '+' : '') + (p ? Math.round(d * 100) + ' pts' : f1(d)) + ' vs avant'; };
  let h = `<div class="seg" id="per">${P.map(([n, t]) => `<button type="button" data-p="${n}" class="${periode === n ? 'on' : ''}">${t}</button>`).join('')}</div>`;
  h += `<h2>En résumé</h2><div class="tuiles">
    <div class="tuile"><div class="v">${f1(a.aine)}</div><div class="t">Douleur aine moyenne (0 à 3)</div><div class="d">${diff(a.aine, b.aine)}</div></div>
    <div class="tuile"><div class="v">${f1(a.genou)}</div><div class="t">Douleur genou moyenne</div><div class="d">${diff(a.genou, b.genou)}</div></div>
    <div class="tuile"><div class="v">${pct(a.sansDouleur)}</div><div class="t">Jours sans aucune douleur (${a.nNotes} jours notés)</div><div class="d">${diff(a.sansDouleur, b.sansDouleur, true, true)}</div></div>
    <div class="tuile"><div class="v">${a.padels}</div><div class="t">Padels</div><div class="d">${b.padels} la période d'avant</div></div>
    <div class="tuile"><div class="v">${a.seances}</div><div class="t">Séances</div><div class="d">${b.seances} la période d'avant</div></div>
    <div class="tuile"><div class="v">${pct(a.sansAide)}</div><div class="t">Selles sans poire (${a.selles} passages)</div><div class="d">${diff(a.sansAide, b.sansAide, true, true)}</div></div>
  </div>`;
  // Calendrier
  h += `<h2>Calendrier</h2><div class="carte"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><button type="button" id="cal-av">‹</button><b>${esc(dt(moisCal + '-01').toLocaleDateString('fr-BE', {month: 'long', year: 'numeric'}))}</b><button type="button" id="cal-ap" ${moisCal >= auj().slice(0, 7) ? 'disabled' : ''}>›</button></div>${calendrier()}
    <div class="legende"><span><i style="background:var(--n0)"></i>Aucune</span><span><i style="background:var(--n1)"></i>Légère gêne</span><span><i style="background:var(--n2)"></i>Douleur</span><span><i style="background:var(--n3)"></i>Forte</span><span>🎾 padel · 💪 séance</span></div>
    <p class="note" style="margin:0">La couleur = la plus forte douleur notée ce jour-là. Touche un jour pour ouvrir son journal.</p></div>`;
  // Graphiques par semaine
  const sems = semainesPeriode(periode), semJ = l => [...Array(7).keys()].map(i => plus(l, i)).filter(x => x <= auj());
  const ser = ZONES.map(([k, t], i) => ({nom: t.replace(' (SLAP)', ''), coul: 'var(--s' + (i + 1) + ')', v: sems.map(l => moy(semJ(l).map(x => (jour(x).d || {})[k])))}));
  h += `<h2>Douleurs, semaine par semaine</h2><div class="carte">${legende(ser)}<div class="graph" id="g-doul"></div><p class="note" style="margin:4px 0 0">Moyenne de la semaine : 0 = aucune, 1 = légère gêne, 2 = douleur, 3 = forte.</p></div>`;
  const tst = {nom: 'Test du ballon', coul: 'var(--s1)', v: sems.map(l => moy(semJ(l).map(x => jour(x).test)))};
  h += `<h2>Test du ballon</h2><div class="carte"><div class="graph" id="g-test"></div><p class="note" style="margin:4px 0 0">Moyenne de la semaine, sur 10. Sous 2 : feu vert.</p></div>`;
  const act = [{nom: 'Padel', coul: 'var(--s2)', v: sems.map(l => R.tous('padel').filter(p => semJ(l).includes(p.date)).length)},
    {nom: 'Séances', coul: 'var(--s1)', v: sems.map(l => R.tous('seance').filter(p => semJ(l).includes(p.date) && !['pp', 'echauf'].includes(p.cle)).length)}];
  h += `<h2>Activité par semaine</h2><div class="carte">${legende(act)}<div class="graph" id="g-act"></div></div>`;
  const sl = [{nom: 'Sans aide', coul: 'var(--s3)', v: sems.map(l => R.tous('selle').filter(x => semJ(l).includes(x.date) && x.aide === 'Sans aide').length)},
    {nom: 'Poire', coul: 'var(--s4)', v: sems.map(l => R.tous('selle').filter(x => semJ(l).includes(x.date) && x.aide === 'Poire').length)},
    {nom: 'Lavement', coul: 'var(--s2)', v: sems.map(l => R.tous('selle').filter(x => semJ(l).includes(x.date) && x.aide === 'Lavement').length)}];
  h += `<h2>Selles par semaine</h2><div class="carte">${legende(sl)}<div class="graph" id="g-selles"></div><p class="note" style="margin:4px 0 0">Selles dures : ${pct(a.dures)} des passages sur la période.</p></div>`;
  // Liens entre les choses
  h += `<h2>Ce qui joue sur la douleur</h2><div class="tuiles">${liens(js).map(([t, v, d]) => `<div class="tuile"><div class="t">${esc(t)}</div><div class="v" style="font-size:20px">${v}</div><div class="d">${esc(d)}</div></div>`).join('')}</div>`;
  // Où j'en suis
  const r = reg(), cr = criteres();
  h += `<h2>Où j'en suis</h2><div class="carte">
    <label class="l">Copenhague : étape actuelle</label>${segHtml('cop', [1, 2, 3, 4].map(v => [v, 'Étape ' + v]), r.cop)}
    <p class="note" style="margin:4px 0 0">${esc(COPENHAGUE[r.cop].txt)}</p>
    <label class="l">Descente de marche : hauteur</label>${segHtml('marche', [[10, '10 cm'], [15, '15 cm'], [20, '20 cm']], r.marche)}
    <label class="item" style="margin-top:8px;padding:9px 12px"><input type="checkbox" id="m-ok" ${r.marcheOk ? 'checked' : ''} style="width:22px;height:22px;flex:none"><span class="txt">Sans douleur au genou à cette hauteur</span></label>
    <p class="note">Programme épaule : semaine ${semEp()} (commencé le ${esc(joli(r.epDebut, {day: 'numeric', month: 'long'}))}). ${semEp() >= 3 ? 'Les lancers main gauche sont dans la séance.' : 'Les lancers main gauche arrivent à la semaine 3.'}</p></div>
    <h3>Pour passer à 2 padels par semaine</h3><ul class="crit carte">${cr.map(([t, ok]) => `<li>${ok ? '✅' : '⬜'} ${esc(t)}</li>`).join('')}
    <li class="note">${cr.every(c => c[1]) ? '🎉 Tout est rempli : tu peux passer à la routine C (cours le lundi). Le 2e padel commence par 45 min tranquilles, sans match.' : 'Quand tout est coché, tu peux passer à la routine C.'}</li></ul>`;
  h += `<details class="carte"><summary><b>Voir en tableau</b></summary><div style="overflow:auto"><table class="t"><tr><th>Date</th><th>Aine</th><th>Genou</th><th>Ép. G</th><th>Ép. D</th><th>Test</th><th>Activité</th><th>Selles</th></tr>
    ${js.slice().reverse().filter(x => R.get('j-' + x) || parDate('seance', x).length || parDate('padel', x).length || parDate('selle', x).length).map(x => { const j = jour(x), dd = j.d || {}, L2 = ['0', '1', '2', '3'];
      return `<tr><td>${esc(court(x))}</td>${['aine', 'genou', 'epG', 'epD'].map(k => `<td>${dd[k] == null ? '' : L2[dd[k]]}</td>`).join('')}<td>${j.test == null ? '' : j.test}</td><td>${parDate('padel', x).length ? '🎾' : ''}${parDate('seance', x).filter(y => !['pp', 'echauf'].includes(y.cle)).map(y => SEANCES[y.cle] ? SEANCES[y.cle].ico : '').join('')}</td><td>${parDate('selle', x).map(y => y.aide === 'Sans aide' ? '✓' : y.aide === 'Poire' ? 'P' : y.aide === 'Lavement' ? 'L' : '•').join(' ')}</td></tr>`; }).join('')}</table></div><p class="note">Douleurs : 0 aucune · 1 légère gêne · 2 douleur · 3 forte. Selles : ✓ sans aide · P poire · L lavement. Tout est aussi dans ta feuille Google.</p></details>`;
  vue().innerHTML = h;
  const lab = sems.map(l => court(l));
  ligne($('g-doul'), lab, ser, 3, ['Aucune', 'Gêne', 'Douleur', 'Forte']);
  ligne($('g-test'), lab, [tst], 10);
  barres($('g-act'), lab, act, false);
  barres($('g-selles'), lab, sl, true);
  vue().querySelectorAll('#per button').forEach(b2 => b2.onclick = () => { periode = +b2.dataset.p; rendre(); });
  $('cal-av').onclick = () => { const d = dt(moisCal + '-01'); d.setMonth(d.getMonth() - 1); moisCal = iso(d).slice(0, 7); rendre(); };
  $('cal-ap').onclick = () => { const d = dt(moisCal + '-01'); d.setMonth(d.getMonth() + 1); moisCal = iso(d).slice(0, 7); rendre(); };
  vue().querySelectorAll('.cal [data-d]').forEach(b2 => b2.onclick = () => { jSel = b2.dataset.d; location.hash = '#journal'; });
  vue().querySelectorAll('[data-seg="cop"] button').forEach(b2 => b2.onclick = () => { setReg({cop: +b2.dataset.v}); rendre(); });
  vue().querySelectorAll('[data-seg="marche"] button').forEach(b2 => b2.onclick = () => { setReg({marche: +b2.dataset.v, marcheOk: false}); rendre(); });
  $('m-ok').onchange = e => { setReg({marcheOk: e.target.checked}); rendre(); };
}
function liens(js) {
  const out = [], J = s => jour(s).d || {};
  const lend = js.filter(s => parDate('padel', plus(s, -1)).length), autres = js.filter(s => !parDate('padel', plus(s, -1)).length && !parDate('padel', s).length);
  const a1 = moy(lend.map(s => J(s).aine)), a2 = moy(autres.map(s => J(s).aine));
  out.push(['Aine le lendemain d\'un padel', f1(a1), 'les autres jours : ' + f1(a2)]);
  const g1 = moy(lend.map(s => J(s).genou)), g2 = moy(autres.map(s => J(s).genou));
  out.push(['Genou le lendemain d\'un padel', f1(g1), 'les autres jours : ' + f1(g2)]);
  const sems = [...new Set(js.map(lundiDe))], semP = n => sems.filter(l => R.tous('padel').filter(p => lundiDe(p.date) === l).length === n);
  const ms = ls => moy(ls.flatMap(l => [...Array(7).keys()].map(i => J(plus(l, i)).aine)));
  out.push(['Aine les semaines à 2 padels', f1(ms(semP(2))), 'semaines à 1 padel : ' + f1(ms(semP(1))) + (semP(2).length ? '' : ' (pas encore de semaine à 2)')]);
  const apS = js.filter(s => parDate('seance', plus(s, -1)).some(x => ['pub', 'combi', 'verts'].includes(x.cle))), sansS = js.filter(s => !parDate('seance', plus(s, -1)).some(x => ['pub', 'combi', 'verts'].includes(x.cle)));
  out.push(['Aine le lendemain d\'une séance jambes', f1(moy(apS.map(s => J(s).aine))), 'sans séance la veille : ' + f1(moy(sansS.map(s => J(s).aine)))]);
  const ppO = js.filter(s => jour(plus(s, -1)).pp), ppN = js.filter(s => !jour(plus(s, -1)).pp);
  const sansAide = l => { const x = R.tous('selle').filter(y => l.includes(y.date)); return x.length ? Math.round(x.filter(y => y.aide === 'Sans aide').length / x.length * 100) + ' %' : '–'; };
  out.push(['Selles sans poire après un jour de plancher pelvien', sansAide(ppO), 'sinon : ' + sansAide(ppN)]);
  const dPadel = js.filter(s => parDate('padel', plus(s, -1)).length || parDate('padel', plus(s, -2)).length);
  out.push(['Selles sans poire dans les 2 jours après un padel', sansAide(dPadel), 'les autres jours : ' + sansAide(js.filter(s => !dPadel.includes(s)))]);
  return out;
}
function calendrier() {
  const d1 = moisCal + '-01', dec = jourSem(d1), n = new Date(+moisCal.slice(0, 4), +moisCal.slice(5, 7), 0).getDate(), a = auj();
  let h = '<div class="cal">' + JOURS.map(j => `<div class="e">${j[0]}</div>`).join('');
  for (let i = 0; i < dec; i++) h += '<button class="vide" tabindex="-1"></button>';
  for (let k = 1; k <= n; k++) {
    const s = moisCal + '-' + String(k).padStart(2, '0'), d = jour(s).d || {}, vals = ZONES.map(([z]) => d[z]).filter(v => v != null), mx = vals.length ? Math.max(...vals) : null;
    const ic = (parDate('padel', s).length ? '🎾' : '') + (parDate('seance', s).some(x => !['pp', 'echauf'].includes(x.cle)) ? '💪' : '');
    h += `<button type="button" data-d="${s}" class="${s === a ? 'auj' : ''}" ${s > a ? 'disabled' : ''} style="background:${mx == null ? 'transparent' : 'var(--n' + mx + ')'};${mx == null ? 'border-color:var(--line)' : ''}"><b>${k}</b><i>${ic}</i></button>`;
  }
  return h + '</div>';
}
function legende(ser) { return `<div class="legende">${ser.map(s => `<span><i style="background:${s.coul}"></i>${esc(s.nom)}</span>`).join('')}</div>`; }
// Graphique en lignes (une valeur par semaine, trous permis), bulle au toucher
function ligne(el, lab, ser, max, ylab) {
  const W = 640, H = 200, g = {l: ylab ? 58 : 30, r: 10, t: 10, b: 26}, n = lab.length, pw = W - g.l - g.r, ph = H - g.t - g.b;
  const X = i => g.l + (n === 1 ? pw / 2 : i * pw / (n - 1)), Y = v => g.t + ph - v / max * ph;
  const pas = max <= 3 ? 1 : max / 5;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(ser.map(x => x.nom).join(', '))}">`;
  for (let v = 0; v <= max + 1e-9; v += pas) s += `<line x1="${g.l}" x2="${W - g.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)" stroke-width="1"/><text x="${g.l - 6}" y="${Y(v) + 4}" text-anchor="end" font-size="12" fill="var(--muted)">${ylab ? ylab[v] : v}</text>`;
  const every = Math.ceil(n / 7);
  lab.forEach((t, i) => { if (i % every === 0 || i === n - 1) s += `<text x="${X(i)}" y="${H - 6}" text-anchor="middle" font-size="12" fill="var(--muted)">${esc(t)}</text>`; });
  ser.forEach(sr => {
    let dd = '', on = false;
    sr.v.forEach((v, i) => { if (v == null) { on = false; return; } dd += (on ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1); on = true; });
    s += `<path d="${dd}" fill="none" stroke="${sr.coul}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    sr.v.forEach((v, i) => { if (v != null) s += `<circle cx="${X(i)}" cy="${Y(v)}" r="4" fill="${sr.coul}" stroke="var(--surface)" stroke-width="2"/>`; });
  });
  s += `<line id="cx" x1="0" x2="0" y1="${g.t}" y2="${g.t + ph}" stroke="var(--muted)" stroke-width="1" stroke-dasharray="3 3" visibility="hidden"/>`;
  s += `<rect x="${g.l}" y="0" width="${pw}" height="${H}" fill="transparent" class="zone"/></svg>`;
  if (ser.every(sr => sr.v.every(v => v == null))) { el.innerHTML = '<p class="note">Pas encore de données sur cette période.</p>'; return; }
  el.innerHTML = s + '<div class="bul" hidden></div>';
  survol(el, i => `<b>Semaine du ${esc(lab[i])}</b><br>` + ser.map(sr => `<span style="color:${sr.coul}">●</span> ${esc(sr.nom)} : ${sr.v[i] == null ? '–' : f1(sr.v[i])}`).join('<br>'), n, X, W);
}
function barres(el, lab, ser, empile) {
  const W = 640, H = 190, g = {l: 30, r: 10, t: 10, b: 26}, n = lab.length, pw = W - g.l - g.r, ph = H - g.t - g.b;
  const tot = i => empile ? ser.reduce((a, s) => a + s.v[i], 0) : Math.max(...ser.map(s => s.v[i]));
  const max = Math.max(2, ...lab.map((_, i) => tot(i))), Y = v => g.t + ph - v / max * ph;
  if (!lab.some((_, i) => tot(i))) { el.innerHTML = '<p class="note">Pas encore de données sur cette période.</p>'; return; }
  const bw = pw / n, X = i => g.l + bw * i + bw / 2;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(ser.map(x => x.nom).join(', '))}">`;
  const pas = max <= 6 ? 1 : Math.ceil(max / 5);
  for (let v = 0; v <= max; v += pas) s += `<line x1="${g.l}" x2="${W - g.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/><text x="${g.l - 6}" y="${Y(v) + 4}" text-anchor="end" font-size="12" fill="var(--muted)">${v}</text>`;
  const every = Math.ceil(n / 7);
  lab.forEach((t, i) => {
    if (i % every === 0 || i === n - 1) s += `<text x="${X(i)}" y="${H - 6}" text-anchor="middle" font-size="12" fill="var(--muted)">${esc(t)}</text>`;
    const larg = Math.min(28, bw * .7);
    if (empile) { let y0 = 0; ser.forEach(sr => { const v = sr.v[i]; if (!v) return; const y1 = Y(y0 + v), y2 = Y(y0); s += `<rect x="${X(i) - larg / 2}" y="${y1}" width="${larg}" height="${Math.max(0, y2 - y1 - 2)}" rx="3" fill="${sr.coul}"/>`; y0 += v; }); }
    else { const k = ser.length, w = Math.min(14, larg / k); ser.forEach((sr, j) => { const v = sr.v[i]; if (!v) return; s += `<rect x="${X(i) - k * w / 2 + j * w + 1}" y="${Y(v)}" width="${w - 2}" height="${Y(0) - Y(v)}" rx="3" fill="${sr.coul}"/>`; }); }
  });
  s += `<line id="cx" x1="0" x2="0" y1="${g.t}" y2="${g.t + ph}" stroke="var(--muted)" stroke-width="1" stroke-dasharray="3 3" visibility="hidden"/><rect x="${g.l}" y="0" width="${pw}" height="${H}" fill="transparent" class="zone"/></svg>`;
  el.innerHTML = s + '<div class="bul" hidden></div>';
  survol(el, i => `<b>Semaine du ${esc(lab[i])}</b><br>` + ser.map(sr => `<span style="color:${sr.coul}">●</span> ${esc(sr.nom)} : ${sr.v[i]}`).join('<br>'), n, X, W, bw);
}
function survol(el, txt, n, X, W, bw) {
  const svg = el.querySelector('svg'), z = svg.querySelector('.zone'), bu = el.querySelector('.bul'), cx = svg.querySelector('#cx');
  const montrer = ev => {
    const r = svg.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width * W;
    let i = 0, best = 1e9; for (let k = 0; k < n; k++) { const d = Math.abs(X(k) - x); if (d < best) { best = d; i = k; } }
    cx.setAttribute('x1', X(i)); cx.setAttribute('x2', X(i)); cx.setAttribute('visibility', bw ? 'hidden' : 'visible');
    bu.innerHTML = txt(i); bu.hidden = false;
    const px = X(i) / W * r.width, bwid = bu.offsetWidth;
    bu.style.left = Math.max(0, Math.min(r.width - bwid, px - bwid / 2)) + 'px'; bu.style.top = '-8px'; bu.style.transform = 'translateY(-100%)';
  };
  z.addEventListener('pointermove', montrer); z.addEventListener('pointerdown', montrer);
  z.addEventListener('pointerleave', () => { bu.hidden = true; cx.setAttribute('visibility', 'hidden'); });
}

// ===== Réglages =====
function vReglages() {
  const r = reg(), c = (() => { try { return JSON.parse(localStorage.getItem(CFG)) || {}; } catch (e) { return {}; } })(), ok = !!(c.url && c.cle);
  let h = `<h2>☁️ Ma feuille Google « Renforcement »</h2><div class="carte">
    ${ok ? '<p style="margin-top:0"><b>✅ Cet appareil est relié à ta feuille Renforcement.</b><br><span class="note">Tout est enregistré automatiquement, à part de Happiness. Si la pastille ☁️ en haut dit « mot de passe ? », la ligne CLE du script n\'est pas 2585.</span></p>' : '<p class="note" style="margin-top:0">Tes données de santé vont dans une feuille Google à part, rien que pour toi (pas dans celle de Happiness).</p>'}
    <details ${ok ? '' : 'open'}><summary>${ok ? 'Modifier ou délier' : 'Relier cet appareil'}</summary>
    <label class="l">Adresse du script</label><input id="r-url" value="${esc(c.url || SCRIPT)}" placeholder="https://script.google.com/macros/s/…/exec" autocapitalize="off" spellcheck="false">
    <label class="l">Mot de passe (le même que ton code d'entrée)</label><input id="r-cle" value="${esc(c.cle || '2585')}" autocapitalize="off" spellcheck="false" autocomplete="off">
    <div class="btns"><button type="button" class="go" id="r-ok">Relier</button>${ok ? '<button type="button" id="r-non">Délier cet appareil</button>' : ''}</div><p id="r-etat" class="note"></p>
    <details><summary>Première fois : créer la feuille</summary><ol class="note">
      <li>Sur ton ordinateur, ouvre <a href="https://sheets.new" target="_blank" rel="noopener">sheets.new</a> et nomme la feuille « Renforcement ».</li>
      <li>Menu <b>Extensions › Apps Script</b>. Efface tout et colle <a href="google/" target="_blank">ce script</a> (bouton « Copier »).</li>
      <li>Ligne <code>const CLE</code> : laisse <code>2585</code> (ton code d'entrée), puis 💾 Enregistrer.</li>
      <li><b>Déployer › Nouveau déploiement</b>, roue dentée › <b>Application Web</b>. Exécuter en tant que : <b>Moi</b>. Qui a accès : <b>Tout le monde</b>. Déployer, puis autorise l'accès.</li>
      <li>Copie l'adresse qui finit par <code>/exec</code> et colle-la ici avec ton mot de passe. Pareil sur chaque appareil.</li></ol></details></details></div>`;
  h += `<h2>Ma semaine habituelle</h2><div class="carte"><label class="l">Padel de la fin de semaine</label>${segHtml('padelDefaut', [['ven', 'Vendredi'], ['sam', 'Samedi'], ['aucun', 'Pas de padel']], r.padelDefaut)}
    <label class="l">Cours le lundi</label>${segHtml('coursDefaut', [[1, 'Oui'], [0, 'Non']], r.coursDefaut ? 1 : 0)}<p class="note" style="margin-bottom:0">Utilisé pour chaque nouvelle semaine. Tu changes une semaine précise dans Aujourd'hui › Ma semaine.</p></div>`;
  h += `<h2>Séances</h2><div class="carte"><label class="item" style="padding:9px 12px;margin:0"><input type="checkbox" id="r-opt" ${r.options !== false ? 'checked' : ''} style="width:22px;height:22px;flex:none"><span class="txt"><b>Exercices en option</b><span class="note">Descente de marche, chaise au mur, élastique, étirement bras croisé</span></span></label>
    <label class="l">Début du programme épaule</label><input type="date" id="r-ep" value="${esc(r.epDebut)}"><p class="note" style="margin-bottom:0">Sert à compter les semaines (lancers main gauche à partir de la semaine 3).</p></div>`;
  h += `<h2>📋 Mes règles</h2><div class="carte"><ol style="margin:0;padding-left:22px">${REGLES.map(t => `<li style="margin:5px 0">${esc(t)}</li>`).join('')}</ol></div>
    <h2>🚑 Si ça revient</h2><div class="carte"><ul style="margin:0;padding-left:22px">${RECHUTE.map(t => `<li style="margin:5px 0">${esc(t)}</li>`).join('')}</ul></div>`;
  h += `<h2>🔒 Code</h2><div class="carte"><p class="note" style="margin-top:0">L'appli demande ton code sur chaque nouvel appareil.</p>
    <div class="btns" style="margin-top:0"><button type="button" id="r-lock">🔒 Verrouiller maintenant</button><button type="button" id="r-code">Changer le code</button></div></div>`;
  vue().innerHTML = h;
  $('r-ok').onclick = async () => {
    const n = {url: $('r-url').value.trim(), cle: $('r-cle').value.trim()}, e = $('r-etat');
    if (!/^https:\/\/script\.google(usercontent)?\.com\/.+/.test(n.url)) { e.textContent = 'Colle l\'adresse complète du script (elle commence par https://script.google.com).'; return; }
    if (!n.cle) { e.textContent = 'Il manque le mot de passe.'; return; }
    e.textContent = 'Vérification…';
    try { await Maison.tester(n, 'renfo'); localStorage.setItem(CFG, JSON.stringify(n)); Maison.toutSynchro(); e.textContent = 'C\'est relié ✓'; setTimeout(rendre, 600); }
    catch (err) { e.textContent = /mot de passe/.test(err.message) ? 'Mot de passe incorrect (celui de la ligne CLE du script).' : /module/.test(err.message) ? 'Ce script n\'est pas celui du Renforcement : colle le script de cette page.' : 'Le script ne répond pas. Vérifie l\'adresse et l\'accès « Tout le monde ».'; }
  };
  if ($('r-non')) $('r-non').onclick = () => { if (confirm('Délier cet appareil ? Ses données restent dessus.')) { localStorage.removeItem(CFG); rendre(); } };
  vue().querySelectorAll('[data-seg="padelDefaut"] button').forEach(b => b.onclick = () => { setReg({padelDefaut: b.dataset.v}); rendre(); });
  vue().querySelectorAll('[data-seg="coursDefaut"] button').forEach(b => b.onclick = () => { setReg({coursDefaut: b.dataset.v === '1'}); rendre(); });
  $('r-opt').onchange = e => setReg({options: e.target.checked});
  $('r-ep').onchange = e => { if (e.target.value) setReg({epDebut: e.target.value}); };
  $('r-lock').onclick = () => { try { localStorage.removeItem(OUVERT); } catch (e) {} verrou(); };
  $('r-code').onclick = async () => {
    const a = prompt('Nouveau code (au moins 4 chiffres ou lettres) :'); if (!a) return;
    if (a.trim().length < 4) { alert('Au moins 4 caractères.'); return; }
    if (prompt('Retape le nouveau code :') !== a) { alert('Les deux codes ne sont pas pareils.'); return; }
    const hh = await empreinte(a); setReg({code: hh}); try { localStorage.setItem(OUVERT, hh); } catch (e) {} bulle('Code changé ✓');
  };
}

// ---------- Verrou par code ----------
// Code de départ « 2585 » (seule son empreinte est ici). Changeable dans Réglages : la nouvelle empreinte
// part dans la feuille, donc vaut sur tous les appareils reliés.
const CODE0 = '385ad5955fc20f7fd6544898222a92a22c0142d87f737e5ca06b4e837a037d7f';
const OUVERT = 'maison:renfo-ouvert';
const empreinte = async t => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t.trim().toLowerCase())))].map(b => b.toString(16).padStart(2, '0')).join('');
const codeAttendu = () => reg().code || CODE0;
function verrou() {
  $('verrou').hidden = false; $('v-code').value = ''; $('v-err').textContent = ''; setTimeout(() => $('v-code').focus(), 60);
}
$('f-verrou').onsubmit = async e => {
  e.preventDefault();
  const h = await empreinte($('v-code').value);
  if (h !== codeAttendu()) { $('v-err').textContent = 'Ce n\'est pas le bon code.'; $('v-code').select(); return; }
  try { localStorage.setItem(OUVERT, h); } catch (err) {}
  relierAuto($('v-code').value);
  $('verrou').hidden = true; rendre();
};
// Le code d'entrée sert aussi de mot de passe pour la feuille Google (ligne CLE du script) :
// l'appareil se relie tout seul, sans rien taper de plus.
function relierAuto(code) {
  try { const c = JSON.parse(localStorage.getItem(CFG) || '{}'); if (c.url && c.cle) return;
    localStorage.setItem(CFG, JSON.stringify({url: SCRIPT, cle: String(code || '2585').trim()})); Maison.toutSynchro(); } catch (e) {}
}
let ouvert = null; try { ouvert = localStorage.getItem(OUVERT); } catch (e) {}
if (ouvert === codeAttendu()) relierAuto(reg().code ? '' : '2585');
if (ouvert !== codeAttendu()) verrou();
rendre();
})();
