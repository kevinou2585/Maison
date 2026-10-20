#!/usr/bin/env python3
"""Fabrique jdb/plan.html : le plan du terrain de l'ancien Jardin du Bonheur, seul, dans le nouveau jardin.

    python3 outils/construire-plan.py      (après outils/construire-jardin.py)

Même plan, mêmes outils, mêmes données (plan:v2, plan:orn:v2, jdb:fond:v1) que jardin/index.html.
plan.html?k=f montre le plan des fruitiers, plan.html?k=o celui de l'ornement.
Ajouts : retour vers le nouveau jardin, fiche et page de l'arbre dans le nouveau jardin, zoom à deux doigts.
"""
import pathlib
import sys

racine = pathlib.Path(__file__).resolve().parent.parent
src = (racine / "jardin" / "index.html").read_text(encoding="utf-8")
out = racine / "jdb" / "plan.html"


def remplacer(s, avant, apres, n=1):
    if s.count(avant) < 1:
        sys.exit(f"introuvable dans jardin/index.html : {avant[:60]!r}")
    return s.replace(avant, apres, n)


STYLE = """
/* Plan seul, dans le nouveau Jardin du Bonheur */
header.hero,nav.tabs,#bk,#bk+div,main>p.mut,#v1,#v2,#v3,#v6,#v7,#v8,#v9,#v10{display:none!important}
.plan-haut{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:calc(6px + env(safe-area-inset-top,0px)) 0 8px}
.plan-haut a{font:600 15px system-ui,-apple-system,sans-serif;color:inherit;text-decoration:none;padding:8px 12px;border:1px solid #0002;border-radius:12px;background:#fff8}
.plan-haut a[aria-current]{background:#2e6b3f;color:#fff;border-color:#2e6b3f}
.plan-haut .ret{border:0;background:none;padding:8px 0;opacity:.75}
a.ficheA{display:inline-block;text-decoration:none}
"""

HAUT = """<div class="plan-haut"><a class="ret" id="plan-ret" href="./#verger/arbres">‹ Jardin du Bonheur</a><a id="plan-f" href="plan.html?k=f">🍎 Plan du verger</a><a id="plan-o" href="plan.html?k=o">🌸 Plan de l'ornement</a></div>"""

FIN = r"""<script>
// Le plan choisi par l'adresse, et les fiches ouvertes dans le nouveau jardin
(() => {
  const k = new URLSearchParams(location.search).get('k') === 'o' ? 'o' : 'f';
  document.getElementById('plan-' + k).setAttribute('aria-current', 'page');
  document.getElementById('plan-ret').href = k === 'o' ? './#ornement/plantes' : './#verger/arbres';
  document.title = k === 'o' ? "Plan de l'ornement" : 'Plan du verger';
  show(k === 'o' ? 'v5' : 'v4', 3);
  const id = +new URLSearchParams(location.search).get('id');
  if (id && PL[k === 'o' ? 1 : 0]) setTimeout(() => PL[k === 'o' ? 1 : 0].pick(id, true), 300);
  openFiche = (kk, id) => { location.href = './#' + (kk === 'o' ? 'ornement' : 'verger') + '/fiche/' + encodeURIComponent(id); };
  // Zoom à deux doigts sur le téléphone : on le traduit en molette, que le plan sait déjà gérer
  let d0 = null;
  const dist = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  const mw = document.getElementById(k === 'o' ? 'omw' : 'mw');
  mw.addEventListener('touchstart', e => { if (e.touches.length === 2) d0 = dist(e.touches); }, {passive: true});
  mw.addEventListener('touchmove', e => {
    if (!d0 || e.touches.length !== 2) return;
    e.preventDefault();
    const d = dist(e.touches);
    if (Math.abs(d - d0) < 4) return;
    const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2, cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    mw.dispatchEvent(new WheelEvent('wheel', {deltaY: -Math.log(d / d0) / 0.0015, clientX: cx, clientY: cy, bubbles: true, cancelable: true}));
    d0 = d;
  }, {passive: false});
  mw.addEventListener('touchend', e => { if (e.touches.length < 2) d0 = null; });
})();
</script>
"""

s = src
s = remplacer(s, "<title>Jardin du Bonheur</title>", "<title>Plan du jardin</title>")
s = remplacer(s, "</style></head>", STYLE + "</style></head>")
s = remplacer(s, '<a class="maison-retour" href="../">‹ Happiness</a>', HAUT)
# Dans le panneau d'un arbre : un lien vers sa page dans le nouveau jardin (suivi, carnet, photos)
s = remplacer(s, '<div class=tb><button ${I("g1")}>',
              '<div class=tb><a class="bt ficheA" href="./#${P.fk==="f"?"verger/arbre":"ornement/plante"}/${t.id}">🌳 Ouvrir sa fiche</a><button ${I("g1")}>')
# Les onglets lisibles de la feuille sont écrits par le nouveau jardin (plus complets) : le plan n'en écrit pas
s = remplacer(s, "  tables() {\n    if (typeof PL === 'undefined' || PL.length < 2) return null;", "  tables() {\n    return null;\n    if (typeof PL === 'undefined' || PL.length < 2) return null;")
s = remplacer(s, "</script></main></body></html>", "</script>" + FIN + "</main></body></html>")
out.write_text(s, encoding="utf-8")
print(out, len(s))
