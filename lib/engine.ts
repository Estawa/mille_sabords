// ============================================================================
// Moteur de règles — Mille Sabords By C. Guilhem
// Séparé de l'interface, comme voulu par le principe de développement du projet.
//
// Toutes les règles ci-dessous sont verrouillées à partir des cartes physiques
// de l'utilisateur et de la règle officielle Gigamic. Un seul point reste une
// hypothèse assumée et clairement signalée : la répartition exacte des 35
// cartes de l'édition de base par famille (voir BASE_DECK_PLACEHOLDER_COUNTS).
//
// Note de conception (à relire par l'utilisateur) : les cartes spéciales
// (Bateau Pirate, La Paix, Attaque de Zombies, Naufrage, Île au Trésor)
// définissent chacune ce qui se passe "quel que soit votre résultat aux dés"
// ou "si vous échouez" — leur évaluation s'applique donc que le tour se
// termine volontairement OU de force (3e tête de mort). Seules les cartes
// "simples" (Pirate, Pièce d'or, Diamant, Animaux, Gardienne) suivent la règle
// générale : 3 têtes de mort = 0 point, sans exception.
// ============================================================================

export type DieSymbol = 'diamond' | 'coin' | 'monkey' | 'parrot' | 'sabre' | 'skull';

export const SYMBOLS: Record<DieSymbol, string> = {
  diamond: '💎', coin: '🪙', monkey: '🐒', parrot: '🦜', sabre: '⚔️', skull: '💀',
};

export const COMBO_POINTS: Record<number, number> = {
  3: 100, 4: 200, 5: 500, 6: 1000, 7: 2000, 8: 4000,
};

// --- Cartes ----------------------------------------------------------------

export type BaseCardType =
  | 'pirate' | 'goldCoin' | 'diamondCard' | 'animals'
  | 'skull' | 'guardian' | 'treasureIsland' | 'ship';

export type OptionCardType = 'peace' | 'zombieAttack' | 'shipwreck';

export type CardType = BaseCardType | OptionCardType;

export interface PirateCard {
  id: string;
  type: CardType;
  label: string;
  icon: string;
  isOption: boolean;
  skulls?: number;          // carte Tête de Mort : 1 ou 2
  sabresRequired?: number;  // carte Bateau Pirate : 1 à 4
  bonus?: number;           // carte Bateau Pirate : bonus/pénalité (même valeur)
}

function shipCard(sabresRequired: 2 | 3 | 4, bonus: number): PirateCard {
  return {
    id: `ship-${sabresRequired}`,
    type: 'ship',
    label: `Bateau Pirate (${sabresRequired} sabres)`,
    icon: '🚢',
    isOption: false,
    sabresRequired,
    bonus,
  };
}

function skullCard(skulls: 1 | 2): PirateCard {
  return {
    id: `skull-${skulls}`,
    type: 'skull',
    label: `Tête de Mort ×${skulls}`,
    icon: '💀',
    isOption: false,
    skulls,
  };
}

const PIRATE_CARD: PirateCard = { id: 'pirate', type: 'pirate', label: 'Pirate', icon: '🏴‍☠️', isOption: false };
const GOLD_CARD: PirateCard = { id: 'gold', type: 'goldCoin', label: "Pièce d'or", icon: '🪙', isOption: false };
const DIAMOND_CARD: PirateCard = { id: 'diamond', type: 'diamondCard', label: 'Diamant', icon: '💎', isOption: false };
const ANIMALS_CARD: PirateCard = { id: 'animals', type: 'animals', label: 'Animaux', icon: '🐒🦜', isOption: false };
const GUARDIAN_CARD: PirateCard = { id: 'guardian', type: 'guardian', label: 'Gardienne', icon: '🧙‍♀️', isOption: false };
const TREASURE_ISLAND_CARD: PirateCard = { id: 'treasureIsland', type: 'treasureIsland', label: 'Île au Trésor', icon: '🏝️', isOption: false };

export const OPTION_CARDS: PirateCard[] = [
  { id: 'peace', type: 'peace', label: 'La Paix', icon: '🕊️', isOption: true },
  { id: 'zombieAttack', type: 'zombieAttack', label: 'Attaque de Zombies', icon: '🧟', isOption: true },
  { id: 'shipwreck', type: 'shipwreck', label: 'Naufrage', icon: '🚣', isOption: true },
];

