# 🏴‍☠️ Mille Sabords By C. Guilhem — Contexte du projet

> **Ce fichier doit être relu en premier par toute IA reprenant ce projet.**
> **Il doit être mis à jour à chaque changement apporté à l'application** (règles,
> moteur, interface, assets). Ne pas le laisser devenir obsolète : une info
> fausse ici est pire que pas d'info du tout.

Dernière mise à jour : v1.9 (le petit pirate qui allume le canon est de retour).

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
- Officiellement 2 à 5 joueurs selon la règle Gigamic, mais l'utilisateur a
  demandé une plage élargie de **1 à 10 joueurs** (v1.2) pour permettre le jeu
  en solo (entraînement/score personnel) et les grandes tablées.
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
  d'or/Diamant + 8 dés du même symbole) → déclenche la victoire. Règle
  officielle Gigamic : victoire *immédiate*. **Choix délibéré de
  l'utilisateur (v1.5), implémenté tel quel** : dans cette application, ça
  déclenche un dernier tour pour tout le monde comme l'objectif normal,
  plutôt qu'une victoire instantanée — voir section "Historique des
  versions" pour le détail.

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
  l'objectif. Règle officielle : victoire immédiate à ce moment-là. **Depuis
  la v1.5 (demande explicite de l'utilisateur)** : un nouveau dernier tour
  est déclenché pour tout le monde à la place, exactement comme la première
  fois — voir "Historique des versions".
  (Implémenté dans `finishTurn()` de `GameApp.tsx` via l'état `suddenDeath`
  et la fonction `startFinalRoundOrEnd()`.)

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
4. **IA** : les 3 niveaux de difficulté (Matelot, Corsaire, Capitaine) sont
   implémentés depuis la v1.4 — voir historique des versions et `AI_PARAMS`
   dans `GameApp.tsx` pour ajuster leur comportement si besoin.
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
- **v1.2** : nombre de joueurs élargi de 1 à 10 (demande explicite de
  l'utilisateur, au-delà des 2-5 joueurs de la règle officielle). Sélecteur
  mis à jour dans l'écran de configuration (`GameApp.tsx`). Cas particulier
  traité : avec 1 seul joueur, atteindre l'objectif déclenche la victoire
  **immédiate** au lieu d'attendre un "dernier tour des autres joueurs" qui
  n'existerait pas (il n'y a personne d'autre) — sans ce correctif, la
  victoire n'aurait été actée qu'au tour suivant du même joueur.
- **v1.3** : implémentation d'un vrai joueur IA (demande explicite de
  l'utilisateur, en correction de la v1.2 qui ne faisait que permettre 1
  joueur humain seul sans opposant). N'importe quel joueur peut être marqué
  "🤖 IA" dans l'écran de configuration (`Player.isAI`, bouton par ligne de
  nom) — utile aussi bien pour du solo (1 humain + 1 IA) que pour ajouter
  plusieurs adversaires IA. Quand c'est au tour d'un joueur IA :
  - `playAITurn()` orchestre tout le tour en pilotant directement les
    fonctions pures du moteur (`performRoll`, `toggleHold`,
    `placeOnTreasureIsland`, `useGuardian`, `computeScore`), sans passer par
    les gestionnaires de clic de l'interface — même aléatoire que pour un
    humain, aucune triche possible.
  - Rythme calqué sur la demande : 2s sur le paquet retourné, 2s sur la
    carte face visible, ~2s par lancer/relance (`aiRoll`, incluant
    l'animation de dés qui tournent réutilisée telle quelle), 5s au total
    pour choisir les dés à garder (`aiApplyHolds`, réparties entre les
    différentes actions de sélection), puis une courte pause avant de
    valider le tour (`finishTurn`).
  - Stratégie de décision (`aiDecideHolds` / `aiShouldContinue`) : niveau de
    base unique pour l'instant (pas encore les 3 paliers Matelot/Corsaire/
    Capitaine prévus dans la feuille de route) — garde toujours pièces/
    diamants et combinaisons déjà formées ; logique dédiée par carte
    spéciale (Bateau Pirate : sécurise les sabres déjà obtenus et continue
    tant que l'objectif n'est pas atteint ; La Paix : relance activement
    tout sabre restant ; Attaque de Zombies : pousse vers 5+ sabres ;
    Naufrage : utilise systématiquement le 2e lancer ; Île au Trésor :
    dépose les meilleurs dés au lieu de les garder simplement ; Gardienne :
    utilisée dès qu'une tête de mort apparaît) ; sinon prudence dès 2 têtes
    de mort, sinon tente sa chance 1 à 2 fois de plus si le score en cours
    reste modeste (<400 pts).
  - `finishTurn()` accepte désormais un `TurnState` explicite en paramètre
    optionnel (`finishTurn(explicitTurn?)`) pour que l'IA puisse lui passer
    directement son état final sans dépendre du timing de mise à jour du
    state React. Le bouton humain appelle toujours `finishTurn()` sans
    argument (attention à ne jamais faire `onClick={finishTurn}` tel quel :
    l'événement de clic serait alors passé comme `explicitTurn`).
  - Pendant un tour IA, toute la zone de jeu est visuellement verrouillée
    (classe CSS `.locked`, `pointer-events:none`) et les gestionnaires de
    clic humains (`onDiceAreaTap`, `onDieTap`, `depositOnIsland`) sont
    court-circuités par un garde `isAITurn` en tête de fonction, pour éviter
    toute interférence pendant que le script joue.
  - Prochaine étape logique si demandée : décliner cette IA unique en trois
    niveaux de difficulté (Matelot/Corsaire/Capitaine) comme prévu dans la
    feuille de route, en faisant varier `aiShouldContinue`/`aiDecideHolds`
    (ex. Capitaine plus agressif sur le nombre de relances tentées).
- **v1.4** : les 3 niveaux de difficulté demandés sont implémentés.
  `Player.difficulty?: 'matelot' | 'corsaire' | 'capitaine'` remplace le
  simple booléen `isAI` de la v1.3 (un joueur sans `difficulty` est humain).
  Sélecteur dédié par joueur dans l'écran de configuration (Humain/Matelot/
  Corsaire/Capitaine). Les trois niveaux partagent exactement le même moteur
  (`aiDecideHolds`/`aiShouldContinue`/`playAITurn`), seuls les paramètres de
  risque changent (`AI_PARAMS`) :
  | Niveau | Sécurise dès un groupe de… | Continue si score <… | Relances max (cas général) | Retente sa chance à 2 têtes de mort si… |
  |---|---|---|---|---|
  | Matelot | 3 dés identiques | 400 pts | 3 | jamais |
  | Corsaire | 3 dés identiques | 700 pts | 4 | ≤2 dés encore en jeu |
  | Capitaine | 2 dés identiques (plus opportuniste) | 1200 pts | 5 | ≤3 dés encore en jeu |
  Les cartes à objectif strict (Bateau Pirate, La Paix, Attaque de Zombies,
  Naufrage) gardent la même logique dédiée quel que soit le niveau — seule la
  branche générale (cartes simples) varie avec la difficulté pour l'instant.
  Cette table (`AI_PARAMS`) est le point d'entrée si l'utilisateur veut
  rééquilibrer un niveau plus tard.
- **v1.5** : demande explicite de l'utilisateur — **choix de conception
  délibéré qui s'écarte de la règle officielle Magie Pirate** ("vous
  remportez immédiatement la partie"). Désormais, TOUTE condition de
  victoire (objectif atteint normalement, Magie Pirate, ré-atteinte en mode
  mort subite) passe par la même fonction `startFinalRoundOrEnd()` :
  - le tour du joueur qui vient de gagner est toujours mené à son terme
    (il l'était déjà avant, ce point n'était pas cassé, mais c'est
    maintenant garanti par construction pour les trois cas) ;
  - tous les autres joueurs de la table ont alors droit à un dernier tour
    complet, exactement comme pour l'objectif normal ;
  - seule exception : en solo (personne d'autre à la table), la victoire
    reste immédiate puisqu'il n'y a personne à qui laisser jouer.
  `suddenDeath` est remis à `false` dès qu'un nouveau dernier tour démarre
  correctement (on n'est alors plus en mode "course-poursuite").
  ⚠️ **Cas limite connu, accepté tel quel** : si un joueur réalise Magie
  Pirate PENDANT le dernier tour déjà déclenché par quelqu'un d'autre,
  `startFinalRoundOrEnd()` redémarre la liste des joueurs restants à partir
  de ce nouveau déclencheur — ce qui peut redonner un tour supplémentaire à
  des joueurs qui avaient déjà joué leur dernier tour. Ce cas est très rare
  (Magie Pirate = 9 symboles identiques) et n'a pas été traité spécifiquement
  pour ne pas complexifier la logique pour un événement aussi improbable ;
  à revoir si l'utilisateur le juge gênant en pratique.
- **v1.6** : correction d'un vrai bug de fairness signalé par l'utilisateur
  après une partie réelle (2 joueurs, l'objectif atteint par le 2e joueur —
  Isa — sur son propre tour, qui est le DERNIER tour du cycle ; le 1er
  joueur a pourtant eu droit à un tour supplémentaire alors qu'il avait déjà
  joué autant de tours qu'elle). **Cause** : `startFinalRoundOrEnd()`
  (introduite en v1.5) accordait un tour de plus à *tous les autres joueurs*
  sans regarder si certains avaient déjà joué leur tour de ce cycle-ci —
  dans un jeu à 2, si le second joueur déclenche la victoire, le premier a
  déjà joué à égalité et ne devrait recevoir aucun tour bonus. **Correctif** :
  `remainingIds` ne contient plus que les joueurs placés APRÈS le
  déclencheur dans l'ordre de jeu du cycle en cours (`order.slice(startIdx +
  1)` au lieu d'un filtre excluant seulement son propre id). Concrètement :
  - si le déclencheur est le premier à jouer du cycle → tous les autres
    joueurs ont encore droit à un tour (comportement inchangé pour ce cas) ;
  - si le déclencheur est au milieu → seuls les joueurs après lui ce
    cycle-ci ont droit à un tour (ceux déjà passés avant lui sont déjà à
    égalité, donc exclus) ;
  - si le déclencheur est le DERNIER à jouer du cycle (le cas signalé par
    l'utilisateur) → `remainingIds` est vide, victoire actée immédiatement,
    exactement comme le cas solo.
  Cette correction s'applique uniformément aux trois façons de déclencher une
  victoire (objectif normal, Magie Pirate, mort subite), puisque les trois
  passent par `startFinalRoundOrEnd()`.
- **v1.7** : deux ajouts demandés par l'utilisateur.
  1. **Numéro de version affiché** (`lib/version.ts`, constante
     `APP_VERSION`) : visible dans le `Header` sur tous les écrans (à côté
     du statut en ligne/hors ligne), ex. "☁️ En ligne · v1.7". **Cette
     constante DOIT être incrémentée à chaque nouvelle livraison** — c'est
     tout l'intérêt de la demande (vérifier facilement qu'une mise à jour a
     bien été déployée, en particulier après les soucis de cache du service
     worker corrigés en v1.1).
  2. **Animation + sons de fin de partie** (`GameOverCelebration` dans
     `GameApp.tsx`, effets sonores dans `lib/sfx.ts`) : un canon tire un
     boulet qui monte et explose en confettis sur toute la page, avec le nom
     du vainqueur affiché au-dessus du canon. Séquence : boum du tir → boulet
     qui monte avec sifflement (CSS `cannonball-fly`) → explosion (flash
     `burst`) → ~90 confettis colorés tombent sur toute la largeur de l'écran
     (`confetti-fall`, générés dynamiquement en JS, couleurs/délais/durées
     aléatoires par pièce).
     ⚠️ **Important** : aucun fichier audio réel n'est utilisé. Faute
     d'accès réseau pour en récupérer, tous les sons (boum, sifflement,
     explosion, applaudissements/acclamations/sifflet des cotillons) sont
     **synthétisés en direct via la Web Audio API** (oscillateurs +
     bruit blanc filtré, voir `lib/sfx.ts` → `playVictoryFanfare()`). C'est
     donc volontairement approximatif — en particulier les
     applaudissements/acclamations, qu'une synthèse ne peut pas imiter aussi
     bien qu'un vrai enregistrement. **Si l'utilisateur fournit un jour de
     vrais fichiers audio** (ex. `public/sfx/boom.mp3`,
     `sifflement.mp3`, `explosion.mp3`, `cotillons.mp3`), remplacer le corps
     de `playVictoryFanfare()` par de simples `new Audio('/sfx/...').play()`
     programmés aux mêmes instants (0s / 0.1s / ~1.05s / ~1.2s) — ce sera
     bien plus convaincant que la synthèse actuelle.
     L'animation se déclenche une seule fois par partie terminée (garde
     `useRef` dans `GameOverCelebration`, utile aussi en développement où
     React StrictMode double-invoque les effets).
- **v1.8** : l'utilisateur a signalé qu'aucune animation visuelle n'était
  perceptible en v1.7 malgré le son qui fonctionnait. **Diagnostic effectué
  en rendant réellement la page** (Playwright + Chromium headless, captures
  d'écran à différents instants — voir méthode ci-dessous, réutilisable pour
  tout futur doute visuel) : le canon existait bel et bien et s'animait
  correctement, mais il était minuscule, relégué tout en bas de l'écran,
  **affiché en même temps que** le panneau de résultats (superposé dessus) —
  facile à ne pas remarquer, et ne correspondait de toute façon pas à la
  demande initiale ("prendre toute la page"). **Refonte complète** de
  `GameOverCelebration` dans `GameApp.tsx` :
  - Nouvel état `celebrationDone` (réinitialisé dans `start()` et
    `endGame()`) : tant qu'il est `false`, l'écran de fin de partie affiche
    **uniquement** la célébration plein écran (`.celebration` n'est plus un
    calque discret superposé, c'est tout l'écran : fond dégradé, titre du
    vainqueur en grand, canon, confettis) — le panneau de résultats
    (classement, bouton retour) ne s'affiche qu'une fois `celebrationDone`
    passé à `true`.
  - **Confettis et sons désormais continus** : `setInterval` ajoute une
    nouvelle salve de confettis toutes les 1,1s (fenêtre glissante de 260
    pièces maximum pour ne pas accumuler indéfiniment de nœuds DOM) et
    rejoue une salve de cotillons (`playConfettiLoopSound()`, nouvelle
    fonction dans `lib/sfx.ts` : applaudissements + acclamations sans le
    canon) toutes les 2,6s, jusqu'à ce que l'utilisateur touche l'écran.
  - **Le tap n'importe où sur l'écran** (`onClick` sur le conteneur racine
    `.celebration`, qui n'a donc plus `pointer-events:none`) déclenche
    `onDismiss()` → `setCelebrationDone(true)` → démontage du composant
    (ce qui nettoie automatiquement les `setInterval`/`setTimeout` via le
    retour du `useEffect`) → passage à l'écran de classement.
  - Classement affiché du meilleur au dernier : c'était déjà le cas
    (`ranking` trie par score décroissant), aucun changement nécessaire sur
    ce point, juste vérifié.
  ⚠️ **Méthode de vérification visuelle à retenir pour la suite** : ce
  projet n'a pas de retour visuel direct pendant le développement (pas de
  serveur Next.js lancé, pas de vrai téléphone sous la main). Pour tout
  changement CSS/animation dont le rendu réel est incertain, la méthode
  fiable est de reconstituer un fichier HTML autonome avec le vrai
  `app/globals.css` et la même structure de balises que le composant React
  produirait, puis de le charger avec Playwright (Chromium headless,
  déjà installé dans cet environnement — `python3 -m playwright install
  chromium`) et de prendre des captures d'écran à plusieurs instants
  (`page.wait_for_timeout(...)` puis `page.screenshot(...)`). Ça aurait dû
  être fait dès la v1.7 pour éviter cet aller-retour ; à faire par défaut
  pour toute nouvelle animation ou mise en page non triviale.
- **v1.9** : l'utilisateur avait bien demandé dès le départ (v1.7) "un
  pirate avec le nom du gagnant qui vient allumer le canon" — ce détail
  avait été perdu en simplifiant le layout lors de la refonte plein écran
  de la v1.8 (le canon n'était resté qu'avec un emoji 💀 et un drapeau, sans
  personnage). Réintégré, **vérifié visuellement via Playwright** (captures
  d'écran à 0.2s/0.7s/1.2s/2.1s/3.0s) avant livraison :
  - **Portrait du pirate** : réutilise l'illustration déjà présente dans
    l'appli (`/cards/pirate.jpg`, la vraie carte Pirate retouchée), affichée
    en médaillon rond (`.pirate-figure`) qui glisse depuis la gauche
    (`@keyframes pirate-in`, 0.6s) jusqu'à côté du canon.
  - **Étiquette avec le nom du gagnant** (`.pirate-name-tag`) directement
    au-dessus du portrait — en plus du grand titre central déjà existant,
    conformément à la demande explicite ("un petit pirate AVEC le nom du
    gagnant").
  - **Séquence resynchronisée** autour d'un nouveau délai `IGNITE_DELAY =
    900ms` dans `GameOverCelebration` : le pirate arrive et une étincelle
    (`.spark`, emoji ✨) clignote sur la mèche du canon (`@keyframes
    spark-flicker`, débute à 0.6s) AVANT que le son du canon et le boulet
    ne se déclenchent (tout ce qui suivait immédiatement le montage du
    composant — `playVictoryFanfare()`, minuterie de l'explosion, 1re salve
    de confettis — est maintenant imbriqué dans un `setTimeout(900ms)`).
    Le boulet (`.cannonball`) a désormais son propre `animation-delay:.9s`
    en CSS pour rester synchronisé.
  - **Repositionnement technique** : le canon n'étant plus parfaitement
    centré (le pirate prend de la place à sa gauche dans `.ignite-scene`,
    un conteneur flex), le boulet et le flash d'explosion (`.cannonball`,
    `.burst`) sont désormais positionnés en `absolute` **à l'intérieur de**
    `.cannon-rig` (coordonnées locales simples) plutôt que relativement à
    tout l'écran (`calc(50% + …)`) comme avant — plus robuste si la mise en
    page de cette zone change encore à l'avenir.
