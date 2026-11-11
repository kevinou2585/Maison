/**
 * Padel : sauvegarde de l'appli (élèves, cours, forfaits, paiements) dans une feuille Google.
 *
 * Installation (une seule fois, sur l'ordinateur) :
 * 1. Crée une feuille Google vide sur ton Drive (sheets.new), nomme-la « Padel ».
 * 2. Menu Extensions > Apps Script. Efface tout et colle ce fichier.
 * 3. Ligne CLE : laisse 'jean1000' ou mets ton propre mot de passe, puis 💾 Enregistrer.
 * 4. Déployer > Nouveau déploiement > type « Application Web » :
 *      Exécuter en tant que : Moi ; Qui a accès : Tout le monde. Autorise l'accès.
 * 5. Copie l'adresse qui finit par /exec et colle-la dans l'appli (⚙️ Réglages > Sauvegarde sur Google Drive).
 *
 * Mise à jour du script (nouvelle version collée) : Déployer > Gérer les déploiements > ✏️ > Version : « Nouvelle version »
 * > Déployer. L'adresse /exec ne change pas. Google redemande l'autorisation (envoi d'e-mails) : accepte.
 *
 * Page de réservation : la page publique de l'appli (padel/reserver/) lit ici les créneaux que le prof a
 * ouverts dans l'appli et s'ils sont déjà pris (jamais les noms), et envoie les demandes de cours. Une demande arrive dans l'appli du prof (📩) et,
 * si PREVENIR vaut true, un e-mail part vers l'adresse Gmail du propriétaire de cette feuille.
 *
 * L'onglet caché « _donnees » sert à la synchronisation : ne le modifie pas.
 * Les onglets Résumé, Agenda, Paiements, Forfaits, Élèves et Tarifs sont réécrits par l'appli à chaque
 * changement : c'est la copie lisible, téléchargeable en Excel (Fichier > Télécharger > Microsoft Excel).
 */
const CLE = 'jean1000';
const PREVENIR = true;            // e-mail au prof à chaque nouvelle demande de cours
const FUSEAU = 'Europe/Brussels';


const DONNEES = '_donnees';
const MORCEAU = 40000; // une cellule Google Sheets accepte 50 000 caractères au maximum
const ENTETE = ['Module', 'Id', 'Rev', 'T', 'Partie', 'Données'];
const MODULES = {padel: 'Padel'};
const ORDRE = ['Résumé', 'Demandes', 'Agenda', 'Paiements', 'Forfaits', 'Élèves', 'Tarifs', 'Reprise'];
const SEMAINES_CYCLE = 14; // un forfait de 10 séances peut se réserver jusqu'à 14 semaines à l'avance

function doGet(e) {
  return repondre(() => {
    const p = e.parameter || {};
    if (p.a === 'dispo') return dispoPublique();
    if (p.a === 'reprise') return reprisePublique();
    verifier(p.cle);
    if (!MODULES[p.m]) throw new Error('module inconnu');
    const depuis = +p.r || 0, tout = lire(), recs = [];
    let rev = 0;
    tout.forEach(x => { if (x.m === p.m) { rev = Math.max(rev, x.r); if (x.r > depuis) recs.push(x.rec); } });
    return {ok: true, r: rev, recs: recs};
  });
}

function doPost(e) {
  return repondre(() => {
    const o = JSON.parse(e.postData.contents);
    if (o.a === 'demande') return nouvelleDemande(o);
    if (o.a === 'attente') return nouvelleAttente(o);
    if (o.a === 'reprise') return nouvelleReprise(o);
    verifier(o.cle);
    if (!MODULES[o.m]) throw new Error('module inconnu');
    const verrou = LockService.getScriptLock();
    verrou.waitLock(30000);
    try {
      const tout = lire(), index = {};
      let rev = 0;
      tout.forEach((x, i) => { rev = Math.max(rev, x.r); if (x.m === o.m) index[x.rec.id] = i; });
      let change = false;
      (o.recs || []).forEach(rec => {
        if (!rec || rec.id == null) return;
        const i = index[rec.id];
        // La modification la plus récente gagne, élément par élément.
        if (i !== undefined && (+tout[i].rec.t || 0) > (+rec.t || 0)) return;
        const x = {m: o.m, r: ++rev, rec: rec};
        if (i !== undefined) tout[i] = x; else { index[rec.id] = tout.length; tout.push(x); }
        change = true;
      });
      if (change) ecrire(tout);
      if (o.tables) {
        Object.keys(o.tables).forEach(nom => tableau(nom, o.tables[nom]));
        ranger();
      }
      return {ok: true, r: rev};
    } finally {
      verrou.releaseLock();
    }
  });
}

