// Padel (appli seule, hors de Happiness) : marche sans internet. Changer VERSION à chaque mise en ligne.
// Dans Happiness, c'est le sw.js de Happiness qui s'en occupe et celui-ci n'est pas utilisé.
const VERSION = 'padel-v23';
const FICHIERS = ['./', './index.html', './app.js', './manifest.webmanifest', './google/', './google/Code.gs',
  './icones/padel-180.png', './icones/padel-192.png', './icones/padel-512.png', './presentation.pdf'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FICHIERS.map(f => new Request(f, {cache: 'reload'})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x.startsWith('padel-') && x !== VERSION).map(x => caches.delete(x)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url); if (url.origin !== location.origin) return;
  if (self.navigator && self.navigator.onLine === false) { e.respondWith(caches.match(req, {ignoreSearch: true}).then(r => r || Response.error())); return; }
  const reseau = fetch(req, {cache: 'no-cache'}).then(rep => { if (rep.ok && !rep.redirected) { const c = rep.clone(); caches.open(VERSION).then(x => x.put(req, c)); } return rep; });
  e.respondWith(caches.match(req, {ignoreSearch: true}).then(c => c || reseau));
  e.waitUntil(reseau.catch(() => {}));
});
