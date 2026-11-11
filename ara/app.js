// ARA : suivi des élèves pendant les cours (prépa pas faite, a perturbé le cours, pas son cours).
// Données : Maison.store('ara') (téléphone + feuille Google « ARA » à part, réglage ara:drive ; onglets « ARA bilan » et « ARA journal »).
// Éléments : eleve {classe, nom, prenom, ordre, parti?}, fait {eleve, quoi, date, cree},
//            note {eleve, quand, date, compte, texte} (= « c'est noté sur l'appli de l'école »).
// Chaque croix et chaque note retient sa période (per : 'P1', 'P2', 'P3'). Pas de dates : la période en cours
// change quand on touche « Terminer la P2 » (réglage « periodes » : {courante, clos: {P2: date}}).
(() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const QUOI = {
    prepa: {ico: '📝', court: 'Prépa', long: "N'a pas fait sa prépa", cl: 'prepa'},
    pert: {ico: '📢', court: 'Perturbe', long: 'A perturbé le cours', cl: 'pert'},
    cours: {ico: '📚', court: 'Cours', long: "N'a pas son cours", cl: 'cours'}
  };
  const QS = Object.keys(QUOI);
  const CFG = 'ara:drive';   // adresse + mot de passe de la feuille Google ARA (à part de Happiness)
  // Adresse /exec de la feuille ARA de kevin. Le mot de passe (ligne CLE) est le même que celui de Happiness :
  // un appareil où Happiness est déjà reliée se relie tout seul à ARA.
  const SCRIPT = 'https://script.google.com/macros/s/AKfycbzLKw-bk5YQz97B-7IU7OohJKpWbpl9blIiPw7S9ve8BnvcYLyZw--95yHaKTy9mMuL/exec';
  const cfgHappiness = () => { try { return JSON.parse(localStorage.getItem('maison:drive')) || {}; } catch (e) { return {}; } };
  try {
    const c = JSON.parse(localStorage.getItem(CFG) || '{}'), h = cfgHappiness();
    if (SCRIPT && !(c.url && c.cle) && h.cle) localStorage.setItem(CFG, JSON.stringify({url: SCRIPT, cle: h.cle}));
  } catch (e) {}

  // ---------- Dates ----------
  const deux = n => String(n).padStart(2, '0');
  const iso = d => d.getFullYear() + '-' + deux(d.getMonth() + 1) + '-' + deux(d.getDate());
  const auj = () => iso(new Date());
  const enDate = s => { const [a, m, j] = s.split('-').map(Number); return new Date(a, m - 1, j); };
  const JOURS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
  const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const joli = s => { const d = enDate(s); return JOURS[d.getDay()] + ' ' + d.getDate() + ' ' + MOIS[d.getMonth()]; };
  const court = s => { const d = enDate(s); return deux(d.getDate()) + '/' + deux(d.getMonth() + 1); };
  const dmy = s => { const d = enDate(s); return deux(d.getDate()) + '/' + deux(d.getMonth() + 1) + '/' + d.getFullYear(); };

  // ---------- Données ----------
  const graines = [];
  ARA_CLASSES.forEach(c => (ARA_LISTES[c] || []).forEach(([nom, prenom], i) =>
    graines.push({id: 'e-' + c + '-' + deux(i + 1), type: 'eleve', classe: c, nom, prenom, ordre: i + 1})));
  graines.push({id: 'periodes', type: 'reglage', courante: 'P2', clos: {}});

  let S = null;
  const eleve = id => S.get(id);
  const eleves = classe => S.tous('eleve').filter(e => e.classe === classe && !e.parti).sort((a, b) => (a.ordre || 0) - (b.ordre || 0) || a.nom.localeCompare(b.nom, 'fr'));
  const classes = () => { const l = ARA_CLASSES.slice(); S.tous('eleve').forEach(e => { if (!l.includes(e.classe)) l.push(e.classe); }); return l; };
  const NOMS_PER = ['P1', 'P2', 'P3'];
  const regPer = () => S.get('periodes') || {courante: 'P2', clos: {}};
  const periodes = () => { const c = regPer().clos || {}; return NOMS_PER.map(nom => ({nom, clos: c[nom] || ''})); };
  const perActuelle = () => Math.max(0, NOMS_PER.indexOf(regPer().courante));
  // Période d'une croix ou d'une note (les anciennes sans période comptent dans la période en cours)
  const perDe = r => { const i = NOMS_PER.indexOf(r.per); return i >= 0 ? i : perActuelle(); };
  const faits = id => S.tous('fait').filter(f => f.eleve === id);
  const notes = id => S.tous('note').filter(n => n.eleve === id).sort((a, b) => a.quand - b.quand);
  const derniereNote = id => { const n = notes(id); return n.length ? n[n.length - 1] : null; };
  const compte = l => { const o = {prepa: 0, pert: 0, cours: 0}; l.forEach(f => { if (o[f.quoi] != null) o[f.quoi]++; }); return o; };
  const total = c => QS.reduce((s, q) => s + c[q], 0);
  // À noter = ce qui a été coché dans la période en cours depuis la dernière fois que c'est passé sur l'appli de l'école.
  function aNoterListe(id, p = perActuelle()) {
    const dn = derniereNote(id), depuis = dn ? dn.quand : 0;
    return faits(id).filter(f => perDe(f) === p && (f.cree || f.t || 0) > depuis);
  }
  const aNoter = (id, p) => compte(aNoterListe(id, p));
  const resume = c => QS.filter(q => c[q]).map(q => QUOI[q].ico + ' ' + c[q]).join(' · ');
  const resumeLong = c => QS.filter(q => c[q]).map(q => c[q] + ' × ' + QUOI[q].long.toLowerCase()).join(', ');

  // Onglets lisibles dans la feuille Google
  function tables(recs) {
    const E = recs.filter(r => r.type === 'eleve'), F = recs.filter(r => r.type === 'fait'), N = recs.filter(r => r.type === 'note');
    const P = NOMS_PER.map(nom => ({nom})), pc = perActuelle(), pdi = r => { const i = NOMS_PER.indexOf(r.per); return i >= 0 ? i : pc; };
    const cls = ARA_CLASSES.slice(); E.forEach(e => { if (!cls.includes(e.classe)) cls.push(e.classe); });
    const tri = (a, b) => cls.indexOf(a.classe) - cls.indexOf(b.classe) || (a.ordre || 0) - (b.ordre || 0);
    const nomDe = e => e ? e.nom + ' ' + e.prenom : '?';
    const tete = ['Classe', 'Élève'];
    const COL = {prepa: 'prépa pas faite', pert: 'a perturbé', cours: 'pas son cours'};
    P.forEach(p => QS.forEach(q => tete.push(p.nom + ' ' + COL[q])));
    tete.push('Dernière fois noté à l\'école', 'Encore à noter');
    const bilan = [tete];
    E.slice().sort(tri).forEach(e => {
      const fe = F.filter(f => f.eleve === e.id), ne = N.filter(n => n.eleve === e.id).sort((a, b) => a.quand - b.quand);
      const l = [e.classe, nomDe(e) + (e.parti ? ' (parti)' : '')];
      P.forEach((p, i) => { const c = compte(fe.filter(f => pdi(f) === i)); QS.forEach(q => l.push(c[q] || '')); });
      const dn = ne[ne.length - 1], depuis = dn ? dn.quand : 0;
      const an = compte(fe.filter(f => pdi(f) === pc && (f.cree || f.t || 0) > depuis));
      l.push(dn ? dmy(dn.date) : '', resumeLong(an));
      bilan.push(l);
    });
    const journal = [['Date', 'Période', 'Classe', 'Élève', 'Quoi']];
    const lignes = [];
    F.forEach(f => { const e = E.find(x => x.id === f.eleve); const i = pdi(f);
      lignes.push({k: f.date + (f.cree || 0), l: [dmy(f.date), i >= 0 ? P[i].nom : '', e ? e.classe : '', nomDe(e), QUOI[f.quoi] ? QUOI[f.quoi].long : f.quoi]}); });
    N.forEach(n => { const e = E.find(x => x.id === n.eleve); const i = pdi(n);
      lignes.push({k: n.date + n.quand, l: [dmy(n.date), i >= 0 ? P[i].nom : '', e ? e.classe : '', nomDe(e), '✅ Noté sur l\'appli de l\'école' + (n.compte ? ' (' + resumeLong(n.compte) + ')' : '') + (n.texte ? ' : ' + n.texte : '')]}); });
    lignes.sort((a, b) => a.k < b.k ? 1 : -1).forEach(x => journal.push(x.l));
    return {'ARA bilan': bilan, 'ARA journal': journal};
  }

  // ---------- Petites aides d'affichage ----------
  function bulle(t) { const d = document.createElement('div'); d.className = 'bulle'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 1800); }
  function fenetre(html, init) {
    const f = document.createElement('div'); f.className = 'fond';
    f.innerHTML = '<div class="fenetre" role="dialog" aria-modal="true">' + html + '</div>';
    const fermer = () => f.remove();
    f.addEventListener('click', e => { if (e.target === f || e.target.closest('[data-fermer]')) fermer(); });
    document.body.appendChild(f);
    init && init(f.querySelector('.fenetre'), fermer);
    return fermer;
  }
  const initiales = e => ((e.prenom || '?')[0] + (e.nom || '?')[0]).toUpperCase();

  // ---------- Écrans ----------
  let jour = auj();                // jour du cours (modifiable pour rattraper un oubli)
  const vue = $('vue');

  function entete(titre, sous, retour) {
    $('titre').textContent = titre; $('sous-titre').textContent = sous || '';
    const versHappiness = retour === '../';
    $('retour').hidden = !retour; $('logo').hidden = !!retour && !versHappiness;
    $('retour').setAttribute('aria-label', versHappiness ? 'Revenir à Happiness' : 'Retour');
    $('retour').textContent = versHappiness ? '🏠' : '‹';
    $('retour').onclick = () => { if (versHappiness) location.href = '../'; else location.hash = retour; };
  }

  function accueil() {
    jour = auj();
    entete('ARA', 'Suivi des élèves', '../');
    const p = perActuelle(), P = periodes(), per = P[p];
    vue.innerHTML = `
      <p class="periode-du-jour">Aujourd'hui : <b>${esc(joli(auj()))}</b> · période en cours : <b>${esc(per.nom)}</b></p>
      <div class="classes">${classes().map(c => {
        const l = eleves(c), n = l.filter(e => total(aNoter(e.id, p)) > 0).length;
        return `<a href="#c/${encodeURIComponent(c)}"><b>${esc(c)}</b><span>${l.length} élèves</span>${n ? `<span class="anoter">${n} à noter</span>` : ''}</a>`;
      }).join('')}</div>
      <p class="note" style="margin-top:14px">Touche une classe, puis les boutons à côté de chaque élève :<br>📝 n'a pas fait sa prépa · 📢 a perturbé le cours · 📚 n'a pas son cours.<br>Touche le nom d'un élève pour voir tout son récapitulatif.</p>
      ${p < NOMS_PER.length - 1 ? `<button class="btn" id="fin-per" type="button" style="width:100%;margin-top:6px">🏁 La ${esc(per.nom)} est finie : passer à la ${esc(NOMS_PER[p + 1])}</button>` : ''}
      <div class="btns"><a class="btn" href="#reglages" style="text-decoration:none">⚙️ Réglages</a><a class="btn" href="../" style="text-decoration:none">🏠 Happiness</a></div>`;
    if ($('fin-per')) $('fin-per').onclick = terminerPeriode;
  }

  // 🏁 Fin de période : tout ce qui est coché ensuite compte dans la période suivante. Rien n'est effacé.
  function terminerPeriode() {
    const p = perActuelle(), P = periodes(); if (p >= NOMS_PER.length - 1) return;
    const a = P[p].nom, b = NOMS_PER[p + 1];
    fenetre(`<h3>🏁 Terminer la ${esc(a)} ?</h3>
      <p class="note">À partir de maintenant, tout ce que tu coches compte dans la <b>${esc(b)}</b> et les compteurs repartent à zéro. Tout ce qui s'est passé en ${esc(a)} reste dans la fiche de chaque élève.</p>
      <div class="btns"><button class="btn go" id="ok-per" type="button">Oui, passer à la ${esc(b)}</button><button class="btn" data-fermer type="button">Annuler</button></div>`, (f, fermer) => {
      f.querySelector('#ok-per').onclick = () => {
        const r = regPer(); S.put({id: 'periodes', type: 'reglage', courante: b, clos: Object.assign({}, r.clos, {[a]: auj()})});
        fermer(); bulle('C\'est parti pour la ' + b + ' 🎉'); route();
      };
    });
  }

  function classe(c) {
    if (!classes().includes(c)) { location.hash = ''; return; }
    const p = perActuelle(), per = periodes()[p];
    entete(c, eleves(c).length + ' élèves · ' + (per ? per.nom : ''), '#');
    const estAuj = jour === auj();
    vue.innerHTML = `
      <div class="barre">
        <label class="jour${estAuj ? '' : ' pas-auj'}">📅 <span>${estAuj ? "Aujourd'hui" : 'Cours du'} ${esc(joli(jour))}</span><input type="date" id="jour" value="${jour}" aria-label="Jour du cours"></label>
        ${estAuj ? '' : '<button class="btn lien" id="auj" type="button">revenir à aujourd\'hui</button>'}
        <span class="pill">${esc(per ? per.nom : '')}</span>
      </div>
      <div class="legende"><span class="l-prepa">📝 Prépa pas faite</span><span class="l-pert">📢 A perturbé</span><span class="l-cours">📚 Pas son cours</span></div>
      <div class="eleves" id="liste">${eleves(c).map(ligneEleve).join('') || '<p class="vide">Aucun élève dans cette classe.</p>'}</div>
      <p class="note" style="margin:8px 2px 0">Le petit chiffre = combien de fois depuis la dernière fois que tu l'as noté sur l'appli de l'école (période ${esc(per ? per.nom : '')}).</p>
      <div class="bas">
        <button class="btn ok" id="noter" type="button">✅ J'ai noté sur l'appli de l'école…</button>
        <button class="btn" id="ajout" type="button">➕ Ajouter un élève</button>
      </div>`;
    $('jour').onchange = e => { if (e.target.value) { jour = e.target.value; classe(c); } };
    if ($('auj')) $('auj').onclick = () => { jour = auj(); classe(c); };
    $('noter').onclick = () => noterClasse(c);
    $('ajout').onclick = () => modifierEleve(null, c);
  }

  function ligneEleve(e) {
    const p = perActuelle(), an = aNoter(e.id, p), dn = derniereNote(e.id);
    const ici = faits(e.id).filter(f => f.date === jour);
    const bouton = q => {
      const on = ici.some(f => f.quoi === q), n = an[q];
      return `<button class="m ${QUOI[q].cl}${on ? ' on' : ''}" type="button" data-e="${esc(e.id)}" data-q="${q}" aria-pressed="${on}" aria-label="${esc(QUOI[q].long)}">${QUOI[q].ico}${n ? `<span class="n">${n}</span>` : ''}</button>`;
    };
    return `<div class="eleve" id="l-${esc(e.id)}">
      <button class="nom" type="button" data-fiche="${esc(e.id)}"><b>${esc(e.prenom)}</b> <span>${esc(e.nom)}</span>${dn ? `<small class="vu">✅ noté à l'école le ${esc(court(dn.date))}</small>` : ''}</button>
      ${QS.map(bouton).join('')}</div>`;
  }

  // Un toucher = ajoute la croix du jour ; un 2e toucher le même jour = l'enlève (erreur).
  function basculer(id, q, btn) {
    const deja = faits(id).find(f => f.date === jour && f.quoi === q);
    if (deja) { S.del(deja.id); bulle('Enlevé'); }
    else {
      S.put({id: S.id(), type: 'fait', eleve: id, quoi: q, date: jour, cree: Date.now(), per: NOMS_PER[perActuelle()]});
      const e = eleve(id); bulle(QUOI[q].ico + ' ' + (e ? e.prenom : '') + ' : ' + QUOI[q].long.toLowerCase());
    }
    const l = $('l-' + id);
    if (l) { l.outerHTML = ligneEleve(eleve(id)); const b = document.querySelector(`#l-${CSS.escape(id)} [data-q="${q}"]`); if (b) b.classList.add('pop'); }
  }

  function noterClasse(c) {
    const p = perActuelle(), l = eleves(c).map(e => ({e, an: aNoter(e.id, p)})).filter(x => total(x.an) > 0);
    if (!l.length) { fenetre('<h3>Rien à noter</h3><p class="note">Tout ce qui a été coché dans cette classe est déjà noté sur l\'appli de l\'école.</p><div class="btns"><button class="btn go" data-fermer type="button">OK</button></div>'); return; }
    fenetre(`<h3>✅ Noté sur l'appli de l'école</h3>
      <p class="note">Coche les élèves pour qui tu as mis une remarque. Tout ce qui a été coché jusqu'ici reste dans leur fiche, et leurs compteurs repartent à zéro.</p>
      ${l.map(x => `<label class="choix"><input type="checkbox" value="${esc(x.e.id)}" checked><span class="q"><b>${esc(x.e.prenom)} ${esc(x.e.nom)}</b><small>${esc(resume(x.an))}</small></span></label>`).join('')}
      <div class="btns"><button class="btn ok" id="ok-noter" type="button">C'est noté</button><button class="btn" data-fermer type="button">Annuler</button></div>`, (f, fermer) => {
      f.querySelector('#ok-noter').onclick = () => {
        const ids = [...f.querySelectorAll('input:checked')].map(i => i.value);
        const t = Date.now();
        ids.forEach(id => S.put({id: S.id(), type: 'note', eleve: id, quand: t, date: auj(), compte: aNoter(id, p), texte: '', per: NOMS_PER[p]}));
        fermer(); bulle(ids.length + ' élève' + (ids.length > 1 ? 's' : '') + ' noté' + (ids.length > 1 ? 's' : '') + ' ✅'); classe(c);
      };
    });
  }

  function noterEleve(id) {
    const e = eleve(id), an = aNoter(id);
    fenetre(`<h3>✅ ${esc(e.prenom)} : noté sur l'appli de l'école</h3>
      <p class="note">${total(an) ? 'À noter : ' + esc(resumeLong(an)) + '.' : 'Rien de nouveau depuis la dernière fois, mais tu peux quand même garder une trace.'}<br>Tout ce qui a été coché jusqu'ici reste dans la fiche, et le compteur repart à zéro.</p>
      <label for="txt">Ce que tu as écrit (facultatif)</label>
      <textarea id="txt" rows="3" placeholder="Ex. : remarque au journal de classe"></textarea>
      <div class="btns"><button class="btn ok" id="ok-noter" type="button">C'est noté</button><button class="btn" data-fermer type="button">Annuler</button></div>`, (f, fermer) => {
      f.querySelector('#ok-noter').onclick = () => {
        S.put({id: S.id(), type: 'note', eleve: id, quand: Date.now(), date: auj(), compte: an, texte: f.querySelector('#txt').value.trim(), per: NOMS_PER[perActuelle()]});
        fermer(); bulle('Noté ✅'); fiche(id);
      };
    });
  }

  function fiche(id) {
    const e = eleve(id); if (!e) { location.hash = ''; return; }
    entete(e.classe, e.parti ? 'Ne fait plus partie de la liste' : 'Fiche de l\'élève', '#c/' + encodeURIComponent(e.classe));
    const P = periodes(), pa = perActuelle(), F = faits(id), N = notes(id), an = aNoter(id, pa);
    const tout = compte(F);
    const cpt = c => `<div class="compteurs">${QS.map(q => `<div class="c-${QUOI[q].cl}"><b>${c[q]}</b>${esc(QUOI[q].long)}</div>`).join('')}</div>`;
    const ligneF = f => `<div class="ligne"><span class="d">${esc(joli(f.date))}</span><span class="q">${QUOI[f.quoi] ? QUOI[f.quoi].ico + ' ' + esc(QUOI[f.quoi].long) : esc(f.quoi)}</span><button class="x" type="button" data-sup="${esc(f.id)}" aria-label="Supprimer">✕</button></div>`;
    const ligneN = n => `<div class="ligne notif"><span class="q">✅ Noté sur l'appli de l'école le ${esc(joli(n.date))}${n.compte && total(n.compte) ? ' : ' + esc(resume(n.compte)) : ''}${n.texte ? `<small>« ${esc(n.texte)} »</small>` : ''}</span><button class="x" type="button" data-supn="${esc(n.id)}" aria-label="Supprimer">✕</button></div>`;
    const blocs = P.map((p, i) => {
      const fp = F.filter(f => perDe(f) === i), np = N.filter(n => perDe(n) === i);
      // Tout, du plus récent au plus ancien ; une note « noté à l'école » se place à son moment
      const l = fp.map(f => ({k: f.date + '|' + String(f.cree || f.t || 0).padStart(15, '0'), h: ligneF(f)}))
        .concat(np.map(n => ({k: n.date + '|' + String(n.quand).padStart(15, '0') + 'z', h: ligneN(n)})))
        .sort((a, b) => a.k < b.k ? 1 : -1);
      if (i !== pa && !l.length) return '';
      return `<div class="carte per${i === pa ? ' actuelle' : ''}">
        <div class="per-tete"><b>${esc(p.nom)}${i === pa ? ' · en cours' : ''}</b><span>${p.clos ? 'finie le ' + esc(court(p.clos)) : i < pa ? 'finie' : ''}</span></div>
        ${cpt(compte(fp))}
        ${l.length ? l.map(x => x.h).join('') : '<p class="note" style="margin:6px 0 0">Rien pendant cette période 👍</p>'}
      </div>`;
    }).join('');
    vue.innerHTML = `
      <div class="fiche-tete"><div class="avatar">${esc(initiales(e))}</div><div><h2>${esc(e.prenom)} ${esc(e.nom)}</h2><span class="note">${esc(e.classe)}</span></div></div>
      <div class="anoter-bloc">
        <div class="titre">À noter sur l'appli de l'école (${esc(P[pa] ? P[pa].nom : '')})</div>
        <p style="margin:4px 0 8px">${total(an) ? esc(resumeLong(an)) : 'Rien de nouveau depuis la dernière fois.'}</p>
        <button class="btn ok" id="noter" type="button">✅ C'est noté sur l'appli de l'école</button>
      </div>
      <h2>Toute l'année</h2>
      ${cpt(tout)}
      ${blocs}
      <div class="btns"><button class="btn" id="modif" type="button">✏️ Modifier le nom ou la classe</button></div>`;
    $('noter').onclick = () => noterEleve(id);
    $('modif').onclick = () => modifierEleve(id);
  }

  function modifierEleve(id, classeDef) {
    const e = id ? eleve(id) : {classe: classeDef, nom: '', prenom: ''};
    fenetre(`<h3>${id ? '✏️ Modifier l\'élève' : '➕ Nouvel élève'}</h3>
      <label for="pn">Prénom</label><input type="text" id="pn" value="${esc(e.prenom)}" autocomplete="off">
      <label for="nm">Nom</label><input type="text" id="nm" value="${esc(e.nom)}" autocomplete="off">
      <label for="cl">Classe</label><select id="cl">${classes().map(c => `<option${c === e.classe ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select>
      <div class="btns"><button class="btn go" id="ok" type="button">Enregistrer</button><button class="btn" data-fermer type="button">Annuler</button></div>
      ${id ? `<p class="note" style="margin-top:18px">${e.parti ? 'Cet élève ne fait plus partie de la liste.' : 'L\'élève a quitté la classe ? Il disparaît de la liste, mais tout son historique est gardé.'}</p><button class="btn" id="parti" type="button">${e.parti ? '↩️ Le remettre dans la liste' : '🚪 Retirer de la liste'}</button>` : ''}`, (f, fermer) => {
      f.querySelector('#pn').focus();
      f.querySelector('#ok').onclick = () => {
        const prenom = f.querySelector('#pn').value.trim(), nom = f.querySelector('#nm').value.trim(), cl = f.querySelector('#cl').value;
        if (!prenom && !nom) { f.querySelector('#pn').focus(); return; }
        if (id) { S.put(Object.assign({}, e, {prenom, nom, classe: cl})); fermer(); fiche(id); }
        else {
          const ordre = Math.max(0, ...S.tous('eleve').filter(x => x.classe === cl).map(x => x.ordre || 0)) + 1;
          S.put({id: S.id(), type: 'eleve', classe: cl, nom, prenom, ordre}); fermer(); bulle('Ajouté'); classe(cl);
        }
      };
      const bp = f.querySelector('#parti');
      if (bp) bp.onclick = () => { S.put(Object.assign({}, e, {parti: !e.parti})); fermer(); location.hash = e.parti ? '#f/' + id : '#c/' + encodeURIComponent(e.classe); if (e.parti) fiche(id); };
    });
  }

  function reglages() {
    entete('Réglages', 'ARA', '#');
    const P = periodes(), pa = perActuelle();
    const c = (() => { try { return JSON.parse(localStorage.getItem(CFG)) || {}; } catch (e) { return {}; } })(), ok = !!(c.url && c.cle);
    vue.innerHTML = `
      <h2>📅 Les périodes de l'école</h2>
      <div class="carte">
        <p style="margin-top:0">Période en cours : <b>${esc(P[pa].nom)}</b></p>
        ${pa < NOMS_PER.length - 1 ? `<button class="btn go" id="fin-per" type="button">🏁 La ${esc(P[pa].nom)} est finie : passer à la ${esc(NOMS_PER[pa + 1])}</button>` : '<p class="note">C\'est la dernière période de l\'année.</p>'}
        ${pa > 0 && P[pa - 1].clos ? `<p class="note" style="margin:14px 0 4px">Touché par erreur ?</p><button class="btn" id="retour-per" type="button">↩️ Revenir à la ${esc(NOMS_PER[pa - 1])}</button>` : ''}
      </div>
      <h2>📲 Mettre ARA sur l'écran d'accueil</h2>
      <div class="carte note" style="margin-top:0">
        <b>iPhone</b> : ouvre cette page dans <b>Safari</b>, touche <b>Partager</b> (carré avec une flèche), puis <b>« Sur l'écran d'accueil »</b>.<br>
        <b>Android</b> : dans <b>Chrome</b>, menu <b>⋮</b> puis <b>« Ajouter à l'écran d'accueil »</b>.<br>
        L'icône ARA ouvre directement le suivi des élèves. Ça marche aussi sans internet.
      </div>
      <h2>☁️ Feuille Google « ARA »</h2>
      <div class="carte">
        ${ok ? '<p style="margin-top:0"><b>✅ Ce téléphone est relié à la feuille ARA.</b><br><span class="note">Chaque croix y part toute seule (onglets « ARA bilan » et « ARA journal »).</span></p>' : '<p class="note" style="margin-top:0">Les croix restent dans ce téléphone. Relie-le à la feuille Google « ARA » pour les garder aussi sur le Drive (une feuille rien que pour ARA).</p>'}
        <details ${ok ? '' : 'open'}><summary style="font-weight:600;cursor:pointer">${ok ? 'Modifier ou délier' : 'Relier ce téléphone'}</summary>
          <label class="l" for="d-url">Adresse du script</label><input class="champ" id="d-url" value="${esc(c.url || SCRIPT)}" placeholder="https://script.google.com/macros/s/…/exec" autocapitalize="off" spellcheck="false">
          <label class="l" for="d-cle">Mot de passe (le même que celui du Drive de Happiness)</label><input class="champ" id="d-cle" value="${esc(c.cle || cfgHappiness().cle || '')}" autocapitalize="off" spellcheck="false" autocomplete="off">
          <div class="btns"><button class="btn go" id="d-ok" type="button">Relier</button>${ok ? '<button class="btn" id="d-non" type="button">Délier ce téléphone</button>' : ''}</div>
          <p class="note" id="d-etat"></p>
          <details><summary style="cursor:pointer">Première fois : créer la feuille (sur l'ordinateur)</summary><ol class="note">
            <li>Ouvre <a href="https://sheets.new" target="_blank" rel="noopener">sheets.new</a> et nomme la feuille « ARA ».</li>
            <li>Menu <b>Extensions › Apps Script</b>. Efface tout et colle <a href="google/" target="_blank">ce script</a> (bouton « Copier »).</li>
            <li>Ligne <code>const CLE</code> : remplace <code>change-moi</code> par <b>le même mot de passe que Happiness</b>, puis 💾.</li>
            <li><b>Déployer › Nouveau déploiement</b>, roue dentée › <b>Application Web</b>. Exécuter en tant que : <b>Moi</b>. Qui a accès : <b>Tout le monde</b>. Déployer, puis autorise l'accès.</li>
            <li>Copie l'adresse qui finit par <code>/exec</code> et colle-la ici avec le mot de passe. Pareil sur chaque téléphone.</li></ol></details>
        </details>
      </div>`;
    $('d-ok').onclick = async () => {
      const n = {url: $('d-url').value.trim(), cle: $('d-cle').value.trim()}, e = $('d-etat');
      if (!/^https:\/\/script\.google(usercontent)?\.com\/.+/.test(n.url)) { e.textContent = 'Colle l\'adresse complète du script (elle commence par https://script.google.com).'; return; }
      if (!n.cle) { e.textContent = 'Il manque le mot de passe.'; return; }
      e.textContent = 'Vérification…';
      try { await Maison.tester(n, 'ara'); localStorage.setItem(CFG, JSON.stringify(n)); Maison.toutSynchro(); e.textContent = 'C\'est relié ✓'; setTimeout(reglages, 700); }
      catch (err) { e.textContent = /mot de passe/.test(err.message) ? 'Mot de passe refusé (celui de la ligne CLE du script).' : /module/.test(err.message) ? 'Ce n\'est pas le script d\'ARA : colle le script de cette page.' : 'Le script ne répond pas. Vérifie l\'adresse et l\'accès « Tout le monde ».'; }
    };
    if ($('d-non')) $('d-non').onclick = () => { if (confirm('Délier ce téléphone ? Les croix restent dessus.')) { try { localStorage.removeItem(CFG); } catch (er) {} reglages(); } };
    if ($('fin-per')) $('fin-per').onclick = terminerPeriode;
    if ($('retour-per')) $('retour-per').onclick = () => {
      const b = NOMS_PER[pa - 1];
      if (!confirm('Revenir à la ' + b + ' ? Ce qui a déjà été coché en ' + P[pa].nom + ' reste en ' + P[pa].nom + '.')) return;
      const r = regPer(), clos = Object.assign({}, r.clos); delete clos[b];
      S.put({id: 'periodes', type: 'reglage', courante: b, clos}); bulle('Retour à la ' + b); reglages();
    };
  }

  function route() {
    const h = decodeURIComponent(location.hash.slice(1));
    window.scrollTo(0, 0);
    if (h.startsWith('c/')) classe(h.slice(2));
    else if (h.startsWith('f/')) fiche(h.slice(2));
    else if (h === 'reglages') reglages();
    else accueil();
  }

  vue.addEventListener('click', ev => {
    const m = ev.target.closest('.m[data-e]'); if (m) { basculer(m.dataset.e, m.dataset.q, m); return; }
    const fi = ev.target.closest('[data-fiche]'); if (fi) { location.hash = '#f/' + encodeURIComponent(fi.dataset.fiche); return; }
    const sp = ev.target.closest('[data-sup]');
    if (sp) { const f = S.get(sp.dataset.sup); if (f && confirm('Supprimer « ' + QUOI[f.quoi].long + ' » du ' + joli(f.date) + ' ?')) { S.del(f.id); route(); } return; }
    const sn = ev.target.closest('[data-supn]');
    if (sn) { if (confirm('Supprimer cette ligne « noté sur l\'appli de l\'école » ? Les croix d\'avant redeviendront « à noter ».')) { S.del(sn.dataset.supn); route(); } return; }
  });
  addEventListener('hashchange', route);

  S = Maison.store('ara', {cfg: CFG, graines, tables, recu: () => { if (!document.querySelector('.fond')) route(); }});
  Maison.pastille('#reglages', CFG);
  route();

  // Hors ligne et mises à jour : le service worker de Happiness s'occupe aussi d'ARA.
  if ('serviceWorker' in navigator && navigator.onLine) navigator.serviceWorker.register('../sw.js').catch(() => {});
})();
