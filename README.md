# Happiness

Appli de la maison, servie par GitHub Pages et installable sur téléphone et ordinateur :

- `jdb/` : le Jardin du Bonheur, la grande tuile de l'accueil : verger, potager, ornement, gestion du terrain,
  projets pour le terrain et pensée permacole. ⚙️ Paramètres sur chaque page : tuiles et onglets à cacher ou
  renommer, mode modification (✎ 🗑 ＋ partout, blocs texte ou liste à cocher sur n'importe quelle page ; clés jdb:textes/caches/blocs:v1). `donnees.js` (fiches, calendriers, légumes, extraits par
  `outils/extraire-donnees-jardin.js`), `moteur.js` (données, mêmes clés que l'ancien jardin), `app.js` (les écrans).
  `plan.html` est le plan du terrain de l'ancien jardin, seul (`?k=f` verger, `?k=o` ornement), fabriqué par
  `python3 outils/construire-plan.py` depuis `jardin/index.html`.
- `jardin/` : l'ancien Jardin du Bonheur, d'où vient le plan. Page générée par
  `python3 outils/construire-jardin.py <fichier du jardin>.html` à partir du fichier d'origine, qui n'est pas modifié.
- `courses/` : on choisit d'abord 🏡 Maison ou 🛖 Chalet (chacun ses magasins), puis une liste par magasin, à préparer à la maison et cocher au magasin.
- `terrain/` : gestion du terrain, le canevas d'entretien partagé (cette semaine, chaque semaine, chaque mois) avec l'historique.
- `todo/` : To do, d'abord 🏡 Maison (Kevin, Camille, Commun) ou 🛖 Chalet (Maxime, Camille, Commun) : urgent, cette semaine, ce mois-ci, cette année. Quand une période passe sans que ce soit fait, l'appli demande s'il faut passer au niveau suivant ou garder une période de plus ; ce qui est fait part aux archives.
- `notes/` : notes (carnets, étiquettes, recherche), fichiers joints rangés dans un dossier du Drive, import des exports Evernote (.enex).
- `mdp/` : mots de passe, un compte par personne avec son propre code. Chiffrés (PBKDF2 + AES-GCM) avec ce code, sauf si le compte
  choisit une copie lisible dans la feuille. Import de listes (CSV de Chrome, iPhone, Firefox… ou collée).
- `le-fist/` : les fléchettes, copiées de l'appli EPS ultime.

Synchro : `sync.js` échange les données avec une feuille Google de ton Drive via le script `google/Code.gs`
(mode d'emploi en tête du script). La feuille garde un onglet lisible par partie, téléchargeable en Excel.

`sw.js` : cache hors ligne. Changer `VERSION` à chaque mise en ligne.
