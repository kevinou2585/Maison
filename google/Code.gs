/**
 * Ma maison : sauvegarde partagée sur Google Drive.
 *
 * Installation (une seule fois) :
 * 1. Crée une feuille Google vide sur ton Drive (sheets.new), nomme-la « Ma maison ».
 * 2. Menu Extensions > Apps Script. Efface tout et colle ce fichier.
 * 3. Change le mot de passe ci-dessous (CLE), puis 💾 Enregistrer.
 * 4. Déployer > Nouveau déploiement > type « Application Web » :
 *      Exécuter en tant que : Moi ; Qui a accès : Tout le monde. Autorise l'accès.
 * 5. Copie l'adresse qui finit par /exec et colle-la dans l'appli (☁️ Drive), avec le mot de passe.
 *
 * L'onglet caché « _donnees » sert à la synchronisation : ne le modifie pas.
 * Les autres onglets sont réécrits à chaque modification, pour être lus (ou téléchargés en Excel).
 */
const CLE = 'change-moi';

const DONNEES = '_donnees';
const MORCEAU = 40000; // une cellule Google Sheets accepte 50 000 caractères au maximum
const ENTETE = ['Module', 'Id', 'Rev', 'T', 'Partie', 'Données'];
const MODULES = {jardin: 'Jardin du Bonheur', courses: 'Courses', todo: 'To-Do'};

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
      if (o.tables) Object.keys(o.tables).forEach(nom => tableau(nom, o.tables[nom]));
      if (change || o.tables) accueil(o.m, o.qui);
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
  if (!sh.isSheetHidden()) sh.hideSheet();
}

/** Onglet lisible : lignes[0] = titres de colonnes. */
function tableau(nom, lignes) {
  if (!Array.isArray(lignes) || !lignes.length) return;
  const sh = feuille(nom), larg = lignes[0].length;
  lignes = lignes.map(l => { const r = l.slice(0, larg); while (r.length < larg) r.push(''); return r.map(c => c == null ? '' : c); });
  sh.clear();
  sh.getBandings().forEach(b => b.remove());
  if (sh.getMaxColumns() < larg) sh.insertColumnsAfter(sh.getMaxColumns(), larg - sh.getMaxColumns());
  const plage = sh.getRange(1, 1, lignes.length, larg);
  plage.setNumberFormat('@').setValues(lignes).setVerticalAlignment('top').setWrap(true).setFontFamily('Arial').setFontSize(10);
  sh.getRange(1, 1, 1, larg).setFontWeight('bold').setFontColor('#ffffff').setBackground('#2e6b3f').setWrap(true);
  if (lignes.length > 1) plage.applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREEN, true, false);
  sh.getRange(1, 1, 1, larg).setBackground('#2e6b3f');
  sh.setFrozenRows(1);
  for (let c = 1; c <= larg; c++) {
    const max = Math.max.apply(null, lignes.map(l => String(l[c - 1]).length));
    sh.setColumnWidth(c, Math.min(380, Math.max(70, max * 7 + 16)));
  }
  if (sh.getMaxRows() > lignes.length + 50) sh.deleteRows(lignes.length + 51, sh.getMaxRows() - lignes.length - 50);
}

function accueil(m, qui) {
  const sh = feuille('Accueil'), props = PropertiesService.getScriptProperties();
  const quand = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Europe/Brussels', 'dd/MM/yyyy HH:mm');
  props.setProperty('maj-' + m, quand + (qui ? ' (' + qui + ')' : ''));
  const l = [['Ma maison', ''], ['Sauvegarde partagée de l\'appli : chaque onglet est mis à jour tout seul.', ''], ['', ''], ['Partie', 'Dernière modification']];
  Object.keys(MODULES).forEach(k => l.push([MODULES[k], props.getProperty('maj-' + k) || '—']));
  sh.clear();
  sh.getRange(1, 1, l.length, 2).setValues(l);
  sh.getRange(1, 1).setFontSize(18).setFontWeight('bold').setFontColor('#2e6b3f');
  sh.getRange(4, 1, 1, 2).setFontWeight('bold').setBackground('#e3efe5');
  sh.setColumnWidth(1, 260); sh.setColumnWidth(2, 240);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setActiveSheet(sh); ss.moveActiveSheet(1);
}
