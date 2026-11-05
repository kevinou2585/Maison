/**
 * Renforcement (appli de Happiness) : sauvegarde sur Google Drive, dans une feuille À PART.
 * Tes données de santé (douleurs, séances, padel, selles) ne vont pas dans la feuille Happiness.
 *
 * Installation (une seule fois) :
 * 1. Crée une feuille Google vide sur ton Drive (sheets.new), nomme-la « Renforcement ».
 * 2. Menu Extensions > Apps Script. Efface tout et colle ce fichier.
 * 3. Laisse CLE = '2585' (c'est le code d'entrée de l'appli, qui sert aussi ici), puis 💾 Enregistrer.
 * 4. Déployer > Nouveau déploiement > type « Application Web » :
 *      Exécuter en tant que : Moi ; Qui a accès : Tout le monde. Autorise l'accès.
 * 5. Copie l'adresse qui finit par /exec et colle-la dans l'appli (Renforcement > Réglages).
 *
 * L'onglet caché « _donnees » sert à la synchronisation : ne le modifie pas.
 * Les onglets Journal, Séances, Padel, Selles et Semaines sont réécrits par l'appli (téléchargeables en Excel).
 */
const CLE = '2585'; // le même que le code d'entrée de l'appli


const DONNEES = '_donnees';
const MORCEAU = 40000; // une cellule Google Sheets accepte 50 000 caractères au maximum
const ENTETE = ['Module', 'Id', 'Rev', 'T', 'Partie', 'Données'];
const MODULES = {renfo: 'Renforcement'};

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
      if (change || o.tables) try { tableauDeBord(); } catch (err) {}
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

const COULEURS = {renfo: ['#2f5fd0', '#f3f6fd', '#4a7fe0']};
// Cases colorées selon leur valeur (vert = bien, jaune, orange, rouge = mal)
const VERT = '#d6f0dc', JAUNE = '#fcefc0', ORANGE = '#fbd3ae', ROUGE = '#f6b8b3';
const VALEURS = [['Aucune', VERT], ['Légère gêne', JAUNE], ['Douleur', ORANGE], ['Forte douleur', ROUGE],
  ['Sans aide', VERT], ['Poire', JAUNE], ['Lavement', ORANGE], ['Dures', ROUGE], ['Liquides', ORANGE], ['Facile', VERT], ['Difficile', ORANGE], ['Douloureux', ROUGE],
  ['Très bien', VERT], ['Ça va', VERT], ['Un peu mal', JAUNE], ['Mal', ORANGE], ['Douce', VERT], ['Normale', JAUNE], ['À fond', ORANGE]];
const ORDRE = ['Tableau de bord', 'Journal', 'Séances', 'Padel', 'Selles', 'Semaines', 'Mon programme', 'Mes règles'];

/** Onglet lisible : lignes[0] = titres de colonnes. */
function tableau(nom, lignes, m) {
  if (!Array.isArray(lignes) || !lignes.length) return;
  const [fonce, clair, onglet] = COULEURS.renfo;
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
  // Couleurs selon la valeur : douleurs, selles
  if (haut > 1) {
    const zone = sh.getRange(2, 1, haut - 1, larg), regles = [];
    VALEURS.forEach(([t, c]) => regles.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(t).setBackground(c).setRanges([zone]).build()));
    sh.setConditionalFormatRules(regles);
  }
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

