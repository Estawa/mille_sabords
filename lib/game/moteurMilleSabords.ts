// ⚠️ Fichier obsolète depuis l’introduction de lib/engine.ts (moteur consolidé unique). Conservé pour référence historique, non importé par l’interface.

export type DieSymbol = "diamond" | "coin" | "monkey" | "parrot" | "sabre" | "skull";

export type PirateCard =
  | { type: "pirate" }
  | { type: "coin" }
  | { type: "diamond" }
  | { type: "animals" }
  | { type: "skull"; skulls: 1 | 2 }
  | { type: "guardian" }
  | { type: "treasure_island" }
  | { type: "pirate_ship"; requiredSabres: number; bonus: number; penalty: number };

export type ScoreBreakdown = {
  combinationPoints: number;
  coinPoints: number;
  diamondPoints: number;
  treasureBonus: number;
  cardBonus: number;
  total: number;
  explanation: string[];
};

const COMBO: Record<number, number> = {
  3: 100, 4: 200, 5: 500, 6: 1000, 7: 2000, 8: 4000,
};

function normalise(symbols: DieSymbol[], animals: boolean) {
  return symbols.map(s => animals && (s === "monkey" || s === "parrot") ? "animals" : s);
}

export function calculateScore(
  symbols: DieSymbol[],
  card: PirateCard,
  usedAllScoringDice = true,
): ScoreBreakdown {
  const explanation: string[] = [];
  const skulls = symbols.filter(s => s === "skull").length;

  if (skulls >= 3) {
    return {
      combinationPoints: 0, coinPoints: 0, diamondPoints: 0,
      treasureBonus: 0, cardBonus: 0, total: 0,
      explanation: ["☠️ Trois têtes de mort : le tour vaut 0 point."],
    };
  }

  const values = normalise(symbols, card.type === "animals");
  const counts = new Map<string, number>();
  for (const s of values) counts.set(s, (counts.get(s) ?? 0) + 1);

  let combinationPoints = 0;
  for (const [symbol, count] of counts) {
    if (count >= 3) {
      const pts = COMBO[Math.min(count, 8)] ?? 0;
      combinationPoints += pts;
      explanation.push(`${count} ${symbol} : +${pts} pts`);
    }
  }

  const coinPoints = symbols.filter(s => s === "coin").length * 100;
  const diamondPoints = symbols.filter(s => s === "diamond").length * 100;
  if (coinPoints) explanation.push(`Pièces : +${coinPoints} pts`);
  if (diamondPoints) explanation.push(`Diamants : +${diamondPoints} pts`);

  const scoringCount = symbols.filter(s => s !== "skull").length;
  const treasureBonus = usedAllScoringDice && scoringCount === 8 ? 500 : 0;
  if (treasureBonus) explanation.push("Coffre au trésor plein : +500 pts");

  let subtotal = combinationPoints + coinPoints + diamondPoints + treasureBonus;
  let cardBonus = 0;

  if (card.type === "pirate") {
    subtotal *= 2;
    explanation.push("Carte Pirate : score du tour doublé");
  }
  if (card.type === "pirate_ship") {
    const sabres = symbols.filter(s => s === "sabre").length;
    if (sabres >= card.requiredSabres) {
      cardBonus = card.bonus;
      subtotal += cardBonus;
      explanation.push(`Bateau Pirate réussi : +${cardBonus} pts`);
    } else {
      subtotal = 0;
      explanation.push(`Bateau Pirate échoué : 0 pt et -${card.penalty} pts au score total`);
    }
  }

  return {
    combinationPoints, coinPoints, diamondPoints, treasureBonus, cardBonus,
    total: subtotal, explanation,
  };
}

export function magicPirate(symbols: DieSymbol[], card: PirateCard): boolean {
  if (symbols.length !== 8) return false;
  const bonusSymbol =
    card.type === "coin" ? "coin" :
    card.type === "diamond" ? "diamond" : null;
  return bonusSymbol !== null && symbols.every(s => s === bonusSymbol);
}

export function deathIslandFirstRoll(symbols: DieSymbol[], card: PirateCard) {
  const skulls = symbols.filter(s => s === "skull").length;
  return skulls >= 4 && card.type !== "pirate_ship";
}
