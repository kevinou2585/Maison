// Projets pour le terrain et Pensée permacole : enregistrés avec la Gestion du terrain (module « terrain »).
// Ce fichier donne leurs onglets lisibles de la feuille Google ; il est chargé par terrain/ et par jdb/.
const ECHANGES = (() => {
  const STATUTS = {idee: '💡 Idée', prevu: '📋 Prévu', encours: '🛠️ En cours', fait: '✅ Fait'};
  const ZONES = ['Verger', 'Potager', 'Ornement', 'Terrain', 'Maison', 'Autre'];
  const dt = t => { if (!t) return ''; const d = new Date(t); return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear(); };
  function tables(recs) {
    const P = recs.filter(r => r.type === 'projet'), Pe = recs.filter(r => r.type === 'pensee'), Re = recs.filter(r => r.type === 'reponse');
    const ordre = Object.keys(STATUTS);
    return {
      'Terrain – projets': [['Projet', 'Où', 'Statut', 'Pour quand', 'Étapes faites', 'Étapes', 'Note', 'Proposé par', 'Le'],
        ...P.sort((a, b) => ordre.indexOf(a.statut) - ordre.indexOf(b.statut) || (b.cree || 0) - (a.cree || 0)).map(p => {
          const e = p.etapes || [];
          return [p.titre, p.zone || '', STATUTS[p.statut] || '', p.quand ? p.quand.split('-').reverse().join('/') : '', e.length ? e.filter(x => x.fait).length + ' / ' + e.length : '', e.map(x => (x.fait ? '✓ ' : '○ ') + x.t).join('\n'), p.note || '', p.par || '', dt(p.cree)];
        })],
      'Pensée permacole': [['Sujet', 'Écrit par', 'Le', 'Texte', 'Réponses'],
        ...Pe.sort((a, b) => (b.cree || 0) - (a.cree || 0)).map(p => [p.titre || '', p.par || '', dt(p.cree), p.texte || '',
          Re.filter(r => r.parent === p.id).sort((a, b) => a.cree - b.cree).map(r => (r.par || '?') + ' (' + dt(r.cree) + ') : ' + r.texte).join('\n')])]
    };
  }
  return {STATUTS, ZONES, tables};
})();
