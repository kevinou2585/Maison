/**
 * ARA (appli de Happiness) : suivi des élèves de maths, sauvegardé dans une feuille Google À PART.
 * Rien d'autre que ARA dans cette feuille (pas les données de Happiness).
 *
 * Installation (une seule fois, sur l'ordinateur) :
 * 1. Crée une feuille Google vide sur ton Drive (sheets.new), nomme-la « ARA ».
 * 2. Menu Extensions > Apps Script. Efface tout et colle ce fichier.
 * 3. Ligne CLE ci-dessous : mets LE MÊME mot de passe que dans le script de Happiness (à la place de change-moi), puis 💾 Enregistrer.
 * 4. Déployer > Nouveau déploiement > roue dentée > « Application Web » :
 *      Exécuter en tant que : Moi ; Qui a accès : Tout le monde. Déployer, puis autorise l'accès.
 * 5. Copie l'adresse qui finit par /exec. Dans ARA : ⚙️ Réglages > Feuille Google : colle l'adresse et le mot de passe.
 *    Pareil sur chaque téléphone ou ordinateur qui utilise ARA.
 *
 * L'onglet caché « _donnees » sert à la synchronisation : ne le modifie pas.
 * Les onglets « ARA bilan » (un élève par ligne) et « ARA journal » (chaque croix, avec sa date)
 * sont réécrits par l'appli à chaque changement (téléchargeables en Excel).
 */
const CLE = 'change-moi';

const DONNEES = '_donnees';
const MORCEAU = 40000; // une cellule Google Sheets accepte 50 000 caractères au maximum
const ENTETE = ['Module', 'Id', 'Rev', 'T', 'Partie', 'Données'];
const MODULES = {ara: 'ARA'};

function doGet(e) {
  return repondre(() => {
    const p = e.parameter || {};
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
        // La modification la plus récente gagne, enregistrement par enregistrement.
        if (i !== undefined && (+tout[i].rec.t || 0) > (+rec.t || 0)) return;
        const x = {m: o.m, r: ++rev, rec: rec};
        if (i !== undefined) tout[i] = x; else { index[rec.id] = tout.length; tout.push(x); }
        change = true;
      });
      if (change) ecrire(tout);
      if (o.tables) Object.keys(o.tables).forEach(nom => tableau(nom, o.tables[nom], o.m));
      if (change || o.tables) try { accueil(); } catch (err) {}
      return {ok: true, r: rev};
    } finally {
      verrou.releaseLock();
    }
  });
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

const COULEURS = {ara: ['#4c34b8', '#f1eefb', '#7b3fc0']};
/** Onglet lisible : lignes[0] = titres de colonnes. */
function tableau(nom, lignes, m) {
  if (!Array.isArray(lignes) || !lignes.length) return;
  const [fonce, clair, onglet] = COULEURS.ara;
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
  const tete = sh.getRange(1, 1, 1, larg);
  tete.setFontWeight('bold').setFontColor('#ffffff').setBackground(fonce).setFontSize(11).setHorizontalAlignment('center');
  sh.setRowHeight(1, 34);
  if (haut > 1) {
    const corps = sh.getRange(2, 1, haut - 1, larg);
    corps.applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, false, false)
      .setFirstRowColor('#ffffff').setSecondRowColor(clair);
    corps.setBorder(null, null, true, null, null, true, '#d9ddd8', SpreadsheetApp.BorderStyle.SOLID);
    sh.setRowHeights(2, haut - 1, 26);
    sh.getRange(2, 1, haut - 1, 1).setFontWeight('bold');
  }
  plage.setBorder(true, true, true, true, null, null, fonce, SpreadsheetApp.BorderStyle.SOLID);
  plage.createFilter();
  sh.setFrozenRows(1);
  sh.setHiddenGridlines(true);
  sh.setTabColor(onglet);
  for (let c = 1; c <= larg; c++) {
    const max = Math.max.apply(null, lignes.map((l, i) => String(l[c - 1]).length + (i ? 0 : 4)));
    sh.setColumnWidth(c, Math.min(360, Math.max(80, max * 7.5 + 24)));
    // colonnes courtes (dates, oui/non, n°) centrées
    if (max <= 12 && c > 1 && haut > 1) sh.getRange(2, c, haut - 1, 1).setHorizontalAlignment('center');
  }
}


// Premier onglet : quelques mots et l'heure de la dernière mise à jour
function accueil() {
  const ss = SpreadsheetApp.getActiveSpreadsheet(), sh = feuille('Accueil');
  const quand = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Europe/Brussels', 'dd/MM/yyyy à HH:mm');
  const l = [['📝📢📚 ARA'], ['Suivi des élèves : prépa pas faite, a perturbé le cours, pas son cours.'], [''],
    ['« ARA bilan » : un élève par ligne, avec ses totaux par période et ce qui reste à noter sur l\'appli de l\'école.'],
    ['« ARA journal » : chaque croix et chaque « noté sur l\'appli de l\'école », avec sa date.'], [''], ['Dernière mise à jour : ' + quand]];
  sh.clear(); sh.setHiddenGridlines(true);
  sh.getRange(1, 1, l.length, 1).setValues(l).setFontFamily('Calibri').setFontSize(11);
  sh.getRange(1, 1).setFontSize(22).setFontWeight('bold').setFontColor('#4c34b8');
  sh.getRange(7, 1).setFontColor('#625b78').setFontStyle('italic');
  sh.setColumnWidth(1, 640); sh.setTabColor('#4c34b8');
  try { if (sh.getIndex() !== 1) { ss.setActiveSheet(sh); ss.moveActiveSheet(1); } } catch (err) {}
  ['Feuille 1', 'Sheet1', 'Feuille1'].forEach(n => { const f = ss.getSheetByName(n); if (f && f.getLastRow() === 0 && ss.getSheets().length > 2) try { ss.deleteSheet(f); } catch (err) {} });
}
