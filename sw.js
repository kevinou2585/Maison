// Fait marcher l'appli sans internet. Changer VERSION à chaque mise en ligne pour rafraîchir le cache.
// Le Drive (script.google.com) n'est jamais mis en cache : la synchro passe toujours par internet.
const VERSION = 'maison-v46';
const FICHIERS = [
  './', './index.html', './manifest.webmanifest', './sync.js', './citations.js', './sauvegarde.js',
  './jardin/', './courses/', './todo/', './terrain/', './mdp/', './notes/', './installer/', './le-fist/', './essai.html',
  './jdb/', './jdb/donnees.js', './jdb/moteur.js', './jdb/echanges.js', './jdb/app.js', './jdb/plan.html',
  './icones/maison-180.png', './icones/maison-192.png', './icones/maison-512.png',
  './icones/jardin-180.png', './icones/jardin-192.png', './icones/jardin-512.png',
  './icones/courses-180.png', './icones/courses-192.png', './icones/courses-512.png',
  './icones/terrain-180.png', './icones/terrain-192.png', './icones/terrain-512.png',
  './icones/todo-180.png', './icones/todo-192.png', './icones/todo-512.png',
  './icones/mdp-180.png', './icones/mdp-192.png', './icones/mdp-512.png',
  './icones/notes-180.png', './icones/notes-192.png', './icones/notes-512.png',
  './icones/le-fist-180.png', './icones/le-fist-192.png', './icones/le-fist-512.png'
];

self.addEventListener('install', e => {
  // cache 'reload' : on prend les fichiers frais sur le site, jamais une vieille copie du navigateur.
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FICHIERS.map(f => new Request(f, {cache: 'reload'})))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(cles => Promise.all(cles.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Pages du site : d'abord internet (pour avoir la derniere version), sinon la copie gardee.
// Polices Google : la copie gardee d'abord.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Sans reseau (mode avion) : on ne tente meme pas internet, sinon l'iPhone affiche une alerte.
  if (self.navigator && self.navigator.onLine === false) {
    e.respondWith(caches.match(req, {ignoreSearch: true}).then(r => r || Response.error()));
    return;
  }
  const police = url.host === 'fonts.googleapis.com' || url.host === 'fonts.gstatic.com';
  if (police) {
    // Pas encore gardee et reseau trop lent : on continue sans la police plutot que bloquer l'affichage.
    const vide = () => new Response('', {headers: {'Content-Type': url.host === 'fonts.googleapis.com' ? 'text/css' : 'font/woff2'}});
    e.respondWith(caches.match(req).then(r => r || Promise.race([fetch(req).then(rep => {
      const copie = rep.clone(); caches.open(VERSION).then(c => c.put(req, copie)); return rep;
    }).catch(vide), new Promise(ok => setTimeout(() => ok(vide()), 2500))])));
    return;
  }
  if (url.origin !== location.origin) return;
  // Pages du site : la copie du telephone s'ouvre tout de suite (rapide, meme en mode avion).
  // En meme temps, on redemande le site pour garder une copie a jour. Chaque mise en ligne change
  // VERSION : le telephone installe alors la nouvelle version et la page se recharge toute seule.
  const reseau = (req.mode === 'navigate' ? fetch(req.url, {cache: 'no-cache', credentials: 'same-origin'}) : fetch(req, {cache: 'no-cache'}))
    .then(rep => {
      if (rep.ok && !rep.redirected) { const copie = rep.clone(); caches.open(VERSION).then(c => c.put(req, copie)); }
      return rep;
    });
  e.respondWith(caches.match(req, {ignoreSearch: true}).then(copie =>
    copie || reseau.then(rep => (rep.redirected && req.mode === 'navigate') ? Response.redirect(rep.url, 302) : rep)));
  e.waitUntil(reseau.catch(() => {}));
});
