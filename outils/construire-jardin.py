#!/usr/bin/env python3
"""Fabrique jardin/index.html à partir du fichier du Jardin du Bonheur, sans toucher à l'original.

    python3 outils/construire-jardin.py chemin/vers/test-jardin-du-bonheur.html

Ajouts : icône et installation de l'appli, lien « Happiness », synchro Drive (../sync.js),
réglages pour petit écran, et les onglets lisibles envoyés à la feuille Google.
"""
import pathlib
import sys

src = pathlib.Path(sys.argv[1]).read_text(encoding="utf-8")
out = pathlib.Path(__file__).resolve().parent.parent / "jardin" / "index.html"


def remplacer(s, avant, apres, n=1):
    if s.count(avant) < 1:
        sys.exit(f"introuvable dans le fichier source : {avant[:60]!r}")
    return s.replace(avant, apres, n)


TETE = """<link rel="manifest" href="../manifest.webmanifest">
<link rel="icon" href="../icones/jardin-192.png">
<link rel="apple-touch-icon" href="../icones/maison-180.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Happiness">
<meta name="theme-color" content="#2e6b3f">
<title>Jardin du Bonheur</title>"""

STYLE = """
/* Happiness : retour à l'accueil et petits écrans */
.maison-retour{display:inline-block;margin:calc(6px + env(safe-area-inset-top,0px)) 0 0;font:600 14px system-ui,-apple-system,sans-serif;color:inherit;opacity:.7;text-decoration:none}
#maison-maj{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(14px + env(safe-area-inset-bottom,0px));z-index:9999;display:flex;gap:10px;align-items:center;background:#1f3b29;color:#fff;padding:10px 14px;border-radius:14px;font:600 14px system-ui,-apple-system,sans-serif;box-shadow:0 4px 18px #0005;max-width:calc(100vw - 24px)}
#maison-maj button{font:inherit;border:0;border-radius:9px;padding:7px 12px;background:#fff;color:#1f3b29}
html,body{touch-action:manipulation}
/* Sur le plan : la petite flèche, plus précise que la main (demande de Kevin) */
#mw,#mw *,#omw,#omw *{cursor:default!important}
@media (max-width:640px){
  html,body{overflow-x:hidden}
  .tbl{overflow-x:auto;-webkit-overflow-scrolling:touch}
  input,select,textarea{font-size:16px}
}
"""

SYNCHRO = r"""<script src="../sync.js"></script>
<script>
// Synchro Drive du Jardin : chaque clé enregistrée par le jardin part dans la feuille Google.
window.MAISON_JARDIN = Maison.jardin({
  cles: /^(plan:v2|plan:orn:v2|verger:edit:v1|suivi:v1|jdb:fond:v1|ph:.*)$/,
  plein: () => { const m = document.getElementById('bm'); if (m) m.textContent = "Mémoire du téléphone pleine : certaines photos du Drive n'ont pas pu être copiées ici."; },
  recu(ids, premier) {
    // Au démarrage, on recharge tout de suite ; ensuite on propose, pour ne pas couper une saisie.
    const auDebut = premier || performance.now() < 6000;
    let deja = false; try { deja = sessionStorage.getItem('maison:jardin:rech') === '1'; } catch (e) {}
    if (auDebut && !deja) { try { sessionStorage.setItem('maison:jardin:rech', '1'); } catch (e) {} location.reload(); return; }
    if (document.getElementById('maison-maj')) return;
    const d = document.createElement('div'); d.id = 'maison-maj';
    d.innerHTML = '<span>☁️ Nouvelles modifications reçues du Drive</span><button type="button">Afficher</button>';
    d.querySelector('button').onclick = () => location.reload();
    document.body.appendChild(d);
  },
  tables() {
    if (typeof PL === 'undefined' || PL.length < 2) return null;
    const FORME = {BT: 'Basse-tige', MT: 'Mi-tige', DT: 'Demi-tige', HT: 'Haute-tige', CO: 'Conteneur / colonne'};
    const plan = (i, k, ST) => PL[i].T.slice().sort((a, b) => (+a.n || 1e9) - (+b.n || 1e9) || a.id - b.id).map(t => {
      const f = ficheOf(k, t);
      return [+t.n ? String(t.n) : '', t.name || 'À identifier', FORME[t.sz] || t.sz || '', (ST[t.st] || [''])[0], f ? f.a[0] : '', f ? f.a[1] : '', t.x != null ? 'Oui' : 'Pas encore', t.note || ''];
    });
    const tete = ['N°', 'Arbre / variété', 'Forme', 'Statut', 'Groupe', 'Fiche liée', 'Placé sur le plan', 'Note'];
    const nom = (k, id) => { const t = PL[k === 'f' ? 0 : 1].T.find(x => String(x.id) === String(id)); return t ? [+t.n ? String(t.n) : '', t.name || 'À identifier'] : ['', '(supprimé du plan)']; };
    const dt = s => s ? String(s).split('-').reverse().join('/') : '';
    const suivi = [];
    Object.keys(SVD).sort().forEach(y => Object.keys(SVD[y] || {}).forEach(key => {
      const [k, id] = key.split(':'), r = SVD[y][key] || {};
      if (!Object.keys(r).length) return;
      suivi.push([y, k === 'f' ? 'Fruitiers' : 'Ornement', ...nom(k, id), dt(r.t), dt(r.r), r.rec || '', r.vig || '', r.mal || '', r.note || '']);
    }));
    return {
      'Verger – mes arbres': [tete, ...plan(0, 'f', ST1)],
      'Ornement – mes plantes': [tete, ...plan(1, 'o', ST2)],
      'Fiches fruitiers': [['Groupe', 'Nom', 'Floraison', 'Récolte', 'Soins', 'Pollinisation', 'Taille', 'À vérifier'], ...ficheList('f').map(x => x.a.slice(0, 8))],
      'Fiches ornement': [['Groupe', 'Nom', 'Floraison', 'Taille', 'Entretien', 'À savoir'], ...ficheList('o').map(x => x.a.slice(0, 6))],
      'Suivi des arbres': [['Année', 'Plan', 'N°', 'Arbre', 'Taillé le', 'Récolté le', 'Récolte', 'Vigueur', 'Maladies', 'Note'], ...suivi]
    };
  }
});
Maison.pastille();
</script>
"""

s = src
# Le titre « Test » devient le vrai nom dans l'appli
s = remplacer(s, "<title>Test jardin du bonheur</title>", TETE)
s = remplacer(s, '<header class="hero"><h1>Test jardin du bonheur</h1>', '<a class="maison-retour" href="../">‹ Happiness</a><header class="hero"><h1>Jardin du Bonheur</h1>')
s = remplacer(s, "</style></head>", STYLE + "</style></head>")
s = remplacer(s, "<script>\nconst N={", SYNCHRO + "<script>\nconst N={")
# Forme libre : en lâchant un point, la forme se décalait de quelques cm (arrondi au 10 cm du centre et des points séparément)
s = remplacer(s, 'o.p=o.p.map(([x,y])=>[r1(x-cx),r1(y-cy)]);o.x=r1(o.x+cx*Math.cos(a)-cy*Math.sin(a));o.y=r1(o.y+cx*Math.sin(a)+cy*Math.cos(a));', 'const r3=v=>Math.round(v*1000)/1000;o.p=o.p.map(([x,y])=>[r3(x-cx),r3(y-cy)]);o.x=r3(o.x+cx*Math.cos(a)-cy*Math.sin(a));o.y=r3(o.y+cx*Math.sin(a)+cy*Math.cos(a));')
out.write_text(s, encoding="utf-8")
print(out, len(s))