// Composition exacte du paquet complet (39 cartes), confirmée par l'utilisateur
// avec ses cartes physiques. Les 2 cartes Résumé (barème des combinaisons) ne
// sont pas des cartes Pirate et ne sont pas comptées ici.
const BASE_DECK_COUNTS: Array<[PirateCard, number]> = [
  [PIRATE_CARD, 3],
  [TREASURE_ISLAND_CARD, 3],
  [GOLD_CARD, 3],
  [DIAMOND_CARD, 3],
  [ANIMALS_CARD, 3],
  [GUARDIAN_CARD, 3],
  [skullCard(1), 3],
  [skullCard(2), 2],
  [shipCard(2, 300), 2],
  [shipCard(3, 500), 2],
  [shipCard(4, 1000), 2],
];
// Base : 29 cartes (3+3+3+3+3+3+3+2+2+2+2)

const OPTION_DECK_COUNTS: Record<OptionCardType, number> = {
  zombieAttack: 3,
  peace: 4,
  shipwreck: 3,
};

export function buildBaseDeck(): PirateCard[] {
  const deck: PirateCard[] = [];
  for (const [card, count] of BASE_DECK_COUNTS) {
    for (let i = 0; i < count; i++) deck.push(card);
  }
  return deck;
}

export interface OptionsConfig {
  peace: boolean;
  zombieAttack: boolean;
  shipwreck: boolean;
}

