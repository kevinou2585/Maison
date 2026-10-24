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
/* Verrou du plan du verger : sans le code, on regarde mais on ne change rien */
.plan-haut button.verrou{font:600 15px system-ui,-apple-system,sans-serif;padding:8px 12px;border:1px solid #0002;border-radius:12px;background:#fff8;color:inherit;margin-left:auto}
.plan-haut button.verrou.ouvert{background:#fde9b8}
.plan-verrou #bA,.plan-verrou #oA,.plan-verrou #bS,.plan-verrou #bP,.plan-verrou #bX,.plan-verrou #bU,.plan-verrou #bV,.plan-verrou #bF,.plan-verrou #bR,.plan-verrou label:has(>#bI){display:none!important}
.plan-verrou #sh input,.plan-verrou #sh select,.plan-verrou #sh textarea,.plan-verrou #sh button:not(.x){pointer-events:none;opacity:.5}
/* Zoom et déplacement au doigt : boutons sur le côté du plan */
.nav-plan{position:fixed;right:calc(8px + env(safe-area-inset-right,0px));top:50%;transform:translateY(-50%);z-index:40;display:grid;grid-template-columns:repeat(3,40px);grid-auto-rows:40px;gap:4px}
.nav-plan button{width:40px;height:40px;padding:0;border-radius:12px;border:1px solid #0003;background:#fffe;box-shadow:0 2px 6px #0003;font:700 20px system-ui,sans-serif;color:#234;touch-action:manipulation}
.nav-plan button:active{background:#d8efdc}
.nav-plan .zp{grid-column:3}.nav-plan .ha{grid-column:2}.nav-plan .ga{grid-column:1}.nav-plan .dr{grid-column:3}.nav-plan .ba{grid-column:2}
.nav-plan .aj{grid-column:1/-1;width:auto;font-size:13px}
@media (min-width:900px) and (pointer:fine){.nav-plan{display:none}}
"""

HAUT = """<div class="plan-haut"><a class="ret" id="plan-ret" href="./#verger/arbres">‹ Jardin du Bonheur</a><a id="plan-f" href="plan.html?k=f">🍎 Plan du verger</a><a id="plan-o" href="plan.html?k=o">🌸 Plan de l'ornement</a><button type="button" class="verrou" id="plan-verrou" hidden></button></div>
<div class="nav-plan" id="nav-plan"><button class="zm" type="button" data-z="-1" aria-label="Dézoomer">−</button><button class="ha" type="button" data-p="0,-1" aria-label="Monter">↑</button><button class="zp" type="button" data-z="1" aria-label="Zoomer">＋</button><button class="ga" type="button" data-p="-1,0" aria-label="Aller à gauche">←</button><button class="dr" type="button" data-p="1,0" aria-label="Aller à droite">→</button><button class="ba" type="button" data-p="0,1" aria-label="Descendre">↓</button><button class="aj" type="button" data-aj="1">Ajuster</button></div>"""

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
  // Boutons ＋ / − et flèches : zoom au centre de la partie visible du plan, déplacement d'un tiers d'écran
  const centre = () => { const r = mw.getBoundingClientRect(), x0 = Math.max(r.left, 0), x1 = Math.min(r.right, innerWidth), y0 = Math.max(r.top, 0), y1 = Math.min(r.bottom, innerHeight);
    return [(x0 + x1) / 2, (y0 + y1) / 2]; };
  document.getElementById('nav-plan').onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.aj) { document.getElementById((k === 'o' ? 'o' : '') + 'zf').click(); return; }
    if (b.dataset.z) { const [cx, cy] = centre(); mw.dispatchEvent(new WheelEvent('wheel', {deltaY: -b.dataset.z * 220, clientX: cx, clientY: cy, bubbles: true, cancelable: true})); return; }
    const [dx, dy] = b.dataset.p.split(',').map(Number), r = mw.getBoundingClientRect();
    const sx = dx * Math.min(r.width, innerWidth) / 3, sy = dy * Math.min(r.height, innerHeight) / 3;
    const l = mw.scrollLeft, t = mw.scrollTop; mw.scrollBy({left: sx, top: sy, behavior: 'smooth'});
    setTimeout(() => { if (sy && mw.scrollTop === t) scrollBy({top: sy, behavior: 'smooth'}); if (sx && mw.scrollLeft === l) scrollBy({left: sx, behavior: 'smooth'}); }, 350);
  };
  // Verrou du plan du verger : un code (123 par défaut) pour ajouter, enlever ou déplacer un arbre.
  // Ouvert pour la session du navigateur seulement ; le code se change une fois le plan ouvert.
  if (k === 'f') {
    const host = document.getElementById('v4'), bv = document.getElementById('plan-verrou');
    const code = () => { try { return localStorage.getItem('jdb:plan-code') || '123'; } catch (e) { return '123'; } };
    let ouvert = false; try { ouvert = sessionStorage.getItem('jdb:plan-ouvert') === '1'; } catch (e) {}
    const maj = () => { host.classList.toggle('plan-verrou', !ouvert); bv.hidden = false; bv.classList.toggle('ouvert', ouvert);
      bv.textContent = ouvert ? '🔓 Modification ouverte · Verrouiller' : '🔒 Modifier le plan'; };
    bv.onclick = () => {
      if (ouvert) {
        const n = prompt('Le plan va être verrouillé.\nPour changer le code, écris le nouveau code ici (sinon laisse vide) :', '');
        if (n && n.trim()) { try { localStorage.setItem('jdb:plan-code', n.trim()); } catch (e) {} alert('Nouveau code enregistré sur cet appareil.'); }
        ouvert = false; try { sessionStorage.removeItem('jdb:plan-ouvert'); } catch (e) {} maj(); return;
      }
      const c = prompt('Code pour modifier le plan du verger :', ''); if (c == null) return;
      if (c.trim() !== code()) { alert('Code incorrect : le plan reste verrouillé.'); return; }
      ouvert = true; try { sessionStorage.setItem('jdb:plan-ouvert', '1'); } catch (e) {} maj();
    };
    // verrouillé : on peut toucher un arbre pour voir sa fiche, mais pas le faire glisser ni l'effacer
    mw.addEventListener('pointermove', e => { if (!ouvert) e.stopPropagation(); }, true);
    addEventListener('keydown', e => { if (!ouvert && (e.key === 'Delete' || e.key === 'Backspace') && !e.target.closest('input,textarea,select')) { e.stopPropagation(); e.preventDefault(); } }, true);
    maj();
  }
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
