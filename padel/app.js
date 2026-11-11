// Padel : gestion des élèves, de l'agenda des cours, des forfaits et des paiements d'un prof de padel.
// Tout est gardé dans l'appareil (marche sans internet) et copié dans une feuille Google à part
// (voir google/Code.gs), lisible et téléchargeable en Excel. Appli autonome : le dossier padel/
// peut être déplacé ailleurs (ex. kevinou.be/padel/) sans rien changer.
(() => {
'use strict';
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } };
const lsJson = (k, d) => { try { return JSON.parse(lsGet(k)) || d; } catch (e) { return d; } };
const K = 'padel:donnees', KS = 'padel:sync', KC = 'padel:drive', KO = 'padel:ouvert', KV = 'padel:vue';
const DANS_HAPPINESS = /\/Maison\//i.test(location.pathname);
// Feuille Google « Padel » sur le Drive de Kevin (pré-remplie : l'appli s'y relie toute seule après le code)
const SCRIPT = 'https://script.google.com/macros/s/AKfycbw0XytRyRYY17LJxydy9XGXbYfLjI62OMvphvYHrrJt-Ppxf7XatO5VYXr1QtANmjB8/exec';

// ---------- Données ----------
let D = lsJson(K, {});
const TARIFS0 = [
  {id: 'tarif-1', type: 'tarif', nom: 'Individuel', pers: 1, prix: 50, cycle: 10, prixCycle: 450, ordre: 1},
  {id: 'tarif-2', type: 'tarif', nom: '2 personnes', pers: 2, prix: 30, cycle: 10, prixCycle: 270, ordre: 2},
  {id: 'tarif-3', type: 'tarif', nom: '3 personnes', pers: 3, prix: 20, cycle: 10, prixCycle: 180, ordre: 3},
  {id: 'tarif-4', type: 'tarif', nom: '4 personnes', pers: 4, prix: 15, cycle: 10, prixCycle: 140, ordre: 4}];
TARIFS0.forEach(t => { if (!D[t.id]) D[t.id] = Object.assign({t: 1}, t); });
if (!D.reglages) D.reglages = {id: 'reglages', type: 'reglages', debut: 8, fin: 22, prof: '', lieux: [], t: 1};
const sauver = () => { if (!lsSet(K, JSON.stringify(D))) alert("La mémoire de l'appli est pleine sur cet appareil : la modification n'a pas pu être gardée."); };
sauver();
const tous = type => Object.values(D).filter(r => r && !r.del && r.type === type);
const get = id => (D[id] && !D[id].del) ? D[id] : null;
const nid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
function put(rec) { rec.t = Date.now(); D[rec.id] = rec; sauver(); Sync.sale(rec.id); return rec; }
function suppr(id) { if (!D[id]) return; D[id] = {id, type: D[id].type, del: 1, t: Date.now()}; sauver(); Sync.sale(id); }
const reg = () => D.reglages;

// ---------- Dates et heures ----------
const p2 = n => String(n).padStart(2, '0');
const iso = d => d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
const jourDe = s => new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
const ajJ = (s, n) => { const d = jourDe(s); d.setDate(d.getDate() + n); return iso(d); };
const auj = () => iso(new Date());
const lundi = s => { const d = jourDe(s), w = (d.getDay() + 6) % 7; d.setDate(d.getDate() - w); return iso(d); };
const minDe = h => +h.slice(0, 2) * 60 + +h.slice(3, 5);
const hDe = m => p2(Math.floor(m / 60)) + ':' + p2(m % 60);
const hTxt = h => h.replace(/^0/, '').replace(':00', 'h').replace(':', 'h');
const JOURS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'], JOURSL = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'], MOISL = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const dCourt = s => { const d = jourDe(s); return JOURS[d.getDay()] + ' ' + d.getDate() + ' ' + MOIS[d.getMonth()]; };
const dLong = s => { const d = jourDe(s); return JOURSL[d.getDay()] + ' ' + d.getDate() + ' ' + MOISL[d.getMonth()]; };
const dNum = s => s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4);
const dureeTxt = m => m % 60 ? (m >= 60 ? Math.floor(m / 60) + 'h' + p2(m % 60) : m + ' min') : (m / 60) + 'h';
const euro = n => { n = Math.round((+n || 0) * 100) / 100; return (Number.isInteger(n) ? n : n.toFixed(2).replace('.', ',')) + ' €'; };
const arr = n => Math.round(n * 2) / 2;

// ---------- Cours ----------
const debutMs = c => jourDe(c.date).getTime() + minDe(c.debut) * 60000;
const finMs = c => debutMs(c) + (c.duree || 60) * 60000;
const passe = c => finMs(c) <= Date.now();
const actif = c => c.statut !== 'annule';
const nomE = id => { const e = D[id]; return e ? (e.nom || '?') : '?'; };
const prenom = id => nomE(id).split(' ')[0];
const tarifPour = n => { const T = tous('tarif').sort((a, b) => a.pers - b.pers); return T.find(t => t.pers === n) || T.filter(t => t.pers <= n).pop() || T[0]; };
// Prix d'une séance à l'unité pour une personne, selon le nombre de joueurs et la durée
const prixUnite = (n, duree) => { const t = tarifPour(Math.max(1, n)); return t ? arr(t.prix * (duree || 60) / 60) : 0; };
// Proposition de prix pour un forfait : à partir de la taille du cycle (10), on prend le prix du cycle par séance.
function proposer(n, seances, duree) {
  const t = tarifPour(Math.max(1, n)); if (!t) return {total: 0, parSeance: 0, normal: 0};
  const f = (duree || 60) / 60, normal = arr(t.prix * f) * seances;
  const ps = seances >= (t.cycle || 10) ? t.prixCycle / (t.cycle || 10) : t.prix;
  const parSeance = arr(ps * f * 100) / 100, total = Math.round(ps * f * seances * 100) / 100;
  return {total, parSeance: Math.round(ps * f * 100) / 100, normal, tarif: t};
}

// Bilan d'un élève : forfaits (séances faites, prévues, restantes), argent dû, payé, reste
function bilan(eid, ignorer) {
  // f.avant : séances déjà faites avant l'appli (reprise des élèves)
  const F = tous('forfait').filter(f => f.eleve === eid).sort((a, b) => (a.date || '').localeCompare(b.date || '') || a.t - b.t);
  const fx = {}; F.forEach(f => { fx[f.id] = {f, faites: +f.avant || 0, prevues: 0}; });
  let du = 0, donnes = 0, prevus = 0, unite = 0;
  tous('cours').forEach(c => {
    if (c.id === ignorer || !actif(c) || !(c.eleves || []).includes(eid)) return;
    const p = passe(c) || c.statut === 'absent', x = (c.f || {})[eid] || {};
    p ? donnes++ : prevus++;
    if (x.forfait && fx[x.forfait]) { p ? fx[x.forfait].faites++ : fx[x.forfait].prevues++; }
    else if (p && !x.gratuit) { du += +x.prix || 0; unite += +x.prix || 0; }
  });
  F.forEach(f => { du += +f.prix || 0; donnes += +f.avant || 0; });
  const paye = tous('paiement').filter(p => p.eleve === eid).reduce((s, p) => s + (+p.montant || 0), 0);
  const forfaits = F.map(f => { const x = fx[f.id]; return Object.assign(x, {restantes: (+f.seances || 0) - x.faites, libres: (+f.seances || 0) - x.faites - x.prevues}); });
  du = Math.round(du * 100) / 100;
  return {du, paye, solde: Math.round((du - paye) * 100) / 100, donnes, prevus, forfaits, unite};
}
// Le forfait de l'élève qui a encore une place (le plus ancien d'abord)
function forfaitLibre(eid, ignorer) { const b = bilan(eid, ignorer); const x = b.forfaits.find(x => x.libres > 0); return x ? x.f : null; }
// Valeur d'une séance pour un élève (pour le chiffre du mois)
function valeur(c, eid) {
  const x = (c.f || {})[eid] || {};
  if (x.forfait) { const f = D[x.forfait]; return f && +f.seances ? (+f.prix || 0) / +f.seances : 0; }
  return x.gratuit ? 0 : +x.prix || 0;
}
// ---------- Page de réservation : créneaux ouverts par le prof et demandes reçues ----------
const dureeResa = () => [60, 90].includes(+reg().resaDuree) ? +reg().resaDuree : 60;
const heuresOuv = d => { const o = get('ouv-' + d); return o && Array.isArray(o.h) ? o.h.slice() : []; };
function setOuv(d, hs) {
  const id = 'ouv-' + d, o = get(id) || {id, type: 'ouverture', date: d, h: []};
  const n = [...new Set(hs)].sort();
  if (JSON.stringify(n) === JSON.stringify(o.h || [])) return;
  o.h = n; put(o);
}
// Séances d'une demande : la 1re (date, debut) puis, pour un forfait, celles choisies en plus (autres)
const seancesDm = x => [{date: x.date, debut: x.debut}].concat(Array.isArray(x.autres) ? x.autres : []);
// Liste d'attente (page de réservation) : les personnes qui veulent ce créneau s'il se libère
const attentesPour = (d, h, dur) => tous('attente').filter(a => a.date === d && minDe(a.debut) < minDe(h) + (dur || 60) && minDe(h) < minDe(a.debut) + (a.duree || 60)).sort((a, b) => (a.recue || 0) - (b.recue || 0));
const demandesAtt = () => tous('demande').filter(x => x.etat === 'attente').sort((a, b) => (a.date + a.debut).localeCompare(b.date + b.debut));
// Lien de la page de réservation : reserver/ à côté de l'appli, ou la racine du site quand l'appli est dans /coach/ (padel.kevinou.be)
// Adresse publique « propre » à partager (aussi depuis la copie dans Happiness)
const PAGE_PUBLIQUE = 'https://beapp.be/jpadel/';
// Réservation des terrains : l'appli du club Athois Le Padel (Doinsport). Android : ouvre l'appli (ou le Play Store) ; iPhone, Mac, PC : sa page App Store.
const TERRAIN_IOS = 'https://apps.apple.com/be/app/athois-le-padel/id1672356649', TERRAIN_PKG = 'com.trenicom.athoispadel';
const lienTerrain = () => /android/i.test(navigator.userAgent) ? 'intent://#Intent;package=' + TERRAIN_PKG + ';S.browser_fallback_url=' + encodeURIComponent('https://play.google.com/store/apps/details?id=' + TERRAIN_PKG) + ';end' : TERRAIN_IOS;
const boutonTerrain = (cls = '') => `<a class="bouton ${cls}" href="${esc(lienTerrain())}" target="_blank" rel="noopener">🎾 Réserver le terrain</a>`;
const lienReprise = () => { if (/(^|\.)(kevinou|beapp)\.be$/.test(location.hostname)) return PAGE_PUBLIQUE + 'reprise/'; const dir = location.href.split('#')[0].split('?')[0].replace(/[^/]*$/, ''); return new URL(/\/coach\/$/.test(dir) ? '../reprise/' : 'reprise/', dir).href; };
const lienResa = () => { if (/(^|\.)(kevinou|beapp)\.be$/.test(location.hostname)) return PAGE_PUBLIQUE; const dir = location.href.split('#')[0].split('?')[0].replace(/[^/]*$/, ''); return new URL(/\/coach\/$/.test(dir) ? '../' : 'reserver/', dir).href; };
const occupe = (d, h, dur, sauf) => tous('cours').concat(tous('occupe')).some(o => actif(o) && o.date === d && minDe(o.debut) < minDe(h) + dur && minDe(h) < minDe(o.debut) + (o.duree || 60))
  || demandesAtt().some(o => o.id !== sauf && seancesDm(o).some(x => x.date === d && minDe(x.debut) < minDe(h) + dur && minDe(h) < minDe(x.debut) + (o.duree || 60)));
const conflits = c => tous('cours').filter(o => o.id !== c.id && actif(o) && o.date === c.date && debutMs(o) < finMs(c) && debutMs(c) < finMs(o));
const factuTxt = (c, eid) => { const x = (c.f || {})[eid] || {}; if (x.forfait) { const f = D[x.forfait]; return 'forfait' + (f ? ' ' + (f.nom || f.seances + ' séances') : ''); } return x.gratuit ? 'offert' : euro(x.prix); };

// ---------- Synchro avec la feuille Google (même principe que Happiness) ----------
const Sync = (() => {
  const meta = lsJson(KS, {r: 0, sale: {}, h: '', init: false});
  const svMeta = () => lsSet(KS, JSON.stringify(meta));
  const cfg = () => lsJson(KC, {}), relie = () => { const c = cfg(); return !!(c.url && c.cle); };
  let minuteur = null, enCours = false, encore = false, etat = 'off';
  const ecoute = new Set();
  const statut = s => { etat = s; ecoute.forEach(f => f(s)); };
  async function appel(c, corps, params, garder) {
    const r = corps
      ? await fetch(c.url, {method: 'POST', keepalive: !!garder, headers: {'Content-Type': 'text/plain;charset=utf-8'}, body: JSON.stringify(Object.assign({cle: c.cle}, corps))})
      : await fetch(c.url + (c.url.includes('?') ? '&' : '?') + new URLSearchParams(Object.assign({cle: c.cle}, params)));
    const o = await r.json(); if (!o.ok) throw new Error(o.err || 'erreur'); return o;
  }
  const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) | 0; return String(h); };
  const e = {
    relie, cfg, surStatut(f) { ecoute.add(f); f(relie() ? etat : 'off'); },
    regler(c) { lsSet(KC, JSON.stringify(c)); e.cycle(); },
    tester: c => appel(c, null, {m: 'padel', r: 1e15}),
    neuf() { meta.r = 0; meta.h = ''; meta.init = false; meta.sale = {}; Object.keys(D).forEach(id => { meta.sale[id] = 1; }); svMeta(); },
    sale(id) { meta.sale[id] = 1; svMeta(); e.bientot(); },
    bientot(ms) { clearTimeout(minuteur); minuteur = setTimeout(e.cycle, ms == null ? 1200 : ms); },
    partir() {
      clearTimeout(minuteur);
      const ids = Object.keys(meta.sale); if (!ids.length || !relie() || !navigator.onLine) return;
      const corps = {m: 'padel', recs: ids.map(id => D[id]).filter(Boolean)};
      if (JSON.stringify(corps).length < 60000) appel(cfg(), corps, null, true).catch(() => {});
    },
    async cycle() {
      if (!relie()) { statut('off'); return; }
      if (!navigator.onLine) { statut('horsligne'); return; }
      if (enCours) { encore = true; return; }
      enCours = true; statut('sync');
      const c = cfg();
      if (meta.u && meta.u !== c.url) e.neuf();
      meta.u = c.url;
      try {
        let p = await appel(c, null, {m: 'padel', r: meta.init ? meta.r : 0});
        if (meta.init && (+p.r || 0) < (+meta.r || 0)) { meta.init = false; meta.sale = {}; svMeta(); p = await appel(c, null, {m: 'padel', r: 0}); }
        let recu = 0;
        p.recs.forEach(rec => {
          const loc = D[rec.id], t = loc ? +loc.t || 0 : -1;
          // Premier contact : la feuille l'emporte, sauf ce que cet appareil a vraiment écrit (t > 1)
          if ((+rec.t || 0) > t || (!meta.init && t <= 1)) { D[rec.id] = rec; recu++; delete meta.sale[rec.id]; }
        });
        if (!meta.init) Object.keys(D).forEach(id => { if (!p.recs.some(r => r.id === id)) meta.sale[id] = 1; });
        meta.r = p.r; meta.init = true; svMeta();
        if (recu) { sauver(); rendre(); nouvellesDemandes(); }
        const ids = Object.keys(meta.sale), recs = ids.map(id => D[id]).filter(Boolean);
        let tables = null, h = meta.h;
        try { tables = tablesDrive(); h = hash(JSON.stringify(tables)); if (h === meta.h) tables = null; } catch (err) { tables = null; }
        if (recs.length || tables) {
          const envoi = {}; recs.forEach(r => { envoi[r.id] = +r.t || 0; });
          const o = await appel(c, {m: 'padel', recs, tables});
          ids.forEach(id => { const r = D[id]; if (!r || (+r.t || 0) === envoi[id]) delete meta.sale[id]; });
          meta.h = h;
          if (o.r === meta.r + recs.length) meta.r = o.r;
          svMeta();
        }
        lsSet('padel:derniere', String(Date.now()));
        statut('ok');
      } catch (err) { statut(/mot de passe/.test(err.message) ? 'cle' : 'erreur'); }
      finally { enCours = false; if (encore) { encore = false; e.bientot(300); } }
    }
  };
  setInterval(() => { if (document.visibilityState === 'visible') e.cycle(); }, 20000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') e.cycle(); else e.partir(); });
  addEventListener('online', () => e.cycle());
  addEventListener('pagehide', () => e.partir());
  return e;
})();

// ---------- Tableaux lisibles (feuille Google et fichier Excel) ----------
function tablesDrive() {
  const E = tous('eleve').sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  const C = tous('cours').sort((a, b) => debutMs(a) - debutMs(b));
  const statutTxt = c => c.statut === 'annule' ? 'Annulé' : c.statut === 'absent' ? 'Absent (facturé)' : passe(c) ? 'Donné' : 'Prévu';
  const resume = [['Élève', 'Téléphone', 'Leçons données', 'Leçons prévues', 'Forfait : séances restantes', 'Total dû', 'Payé', 'Reste à payer', 'État']];
  E.forEach(e => {
    const b = bilan(e.id), rest = b.forfaits.reduce((s, x) => s + Math.max(0, x.restantes), 0);
    resume.push([e.nom, e.tel || '', b.donnes, b.prevus, b.forfaits.length ? rest : '', euro(b.du), euro(b.paye), euro(Math.max(0, b.solde)),
      b.solde > 0.004 ? 'Doit ' + euro(b.solde) : b.solde < -0.004 ? 'En avance de ' + euro(-b.solde) : 'À jour']);
  });
  const agenda = [['Date', 'Jour', 'Début', 'Fin', 'Durée', 'Élèves', 'Personnes', 'Facturation', 'Statut', 'Lieu', 'Note', 'Compte rendu']];
  C.forEach(c => agenda.push([dNum(c.date), JOURSL[jourDe(c.date).getDay()], c.debut, hDe(minDe(c.debut) + (c.duree || 60)), dureeTxt(c.duree || 60),
    (c.eleves || []).map(nomE).join(', '), (c.eleves || []).length, (c.eleves || []).map(id => prenom(id) + ' : ' + factuTxt(c, id)).join(' · '), statutTxt(c), c.lieu || '', c.note || '', crTxt(c)]));
  const paiements = [['Date', 'Élève', 'Montant', 'Mode', 'Note']];
  tous('paiement').sort((a, b) => (a.date || '').localeCompare(b.date || '')).forEach(p => paiements.push([dNum(p.date || auj()), nomE(p.eleve), euro(p.montant), p.mode || '', p.note || '']));
  const forfaits = [['Achat', 'Élève', 'Forfait', 'Séances', 'Prix', 'Faites', 'Prévues (au planning)', 'Restantes à donner', 'Pas encore au planning']];
  E.forEach(e => bilan(e.id).forfaits.forEach(x => forfaits.push([dNum(x.f.date || auj()), e.nom, x.f.nom || '', x.f.seances, euro(x.f.prix), x.faites, x.prevues, x.restantes, x.libres])));
  const eleves = [['Nom', 'Téléphone', 'E-mail', 'Niveau', 'Note', 'Archivé']];
  E.forEach(e => eleves.push([e.nom, e.tel || '', e.email || '', e.niveau || '', e.note || '', e.archive ? 'oui' : '']));
  const tarifs = [['Formule', 'Personnes', 'Prix par séance d\'1h (par personne)', 'Cycle (séances)', 'Prix du cycle (par personne)']];
  tous('tarif').sort((a, b) => a.pers - b.pers).forEach(t => tarifs.push([t.nom, t.pers, euro(t.prix), t.cycle, euro(t.prixCycle)]));
  const etatDm = {attente: 'En attente', acceptee: 'Acceptée', refusee: 'Refusée'};
  const demandes = [['Reçue le', 'Jour du cours', 'Heure', 'Nom', 'Téléphone', 'E-mail', 'Personnes', 'Formule', 'Niveau', 'Message', 'État']];
  tous('demande').sort((a, b) => (b.recue || 0) - (a.recue || 0)).forEach(x => demandes.push([x.recue ? new Date(x.recue).toLocaleString('fr-BE', {day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'}) : '',
    dNum(x.date) + ' (' + JOURSL[jourDe(x.date).getDay()] + ')', x.debut, x.nom || '', x.tel || '', x.email || '', x.pers || 1, x.formule === 'cycle' ? 'Forfait' : 'Une séance', x.niveau || '', x.msg || '', etatDm[x.etat] || x.etat || '']));
  return {'Résumé': resume, 'Demandes': demandes, 'Agenda': agenda, 'Paiements': paiements, 'Forfaits': forfaits, 'Élèves': eleves, 'Tarifs': tarifs};
}

// ---------- Interface : outils ----------
let onglet = lsGet(KV) || 'agenda', sousCompte = 'compte';
if (onglet === 'tarifs') { onglet = 'compte'; sousCompte = 'tarifs'; }
// En haut de l'onglet Compte : Compte | Tarifs
const segCompte = () => `<div class="seg large"><button type="button" data-sc="compte" class="${sousCompte === 'compte' ? 'on' : ''}">📊 Compte</button><button type="button" data-sc="tarifs" class="${sousCompte === 'tarifs' ? 'on' : ''}">💶 Tarifs</button></div>`;
const brancherSeg = () => document.querySelectorAll('[data-sc]').forEach(b => b.onclick = () => { sousCompte = b.dataset.sc; rendre(); scrollTo(0, 0); });
const etatA = {vue: innerWidth < 700 ? 'jour' : 'semaine', date: auj(), deplacer: null};
function bulle(t) { document.querySelectorAll('.bulle').forEach(x => x.remove()); const d = document.createElement('div'); d.className = 'bulle'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 1900); }
function ouvrir(html, apres) {
  $('feuille').innerHTML = html; $('fond').hidden = false; document.body.style.overflow = 'hidden';
  $('feuille').scrollTop = 0;
  $('feuille').querySelectorAll('[data-ferme]').forEach(b => b.onclick = fermer);
  if (apres) apres($('feuille'));
}
function fermer() { if (typeof stopDictee === 'function') stopDictee(); $('fond').hidden = true; $('feuille').innerHTML = ''; document.body.style.overflow = ''; }
$('fond').addEventListener('click', e => { if (e.target === $('fond')) fermer(); });
addEventListener('keydown', e => { if (e.key === 'Escape' && !$('fond').hidden) fermer(); });
const tete = t => `<h2><span>${t}</span><button type="button" data-ferme aria-label="Fermer">✕</button></h2>`;
const couleurs = ['#0b6e8f', '#7a4fd0', '#d1631b', '#1e8a4c', '#c2185b', '#5d6d7e', '#00897b', '#8d6e63'];
const couleurE = id => { let h = 0; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) | 0; return couleurs[Math.abs(h) % couleurs.length]; };
const initiales = n => (n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0].toUpperCase()).join('');
const optHeures = sel => { let h = ''; for (let m = reg().debut * 60; m <= reg().fin * 60; m += 30) { const v = hDe(m); h += `<option value="${v}"${v === sel ? ' selected' : ''}>${hTxt(v)}</option>`; } return h; };
const optDurees = sel => [[30, '30 min'], [60, '1h'], [90, '1h30'], [120, '2h']].map(([v, t]) => `<option value="${v}"${+sel === v ? ' selected' : ''}>${t}</option>`).join('');
const soldePill = b => b.solde > 0.004 ? `<span class="pill err">doit ${euro(b.solde)}</span>` : b.solde < -0.004 ? `<span class="pill bleu">avance ${euro(-b.solde)}</span>` : `<span class="pill ok">à jour</span>`;
const lienTel = t => t ? `<a href="tel:${esc(t.replace(/[^+\d]/g, ''))}">${esc(t)}</a>` : '';
const lienWa = (t, msg) => { if (!t) return ''; let n = t.replace(/[^\d+]/g, ''); if (n.startsWith('00')) n = n.slice(2); else if (n.startsWith('+')) n = n.slice(1); else if (n.startsWith('0')) n = '32' + n.slice(1); return `https://wa.me/${n}${msg ? '?text=' + encodeURIComponent(msg) : ''}`; };
async function copier(t) { try { await navigator.clipboard.writeText(t); bulle('Message copié ✓'); } catch (e) { prompt('Copie ce message :', t); } }

// ---------- Rendu ----------
function rendre() {
  document.querySelectorAll('nav.bas button').forEach(b => b.classList.toggle('on', b.dataset.o === onglet));
  $('titre').textContent = reg().prof ? 'J\'Padel · ' + reg().prof : 'J\'Padel';
  const nd = demandesAtt().length; $('b-dem').hidden = !nd; $('b-dem-n').textContent = nd;
  ({agenda: vueAgenda, eleves: vueEleves, compte: () => sousCompte === 'tarifs' ? vueTarifs() : vueCompte()}[onglet] || vueAgenda)();
}
document.querySelectorAll('nav.bas button').forEach(b => b.onclick = () => { if (b.dataset.o === 'compte' && onglet !== 'compte') sousCompte = 'compte'; onglet = b.dataset.o; lsSet(KV, onglet); etatA.deplacer = null; rendre(); scrollTo(0, 0); });

