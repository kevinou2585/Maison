# Ma maison

Appli de la maison, servie par GitHub Pages et installable sur téléphone et ordinateur :

- `jardin/` : le Jardin du Bonheur (verger, potager, plan, suivi). Page générée par
  `python3 outils/construire-jardin.py <fichier du jardin>.html` à partir du fichier d'origine, qui n'est pas modifié.
- `courses/` : une liste par magasin, à préparer à la maison et cocher au magasin.
- `todo/` : les petites choses à ne pas oublier, avec l'historique de ce qui est fait.
- `le-fist/` : les fléchettes, copiées de l'appli EPS ultime.

Synchro : `sync.js` échange les données avec une feuille Google de ton Drive via le script `google/Code.gs`
(mode d'emploi en tête du script). La feuille garde un onglet lisible par partie, téléchargeable en Excel.

`sw.js` : cache hors ligne. Changer `VERSION` à chaque mise en ligne.