// ---------- Tableau de bord : premier onglet, recalculé à chaque changement ----------
function tableauDeBord() {
  const recs = lire().filter(x => x.m === 'renfo' && !x.rec.del).map(x => x.rec);
  const ss = SpreadsheetApp.getActiveSpreadsheet(), sh = feuille('Tableau de bord');
  const tz = Session.getScriptTimeZone() || 'Europe/Brussels';
  const auj = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  const moins = (s, n) => { const d = new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)); d.setDate(d.getDate() - n); return Utilities.formatDate(d, tz, 'yyyy-MM-dd'); };
  const moy = a => { const v = a.filter(x => x !== null && x !== undefined && x !== ''); return v.length ? Math.round(v.reduce((p, x) => p + +x, 0) / v.length * 10) / 10 : ''; };
  const pct = (n, d) => d ? Math.round(n / d * 100) + ' %' : '';
  const jours = recs.filter(r => r.type === 'jour'), padel = recs.filter(r => r.type === 'padel'), selles = recs.filter(r => r.type === 'selle');
  const seances = recs.filter(r => r.type === 'seance' && r.cle !== 'pp' && r.cle !== 'echauf');
  const Z = ['aine', 'genou', 'epG', 'epD'];
  const bilan = filtre => {
    const J = jours.filter(j => filtre(j.date)), notes = J.filter(j => j.d && Z.some(z => j.d[z] !== null && j.d[z] !== undefined));
    const S = selles.filter(x => filtre(x.date));
    return {aine: moy(J.map(j => j.d && j.d.aine)), genou: moy(J.map(j => j.d && j.d.genou)), epG: moy(J.map(j => j.d && j.d.epG)), epD: moy(J.map(j => j.d && j.d.epD)),
      sans: pct(notes.filter(j => Z.every(z => !j.d[z])).length, notes.length), test: moy(J.map(j => j.test)),
      padels: padel.filter(x => filtre(x.date)).length, seances: seances.filter(x => filtre(x.date)).length, pp: J.filter(j => j.pp).length,
      selles: S.length, sansAide: pct(S.filter(x => x.aide === 'Sans aide').length, S.length), dures: pct(S.filter(x => x.consist === 'Dures').length, S.length)};
  };
  const d30 = moins(auj, 29), d60 = moins(auj, 59);
  const a = bilan(d => d >= d30 && d <= auj), b = bilan(d => d >= d60 && d < d30);
  const tests = jours.filter(j => j.test !== null && j.test !== undefined).sort((x, y) => x.date < y.date ? 1 : -1);
  const fd = s => s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4);
  const reg = recs.find(r => r.type === 'reglages') || {};

  // Les mois, du plus ancien au plus récent (12 derniers)
  const mois = [...new Set(recs.filter(r => r.date).map(r => r.date.slice(0, 7)))].sort().slice(-12);
  const NOMS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const tabMois = [['Mois', 'Aine', 'Genou gauche', 'Épaule gauche', 'Épaule droite', 'Jours sans douleur', 'Test du ballon', 'Padels', 'Séances', 'Selles sans poire', 'Selles dures']]
    .concat(mois.map(m => { const x = bilan(d => d.slice(0, 7) === m); return [NOMS[+m.slice(5, 7) - 1] + ' ' + m.slice(0, 4), x.aine, x.genou, x.epG, x.epD, x.sans, x.test, x.padels, x.seances, x.sansAide, x.dures]; }));

  sh.getCharts().forEach(c => sh.removeChart(c));
  sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns()).breakApart();
  sh.clear(); sh.clearConditionalFormatRules();
  sh.setHiddenGridlines(true);
  const L = 11;
  if (sh.getMaxColumns() < L) sh.insertColumnsAfter(sh.getMaxColumns(), L - sh.getMaxColumns());
  if (sh.getMaxRows() < 200) sh.insertRowsAfter(sh.getMaxRows(), 200 - sh.getMaxRows());
  sh.getRange(1, 1, 200, L).setFontFamily('Calibri').setFontSize(11).setVerticalAlignment('middle');
  sh.getRange(1, 1).setValue('💪 Renforcement : mon suivi').setFontSize(24).setFontWeight('bold').setFontColor('#2f5fd0');
  sh.getRange(2, 1).setValue('Mis à jour le ' + Utilities.formatDate(new Date(), tz, "dd/MM/yyyy 'à' HH:mm") + '. Douleurs notées de 0 à 3 : 0 = aucune, 1 = légère gêne, 2 = douleur, 3 = forte douleur.').setFontColor('#5b6476').setFontStyle('italic');
  sh.setRowHeight(1, 44);

  // Bloc « 30 derniers jours »
  const titre = (r, t) => sh.getRange(r, 1, 1, L).merge().setValue(t).setFontSize(14).setFontWeight('bold').setFontColor('#ffffff').setBackground('#2f5fd0');
  titre(4, 'Les 30 derniers jours (et les 30 jours d\'avant)');
  const fleche = (x, y, inverse) => { if (x === '' || y === '') return ''; const d = (parseFloat(x) - parseFloat(y)); if (Math.abs(d) < 0.05) return '= pareil'; return ((inverse ? d > 0 : d < 0) ? '✅ mieux' : '⚠️ moins bien'); };
  const blocs = [
    ['Douleur aine', a.aine, b.aine, fleche(a.aine, b.aine)], ['Douleur genou gauche', a.genou, b.genou, fleche(a.genou, b.genou)],
    ['Douleur épaule gauche', a.epG, b.epG, fleche(a.epG, b.epG)], ['Douleur épaule droite', a.epD, b.epD, fleche(a.epD, b.epD)],
    ['Jours sans aucune douleur', a.sans, b.sans, fleche(a.sans, b.sans, true)], ['Test du ballon moyen (/10)', a.test, b.test, fleche(a.test, b.test)],
    ['Padels', a.padels, b.padels, ''], ['Séances', a.seances, b.seances, ''], ['Plancher pelvien (jours)', a.pp, b.pp, ''],
    ['Passages aux toilettes', a.selles, b.selles, ''], ['Selles sans poire', a.sansAide, b.sansAide, fleche(a.sansAide, b.sansAide, true)], ['Selles dures', a.dures, b.dures, fleche(a.dures, b.dures)]];
  const t5 = [['', '30 derniers jours', '30 jours d\'avant', 'Évolution']].concat(blocs);
  sh.getRange(5, 1, t5.length, 4).setValues(t5.map(l => l.map(v => v === '' || v === null || v === undefined ? '' : v)));
  sh.getRange(5, 1, 1, 4).setFontWeight('bold').setBackground('#e6edfc');
  sh.getRange(6, 1, blocs.length, 1).setFontWeight('bold');
  sh.getRange(6, 2, blocs.length, 1).setFontSize(13).setFontWeight('bold').setHorizontalAlignment('center');
  sh.getRange(6, 3, blocs.length, 2).setHorizontalAlignment('center').setFontColor('#5b6476');
  sh.getRange(5, 1, t5.length, 4).setBorder(true, true, true, true, true, true, '#d6dcea', SpreadsheetApp.BorderStyle.SOLID);

  // Où j'en suis (à droite)
  const ou = [['Où j\'en suis', ''], ['Dernier test du ballon', tests.length ? tests[0].test + '/10 le ' + fd(tests[0].date) : '—'],
    ['Copenhague', 'étape ' + (reg.cop || 1) + ' sur 4'], ['Descente de marche', (reg.marche || 10) + ' cm' + (reg.marcheOk ? ', sans douleur' : '')],
    ['Programme épaule commencé le', reg.epDebut ? fd(reg.epDebut) : '—'], ['Dernier padel', padel.length ? fd(padel.map(p => p.date).sort().pop()) : '—'],
    ['Dernière séance', seances.length ? fd(seances.map(p => p.date).sort().pop()) : '—']];
  sh.getRange(5, 6, ou.length, 2).setValues(ou);
  sh.getRange(5, 6, 1, 2).merge().setFontWeight('bold').setBackground('#e6edfc');
  sh.getRange(6, 6, ou.length - 1, 1).setFontWeight('bold');
  sh.getRange(5, 6, ou.length, 2).setBorder(true, true, true, true, true, true, '#d6dcea', SpreadsheetApp.BorderStyle.SOLID);

  // Mois par mois
  const r0 = 5 + t5.length + 2;
  titre(r0, 'Mois par mois');
  const plage = sh.getRange(r0 + 1, 1, tabMois.length, L);
  plage.setValues(tabMois.map(l => l.map(v => v === null || v === undefined ? '' : v)));
  sh.getRange(r0 + 1, 1, 1, L).setFontWeight('bold').setBackground('#e6edfc').setWrap(true).setHorizontalAlignment('center');
  if (tabMois.length > 1) {
    sh.getRange(r0 + 2, 2, tabMois.length - 1, L - 1).setHorizontalAlignment('center');
    sh.getRange(r0 + 2, 1, tabMois.length - 1, 1).setFontWeight('bold');
    // Douleur moyenne colorée : vert (0) → rouge (3)
    sh.setConditionalFormatRules([SpreadsheetApp.newConditionalFormatRule().setGradientMinpointWithValue('#d6f0dc', SpreadsheetApp.InterpolationType.NUMBER, '0')
      .setGradientMidpointWithValue('#fcefc0', SpreadsheetApp.InterpolationType.NUMBER, '1').setGradientMaxpointWithValue('#f6b8b3', SpreadsheetApp.InterpolationType.NUMBER, '3')
      .setRanges([sh.getRange(r0 + 2, 2, tabMois.length - 1, 4), sh.getRange(6, 2, 4, 2)]).build()]);
  }
  plage.setBorder(true, true, true, true, true, true, '#d6dcea', SpreadsheetApp.BorderStyle.SOLID);

  // Courbe des douleurs mois par mois
  if (tabMois.length > 1) {
    const ch = sh.newChart().setChartType(Charts.ChartType.LINE).addRange(sh.getRange(r0 + 1, 1, tabMois.length, 5))
      .setPosition(r0 + tabMois.length + 3, 1, 0, 0).setNumHeaders(1)
      .setOption('title', 'Douleurs moyennes par mois (0 = aucune, 3 = forte)').setOption('legend', {position: 'bottom'})
      .setOption('vAxes', {0: {viewWindow: {min: 0, max: 3}}}).setOption('colors', ['#2a78d6', '#eb6834', '#1baf7a', '#eda100'])
      .setOption('pointSize', 6).setOption('lineWidth', 2).setOption('width', 760).setOption('height', 320).build();
    sh.insertChart(ch);
  }
  sh.setColumnWidth(1, 210); for (let c = 2; c <= L; c++) sh.setColumnWidth(c, 105); sh.setColumnWidth(6, 200); sh.setColumnWidth(7, 160);
  sh.setFrozenRows(2);
  sh.setTabColor('#2f5fd0');
  // Ordre des onglets, et l'onglet vide du départ retiré
  ORDRE.forEach((n, i) => { const f = ss.getSheetByName(n); if (f && f.getIndex() !== i + 1) { ss.setActiveSheet(f); ss.moveActiveSheet(Math.min(i + 1, ss.getSheets().length)); } });
  ['Feuille 1', 'Sheet1', 'Feuille1', 'Accueil'].forEach(n => { const f = ss.getSheetByName(n); if (f && (f.getLastRow() === 0 || n === 'Accueil') && ss.getSheets().length > 2) try { ss.deleteSheet(f); } catch (err) {} });
  ss.setActiveSheet(sh);
}

/** À lancer une fois depuis l'éditeur si tu veux refaire le tableau de bord tout de suite. */
function refaireTableauDeBord() { tableauDeBord(); }
