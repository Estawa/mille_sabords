// Stratégie volontairement simple et robuste : RÉSEAU D'ABORD pour absolument
// tout (page, JS, CSS, images), cache uniquement comme secours hors-ligne.
//
// ⚠️ Historique : la version précédente utilisait "cache d'abord" pour les
// images/CSS/JS, ce qui obligeait à incrémenter manuellement CACHE à CHAQUE
// déploiement pour forcer le rafraîchissement — étape régulièrement oubliée
// (cannon.png, GameApp.tsx, globals.css sont restés bloqués sur d'anciennes
// versions en cache alors que les fichiers avaient bien changé sur le
// serveur). Le réseau-d'abord règle ce problème à la racine : tant que
// l'utilisateur est en ligne, il voit toujours la dernière version déployée,
// sans dépendre d'un incrément de version oublié.
const CACHE = 'mille-sabords-v3';
const PRECACHE_URLS = ['/', '/manifest.webmanifest', '/icon.svg'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE_URLS)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  // Réseau d'abord pour tout, y compris JS/CSS/images : on ne sert le cache
  // que si le réseau échoue (vraiment hors-ligne). Ça garantit de toujours
  // voir la dernière version déployée quand on est en ligne.
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        const copy = r.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return r;
      })
      .catch(() =>
        caches.match(e.request).then((c) => c || (e.request.mode === 'navigate' ? caches.match('/') : undefined))
      )
  );
});