// ===== Agenda =====
const HAUT = 26; // hauteur d'une demi-heure, en pixels
function vueAgenda() {
  const A = etatA, R = reg(), v = A.vue;
  let titre = '', jours = [];
  if (v === 'mois') { const d = jourDe(A.date); titre = MOISL[d.getMonth()] + ' ' + d.getFullYear(); }
  else if (v === 'semaine') { const l = lundi(A.date); for (let i = 0; i < 7; i++) jours.push(ajJ(l, i)); const a = jourDe(jours[0]), b = jourDe(jours[6]); titre = 'Semaine du ' + a.getDate() + (a.getMonth() !== b.getMonth() ? ' ' + MOIS[a.getMonth()] : '') + ' au ' + b.getDate() + ' ' + MOIS[b.getMonth()]; }
  else { jours = [A.date]; titre = dLong(A.date); titre = titre[0].toUpperCase() + titre.slice(1); }
  const ch = A.deplacer && get(A.deplacer);
  let h = `<div class="barre"><button type="button" id="a-prec" aria-label="Précédent">◀</button><button type="button" id="a-auj">Aujourd'hui</button><button type="button" id="a-suiv" aria-label="Suivant">▶</button>
    <span class="titre">${esc(titre)}</span>
    <span class="seg">${[['jour', 'Jour'], ['semaine', 'Semaine'], ['mois', 'Mois']].map(([k, t]) => `<button type="button" data-v="${k}" class="${v === k ? 'on' : ''}">${t}</button>`).join('')}</span>
    <button type="button" id="a-ouv" class="${A.ouvrir ? 'on vert' : ''}" title="Ouvrir ou fermer des créneaux sur ta page de réservation">🟢 Créneaux</button>
    <button type="button" class="go" id="a-nouv">+ Cours</button></div>`;
  const nd = demandesAtt();
  if (nd.length) h += `<button type="button" class="bandeau dem" id="a-dem"><span>📩 ${nd.length === 1 ? 'Nouvelle demande de cours : ' + esc(nd[0].nom) + ', ' + esc(dCourt(nd[0].date)) + ' à ' + hTxt(nd[0].debut) : nd.length + ' nouvelles demandes de cours'}</span><b>Voir ›</b></button>`;
  if (A.ouvrir) h += `<div class="bandeau vert"><span>🟢 <b>Tes créneaux</b> : touche une heure pour l'ouvrir sur ta <a href="${esc(lienResa())}" target="_blank" rel="noopener">page de réservation</a> (cours de ${dureeTxt(dureeResa())}), encore une fois pour la fermer. Tes heures de cours sont bloquées toutes seules.</span>
    <span class="btns" style="margin:0;flex:1 1 100%"><button type="button" id="o-plage">Ouvrir plusieurs heures…</button><button type="button" id="o-copie">Copier la semaine d'avant</button><button type="button" id="o-vide">Tout fermer</button><button type="button" class="go" id="o-fin">Terminé</button></span></div>`;
  if (ch) h += `<div class="bandeau"><span>↔️ Déplacer le cours de ${esc((ch.eleves || []).map(prenom).join(', '))} (${dCourt(ch.date)} ${hTxt(ch.debut)}) : touche le nouveau créneau${v === 'mois' ? ' (choisis d\'abord le jour)' : ''}.</span><button type="button" id="a-depl-n">Annuler</button></div>`;
  if (v === 'jour') {
    const l = lundi(A.date); h += '<div class="semstrip">';
    for (let i = 0; i < 7; i++) { const d = ajJ(l, i), n = tous('cours').filter(c => c.date === d && actif(c)).length; h += `<button type="button" data-j="${d}" class="${d === A.date ? 'on' : ''} ${d === auj() ? 'auj' : ''}">${JOURS[jourDe(d).getDay()]}<b>${jourDe(d).getDate()}</b><i>${n ? n + ' cours' : ''}</i></button>`; }
    h += '</div>';
  }
  if (v === 'mois') h += grilleMois();
  else h += grilleJours(jours);
  if (v !== 'mois') { const no = jours.filter(d => d >= auj()).reduce((s, d) => s + heuresOuv(d).filter(x => !occupe(d, x, dureeResa())).length, 0); if (no || A.ouvrir) h += `<p class="note" style="margin:6px 2px 0">🟢 ${no ? no + ' créneau' + (no > 1 ? 'x' : '') + ' encore libre' + (no > 1 ? 's' : '') + ' sur ta page de réservation pour ' + (v === 'jour' ? 'ce jour' : 'cette semaine') : 'Aucun créneau ouvert ' + (v === 'jour' ? 'ce jour-là' : 'cette semaine')}.</p>`; }
  // Résumé de la période affichée
  let deb, fin;
  if (v === 'mois') { const d = jourDe(A.date); deb = iso(new Date(d.getFullYear(), d.getMonth(), 1)); fin = iso(new Date(d.getFullYear(), d.getMonth() + 1, 0)); }
  else { deb = jours[0]; fin = jours[jours.length - 1]; }
  const C = tous('cours').filter(c => actif(c) && c.date >= deb && c.date <= fin);
  const heures = C.reduce((s, c) => s + (c.duree || 60), 0) / 60, val = C.reduce((s, c) => s + (c.eleves || []).reduce((t, e) => t + valeur(c, e), 0), 0);
  const joueurs = new Set(); C.forEach(c => (c.eleves || []).forEach(e => joueurs.add(e)));
  h += `<div class="resume"><div><b>${C.length}</b><span>cours</span></div><div><b>${String(Math.round(heures * 10) / 10).replace('.', ',')} h</b><span>de terrain</span></div><div><b>${joueurs.size}</b><span>élèves</span></div><div><b>${euro(val)}</b><span>valeur des cours</span></div></div>`;
  h += `<div class="legende"><span><i style="background:var(--p1)"></i>individuel</span><span><i style="background:var(--p2)"></i>à 2</span><span><i style="background:var(--p3)"></i>à 3</span><span><i style="background:var(--p4)"></i>à 4</span><span>Touche un créneau vide pour ajouter un cours.${matchMedia('(pointer:fine)').matches ? ' Glisse un cours pour le déplacer.' : ''}</span></div>`;
  h += `<a class="partage-resa terrain" href="${esc(lienTerrain())}" target="_blank" rel="noopener">🎾 Réserver un terrain<small>ouvre l'appli Athois Le Padel</small></a>`;
  h += `<button type="button" class="partage-resa" id="a-part">🔗 Envoyer ma page de réservation<small>par WhatsApp, SMS ou e-mail, à un élève ou un futur élève</small></button>`;
  $('vue').innerHTML = h;
  $('a-part').onclick = () => fPartagerResa();
  const pas = v === 'mois' ? null : v === 'semaine' ? 7 : 1;
  $('a-prec').onclick = () => { A.date = pas ? ajJ(A.date, -pas) : iso(new Date(jourDe(A.date).getFullYear(), jourDe(A.date).getMonth() - 1, 1)); rendre(); };
  $('a-suiv').onclick = () => { A.date = pas ? ajJ(A.date, pas) : iso(new Date(jourDe(A.date).getFullYear(), jourDe(A.date).getMonth() + 1, 1)); rendre(); };
  $('a-auj').onclick = () => { A.date = auj(); rendre(); };
  $('a-nouv').onclick = () => fCours(null, {date: A.date === auj() || v === 'jour' ? A.date : A.date});
  if ($('a-depl-n')) $('a-depl-n').onclick = () => { A.deplacer = null; rendre(); };
  $('a-ouv').onclick = () => { A.ouvrir = !A.ouvrir; A.deplacer = null; if (A.ouvrir && A.vue === 'mois') A.vue = 'semaine'; rendre(); };
  if ($('a-dem')) $('a-dem').onclick = () => nd.length === 1 ? fDemande(nd[0].id) : fDemandes();
  if (A.ouvrir) {
    const semJ = () => { const l = lundi(A.date); return Array.from({length: 7}, (_, i) => ajJ(l, i)); };
    $('o-fin').onclick = () => { A.ouvrir = false; rendre(); };
    $('o-plage').onclick = () => fOuvrirPlage();
    $('o-copie').onclick = () => {
      const J = semJ().filter(d => d >= auj()), n = J.reduce((s, d) => s + heuresOuv(ajJ(d, -7)).length, 0);
      if (!n) { bulle('Aucun créneau ouvert la semaine d\'avant.'); return; }
      if (!confirm(`Ouvrir cette semaine les mêmes créneaux que la semaine d'avant (${n}) ? Ceux de cette semaine sont remplacés.`)) return;
      J.forEach(d => setOuv(d, heuresOuv(ajJ(d, -7)))); rendre(); bulle('Créneaux copiés ✓');
    };
    $('o-vide').onclick = () => {
      const J = semJ().filter(d => d >= auj()); if (!J.some(d => heuresOuv(d).length)) { bulle('Rien d\'ouvert cette semaine.'); return; }
      if (!confirm('Fermer tous les créneaux encore ouverts de cette semaine ?')) return;
      J.forEach(d => setOuv(d, [])); rendre(); bulle('Créneaux fermés');
    };
  }
  $('vue').querySelectorAll('.seg button').forEach(b => b.onclick = () => { A.vue = b.dataset.v; rendre(); });
  $('vue').querySelectorAll('[data-j]').forEach(b => b.onclick = () => { A.date = b.dataset.j; if (b.closest('.mois') || b.classList.contains('tete')) A.vue = 'jour'; rendre(); });
  brancherGrille();
  // Faire défiler jusqu'à la première heure utile (une seule fois)
  if (v !== 'mois' && !A.defile) { A.defile = true; const now = new Date(), m = now.getHours() * 60; const cible = document.querySelector('.grille'); if (cible && jours.includes(auj()) && m > R.debut * 60 + 120) setTimeout(() => scrollTo(0, cible.offsetTop + (m - R.debut * 60 - 60) / 30 * HAUT - 60), 30); }
}
function grilleJours(jours) {
  const R = reg(), m0 = R.debut * 60, m1 = (R.fin + 1) * 60, n = (m1 - m0) / 30, H = n * HAUT;
  let h = `<div class="grille" style="grid-template-columns:44px repeat(${jours.length},1fr)"><div class="tete" style="cursor:default"></div>`;
  jours.forEach(d => { h += `<div class="tete ${d === auj() ? 'auj' : ''}" data-j="${d}">${jours.length > 1 ? JOURS[jourDe(d).getDay()] + ' ' + jourDe(d).getDate() : dCourt(d)}</div>`; });
  h += `<div class="heures" style="height:${H}px">`;
  for (let m = m0; m < m1; m += 60) h += `<div style="top:${(m - m0) / 30 * HAUT}px">${m / 60}h</div>`;
  h += '</div>';
  const now = new Date(), mNow = now.getHours() * 60 + now.getMinutes();
  jours.forEach(d => {
    h += `<div class="col ${d === auj() ? 'aujc' : ''}" data-d="${d}" style="height:${H}px">`;
    for (let i = 1; i < n; i++) h += `<div class="${i % 2 ? 'demi' : 'pleine'}" style="top:${i * HAUT}px"></div>`;
    if (d === auj() && mNow >= m0 && mNow <= m1) h += `<div class="maintenant" style="top:${(mNow - m0) / 30 * HAUT}px"></div>`;
    // Créneaux ouverts à la réservation (fond vert) et demandes en attente
    const dr = dureeResa();
    heuresOuv(d).forEach(x => { const a = minDe(x); if (a < m0 || a >= m1) return; const pr = occupe(d, x, dr);
      h += `<div class="ouv ${pr ? 'pris' : ''}" style="top:${(a - m0) / 30 * HAUT + 1}px;height:${Math.min(dr, m1 - a) / 30 * HAUT - 2}px"><span>${hTxt(x)} ${pr ? 'ouvert · pris' : 'ouvert'}</span></div>`; });
    demandesAtt().forEach(x => seancesDm(x).forEach((s1, k) => { if (s1.date !== d) return; const a = minDe(s1.debut), dur = x.duree || 60;
      h += `<div class="bloc dem" data-dm="${x.id}" style="top:${(a - m0) / 30 * HAUT + 1}px;height:${dur / 30 * HAUT - 2}px;left:2px;right:2px"><b>📩 ${esc(hTxt(s1.debut))}</b>${esc(jours.length > 1 ? (x.nom || '').split(' ')[0] : x.nom)} (demande${x.autres ? ', séance ' + (k + 1) + '/' + seancesDm(x).length : ''})</div>`; }));
    // Cours du jour, côte à côte quand ils se chevauchent
    const C = tous('cours').filter(actif).concat(tous('occupe')).filter(c => c.date === d).sort((a, b) => minDe(a.debut) - minDe(b.debut) || (b.duree - a.duree));
    const voies = [], place = {};
    let groupe = [], finG = -1;
    const fermerG = () => { const nv = Math.max(1, ...groupe.map(c => place[c.id] + 1)); groupe.forEach(c => { place[c.id + ':n'] = nv; }); groupe = []; };
    C.forEach(c => {
      const a = minDe(c.debut), b = a + (c.duree || 60);
      if (a >= finG && groupe.length) { fermerG(); voies.length = 0; }
      let k = voies.findIndex(f => f <= a); if (k < 0) { k = voies.length; voies.push(b); } else voies[k] = b;
      place[c.id] = k; groupe.push(c); finG = Math.max(finG, b);
    });
    if (groupe.length) fermerG();
    C.forEach(c => {
      const a = minDe(c.debut), dur = c.duree || 60, nv = place[c.id + ':n'], k = place[c.id];
      if (c.type === 'occupe') {
        h += `<div class="bloc occ ${c.genre === 'academie' ? 'academie' : ''}" data-oc="${c.id}" style="top:${(a - m0) / 30 * HAUT + 1}px;height:${dur / 30 * HAUT - 2}px;left:calc(${k / nv * 100}% + 2px);width:calc(${100 / nv}% - 4px)" title="${esc(hTxt(c.debut) + ' ' + (c.titre || ''))}">
          <b>${esc(hTxt(c.debut))}${jours.length === 1 ? ' – ' + esc(hTxt(hDe(a + dur))) : ''}</b>${c.genre === 'academie' ? '🎓 ' : '📌 '}${esc(c.titre || (c.genre === 'academie' ? 'Académie' : 'Occupé'))}${jours.length === 1 && c.lieu ? ' · ' + esc(c.lieu) : ''}${jours.length === 1 && c.note ? '<br><i>' + esc(c.note) + '</i>' : ''}</div>`;
        return;
      }
      const np = Math.min(4, Math.max(1, (c.eleves || []).length));
      const noms = (c.eleves || []).map(jours.length > 1 ? prenom : nomE).join(', ') || '(sans élève)';
      h += `<div class="bloc n${np} ${etatA.deplacer === c.id ? 'choisi' : ''}" data-c="${c.id}" style="top:${(a - m0) / 30 * HAUT + 1}px;height:${dur / 30 * HAUT - 2}px;left:calc(${k / nv * 100}% + 2px);width:calc(${100 / nv}% - 4px)" title="${esc(hTxt(c.debut) + ' ' + noms)}">
        <b>${esc(hTxt(c.debut))}${jours.length === 1 ? ' – ' + esc(hTxt(hDe(a + dur))) : ''}</b>${esc(noms)}${jours.length === 1 && c.lieu ? ' · ' + esc(c.lieu) : ''}${crTxt(c) ? ' 📝' : ''}${attentesPour(c.date, c.debut, dur).length ? ' 🔔' + attentesPour(c.date, c.debut, dur).length : ''}${jours.length === 1 && c.note ? '<br><i>' + esc(c.note) + '</i>' : ''}</div>`;
    });
    // Cours annulés : une fine bande à droite, le créneau reste libre (nouveau cours, ouverture à la réservation…)
    tous('cours').filter(c => c.date === d && !actif(c)).forEach(c => {
      const a = minDe(c.debut), dur = c.duree || 60;
      h += `<div class="bloc annule" data-c="${c.id}" data-an="1" style="top:${(a - m0) / 30 * HAUT + 1}px;height:${dur / 30 * HAUT - 2}px;right:2px;width:${jours.length > 1 ? 30 : 22}%" title="Annulé : ${esc(hTxt(c.debut) + ' ' + (c.eleves || []).map(prenom).join(', '))}"><b>✕ ${esc(hTxt(c.debut))}</b>${esc((c.eleves || []).map(prenom).join(', '))}</div>`;
    });
    h += '</div>';
  });
  return h + '</div>';
}
function grilleMois() {
  const d = jourDe(etatA.date), prem = iso(new Date(d.getFullYear(), d.getMonth(), 1)), l = lundi(prem);
  let h = '<div class="mois">' + ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'].map(j => `<div class="jn">${j}</div>`).join('');
  for (let i = 0; i < 42; i++) {
    const j = ajJ(l, i), jd = jourDe(j); if (i === 35 && jd.getMonth() !== d.getMonth()) break;
    const C = tous('cours').filter(c => c.date === j && actif(c)).sort((a, b) => minDe(a.debut) - minDe(b.debut));
    h += `<button type="button" data-j="${j}" class="${jd.getMonth() !== d.getMonth() ? 'hors' : ''} ${j === auj() ? 'auj' : ''}"><b>${jd.getDate()}</b>`;
    const O = tous('occupe').filter(o => o.date === j), CO = C.concat(O).sort((a, b) => minDe(a.debut) - minDe(b.debut));
    CO.slice(0, 3).forEach(c => { h += c.type === 'occupe' ? `<small class="occ ${c.genre === 'academie' ? 'academie' : ''}">${esc(hTxt(c.debut))} ${c.genre === 'academie' ? '🎓' : '📌'} ${esc(c.titre || '')}</small>` : `<small style="background:var(--p${Math.min(4, Math.max(1, (c.eleves || []).length))})">${esc(hTxt(c.debut))} ${esc((c.eleves || []).map(prenom).join(', '))}</small>`; });
    if (CO.length > 3) h += `<small style="color:var(--muted)">+${CO.length - 3} autres</small>`;
    h += '</button>';
  }
  return h + '</div>';
}
// Touches et glisser-déposer dans la grille
function brancherGrille() {
  const R = reg(), m0 = R.debut * 60;
  const minAt = (col, y) => { const r = col.getBoundingClientRect(); let m = m0 + Math.floor((y - r.top) / HAUT) * 30; return Math.max(m0, Math.min(R.fin * 60, m)); };
  document.querySelectorAll('.col').forEach(col => col.addEventListener('click', e => {
    if (e.target.closest('.bloc') || glisse.fait) return;
    const m = minAt(col, e.clientY), d = col.dataset.d;
    if (etatA.ouvrir) { basculerOuv(d, m); return; }
    if (etatA.deplacer) { deplacer(etatA.deplacer, d, hDe(m)); return; }
    fCours(null, {date: d, debut: hDe(m)});
  }));
  document.querySelectorAll('.bloc').forEach(b => {
    b.addEventListener('click', e => { e.stopPropagation(); if (glisse.fait) return; if (b.dataset.dm) { fDemande(b.dataset.dm); return; } if (b.dataset.an && (etatA.ouvrir || etatA.deplacer)) { const cc = get(b.dataset.c), dd = b.closest('.col').dataset.d; if (etatA.ouvrir) basculerOuv(dd, minDe(cc.debut)); else deplacer(etatA.deplacer, dd, cc.debut); return; } if (b.dataset.oc) { if (etatA.ouvrir) { bulle('Tu es déjà pris à ce moment-là : ce créneau est bloqué tout seul sur ta page.'); return; } fOccupe(b.dataset.oc); return; } if (etatA.ouvrir) { bulle('Il y a déjà un cours : ce créneau est bloqué tout seul sur ta page.'); return; } if (etatA.deplacer && etatA.deplacer !== b.dataset.c) { bulle('Ce créneau est déjà pris par un autre cours : choisis une place libre, ou mets-le à côté.'); return; } fDetail(b.dataset.c); });
    // Glisser à la souris (ordinateur). Au doigt : bouton « Déplacer » puis toucher le créneau.
    b.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse' || e.button !== 0 || etatA.ouvrir || b.dataset.dm || b.dataset.oc) return;
      const c = get(b.dataset.c); if (!c) return;
      glisse.c = c; glisse.x = e.clientX; glisse.y = e.clientY; glisse.dy = e.clientY - b.getBoundingClientRect().top; glisse.b = b; glisse.fait = false; glisse.on = true;
    });
  });
}
const glisse = {on: false, fait: false};
addEventListener('pointermove', e => {
  if (!glisse.on) return;
  if (!glisse.fait && Math.hypot(e.clientX - glisse.x, e.clientY - glisse.y) < 6) return;
  glisse.fait = true; glisse.b.classList.add('fantome');
  document.querySelectorAll('.vise').forEach(v => v.remove());
  const col = document.elementsFromPoint(e.clientX, e.clientY).find(x => x.classList && x.classList.contains('col')); if (!col) return;
  const R = reg(), m0 = R.debut * 60, r = col.getBoundingClientRect();
  let m = m0 + Math.round((e.clientY - glisse.dy - r.top) / HAUT) * 30; m = Math.max(m0, Math.min(R.fin * 60, m));
  glisse.cible = {d: col.dataset.d, h: hDe(m)};
  const v = document.createElement('div'); v.className = 'vise'; v.style.top = (m - m0) / 30 * HAUT + 'px'; v.style.height = (glisse.c.duree || 60) / 30 * HAUT + 'px';
  v.textContent = ''; col.appendChild(v);
  glisse.b.style.transform = `translate(${e.clientX - glisse.x}px,${e.clientY - glisse.y}px)`;
});
addEventListener('pointerup', () => {
  if (!glisse.on) return; glisse.on = false;
  if (!glisse.fait) return;
  const c = glisse.c, t = glisse.cible; glisse.cible = null;
  setTimeout(() => { glisse.fait = false; }, 50);
  if (t && (t.d !== c.date || t.h !== c.debut)) deplacer(c.id, t.d, t.h); else rendre();
});
function deplacer(id, date, debut) {
  const c = get(id); if (!c) return;
  const essai = Object.assign({}, c, {date, debut}), cf = conflits(essai);
  if (cf.length && !confirm(`Il y a déjà un cours à ce moment-là (${cf.map(o => hTxt(o.debut) + ' ' + (o.eleves || []).map(prenom).join(', ')).join(' ; ')}). Déplacer quand même ?`)) { rendre(); return; }
  const avant = dCourt(c.date) + ' ' + hTxt(c.debut);
  c.date = date; c.debut = debut; put(c);
  etatA.deplacer = null;
  bulle(`Cours déplacé : ${avant} → ${dCourt(date)} ${hTxt(debut)}`);
  rendre();
}

// Fenêtre : un cours (nouveau ou modifié)
function fCours(id, pre) {
  const c0 = id ? get(id) : null;
  const c = c0 ? JSON.parse(JSON.stringify(c0)) : Object.assign({id: nid(), type: 'cours', date: auj(), debut: '18:00', duree: 60, eleves: [], f: {}, statut: 'prevu', lieu: (reg().lieux || [])[0] || '', note: ''}, pre || {});
  if (!c.f) c.f = {};
  const touche = {}; // prix modifiés à la main : on ne les recalcule plus
  let repeter = 0;
  const autoFactu = () => {
    const n = c.eleves.length;
    c.eleves.forEach(e => {
      const x = c.f[e];
      if (x && (x.forfait || x.gratuit || touche[e])) { if (x.forfait && !c0) { /* garde */ } else return; }
      const f = forfaitLibre(e, c.id);
      c.f[e] = f ? {forfait: f.id} : {prix: prixUnite(n, c.duree)};
    });
    Object.keys(c.f).forEach(e => { if (!c.eleves.includes(e)) delete c.f[e]; });
  };
  const recalcUnite = () => { c.eleves.forEach(e => { const x = c.f[e]; if (x && !x.forfait && !x.gratuit && !touche[e]) x.prix = prixUnite(c.eleves.length, c.duree); }); };
  const dessiner = () => {
    const cf = conflits(c);
    const E = tous('eleve').filter(e => !e.archive);
    // Élèves récents en premier
    const recents = {}; tous('cours').forEach(x => (x.eleves || []).forEach(e => { recents[e] = Math.max(recents[e] || 0, x.t || 0); }));
    const propo = E.filter(e => !c.eleves.includes(e.id)).sort((a, b) => (recents[b.id] || 0) - (recents[a.id] || 0) || a.nom.localeCompare(b.nom, 'fr'));
    let h = tete(c0 ? 'Modifier le cours' : 'Ajouter dans l\'agenda');
    if (!c0 && !c.demande) h += segGenre('cours');
    h += `<label class="l">Élèves (${c.eleves.length}/4)</label><div class="chips">${c.eleves.map(e => `<span class="chip">${esc(nomE(e))}<button type="button" data-retire="${e}" aria-label="Retirer">✕</button></span>`).join('') || '<span class="note">Personne pour l\'instant</span>'}</div>
      ${c.eleves.length < 4 ? `<select id="c-choix"><option value="">➕ Ajouter un élève…</option>${propo.slice().sort((a, b) => a.nom.localeCompare(b.nom, 'fr', {sensitivity: 'base'})).map(e => `<option value="${e.id}">${esc(e.nom)}</option>`).join('')}<option value="+">✏️ Nouvel élève (pas encore dans la liste)</option></select>
      <div class="ligne" id="c-nouv-l" hidden style="margin-top:6px"><input id="c-nouv" placeholder="Prénom et nom du nouvel élève" autocomplete="off"><button type="button" class="go" id="c-creer" style="flex:none">Ajouter</button></div>` : ''}`;
    h += `<div class="ligne"><div><label class="l">Jour</label><input type="date" id="c-date" value="${c.date}"></div><div><label class="l">Heure</label><select id="c-h">${optHeures(c.debut)}</select></div><div><label class="l">Durée</label><select id="c-dur">${optDurees(c.duree)}</select></div></div>`;
    if (cf.length) h += `<div class="alerte">⚠️ Déjà un cours à ce moment-là : ${cf.map(o => esc(hTxt(o.debut) + ' ' + (o.eleves || []).map(prenom).join(', '))).join(' ; ')}</div>`;
    if (c.eleves.length) {
      h += `<label class="l">Prix pour chaque élève</label>`;
      c.eleves.forEach(e => {
        const x = c.f[e] || {}, F = bilan(e, c.id).forfaits.filter(y => y.libres > 0 || y.f.id === x.forfait);
        const val = x.forfait ? 'f:' + x.forfait : x.gratuit ? 'g' : 'u';
        h += `<div class="factu"><b>${esc(nomE(e))}</b><div class="ligne"><select data-fx="${e}">
          ${F.map(y => `<option value="f:${y.f.id}"${val === 'f:' + y.f.id ? ' selected' : ''}>Forfait ${esc(y.f.nom || '')} (${Math.max(0, y.libres)} place${y.libres > 1 ? 's' : ''} libre${y.libres > 1 ? 's' : ''})</option>`).join('')}
          <option value="u"${val === 'u' ? ' selected' : ''}>À l'unité</option><option value="g"${val === 'g' ? ' selected' : ''}>Offert</option></select>
          ${val === 'u' ? `<input type="number" inputmode="decimal" step="0.5" min="0" data-px="${e}" value="${x.prix}" style="max-width:90px" aria-label="Prix">` : ''}</div></div>`;
      });
      const tot = c.eleves.reduce((s, e) => s + ((c.f[e] || {}).prix && !(c.f[e] || {}).forfait && !(c.f[e] || {}).gratuit ? +c.f[e].prix : 0), 0);
      const t = tarifPour(c.eleves.length);
      h += `<p class="note" style="margin:6px 0 0">Tarif ${esc(t ? t.nom.toLowerCase() : '')} : ${t ? euro(prixUnite(c.eleves.length, c.duree)) + ' par personne pour ' + dureeTxt(c.duree) : ''}. ${tot ? 'À payer à l\'unité : <b>' + euro(tot) + '</b>.' : ''} <button type="button" class="lien" id="c-forf">+ Vendre un forfait</button></p>`;
    }
    h += `<div class="ligne"><div><label class="l">Lieu (facultatif)</label><input id="c-lieu" list="c-lieux" value="${esc(c.lieu || '')}" placeholder="Club, terrain…"><datalist id="c-lieux">${(reg().lieux || []).map(l => `<option value="${esc(l)}">`).join('')}</datalist></div>`;
    if (!c0) h += `<div><label class="l">Répéter chaque semaine</label><select id="c-rep">${[0, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20].map(n => `<option value="${n}"${n === repeter ? ' selected' : ''}>${n ? n + ' semaines' : 'Non, une fois'}</option>`).join('')}</select></div>`;
    h += `</div><label class="l">Note</label><input id="c-note" value="${esc(c.note || '')}" placeholder="Ex. travail de la bandeja">`;
    h += `<div class="btns"><button type="button" class="go" id="c-ok" ${c.eleves.length ? '' : 'disabled'}>${c0 ? 'Enregistrer' : 'Ajouter le cours'}</button><button type="button" data-ferme>Annuler</button></div>`;
    ouvrir(h, f => {
      f.querySelectorAll('[data-genre]').forEach(b => b.onclick = () => { if (b.dataset.genre === 'cours') return; lire(); fOccupe(null, {genre: b.dataset.genre, date: c.date, debut: c.debut}); });
      const sel = f.querySelector('#c-choix');
      if (sel) sel.onchange = () => {
        const v = sel.value; if (!v) return;
        if (v === '+') { f.querySelector('#c-nouv-l').hidden = false; sel.value = ''; f.querySelector('#c-nouv').focus(); return; }
        lire(); c.eleves.push(v); autoFactu(); recalcUnite(); dessiner();
      };
      const creer = () => {
        const n = f.querySelector('#c-nouv').value.trim(); if (!n) return;
        const ex = E.find(e => e.nom.toLowerCase() === n.toLowerCase());
        lire();
        const id = ex ? ex.id : put({id: nid(), type: 'eleve', nom: nomPropre(n), tel: '', email: '', niveau: '', note: ''}).id;
        if (!c.eleves.includes(id)) c.eleves.push(id);
        autoFactu(); recalcUnite(); dessiner();
        if (!ex) bulle('Élève ajouté ✓ (ajoute son téléphone plus tard dans Élèves)');
      };
      if (f.querySelector('#c-creer')) { f.querySelector('#c-creer').onclick = creer; f.querySelector('#c-nouv').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); creer(); } }; }
      f.querySelectorAll('[data-retire]').forEach(b => b.onclick = () => { lire(); c.eleves = c.eleves.filter(x => x !== b.dataset.retire); delete c.f[b.dataset.retire]; recalcUnite(); dessiner(); });
      const lire = () => { c.date = f.querySelector('#c-date').value || c.date; c.debut = f.querySelector('#c-h').value; c.duree = +f.querySelector('#c-dur').value; c.lieu = f.querySelector('#c-lieu').value.trim(); c.note = f.querySelector('#c-note').value.trim(); if (f.querySelector('#c-rep')) repeter = +f.querySelector('#c-rep').value; };
      ['#c-date', '#c-h'].forEach(s => f.querySelector(s).onchange = () => { lire(); dessiner(); });
      f.querySelector('#c-dur').onchange = () => { lire(); recalcUnite(); dessiner(); };
      f.querySelectorAll('[data-fx]').forEach(s => s.onchange = () => { lire(); const e = s.dataset.fx, v = s.value; c.f[e] = v.startsWith('f:') ? {forfait: v.slice(2)} : v === 'g' ? {gratuit: 1} : {prix: prixUnite(c.eleves.length, c.duree)}; delete touche[e]; dessiner(); });
      f.querySelectorAll('[data-px]').forEach(i => i.oninput = () => { touche[i.dataset.px] = 1; c.f[i.dataset.px] = {prix: +i.value.replace(',', '.') || 0}; });
      const fo = f.querySelector('#c-forf'); if (fo) fo.onclick = () => { lire(); fForfait({eleves: c.eleves.slice(), pers: c.eleves.length, duree: c.duree, retour: () => { autoFactuForcer(); fCoursReprise(); }}); };
      f.querySelector('#c-ok').onclick = () => {
        lire();
        if (!c.eleves.length) return;
        if (conflits(c).length && !confirm('Il y a déjà un cours à ce moment-là. Ajouter quand même ?')) return;
        if (c0) { put(c); bulle('Cours enregistré ✓'); }
        else {
          const serie = repeter > 1 ? nid() : '';
          const n = Math.max(1, repeter);
          for (let i = 0; i < n; i++) {
            const x = JSON.parse(JSON.stringify(c)); x.id = i ? nid() : c.id; x.date = ajJ(c.date, 7 * i); if (serie) x.serie = serie;
            // Chaque séance de la série prend une place de forfait tant qu'il en reste, sinon le prix à l'unité
            if (i) x.eleves.forEach(e => { const y = c.f[e] || {}; if (y.forfait) { const fl = forfaitLibre(e, x.id); x.f[e] = fl ? {forfait: fl.id} : {prix: prixUnite(x.eleves.length, x.duree)}; } });
            put(x);
          }
          bulle(n > 1 ? n + ' cours ajoutés ✓ (chaque semaine)' : 'Cours ajouté ✓');
        }
        etatA.date = c.date; fermer(); rendre();
        if (!c0 && c.demande && get(c.demande)) {
          const dm = get(c.demande); dm.etat = 'acceptee'; dm.cours = c.id;
          // Forfait avec plusieurs séances choisies : elles vont toutes dans l'agenda (prises sur le forfait)
          if (Array.isArray(dm.autres) && dm.autres.length && !dm.coursAutres) {
            const serie = nid(); c.serie = serie; put(c);
            dm.coursAutres = dm.autres.map(y => { const x = JSON.parse(JSON.stringify(c)); x.id = nid(); x.date = y.date; x.debut = y.debut; x.serie = serie; delete x.demande; delete x.cr;
              x.eleves.forEach(e => { const fl = forfaitLibre(e, x.id); x.f[e] = fl ? {forfait: fl.id} : {prix: prixUnite(x.eleves.length, x.duree)}; }); put(x); return x.id; });
            bulle((dm.autres.length + 1) + ' séances mises dans l\'agenda ✓');
          }
          put(dm); rendre(); fReponse(dm.id);
        }
      };
    });
  };
  // Après la vente d'un forfait depuis cette fenêtre : on rouvre le cours et on y met le forfait
  const autoFactuForcer = () => { c.eleves.forEach(e => { const x = c.f[e] || {}; if (!x.forfait) { const fl = forfaitLibre(e, c.id); if (fl) c.f[e] = {forfait: fl.id}; } }); };
  const fCoursReprise = () => dessiner();
  autoFactu();
  dessiner();
}
const nomPropre = s => s.replace(/\s+/g, ' ').split(' ').map(m => m ? m[0].toUpperCase() + m.slice(1) : m).join(' ');

