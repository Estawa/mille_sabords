// Le nom du cache DOIT changer à chaque changement de contenu servi hors-ligne
// (icônes, manifest, page racine). C'est ce qui force le nettoyage de l'ancien
// cache et le passage à la nouvelle version. Incrémenter à chaque déploiement.
const CACHE = 'mille-sabords-v2';
const PRECACHE_URLS = ['/', '/manifest.webmanifest', '/icon.svg'];

self.addEventListener('install', (e) => {
  self.skipWaiting(); // active la nouvelle version sans attendre la fermeture de tous les onglets
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE_URLS)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim()) // prend le contrôle des onglets déjà ouverts immédiatement
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  const isNavigation = e.request.mode === 'navigate';

  if (isNavigation) {
    // Page principale : toujours essayer le réseau en premier pour avoir la
    // dernière version ; le cache ne sert que de secours hors-ligne.
    e.respondWith(
      fetch(e.request)
        .then((r) => {
          const copy = r.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return r;
        })
        .catch(() => caches.match(e.request).then((c) => c || caches.match('/')))
    );
    return;
  }

  // Autres ressources (JS/CSS/images) : cache d'abord, réseau en secours.
  e.respondWith(
    caches.match(e.request).then((c) =>
      c || fetch(e.request).then((r) => {
        const copy = r.clone();
        caches.open(CACHE).then((x) => x.put(e.request, copy));
        return r;
      })
    )
  );
});
