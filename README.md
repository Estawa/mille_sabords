# 🏴‍☠️ Mille Sabords By C. Guilhem

Application Next.js/React/TypeScript (PWA) reproduisant le jeu de dés
Mille Sabords, avec ses cartes d'options.

## 📖 Avant toute chose

**Lire [`CONTEXTE_PROJET.md`](./CONTEXTE_PROJET.md).**

Ce fichier contient l'intégralité des règles verrouillées, la composition
exacte du paquet de cartes, l'architecture technique, l'état des visuels de
cartes et la feuille de route. Il doit être mis à jour à chaque changement
apporté à l'application — c'est la référence unique, à jour, pour reprendre
ce projet sans avoir à tout redemander à l'utilisateur.

## Démarrage

```bash
npm install
npm run dev
```

## Structure rapide

- `lib/engine.ts` — moteur de règles (source de vérité)
- `components/GameApp.tsx` — interface complète
- `public/cards/` — visuels des cartes
- `lib/rules.ts` et `lib/game/moteurMilleSabords.ts` — anciens moteurs, obsolètes, conservés pour référence historique uniquement