// ---------- Créneaux ouverts ----------
function basculerOuv(d, m) {
  const dr = dureeResa(), hs = heuresOuv(d), dedans = hs.find(x => minDe(x) <= m && m < minDe(x) + dr);
  if (dedans) { setOuv(d, hs.filter(x => x !== dedans)); rendre(); return; }
  if (jourDe(d).getTime() + m * 60000 < Date.now()) { bulle('Cette heure est déjà passée.'); return; }
  if (m + dr > (reg().fin + 1) * 60) { bulle('Trop tard dans la journée pour un cours de ' + dureeTxt(dr) + '.'); return; }
  hs.push(hDe(m)); setOuv(d, hs); rendre();
  if (occupe(d, hDe(m), dr)) bulle('Ouvert, mais tu as déjà cours à ce moment-là : il reste « pris » sur ta page.');
}
function fOuvrirPlage() {
  const l = lundi(etatA.date), R = reg(), dr = dureeResa();
  const optH = (sel, a, b) => { let x = ''; for (let m = a * 60; m <= b * 60; m += 30) x += `<option value="${m}"${m === sel ? ' selected' : ''}>${hTxt(hDe(m))}</option>`; return x; };
  ouvrir(tete('🟢 Ouvrir plusieurs heures') + `<p class="note" style="margin-top:0">Ouvre d'un coup les mêmes heures sur plusieurs jours, à partir de la semaine du ${dCourt(l).replace(/\.$/, "")}. Un créneau = un cours de ${dureeTxt(dr)}.</p>
    <label class="l">Jours</label><div class="chips">${[1, 2, 3, 4, 5, 6, 0].map(j => `<label class="chip coche"><input type="checkbox" value="${j}" ${j >= 1 && j <= 5 ? 'checked' : ''}>${JOURS[j]}</label>`).join('')}</div>
    <div class="ligne"><div><label class="l">De</label><select id="p-de">${optH(Math.max(R.debut * 60, 9 * 60), R.debut, R.fin)}</select></div><div><label class="l">À</label><select id="p-a">${optH(Math.min((R.fin + 1) * 60, 12 * 60), R.debut, R.fin + 1)}</select></div>
    <div><label class="l">Pendant</label><select id="p-sem">${[1, 2, 3, 4, 5, 6, 8].map(n => `<option value="${n}"${n === 4 ? ' selected' : ''}>${n} semaine${n > 1 ? 's' : ''}</option>`).join('')}</select></div></div>
    <p class="note" id="p-txt"></p>
    <div class="btns"><button type="button" class="go" id="p-ok">Ouvrir</button><button type="button" id="p-ferme">Fermer ces heures</button><button type="button" data-ferme>Annuler</button></div>`, f => {
    const lire = () => { const J = [...f.querySelectorAll('input[type=checkbox]:checked')].map(i => +i.value), de = +f.querySelector('#p-de').value, a = +f.querySelector('#p-a').value, n = +f.querySelector('#p-sem').value;
      const hs = []; for (let m = de; m + dr <= a; m += 60) hs.push(hDe(m));
      const jours = []; for (let i = 0; i < n * 7; i++) { const d = ajJ(l, i); if (J.includes(jourDe(d).getDay()) && d >= auj()) jours.push(d); }
      return {hs, jours}; };
    const maj = () => { const x = lire(); f.querySelector('#p-txt').textContent = x.hs.length && x.jours.length ? `${x.hs.map(hTxt).join(', ')} · ${x.jours.length} jour${x.jours.length > 1 ? 's' : ''}, soit ${x.hs.length * x.jours.length} créneaux.` : 'Choisis au moins un jour et une plage d\'au moins ' + dureeTxt(dr) + '.'; };
    f.querySelectorAll('input,select').forEach(i => i.onchange = maj); maj();
    f.querySelector('#p-ok').onclick = () => { const x = lire(); if (!x.hs.length || !x.jours.length) return; const now = Date.now();
      x.jours.forEach(d => setOuv(d, heuresOuv(d).concat(x.hs.filter(h => jourDe(d).getTime() + minDe(h) * 60000 > now)))); fermer(); rendre(); bulle('Créneaux ouverts ✓'); };
    f.querySelector('#p-ferme').onclick = () => { const x = lire(); if (!x.hs.length || !x.jours.length) return;
      x.jours.forEach(d => setOuv(d, heuresOuv(d).filter(h => !x.hs.some(k => minDe(k) < minDe(h) + dr && minDe(h) < minDe(k) + dr)))); fermer(); rendre(); bulle('Heures fermées'); };
  });
}

// ---------- Académie et autres occupations (pas des cours privés, mais pas dispo) ----------
const segGenre = g => `<div class="seg large" style="margin-top:0">${[['cours', '👥 Cours privé'], ['academie', '🎓 Académie'], ['autre', '📌 Autre']].map(([k, t]) => `<button type="button" data-genre="${k}" class="${g === k ? 'on' : ''}">${t}</button>`).join('')}</div>`;
function fOccupe(id, pre) {
  const o0 = id ? get(id) : null;
  const o = o0 ? JSON.parse(JSON.stringify(o0)) : Object.assign({id: nid(), type: 'occupe', genre: 'autre', titre: '', date: auj(), debut: '18:00', duree: 60, lieu: '', note: ''}, pre || {});
  if (!o0 && o.genre === 'academie' && !o.titre) o.titre = 'Académie de padel';
  let repeter = o.genre === 'academie' && !o0 ? 10 : 0;
  const dessiner = () => {
    const serie = o0 && o0.serie ? tous('occupe').filter(x => x.serie === o0.serie && x.date >= o0.date).length : 0;
    let h = tete(o0 ? (o.genre === 'academie' ? '🎓 Académie' : '📌 Occupé') : 'Ajouter dans l\'agenda');
    if (!o0) h += segGenre(o.genre);
    h += `<label class="l">${o.genre === 'academie' ? 'Nom (ex. Académie, groupe des 10-12 ans)' : 'Quoi ? (rendez-vous, entraînement, congé…)'}</label><input id="o-titre" value="${esc(o.titre)}" placeholder="${o.genre === 'academie' ? 'Académie de padel' : 'Ex. Rendez-vous médecin'}">`;
    h += `<div class="ligne"><div><label class="l">Jour</label><input type="date" id="o-date" value="${o.date}"></div><div><label class="l">Heure</label><select id="o-h">${optHeures(o.debut)}</select></div><div><label class="l">Durée</label><select id="o-dur">${[[30, '30 min'], [60, '1h'], [90, '1h30'], [120, '2h'], [150, '2h30'], [180, '3h'], [240, '4h'], [300, '5h'], [480, '8h']].map(([v, t]) => `<option value="${v}"${+o.duree === v ? ' selected' : ''}>${t}</option>`).join('')}</select></div></div>`;
    h += `<div class="ligne"><div><label class="l">Lieu (facultatif)</label><input id="o-lieu" value="${esc(o.lieu || '')}" placeholder="Club, académie…"></div>`;
    if (!o0) h += `<div><label class="l">Répéter chaque semaine</label><select id="o-rep">${[0, 2, 4, 6, 8, 10, 12, 15, 20, 30, 40].map(n => `<option value="${n}"${n === repeter ? ' selected' : ''}>${n ? n + ' semaines' : 'Non, une fois'}</option>`).join('')}</select></div>`;
    h += `</div><label class="l">Note (facultatif)</label><input id="o-note" value="${esc(o.note || '')}">`;
    h += `<p class="note" style="margin:8px 0 0">Visible dans ton agenda seulement. Sur ta page de réservation, ce moment apparaît juste « pas disponible ».</p>`;
    h += `<div class="btns"><button type="button" class="go" id="o-ok">${o0 ? 'Enregistrer' : 'Ajouter'}</button>${o0 ? `<button type="button" class="rouge" id="o-sup">Supprimer</button>${serie > 1 ? `<button type="button" class="rouge" id="o-supS">Supprimer la série (${serie} à partir de ce jour)</button>` : ''}` : ''}<button type="button" data-ferme>Annuler</button></div>`;
    ouvrir(h, f => {
      const q = s => f.querySelector(s);
      const lire = () => { o.titre = q('#o-titre').value.trim(); o.date = q('#o-date').value || o.date; o.debut = q('#o-h').value; o.duree = +q('#o-dur').value; o.lieu = q('#o-lieu').value.trim(); o.note = q('#o-note').value.trim(); if (q('#o-rep')) repeter = +q('#o-rep').value; };
      f.querySelectorAll('[data-genre]').forEach(b => b.onclick = () => { lire(); if (b.dataset.genre === 'cours') { fCours(null, {date: o.date, debut: o.debut}); return; } const avant = o.genre; o.genre = b.dataset.genre; if (avant !== o.genre) { if (o.genre === 'academie') { if (!o.titre) o.titre = 'Académie de padel'; repeter = 10; } else { if (o.titre === 'Académie de padel') o.titre = ''; repeter = 0; } } dessiner(); });
      q('#o-ok').onclick = () => {
        lire();
        if (!o.titre) o.titre = o.genre === 'academie' ? 'Académie de padel' : 'Occupé';
        if (o0) { if (o0.serie && (o0.debut !== o.debut || o0.duree !== o.duree || o0.titre !== o.titre) && confirm('Changer aussi les suivants de la série (même heure, même durée, même nom) ?')) tous('occupe').filter(x => x.serie === o0.serie && x.date > o0.date).forEach(x => { x.debut = o.debut; x.duree = o.duree; x.titre = o.titre; x.lieu = o.lieu; put(x); }); put(o); bulle('Enregistré ✓'); }
        else { const n = Math.max(1, repeter), serie = n > 1 ? nid() : ''; for (let i = 0; i < n; i++) { const x = JSON.parse(JSON.stringify(o)); x.id = i ? nid() : o.id; x.date = ajJ(o.date, 7 * i); if (serie) x.serie = serie; put(x); } bulle(n > 1 ? n + ' semaines ajoutées ✓' : 'Ajouté à l\'agenda ✓'); }
        etatA.date = o.date; fermer(); rendre();
      };
      if (q('#o-sup')) q('#o-sup').onclick = () => { if (!confirm('Supprimer ce moment de l\'agenda ?')) return; suppr(o0.id); fermer(); rendre(); };
      if (q('#o-supS')) q('#o-supS').onclick = () => { if (!confirm('Supprimer celui-ci et tous les suivants de la série ?')) return; tous('occupe').filter(x => x.serie === o0.serie && x.date >= o0.date).forEach(x => suppr(x.id)); fermer(); rendre(); bulle('Série supprimée'); };
    });
  };
  dessiner();
}

// Envoyer le lien de la page de réservation à quelqu'un
function fPartagerResa() {
  const R = reg(), moi = R.prof ? 'C\'est ' + R.prof + ', ton prof de padel. ' : '';
  const E = tous('eleve').filter(e => !e.archive && (e.tel || e.email)).sort((a, b) => a.nom.localeCompare(b.nom, 'fr', {sensitivity: 'base'}));
  const texte = pre => `Bonjour${pre ? ' ' + pre : ''} ! ${moi}Pour réserver un cours, choisis un créneau libre ici : ${lienResa()} 🎾`;
  ouvrir(tete('🔗 Envoyer ma page de réservation') + `
    ${E.length ? `<label class="l">Un de tes élèves</label><select id="pr-el"><option value="">— ou tape un numéro / un e-mail en dessous —</option>${E.map(e => `<option value="${e.id}">${esc(e.nom)}</option>`).join('')}</select>` : ''}
    <label class="l">Téléphone ou e-mail</label><input id="pr-qui" placeholder="0470 12 34 56 ou nom@exemple.be" autocomplete="off" autocapitalize="off" spellcheck="false">
    <label class="l">Message</label><textarea id="pr-txt" style="min-height:110px">${esc(texte(''))}</textarea>
    <div class="btns"><a class="bouton go" id="pr-wa" target="_blank" rel="noopener" href="#">💬 WhatsApp</a><a class="bouton" id="pr-sms" href="#">SMS</a><a class="bouton" id="pr-mail" href="#">✉️ E-mail</a><button type="button" id="pr-cop">📋 Copier</button></div>
    <p class="note" id="pr-info">Sans numéro, WhatsApp te laisse choisir la personne ou le groupe.</p>`, f => {
    const q = s => f.querySelector(s), estMail = v => /@/.test(v), estTel = v => v.replace(/\D/g, '').length >= 8;
    let prenomCh = '', touche = false;
    const maj = () => {
      const v = q('#pr-qui').value.trim(), t = q('#pr-txt').value;
      q('#pr-wa').href = estTel(v) ? lienWa(v, t) : 'https://wa.me/?text=' + encodeURIComponent(t);
      q('#pr-sms').href = 'sms:' + (estTel(v) ? v.replace(/[^+\d]/g, '') : '') + '?&body=' + encodeURIComponent(t);
      q('#pr-mail').href = 'mailto:' + (estMail(v) ? encodeURIComponent(v) : '') + '?subject=' + encodeURIComponent('Réserver un cours de padel' + (R.prof ? ' avec ' + R.prof : '')) + '&body=' + encodeURIComponent(t);
      q('#pr-mail').style.display = estTel(v) && !estMail(v) ? 'none' : '';
      q('#pr-wa').style.display = q('#pr-sms').style.display = estMail(v) ? 'none' : '';
      q('#pr-info').textContent = !v ? 'Sans numéro, WhatsApp te laisse choisir la personne ou le groupe.' : estMail(v) ? 'Envoi par e-mail.' : estTel(v) ? 'Envoi par WhatsApp ou SMS à ce numéro.' : '';
    };
    q('#pr-qui').oninput = () => { const sel = q('#pr-el'), e = sel && get(sel.value); if (e && q('#pr-qui').value.trim() !== (e.tel || e.email)) { sel.value = ''; if (!touche) q('#pr-txt').value = texte(''); } maj(); }; q('#pr-txt').oninput = () => { touche = true; maj(); };
    if (q('#pr-el')) q('#pr-el').onchange = () => { const e = get(q('#pr-el').value); if (!e) return; q('#pr-qui').value = e.tel || e.email; prenomCh = e.nom.split(' ')[0]; if (!touche) q('#pr-txt').value = texte(prenomCh); maj(); };
    q('#pr-cop').onclick = () => copier(q('#pr-txt').value);
    maj();
  });
}

// ---------- Demandes de cours (page de réservation) ----------
function nouvellesDemandes() {
  const vues = lsJson('padel:dmvues', null), att = demandesAtt();
  const neuves = vues ? att.filter(x => !vues[x.id]) : [];
  const v = vues || {}; att.forEach(x => { v[x.id] = 1; }); lsSet('padel:dmvues', JSON.stringify(v));
  if (!neuves.length) return;
  const t = neuves.length === 1 ? `📩 Nouvelle demande : ${neuves[0].nom}, ${dCourt(neuves[0].date)} à ${hTxt(neuves[0].debut)}` : `📩 ${neuves.length} nouvelles demandes de cours`;
  bulle(t);
  try { if ('Notification' in window && Notification.permission === 'granted') new Notification('Nouvelle demande de cours', {body: t.replace('📩 ', ''), icon: 'icones/padel-192.png', tag: 'padel-demande'}); } catch (e) {}
}
// Forfait demandé sur la page : le cycle du tarif (10 séances), au prix du tarif pour ce nombre de personnes
const forfaitDm = x => { const t = tarifPour(x.pers || 1); if (!t) return null; const n = +t.cycle || 10; return {seances: n, prix: proposer(x.pers || 1, n, x.duree || 60).total, nom: n + ' séances' + ((x.pers || 1) > 1 ? ' à ' + x.pers : ' individuel')}; };
const quandDm = x => { const t = dLong(x.date) + ' à ' + hTxt(x.debut); return t[0].toUpperCase() + t.slice(1); };
function fDemandes() {
  const att = demandesAtt(), autres = tous('demande').filter(x => x.etat !== 'attente').sort((a, b) => (b.recue || 0) - (a.recue || 0)).slice(0, 30);
  const ligne = x => `<div class="el" data-dm="${x.id}"><div class="av" style="background:${x.etat === 'attente' ? 'var(--warn)' : x.etat === 'acceptee' ? 'var(--ok)' : 'var(--muted)'}">${x.etat === 'attente' ? '📩' : x.etat === 'acceptee' ? '✓' : '✕'}</div><div class="mid"><b>${esc(x.nom)}</b><span>${esc(quandDm(x))} · ${x.pers > 1 ? x.pers + ' personnes' : 'individuel'}${x.niveau ? ' · niveau ' + esc(x.niveau) : ''}</span></div><div class="droite">${x.etat === 'attente' ? '<span class="pill warn">à répondre</span>' : x.etat === 'acceptee' ? '<span class="pill ok">acceptée</span>' : '<span class="pill">refusée</span>'}</div></div>`;
  ouvrir(tete('📩 Demandes de cours') + (att.length ? att.map(ligne).join('') : '<p class="note">Aucune demande en attente.</p>')
    + (autres.length ? `<details style="margin-top:10px"><summary class="note">Déjà traitées (${autres.length})</summary>${autres.map(ligne).join('')}</details>` : '')
    + (() => { const A = tous('attente').filter(a => a.date >= auj()).sort((a, b) => (a.date + a.debut).localeCompare(b.date + b.debut)); if (!A.length) return '';
      const g = {}; A.forEach(a => { (g[a.date + '|' + a.debut] = g[a.date + '|' + a.debut] || []).push(a); });
      return `<h3>🔔 Listes d'attente</h3>` + Object.keys(g).map(k => { const [d, hh] = k.split('|'); return `<div class="el" data-at="${k}"><div class="av" style="background:var(--accent)">🔔</div><div class="mid"><b>${esc(dCourt(d))} · ${hTxt(hh)}</b><span>${esc(g[k].map(a => a.nom).join(', '))}</span></div></div>`; }).join(''); })()
    + `<p class="note">Elles arrivent de ta <a href="${esc(lienResa())}" target="_blank" rel="noopener">page de réservation</a>. Partage-la depuis ⚙️ Réglages.</p>`, f => {
    f.querySelectorAll('[data-dm]').forEach(b => b.onclick = () => fDemande(b.dataset.dm));
    f.querySelectorAll('[data-at]').forEach(b => b.onclick = () => { const [d, hh] = b.dataset.at.split('|'); fAttentes(d, hh, dureeResa()); });
  });
}
function fDemande(id) {
  const x = get(id); if (!x) return;
  const dur = x.duree || 60, cf = conflits({id: '', date: x.date, debut: x.debut, duree: dur}), passeD = jourDe(x.date).getTime() + minDe(x.debut) * 60000 < Date.now();
  const etat = {attente: '<span class="pill warn">à répondre</span>', acceptee: '<span class="pill ok">acceptée</span>', refusee: '<span class="pill">refusée</span>'}[x.etat] || '';
  ouvrir(tete('📩 Demande de cours') + `<div class="carte" style="margin:0 0 10px"><b style="font-size:18px">${esc(x.nom)}</b> ${etat}
      <p style="margin:6px 0 0">📅 <b>${esc(quandDm(x))}</b> (${dureeTxt(dur)})${x.autres && x.autres.length ? `<br>📆 <b>+ ${x.autres.length} séance${x.autres.length > 1 ? 's' : ''} choisie${x.autres.length > 1 ? 's' : ''}</b> : ${x.autres.map(y => esc(dCourt(y.date) + ' ' + hTxt(y.debut))).join(', ')}` : ''}<br>👥 ${x.pers > 1 ? x.pers + ' personnes' : 'Cours individuel'}${x.niveau ? ' · niveau ' + esc(x.niveau) : ''}<br>💶 ${x.formule === 'cycle' && forfaitDm(x) ? `<b>Veut le forfait ${esc(forfaitDm(x).nom)} (${euro(forfaitDm(x).prix)}${x.pers > 1 ? ' par personne' : ''})</b> : ce cours sera le 1er` : 'Une séance à l\'unité'}<br>📞 ${lienTel(x.tel)}${x.email ? '<br>✉️ <a href="mailto:' + esc(x.email) + '">' + esc(x.email) + '</a>' : ''}</p>
      ${x.msg ? `<p style="margin:8px 0 0;white-space:pre-wrap">💬 ${esc(x.msg)}</p>` : ''}
      <p class="note" style="margin:8px 0 0">Reçue ${x.recue ? 'le ' + new Date(x.recue).toLocaleString('fr-BE', {day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'}) : ''} par la page de réservation.</p></div>
    ${x.etat === 'attente' && x.autres ? (() => { const k = x.autres.filter(y => conflits({id: '', date: y.date, debut: y.debut, duree: dur}).length); return k.length ? `<div class="alerte">⚠️ Déjà un cours le ${k.map(y => esc(dCourt(y.date) + ' ' + hTxt(y.debut))).join(', ')} : retire ou déplace ces séances après avoir accepté.</div>` : ''; })() : ''}
    ${x.etat === 'attente' && cf.length ? `<div class="alerte">⚠️ Tu as déjà un cours à ce moment-là : ${cf.map(o => esc(hTxt(o.debut) + ' ' + (o.eleves || []).map(prenom).join(', '))).join(' ; ')}</div>` : ''}
    ${x.etat === 'attente' && passeD ? '<div class="alerte">⚠️ Ce créneau est déjà passé.</div>' : ''}
    <div class="btns">${x.etat === 'attente' ? '<button type="button" class="go" id="m-oui">✅ Accepter (dans l\'agenda)</button><button type="button" id="m-non">❌ Refuser</button>' : '<button type="button" class="go" id="m-rep">💬 Lui écrire</button>' + (x.cours && get(x.cours) ? '<button type="button" id="m-cours">Voir le cours</button>' : '') + '<button type="button" id="m-att">Remettre en attente</button>'}<button type="button" class="rouge" id="m-sup">Supprimer</button></div>`, f => {
    const b = s => f.querySelector(s);
    if (b('#m-oui')) b('#m-oui').onclick = () => {
      const chiffres = t => String(t || '').replace(/\D/g, '').slice(-9);
      // D'abord le même nom ; un même numéro sous un autre nom : on demande (ex. un parent qui réserve pour son enfant)
      const simple = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
      const E = tous('eleve'), parNom = E.find(e => simple(e.nom) === simple(x.nom)), parTel = !parNom && x.tel && E.find(e => chiffres(e.tel) && chiffres(e.tel) === chiffres(x.tel));
      const ex = parNom || (parTel && confirm(`Ce numéro de téléphone est déjà celui de ${parTel.nom}.\n\nOK : c'est la même personne, le cours est pour ${parTel.nom}.\nAnnuler : ${nomPropre(x.nom)} est un nouvel élève.`) ? parTel : null);
      let eid;
      if (ex) { eid = ex.id; let ch = false; if (!ex.tel && x.tel) { ex.tel = x.tel; ch = true; } if (!ex.email && x.email) { ex.email = x.email; ch = true; } if (ex.archive) { ex.archive = false; ch = true; } if (ch) put(ex); }
      else eid = put({id: nid(), type: 'eleve', nom: nomPropre(x.nom), tel: x.tel || '', email: x.email || '', niveau: NIVEAUX.includes(x.niveau) ? x.niveau : '', note: 'Venu par la page de réservation' + (x.pers > 1 ? ' (' + x.pers + ' personnes)' : '')}).id;
      // Forfait demandé : on le crée tout de suite pour que ce cours soit la 1re séance (une seule fois)
      if (x.formule === 'cycle' && !(x.forfait && get(x.forfait))) { const fd = forfaitDm(x); if (fd) { x.forfait = put({id: nid(), type: 'forfait', eleve: eid, seances: fd.seances, prix: fd.prix, nom: fd.nom, date: auj(), pers: x.pers || 1, duree: dur}).id; put(x); bulle('Forfait ' + fd.nom + ' créé ✓ (ce cours est le 1er)'); } }
      fCours(null, {date: x.date, debut: x.debut, duree: dur, eleves: [eid], demande: x.id, note: x.pers > 1 ? x.pers + ' personnes (ajoute les autres élèves)' : ''});
      if (!ex) bulle(nomPropre(x.nom) + ' ajouté(e) aux élèves ✓');
    };
    if (b('#m-non')) b('#m-non').onclick = () => { x.etat = 'refusee'; put(x); rendre(); fReponse(x.id); };
    if (b('#m-rep')) b('#m-rep').onclick = () => fReponse(x.id);
    if (b('#m-cours')) b('#m-cours').onclick = () => fDetail(x.cours);
    if (b('#m-att')) b('#m-att').onclick = () => { if (x.cours && get(x.cours) && !confirm('Le cours reste dans l\'agenda. Remettre quand même la demande en attente ?')) return; x.etat = 'attente'; put(x); rendre(); fDemande(x.id); };
    b('#m-sup').onclick = () => { if (!confirm('Supprimer cette demande ?' + (x.cours && get(x.cours) ? ' (le cours reste dans l\'agenda)' : ''))) return; suppr(x.id); fermer(); rendre(); };
  });
}
function fReponse(id) {
  const x = get(id); if (!x) return;
  const R = reg(), moi = R.prof ? ', c\'est ' + R.prof : '', pre = String(x.nom || '').split(' ')[0];
  const lieu = (R.lieux || [])[0], ok = x.etat === 'acceptee', c = x.cours && get(x.cours);
  const q = c ? dLong(c.date) + ' à ' + hTxt(c.debut) : dLong(x.date) + ' à ' + hTxt(x.debut);
  let txt = ok ? `Bonjour ${pre}${moi} 🎾 C'est d'accord pour ton cours de padel le ${q}${(c && c.lieu) || lieu ? ' (' + ((c && c.lieu) || lieu) + ')' : ''}.${x.formule === 'cycle' && forfaitDm(x) ? ` Ton forfait de ${forfaitDm(x).seances} séances (${euro(forfaitDm(x).prix)}) commence avec ce cours.` : ''}${x.coursAutres && x.coursAutres.length ? '\nTes séances : ' + [x.cours].concat(x.coursAutres).map(get).filter(Boolean).map(k => dCourt(k.date) + ' ' + hTxt(k.debut)).join(', ') + '.' : ''} À bientôt sur le terrain !`
    : `Bonjour ${pre}${moi}. Désolé, je ne peux pas te donner cours le ${q}. Tu peux choisir un autre créneau ici : ${lienResa()}`;
  ouvrir(tete(ok ? '✅ Accepté : prévenir ' + esc(pre) : '❌ Refusé : prévenir ' + esc(pre)) + `<p class="note" style="margin-top:0">${ok ? 'Le cours est dans ton agenda.' : 'Le créneau est de nouveau libre sur ta page.'} Envoie-lui ce message (tu peux le modifier) :</p>
    <textarea id="r-txt" style="min-height:120px">${esc(txt)}</textarea>
    <div class="btns">${x.tel ? `<a class="bouton go" id="r-wa" target="_blank" rel="noopener" href="#">💬 WhatsApp</a>` : ''}${x.email ? `<a class="bouton" id="r-mail" href="#">✉️ E-mail</a>` : ''}${x.tel ? `<a class="bouton" id="r-sms" href="#">SMS</a>` : ''}<button type="button" id="r-cop">📋 Copier</button><button type="button" data-ferme>Fermer</button></div>`, f => {
    const t = () => f.querySelector('#r-txt').value;
    const maj = () => {
      if (f.querySelector('#r-wa')) f.querySelector('#r-wa').href = lienWa(x.tel, t());
      if (f.querySelector('#r-mail')) f.querySelector('#r-mail').href = 'mailto:' + encodeURIComponent(x.email) + '?subject=' + encodeURIComponent('Cours de padel du ' + q) + '&body=' + encodeURIComponent(t());
      if (f.querySelector('#r-sms')) f.querySelector('#r-sms').href = 'sms:' + x.tel.replace(/[^+\d]/g, '') + '?&body=' + encodeURIComponent(t());
    };
    f.querySelector('#r-txt').oninput = maj; maj();
    f.querySelector('#r-cop').onclick = () => copier(t());
  });
}