export function buildDeck(options: OptionsConfig): PirateCard[] {
  const deck = buildBaseDeck();
  for (const optionCard of OPTION_CARDS) {
    const key = optionCard.type as OptionCardType;
    if (options[key]) {
      const count = OPTION_DECK_COUNTS[key];
      for (let i = 0; i < count; i++) deck.push(optionCard);
    }
  }
  return deck;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// --- Dés ---------------------------------------------------------------

const ALL_SYMBOLS: DieSymbol[] = ['diamond', 'coin', 'monkey', 'parrot', 'sabre', 'skull'];

export function rollDie(): DieSymbol {
  return ALL_SYMBOLS[Math.floor(Math.random() * ALL_SYMBOLS.length)];
}

export function rollDice(n: number): DieSymbol[] {
  return Array.from({ length: n }, rollDie);
}

// --- État d'un tour ------------------------------------------------------

export interface DieState {
  symbol: DieSymbol;
  held: boolean;              // mis de côté volontairement (protégé d'une relance)
  cursed: boolean;             // tête de mort, non relançable (sauf Gardienne)
  onTreasureIsland: boolean;   // dé "sauvegardé" sur la carte Île au Trésor
}

export interface TurnState {
  card: PirateCard;
  dice: DieState[];
  rollCount: number;
  skullsRevealedThisTurn: number;  // pour l'Île de la Tête-de-Mort et la carte Pirate
  guardianUsed: boolean;
  onSkullIsland: boolean;          // le tour est passé en mode "Île de la Tête-de-Mort"
  bust: boolean;                   // le tour s'est arrêté de force (3e tête de mort, ou île)
  shipImmediateFailure: boolean;   // Bateau Pirate : 4+ têtes de mort au tout premier lancer
}

export function startTurn(card: PirateCard): TurnState {
  return {
    card, dice: [], rollCount: 0, skullsRevealedThisTurn: 0,
    guardianUsed: false, onSkullIsland: false, bust: false, shipImmediateFailure: false,
  };
}

/** Cartes qui suspendent la règle générale "3 têtes de mort = fin de tour forcée". */
function skullBustExempt(cardType: CardType): boolean {
  return cardType === 'zombieAttack' || cardType === 'shipwreck';
}

/** Nombre minimum de dés à relancer pour qu'un nouveau lancer soit valide. */
function minRerollCount(cardType: CardType): number {
  return cardType === 'zombieAttack' ? 1 : 2;
}

/**
 * Indique si un nouveau lancer est encore possible dans l'état courant.
 * À utiliser par l'interface pour activer/désactiver le bouton de lancer.
 */
export function canRollAgain(state: TurnState): boolean {
  if (state.bust || state.shipImmediateFailure) return false;
  if (state.dice.length === 0) return true; // premier lancer toujours possible
  if (state.card.type === 'shipwreck' && state.rollCount >= 2) return false;
  if (state.onSkullIsland) return true; // tant qu'on n'a pas eu un lancer sans tête de mort
  const available = state.dice.filter(d => !d.held && !d.cursed && !d.onTreasureIsland).length;
  return available >= minRerollCount(state.card.type);
}

/**
 * Effectue le premier lancer (toujours 8 dés) ou un lancer suivant portant
 * uniquement sur les dés non tenus / non maudits / non posés sur l'Île au Trésor.
 */
export function performRoll(state: TurnState): TurnState {
  if (!canRollAgain(state)) return state;

  if (state.dice.length === 0) {
    const results = rollDice(8);
    const dice: DieState[] = results.map(symbol => ({
      symbol, held: false, cursed: symbol === 'skull', onTreasureIsland: false,
    }));
    const skulls = dice.filter(d => d.symbol === 'skull').length;
    const next: TurnState = { ...state, dice, rollCount: 1, skullsRevealedThisTurn: skulls };

    if (skulls >= 4) {
      if (state.card.type === 'ship') return { ...next, shipImmediateFailure: true };
      if (!skullBustExempt(state.card.type)) return { ...next, onSkullIsland: true };
      return next; // zombieAttack / shipwreck : pas d'île, on continue
    }
    if (skulls >= 3 && !skullBustExempt(state.card.type)) {
      return { ...next, bust: true };
    }
    return next;
  }

  const rerollIndexes = state.dice
    .map((d, i) => ({ d, i }))
    .filter(({ d }) => !d.held && !d.cursed && !d.onTreasureIsland)
    .map(({ i }) => i);

  const rerolled = rollDice(rerollIndexes.length);
  const dice = state.dice.map((d, i) => {
    const pos = rerollIndexes.indexOf(i);
    if (pos === -1) return d;
    const symbol = rerolled[pos];
    return { ...d, symbol, cursed: symbol === 'skull' };
  });

  const newSkulls = rerollIndexes.filter(i => dice[i].symbol === 'skull').length;
  const skullsRevealedThisTurn = state.skullsRevealedThisTurn + newSkulls;
  const totalSkullsNow = dice.filter(d => d.symbol === 'skull').length;
  const next: TurnState = { ...state, dice, rollCount: state.rollCount + 1, skullsRevealedThisTurn };

  if (state.onSkullIsland) {
    if (newSkulls === 0) return { ...next, bust: true };
    return next;
  }
  if (totalSkullsNow >= 3 && !skullBustExempt(state.card.type)) {
    return { ...next, bust: true };
  }
  return next;
}

/** Bascule l'état "tenu" d'un dé (protégé d'une relance). */
export function toggleHold(state: TurnState, index: number): TurnState {
  const die = state.dice[index];
  if (!die || die.cursed || die.onTreasureIsland) return state;
  const dice = state.dice.map((d, i) => (i === index ? { ...d, held: !d.held } : d));
  return { ...state, dice };
}

/** Carte Gardienne : relance exceptionnellement, une fois, un dé tête de mort. */
export function useGuardian(state: TurnState, index: number): TurnState {
  if (state.card.type !== 'guardian' || state.guardianUsed) return state;
  const die = state.dice[index];
  if (!die || die.symbol !== 'skull') return state;
  const symbol = rollDie();
  const dice = state.dice.map((d, i) => (i === index ? { ...d, symbol, cursed: symbol === 'skull' } : d));
  const totalSkullsNow = dice.filter(d => d.symbol === 'skull').length;
  const bust = !state.onSkullIsland && !skullBustExempt(state.card.type) && totalSkullsNow >= 3;
  return { ...state, dice, guardianUsed: true, bust };
}

/** Carte Île au Trésor : dépose un dé sur la carte (sauvegardé pour la fin du tour). */
export function placeOnTreasureIsland(state: TurnState, index: number): TurnState {
  if (state.card.type !== 'treasureIsland') return state;
  const die = state.dice[index];
  if (!die || die.symbol === 'skull' || die.cursed) return state;
  const dice = state.dice.map((d, i) => (i === index ? { ...d, onTreasureIsland: true, held: false } : d));
  return { ...state, dice };
}

// --- Score de fin de tour ------------------------------------------------

export interface ScoreDetail { label: string; points: number }
export interface ScoreResult {
  points: number;
  details: ScoreDetail[];
  bust: boolean;
  adversaryPenaltyPerSkull?: number; // Île de la Tête-de-Mort
  redistributeToOthers?: number;     // Attaque de Zombies ratée
  magiePirate?: boolean;             // victoire immédiate
}

function baseCombinationScore(dice: DieSymbol[], animalsWild: boolean): { points: number; details: ScoreDetail[] } {
  const details: ScoreDetail[] = [];
  const counts: Record<string, number> = {};
  for (const s of dice) {
    const key = animalsWild && (s === 'monkey' || s === 'parrot') ? 'animal' : s;
    counts[key] = (counts[key] || 0) + 1;
  }
  let points = 0;
  for (const [key, count] of Object.entries(counts)) {
    if (count >= 3) {
      const p = COMBO_POINTS[Math.min(count, 8)] || 0;
      points += p;
      const icon = key === 'animal' ? '🐒🦜' : SYMBOLS[key as DieSymbol];
      details.push({ label: `Combinaison de ${count} (${icon})`, points: p });
    }
    if (key === 'coin') { points += count * 100; details.push({ label: `${count} pièce(s) d'or`, points: count * 100 }); }
    if (key === 'diamond') { points += count * 100; details.push({ label: `${count} diamant(s)`, points: count * 100 }); }
  }
  return { points, details };
}

/** Calcule le score final d'un tour à partir de son état courant. */
export function computeScore(state: TurnState): ScoreResult {
  const card = state.card;

  // --- Île de la Tête-de-Mort : prioritaire sur tout le reste ---
  if (state.onSkullIsland && state.bust) {
    return {
      points: 0, bust: true,
      details: [{ label: `Île de la Tête-de-Mort : ${state.skullsRevealedThisTurn} tête(s) de mort révélée(s)`, points: 0 }],
      adversaryPenaltyPerSkull: card.type === 'pirate' ? 200 : 100,
    };
  }

  const nonSkullDice: DieSymbol[] = state.dice.filter(d => d.symbol !== 'skull').map(d => d.symbol);
  const extra: DieSymbol[] = card.type === 'goldCoin' ? ['coin'] : card.type === 'diamondCard' ? ['diamond'] : [];
  const allScoring: DieSymbol[] = [...nonSkullDice, ...extra];
  const totalSkulls = state.dice.filter(d => d.symbol === 'skull').length;

  // --- Bateau Pirate : échec immédiat (4+ têtes de mort au premier lancer) ---
  if (card.type === 'ship' && state.shipImmediateFailure) {
    return {
      points: -(card.bonus || 0), bust: true,
      details: [{ label: `Bateau Pirate : 4 têtes de mort ou plus au premier lancer, échec immédiat (-${card.bonus} pts)`, points: -(card.bonus || 0) }],
    };
  }

  // --- Bateau Pirate : succès/échec évalué sur l'état final, que le tour
  //     se soit arrêté volontairement ou via la 3e tête de mort ---
  if (card.type === 'ship') {
    const sabres = allScoring.filter(s => s === 'sabre').length;
    if (sabres >= (card.sabresRequired || 0)) {
      const base = baseCombinationScore(allScoring, false);
      let points = base.points + (card.bonus || 0);
      const details = [...base.details, { label: `Bateau Pirate réussi (${card.sabresRequired} sabres) : +${card.bonus} pts`, points: card.bonus || 0 }];
      if (totalSkulls === 0) { points += 500; details.push({ label: 'Coffre au trésor plein', points: 500 }); }
      return { points, bust: false, details };
    }
    return {
      points: -(card.bonus || 0), bust: true,
      details: [{ label: `Bateau Pirate : objectif de ${card.sabresRequired} sabres non atteint, -${card.bonus} pts`, points: -(card.bonus || 0) }],
    };
  }

  // --- Île au Trésor : en cas de 3e tête de mort, seuls les dés sauvegardés comptent ---
  if (card.type === 'treasureIsland' && state.bust) {
    const saved = state.dice.filter(d => d.onTreasureIsland && d.symbol !== 'skull').map(d => d.symbol);
    const base = baseCombinationScore(saved, false);
    const details = [...base.details, { label: "3 têtes de mort : seuls les dés sauvegardés sur l'Île au Trésor comptent", points: 0 }];
    let points = base.points;
    if (saved.length === 8) { points += 500; details.push({ label: 'Coffre au trésor plein', points: 500 }); }
    return { points, bust: true, details };
  }

  // --- La Paix : succès/échec évalué sur l'état final ---
  if (card.type === 'peace') {
    const sabres = allScoring.filter(s => s === 'sabre').length;
    if (sabres === 0) {
      const base = baseCombinationScore(allScoring, false);
      let points = base.points;
      const details = [...base.details];
      if (totalSkulls === 0) { points += 500; details.push({ label: 'Coffre au trésor plein', points: 500 }); }
      details.push({ label: 'La Paix : aucun sabre, score doublé', points });
      return { points: points * 2, bust: false, details };
    }
    const penalty = sabres * 500;
    return { points: -penalty, bust: true, details: [{ label: `La Paix ratée : ${sabres} sabre(s), -${penalty} pts`, points: -penalty }] };
  }

  // --- Attaque de Zombies : évaluée uniquement à l'arrêt volontaire (jamais de bust forcé) ---
  if (card.type === 'zombieAttack') {
    const sabres = allScoring.filter(s => s === 'sabre').length;
    if (sabres >= 5) {
      return { points: 1200, bust: false, details: [{ label: 'Attaque de Zombies réussie (5+ sabres)', points: 1200 }] };
    }
    return {
      points: 0, bust: false,
      details: [{ label: 'Attaque de Zombies ratée : 1200 pts redistribués aux adversaires', points: 0 }],
      redistributeToOthers: 1200,
    };
  }

  // --- Naufrage : seuls diamants/pièces comptent, doublés, quel que soit le nombre de têtes de mort ---
  if (card.type === 'shipwreck') {
    const coinsAndDiamonds = allScoring.filter(s => s === 'coin' || s === 'diamond');
    const simple = coinsAndDiamonds.length * 100;
    const combo = baseCombinationScore(coinsAndDiamonds, false).points;
    const total = (simple + combo) * 2;
    return { points: total, bust: false, details: [{ label: 'Naufrage : diamants/pièces doublés, autres symboles ignorés', points: total }] };
  }

  // --- Règle générale : 3 têtes de mort = 0 point, sans exception ---
  if (state.bust) {
    return { points: 0, bust: true, details: [{ label: '3 têtes de mort : tour perdu', points: 0 }] };
  }

  const base = baseCombinationScore(allScoring, card.type === 'animals');
  const details = [...base.details];
  let points = base.points;

  if (totalSkulls === 0) { points += 500; details.push({ label: 'Coffre au trésor plein', points: 500 }); }

  if (card.type === 'pirate') {
    details.push({ label: 'Carte Pirate : score doublé', points });
    points *= 2;
  }

  // --- Magie Pirate : 9 symboles identiques (carte bonus + 8 dés du même symbole) ---
  if (extra.length) {
    const bonusSymbol = extra[0];
    const identical = allScoring.filter(s => s === bonusSymbol).length;
    if (identical === 9) {
      return { points, bust: false, details: [...details, { label: 'MAGIE PIRATE : 9 symboles identiques !', points: 0 }], magiePirate: true };
    }
  }

  return { points, bust: false, details };
}

// --- Fin de partie ---------------------------------------------------------

export interface PlayerScore { id: string; name: string; score: number }

/**
 * Règle officielle : si les adversaires font redescendre le déclencheur sous
 * l'objectif pendant le dernier tour, la partie continue jusqu'à ce que
 * quelqu'un atteigne à nouveau l'objectif — cette personne gagne alors
 * immédiatement, sans nouveau tour final.
 */
export function checkVictory(players: PlayerScore[], target: number): { winner: PlayerScore | null } {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  if (sorted[0] && sorted[0].score >= target) return { winner: sorted[0] };
  return { winner: null };
}
