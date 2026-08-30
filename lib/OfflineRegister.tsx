'use client';
import { useEffect } from 'react';

export default function OfflineRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js').then((reg) => {
      // Vérifie s'il existe une version plus récente du service worker
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'activated') {
            // Une nouvelle version vient de prendre le contrôle : on recharge
            // une seule fois pour afficher le contenu à jour.
            window.location.reload();
          }
        });
      });
    }).catch(() => {});

    // Si un autre onglet déclenche déjà la bascule vers un nouveau SW
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }, []);
  return null;
}
