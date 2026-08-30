# 🏴‍☠️ Mille Sabords By C. Guilhem — Contexte du projet

> **Ce fichier doit être relu en premier par toute IA reprenant ce projet.**
> **Il doit être mis à jour à chaque changement apporté à l'application** (règles,
> moteur, interface, assets). Ne pas le laisser devenir obsolète : une info
> fausse ici est pire que pas d'info du tout.

Dernière mise à jour : v1.1 (correction du service worker qui gardait indéfiniment l'ancienne version en cache).

---

## 1. Identité du projet

- Nom exact, à conserver tel quel sur chaque page : **🏴‍☠️ Mille Sabords By C. Guilhem**
- Icône/identité visuelle : le drapeau pirate 🏴‍☠️
- Stack : Next.js / React / TypeScript, PWA (offline-first), déploiement visé GitHub + Vercel
- Propriétaire du projet : Christophe Guilhem (voir mémoire assistant `/areas/mille-sabords.md` pour le contexte personnel)

## 2. Principe de développement (à respecter impérativement)

- **Ne jamais inventer une règle ou une valeur incertaine.** Si un doute existe,
  demander une photo de la carte physique concernée ou une confirmation
  explicite. Une hypothèse provisoire doit toujours être signalée comme telle
  (à l'utilisateur ET dans ce fichier), jamais présentée comme un fait vérifié.
- Ne pas repartir de zéro sur le moteur ou l'architecture sans raison
  documentée ici.
- Le moteur de règles (`lib/engine.ts`) doit rester strictement séparé de
  l'interface (`components/GameApp.tsx`).

## 3. Composition exacte du paquet de cartes (VERROUILLÉE, confirmée par l'utilisateur)

**39 cartes au total**, réparties ainsi (hors 2 cartes Résumé qui donnent juste
le barème des combinaisons et ne sont pas des cartes Pirate) :

### Cartes de base (29)
| Carte | Effectif |
|---|---|
| Pirate | 3 |
| Île au Trésor (« Coffre ») | 3 |
| Pièce d'or | 3 |
| Diamant | 3 |
| Animaux | 3 |
| Gardienne | 3 |
| Tête de Mort ×1 | 3 |
| Tête de Mort ×2 | 2 |
| Bateau Pirate — 2 sabres / bonus-pénalité 300 pts | 2 |
| Bateau Pirate — 3 sabres / bonus-pénalité 500 pts | 2 |
| Bateau Pirate — 4 sabres / bonus-pénalité 1000 pts | 2 |

⚠️ Il n'existe **pas** de version "1 sabre" du Bateau Pirate. Une version à
250 pts a été créée puis retirée après correction par l'utilisateur — ne pas
la réintroduire.

### Cartes d'options (10) — activables individuellement ou en bloc avant la partie
| Carte | Effectif |
|---|---|
| Attaque de Zombies | 3 |
| La Paix | 4 |
| Naufrage | 3 |

Cette composition est implémentée dans `lib/engine.ts` via `BASE_DECK_COUNTS`
et `OPTION_DECK_COUNTS`. Elle a été vérifiée par exécution (`buildBaseDeck().length === 29`,
`buildDeck(toutes options).length === 39`).

## 4. Règles officielles verrouillées

Sources : cartes physiques de l'utilisateur (texte officiel photographié) +
règle complète Gigamic (site officiel, capturé en plusieurs pages).

### Déroulement général
- 2 à 5 joueurs, un·e Capitaine note les scores.
- Révéler la carte du dessus de la pioche, la poser face visible, lancer les
  8 dés (premier lancer **toujours** à 8 dés).
- Relance : mettre de côté les dés à garder (sans changer leur face), relancer
  le reste. Un nouveau lancer nécessite **au moins 2 dés** (1 seul avec la
  carte Attaque de Zombies). Les dés tête de mort sont **maudits** : jamais
  relançables (sauf Gardienne, une fois).
- **3 têtes de mort** → fin de tour forcée. Pour les cartes "simples" (Pirate,
  Pièce d'or, Diamant, Animaux, Gardienne) : 0 point, sans exception. Pour les
  cartes spéciales (Bateau Pirate, La Paix, Île au Trésor), voir leurs règles
  propres ci-dessous : elles évaluent leur propre condition de succès/échec
  même quand le tour se termine de force.
- Fin de tour : défausser la carte, passer les dés au joueur suivant. Pioche
  épuisée → mélanger la défausse.

### Score
- Combinaisons : 3=100, 4=200, 5=500, 6=1000, 7=2000, 8=4000 points.
- Chaque diamant et chaque pièce d'or valent 100 points **en plus** de leur
  valeur en combinaison.
- **Coffre au trésor plein** : +500 pts si on marque avec les 8 dés (aucune
  tête de mort dans la combinaison finale).
- **Magie Pirate** : combinaison de 9 symboles identiques (carte Pièce
  d'or/Diamant + 8 dés du même symbole) → victoire immédiate.

### Île de la Tête-de-Mort
4 têtes de mort ou plus au **premier lancer** (sauf carte Bateau Pirate, voir
plus bas) envoie le joueur sur l'île : il met de côté ses têtes de mort et
relance le reste ; tant qu'il obtient au moins une tête de mort il continue ;
dès qu'un lancer n'en donne aucune, le tour finit sans point pour lui, mais
chaque tête de mort révélée durant le tour retire 100 points à **chaque
adversaire** (200 avec la carte Pirate en jeu). Un score négatif est possible.

### Cartes de base — effets
- **PIRATE** : tous les points du tour sont doublés. Sur l'Île de la
  Tête-de-Mort, les adversaires perdent 200 pts par tête de mort (au lieu de 100).
- **PIÈCE D'OR / DIAMANT** : le tour débute avec un symbole bonus qui compte à
  la fois dans une combinaison et comme simple symbole (+100 pts).
- **ANIMAUX** : singes et perroquets comptent comme le même symbole en combinaison.
- **GARDIENNE** : permet de relancer exceptionnellement, une fois, un dé tête de mort.
- **ÎLE AU TRÉSOR** : après chaque lancer, on peut déposer des dés dessus (dés
  "sauvegardés"). Ils comptent en fin de tour même en cas de 3e tête de mort.
  Dès la 3e tête de mort : plus aucun dépôt possible, seuls les dés
  sauvegardés comptent (au lieu du 0 point habituel).
- **BATEAU PIRATE** : il faut obtenir au moins autant de sabres que le nombre
  indiqué. Succès = résultat des dés + bonus de la carte (300/500/1000 selon
  version). Échec = 0 point **et** on retire la valeur de la carte du score
  total. Empêche d'aller sur l'Île de la Tête-de-Mort : 4+ têtes de mort au
  premier lancer = échec immédiat (perte du tour), sans passage par l'île.
  Cette évaluation succès/échec s'applique que le tour se termine
  volontairement ou via la règle des 3 têtes de mort.

### Cartes d'options — effets
- **LA PAIX** : terminer le tour sans aucun sabre. Succès = score doublé.
  Échec = 0 point et **-500 pts par sabre obtenu**. Sur l'Île de la
  Tête-de-Mort, doit quand même finir sans sabre.
- **ATTAQUE DE ZOMBIES** : relancer jusqu'à n'obtenir que des sabres ou des
  têtes de mort. Les têtes de mort restent non relançables, mais en obtenir 3
  ne termine **pas** le tour et n'envoie pas sur l'île (règle générale
  suspendue pour cette carte). Possibilité de ne relancer qu'un seul dé.
  Succès (5+ sabres) = 1200 pts. Échec = les 1200 pts sont répartis entre les
  autres joueurs (implémenté par division entière, reste perdu).
- **NAUFRAGE** : 2 lancers de dés maximum (règle des 3 têtes de mort
  suspendue). Têtes de mort toujours non relançables. Après le 2e lancer,
  diamants et pièces d'or rapportent le double de points (symboles +
  combinaisons), quel que soit le nombre de têtes de mort. Les autres
  symboles ne marquent rien ce tour-là.

### Fin de partie
- Objectif configurable avant la partie : 6000, 8000, ou une valeur libre
  (pas de valeur officielle unique — la règle Gigamic affichée indique 8000,
  l'utilisateur veut garder les deux comme choix).
- Le/la premier·ère à atteindre l'objectif déclenche un **dernier tour** pour
  tous les autres joueurs. À l'issue, le plus haut score gagne (peut être un
  joueur différent du déclencheur s'il l'a dépassé entre-temps).
- **Mode "mort subite"** : si une pénalité fait redescendre le déclencheur
  sous l'objectif pendant ce dernier tour, le tour final est **annulé** et la
  partie continue normalement jusqu'à ce que quelqu'un atteigne à nouveau
  l'objectif — victoire **immédiate** alors, sans redéclencher de tour final.
  (Implémenté dans `finishTurn()` de `GameApp.tsx` via l'état `suddenDeath`.)

## 5. Architecture technique actuelle (v0.6)

```
components/GameApp.tsx   → toute l'interface (écrans home/setup/game/rules/history/learn)
lib/engine.ts            → moteur de règles unique et à jour (SOURCE DE VÉRITÉ)
lib/rules.ts             → OBSOLÈTE, conservé pour référence historique uniquement
lib/game/moteurMilleSabords.ts → OBSOLÈTE, conservé pour référence historique uniquement
public/cards/*.jpg       → visuels des cartes (voir section 6)
public/manifest.webmanifest, public/sw.js → PWA offline-first
```

### Points clés du moteur (`lib/engine.ts`)
- `TurnState` modélise un tour : dés (`held`/`cursed`/`onTreasureIsland`),
  compteur de lancers, drapeaux `onSkullIsland`, `bust`, `shipImmediateFailure`.
- `performRoll()` gère le 1er lancer (8 dés) et les relances suivantes, avec
  toutes les exceptions par carte (île, zombies, naufrage).
- `computeScore()` est le cœur du calcul : Île de la Tête-de-Mort en
  priorité, puis branches spécifiques par type de carte (ship/treasureIsland/
  peace/zombieAttack/shipwreck), puis règle générale.
- `checkVictory()` reste simple ; la logique de "dernier tour / mort subite"
  est gérée côté interface (`GameApp.tsx`, fonction `finishTurn`), pas dans
  le moteur — à surveiller si on veut un jour tout centraliser dans `engine.ts`.

### Interface (`GameApp.tsx`)
- Lancer de dés en **2 appuis** : 1er appui = animation de dés qui tournent
  (cosmétique, ne détermine pas le résultat) ; 2e appui = arrêt de
  l'animation et calcul réel du lancer (`performRoll`), pour rester
  "sans triche".
- Écran de configuration : nombre de joueurs, objectif (6000/8000/Autre),
  cases à cocher pour les 3 cartes d'options.
- Actions contextuelles selon la carte en jeu : dépôt sur l'Île au Trésor,
  toucher un dé tête de mort pour la Gardienne.
- Aperçu du score en direct avant de terminer le tour.
- Historique local (localStorage), mode hors-ligne détecté et affiché.

## 6. Visuels des cartes (état au v0.6)

Toutes les cartes physiques ont été photographiées par l'utilisateur, puis
retouchées (dossier de travail `/home/claude/cards/` lors des sessions
précédentes — **ce dossier ne fait pas partie du dépôt livré**, seul le
résultat final est copié dans `public/cards/`).

### Pipeline de retouche appliqué
1. **Suppression de grille caméra** : 4 photos (La Paix, Bateau Pirate,
   Attaque de Zombies, Animaux) avaient une grille de composition superposée
   → détectée automatiquement (lignes claires quasi horizontales/verticales)
   et supprimée par inpainting OpenCV (`cv2.inpaint`, algorithme TELEA).
2. **Amélioration générale** : upscale propre (LANCZOS) vers 1400px de haut,
   `UnsharpMask`, autocontraste, +saturation/contraste/luminosité légers.
3. **Compression finale** : conversion JPEG qualité 82, hauteur réduite à
   900px, pour rester léger en PWA offline (~40-55 Ko/carte, ~640 Ko au total).

### Cartes Bateau Pirate (cas particulier)
Recréées graphiquement à partir de l'unique photo réelle disponible (version
4 sabres/1000 pts) :
- Zone des 4 icônes de sabres et zone du texte de valeur repérées par
  coordonnées précises (visuellement calibrées avec une grille de debug).
- Fond nettoyé par inpainting (masque = zone des icônes + zone du texte).
- Un patch d'icône (2e sabre d'origine) découpé avec un fondu de transparence
  sur les bords, dupliqué N fois selon la version (2, 3 ou 4 sabres).
- Nouveau texte de valeur dessiné par-dessus (police DejaVu Sans Bold,
  contour foncé, remplissage clair) : 300 / 500 / 1000 selon la version.
- **Limite connue et assumée** : un léger halo rectangulaire subsiste autour
  de la zone des icônes (trace de l'inpainting), surtout visible sur la
  version 2 sabres. Amélioration possible si besoin, non bloquante.

### Correspondance fichier ↔ carte (dans `public/cards/`)
| Fichier | Carte |
|---|---|
| `pirate.jpg` | Pirate |
| `gold.jpg` | Pièce d'or |
| `diamond.jpg` | Diamant |
| `animals.jpg` | Animaux |
| `guardian.jpg` | Gardienne |
| `treasureIsland.jpg` | Île au Trésor |
| `skull-1.jpg` | Tête de Mort ×1 |
| `skull-2.jpg` | Tête de Mort ×2 |
| `ship-2.jpg` / `ship-3.jpg` / `ship-4.jpg` | Bateau Pirate (2/3/4 sabres) |
| `peace.jpg` | La Paix |
| `zombieAttack.jpg` | Attaque de Zombies |

⚠️ **Il n'existe aucun visuel pour la carte Naufrage** (jamais photographiée).
L'interface bascule automatiquement sur l'icône emoji 🚣 si l'image est
absente (`onError` sur la balise `<img>` dans `GameApp.tsx`). Si l'utilisateur
fournit une photo de cette carte, l'ajouter en `public/cards/shipwreck.jpg`.

Le nom de fichier attendu par l'interface est **`${card.id}.jpg`** — les
`id` sont définis dans `lib/engine.ts` (`pirate`, `gold`, `diamond`,
`animals`, `guardian`, `treasureIsland`, `skull-1`, `skull-2`, `ship-2`,
`ship-3`, `ship-4`, `peace`, `zombieAttack`, `shipwreck`).

## 7. Ce qui reste à faire (feuille de route)

1. Éventuellement refaire/améliorer le rendu de certaines cartes si
   l'utilisateur les juge décevantes après test en conditions réelles.
2. Ajouter un visuel pour la carte Naufrage si une photo est fournie.
3. Construire le moteur du mode **Apprendre** (probabilités, espérance de
   gain, comparaison arrêt/relance) — actuellement un écran statique.
4. Construire l'**IA sans triche** pour le mode solo (niveaux Matelot,
   Corsaire, Capitaine) — pas encore commencé.
5. Sauvegarde IndexedDB robuste + synchronisation cloud (actuellement
   uniquement `localStorage`, pas de file d'attente de synchro réseau).
6. Déploiement réel sur GitHub + Vercel (pas encore fait à ce stade).
7. Envisager de centraliser la logique de fin de partie ("dernier tour" /
   "mort subite"), actuellement dans `GameApp.tsx`, dans `lib/engine.ts`.

## 8. Historique des versions

- **v0.1 à v0.3** : socle initial (voir `README.md` et l'ancien
  `REGLES_SPECIFICATION.md` pour le détail, en grande partie dépassé par ce
  fichier).
- **v0.4** : moteur de règles entièrement réécrit et consolidé
  (`lib/engine.ts`), interface reconstruite avec lancer de dés en 2 appuis,
  gestion complète de la fin de partie avec mode "mort subite", composition
  du paquet encore provisoire (35 cartes estimées).
- **v0.5** : composition exacte du paquet corrigée (39 cartes réelles),
  Bateau Pirate ramené à 3 versions réelles (2/3/4 sabres, valeurs
  300/500/1000).
- **v0.6** : visuels de cartes intégrés dans l'interface (`public/cards/`).
- **v0.7** : fichier de contexte `CONTEXTE_PROJET.md` créé (ce fichier),
  README réécrit pour pointer dessus, ancien `REGLES_SPECIFICATION.md` supprimé.
- **v0.8** : correction d'un bug bloquant le déploiement Vercel — erreur
  TypeScript stricte (`TS2367`, comparaison sans chevauchement) sur
  `rollPhase === 'spinning'` dans `GameApp.tsx`. Cause : la variable `canRoll`
  incluait `&& rollPhase !== 'spinning'`, ce qui faisait que TypeScript
  (narrowing des conditions aliasées) déduisait que `rollPhase` ne pouvait
  plus valoir `'spinning'` à l'intérieur du bloc `{canRoll && (...)}` —
  révélant au passage un vrai bug logique caché : le bouton "✋ Arrêter les
  dés" ne pouvait en réalité jamais s'afficher pendant l'animation de lancer.
  Corrigé en simplifiant `canRoll = canRollAgain(turn)` et en affichant le
  bouton dès que `canRoll || rollPhase === 'spinning'`.
- **v0.9** : ajout du rituel de révélation en début de tour, demandé par
  l'utilisateur. Chaque tour passe désormais par 3 phases gérées par l'état
  `turnPhase` (`'deck' | 'card' | 'playing'`) dans `GameApp.tsx` :
  1. `deck` — paquet retourné plein écran avec le nom du joueur ; un tap
     passe à la phase suivante.
  2. `card` — la carte piochée se révèle en grand avec un descriptif
     succinct de son effet (fonction `cardDescription()`, à mettre à jour si
     une règle de carte change) ; un tap passe à la table de jeu.
  3. `playing` — l'écran de jeu habituel (dés, carte en miniature, actions).
  `turnPhase` est remis à `'deck'` à chaque nouveau tour (`start()` et
  `advanceTurn()`). Aucun nouvel asset visuel requis : le dos de carte est
  en CSS pur (`.deck-stack`/`.deck-back` dans `globals.css`).
- **v1.0** : icône de l'application refaite (demande explicite : "tête de
  mort comme sur un bateau pirate"). L'ancienne icône (`public/icon.svg`)
  était un simple emoji 🏴‍☠️ rendu en `<text>` SVG — peu fiable
  (dépend des polices emoji du système) et **jamais réellement branchée**
  nulle part (manifest.icons était vide, aucune metadata Next.js ne la
  référençait). Remplacée par :
  - un vrai crâne + tibias croisés dessiné en formes vectorielles
    (`public/icon.svg`, réécrit en `<circle>`/`<rect>`/`<polygon>`/`<line>`,
    plus fiable qu'un emoji) ;
  - des PNG rasterisés à plusieurs tailles (`icon-192.png`, `icon-512.png`,
    `apple-icon.png` 180×180, `favicon.ico`), générés une fois via un script
    Python/Pillow (non conservé dans le dépôt, seul le résultat est livré) ;
  - `public/manifest.webmanifest` : le tableau `icons` (vide avant) référence
    maintenant les PNG (purpose `any` + `maskable`) ;
  - `app/layout.tsx` : ajout du champ `metadata.icons` (favicon, icônes PNG,
    apple touch icon) — absent avant, donc le favicon du navigateur n'était
    piloté par rien de spécifique jusqu'ici.
  Si l'icône doit être retouchée à nouveau, regénérer depuis un nouveau
  design source (SVG ou image haute résolution ≥1024×1024) et refaire les
  mêmes déclinaisons de tailles.
- **v1.1** : correction d'un bug important repéré par l'utilisateur — après
  un déploiement, la version précédente de l'appli restait affichée pour les
  utilisateurs revenant sur le site (visible uniquement en navigation privée,
  qui n'a pas de service worker). **Cause** : `public/sw.js` utilisait un nom
  de cache fixe (`mille-sabords-v1`) jamais incrémenté, une stratégie
  "cache d'abord" même pour la page principale, et n'appelait ni
  `skipWaiting()` ni `clients.claim()` — un nouveau service worker restait
  donc "en attente" indéfiniment tant que tous les onglets n'étaient pas
  fermés, ET l'ancien cache n'était de toute façon jamais purgé. **Correctif**
  dans `public/sw.js` :
  - `self.skipWaiting()` à l'installation (le nouveau SW s'active sans
    attendre la fermeture de tous les onglets) ;
  - `self.clients.claim()` + purge des anciens caches à l'activation ;
  - stratégie réseau-d'abord pour les requêtes de navigation (la page
    HTML), cache uniquement en secours hors-ligne ; cache-d'abord conservé
    pour les autres ressources (JS/CSS/images, sans risque car Next.js les
    nomme avec un hash qui change à chaque build).
  `app/OfflineRegister.tsx` complété pour détecter l'activation d'un nouveau
  service worker et recharger automatiquement la page une fois.
  ⚠️ **Important pour la suite** : la variable `CACHE` dans `public/sw.js`
  (actuellement `'mille-sabords-v2'`) doit être incrémentée à chaque nouveau
  déploiement qui change des fichiers pré-cachés (`/`, `/manifest.webmanifest`,
  `/icon.svg`) — sinon ce mécanisme de purge ne se déclenche pas. Pour les
  utilisateurs déjà bloqués sur l'ancienne version avant ce correctif, un
  nettoyage manuel du cache du site (une seule fois) est nécessaire : ce
  correctif évite que le problème se reproduise, il ne débloque pas
  rétroactivement une installation déjà figée sur l'ancien service worker.