// ---------- Page de réservation (publique, sans mot de passe) ----------
// Elle ne reçoit que les heures déjà prises et les disponibilités du prof : aucun nom, aucun prix.
// Le prof ouvre lui-même ses créneaux dans l'appli (enregistrements « ouverture », un par jour).
function etatPadel(tout) {
  const recs = (tout || lire()).filter(x => x.m === 'padel').map(x => x.rec).filter(r => r && !r.del);
  return {R: recs.find(r => r.type === 'reglages') || {}, recs: recs};
}
function reglesResa(R) {
  return {ouvert: !R.resaFerme, duree: [60, 90].indexOf(+R.resaDuree) >= 0 ? +R.resaDuree : 60,
    delai: R.resaDelai == null ? 12 : Math.max(0, +R.resaDelai || 0), semaines: Math.min(12, Math.max(1, +R.resaSemaines || 5)),
    prof: String(R.prof || ''), lieu: String((R.lieux || [])[0] || ''), texte: String(R.resaTexte || '')};
}
const pad = n => ('0' + n).slice(-2);
const minDe = h => +h.slice(0, 2) * 60 + +h.slice(3, 5);
function maintenant() { return Utilities.formatDate(new Date(), FUSEAU, "yyyy-MM-dd'T'HH:mm"); }
function plusJours(isoJ, n) { const d = new Date(isoJ + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function plusHeures(isoDH, h) { return new Date(new Date(isoDH + ':00Z').getTime() + h * 3600000).toISOString().slice(0, 16); }
/** Créneaux ouverts à venir, avec « pris » si un cours (non annulé) ou une demande en attente le chevauche. */
function creneauxOuverts(s, g, now, semaines) {
  const de = now.slice(0, 10), a = plusJours(de, (semaines || g.semaines) * 7), limite = plusHeures(now, g.delai), out = [];
  const occ = {};
  s.recs.forEach(r => {
    if ((r.type === 'cours' && r.statut !== 'annule') || r.type === 'occupe' || (r.type === 'demande' && r.etat === 'attente'))
      (occ[r.date] = occ[r.date] || []).push([minDe(r.debut), minDe(r.debut) + (+r.duree || 60)]);
    if (r.type === 'demande' && r.etat === 'attente' && Array.isArray(r.autres))
      r.autres.forEach(x => { if (x && x.date && x.debut) (occ[x.date] = occ[x.date] || []).push([minDe(x.debut), minDe(x.debut) + (+r.duree || 60)]); });
  });
  s.recs.forEach(r => {
    if (r.type !== 'ouverture' || !(r.date >= de && r.date <= a) || !Array.isArray(r.h)) return;
    r.h.forEach(h => {
      if (!/^\d\d:\d\d$/.test(h) || r.date + 'T' + h < limite) return;
      const m0 = minDe(h), m1 = m0 + g.duree;
      out.push({d: r.date, h: h, pris: (occ[r.date] || []).some(x => x[0] < m1 && m0 < x[1])});
    });
  });
  return out.sort((x, y) => (x.d + x.h).localeCompare(y.d + y.h));
}
function dispoPublique() {
  const s = etatPadel(), g = reglesResa(s.R), now = maintenant();
  return {ok: true, maintenant: now, ouvert: g.ouvert, duree: g.duree, semaines: g.semaines,
    prof: g.prof, lieu: g.lieu, texte: g.texte, semainesCycle: Math.max(g.semaines, SEMAINES_CYCLE),
    creneaux: g.ouvert ? creneauxOuverts(s, g, now, Math.max(g.semaines, SEMAINES_CYCLE)) : [], tarifs: tarifsPublics(s)};
}
function tarifsPublics(s) {
  return s.recs.filter(r => r.type === 'tarif' && +r.pers > 0).sort((a, b) => a.pers - b.pers)
    .map(t => ({nom: String(t.nom || ''), pers: +t.pers, prix: +t.prix || 0, cycle: +t.cycle || 0, prixCycle: +t.prixCycle || 0}));
}
function propre(v, max) { return String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max); }
function nouvelleDemande(o) {
  if (o.piege) return {ok: true}; // case cachée remplie : robot
  const nom = propre(o.nom, 80), tel = propre(o.tel, 30), email = propre(o.email, 120), msg = propre(o.msg, 600), niveau = propre(o.niveau, 30);
  const date = propre(o.date, 10), debut = propre(o.debut, 5), pers = Math.min(4, Math.max(1, Math.round(+o.pers || 1))), formule = o.formule === 'cycle' ? 'cycle' : 'seance';
  if (nom.length < 2) throw new Error('nom');
  if (tel.replace(/\D/g, '').length < 8) throw new Error('telephone');
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('email');
  if (!/^\d{4}-\d\d-\d\d$/.test(date) || !/^\d\d:\d\d$/.test(debut)) throw new Error('creneau');
  const verrou = LockService.getScriptLock();
  verrou.waitLock(30000);
  let rec;
  try {
    const tout = lire(), s = etatPadel(tout), g = reglesResa(s.R);
    if (!g.ouvert) throw new Error('ferme');
    const now = maintenant(), libres = creneauxOuverts(s, g, now, Math.max(g.semaines, SEMAINES_CYCLE));
    const c = libres.find(x => x.d === date && x.h === debut);
    if (!c || date > plusJours(now.slice(0, 10), g.semaines * 7)) throw new Error('creneau');
    if (c.pris) throw new Error('pris');
    // Forfait : les autres séances choisies (mêmes vérifications, sans chevauchement entre elles)
    const autres = [], vues = [[date, minDe(debut)]];
    if (formule === 'cycle' && Array.isArray(o.seances)) o.seances.slice(0, 30).forEach(x => {
      const d2 = propre(x && x.d, 10), h2 = propre(x && x.h, 5);
      if (d2 === date && h2 === debut) return;
      const k = libres.find(y => y.d === d2 && y.h === h2);
      if (!k) throw new Error('creneau');
      if (k.pris) throw new Error('pris');
      if (vues.some(v => v[0] === d2 && Math.abs(v[1] - minDe(h2)) < g.duree)) throw new Error('double');
      vues.push([d2, minDe(h2)]); autres.push({date: d2, debut: h2});
    });
    autres.sort((a, b) => (a.date + a.debut).localeCompare(b.date + b.debut));
    // Contre les abus : 3 demandes en attente au plus par téléphone, 40 en tout
    const att = s.recs.filter(r => r.type === 'demande' && r.etat === 'attente');
    if (att.length >= 40 || att.filter(r => String(r.tel).replace(/\D/g, '') === tel.replace(/\D/g, '')).length >= 3) throw new Error('trop');
    let rev = 0; tout.forEach(x => { rev = Math.max(rev, x.r); });
    rec = {id: 'dm-' + Utilities.getUuid().slice(0, 13), type: 'demande', etat: 'attente', date: date, debut: debut, duree: g.duree,
      nom: nom, tel: tel, email: email, pers: pers, niveau: niveau, msg: msg, formule: formule, recue: Date.now(), t: Date.now()};
    if (autres.length) rec.autres = autres;
    tout.push({m: 'padel', r: rev + 1, rec: rec});
    ecrire(tout);
  } finally {
    verrou.releaseLock();
  }
  if (PREVENIR) try {
    const qui = Session.getEffectiveUser().getEmail();
    const quand = Utilities.formatDate(new Date(date + 'T12:00:00Z'), 'UTC', 'dd/MM/yyyy') + ' à ' + debut.replace(/^0/, '').replace(':00', 'h').replace(':', 'h');
    const mail = {to: qui, name: 'Padel · demandes de cours',
      subject: '📩 Nouvelle demande de cours : ' + nom + ' le ' + quand,
      body: 'Nouvelle demande de cours de padel\n\n' + nom + '\nLe ' + quand + ' (' + rec.duree + ' min) · ' + pers + ' personne' + (pers > 1 ? 's' : '') +
        (niveau ? ' · niveau ' + niveau : '') + (formule === 'cycle' ? '\nVeut un FORFAIT (cycle de séances), ce cours compte comme le premier.' + (rec.autres ? '\nSéances suivantes choisies : ' + rec.autres.map(x => Utilities.formatDate(new Date(x.date + 'T12:00:00Z'), 'UTC', 'dd/MM') + ' ' + x.debut.replace(/^0/, '').replace(':00', 'h')).join(', ') : '') : '\nUne séance à l\'unité.') + '\nTéléphone : ' + tel + (email ? '\nE-mail : ' + email : '') + (msg ? '\n\nMessage : ' + msg : '') +
        '\n\nOuvre l\'appli Padel (📩 Demandes) pour accepter ou refuser, et répondre par WhatsApp ou e-mail.'};
    if (email) mail.replyTo = email;
    if (qui) MailApp.sendEmail(mail);
  } catch (err) { console.log('E-mail non envoyé : ' + err); }
  return {ok: true};
}

// ---------- Liste d'attente : « préviens-moi si ce créneau se libère » ----------
function nouvelleAttente(o) {
  if (o.piege) return {ok: true};
  const nom = propre(o.nom, 80), tel = propre(o.tel, 30), email = propre(o.email, 120), date = propre(o.date, 10), debut = propre(o.debut, 5);
  if (nom.length < 2) throw new Error('nom');
  if (tel.replace(/\D/g, '').length < 8) throw new Error('telephone');
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('email');
  const verrou = LockService.getScriptLock();
  verrou.waitLock(30000);
  let rec;
  try {
    const tout = lire(), s = etatPadel(tout), g = reglesResa(s.R);
    if (!g.ouvert) throw new Error('ferme');
    const c = creneauxOuverts(s, g, maintenant(), Math.max(g.semaines, SEMAINES_CYCLE)).find(x => x.d === date && x.h === debut);
    if (!c) throw new Error('creneau');
    if (!c.pris) throw new Error('libre');
    const chif = t => String(t).replace(/\D/g, '').slice(-9);
    const att = s.recs.filter(r => r.type === 'attente' && r.date >= maintenant().slice(0, 10));
    if (att.some(r => r.date === date && r.debut === debut && chif(r.tel) === chif(tel))) return {ok: true, deja: true};
    if (att.length >= 80 || att.filter(r => chif(r.tel) === chif(tel)).length >= 5) throw new Error('trop');
    let rev = 0; tout.forEach(x => { rev = Math.max(rev, x.r); });
    rec = {id: 'at-' + Utilities.getUuid().slice(0, 13), type: 'attente', date: date, debut: debut, duree: g.duree, nom: nom, tel: tel, email: email, recue: Date.now(), t: Date.now()};
    tout.push({m: 'padel', r: rev + 1, rec: rec});
    ecrire(tout);
  } finally {
    verrou.releaseLock();
  }
  return {ok: true};
}

// ---------- Reprise des élèves actuels (formulaire padel/reprise/) ----------
// Chaque élève remplit ses infos (forfait, séances faites, payé) et coche ses prochains créneaux déjà convenus.
// Une réponse par numéro de téléphone (renvoyer le formulaire la remplace). Onglet lisible « Reprise ».
function reprisePublique() {
  const s = etatPadel(), g = reglesResa(s.R), now = maintenant(), pris = [];
  s.recs.forEach(r => {
    if (r.type === 'reprise' && Array.isArray(r.creneaux)) r.creneaux.forEach(x => pris.push({d: x.d, h: x.h, dur: +r.duree || 60}));
    if (r.type === 'cours' && r.statut !== 'annule' && r.date >= now.slice(0, 10)) pris.push({d: r.date, h: r.debut, dur: +r.duree || 60});
  });
  return {ok: true, maintenant: now, prof: g.prof, lieu: g.lieu, duree: g.duree, pris: pris, tarifs: tarifsPublics(s)};
}
function nouvelleReprise(o) {
  if (o.piege) return {ok: true};
  const prenom = propre(o.prenom, 40), nom = propre(o.nom, 60), tel = propre(o.tel, 30), email = propre(o.email, 120);
  if (prenom.length < 1 || nom.length < 1) throw new Error('nom');
  if (tel.replace(/\D/g, '').length < 8) throw new Error('telephone');
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('email');
  const num = v => Math.max(0, Math.min(100000, Math.round((+String(v == null ? '' : v).replace(',', '.') || 0) * 100) / 100));
  const creneaux = (Array.isArray(o.creneaux) ? o.creneaux : []).slice(0, 80)
    .map(x => ({d: propre(x && x.d, 10), h: propre(x && x.h, 5)})).filter(x => /^\d{4}-\d\d-\d\d$/.test(x.d) && /^\d\d:\d\d$/.test(x.h))
    .sort((a, b) => (a.d + a.h).localeCompare(b.d + b.h));
  const id = 'rp-' + tel.replace(/\D/g, '').slice(-9);
  const rec = {id: id, type: 'reprise', prenom: prenom, nom: nom, tel: tel, email: email, niveau: propre(o.niveau, 30),
    formule: propre(o.formule, 40), pers: Math.min(4, Math.max(1, Math.round(+o.pers || 1))), avec: propre(o.avec, 120),
    seances: Math.round(num(o.seances)), faites: Math.round(num(o.faites)), total: num(o.total), paye: num(o.paye),
    duree: [60, 90].indexOf(+o.duree) >= 0 ? +o.duree : 60, creneaux: creneaux, msg: propre(o.msg, 800), par: o.par === 'prof' ? 'prof' : '', recue: Date.now(), t: Date.now()};
  const verrou = LockService.getScriptLock();
  verrou.waitLock(30000);
  let s;
  try {
    const tout = lire();
    if (tout.filter(x => x.m === 'padel' && x.rec && x.rec.type === 'reprise').length >= 300) throw new Error('trop');
    let rev = 0, i = -1; tout.forEach((x, k) => { rev = Math.max(rev, x.r); if (x.m === 'padel' && x.rec && x.rec.id === id) i = k; });
    if (i >= 0 && tout[i].rec.importe) rec.importe = tout[i].rec.importe;
    const x = {m: 'padel', r: rev + 1, rec: rec};
    if (i >= 0) tout[i] = x; else tout.push(x);
    ecrire(tout);
    s = etatPadel(tout);
  } finally {
    verrou.releaseLock();
  }
  try { tableReprise(s); ranger(); } catch (err) { console.log('Onglet Reprise : ' + err); }
  if (PREVENIR && rec.par !== 'prof') try {
    const qui = Session.getEffectiveUser().getEmail();
    if (qui) MailApp.sendEmail({to: qui, name: 'J\'Padel · reprise des élèves', subject: '📋 Reprise : ' + prenom + ' ' + nom + ' a rempli le formulaire',
      body: prenom + ' ' + nom + ' (' + tel + ') a rempli le formulaire de reprise.\nForfait : ' + (rec.formule || '?') + ' · ' + rec.faites + '/' + rec.seances + ' séances faites · payé ' + rec.paye + ' € sur ' + rec.total + ' €.\n' +
        creneaux.length + ' créneau(x) à venir coché(s).\n\nTout est dans l\'onglet « Reprise » de la feuille, et dans l\'appli (👥 Élèves › 📋 Reprise).', replyTo: email || undefined});
  } catch (err) { console.log('E-mail non envoyé : ' + err); }
  return {ok: true};
}
/** Conflits : le même moment coché par deux élèves (ou déjà un cours dans l'appli). */
function conflitsReprise(s) {
  const R = s.recs.filter(r => r.type === 'reprise'), out = {};
  const occ = [];
  R.forEach(r => (r.creneaux || []).forEach(x => occ.push({id: r.id, qui: r.prenom + ' ' + r.nom, d: x.d, a: minDe(x.h), b: minDe(x.h) + (+r.duree || 60), h: x.h})));
  s.recs.filter(r => r.type === 'cours' && r.statut !== 'annule').forEach(c => occ.push({id: 'cours', qui: 'un cours de l\'agenda', d: c.date, a: minDe(c.debut), b: minDe(c.debut) + (+c.duree || 60), h: c.debut}));
  occ.forEach(x => { if (x.id === 'cours') return; occ.forEach(y => { if (y === x || y.id === x.id || y.d !== x.d || !(y.a < x.b && x.a < y.b)) return; (out[x.id] = out[x.id] || []).push(x.d.slice(8, 10) + '/' + x.d.slice(5, 7) + ' ' + x.h.replace(/^0/, '').replace(':00', 'h') + ' (aussi ' + y.qui + ')'); }); });
  return out;
}
function tableReprise(s) {
  const R = s.recs.filter(r => r.type === 'reprise').sort((a, b) => (a.nom + a.prenom).localeCompare(b.nom + b.prenom)), cf = conflitsReprise(s);
  const L = [['Nom', 'Prénom', 'Téléphone', 'E-mail', 'Niveau', 'Formule', 'Personnes', 'Avec', 'Séances du forfait', 'Séances faites', 'Séances restantes', 'Prix total (€)', 'Payé (€)', 'Reste à payer (€)', 'Durée', 'Créneaux à venir', 'Problème', 'Message', 'Rempli par', 'Reçu le', 'Dans l\'appli']];
  R.forEach(r => L.push([r.nom, r.prenom, r.tel, r.email, r.niveau, r.formule, r.pers, r.avec, r.seances, r.faites, Math.max(0, r.seances - r.faites), r.total, r.paye, Math.max(0, Math.round((r.total - r.paye) * 100) / 100),
    r.duree === 90 ? '1h30' : '1h', (r.creneaux || []).map(x => x.d.slice(8, 10) + '/' + x.d.slice(5, 7) + ' ' + x.h.replace(/^0/, '').replace(':00', 'h')).join(', '),
    cf[r.id] ? '⚠ Même créneau : ' + cf[r.id].join(' ; ') : '', r.msg, r.par === 'prof' ? 'Le prof' : 'L\'élève', Utilities.formatDate(new Date(r.recue || r.t), FUSEAU, 'dd/MM/yyyy HH:mm'), r.importe ? 'Importé' : '']));
  tableau('Reprise', L);
}

/** À lancer une fois à la main (▶ Exécuter) : autorise l'envoi d'e-mails et envoie un e-mail d'essai. */
function testerMail() {
  MailApp.sendEmail(Session.getEffectiveUser().getEmail(), 'Padel : test des e-mails ✓', 'Les demandes de cours de la page de réservation arriveront à cette adresse.');
}

function repondre(f) {
  let out;
  try { out = f(); } catch (err) { out = {ok: false, err: String(err.message || err)}; }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function verifier(cle) {
  if (String(cle || '') !== CLE) throw new Error('mot de passe incorrect');
}

function feuille(nom) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(nom) || ss.insertSheet(nom);
}

function lire() {
  const sh = feuille(DONNEES);
  if (sh.getLastRow() < 2) return [];
  const v = sh.getRange(2, 1, sh.getLastRow() - 1, ENTETE.length).getValues(), parts = {}, ordre = [];
  v.forEach(l => {
    const cle = l[0] + '\u0001' + l[1];
    if (!parts[cle]) { parts[cle] = {m: String(l[0]), r: +l[2] || 0, morceaux: []}; ordre.push(cle); }
    parts[cle].morceaux[+l[4] || 0] = String(l[5]);
  });
  const out = [];
  ordre.forEach(k => {
    const p = parts[k];
    try { out.push({m: p.m, r: p.r, rec: JSON.parse(p.morceaux.join(''))}); } catch (err) {}
  });
  return out;
}

function ecrire(tout) {
  const sh = feuille(DONNEES), lignes = [ENTETE];
  tout.forEach(x => {
    const s = JSON.stringify(x.rec);
    for (let i = 0, n = 0; i < s.length || n === 0; i += MORCEAU, n++)
      lignes.push([x.m, String(x.rec.id), x.r, +x.rec.t || 0, n, s.slice(i, i + MORCEAU)]);
  });
  sh.clearContents();
  sh.getRange(1, 1, lignes.length, ENTETE.length).setNumberFormat('@').setValues(lignes);
  try { if (!sh.isSheetHidden()) sh.hideSheet(); } catch (err) {}
}

// Couleurs selon la valeur d'une case
const VALEURS = [['À jour', '#d6f0dc'], ['Donné', '#d6f0dc'], ['Prévu', '#dcecf7'], ['Annulé', '#e4e7ea'], ['Absent (facturé)', '#fcefc0'], ['En attente', '#fcefc0'], ['Acceptée', '#d6f0dc'], ['Refusée', '#e4e7ea'], ['Importé', '#d6f0dc']];

/** Onglet lisible : lignes[0] = titres de colonnes. */
function tableau(nom, lignes) {
  if (!Array.isArray(lignes) || !lignes.length) return;
  const fonce = '#0b6e8f', clair = '#eef6f9';
  const sh = feuille(nom), larg = lignes[0].length, haut = lignes.length;
  lignes = lignes.map(l => { const r = l.slice(0, larg); while (r.length < larg) r.push(''); return r.map(c => c == null ? '' : String(c)); });
  if (sh.getFilter()) sh.getFilter().remove();
  sh.getBandings().forEach(b => b.remove());
  sh.clear();
  if (sh.getMaxColumns() < larg) sh.insertColumnsAfter(sh.getMaxColumns(), larg - sh.getMaxColumns());
  if (sh.getMaxColumns() > larg) sh.deleteColumns(larg + 1, sh.getMaxColumns() - larg);
  if (sh.getMaxRows() < haut + 1) sh.insertRowsAfter(sh.getMaxRows(), haut + 1 - sh.getMaxRows());
  if (sh.getMaxRows() > haut + 20) sh.deleteRows(haut + 21, sh.getMaxRows() - haut - 20);
  const plage = sh.getRange(1, 1, haut, larg);
  plage.setNumberFormat('@').setValues(lignes)
    .setFontFamily('Calibri').setFontSize(11).setFontColor('#1f2421')
    .setVerticalAlignment('middle').setWrap(true);
  sh.getRange(1, 1, 1, larg).setFontWeight('bold').setFontColor('#ffffff').setBackground(fonce).setHorizontalAlignment('center');
  sh.setRowHeight(1, 34);
  if (haut > 1) {
    const corps = sh.getRange(2, 1, haut - 1, larg);
    corps.applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, false, false).setFirstRowColor('#ffffff').setSecondRowColor(clair);
    sh.setRowHeights(2, haut - 1, 26);
    if (nom !== 'Agenda' && nom !== 'Paiements' && nom !== 'Forfaits' && nom !== 'Demandes' && nom !== 'Reprise') sh.getRange(2, 1, haut - 1, 1).setFontWeight('bold');
    const regles = VALEURS.map(([t, c]) => SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(t).setBackground(c).setRanges([corps]).build());
    regles.push(SpreadsheetApp.newConditionalFormatRule().whenTextStartsWith('Doit').setBackground('#f6b8b3').setBold(true).setRanges([corps]).build());
    regles.push(SpreadsheetApp.newConditionalFormatRule().whenTextStartsWith('⚠').setBackground('#f6b8b3').setBold(true).setRanges([corps]).build());
    regles.push(SpreadsheetApp.newConditionalFormatRule().whenTextStartsWith('En avance').setBackground('#dcecf7').setRanges([corps]).build());
    sh.setConditionalFormatRules(regles);
  }
  plage.setBorder(true, true, true, true, true, true, '#d9e2e7', SpreadsheetApp.BorderStyle.SOLID);
  plage.createFilter();
  sh.setFrozenRows(1);
  sh.setHiddenGridlines(true);
  sh.setTabColor(nom === 'Résumé' ? '#c0392b' : fonce);
  for (let c = 1; c <= larg; c++) {
    const max = Math.max.apply(null, lignes.map((l, i) => String(l[c - 1]).length + (i ? 0 : 4)));
    sh.setColumnWidth(c, Math.min(380, Math.max(80, max * 7.5 + 24)));
    if (max <= 14 && c > 1 && haut > 1) sh.getRange(2, c, haut - 1, 1).setHorizontalAlignment('center');
  }
}

// Ordre des onglets, et l'onglet vide du départ retiré
function ranger() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ORDRE.forEach((n, i) => { const f = ss.getSheetByName(n); if (f && f.getIndex() !== i + 1) { ss.setActiveSheet(f); ss.moveActiveSheet(Math.min(i + 1, ss.getSheets().length)); } });
  ['Feuille 1', 'Sheet1', 'Feuille1'].forEach(n => { const f = ss.getSheetByName(n); if (f && f.getLastRow() === 0 && ss.getSheets().length > 2) try { ss.deleteSheet(f); } catch (err) {} });
}