// Fenêtre : détail d'un cours
function fDetail(id) {
  const c = get(id); if (!c) return;
  const fin = hDe(minDe(c.debut) + (c.duree || 60));
  const st = c.statut === 'annule' ? '<span class="pill">annulé</span>' : c.statut === 'absent' ? '<span class="pill warn">absent, facturé</span>' : passe(c) ? '<span class="pill ok">donné</span>' : '<span class="pill bleu">prévu</span>';
  let h = tete(esc(dLong(c.date)) + ' · ' + hTxt(c.debut) + '–' + hTxt(fin));
  h += `<p style="margin:0 0 8px">${st} ${c.lieu ? '<span class="note">📍 ' + esc(c.lieu) + '</span>' : ''}${c.serie ? ' <span class="note">🔁 cours répété</span>' : ''}</p>`;
  (c.eleves || []).forEach(e => {
    const el = D[e] || {}, b = bilan(e);
    h += `<div class="el" data-el="${e}"><div class="av" style="background:${couleurE(e)}">${esc(initiales(el.nom))}</div><div class="mid"><b>${esc(el.nom || '?')}</b><span>${factuTxt(c, e)}${el.tel ? ' · ' + esc(el.tel) : ''}</span></div><div class="droite">${soldePill(b)}</div></div>`;
  });
  if (c.note) h += `<p>🗒️ ${esc(c.note)}</p>`;
  {
    const cr = c.cr || {}, perso = Object.keys(cr.p || {}).filter(e => cr.p[e]);
    h += `<div class="carte" style="margin-top:10px"><b>📝 Compte rendu</b>${cr.g ? `<p style="margin:6px 0 0;white-space:pre-wrap">${esc(cr.g)}</p>` : ''}${perso.map(e => `<p style="margin:6px 0 0;white-space:pre-wrap"><b>${esc(prenom(e))} :</b> ${esc(cr.p[e])}</p>`).join('')}
      ${!cr.g && !perso.length ? '<p class="note" style="margin:4px 0 0">Ce qu\'on a travaillé pendant ce cours, pour le suivi de semaine en semaine.</p>' : ''}
      <div class="btns" style="margin-top:8px"><button type="button" class="go" id="d-cr">${cr.g || perso.length ? '✏️ Modifier' : '🎤 Faire le compte rendu'}</button></div></div>`;
  }
  const rappel = `Bonjour ! Petit rappel : cours de padel ${dLong(c.date)} à ${hTxt(c.debut)}${c.lieu ? ' (' + c.lieu + ')' : ''}. À bientôt !`;
  h += `<div class="btns"><button type="button" class="go" id="d-depl">↔️ Déplacer</button><button type="button" id="d-modif">✏️ Modifier</button>
    <button type="button" id="d-rappel">💬 Rappel</button><button type="button" id="d-retard">⏰ Retard</button>${attentesPour(c.date, c.debut, c.duree).length ? `<button type="button" id="d-att">🔔 Attente (${attentesPour(c.date, c.debut, c.duree).length})</button>` : ''}${c.statut === 'annule' || c.statut === 'absent' ? '<button type="button" id="d-prev">✉️ Prévenir</button>' : ''}${c.statut === 'annule' ? '' : boutonTerrain()}</div>
    <div class="btns">${c.statut === 'annule' ? '<button type="button" class="go" id="d-place">➕ Nouveau cours à la place</button><button type="button" id="d-retab">Rétablir le cours</button>' : `<button type="button" id="d-annul">Annuler (gratuit)</button><button type="button" id="d-abs">${c.statut === 'absent' ? 'Pas absent' : 'Absent mais facturé'}</button>`}
    <button type="button" class="rouge" id="d-suppr">Supprimer</button></div>`;
  ouvrir(h, f => {
    f.querySelectorAll('[data-el]').forEach(x => x.onclick = () => fEleve(x.dataset.el));
    f.querySelector('#d-depl').onclick = () => { etatA.deplacer = c.id; if (etatA.vue === 'mois') etatA.vue = innerWidth < 700 ? 'jour' : 'semaine'; etatA.date = c.date; fermer(); onglet = 'agenda'; rendre(); bulle('Touche le nouveau créneau'); };
    f.querySelector('#d-modif').onclick = () => fCours(c.id);
    f.querySelector('#d-retard').onclick = () => fRetard(c.id);
    f.querySelector('#d-cr').onclick = () => fCompteRendu(c.id, () => fDetail(c.id));
    f.querySelector('#d-rappel').onclick = () => {
      const tels = (c.eleves || []).map(e => D[e]).filter(e => e && e.tel);
      if (tels.length === 1) { open(lienWa(tels[0].tel, rappel), '_blank'); return; }
      copier(rappel);
    };
    const st = s => () => { c.statut = s; put(c); fermer(); rendre(); };
    if (f.querySelector('#d-annul')) f.querySelector('#d-annul').onclick = () => { st('annule')(); fPrevenir(c.id, 'annule'); };
    if (f.querySelector('#d-abs')) f.querySelector('#d-abs').onclick = () => { const v = c.statut !== 'absent'; st(v ? 'absent' : 'prevu')(); if (v) fPrevenir(c.id, 'absent'); };
    if (f.querySelector('#d-att')) f.querySelector('#d-att').onclick = () => fAttentes(c.date, c.debut, c.duree);
    if (f.querySelector('#d-prev')) f.querySelector('#d-prev').onclick = () => fPrevenir(c.id, c.statut);
    if (f.querySelector('#d-retab')) f.querySelector('#d-retab').onclick = st('prevu');
    if (f.querySelector('#d-place')) f.querySelector('#d-place').onclick = () => fCours(null, {date: c.date, debut: c.debut, duree: c.duree || 60, lieu: c.lieu || ''});
    f.querySelector('#d-suppr').onclick = () => {
      const serie = c.serie ? tous('cours').filter(x => x.serie === c.serie && x.date > c.date) : [];
      if (serie.length) {
        const r = prompt(`Ce cours est répété. Tape 1 pour supprimer seulement celui-ci, 2 pour supprimer aussi les ${serie.length} suivants.`, '1');
        if (r === '2') { suppr(c.id); serie.forEach(x => suppr(x.id)); } else if (r === '1') suppr(c.id); else return;
      } else { if (!confirm('Supprimer ce cours ? (Pour un cours décommandé, « Annuler » le garde dans l\'historique.)')) return; suppr(c.id); }
      fermer(); rendre();
    };
  });
}

// ---------- Reprise des élèves actuels (formulaire public padel/reprise/) ----------
// Les réponses arrivent par la feuille Google (type « reprise », une par téléphone). On vérifie puis on importe.
function conflitsRep() {
  const R = tous('reprise'), occ = [], out = {};
  R.forEach(r => (r.creneaux || []).forEach(x => occ.push({id: r.id, qui: r.prenom + ' ' + r.nom, d: x.d, h: x.h, a: minDe(x.h), b: minDe(x.h) + (+r.duree || 60)})));
  tous('cours').filter(c => actif(c) && !c.reprise).forEach(c => occ.push({id: 'cours', qui: 'un cours de ton agenda (' + (c.eleves || []).map(prenom).join(', ') + ')', d: c.date, h: c.debut, a: minDe(c.debut), b: minDe(c.debut) + (c.duree || 60)}));
  occ.forEach(x => { if (x.id === 'cours') return; occ.forEach(y => { if (y === x || y.id === x.id || y.d !== x.d || !(y.a < x.b && x.a < y.b)) return; (out[x.id] = out[x.id] || []).push({d: x.d, h: x.h, qui: y.qui}); }); });
  return out;
}
const msgReprise = () => `Bonjour ! 🎾 Je lance J'Padel, ma nouvelle application pour gérer nos cours, les réservations et les forfaits. Afin de reprendre ton suivi sans rien perdre, peux-tu prendre deux minutes pour compléter ce formulaire (forfait en cours, séances effectuées, paiements et prochains créneaux convenus) ? Merci beaucoup !\n${lienReprise()}${reg().prof ? '\n' + reg().prof : ''}`;
function fReprise() {
  const R = tous('reprise').sort((a, b) => (a.nom + a.prenom).localeCompare(b.nom + b.prenom, 'fr')), cf = conflitsRep(), nouv = R.filter(r => !r.importe);
  let h = tete('📋 Reprise des élèves') + `<p class="note" style="margin-top:0">Envoie ce formulaire à tes élèves actuels : chacun indique son forfait, ses séances faites, ce qu'il a payé et ses prochains créneaux. Les réponses arrivent ici (et dans l'onglet « Reprise » de ta feuille Google). Vérifie, puis importe-les dans l'appli.</p>
    <div class="btns"><a class="bouton go" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(msgReprise())}">💬 Envoyer sur WhatsApp</a><button type="button" id="rp-cop">📋 Copier le message</button><a class="bouton" href="${esc(lienReprise())}" target="_blank" rel="noopener">Voir le formulaire</a></div>
    <p class="note">Les élèves dont tu es sûr : remplis leur fiche toi-même (même formulaire, élève après élève) au lieu de leur envoyer.</p>
    <div class="btns"><a class="bouton" href="${esc(lienReprise())}?prof" target="_blank" rel="noopener">✏️ Remplir moi-même pour un élève</a></div>`;
  h += `<h3>Réponses (${R.length})${nouv.length ? ` <span class="pill warn">${nouv.length} à importer</span>` : ''}</h3>`;
  if (!R.length) h += '<p class="vide">Pas encore de réponse. Elles arrivent toutes seules (le nuage ☁️ doit être relié).</p>';
  h += R.map(r => { const reste = Math.round((r.total - r.paye) * 100) / 100;
    return `<div class="el" data-rp="${r.id}"><div class="av" style="background:${r.importe ? 'var(--ok)' : 'var(--warn)'}">${r.importe ? '✓' : esc(initiales(r.prenom + ' ' + r.nom))}</div><div class="mid"><b>${esc(r.prenom + ' ' + r.nom)}</b><span>${r.seances ? r.faites + '/' + r.seances + ' séances' : esc(r.formule || '')} · payé ${euro(r.paye)}${reste > 0 ? ' · doit ' + euro(reste) : ''} · ${(r.creneaux || []).length} cours à venir${r.par === 'prof' ? ' · ✏️ rempli par toi' : ''}</span></div>
      <div class="droite">${cf[r.id] ? '<span class="pill err">⚠ créneau</span>' : ''}${r.importe ? '<span class="pill ok">importé</span>' : '<span class="pill warn">à importer</span>'}</div></div>`; }).join('');
  if (Object.keys(cf).length) h += `<div class="alerte">⚠️ Certains créneaux sont cochés par deux élèves (ou tombent sur un cours de ton agenda). Normal pour un cours à plusieurs ; sinon, quelqu'un s'est trompé : touche l'élève pour voir.</div>`;
  if (nouv.length > 1) h += `<div class="btns"><button type="button" class="go" id="rp-tout">⬇️ Tout importer (${nouv.length})</button></div>`;
  ouvrir(h, f => {
    f.querySelector('#rp-cop').onclick = () => copier(msgReprise());
    f.querySelectorAll('[data-rp]').forEach(b => b.onclick = () => fRepriseUn(b.dataset.rp));
    if (f.querySelector('#rp-tout')) f.querySelector('#rp-tout').onclick = () => {
      if (!confirm(`Importer ${nouv.length} élèves dans l'appli ? (élève, forfait, séances déjà faites, paiement et prochains cours)`)) return;
      let n = 0; nouv.forEach(r => { n += importerReprise(r); }); rendre(); bulle(nouv.length + ' élèves importés ✓ (' + n + ' cours dans l\'agenda)'); fReprise();
    };
  });
}
function fRepriseUn(id) {
  const r = get(id); if (!r) return;
  const cf = conflitsRep()[r.id] || [], reste = Math.round((r.total - r.paye) * 100) / 100;
  let h = tete('📋 ' + esc(r.prenom + ' ' + r.nom)) + `<div class="carte" style="margin:0 0 10px">📞 ${lienTel(r.tel)}${r.email ? ' · ✉️ ' + esc(r.email) : ''}${r.niveau ? ' · niveau ' + esc(r.niveau) : ''}
      <p style="margin:8px 0 0">💶 <b>${esc(r.formule || '?')}</b>${r.pers > 1 ? ' · à ' + r.pers + (r.avec ? ' (avec ' + esc(r.avec) + ')' : '') : ' · individuel'}<br>
      🎾 Séances : <b>${r.faites}</b> faites${r.seances ? ' sur ' + r.seances + ' (reste ' + Math.max(0, r.seances - r.faites) + ')' : ''}<br>
      💶 Prix total ${euro(r.total)} · payé ${euro(r.paye)} · ${reste > 0 ? '<b style="color:var(--err)">reste ' + euro(reste) + '</b>' : reste < 0 ? 'en avance de ' + euro(-reste) : 'tout payé ✓'}<br>
      📅 Cours de ${r.duree === 90 ? '1h30' : '1h'} · ${(r.creneaux || []).length} à venir :</p>
      <p style="margin:4px 0 0;font-size:14px">${(r.creneaux || []).map(x => esc(dCourt(x.d) + ' ' + hTxt(x.h))).join(', ') || '<span class="note">aucun</span>'}</p>
      ${r.msg ? `<p style="margin:8px 0 0;white-space:pre-wrap">💬 ${esc(r.msg)}</p>` : ''}
      <p class="note" style="margin:8px 0 0">${r.par === 'prof' ? '✏️ Rempli par toi · ' : ''}Reçu le ${new Date(r.recue || r.t).toLocaleString('fr-BE', {day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'})}${r.importe ? ' · importé le ' + esc(dCourt(r.importe)) : ''}</p></div>`;
  if (cf.length) h += `<div class="alerte">⚠️ Même créneau que : ${cf.map(x => esc(dCourt(x.d) + ' ' + hTxt(x.h) + ' → ' + x.qui)).join(' ; ')}</div>`;
  h += `<div class="btns">${r.importe ? '' : '<button type="button" class="go" id="rp-imp">⬇️ Importer dans l\'appli</button>'}<button type="button" id="rp-ret">‹ Toutes les réponses</button><button type="button" class="rouge" id="rp-sup">Supprimer la réponse</button></div>
    ${r.importe ? '' : '<p class="note">Importer crée l\'élève (ou complète sa fiche), son forfait avec les séances déjà faites, le paiement déjà reçu et ses prochains cours dans l\'agenda. Tu pourras tout modifier ensuite.</p>'}`;
  ouvrir(h, f => {
    if (f.querySelector('#rp-imp')) f.querySelector('#rp-imp').onclick = () => { const n = importerReprise(r); rendre(); bulle(r.prenom + ' importé ✓ (' + n + ' cours dans l\'agenda)'); fRepriseUn(id); };
    f.querySelector('#rp-ret').onclick = fReprise;
    f.querySelector('#rp-sup').onclick = () => { if (!confirm('Supprimer cette réponse ? (ce qui a déjà été importé reste dans l\'appli)')) return; suppr(r.id); fReprise(); };
  });
}
/** Crée l'élève, son forfait (avec les séances déjà faites), le paiement reçu et ses prochains cours. Renvoie le nombre de cours ajoutés. */
function importerReprise(r) {
  const eid = eleveDe(r.prenom + ' ' + r.nom, r.tel, r.email, 'Repris du formulaire' + (r.avec ? ' · joue avec ' + r.avec : ''));
  const e = D[eid]; if (e && !e.niveau && NIVEAUX.includes(r.niveau)) { e.niveau = r.niveau; put(e); }
  const dur = r.duree || 60, unite = /unité/.test(r.formule || '');
  if ((+r.seances || 0) > 0 || (+r.total || 0) > 0) {
    const n = +r.seances || +r.faites || 0;
    put({id: nid(), type: 'forfait', eleve: eid, seances: n, prix: +r.total || 0, avant: Math.min(+r.faites || 0, n || +r.faites || 0), nom: unite ? 'Séances à l\'unité (reprise)' : n + ' séances (reprise)', date: auj(), pers: r.pers || 1, duree: dur});
  }
  if ((+r.paye || 0) > 0) put({id: nid(), type: 'paiement', eleve: eid, montant: +r.paye, date: auj(), mode: '', note: 'Déjà payé avant l\'appli (reprise)'});
  let n = 0;
  (r.creneaux || []).filter(x => x.d >= auj()).forEach(x => {
    // Cours à plusieurs : si un autre élève repris a coché le même moment, on le met dans le même cours
    const ex = tous('cours').find(c => actif(c) && c.reprise && c.date === x.d && c.debut === x.h && !(c.eleves || []).includes(eid) && (c.eleves || []).length < 4);
    if (ex) { ex.eleves.push(eid); const fl = forfaitLibre(eid, ex.id); ex.f[eid] = fl ? {forfait: fl.id} : {prix: prixUnite(ex.eleves.length, ex.duree)}; put(ex); n++; return; }
    const c = {id: nid(), type: 'cours', date: x.d, debut: x.h, duree: dur, eleves: [eid], f: {}, statut: 'prevu', lieu: (reg().lieux || [])[0] || '', note: '', reprise: r.id};
    const fl = forfaitLibre(eid, c.id); c.f[eid] = fl ? {forfait: fl.id} : {prix: prixUnite(r.pers || 1, dur)}; put(c); n++;
  });
  r.importe = auj(); put(r);
  return n;
}

// ---------- Liste d'attente d'un créneau (venue de la page de réservation) ----------
const simpleNom = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
const chiffresTel = t => String(t || '').replace(/\D/g, '').slice(-9);
// Élève existant (même nom, sinon même téléphone) ou nouvel élève
function eleveDe(nom, tel, email, note) {
  const E = tous('eleve'), ex = E.find(e => simpleNom(e.nom) === simpleNom(nom)) || (tel && E.find(e => chiffresTel(e.tel) && chiffresTel(e.tel) === chiffresTel(tel)));
  if (ex) { let ch = false; if (!ex.tel && tel) { ex.tel = tel; ch = true; } if (!ex.email && email) { ex.email = email; ch = true; } if (ex.archive) { ex.archive = false; ch = true; } if (ch) put(ex); return ex.id; }
  return put({id: nid(), type: 'eleve', nom: nomPropre(nom), tel: tel || '', email: email || '', niveau: '', note: note || ''}).id;
}
function attentesHtml(L, quand) {
  const R = reg();
  return L.map(a => {
    const msg = `Bonjour ${String(a.nom).split(' ')[0]}, c'est ${R.prof || 'ton prof de padel'} (J'Padel) 🎾 Bonne nouvelle : le créneau du ${quand} vient de se libérer. Est-ce qu'il t'intéresse ? Réponds-moi vite : le premier qui confirme le prend !`;
    return `<div class="carte" style="margin:8px 0"><b>🔔 ${esc(a.nom)}</b> <span class="note">· ${lienTel(a.tel)}${a.email ? ' · ' + esc(a.email) : ''} · en attente depuis le ${new Date(a.recue || a.t).toLocaleDateString('fr-BE', {day: 'numeric', month: 'short'})}</span>
      <textarea data-am="${a.id}" style="min-height:90px;margin-top:6px">${esc(msg)}</textarea>
      <div class="btns" style="margin-top:6px"><a class="bouton go" data-aw="${a.id}" target="_blank" rel="noopener" href="#">💬 WhatsApp</a>${a.email ? `<a class="bouton" data-ae="${a.id}" href="#">✉️ E-mail</a>` : ''}<a class="bouton" data-as="${a.id}" href="#">SMS</a>
      <button type="button" data-aok="${a.id}">✅ C'est pour lui</button><button type="button" class="rouge" data-ax="${a.id}">Retirer</button></div></div>`;
  }).join('');
}
function brancherAttentes(f, quand, apres) {
  const maj = id => { const a = get(id), z = f.querySelector(`[data-am="${id}"]`); if (!a || !z) return; const t = z.value, q = s => f.querySelector(s);
    if (q(`[data-aw="${id}"]`)) q(`[data-aw="${id}"]`).href = lienWa(a.tel, t);
    if (q(`[data-ae="${id}"]`)) q(`[data-ae="${id}"]`).href = 'mailto:' + encodeURIComponent(a.email) + '?subject=' + encodeURIComponent('Créneau libéré : ' + quand) + '&body=' + encodeURIComponent(t);
    if (q(`[data-as="${id}"]`)) q(`[data-as="${id}"]`).href = 'sms:' + String(a.tel).replace(/[^+\d]/g, '') + '?&body=' + encodeURIComponent(t); };
  f.querySelectorAll('[data-am]').forEach(z => { z.oninput = () => maj(z.dataset.am); maj(z.dataset.am); });
  f.querySelectorAll('[data-aw],[data-ae],[data-as]').forEach(a => a.addEventListener('click', () => { a.textContent = '✓ ' + a.textContent.replace(/^✓ /, ''); }));
  f.querySelectorAll('[data-ax]').forEach(b => b.onclick = () => { if (!confirm('Retirer cette personne de la liste d\'attente ?')) return; suppr(b.dataset.ax); rendre(); apres(); });
  f.querySelectorAll('[data-aok]').forEach(b => b.onclick = () => {
    const a = get(b.dataset.aok); if (!a) return;
    const eid = eleveDe(a.nom, a.tel, a.email, 'Venu par la liste d\'attente');
    suppr(a.id); fCours(null, {date: a.date, debut: a.debut, duree: a.duree || dureeResa(), eleves: [eid]});
  });
}
function fAttentes(d, h, dur) {
  const L = attentesPour(d, h, dur), quand = dLong(d) + ' à ' + hTxt(h);
  ouvrir(tete('🔔 Liste d\'attente') + `<p class="note" style="margin-top:0">${esc(quand[0].toUpperCase() + quand.slice(1))} : ces personnes veulent ce créneau s'il se libère (dans l'ordre d'arrivée).</p>`
    + (L.length ? attentesHtml(L, quand) : '<p class="vide">Plus personne en attente.</p>') + '<div class="btns"><button type="button" data-ferme>Fermer</button></div>', f => brancherAttentes(f, quand, () => fAttentes(d, h, dur)));
}

