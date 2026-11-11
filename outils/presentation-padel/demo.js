// Remplit l'appli avec des données de démonstration (dans le navigateur de test)
module.exports = () => {
  const A = auj(), L = lundi(A), J = (sem, j) => ajJ(L, sem * 7 + j); // j : 0 = lundi
  put(Object.assign(reg(), {prof: 'Jean', lieux: ['Padel Club', 'Terrain 3 (couvert)']}));
  const noms = ['Sophie Martin', 'Lucas Dubois', 'Emma Lambert', 'Noah Peeters', 'Léa Janssens', 'Hugo Maes', 'Camille Leroy', 'Thomas Wouters', 'Julie Renard', 'Maxime Claes'];
  const niv = ['200', '300', '300', 'Débutant', '100', '500', '200', '400', '50', '300'];
  const E = noms.map((n, i) => put({id: 'el' + i, type: 'eleve', nom: n, tel: '+32 47' + (5 + i) + ' 12 3' + i + ' 4' + i, email: n.split(' ')[0].toLowerCase() + '@exemple.be', niveau: niv[i], note: ''}).id);
  const F = {};
  F.s = put({id: 'fo-s', type: 'forfait', eleve: 'el0', seances: 10, prix: 450, nom: '10 séances individuel', date: J(-3, 0), pers: 1, duree: 60}).id;
  F.l = put({id: 'fo-l', type: 'forfait', eleve: 'el1', seances: 10, prix: 270, nom: '10 séances à 2', date: J(-3, 1), pers: 2, duree: 60}).id;
  F.e = put({id: 'fo-e', type: 'forfait', eleve: 'el2', seances: 10, prix: 270, nom: '10 séances à 2', date: J(-3, 1), pers: 2, duree: 60}).id;
  F.t = put({id: 'fo-t', type: 'forfait', eleve: 'el7', seances: 10, prix: 450, nom: '10 séances individuel', date: J(-6, 3), pers: 1, duree: 60}).id;
  const P = [['el0', 450, J(-3, 0), 'Virement', 'Forfait 10 séances'], ['el1', 270, J(-3, 1), 'Payconiq', 'Forfait'], ['el2', 135, J(-3, 1), 'Cash', 'Moitié du forfait'], ['el7', 450, J(-6, 3), 'Virement', 'Forfait'], ['el3', 50, J(-1, 4), 'Cash', ''], ['el5', 30, J(-2, 2), 'Bancontact', '']];
  P.forEach((p, i) => put({id: 'pa' + i, type: 'paiement', eleve: p[0], montant: p[1], date: p[2], mode: p[3], note: p[4]}));
  let n = 0;
  const cours = (date, debut, el, lieu, cr, duree) => {
    const f = {}; el.forEach(e => { f[e] = e === 'el0' ? {forfait: F.s} : e === 'el1' ? {forfait: F.l} : e === 'el2' ? {forfait: F.e} : e === 'el7' ? {forfait: F.t} : {prix: prixUnite(el.length, duree || 60)}; });
    put({id: 'co' + (n++), type: 'cours', date, debut, duree: duree || 60, eleves: el, f, statut: 'prevu', lieu: lieu || 'Padel Club', note: '', cr: cr ? {g: cr, p: {}} : undefined});
  };
  for (let s = -3; s <= 3; s++) {
    cours(J(s, 0), '18:00', ['el0'], 0, s < 0 ? ['Bandeja : bon geste, à travailler la hauteur de frappe.', 'Sortie de vitre en coup droit, placement au filet.', 'Vibora et smash par 3. Très bonne séance !'][s + 3] : '');
    cours(J(s, 1), '19:00', ['el1', 'el2'], 0, s < 0 ? 'Jeu à deux : communication, lobs défensifs, changement de côté.' : '');
    if (s >= -2) cours(J(s, 3), '12:00', ['el7'], 'Terrain 3 (couvert)');
  }
  cours(J(-1, 4), '17:00', ['el3']); cours(J(-2, 2), '09:00', ['el5', 'el6']); cours(J(0, 4), '17:00', ['el3', 'el4', 'el8']); cours(J(1, 2), '09:00', ['el5', 'el6']);
  cours(J(1, 5), '14:00', ['el9', 'el3', 'el4', 'el8'], 0, '', 90);
  // Académie (mercredi 14h-16h et samedi 10h-12h) et un rendez-vous
  ['aca-me', 'aca-sa'].forEach((sr, k) => { for (let s = -2; s < 10; s++) put({id: sr + s, type: 'occupe', genre: 'academie', titre: k ? 'Académie · 8-11 ans' : 'Académie · 12-15 ans', date: J(s, k ? 5 : 2), debut: k ? '10:00' : '14:00', duree: 120, lieu: 'Padel Club', note: '', serie: sr}); });
  put({id: 'rdv1', type: 'occupe', genre: 'autre', titre: 'Réunion du club', date: J(1, 3), debut: '20:00', duree: 90, lieu: '', note: ''});
  // Créneaux ouverts sur la page de réservation
  for (let s = 0; s <= 3; s++) [[0, ['09:00', '10:00', '11:00']], [1, ['10:00', '11:00', '16:00', '17:00']], [3, ['16:00', '17:00', '18:00']], [4, ['09:00', '10:00', '11:00', '15:00', '16:00']]].forEach(([j, h]) => { const d = J(s, j); if (d > A) setOuv(d, h); });
  return 'ok';
};
