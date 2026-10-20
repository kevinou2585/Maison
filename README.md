# Happiness

Appli de la maison, servie par GitHub Pages et installable sur téléphone et ordinateur :

- `jardin/` : le Jardin du Bonheur (verger, potager, plan, suivi). Page générée par
  `python3 outils/construire-jardin.py <fichier du jardin>.html` à partir du fichier d'origine, qui n'est pas modifié.
- `courses/` : une liste par magasin, à préparer à la maison et cocher au magasin.
- `terrain/` : gestion du terrain, le canevas d'entretien partagé (cette semaine, chaque semaine, chaque mois) avec l'historique.
- `todo/` : To do en trois listes (Kevin, Camille, Commun) : urgent, cette semaine, ce mois-ci, cette année. Quand une période passe sans que ce soit fait, l'appli demande s'il faut passer au niveau suivant ou garder une période de plus ; ce qui est fait part aux archives.
- `notes/` : notes (carnets, étiquettes, recherche), fichiers joints rangés dans un dossier du Drive, import des exports Evernote (.enex).
- `mdp/` : mots de passe (site, identifiant, mot de passe), derrière un code dont seule l'empreinte est dans le code.
- `le-fist/` : les fléchettes, copiées de l'appli EPS ultime.

Synchro : `sync.js` échange les données avec une feuille Google de ton Drive via le script `google/Code.gs`
(mode d'emploi en tête du script). La feuille garde un onglet lisible par partie, téléchargeable en Excel.

`sw.js` : cache hors ligne. Changer `VERSION` à chaque mise en ligne.