// Fenêtre : prévenir les élèves d'un cours annulé ou d'une absence facturée (message tout prêt par élève)
function fPrevenir(id, genre) {
  const c = get(id); if (!c) return;
  const R = reg(), moi = R.prof ? ' ' + R.prof : '', quand = dLong(c.date) + ' à ' + hTxt(c.debut);
  const E = (c.eleves || []).map(e => D[e]).filter(Boolean);
  const facture = e => { const x = (c.f || {})[e.id] || {}; return x.forfait ? 'La séance est décomptée de ton forfait.' : x.gratuit ? '' : x.prix ? 'Le cours (' + euro(+x.prix) + ') reste dû.' : ''; };
  const msg = e => genre === 'annule'
    ? `Bonjour ${prenom(e.id)}, je suis désolé mais je dois annuler notre cours de padel du ${quand}. Il ne te sera évidemment pas compté. Dis-moi quand tu es disponible pour le remplacer, ou choisis un autre créneau ici : ${lienResa()}\nÀ bientôt !${moi}`
    : `Bonjour ${prenom(e.id)}, je t'ai attendu pour notre cours de padel du ${quand}, mais tu n'as pas pu venir. Pas de souci, ça peut arriver à tout le monde ! Comme le terrain et le créneau étaient réservés pour toi, le cours est quand même compté. ${facture(e)}\nLa prochaine fois, préviens-moi un peu à l'avance et on le déplace sans frais. À bientôt sur le terrain !${moi}`;
  const sujet = genre === 'annule' ? 'Cours de padel annulé (' + quand + ')' : 'Cours de padel du ' + quand;
  let h = tete(genre === 'annule' ? '❌ Cours annulé : prévenir' : '🚫 Absent : prévenir') + `<p class="note" style="margin-top:0">${genre === 'annule' ? 'Le cours est annulé et le créneau est libre.' : 'Le cours est compté comme donné et facturé.'} Un message tout prêt pour chaque élève (tu peux le modifier) :</p>`;
  if (!E.length) h += '<p class="vide">Pas d\'élève dans ce cours.</p>';
  E.forEach(e => {
    h += `<div class="carte" style="margin:8px 0"><b>${esc(e.nom)}</b><textarea data-pv="${e.id}" style="min-height:120px;margin-top:6px">${esc(msg(e))}</textarea>
      <div class="btns" style="margin-top:6px">${e.tel ? `<a class="bouton go" data-wa="${e.id}" target="_blank" rel="noopener" href="#">💬 WhatsApp</a>` : ''}${e.email ? `<a class="bouton" data-ml="${e.id}" href="#">✉️ E-mail</a>` : ''}${e.tel ? `<a class="bouton" data-sm="${e.id}" href="#">SMS</a>` : ''}<button type="button" data-cp="${e.id}">📋 Copier</button></div>
      ${!e.tel && !e.email ? '<p class="note" style="margin:4px 0 0">Pas de téléphone ni d\'e-mail : ajoute-les dans sa fiche (✏️), ou copie le message.</p>' : ''}</div>`;
  });
  const LA = genre === 'annule' ? attentesPour(c.date, c.debut, c.duree) : [];
  if (LA.length) h += `<h3>🔔 ${LA.length} personne${LA.length > 1 ? 's attendaient' : ' attendait'} ce créneau</h3><p class="note" style="margin:0">Propose-le-leur : le premier qui répond le prend.</p>` + attentesHtml(LA, quand);
  h += `<div class="btns"><button type="button" data-ferme>Fermer</button></div>`;
  ouvrir(h, f => {
    if (LA.length) brancherAttentes(f, quand, () => fPrevenir(id, genre));
    const maj = eid => {
      const e = D[eid], t = f.querySelector(`[data-pv="${eid}"]`).value, q = s => f.querySelector(s);
      if (q(`[data-wa="${eid}"]`)) q(`[data-wa="${eid}"]`).href = lienWa(e.tel, t);
      if (q(`[data-ml="${eid}"]`)) q(`[data-ml="${eid}"]`).href = 'mailto:' + encodeURIComponent(e.email) + '?subject=' + encodeURIComponent(sujet) + '&body=' + encodeURIComponent(t);
      if (q(`[data-sm="${eid}"]`)) q(`[data-sm="${eid}"]`).href = 'sms:' + e.tel.replace(/[^+\d]/g, '') + '?&body=' + encodeURIComponent(t);
    };
    f.querySelectorAll('[data-pv]').forEach(z => { z.oninput = () => maj(z.dataset.pv); maj(z.dataset.pv); });
    f.querySelectorAll('[data-cp]').forEach(b => b.onclick = () => copier(f.querySelector(`[data-pv="${b.dataset.cp}"]`).value));
    f.querySelectorAll('[data-wa],[data-ml],[data-sm]').forEach(a => a.addEventListener('click', () => { a.textContent = '✓ ' + a.textContent.replace(/^✓ /, ''); }));
  });
}

// Fenêtre : le prof sera en retard → message WhatsApp tout prêt pour chaque élève du cours
function fRetard(id) {
  const c = get(id); if (!c) return;
  let min = 10;
  const msg = (e, m) => `Bonjour ${prenom(e)}, désolé, je vais avoir environ ${m} minutes de retard pour notre cours de padel de ${hTxt(c.debut)}${c.date === auj() ? '' : ' (' + dLong(c.date) + ')'}. À tout de suite !${reg().prof ? ' ' + reg().prof : ''}`;
  const dessiner = () => {
    const E = (c.eleves || []).map(e => D[e]).filter(Boolean), avec = E.filter(e => e.tel), sans = E.filter(e => !e.tel);
    let h = tete('⏰ Je serai en retard') + `<p class="note" style="margin:0">Cours de ${hTxt(c.debut)} · ${esc(E.map(e => e.nom).join(', '))}</p>
      <label class="l">De combien de temps ?</label><div class="choixn" style="grid-template-columns:repeat(3,1fr)">${[5, 10, 15, 20, 30, 45].map(m => `<button type="button" data-m="${m}" class="${m === min ? 'on' : ''}">${m} min</button>`).join('')}</div>
      <label class="l">Message</label><p class="carte" style="margin:0;font-size:14px">${esc(msg(E[0] ? E[0].id : '', min))}</p>`;
    if (avec.length) h += `<label class="l">Envoyer sur WhatsApp</label>` + avec.map(e => `<button type="button" class="go" data-wa="${e.id}" style="width:100%;margin:4px 0">💬 Envoyer à ${esc(e.nom)}</button>`).join('');
    if (sans.length) h += `<p class="note">Pas de numéro pour ${esc(sans.map(e => e.nom).join(', '))} : ajoute-le dans sa fiche (✏️), ou copie le message.</p>`;
    h += `<div class="btns"><button type="button" id="r-copie">📋 Copier le message</button><button type="button" data-ferme>Fermer</button></div>`;
    ouvrir(h, f => {
      f.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { min = +b.dataset.m; dessiner(); });
      f.querySelectorAll('[data-wa]').forEach(b => b.onclick = () => { const e = D[b.dataset.wa]; open(lienWa(e.tel, msg(e.id, min)), '_blank'); b.textContent = '✓ Ouvert pour ' + e.nom; b.classList.remove('go'); });
      f.querySelector('#r-copie').onclick = () => copier(msg((c.eleves || [])[0] || '', min).replace(/^Bonjour [^,]*,/, 'Bonjour à tous,'));
    });
  };
  dessiner();
}

// ---------- Comptes rendus de cours (suivi de semaine en semaine) ----------
// c.cr = {g: texte pour tout le cours, p: {idÉlève: texte pour cet élève seulement}}
const crPour = (c, eid) => { const cr = c.cr || {}, p = (cr.p || {})[eid] || ''; return cr.g || p ? {g: cr.g || '', p} : null; };
const crTxt = c => { const cr = c.cr || {}; return [cr.g || ''].concat(Object.keys(cr.p || {}).filter(e => cr.p[e]).map(e => prenom(e) + ' : ' + cr.p[e])).filter(Boolean).join(' | '); };
// Dictée : le bouton 🎤 écoute et tape le texte dans la case (Chrome, Edge, Safari récents)
const Reco = window.SpeechRecognition || window.webkitSpeechRecognition;
let dicteeEnCours = null;
function dictee(zone, bouton) {
  if (!Reco) { bouton.hidden = true; return; }
  bouton.onclick = () => {
    if (dicteeEnCours) { const d = dicteeEnCours; dicteeEnCours = null; d.stop(); return; }
    const r = new Reco(); r.lang = 'fr-FR'; r.continuous = true; r.interimResults = true;
    const base0 = zone.value; let base = base0 && !/\s$/.test(base0) ? base0 + ' ' : base0;
    r.onresult = e => {
      let provisoire = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) { let x = t.trim(); if (x) { x = (!base || /[.!?]\s*$/.test(base) ? x[0].toUpperCase() : x[0]) + x.slice(1); base += x + ' '; } }
        else provisoire += t;
      }
      zone.value = base + provisoire;
    };
    const fin = () => { bouton.textContent = '🎤 Dicter'; bouton.classList.remove('rouge'); zone.value = base.trimEnd(); };
    r.onend = () => { if (dicteeEnCours === r) { try { r.start(); return; } catch (err) {} } if (dicteeEnCours === r) dicteeEnCours = null; fin(); };
    r.onerror = e => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { dicteeEnCours = null; alert('Le micro est bloqué : autorise-le pour cette page, ou utilise le micro 🎤 du clavier du téléphone.'); } };
    try { r.start(); dicteeEnCours = r; bouton.textContent = '⏹ Arrêter'; bouton.classList.add('rouge'); } catch (err) { alert('La dictée ne démarre pas ici : utilise le micro 🎤 du clavier du téléphone.'); }
  };
}
const stopDictee = () => { if (dicteeEnCours) { const d = dicteeEnCours; dicteeEnCours = null; try { d.stop(); } catch (e) {} } };
function fCompteRendu(id, retour) {
  const c = get(id); if (!c) return;
  const cr = JSON.parse(JSON.stringify(c.cr || {})); cr.p = cr.p || {};
  const E = c.eleves || [], groupe = E.length > 1;
  const zoneHtml = (k, label, val, ouvert) => `<div style="margin-top:10px"><div class="ligne" style="align-items:center"><label class="l" style="margin:0">${label}</label><button type="button" class="go" data-dic="${k}" style="flex:none">🎤 Dicter</button></div>
    <textarea data-z="${k}" style="min-height:${ouvert ? 130 : 80}px;margin-top:6px" placeholder="Ex. : travail de la bandeja et de la sortie de vitre, à revoir : placement au filet.">${esc(val || '')}</textarea></div>`;
  let h = tete('📝 Compte rendu') + `<p class="note" style="margin:0">${esc(dLong(c.date))} · ${hTxt(c.debut)} · ${esc(E.map(nomE).join(', '))}</p>`;
  h += zoneHtml('g', groupe ? 'Pour tout le groupe' : 'Ce qu\'on a travaillé', cr.g, true);
  if (groupe) h += `<details ${E.some(e => cr.p[e]) ? 'open' : ''} style="margin-top:10px"><summary class="note">Une note pour un élève en particulier</summary>${E.map(e => zoneHtml(e, 'Pour ' + esc(nomE(e)) + ' seulement', cr.p[e])).join('')}</details>`;
  h += `<p class="note" style="margin:8px 0 0">${Reco ? 'Touche « 🎤 Dicter », parle, puis « ⏹ Arrêter » : le texte s\'écrit tout seul et reste modifiable.' : 'Pour dicter, touche le micro 🎤 du clavier du téléphone.'} Le compte rendu apparaît dans la fiche de chaque élève (Suivi des cours).</p>
    <div class="btns"><button type="button" class="go" id="cr-ok">Enregistrer</button><button type="button" id="cr-n">Annuler</button></div>`;
  ouvrir(h, f => {
    f.querySelectorAll('[data-dic]').forEach(b => dictee(f.querySelector(`[data-z="${b.dataset.dic}"]`), b));
    const ret = () => { stopDictee(); if (retour) retour(); else fermer(); };
    f.querySelector('#cr-n').onclick = ret;
    f.querySelector('[data-ferme]').onclick = () => { stopDictee(); fermer(); };
    f.querySelector('#cr-ok').onclick = () => {
      stopDictee();
      setTimeout(() => {
        const n = {g: f.querySelector('[data-z="g"]').value.trim(), p: {}};
        E.forEach(e => { const z = f.querySelector(`[data-z="${e}"]`); if (z && z.value.trim()) n.p[e] = z.value.trim(); });
        c.cr = n; put(c); bulle('Compte rendu enregistré ✓'); rendre(); ret();
      }, 150);
    };
  });
}

// ---------- Relevé PDF d'un élève (fait dans l'appareil, sans internet) ----------
// Petit fabricant de PDF : texte (Helvetica), rectangles et traits, pages A4.
function Pdf() {
  const W = 595.28, H = 841.89, pages = []; let ops = null;
  const SPE = {'€': 128, '‚': 130, 'ƒ': 131, '„': 132, '…': 133, '†': 134, '‡': 135, 'ˆ': 136, '‰': 137, 'Š': 138, '‹': 139, 'Œ': 140, 'Ž': 142, '‘': 145, '’': 146, '“': 147, '”': 148, '•': 149, '–': 150, '—': 151, '˜': 152, '™': 153, 'š': 154, '›': 155, 'œ': 156, 'ž': 158, 'Ÿ': 159};
  const enc = t => { let o = ''; for (const ch of String(t).replace(/[  ]/g, ' ')) { const k = ch.charCodeAt(0); const b = SPE[ch] || (ch.length === 1 && (k < 128 || (k >= 160 && k < 256)) ? k : 63); const c = String.fromCharCode(b); o += c === '(' || c === ')' || c === '\\' ? '\\' + c : c; } return o; };
  const larg = (t, taille, gras) => { let w = 0; for (const ch of String(t)) w += /[il.,:;|!'’ ]/.test(ch) ? 0.27 : /[fjrtI\-()]/.test(ch) ? 0.33 : /[mwMW@]/.test(ch) ? 0.86 : /[A-ZÀ-Ý]/.test(ch) ? 0.68 : /[0-9€]/.test(ch) ? 0.556 : 0.53; return w * taille * (gras ? 1.06 : 1); };
  const rgb = c => { const n = parseInt(c.slice(1), 16); return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255].map(x => x.toFixed(3)).join(' '); };
  const p = {
    W, H, larg,
    page() { ops = []; pages.push(ops); },
    texte(x, y, t, taille = 10, gras = false, coul = '#14212b', droite = false) { if (droite) x -= larg(t, taille, gras); ops.push(`BT ${rgb(coul)} rg /${gras ? 'F2' : 'F1'} ${taille} Tf ${x.toFixed(2)} ${(H - y).toFixed(2)} Td (${enc(t)}) Tj ET`); },
    rect(x, y, w, h, coul) { ops.push(`${rgb(coul)} rg ${x.toFixed(2)} ${(H - y - h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`); },
    trait(x1, y1, x2, y2, coul = '#d8e1e7', e = 0.6) { ops.push(`${rgb(coul)} RG ${e} w ${x1.toFixed(2)} ${(H - y1).toFixed(2)} m ${x2.toFixed(2)} ${(H - y2).toFixed(2)} l S`); },
    // Coupe un texte en lignes qui tiennent dans la largeur
    couper(t, w, taille, gras) { const out = []; String(t).split(/\n/).forEach(par => { let l = ''; par.split(/\s+/).forEach(m => { const e = l ? l + ' ' + m : m; if (larg(e, taille, gras) > w && l) { out.push(l); l = m; } else l = e; }); out.push(l); }); return out; },
    blob() {
      const obj = [], add = s => { obj.push(s); return obj.length; };
      add('<< /Type /Catalog /Pages 2 0 R >>'); add('');
      add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
      add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
      const kids = [];
      pages.forEach(o => { const flux = o.join('\n'); const c = add(`<< /Length ${flux.length} >>\nstream\n${flux}\nendstream`); kids.push(add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${c} 0 R >>`)); });
      obj[1] = `<< /Type /Pages /Kids [${kids.map(k => k + ' 0 R').join(' ')}] /Count ${kids.length} >>`;
      let out = '%PDF-1.4\n%\xe2\xe3\xcf\xd3\n'; const pos = [];
      obj.forEach((o, i) => { pos.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
      const x = out.length;
      out += `xref\n0 ${obj.length + 1}\n0000000000 65535 f \n` + pos.map(n => String(n).padStart(10, '0') + ' 00000 n \n').join('') + `trailer\n<< /Size ${obj.length + 1} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF`;
      const u = new Uint8Array(out.length); for (let i = 0; i < out.length; i++) u[i] = out.charCodeAt(i) & 255;
      return new Blob([u], {type: 'application/pdf'});
    }
  };
  return p;
}
const deNom = n => /^[aeiouyhàâäéèêëîïôöûü]/i.test(n || '') ? 'd\'' + n : 'de ' + n;
function relevePdf(eid, avecSuivi) {
  const e = get(eid), b = bilan(eid), R = reg(), P = Pdf(), M = 46, L = P.W - 2 * M, BLEU = '#0b6e8f', GRIS = '#5a6b77';
  const C = tous('cours').filter(c => (c.eleves || []).includes(eid)).sort((a, c2) => debutMs(a) - debutMs(c2));
  const donnes = C.filter(c => actif(c) && (passe(c) || c.statut === 'absent')), prevus = C.filter(c => actif(c) && !(passe(c) || c.statut === 'absent'));
  const Pa = tous('paiement').filter(p => p.eleve === eid).sort((a, c2) => (a.date || '').localeCompare(c2.date || ''));
  let y = 0, num = 0;
  const piedPage = () => { P.trait(M, P.H - 40, P.W - M, P.H - 40); P.texte(M, P.H - 26, `Relevé ${deNom(e.nom)} · édité le ${dNum(auj())}`, 8, false, GRIS); P.texte(P.W - M, P.H - 26, 'Page ' + num, 8, false, GRIS, true); };
  const nouvellePage = () => { if (num) piedPage(); P.page(); num++; y = 50; };
  const place = h => { if (y + h > P.H - 60) { nouvellePage(); } };
  nouvellePage();
  // En-tête
  P.rect(0, 0, P.W, 92, BLEU);
  P.texte(M, 40, 'Relevé de compte', 22, true, '#ffffff');
  P.texte(M, 62, 'Cours de padel' + (R.prof ? ' · ' + R.prof : ''), 12, false, '#d8eef5');
  P.texte(P.W - M, 40, 'Édité le ' + dLong(auj()), 10, false, '#ffffff', true);
  y = 124;
  P.texte(M, y, e.nom, 18, true); y += 18;
  P.texte(M, y, [e.tel, e.email, e.niveau ? 'niveau ' + e.niveau : ''].filter(Boolean).join(' · ') || ' ', 10, false, GRIS); y += 22;
  // Cases du résumé
  const cases = [['Leçons données', String(b.donnes)], ['Leçons prévues', String(b.prevus)], ['Total facturé', euro(b.du)], ['Payé', euro(b.paye)],
    [b.solde > 0.004 ? 'Reste à payer' : b.solde < -0.004 ? 'Payé d\'avance' : 'Solde', b.solde > 0.004 ? euro(b.solde) : b.solde < -0.004 ? euro(-b.solde) : 'Tout est payé']];
  const lc = (L - 4 * 8) / 5;
  cases.forEach(([t, v], i) => { const x = M + i * (lc + 8), fin = i === 4; P.rect(x, y, lc, 54, fin ? (b.solde > 0.004 ? '#fbe2df' : '#ddf3e5') : '#eef6f9'); P.texte(x + 8, y + 18, t, 8.5, false, GRIS); P.texte(x + 8, y + 40, v, v.length > 9 ? 11 : 15, true, fin ? (b.solde > 0.004 ? '#c0392b' : '#1e8a4c') : '#14212b'); });
  y += 78;
  const titre = t => { place(60); P.texte(M, y, t, 13, true, BLEU); y += 8; P.trait(M, y, P.W - M, y, BLEU, 1); y += 16; };
  const tableau = (cols, lignes) => {
    // cols : [titre, largeur relative, droite?]
    const tot = cols.reduce((s, c) => s + c[1], 0), xs = []; let x = M; cols.forEach(c => { xs.push(x); x += c[1] / tot * L; });
    const tete = () => { P.rect(M, y - 11, L, 17, '#e2f1f6'); cols.forEach((c, i) => P.texte(c[2] ? xs[i] + c[1] / tot * L - 4 : xs[i] + 4, y + 1, c[0], 8.5, true, BLEU, !!c[2])); y += 18; };
    tete();
    lignes.forEach(l => {
      const coupe = l.map((v, i) => P.couper(v, cols[i][1] / tot * L - 8, 9.5)), h = Math.max(...coupe.map(c => c.length)) * 12 + 4;
      if (y + h > P.H - 60) { nouvellePage(); tete(); }
      coupe.forEach((c, i) => c.forEach((t, k) => P.texte(cols[i][2] ? xs[i] + cols[i][1] / tot * L - 4 : xs[i] + 4, y + k * 12, t, 9.5, false, '#14212b', !!cols[i][2])));
      y += h; P.trait(M, y - 9, P.W - M, y - 9);
    });
    y += 10;
  };
  const avec = c => (c.eleves || []).filter(x => x !== eid).map(prenom).join(', ');
  const fact = c => { const x = (c.f || {})[eid] || {}; return (x.forfait ? 'Forfait' + (D[x.forfait] ? ' ' + D[x.forfait].nom : '') : x.gratuit ? 'Offert' : euro(x.prix)) + (c.statut === 'absent' ? ' (absent, facturé)' : ''); };
  if (b.forfaits.length) {
    titre('Forfaits');
    tableau([['Acheté le', 1.1], ['Forfait', 2.6], ['Prix', 1, 1], ['Données', 1, 1], ['Restantes', 1, 1]], b.forfaits.map(x => [dNum(x.f.date || auj()), x.f.nom || x.f.seances + ' séances', euro(x.f.prix), x.faites + ' / ' + x.f.seances, String(Math.max(0, x.restantes))]));
  }
  titre(`Leçons données (${donnes.length})`);
  if (donnes.length) tableau([['Date', 1.6], ['Heure', 0.9], ['Avec', 1.6], ['Prix', 2.2, 1]], donnes.map(c => [dCourt(c.date) + ' ' + c.date.slice(0, 4), hTxt(c.debut) + ' (' + dureeTxt(c.duree || 60) + ')', avec(c) || 'seul', fact(c)]));
  else { P.texte(M, y, 'Aucune pour l\'instant.', 10, false, GRIS); y += 20; }
  if (prevus.length) { titre(`Leçons prévues (${prevus.length})`); tableau([['Date', 1.6], ['Heure', 0.9], ['Avec', 1.6], ['Prix', 2.2, 1]], prevus.map(c => [dCourt(c.date) + ' ' + c.date.slice(0, 4), hTxt(c.debut) + ' (' + dureeTxt(c.duree || 60) + ')', avec(c) || 'seul', fact(c)])); }
  titre(`Paiements (${Pa.length})`);
  if (Pa.length) tableau([['Date', 1.2], ['Mode', 1.2], ['Note', 2.6], ['Montant', 1, 1]], Pa.map(p => [dNum(p.date || auj()), p.mode || '', p.note || '', euro(p.montant)]).concat([['', '', 'Total payé', euro(b.paye)]]));
  else { P.texte(M, y, 'Aucun paiement enregistré.', 10, false, GRIS); y += 20; }
  if (avecSuivi) {
    const S = C.filter(c => crPour(c, eid));
    if (S.length) {
      titre('Suivi des cours');
      S.forEach(c => {
        const t = crPour(c, eid), lignes = [].concat(t.g ? P.couper(t.g, L - 12, 10) : [], t.p ? P.couper('Pour ' + prenom(eid) + ' : ' + t.p, L - 12, 10) : []);
        place(20 + lignes.length * 13);
        P.texte(M, y, dLong(c.date) + ' · ' + hTxt(c.debut), 10, true); y += 14;
        lignes.forEach(l => { if (y > P.H - 70) nouvellePage(); P.texte(M + 10, y, l, 10); y += 13; });
        y += 8;
      });
    }
  }
  piedPage();
  return P.blob();
}
function fReleve(eid) {
  const e = get(eid); if (!e) return;
  const nS = tous('cours').filter(c => (c.eleves || []).includes(eid) && crPour(c, eid)).length;
  const nomF = `Releve-padel-${e.nom.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-')}-${auj()}.pdf`;
  ouvrir(tete('📄 Relevé ' + esc(deNom(e.nom))) + `<p class="note" style="margin:0">Un PDF avec ses leçons données et prévues, ses forfaits, ses paiements et ce qui reste à payer. Pratique si l'élève veut un compte rendu ou une preuve.</p>
    ${nS ? `<label style="display:flex;gap:8px;align-items:center;margin-top:12px;font-weight:600"><input type="checkbox" id="rl-s" style="width:22px;height:22px" checked> Ajouter le suivi des cours (${nS} compte${nS > 1 ? 's' : ''} rendu${nS > 1 ? 's' : ''})</label>` : ''}
    <div class="btns"><button type="button" class="go" id="rl-env">📤 Envoyer le PDF</button><button type="button" id="rl-vue">👀 Voir</button><button type="button" id="rl-dl">⬇️ Télécharger</button></div>
    <p class="note" id="rl-n">Sur le téléphone, « Envoyer » ouvre le partage : choisis WhatsApp puis l'élève.</p>`, f => {
    const fab = () => relevePdf(eid, f.querySelector('#rl-s') ? f.querySelector('#rl-s').checked : false);
    const dl = blob => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nomF; document.body.appendChild(a); a.click(); a.remove(); };
    f.querySelector('#rl-env').onclick = async () => {
      const fi = new File([fab()], nomF, {type: 'application/pdf'});
      if (navigator.canShare && navigator.canShare({files: [fi]})) {
        try { await navigator.share({files: [fi], title: 'Relevé padel ' + e.nom}); } catch (err) { /* partage annulé */ }
      } else {
        dl(fi);
        f.querySelector('#rl-n').innerHTML = `PDF téléchargé ✓ Sur l'ordinateur, joins-le dans WhatsApp${e.tel ? ` : <a href="${lienWa(e.tel, 'Bonjour ' + prenom(eid) + ', voici ton relevé de cours de padel.')}" target="_blank" rel="noopener">ouvrir la conversation avec ${esc(prenom(eid))}</a>, puis 📎 › Document` : ' (📎 › Document)'}.`;
      }
    };
    f.querySelector('#rl-vue').onclick = () => { const u = URL.createObjectURL(fab()); if (!open(u, '_blank')) location.href = u; };
    f.querySelector('#rl-dl').onclick = () => dl(fab());
  });
}

// ===== Élèves =====
let filtreE = '';
function vueEleves() {
  const E = tous('eleve').sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  let h = `<div class="barre"><span class="titre">${E.filter(e => !e.archive).length} élève${E.length > 1 ? 's' : ''}</span>${tous('reprise').length ? `<button type="button" id="e-rep">📋 Reprise${tous('reprise').filter(r => !r.importe).length ? ' (' + tous('reprise').filter(r => !r.importe).length + ')' : ''}</button>` : '<button type="button" id="e-rep">📋 Reprise</button>'}<button type="button" class="go" id="e-nouv">+ Élève</button></div>
    <input id="e-cherche" placeholder="🔎 Chercher un élève" value="${esc(filtreE)}" autocomplete="off"><div id="e-liste"></div>`;
  $('vue').innerHTML = h;
  const liste = () => {
    const q = filtreE.trim().toLowerCase();
    const L = E.filter(e => !q || e.nom.toLowerCase().includes(q) || (e.tel || '').replace(/\s/g, '').includes(q.replace(/\s/g, '')));
    const act = L.filter(e => !e.archive), arc = L.filter(e => e.archive);
    const ligne = e => {
      const b = bilan(e.id), fx = b.forfaits.filter(x => x.restantes > 0), aPlacer = fx.reduce((s, x) => s + Math.max(0, x.libres), 0);
      // Au bout de la ligne : combien de dates du cycle il reste à mettre dans l'agenda
      const plan = fx.length ? (aPlacer ? `<span class="pill warn">Encore ${aPlacer} date${aPlacer > 1 ? 's' : ''} à planifier</span>` : '<span class="pill ok">Tout est planifié</span>')
        : b.forfaits.length && b.forfaits.every(x => x.restantes <= 0) ? '<span class="pill">Cycle terminé</span>' : '';
      const proch = tous('cours').filter(c => actif(c) && (c.eleves || []).includes(e.id) && !passe(c)).sort((a, b) => debutMs(a) - debutMs(b))[0];
      return `<div class="el" data-el="${e.id}"><div class="av" style="background:${couleurE(e.id)}">${esc(initiales(e.nom))}</div><div class="mid"><b>${esc(e.nom)}</b><span>${b.donnes} leçon${b.donnes > 1 ? 's' : ''} donnée${b.donnes > 1 ? 's' : ''}${proch ? ' · prochain ' + dCourt(proch.date) + ' ' + hTxt(proch.debut) : ''}</span></div>
        <div class="droite">${soldePill(b)}${plan}</div></div>`;
    };
    $('e-liste').innerHTML = (act.map(ligne).join('') || `<p class="vide">${q ? 'Personne ne correspond.' : 'Pas encore d\'élève. Touche « + Élève », ou ajoute-les directement en créant un cours.'}</p>`) +
      (arc.length ? `<h3>Anciens élèves</h3>${arc.map(ligne).join('')}` : '');
    $('e-liste').querySelectorAll('[data-el]').forEach(x => x.onclick = () => fEleve(x.dataset.el));
  };
  $('e-cherche').oninput = e => { filtreE = e.target.value; liste(); };
  $('e-nouv').onclick = () => fEleveModif(null);
  $('e-rep').onclick = fReprise;
  liste();
}
// Niveaux de padel (choix du prof)
const NIVEAUX = ['Débutant', '50', '100', '200', '300', '400', '500', '700', '1000'];
function fEleveModif(id) {
  const e = id ? Object.assign({}, get(id)) : {id: nid(), type: 'eleve', nom: '', tel: '', email: '', niveau: '', note: ''};
  ouvrir(tete(id ? 'Modifier l\'élève' : 'Nouvel élève') + `
    <label class="l">Nom et prénom</label><input id="e-nom" value="${esc(e.nom)}" autocomplete="off">
    <div class="ligne"><div><label class="l">Téléphone</label><input id="e-tel" type="tel" value="${esc(e.tel)}" placeholder="0470 12 34 56"></div><div><label class="l">Niveau</label><select id="e-niv"><option value="">—</option>${NIVEAUX.concat(e.niveau && !NIVEAUX.includes(e.niveau) ? [e.niveau] : []).map(n => `<option value="${esc(n)}"${n === e.niveau ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></div></div>
    <label class="l">E-mail</label><input id="e-mail" type="email" value="${esc(e.email)}">
    <label class="l">Note</label><textarea id="e-note" placeholder="Disponibilités, objectifs, blessure…">${esc(e.note)}</textarea>
    <div class="btns"><button type="button" class="go" id="e-ok">Enregistrer</button><button type="button" data-ferme>Annuler</button></div>`, f => {
    setTimeout(() => { const n = f.querySelector('#e-nom'); if (n) n.focus(); }, 60);
    f.querySelector('#e-ok').onclick = () => {
      const nom = f.querySelector('#e-nom').value.trim(); if (!nom) { f.querySelector('#e-nom').focus(); return; }
      Object.assign(e, {nom: id ? nom : nomPropre(nom), tel: f.querySelector('#e-tel').value.trim(), niveau: f.querySelector('#e-niv').value.trim(), email: f.querySelector('#e-mail').value.trim(), note: f.querySelector('#e-note').value.trim()});
      put(e); fermer(); rendre(); if (!id) fEleve(e.id);
    };
  });
}
function fEleve(id) {
  const e = get(id); if (!e) return;
  const b = bilan(id);
  const C = tous('cours').filter(c => (c.eleves || []).includes(id)).sort((a, b) => debutMs(a) - debutMs(b));
  const futurs = C.filter(c => !passe(c) && actif(c) && c.statut !== 'absent'), anciens = C.filter(c => passe(c) || !actif(c) || c.statut === 'absent').reverse();
  const P = tous('paiement').filter(p => p.eleve === id).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  let h = tete(`${esc(e.nom)} <button type="button" id="f-modif" aria-label="Modifier l'élève" title="Modifier (nom, téléphone…)" style="font-size:15px;vertical-align:middle;margin-left:4px">✏️</button>`);
  h += `<p style="margin:0">${e.tel ? lienTel(e.tel) + ` · <a href="${lienWa(e.tel)}" target="_blank" rel="noopener">WhatsApp</a>` : '<button type="button" class="lien" id="f-tel">+ Ajouter son téléphone</button>'}${e.email ? ' · <a href="mailto:' + esc(e.email) + '">e-mail</a>' : ''}${e.niveau ? ' · niveau ' + esc(e.niveau) : ''}</p>${e.note ? `<p class="note" style="margin:4px 0">${esc(e.note)}</p>` : ''}`;
  h += `<div class="resume" style="grid-template-columns:repeat(3,1fr)"><div><b>${b.donnes}</b><span>leçons données</span></div><div><b>${b.prevus}</b><span>prévues</span></div><div><b style="color:${b.solde > 0.004 ? 'var(--err)' : 'var(--ok)'}">${b.solde > 0.004 ? euro(b.solde) : b.solde < -0.004 ? '+' + euro(-b.solde) : 'OK'}</b><span>${b.solde > 0.004 ? 'reste à payer' : b.solde < -0.004 ? 'payé d\'avance' : 'tout est payé'}</span></div></div>
    <p class="note" style="margin:0">Total dû ${euro(b.du)} (forfaits ${euro(b.du - b.unite)} + leçons à l'unité ${euro(b.unite)}) · payé ${euro(b.paye)}</p>`;
  h += `<div class="btns"><button type="button" class="go" id="f-cours">+ Cours</button><button type="button" id="f-forf">+ Forfait</button><button type="button" id="f-paie">💶 Paiement</button><button type="button" id="f-pdf">📄 Relevé PDF</button></div>`;
  h += '<h3>Forfaits</h3>';
  h += b.forfaits.length ? b.forfaits.slice().reverse().map(x => {
    const n = +x.f.seances || 1;
    return `<div class="carte" data-fo="${x.f.id}" style="cursor:pointer"><b>${esc(x.f.nom || n + ' séances')}</b> · ${euro(x.f.prix)} <span class="note">· acheté le ${dNum(x.f.date || auj())}</span>
      <div class="barre-p"><i class="f" style="width:${Math.min(100, x.faites / n * 100)}%;float:left"></i><i style="width:${Math.min(100, x.prevues / n * 100)}%;float:left;opacity:.55"></i></div>
      <span class="note">${x.faites} faite${x.faites > 1 ? 's' : ''} · <b style="color:${x.restantes > 0 ? 'var(--fg)' : 'var(--err)'}">${x.restantes} restante${Math.abs(x.restantes) > 1 ? 's' : ''}</b>${x.restantes > 0 ? ` (${x.prevues} déjà au planning${x.libres > 0 ? ', ' + x.libres + ' à placer' : ''})` : ''}${x.libres < 0 ? ` · ⚠️ ${-x.libres} cours prévu${x.libres < -1 ? 's' : ''} de trop` : ''}</span></div>`;
  }).join('') : '<p class="note">Aucun forfait : les leçons sont comptées à l\'unité.</p>';
  const ligneC = c => `<div class="el" data-co="${c.id}" style="padding:8px 12px"><div class="mid"><b>${esc(dCourt(c.date))} · ${hTxt(c.debut)}</b><span>${(c.eleves || []).length > 1 ? 'avec ' + esc(c.eleves.filter(x => x !== id).map(prenom).join(', ')) + ' · ' : ''}${factuTxt(c, id)}</span></div><div class="droite">${c.statut === 'annule' ? '<span class="pill">annulé</span>' : c.statut === 'absent' ? '<span class="pill warn">absent</span>' : ''}</div></div>`;
  h += `<h3>Prochains cours (${futurs.length})</h3>` + (futurs.map(ligneC).join('') || '<p class="note">Aucun.</p>');
  const S = C.filter(c => crPour(c, id)).reverse();
  h += `<h3>📝 Suivi des cours (${S.length})</h3>` + (S.map(c => { const t = crPour(c, id); return `<div class="carte" data-co="${c.id}" style="cursor:pointer;padding:10px 12px"><b>${esc(dCourt(c.date))} · ${hTxt(c.debut)}</b>${(c.eleves || []).length > 1 ? ' <span class="note">avec ' + esc(c.eleves.filter(x => x !== id).map(prenom).join(', ')) + '</span>' : ''}${t.g ? `<p style="margin:4px 0 0;white-space:pre-wrap">${esc(t.g)}</p>` : ''}${t.p ? `<p style="margin:4px 0 0;white-space:pre-wrap"><b>Pour ${esc(prenom(id))} :</b> ${esc(t.p)}</p>` : ''}</div>`; }).join('') || '<p class="note">Pas encore de compte rendu. Touche un cours dans l\'agenda, puis « 🎤 Faire le compte rendu ».</p>');
  h += `<h3>Paiements (${P.length})</h3>` + (P.map(p => `<div class="el" data-pa="${p.id}" style="padding:8px 12px"><div class="mid"><b>${euro(p.montant)}</b><span>${dNum(p.date || auj())}${p.mode ? ' · ' + esc(p.mode) : ''}${p.note ? ' · ' + esc(p.note) : ''}</span></div></div>`).join('') || '<p class="note">Aucun.</p>');
  h += `<details style="margin-top:10px"><summary class="note">Leçons passées (${anciens.length})</summary>${anciens.map(ligneC).join('')}</details>`;
  h += `<div class="btns"><button type="button" id="f-arch">${e.archive ? 'Remettre dans les élèves' : 'Ranger dans les anciens élèves'}</button><button type="button" class="rouge" id="f-suppr">Supprimer</button></div>`;
  ouvrir(h, f => {
    f.querySelector('#f-cours').onclick = () => { etatA.date = auj(); fCours(null, {eleves: [id], date: auj()}); };
    f.querySelector('#f-forf').onclick = () => fForfait({eleves: [id], retour: () => fEleve(id)});
    f.querySelector('#f-paie').onclick = () => fPaiement({eleve: id, retour: () => fEleve(id)});
    f.querySelector('#f-pdf').onclick = () => fReleve(id);
    f.querySelector('#f-modif').onclick = () => fEleveModif(id);
    if (f.querySelector('#f-tel')) f.querySelector('#f-tel').onclick = () => fEleveModif(id);
    f.querySelectorAll('[data-co]').forEach(x => x.onclick = () => fDetail(x.dataset.co));
    f.querySelectorAll('[data-pa]').forEach(x => x.onclick = () => fPaiement({id: x.dataset.pa, retour: () => fEleve(id)}));
    f.querySelectorAll('[data-fo]').forEach(x => x.onclick = () => fForfait({id: x.dataset.fo, retour: () => fEleve(id)}));
    f.querySelector('#f-arch').onclick = () => { e.archive = e.archive ? 0 : 1; put(e); fermer(); rendre(); };
    f.querySelector('#f-suppr').onclick = () => {
      if (C.length || P.length) { alert('Cet élève a des cours ou des paiements : range-le plutôt dans les anciens élèves (l\'historique reste juste).'); return; }
      if (confirm('Supprimer ' + e.nom + ' ?')) { tous('forfait').filter(x => x.eleve === id).forEach(x => suppr(x.id)); suppr(id); fermer(); rendre(); }
    };
  });
}

// Fenêtre : vendre un forfait (cycle ou à la carte), pour un ou plusieurs élèves
function fForfait(o) {
  const f0 = o.id ? get(o.id) : null;
  const s = {pers: o.pers || (o.eleves || []).length || 1, seances: f0 ? +f0.seances : 10, duree: o.duree || 60, prix: f0 ? +f0.prix : null, nom: f0 ? f0.nom : '', date: f0 ? f0.date : auj(), paye: false, eleves: f0 ? [f0.eleve] : (o.eleves || []).slice()};
  s.pers = Math.min(4, Math.max(1, s.pers));
  let main = !!f0;
  // Leçons déjà données à l'unité (ex. une leçon d'essai), qu'on peut mettre dans le nouveau forfait
  const passes = f0 ? [] : tous('cours').filter(c => actif(c) && (passe(c) || c.statut === 'absent') && s.eleves.some(e => (c.eleves || []).includes(e) && c.f && c.f[e] && !c.f[e].forfait && !c.f[e].gratuit)).sort((a, b) => debutMs(a) - debutMs(b));
  const dessiner = () => {
    const p = proposer(s.pers, s.seances, s.duree);
    if (!main) s.prix = p.total;
    const nomAuto = s.seances + ' séance' + (s.seances > 1 ? 's' : '') + (s.duree !== 60 ? ' de ' + dureeTxt(s.duree) : '') + (s.pers > 1 ? ' à ' + s.pers : ' individuel');
    let h = tete(f0 ? 'Forfait de ' + esc(nomE(f0.eleve)) : 'Vendre un forfait');
    if (!f0) h += `<label class="l">Pour</label><div class="chips">${s.eleves.map(e => `<span class="chip">${esc(nomE(e))}</span>`).join('') || '<span class="note">Choisis l\'élève dans sa fiche</span>'}</div>`;
    h += `<label class="l">Joueurs sur le terrain</label><div class="choixn">${[1, 2, 3, 4].map(n => `<button type="button" data-n="${n}" class="${s.pers === n ? 'on' : ''}">${n === 1 ? 'Seul' : 'À ' + n}</button>`).join('')}</div>
      <div class="ligne"><div><label class="l">Nombre de séances</label><div class="pas"><button type="button" id="ff-m">−</button><input id="ff-n" type="number" inputmode="numeric" min="1" value="${s.seances}"><button type="button" id="ff-p">+</button></div></div>
      <div style="max-width:120px"><label class="l">Durée</label><select id="ff-dur">${optDurees(s.duree)}</select></div></div>
      <div class="calc"><div class="note">Prix proposé par personne</div><div class="prix">${euro(p.total)}</div>
      <div class="detail">${euro(p.parSeance)} la séance${p.normal > p.total ? ` · au lieu de ${euro(p.normal)} (économie ${euro(p.normal - p.total)})` : s.seances < (p.tarif ? p.tarif.cycle : 10) ? ` · dès ${p.tarif ? p.tarif.cycle : 10} séances : ${euro(p.tarif ? p.tarif.prixCycle / p.tarif.cycle * s.duree / 60 : 0)} la séance` : ''}</div></div>
      <div class="ligne"><div><label class="l">Prix demandé (par personne)</label><input id="ff-prix" type="number" inputmode="decimal" step="0.5" min="0" value="${s.prix}"></div><div><label class="l">Date d'achat</label><input id="ff-date" type="date" value="${s.date}"></div></div>
      ${main && Math.abs(s.prix - p.total) > 0.004 ? `<p class="note" style="margin:4px 0">Prix à la carte (le tarif dirait ${euro(p.total)}). <button type="button" class="lien" id="ff-tarif">Remettre le tarif</button></p>` : ''}
      <label class="l">Nom du forfait</label><input id="ff-nom" value="${esc(s.nom || nomAuto)}">
      ${f0 ? '' : `<label class="choix" style="display:flex;gap:8px;align-items:center;margin-top:10px;font-weight:600"><input type="checkbox" id="ff-paye" style="width:22px;height:22px" ${s.paye ? 'checked' : ''}> Déjà payé (enregistre aussi le paiement)</label>`}
      ${!f0 && passes.length ? `<label class="choix" style="display:flex;gap:8px;align-items:center;margin-top:6px;font-weight:600"><input type="checkbox" id="ff-passes" style="width:22px;height:22px" ${s.passes ? 'checked' : ''}> Y compter aussi ${passes.length > 1 ? 'les ' + passes.length + ' leçons déjà données' : 'la leçon déjà donnée'} à l'unité (${esc(passes.map(c => dCourt(c.date)).join(', '))})</label>` : ''}
      <div class="btns"><button type="button" class="go" id="ff-ok" ${s.eleves.length ? '' : 'disabled'}>${f0 ? 'Enregistrer' : 'Vendre ce forfait'}</button><button type="button" id="ff-msg">💬 Message</button>${f0 ? '<button type="button" class="rouge" id="ff-suppr">Supprimer</button>' : ''}<button type="button" data-ferme>Fermer</button></div>`;
    ouvrir(h, f => {
      const lire = () => { if (f.querySelector('#ff-passes')) s.passes = f.querySelector('#ff-passes').checked; s.seances = Math.max(1, +f.querySelector('#ff-n').value || 1); s.duree = +f.querySelector('#ff-dur').value; s.date = f.querySelector('#ff-date').value || auj(); s.nom = f.querySelector('#ff-nom').value.trim(); const pc = f.querySelector('#ff-paye'); if (pc) s.paye = pc.checked; };
      const nomAuDefaut = () => { if (s.nom === nomAuto) s.nom = ''; };
      f.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { lire(); nomAuDefaut(); s.pers = +b.dataset.n; main = false; dessiner(); });
      f.querySelector('#ff-m').onclick = () => { lire(); nomAuDefaut(); s.seances = Math.max(1, s.seances - 1); main = false; dessiner(); };
      f.querySelector('#ff-p').onclick = () => { lire(); nomAuDefaut(); s.seances++; main = false; dessiner(); };
      f.querySelector('#ff-n').onchange = () => { const avant = s.nom; lire(); if (avant === '' || s.nom === nomAuto) s.nom = ''; main = false; dessiner(); };
      f.querySelector('#ff-dur').onchange = () => { lire(); nomAuDefaut(); main = false; dessiner(); };
      f.querySelector('#ff-prix').oninput = e => { s.prix = +e.target.value.replace(',', '.') || 0; main = true; };
      f.querySelector('#ff-prix').onchange = () => { lire(); dessiner(); };
      if (f.querySelector('#ff-tarif')) f.querySelector('#ff-tarif').onclick = () => { lire(); main = false; dessiner(); };
      f.querySelector('#ff-msg').onclick = () => {
        lire();
        copier(`Bonjour ! Pour ${s.seances} séance${s.seances > 1 ? 's' : ''} de padel de ${dureeTxt(s.duree)}${s.pers > 1 ? ' à ' + s.pers + ' joueurs' : ' en individuel'}, je te propose ${euro(s.prix)}${s.pers > 1 ? ' par personne' : ''}, soit ${euro(s.prix / s.seances)} la séance. Ça te va ?`);
      };
      f.querySelector('#ff-ok').onclick = () => {
        lire();
        if (f0) { Object.assign(f0, {seances: s.seances, prix: s.prix, nom: s.nom || nomAuto, date: s.date, pers: s.pers, duree: s.duree}); put(f0); }
        else s.eleves.forEach(e => {
          put({id: nid(), type: 'forfait', eleve: e, seances: s.seances, prix: s.prix, nom: s.nom || nomAuto, date: s.date, pers: s.pers, duree: s.duree});
          if (s.paye) put({id: nid(), type: 'paiement', eleve: e, montant: s.prix, date: s.date, mode: '', note: 'Forfait ' + (s.nom || nomAuto)});
        });
        // Les cours à venir de ces élèves payés à l'unité passent sur le nouveau forfait
        if (!f0) s.eleves.forEach(e => tous('cours').filter(c => actif(c) && (s.passes || !(passe(c) || c.statut === 'absent')) && (c.eleves || []).includes(e) && c.f && c.f[e] && !c.f[e].forfait && !c.f[e].gratuit)
          .sort((a, b) => debutMs(a) - debutMs(b)).forEach(c => { const fl = forfaitLibre(e, c.id); if (fl) { c.f[e] = {forfait: fl.id}; put(c); } }));
        bulle(f0 ? 'Forfait enregistré ✓' : 'Forfait vendu ✓');
        rendre();
        if (o.retour) o.retour(); else fermer();
      };
      if (f.querySelector('#ff-suppr')) f.querySelector('#ff-suppr').onclick = () => {
        const util = tous('cours').filter(c => Object.values(c.f || {}).some(x => x.forfait === f0.id));
        if (!confirm(`Supprimer ce forfait ?${util.length ? ` Ses ${util.length} cours passeront au prix à l'unité.` : ''}`)) return;
        util.forEach(c => { Object.keys(c.f).forEach(e => { if (c.f[e].forfait === f0.id) c.f[e] = {prix: prixUnite((c.eleves || []).length, c.duree)}; }); put(c); });
        suppr(f0.id); rendre(); if (o.retour) o.retour(); else fermer();
      };
    });
  };
  dessiner();
}

// Fenêtre : un paiement
function fPaiement(o) {
  const p0 = o.id ? get(o.id) : null;
  const p = p0 ? Object.assign({}, p0) : {id: nid(), type: 'paiement', eleve: o.eleve || '', montant: '', date: auj(), mode: 'Cash', note: ''};
  if (!p0 && p.eleve) { const b = bilan(p.eleve); if (b.solde > 0) p.montant = b.solde; }
  const E = tous('eleve').sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  ouvrir(tete(p0 ? 'Paiement' : 'Encaisser un paiement') + `
    <label class="l">Élève</label><select id="p-el">${p.eleve ? '' : '<option value="">Choisir…</option>'}${E.map(e => `<option value="${e.id}"${e.id === p.eleve ? ' selected' : ''}>${esc(e.nom)}</option>`).join('')}</select>
    <p class="note" id="p-solde" style="margin:4px 0 0"></p>
    <div class="ligne"><div><label class="l">Montant (€)</label><input id="p-m" type="number" inputmode="decimal" step="0.5" min="0" value="${p.montant}"></div><div><label class="l">Date</label><input id="p-d" type="date" value="${p.date}"></div></div>
    <label class="l">Mode</label><div class="choixn" id="p-modes">${['Cash', 'Virement', 'Payconiq', 'Bancontact'].map(m => `<button type="button" data-m="${m}" class="${p.mode === m ? 'on' : ''}">${m}</button>`).join('')}</div>
    <label class="l">Note</label><input id="p-n" value="${esc(p.note)}">
    <div class="btns"><button type="button" class="go" id="p-ok">Enregistrer</button>${p0 ? '<button type="button" class="rouge" id="p-suppr">Supprimer</button>' : ''}<button type="button" data-ferme>Annuler</button></div>`, f => {
    const majS = () => { const e = f.querySelector('#p-el').value; if (!e) { f.querySelector('#p-solde').textContent = ''; return; } const b = bilan(e, null); f.querySelector('#p-solde').textContent = b.solde > 0.004 ? 'Reste à payer : ' + euro(b.solde) : b.solde < -0.004 ? 'Déjà payé d\'avance : ' + euro(-b.solde) : 'Tout est payé.'; };
    f.querySelector('#p-el').onchange = () => { majS(); if (!p0) { const b = bilan(f.querySelector('#p-el').value); f.querySelector('#p-m').value = b.solde > 0 ? b.solde : ''; } };
    majS();
    f.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { p.mode = p.mode === b.dataset.m ? '' : b.dataset.m; f.querySelectorAll('[data-m]').forEach(x => x.classList.toggle('on', x.dataset.m === p.mode)); });
    f.querySelector('#p-ok').onclick = () => {
      p.eleve = f.querySelector('#p-el').value; p.montant = +String(f.querySelector('#p-m').value).replace(',', '.') || 0; p.date = f.querySelector('#p-d').value || auj(); p.note = f.querySelector('#p-n').value.trim();
      if (!p.eleve) { alert('Choisis l\'élève.'); return; }
      if (!p.montant) { f.querySelector('#p-m').focus(); return; }
      put(p); bulle('Paiement enregistré ✓'); rendre(); if (o.retour) o.retour(); else fermer();
    };
    if (f.querySelector('#p-suppr')) f.querySelector('#p-suppr').onclick = () => { if (confirm('Supprimer ce paiement ?')) { suppr(p.id); rendre(); if (o.retour) o.retour(); else fermer(); } };
  });
}

// ===== Tarifs =====
const calc = {pers: 1, seances: 1, duree: 60};
function vueTarifs() {
  const T = tous('tarif').sort((a, b) => a.pers - b.pers);
  let h = segCompte() + `<h2>💶 Proposer un prix</h2><p class="note" style="margin:0">Un joueur demande des cours ? Choisis combien ils sont et combien de séances : le prix s'adapte tout seul (à partir de 10 séances, c'est le prix du cycle).</p>
    <div class="calc"><label class="l" style="margin-top:0">Joueurs sur le terrain</label><div class="choixn">${[1, 2, 3, 4].map(n => `<button type="button" data-n="${n}" class="${calc.pers === n ? 'on' : ''}">${n === 1 ? 'Seul' : 'À ' + n}</button>`).join('')}</div>
    <div class="ligne"><div><label class="l">Séances</label><div class="pas"><button type="button" id="t-m">−</button><input id="t-n" type="number" inputmode="numeric" min="1" value="${calc.seances}"><button type="button" id="t-p">+</button></div></div><div style="max-width:120px"><label class="l">Durée</label><select id="t-dur">${optDurees(calc.duree)}</select></div></div>
    <div class="propo" style="margin-top:10px">${[1, 5, 10, 15, 20].map(n => `<button type="button" data-s="${n}">${n} séance${n > 1 ? 's' : ''}</button>`).join('')}</div>
    <div id="t-res"></div></div>`;
  h += `<h2>Grille des tarifs</h2><p class="note" style="margin:0 0 6px">Par personne, pour une séance d'1h. Touche une formule pour changer ses prix.</p><div class="tarifs">`;
  T.forEach(t => { h += `<div class="tarif" data-t="${t.id}"><b>${esc(t.nom)}</b><div class="gros">${euro(t.prix)}</div><small>la séance${t.pers > 1 ? ' par personne' : ''}</small><small style="margin-top:6px"><b style="display:inline;font-size:13px">${euro(t.prixCycle)}</b> le cycle de ${t.cycle} séances</small></div>`; });
  h += `</div><p class="note">Les forfaits « à la carte » (12 séances, prix d'ami, réduction…) se font dans la fiche de l'élève : « + Forfait », puis change le nombre de séances ou le prix demandé.</p>`;
  $('vue').innerHTML = h;
  const res = () => {
    const p = proposer(calc.pers, calc.seances, calc.duree), t = p.tarif;
    const tot = p.total * calc.pers;
    $('t-res').innerHTML = `<div class="note" style="margin-top:12px">Prix par personne</div><div class="prix">${euro(p.total)}</div>
      <div class="detail">${euro(p.parSeance)} la séance${p.normal > p.total ? ` · au lieu de ${euro(p.normal)}, économie ${euro(p.normal - p.total)}` : calc.seances > 1 && t && calc.seances < t.cycle ? ` · encore ${t.cycle - calc.seances} séance${t.cycle - calc.seances > 1 ? 's' : ''} et ça passe au prix du cycle (${euro(t.prixCycle / t.cycle * calc.duree / 60)} la séance)` : ''}${calc.pers > 1 ? `<br>Pour le groupe : ${euro(tot)}` : ''}</div>
      <div class="btns"><button type="button" id="t-msg">💬 Copier le message</button></div>`;
    $('t-msg').onclick = () => copier(`Bonjour ! Pour ${calc.seances} séance${calc.seances > 1 ? 's' : ''} de padel de ${dureeTxt(calc.duree)}${calc.pers > 1 ? ' à ' + calc.pers + ' joueurs' : ' en individuel'}, c'est ${euro(p.total)}${calc.pers > 1 ? ' par personne' : ''}${calc.seances > 1 ? ', soit ' + euro(p.parSeance) + ' la séance' : ''}. Dis-moi quels jours te conviennent !`);
  };
  $('vue').querySelectorAll('[data-n]').forEach(b => b.onclick = () => { calc.pers = +b.dataset.n; vueTarifs(); });
  $('vue').querySelectorAll('[data-s]').forEach(b => b.onclick = () => { calc.seances = +b.dataset.s; $('t-n').value = calc.seances; res(); });
  $('t-m').onclick = () => { calc.seances = Math.max(1, calc.seances - 1); $('t-n').value = calc.seances; res(); };
  $('t-p').onclick = () => { calc.seances++; $('t-n').value = calc.seances; res(); };
  $('t-n').oninput = () => { calc.seances = Math.max(1, +$('t-n').value || 1); res(); };
  $('t-dur').onchange = () => { calc.duree = +$('t-dur').value; res(); };
  $('vue').querySelectorAll('[data-t]').forEach(x => x.onclick = () => fTarif(x.dataset.t));
  brancherSeg();
  res();
}
function fTarif(id) {
  const t = Object.assign({}, get(id));
  ouvrir(tete(esc(t.nom)) + `<label class="l">Nom</label><input id="tf-nom" value="${esc(t.nom)}">
    <div class="ligne"><div><label class="l">Prix d'une séance d'1h (par personne)</label><input id="tf-p" type="number" inputmode="decimal" step="0.5" value="${t.prix}"></div></div>
    <div class="ligne"><div><label class="l">Cycle (séances)</label><input id="tf-c" type="number" inputmode="numeric" value="${t.cycle}"></div><div><label class="l">Prix du cycle (par personne)</label><input id="tf-pc" type="number" inputmode="decimal" step="0.5" value="${t.prixCycle}"></div></div>
    <p class="note">Les cours déjà enregistrés gardent leur prix ; le nouveau tarif vaut pour les prochains.</p>
    <div class="btns"><button type="button" class="go" id="tf-ok">Enregistrer</button><button type="button" data-ferme>Annuler</button></div>`, f => {
    f.querySelector('#tf-ok').onclick = () => {
      t.nom = f.querySelector('#tf-nom').value.trim() || t.nom; t.prix = +f.querySelector('#tf-p').value || 0; t.cycle = Math.max(1, +f.querySelector('#tf-c').value || 10); t.prixCycle = +f.querySelector('#tf-pc').value || 0;
      put(t); fermer(); rendre();
    };
  });
}

// ===== Compte =====
let periode = 'mois';
function vueCompte() {
  const A = auj(), d = jourDe(A);
  const P = {
    semaine: ['Cette semaine', lundi(A), ajJ(lundi(A), 6)],
    mois: ['Ce mois-ci', iso(new Date(d.getFullYear(), d.getMonth(), 1)), iso(new Date(d.getFullYear(), d.getMonth() + 1, 0))],
    avant: ['Le mois passé', iso(new Date(d.getFullYear(), d.getMonth() - 1, 1)), iso(new Date(d.getFullYear(), d.getMonth(), 0))],
    annee: ['Cette année', d.getFullYear() + '-01-01', d.getFullYear() + '-12-31'],
    tout: ['Depuis le début', '0000-00-00', '9999-12-31']};
  const [, deb, fin] = P[periode];
  const C = tous('cours').filter(c => actif(c) && c.date >= deb && c.date <= fin);
  const donnes = C.filter(c => passe(c) || c.statut === 'absent'), prevus = C.filter(c => !(passe(c) || c.statut === 'absent'));
  const valD = donnes.reduce((s, c) => s + (c.eleves || []).reduce((t, e) => t + valeur(c, e), 0), 0);
  const heures = donnes.reduce((s, c) => s + (c.duree || 60), 0) / 60;
  const encaisse = tous('paiement').filter(p => (p.date || '') >= deb && (p.date || '') <= fin).reduce((s, p) => s + (+p.montant || 0), 0);
  const E = tous('eleve'), B = {}; E.forEach(e => { B[e.id] = bilan(e.id); });
  const doivent = E.filter(e => B[e.id].solde > 0.004).sort((a, b) => B[b.id].solde - B[a.id].solde);
  const totalDu = doivent.reduce((s, e) => s + B[e.id].solde, 0);
  const finissent = E.filter(e => !e.archive && B[e.id].forfaits.length && B[e.id].forfaits.every(x => x.restantes <= 2) && B[e.id].forfaits.slice(-1)[0].faites > 0);
  let h = segCompte() + `<div class="barre"><span class="titre">Période</span><select id="k-per" style="width:auto">${Object.keys(P).map(k => `<option value="${k}"${k === periode ? ' selected' : ''}>${P[k][0]}</option>`).join('')}</select></div>
    <div class="resume"><div><b>${donnes.length}</b><span>leçons données${prevus.length ? ' (+' + prevus.length + ' prévues)' : ''}</span></div><div><b>${String(Math.round(heures * 10) / 10).replace('.', ',')} h</b><span>de cours donnés</span></div>
    <div><b>${euro(valD)}</b><span>valeur des leçons données</span></div><div><b>${euro(encaisse)}</b><span>encaissé (paiements reçus)</span></div></div>
    <div class="btns" style="margin-top:0"><button type="button" class="go" id="k-paie">💶 Encaisser un paiement</button><button type="button" id="k-xl">⬇️ Tout en Excel</button></div>`;
  h += `<h2>Qui doit payer ? <span class="pill ${totalDu ? 'err' : 'ok'}">${totalDu ? euro(totalDu) + ' en tout' : 'personne'}</span></h2>`;
  h += doivent.map(e => { const b = B[e.id]; return `<div class="el" data-el="${e.id}"><div class="av" style="background:${couleurE(e.id)}">${esc(initiales(e.nom))}</div><div class="mid"><b>${esc(e.nom)}</b><span>dû ${euro(b.du)} · payé ${euro(b.paye)}</span></div><div class="droite"><span class="pill err">${euro(b.solde)}</span><button type="button" data-enc="${e.id}" style="padding:5px 10px;font-size:13px">Encaisser</button></div></div>`; }).join('') || '<p class="vide">Tout le monde est à jour 👍</p>';
  if (finissent.length) h += `<h2>Forfaits presque finis</h2><p class="note" style="margin:0">Le moment de proposer un nouveau cycle.</p>` + finissent.map(e => { const x = B[e.id].forfaits.slice(-1)[0]; return `<div class="el" data-el="${e.id}"><div class="av" style="background:${couleurE(e.id)}">${esc(initiales(e.nom))}</div><div class="mid"><b>${esc(e.nom)}</b><span>${esc(x.f.nom)} : ${x.faites}/${x.f.seances} données</span></div><div class="droite"><span class="pill warn">${x.restantes} restante${x.restantes > 1 ? 's' : ''}</span></div></div>`; }).join('');
  h += `<h2>Résumé par élève</h2><div class="defile"><table class="t"><thead><tr><th>Élève</th><th class="n">Données</th><th class="n">Prévues</th><th class="n">Leçons restantes</th><th class="n">Dû</th><th class="n">Payé</th><th class="n">Reste</th></tr></thead><tbody>`;
  E.filter(e => !e.archive || B[e.id].solde).sort((a, b) => a.nom.localeCompare(b.nom, 'fr')).forEach(e => {
    const b = B[e.id], rest = b.forfaits.reduce((s, x) => s + Math.max(0, x.restantes), 0);
    h += `<tr data-el="${e.id}" style="cursor:pointer"><td><b>${esc(e.nom)}</b></td><td class="n">${b.donnes}</td><td class="n">${b.prevus}</td><td class="n">${b.forfaits.length ? rest : '–'}</td><td class="n">${euro(b.du)}</td><td class="n">${euro(b.paye)}</td><td class="n" style="color:${b.solde > 0.004 ? 'var(--err)' : 'var(--ok)'};font-weight:700">${b.solde > 0.004 ? euro(b.solde) : b.solde < -0.004 ? '+' + euro(-b.solde) : '✓'}</td></tr>`;
  });
  h += '</tbody></table></div>';
  const PP = tous('paiement').filter(p => (p.date || '') >= deb && (p.date || '') <= fin).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  h += `<h2>Paiements reçus · ${esc(P[periode][0].toLowerCase())}</h2>` + (PP.map(p => `<div class="el" data-pa="${p.id}" style="padding:8px 12px"><div class="mid"><b>${esc(nomE(p.eleve))} · ${euro(p.montant)}</b><span>${dNum(p.date || A)}${p.mode ? ' · ' + esc(p.mode) : ''}${p.note ? ' · ' + esc(p.note) : ''}</span></div></div>`).join('') || '<p class="note">Aucun.</p>');
  $('vue').innerHTML = h;
  brancherSeg();
  $('k-per').onchange = e => { periode = e.target.value; rendre(); };
  $('k-paie').onclick = () => fPaiement({});
  $('k-xl').onclick = excel;
  $('vue').querySelectorAll('[data-el]').forEach(x => x.onclick = ev => { if (ev.target.closest('[data-enc]')) return; fEleve(x.dataset.el); });
  $('vue').querySelectorAll('[data-enc]').forEach(x => x.onclick = () => fPaiement({eleve: x.dataset.enc}));
  $('vue').querySelectorAll('[data-pa]').forEach(x => x.onclick = () => fPaiement({id: x.dataset.pa}));
}

// ---------- Fichier Excel (.xlsx) fait dans l'appareil, sans internet ----------
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = u => { let c = 0xFFFFFFFF; for (let i = 0; i < u.length; i++) c = CRC[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function zip(fichiers) {
  const enc = new TextEncoder(), parts = [], centre = []; let pos = 0;
  fichiers.forEach(f => {
    const n = enc.encode(f.nom), data = typeof f.data === 'string' ? enc.encode(f.data) : f.data, c = crc32(data);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint32(14, c, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, n.length, true);
    parts.push(h, n, data);
    const g = new DataView(new ArrayBuffer(46));
    g.setUint32(0, 0x02014b50, true); g.setUint16(4, 20, true); g.setUint16(6, 20, true); g.setUint16(8, 0x0800, true); g.setUint32(16, c, true); g.setUint32(20, data.length, true); g.setUint32(24, data.length, true); g.setUint16(28, n.length, true); g.setUint32(42, pos, true);
    centre.push(g, n);
    pos += 30 + n.length + data.length;
  });
  const tc = centre.reduce((s, x) => s + (x.byteLength || x.length), 0), fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true); fin.setUint16(8, fichiers.length, true); fin.setUint16(10, fichiers.length, true); fin.setUint32(12, tc, true); fin.setUint32(16, pos, true);
  return new Blob([...parts, ...centre, fin], {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
function excel() {
  const T = tablesDrive(), noms = Object.keys(T), x = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c])).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
  const col = i => { let s = ''; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
  const feuille = L => {
    const larg = L[0].map((_, j) => Math.min(60, Math.max(10, ...L.map(l => String(l[j] == null ? '' : l[j]).length + 2))));
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>' +
      larg.map((w, j) => `<col min="${j + 1}" max="${j + 1}" width="${w}" customWidth="1"/>`).join('') + '</cols><sheetData>' +
      L.map((l, i) => `<row r="${i + 1}">` + l.map((v, j) => { const r = col(j) + (i + 1), s = i ? '' : ' s="1"'; return typeof v === 'number' ? `<c r="${r}"${s}><v>${v}</v></c>` : `<c r="${r}" t="inlineStr"${s}><is><t xml:space="preserve">${x(v == null ? '' : v)}</t></is></c>`; }).join('') + '</row>').join('') +
      `</sheetData><autoFilter ref="A1:${col(L[0].length - 1)}${L.length}"/></worksheet>`;
  };
  const F = [
    {nom: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' + noms.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('') + '</Types>'},
    {nom: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'},
    {nom: 'xl/workbook.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' + noms.map((n, i) => `<sheet name="${x(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') + '</sheets>' + '<definedNames>' + noms.map((n, i) => `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${x(n)}'!$A$1:$${col(T[n][0].length - 1)}$${T[n].length}</definedName>`).join('') + '</definedNames></workbook>'},
    {nom: 'xl/_rels/workbook.xml.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + noms.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('') + `<Relationship Id="rId${noms.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`},
    {nom: 'xl/styles.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0B6E8F"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'}
  ].concat(noms.map((n, i) => ({nom: `xl/worksheets/sheet${i + 1}.xml`, data: feuille(T[n])})));
  const a = document.createElement('a'); a.href = URL.createObjectURL(zip(F)); a.download = `padel-${auj()}.xlsx`; document.body.appendChild(a); a.click(); a.remove();
  bulle('Fichier Excel téléchargé ✓');
}

// ---------- FAQ : toutes les questions que le prof peut se poser (Réglages › ❓ FAQ) ----------
// Chaque entrée : [question, réponse, chemin]. Le chemin dit où toucher dans l'appli.
const FAQ = [
  ['🚀 Pour commencer', [
    ['Comment mettre l\'appli sur l\'écran de mon téléphone ?', 'Elle s\'installe comme une vraie appli, avec son icône. Sur iPhone, il faut passer par Safari (pas Chrome ni Brave). Sur Android, par Chrome.', 'iPhone : Safari › bouton Partager ⬆️ › « Sur l\'écran d\'accueil ». Android : Chrome › ⋮ › « Installer l\'application ».'],
    ['C\'est quoi le code d\'entrée ?', 'C\'est le code qui protège l\'appli (au départ : jean1000). On ne le demande qu\'une fois par appareil, puis l\'appli reste ouverte.', '⚙️ Réglages › 🔒 Code.'],
    ['Comment changer mon code ?', 'Choisis un nouveau code d\'au moins 4 caractères et tape-le deux fois. Il change aussi sur tes autres appareils reliés au Drive.', '⚙️ Réglages › 🔒 Code › « Changer le code ».'],
    ['Comment verrouiller l\'appli (si je prête mon téléphone) ?', 'L\'appli se ferme et redemande le code.', '⚙️ Réglages › 🔒 Code › « Verrouiller maintenant ».'],
    ['Comment mettre mon prénom en haut de l\'appli ?', 'Ton prénom s\'affiche en haut et signe les messages (retard, page de réservation).', '⚙️ Réglages › Le prof › « Prénom du prof » › Enregistrer.'],
    ['Comment changer les heures de l\'agenda (de 8 h à 22 h) ?', 'Choisis l\'heure du premier et du dernier cours de la journée.', '⚙️ Réglages › Le prof › « Premier cours » et « Dernier cours » › Enregistrer.'],
    ['Comment enregistrer mes clubs / terrains ?', 'Écris un lieu par ligne. Ils te seront proposés à chaque cours (le premier est mis par défaut).', '⚙️ Réglages › Le prof › « Lieux » › Enregistrer.'],
    ['L\'appli marche sans internet ?', 'Oui. Tout est gardé dans le téléphone. Dès que internet revient, tout part tout seul vers ta feuille Google.', 'Le nuage en haut (☁️) montre « hors ligne » puis ✓ quand c\'est envoyé.'],
    ['À quoi servent les 3 onglets du bas ?', '📅 Agenda : tes cours et ton planning. 👥 Élèves : la fiche de chacun (cours, forfaits, paiements, suivi). 📊 Compte : l\'argent (qui doit payer, ce que tu as encaissé) et tes tarifs.', 'Barre tout en bas de l\'écran.']]],
  ['📅 Agenda et cours', [
    ['Comment réserver un terrain ?', 'Le bouton ouvre l\'appli du club Athois Le Padel (Doinsport), où tu réserves avec ton compte comme d\'habitude. Sur Android, l\'appli s\'ouvre directement ; sur iPhone, la page App Store s\'ouvre avec « Ouvrir ». J\'Padel ne réserve rien à ta place.', '📅 Agenda › « 🎾 Réserver un terrain » (en bas), ou un cours › 🎾 Réserver le terrain.'],
    ['Comment ajouter un cours ?', 'Touche directement l\'heure voulue dans l\'agenda (ou le bouton « + Cours »). Choisis « 👥 Cours privé », ajoute 1 à 4 élèves, le jour, l\'heure, la durée. Le prix se met tout seul selon tes tarifs.', '📅 Agenda › touche un créneau vide › 👥 Cours privé › « Ajouter le cours ».'],
    ['Comment ajouter un élève qui n\'est pas encore dans la liste ?', 'Directement depuis le cours : pas besoin de passer par l\'onglet Élèves.', 'Dans le cours › « ➕ Ajouter un élève… » › « ✏️ Nouvel élève » › tape son nom › Ajouter.'],
    ['Comment faire un cours qui revient chaque semaine ?', 'En créant le cours, choisis le nombre de semaines. Chaque séance prend une place du forfait de l\'élève tant qu\'il en reste, sinon le prix à l\'unité.', 'Nouveau cours › « Répéter chaque semaine » › 2 à 20 semaines.'],
    ['Comment voir ma journée, ma semaine ou mon mois ?', 'Change la vue en haut de l\'agenda. Les flèches ◀ ▶ avancent ou reculent, « Aujourd\'hui » revient à aujourd\'hui.', '📅 Agenda › Jour / Semaine / Mois.'],
    ['L\'agenda va jusqu\'à quand ?', 'Il n\'a pas de fin : tu peux avancer aussi loin que tu veux, même dans plusieurs années.', '📅 Agenda › flèche ▶.'],
    ['Comment déplacer un cours ?', 'Sur ordinateur, glisse-le à la souris. Au téléphone : touche le cours, « ↔️ Déplacer », puis touche le nouveau créneau.', '📅 Agenda › touche le cours › ↔️ Déplacer › touche la nouvelle heure.'],
    ['Comment modifier un cours (élèves, heure, prix, lieu) ?', 'Tout se change dans la fenêtre du cours.', '📅 Agenda › touche le cours › ✏️ Modifier › Enregistrer.'],
    ['L\'élève est-il prévenu quand j\'annule ?', 'Juste après « Annuler », un message tout prêt s\'ouvre pour chaque élève du cours : touche WhatsApp, E-mail ou SMS (selon ce que tu as dans sa fiche), puis Envoyer. Rien ne part sans toi. Plus tard : touche le cours › ✉️ Prévenir.', '📅 Agenda › touche le cours › Annuler (gratuit) › 💬 WhatsApp / ✉️ E-mail.'],
    ['Un élève décommande : que faire ?', '« Annuler (gratuit) » : le cours reste dans l\'historique mais n\'est pas compté ni payé, et le créneau redevient libre. Le cours annulé devient une fine bande grise à droite : touche l\'heure à côté pour y mettre un autre cours ou l\'ouvrir à la réservation (🟢 Créneaux). En touchant la bande : « Rétablir le cours » ou « ➕ Nouveau cours à la place ».', '📅 Agenda › touche le cours › « Annuler (gratuit) ».'],
    ['L\'élève n\'est pas venu sans prévenir : je le facture ?', 'Oui si tu veux : « Absent mais facturé » compte le cours comme donné (et payé ou pris sur son forfait). Un message gentil tout prêt s\'ouvre ensuite pour le lui dire (WhatsApp, e-mail ou SMS).', '📅 Agenda › touche le cours › « Absent mais facturé ».'],
    ['Comment supprimer un cours ?', 'Supprimer l\'efface pour de bon. Pour un cours répété, l\'appli demande : seulement celui-ci, ou aussi tous les suivants. Pour un cours décommandé, préfère « Annuler ».', '📅 Agenda › touche le cours › Supprimer.'],
    ['Et si je mets deux cours en même temps ?', 'L\'appli te prévient (⚠️ Déjà un cours à ce moment-là) et te demande si tu veux quand même.', 'Automatique.'],
    ['Comment envoyer un rappel à l\'élève ?', 'Un message tout prêt (jour, heure, lieu) s\'ouvre dans WhatsApp. S\'il y a plusieurs élèves, le message est copié pour le coller dans votre groupe.', '📅 Agenda › touche le cours › 💬 Rappel.'],
    ['Je vais être en retard : comment prévenir ?', 'Choisis combien de minutes : un message WhatsApp tout prêt pour chaque élève du cours.', '📅 Agenda › touche le cours › ⏰ Retard › 5 à 45 min › « Envoyer à … ».'],
    ['Comment noter ce qu\'on a travaillé pendant le cours ?', 'Fais le compte rendu : tu peux le dicter à voix haute (🎤). En groupe, tu peux ajouter une note pour un seul élève. On le retrouve dans sa fiche (📝 Suivi des cours) et dans son relevé PDF.', '📅 Agenda › touche le cours › 🎤 Faire le compte rendu › 🎤 Dicter › Enregistrer.'],
    ['Les couleurs dans l\'agenda, ça veut dire quoi ?', 'Chaque élève a sa couleur. En vert pointillé : les créneaux ouverts sur ta page de réservation. 📩 : une demande en attente. 🎓 : l\'académie. 📌 : tes autres occupations.', '📅 Agenda.']]],
  ['🎓 Académie et autres occupations', [
    ['Comment mettre l\'académie de padel dans mon agenda ?', 'Touche l\'heure de début, puis choisis « 🎓 Académie ». Donne-lui un nom (ex. groupe des 10-12 ans), la durée, et pour combien de semaines la répéter (jusqu\'à 40, toute une saison).', '📅 Agenda › touche un créneau › 🎓 Académie › « Répéter chaque semaine » › Ajouter.'],
    ['Comment ajouter un rendez-vous ou autre chose (pas un cours) ?', 'Choisis « 📌 Autre » et écris ce que tu veux (dentiste, réunion, match…). Il peut aussi se répéter chaque semaine.', '📅 Agenda › touche un créneau › 📌 Autre › tape le nom › Ajouter.'],
    ['Changer l\'heure de l\'académie pour toutes les semaines ?', 'Modifie une séance : l\'appli te demande si tu veux changer aussi toutes les suivantes.', '📅 Agenda › touche l\'académie › change l\'heure › Enregistrer › OK pour la suite.'],
    ['L\'académie n\'a pas lieu une semaine (congé) : que faire ?', 'Supprime seulement cette séance, les autres restent.', '📅 Agenda › touche la séance › Supprimer.'],
    ['Arrêter l\'académie pour toute la fin de saison ?', '« Supprimer la série » enlève cette séance et toutes les suivantes.', '📅 Agenda › touche la séance › « Supprimer la série ».'],
    ['Mes élèves voient-ils mes rendez-vous ?', 'Non. Sur ta page de réservation, ces moments apparaissent seulement « pas disponible », sans aucun nom ni détail.', 'Automatique.']]],
  ['👥 Élèves', [
    ['Comment ajouter un élève ?', 'Nom, téléphone, e-mail, niveau et une note. Tu peux aussi l\'ajouter directement en créant un cours.', '👥 Élèves › « + Élève » › Enregistrer.'],
    ['Comment ajouter ou changer son téléphone ?', 'Le téléphone sert aux messages WhatsApp (rappel, retard, réponse).', '👥 Élèves › touche l\'élève › ✏️ (à côté du nom) › Téléphone › Enregistrer.'],
    ['Comment noter son niveau ?', 'Choisis parmi Débutant, 50, 100, 200, 300, 400, 500, 700 ou 1000.', '👥 Élèves › touche l\'élève › ✏️ › Niveau.'],
    ['Comment retrouver vite un élève ?', 'Tape une partie du nom ou du numéro de téléphone.', '👥 Élèves › 🔎 Chercher un élève.'],
    ['Qu\'est-ce que je vois dans la fiche d\'un élève ?', 'Ses prochains cours, ses forfaits (séances restantes), ses paiements, ce qu\'il doit encore et le suivi de ses cours.', '👥 Élèves › touche l\'élève.'],
    ['« Encore 3 dates à planifier », ça veut dire quoi ?', 'L\'élève a un forfait dont certaines séances ne sont pas encore mises dans l\'agenda.', '👥 Élèves › la petite étiquette à droite du nom.'],
    ['Un élève arrête : je le supprime ?', 'Mieux vaut le ranger dans les anciens élèves : son historique (cours, paiements) est gardé et il ne gêne plus la liste.', '👥 Élèves › touche l\'élève › « Ranger dans les anciens élèves ».'],
    ['Comment envoyer à un élève le relevé de ses cours ?', 'Un PDF avec ses cours, forfaits, paiements (et le suivi si tu veux). Tu peux le voir, le télécharger ou l\'envoyer.', '👥 Élèves › touche l\'élève › 📄 Relevé PDF › 📤 Envoyer le PDF.'],
    ['Deux élèves ont le même numéro (un parent et son enfant) ?', 'Pas de souci : chaque élève a sa fiche. Quand une demande arrive, l\'appli cherche d\'abord par le nom et te demande si seul le numéro correspond.', 'Automatique.']]],
  ['💶 Forfaits, paiements et tarifs', [
    ['Comment vendre un forfait (un cycle de séances) ?', 'Choisis le nombre de personnes et de séances : le prix se calcule tout seul avec tes tarifs. Les cours suivants de l\'élève sont pris dedans automatiquement.', '👥 Élèves › touche l\'élève › « + Forfait ».'],
    ['Un forfait à la carte (12 séances, prix d\'ami…) ?', 'Dans la vente du forfait, change le nombre de séances ou le prix demandé.', '👥 Élèves › touche l\'élève › « + Forfait » › change séances ou prix.'],
    ['L\'élève a déjà fait une séance d\'essai payée à part : je peux la mettre dans le forfait ?', 'Oui : en vendant le forfait, l\'appli propose d\'y mettre les leçons déjà données à l\'unité.', '👥 Élèves › touche l\'élève › « + Forfait ».'],
    ['Combien de séances lui reste-t-il ?', 'C\'est écrit dans sa fiche, sur chaque forfait. Le résumé par élève le montre aussi.', '👥 Élèves › touche l\'élève › Forfaits. Ou 📊 Compte › Résumé par élève.'],
    ['Comment noter qu\'un élève m\'a payé ?', 'Montant, date et moyen de paiement (Cash, Virement, Payconiq, Bancontact).', '👥 Élèves › touche l\'élève › 💶 Paiement. Ou 📊 Compte › « 💶 Encaisser un paiement ».'],
    ['Comment corriger ou effacer un paiement ?', 'Touche le paiement dans la liste pour le modifier ou le supprimer.', '📊 Compte › Paiements reçus › touche le paiement.'],
    ['Qui me doit encore de l\'argent ?', 'La liste « Qui doit payer ? » avec le montant de chacun, et un bouton « Encaisser » à côté.', '📊 Compte › Qui doit payer ?'],
    ['Combien j\'ai gagné ce mois-ci ?', 'Choisis la période (semaine, mois, mois passé, année, depuis le début) : leçons données, heures, valeur des leçons et argent encaissé.', '📊 Compte › Période.'],
    ['Quand proposer un nouveau cycle à un élève ?', 'L\'appli le montre quand il reste 2 séances ou moins : « Forfaits presque finis ».', '📊 Compte › Forfaits presque finis.'],
    ['Un cours offert ?', 'Dans le cours, mets le prix de l\'élève sur « Offert ».', 'Dans le cours › Prix pour chaque élève › Offert.'],
    ['Comment changer mes tarifs ?', 'Touche une formule (seul, à 2, à 3, à 4) pour changer le prix d\'une séance et du cycle. Les cours déjà enregistrés gardent leur prix.', '📊 Compte › 💶 Tarifs › touche la formule › Enregistrer.'],
    ['Quelqu\'un me demande un prix : comment calculer vite ?', 'Choisis combien ils sont et combien de séances : le prix s\'affiche, avec un message tout prêt à copier.', '📊 Compte › 💶 Tarifs › calculateur › 💬 Copier le message.']]],
  ['🌐 Page de réservation', [
    ['C\'est quoi la page de réservation ?', 'Une page internet pour tes élèves et futurs élèves : ils voient les créneaux que tu as ouverts, tes tarifs, et t\'envoient une demande de cours. Ils ne voient jamais le nom des autres.', '⚙️ Réglages › 🌐 Page de réservation › « Voir la page ».'],
    ['Comment ouvrir mes créneaux libres ?', 'Passe en mode créneaux, puis touche les heures où tu es d\'accord de donner cours : elles deviennent vertes (ouvertes). Touche encore pour fermer. « Terminé » pour finir.', '📅 Agenda › 🟢 Créneaux › touche les heures › Terminé.'],
    ['Ouvrir plusieurs heures d\'un coup ?', 'Coche les jours, choisis la plage d\'heures (ex. de 9 h à 12 h) et pendant combien de semaines (1 à 8). « Fermer ces heures » fait l\'inverse.', '📅 Agenda › 🟢 Créneaux › « Ouvrir plusieurs heures… ».'],
    ['Remettre les mêmes créneaux que la semaine passée ?', 'Copie en un geste les créneaux de la semaine d\'avant.', '📅 Agenda › 🟢 Créneaux › « Copier la semaine d\'avant ».'],
    ['Fermer tous les créneaux de la semaine ?', '', '📅 Agenda › 🟢 Créneaux › « Tout fermer ».'],
    ['Un créneau ouvert où j\'ai déjà un cours ?', 'Il s\'affiche « pas disponible » sur la page : cours, académie, rendez-vous et demandes en attente bloquent toujours le créneau.', 'Automatique.'],
    ['Comment envoyer ma page à quelqu\'un ?', 'Tout en bas de l\'agenda : choisis un élève, ou tape un numéro ou un e-mail (même quelqu\'un qui n\'est pas dans tes contacts), puis WhatsApp, SMS ou e-mail.', '📅 Agenda › tout en bas › « 🔗 Envoyer ma page de réservation ».'],
    ['Comment copier le lien de ma page (pour Instagram, Facebook…) ?', '', '⚙️ Réglages › 🌐 Page de réservation › « 📋 Copier le lien » ou « 💬 Partager sur WhatsApp ».'],
    ['Où arrivent les demandes de cours ?', 'Dans l\'appli (le bouton 📩 en haut avec le nombre de demandes, et 📩 dans l\'agenda) et par e-mail.', 'Bouton 📩 en haut de l\'écran.'],
    ['Comment accepter une demande ?', 'Le cours se met dans ton agenda (et l\'élève est créé s\'il est nouveau). S\'il a demandé un forfait, le forfait est créé et ce 1er cours compte dedans. Ensuite, l\'appli te propose de lui répondre.', '📩 › touche la demande › ✅ Accepter › Ajouter le cours › 💬 WhatsApp ou e-mail.'],
    ['Comment refuser une demande ?', 'Le créneau redevient libre. L\'appli te propose un message tout prêt, avec le lien pour qu\'il choisisse un autre créneau.', '📩 › touche la demande › ❌ Refuser.'],
    ['Comment être prévenu sur mon téléphone ?', 'Autorise les alertes : une notification à chaque nouvelle demande (quand l\'appli est ouverte). Tu reçois aussi un e-mail.', '⚙️ Réglages › 🌐 Page de réservation › « 🔔 Me prévenir sur cet appareil ».'],
    ['Éviter les demandes à la dernière minute ?', 'Choisis le délai minimum : tout de suite, 2 h, 6 h, 12 h, la veille ou 2 jours avant.', '⚙️ Réglages › 🌐 Page de réservation › « Au plus tôt » › Enregistrer.'],
    ['Combien de semaines à l\'avance on peut réserver ?', 'De 2 à 12 semaines (5 au départ).', '⚙️ Réglages › 🌐 Page de réservation › « Visible jusqu\'à » › Enregistrer.'],
    ['Des cours d\'1h30 sur la page ?', '', '⚙️ Réglages › 🌐 Page de réservation › « Durée d\'un cours » › 1h30 › Enregistrer.'],
    ['Je pars en vacances : comment arrêter les demandes ?', 'Coche « Fermer la page pour le moment » : la page reste visible mais plus personne ne peut demander. Décoche au retour.', '⚙️ Réglages › 🌐 Page de réservation › « Fermer la page » › Enregistrer.'],
    ['Mettre un petit mot en haut de la page ?', 'Ex. « Cours en heures creuses au club, tous niveaux ».', '⚙️ Réglages › 🌐 Page de réservation › « Petit mot en haut de la page ».']]],
  ['🔁 Forfait de 10, liste d\'attente et reprise', [
    ['Un élève prend un forfait de 10 sur la page : comment il choisit ses séances ?', 'Il touche son premier créneau : la page lui propose tout de suite les mêmes jour et heure les semaines suivantes, si tu les as ouverts et qu\'ils sont libres. S\'il en manque, la page le dit et il ajoute d\'autres créneaux au choix. Il peut aussi en retirer (✕).', 'Page de réservation › créneau › formule de 10.'],
    ['Et quand j\'accepte cette demande ?', 'Les 10 cours se mettent dans ton agenda d\'un coup, avec le forfait. Le message de réponse liste toutes ses séances.', 'Bouton 📩 › la demande › Accepter.'],
    ['C\'est quoi « 🔔 m\'avertir » sur un créneau pris ?', 'C\'est la liste d\'attente : un élève peut se mettre en option sur un créneau déjà pris. Tu vois 🔔 sur le cours dans l\'agenda.', 'Page de réservation › créneau « pas disponible ».'],
    ['Un cours est annulé : comment proposer la place ?', 'Après « Annuler », l\'appli montre la liste d\'attente de ce créneau. Choisis la personne : un message tout prêt part (WhatsApp, e-mail ou SMS) « le créneau s\'est libéré, ça t\'intéresse ? ». S\'il dit oui : « ✅ C\'est pour lui » crée le cours.', '📅 Agenda › le cours › 🔔 Attente, ou bouton 📩 › Listes d\'attente.'],
    ['Comment reprendre mes élèves actuels dans l\'appli ?', 'Envoie-leur le formulaire de reprise : chacun indique son forfait, ses séances faites, ce qu\'il a payé et ses prochains créneaux. Les réponses arrivent dans l\'appli et dans l\'onglet « Reprise » de ta feuille. Deux élèves sur le même créneau sont signalés ⚠.', '👥 Élèves › 📋 Reprise › « Envoyer sur WhatsApp ».'],
    ['Les élèves dont je suis sûr, je dois leur envoyer aussi ?', 'Non : remplis leur fiche toi-même, élève après élève (« Élève suivant » après chaque fiche). Elles arrivent au même endroit, avec la mention « rempli par toi ».', '👥 Élèves › 📋 Reprise › « ✏️ Remplir moi-même pour un élève ».'],
    ['Comment mettre une réponse de reprise dans l\'appli ?', 'Importer crée l\'élève, son forfait avec les séances déjà faites, le paiement reçu et ses prochains cours. « Tout importer » le fait pour toutes les réponses d\'un coup.', '👥 Élèves › 📋 Reprise › l\'élève › Importer.']]],
  ['☁️ Sauvegarde et appareils', [
    ['Où sont gardées mes données ?', 'Dans ton téléphone, et copiées dans ta feuille Google (sur ton Drive) : onglets Résumé, Agenda, Paiements, Forfaits, Élèves, Tarifs, Demandes. Toi seul y as accès.', '⚙️ Réglages › ☁️ Sauvegarde sur Google Drive.'],
    ['Le nuage ☁️ en haut, il veut dire quoi ?', '✓ : tout est copié sur le Drive. « … » : envoi en cours. « hors ligne » : pas d\'internet, ça partira plus tard. En rouge (non relié, erreur, mot de passe ?) : touche-le pour régler.', 'Le nuage ☁️ en haut de l\'écran.'],
    ['Utiliser l\'appli sur mon téléphone ET mon ordinateur ?', 'Ouvre l\'appli sur l\'autre appareil et entre ton code : elle se relie toute seule à ta feuille Google et récupère tout. Ce que tu changes d\'un côté arrive de l\'autre.', 'Même adresse, même code.'],
    ['Je change de téléphone : je perds tout ?', 'Non. Installe l\'appli sur le nouveau, entre ton code : tout revient depuis ton Drive.', 'Nouveau téléphone › ouvrir l\'appli › code.'],
    ['Avoir tout dans un fichier Excel ?', 'Un fichier Excel est fait dans ton téléphone, avec un onglet par sujet.', '⚙️ Réglages › Fichiers › « ⬇️ Tout en Excel ». Ou 📊 Compte › ⬇️ Tout en Excel.'],
    ['Faire une sauvegarde dans un fichier ?', 'Un fichier à garder (sur ton ordi, une clé, un mail). « Restaurer » remet les données de ce fichier sans écraser ce qui est plus récent.', '⚙️ Réglages › Fichiers › « 💾 Sauvegarde (fichier) » / « Restaurer ».'],
    ['J\'ai supprimé quelque chose par erreur ?', 'Si tu as une sauvegarde (fichier), « Restaurer » la remet. Pour un cours décommandé, utilise plutôt « Annuler » qui le garde.', '⚙️ Réglages › Fichiers › Restaurer.'],
    ['Comment avoir la dernière version de l\'appli ?', 'Elle se met à jour toute seule. Si une nouveauté n\'apparaît pas, ferme complètement l\'appli et rouvre-la (deux fois si besoin).', 'Fermer l\'appli › la rouvrir.']]],
  ['🛠️ Petits soucis', [
    ['La dictée 🎤 ne marche pas ?', 'Elle demande l\'accès au micro la première fois : accepte. Sinon, utilise le micro 🎤 du clavier du téléphone pour dicter dans la case.', 'Compte rendu › 🎤 Dicter, ou le micro du clavier.'],
    ['WhatsApp ne s\'ouvre pas sur le bon numéro ?', 'Vérifie le numéro dans la fiche de l\'élève, avec l\'indicatif si c\'est un numéro étranger (ex. +33 pour la France).', '👥 Élèves › touche l\'élève › ✏️ › Téléphone.'],
    ['Un élève dit qu\'il ne voit pas de créneau sur la page ?', 'Vérifie que tu as bien ouvert des créneaux (en vert) dans les semaines visibles, et que la page n\'est pas fermée.', '📅 Agenda › 🟢 Créneaux, et ⚙️ Réglages › 🌐 Page de réservation.'],
    ['Je ne reçois pas d\'e-mail pour les demandes ?', 'Regarde dans les spams. Les demandes arrivent de toute façon dans l\'appli (📩).', 'Bouton 📩 en haut.']]]
];
function fFaq(q) {
  q = q || '';
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const mots = norm(q).split(/\s+/).filter(m => m.length > 1);
  const ok = e => !mots.length || mots.every(m => norm(e.join(' ')).includes(m));
  let n = 0;
  const corps = FAQ.map(([titre, L]) => {
    const T = L.filter(ok); n += T.length; if (!T.length) return '';
    return `<h3>${titre}</h3>` + T.map(([qq, r, ch]) => `<details class="faq"${mots.length ? ' open' : ''}><summary>${esc(qq)}</summary>${r ? `<p>${esc(r)}</p>` : ''}<p class="chemin">👉 ${esc(ch)}</p></details>`).join('');
  }).join('');
  ouvrir(tete('❓ Questions fréquentes') + `<input id="fq-q" placeholder="🔎 Chercher (ex. forfait, retard, académie)" value="${esc(q)}" autocomplete="off">
    <div id="fq-l">${corps || '<p class="vide">Rien trouvé. Essaie un autre mot.</p>'}</div>
    <div class="btns"><a class="bouton" href="presentation.pdf" target="_blank" rel="noopener">📄 PDF de présentation</a><button type="button" id="fq-ret">‹ Retour aux réglages</button></div>`, f => {
    const i = f.querySelector('#fq-q');
    let t; i.oninput = () => { clearTimeout(t); t = setTimeout(() => { fFaq(i.value); const j = $('fq-q'); j.focus(); j.setSelectionRange(j.value.length, j.value.length); }, 250); };
    f.querySelector('#fq-ret').onclick = fReglages;
  });
}

// ---------- Réglages ----------
const empreinte = async t => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(t).trim().toLowerCase())))].map(b => b.toString(16).padStart(2, '0')).join('');

function fReglages() {
  const R = reg(), c = Sync.cfg(), ok = Sync.relie(), dern = +lsGet('padel:derniere') || 0;
  ouvrir(tete('⚙️ Réglages') + `
    <div class="aide-haut"><button type="button" class="go" id="r-faq">❓ FAQ</button><a class="bouton" href="presentation.pdf" target="_blank" rel="noopener">📄 PDF de présentation</a></div>
    <h3>Le prof</h3><label class="l">Prénom du prof (affiché en haut)</label><input id="r-prof" value="${esc(R.prof || '')}" placeholder="Ex. Jean">
    <div class="ligne"><div><label class="l">Premier cours</label><select id="r-deb">${Array.from({length: 10}, (_, i) => i + 6).map(n => `<option value="${n}"${n === R.debut ? ' selected' : ''}>${n}h</option>`).join('')}</select></div>
    <div><label class="l">Dernier cours</label><select id="r-fin">${Array.from({length: 7}, (_, i) => i + 17).map(n => `<option value="${n}"${n === R.fin ? ' selected' : ''}>${n}h</option>`).join('')}</select></div></div>
    <label class="l">Lieux (un par ligne)</label><textarea id="r-lieux" placeholder="Club de padel…">${esc((R.lieux || []).join('\n'))}</textarea>
    <div class="btns"><button type="button" class="go" id="r-ok">Enregistrer</button></div>
    <h3>🌐 Page de réservation ${R.resaFerme ? '<span class="pill">fermée</span>' : '<span class="pill ok">ouverte</span>'}</h3>
    <p class="note" style="margin:0">Une page internet à donner aux élèves et futurs élèves : ils voient les créneaux que tu as ouverts (Agenda › 🟢 Créneaux), sans les noms de personne, et t'envoient une demande. Elle arrive ici (📩) et par e-mail.</p>
    <div class="btns"><button type="button" class="go" id="r-lien">📋 Copier le lien</button><a class="bouton" id="r-wa-lien" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent('Pour réserver un cours de padel avec moi, choisis un créneau ici : ' + lienResa())}">💬 Partager sur WhatsApp</a><a class="bouton" href="${esc(lienResa())}" target="_blank" rel="noopener">Voir la page</a>
      ${'Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied' ? '<button type="button" id="r-notif">🔔 Me prévenir sur cet appareil</button>' : ''}</div>
    <div class="ligne"><div><label class="l">Durée d'un cours</label><select id="r-rdur">${[[60, '1h'], [90, '1h30']].map(([v, t]) => `<option value="${v}"${dureeResa() === v ? ' selected' : ''}>${t}</option>`).join('')}</select></div>
      <div><label class="l">Au plus tôt</label><select id="r-rdel">${[[0, 'tout de suite'], [2, '2 h avant'], [6, '6 h avant'], [12, '12 h avant'], [24, 'la veille (24 h)'], [48, '2 jours avant']].map(([v, t]) => `<option value="${v}"${(R.resaDelai == null ? 12 : +R.resaDelai) === v ? ' selected' : ''}>${t}</option>`).join('')}</select></div>
      <div><label class="l">Visible jusqu'à</label><select id="r-rsem">${[2, 3, 4, 5, 6, 8, 10, 12].map(n => `<option value="${n}"${(+R.resaSemaines || 5) === n ? ' selected' : ''}>${n} semaines</option>`).join('')}</select></div></div>
    <label class="l">Petit mot en haut de la page (facultatif)</label><input id="r-rtxt" value="${esc(R.resaTexte || '')}" placeholder="Ex. Cours en heures creuses au club, tous niveaux">
    <label class="check"><input type="checkbox" id="r-rferme" ${R.resaFerme ? 'checked' : ''}> Fermer la page pour le moment (plus aucune demande)</label>
    <div class="btns"><button type="button" class="go" id="r-rok">Enregistrer</button></div>
    <h3>☁️ Sauvegarde sur Google Drive ${ok ? '<span class="pill ok">reliée</span>' : '<span class="pill">non reliée</span>'}</h3>
    ${ok ? `<p class="note" style="margin:0">✅ Tout est copié dans la feuille Google${dern ? ' (dernier envoi ' + new Date(dern).toLocaleString('fr-BE', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'}) + ')' : ''} : onglets Résumé, Agenda, Paiements, Forfaits, Élèves et Tarifs, téléchargeables en Excel (Fichier › Télécharger › Microsoft Excel).</p>` : '<p class="note" style="margin:0">Chaque élève, cours et paiement est copié dans une feuille Google du Drive, bien rangée en onglets. Si l\'appli a un souci, tout est là, lisible et téléchargeable en Excel.</p>'}
    <details ${ok ? '' : 'open'} style="margin-top:8px"><summary class="note">${ok ? 'Modifier' : 'Relier cet appareil'}</summary>
      <label class="l">Adresse du script</label><input id="r-url" value="${esc(c.url || SCRIPT)}" placeholder="https://script.google.com/macros/s/…/exec" autocapitalize="off" spellcheck="false">
      <label class="l">Mot de passe (ligne CLE du script)</label><input id="r-cle" value="${esc(c.cle || 'jean1000')}" autocapitalize="off" spellcheck="false" autocomplete="off">
      <div class="btns"><button type="button" class="go" id="r-relier">Relier</button>${ok ? '<button type="button" id="r-delier">Délier</button><button type="button" id="r-env">Tout renvoyer</button>' : ''}</div><p class="note" id="r-etat"></p>
      <details><summary class="note">Première fois : créer la feuille Google</summary><ol class="note">
        <li>Sur l'ordinateur, ouvre <a href="https://sheets.new" target="_blank" rel="noopener">sheets.new</a> et nomme la feuille « Padel ».</li>
        <li>Menu <b>Extensions › Apps Script</b>. Efface tout et colle <a href="google/" target="_blank">ce script</a> (bouton « Copier »). 💾 Enregistrer.</li>
        <li><b>Déployer › Nouveau déploiement</b> › roue dentée › <b>Application Web</b>. Exécuter en tant que : <b>Moi</b>. Qui a accès : <b>Tout le monde</b>. Déployer et autoriser.</li>
        <li>Copie l'adresse qui finit par <code>/exec</code>, colle-la ici avec le mot de passe de la ligne <code>CLE</code>.</li></ol></details>
    </details>
    <h3>Fichiers</h3><div class="btns" style="margin-top:0"><button type="button" id="r-xl">⬇️ Tout en Excel</button><button type="button" id="r-json">💾 Sauvegarde (fichier)</button><button type="button" id="r-rest">Restaurer</button><input type="file" id="r-fich" accept=".json,application/json" hidden></div>
    <h3>🔒 Code</h3><div class="btns" style="margin-top:0"><button type="button" id="r-lock">Verrouiller maintenant</button><button type="button" id="r-code">Changer le code</button></div>
    <h3>📲 Installer l'appli</h3><p class="note" style="margin:0">iPhone : ouvre cette page dans <b>Safari</b> › Partager › « Sur l'écran d'accueil ». Android : Chrome › ⋮ › « Installer l'application ».</p>`, f => {
    f.querySelector('#r-faq').onclick = () => fFaq();
    f.querySelector('#r-lien').onclick = async () => { try { await navigator.clipboard.writeText(lienResa()); bulle('Lien copié ✓'); } catch (e) { prompt('Copie ce lien :', lienResa()); } };
    if (f.querySelector('#r-notif')) f.querySelector('#r-notif').onclick = async () => { try { const p = await Notification.requestPermission(); bulle(p === 'granted' ? 'C\'est noté : une alerte à chaque nouvelle demande (appli ouverte) ✓' : 'Alertes refusées'); } catch (e) {} fReglages(); };
    f.querySelector('#r-rok').onclick = () => {
      R.resaDuree = +f.querySelector('#r-rdur').value; R.resaDelai = +f.querySelector('#r-rdel').value; R.resaSemaines = +f.querySelector('#r-rsem').value;
      R.resaTexte = f.querySelector('#r-rtxt').value.trim(); R.resaFerme = f.querySelector('#r-rferme').checked; put(R); fermer(); rendre(); bulle('Page de réservation enregistrée ✓');
    };
    f.querySelector('#r-ok').onclick = () => {
      R.prof = f.querySelector('#r-prof').value.trim(); R.debut = +f.querySelector('#r-deb').value; R.fin = Math.max(R.debut + 1, +f.querySelector('#r-fin').value);
      R.lieux = f.querySelector('#r-lieux').value.split('\n').map(s => s.trim()).filter(Boolean); put(R); fermer(); rendre(); bulle('Réglages enregistrés ✓');
    };
    const et = t => { f.querySelector('#r-etat').textContent = t; };
    f.querySelector('#r-relier').onclick = async () => {
      const n = {url: f.querySelector('#r-url').value.trim(), cle: f.querySelector('#r-cle').value.trim()};
      if (!/^https:\/\/script\.google(usercontent)?\.com\/.+/.test(n.url)) { et('Colle l\'adresse complète du script (elle commence par https://script.google.com).'); return; }
      if (!n.cle) { et('Il manque le mot de passe.'); return; }
      et('Vérification…');
      try { await Sync.tester(n); try { localStorage.removeItem('padel:delie'); } catch (e) {} Sync.regler(n); et('C\'est relié ✓'); setTimeout(fReglages, 900); }
      catch (e) { et(/mot de passe/.test(e.message) ? 'Mot de passe incorrect (celui de la ligne CLE du script).' : /module/.test(e.message) ? 'Ce n\'est pas le script du Padel : colle celui de cette appli.' : 'Le script ne répond pas. Vérifie l\'adresse et l\'accès « Tout le monde ».'); }
    };
    if (f.querySelector('#r-delier')) f.querySelector('#r-delier').onclick = () => { if (confirm('Délier cet appareil ? Ses données restent dessus.')) { lsSet('padel:delie', '1'); Sync.regler({}); fReglages(); } };
    if (f.querySelector('#r-env')) f.querySelector('#r-env').onclick = () => { Sync.neuf(); Sync.cycle(); bulle('Tout est renvoyé au Drive'); };
    f.querySelector('#r-xl').onclick = excel;
    f.querySelector('#r-json').onclick = () => {
      const blob = new Blob([JSON.stringify({appli: 'padel', date: Date.now(), donnees: D}, null, 1)], {type: 'application/json'});
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `padel-sauvegarde-${auj()}.json`; document.body.appendChild(a); a.click(); a.remove();
    };
    f.querySelector('#r-rest').onclick = () => f.querySelector('#r-fich').click();
    f.querySelector('#r-fich').onchange = async e => {
      const fi = e.target.files[0]; if (!fi) return;
      try {
        const o = JSON.parse(await fi.text()); if (o.appli !== 'padel' || !o.donnees) throw new Error();
        if (!confirm('Remettre les données de ce fichier ? Ce qui est plus récent dans l\'appli est gardé.')) return;
        let n = 0; Object.values(o.donnees).forEach(r => { if (r && r.id && (!D[r.id] || (+r.t || 0) > (+D[r.id].t || 0))) { D[r.id] = r; Sync.sale(r.id); n++; } });
        sauver(); rendre(); bulle(n + ' éléments remis ✓');
      } catch (err) { alert('Ce fichier n\'est pas une sauvegarde du Padel.'); }
    };
    f.querySelector('#r-lock').onclick = () => { try { localStorage.removeItem(KO); } catch (e) {} fermer(); verrou(); };
    f.querySelector('#r-code').onclick = async () => {
      const a = prompt('Nouveau code (au moins 4 caractères) :'); if (!a) return;
      if (a.trim().length < 4) { alert('Trop court.'); return; }
      if (prompt('Retape le nouveau code :') !== a) { alert('Les deux codes ne sont pas pareils.'); return; }
      const hh = await empreinte(a); D.reglages.code = hh; put(D.reglages); lsSet(KO, hh); bulle('Code changé ✓ (sur tous les appareils reliés)');
    };
  });
}
$('b-reg').onclick = fReglages;
$('b-dem').onclick = () => { const n = demandesAtt(); n.length === 1 ? fDemande(n[0].id) : fDemandes(); };
$('nuage').onclick = fReglages;
Sync.surStatut(s => {
  const t = {off: ['☁️ non relié', 'err'], sync: ['☁️ …', ''], ok: ['☁️ ✓', ''], horsligne: ['☁️ hors ligne', ''], erreur: ['☁️ erreur', 'err'], cle: ['☁️ mot de passe ?', 'err']}[s] || ['☁️', ''];
  $('nuage').textContent = t[0]; $('nuage').className = t[1];
});

// ---------- Verrou par code ----------
// Code de départ « jean1000 » (seule son empreinte SHA-256 est ici). Changeable dans Réglages : la nouvelle
// empreinte est rangée avec les réglages, donc elle suit sur les appareils reliés à la même feuille.
const CODE_DEPART = 'e996454dd7d6d3d3c8bf20258e775189a3a12db900f97c5702085bd0a9591eb9';
const codeAttendu = () => reg().code || CODE_DEPART;
function verrou() { $('verrou').hidden = false; $('v-code').value = ''; $('v-err').textContent = ''; setTimeout(() => $('v-code').focus(), 60); }
$('v-form').onsubmit = async e => {
  e.preventDefault();
  const h = await empreinte($('v-code').value);
  if (h !== codeAttendu()) { $('v-err').textContent = 'Ce n\'est pas le bon code.'; $('v-code').select(); return; }
  lsSet(KO, h); $('verrou').hidden = true; relierAuto(); rendre(); Sync.cycle();
};

// Relié tout seul à la feuille de Kevin (sauf si on a délié cet appareil exprès)
const relierAuto = () => { if (!Sync.relie() && !lsGet('padel:delie')) lsSet(KC, JSON.stringify({url: SCRIPT, cle: 'jean1000'})); };
// ---------- Démarrage ----------
const majHaut = () => document.documentElement.style.setProperty('--haut', document.querySelector('header.haut').offsetHeight + 'px');
majHaut(); addEventListener('resize', majHaut);
if (DANS_HAPPINESS) { $('retour').hidden = false; $('retour').title = 'Retour à Happiness'; }
if (lsGet(KO) !== codeAttendu()) verrou(); else { relierAuto(); setTimeout(() => Sync.cycle(), 50); }
rendre();
if (!lsGet('padel:dmvues')) nouvellesDemandes();
// Hors de Happiness (appli seule), elle a sa propre mise en cache pour marcher sans internet
if ('serviceWorker' in navigator && !DANS_HAPPINESS && navigator.onLine) {
  const deja = !!navigator.serviceWorker.controller; let fait = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (deja && !fait) { fait = true; location.reload(); } });
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
// Toutes les minutes : la ligne rouge « maintenant » et les cours qui passent de « prévu » à « donné »
setInterval(() => { if (document.visibilityState === 'visible' && $('fond').hidden && !glisse.on) rendre(); }, 60000);
})();
