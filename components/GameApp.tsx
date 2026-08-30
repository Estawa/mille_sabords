'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DieSymbol, PirateCard, SYMBOLS, OptionsConfig, OPTION_CARDS,
  TurnState,
  buildDeck, shuffle, rollDice,
  startTurn, performRoll, toggleHold, useGuardian, placeOnTreasureIsland,
  canRollAgain, computeScore,
} from '../lib/engine';
import { playVictoryFanfare, playConfettiLoopSound } from '../lib/sfx';
import { APP_VERSION } from '../lib/version';

type AIDifficulty = 'matelot' | 'corsaire' | 'capitaine';
type Player = { id: string; name: string; score: number; difficulty?: AIDifficulty };
type SavedGame = { id: string; date: string; target: number; winner: string; winnerScore: number; players: Player[] };
const HISTORY = 'mille-sabords-history-v3';
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

const AI_LABELS: Record<AIDifficulty, string> = { matelot: '🤖 Matelot', corsaire: '🤖 Corsaire', capitaine: '🤖 Capitaine' };
const AI_PARAMS: Record<AIDifficulty, { minGroupHold: number; continueThreshold: number; maxRolls: number; skullContinueMaxRerollable: number }> = {
  matelot: { minGroupHold: 3, continueThreshold: 400, maxRolls: 3, skullContinueMaxRerollable: 0 },
  corsaire: { minGroupHold: 3, continueThreshold: 700, maxRolls: 4, skullContinueMaxRerollable: 2 },
  capitaine: { minGroupHold: 2, continueThreshold: 1200, maxRolls: 5, skullContinueMaxRerollable: 3 },
};

export default function GameApp() {
  const [screen, setScreen] = useState<'home' | 'setup' | 'game' | 'rules' | 'history' | 'learn'>('home');

  // --- Configuration de partie ---
  const [names, setNames] = useState(['Joueur 1', 'Joueur 2']);
  const [aiDifficulties, setAiDifficulties] = useState<Array<AIDifficulty | null>>([null, null]);
  const [targetChoice, setTargetChoice] = useState<'6000' | '8000' | 'autre'>('6000');
  const [customTarget, setCustomTarget] = useState(6000);
  const target = targetChoice === 'autre' ? customTarget : Number(targetChoice);
  const [options, setOptions] = useState<OptionsConfig>({ peace: false, zombieAttack: false, shipwreck: false });

  // --- État de partie ---
  const [players, setPlayers] = useState<Player[]>([]);
  const [current, setCurrent] = useState(0);
  const [deck, setDeck] = useState<PirateCard[]>([]);
  const [discard, setDiscard] = useState<PirateCard[]>([]);
  const [turn, setTurn] = useState<TurnState | null>(null);
  const [turnPhase, setTurnPhase] = useState<'deck' | 'card' | 'playing'>('deck'); // rituel de révélation en début de tour
  const [finalRound, setFinalRound] = useState<{ remainingIds: string[]; triggeredById: string } | null>(null);
  const [suddenDeath, setSuddenDeath] = useState(false); // le déclencheur est repassé sous l'objectif : la partie continue jusqu'à ce que quelqu'un l'atteigne à nouveau, victoire immédiate alors
  const [gameOverWinner, setGameOverWinner] = useState<Player | null>(null);
  const [celebrationDone, setCelebrationDone] = useState(false);

  // --- Historique et statut réseau ---
  const [saved, setSaved] = useState<SavedGame[]>([]);
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    try { setSaved(JSON.parse(localStorage.getItem(HISTORY) || '[]')); } catch {}
    const f = () => setOffline(!navigator.onLine);
    setOffline(!navigator.onLine);
    addEventListener('online', f); addEventListener('offline', f);
    return () => { removeEventListener('online', f); removeEventListener('offline', f); };
  }, []);
  useEffect(() => { localStorage.setItem(HISTORY, JSON.stringify(saved)); }, [saved]);

  // --- Animation de lancer en 2 appuis ---
  const [rollPhase, setRollPhase] = useState<'idle' | 'spinning'>('idle');
  const [spinFaces, setSpinFaces] = useState<DieSymbol[]>([]);
  const spinRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (spinRef.current) clearInterval(spinRef.current); }, []);

  // --- Joueur IA ---
  const aiRunningRef = useRef(false);
  const activeDifficulty = players[current]?.difficulty;
  const isAITurn = !!activeDifficulty;

  const ranking = useMemo(() => [...players].sort((a, b) => b.score - a.score), [players]);

  function rerollIndexes(t: TurnState): number[] {
    return t.dice.map((d, i) => ({ d, i })).filter(({ d }) => !d.held && !d.cursed && !d.onTreasureIsland).map(({ i }) => i);
  }
  function diceToRollCount(t: TurnState | null): number {
    if (!t || t.dice.length === 0) return 8;
    return rerollIndexes(t).length;
  }

  function drawCard(currentDeck: PirateCard[], currentDiscard: PirateCard[]): { card: PirateCard; deck: PirateCard[]; discard: PirateCard[] } {
    let d = currentDeck, disc = currentDiscard;
    if (d.length === 0) { d = shuffle(disc); disc = []; }
    const card = d[0];
    return { card, deck: d.slice(1), discard: disc };
  }

  function cardDescription(card: PirateCard): string {
    switch (card.type) {
      case 'pirate': return 'Tous les points obtenus ce tour sont doublés. Sur l\'Île de la Tête-de-Mort, les adversaires perdent 200 pts par tête de mort au lieu de 100.';
      case 'goldCoin': return "Le tour débute avec une pièce d'or bonus : +100 pts, en plus de sa valeur en combinaison.";
      case 'diamondCard': return 'Le tour débute avec un diamant bonus : +100 pts, en plus de sa valeur en combinaison.';
      case 'animals': return 'Singes et perroquets comptent comme un seul et même symbole pour former une combinaison.';
      case 'guardian': return 'Vous pouvez relancer exceptionnellement, une fois, un dé tête de mort.';
      case 'treasureIsland': return 'Après chaque lancer, déposez des dés sur l\'île pour les mettre à l\'abri : ils comptent même en cas de 3e tête de mort.';
      case 'skull': return `Le tour débute avec ${card.skulls} tête${(card.skulls || 0) > 1 ? 's' : ''} de mort d'office.`;
      case 'ship': return `Obtenez au moins ${card.sabresRequired} sabres. Succès : +${card.bonus} pts. Échec : -${card.bonus} pts. Empêche d'aller sur l'Île de la Tête-de-Mort.`;
      case 'peace': return 'Terminez le tour sans aucun sabre : score doublé. Sinon : -500 pts par sabre obtenu.';
      case 'zombieAttack': return 'Relancez jusqu\'à n\'obtenir que des sabres ou des têtes de mort (1 seul dé à relancer possible). 5 sabres ou plus : 1200 pts. Sinon, ces points vont aux adversaires.';
      case 'shipwreck': return '2 lancers de dés maximum. Après le 2e lancer, diamants et pièces d\'or rapportent le double de points.';
      default: return '';
    }
  }

  function start() {
    const ps: Player[] = names.map((n, i) => ({ id: String(i), name: n.trim() || `Joueur ${i + 1}`, score: 0, difficulty: aiDifficulties[i] ?? undefined }));
    const freshDeck = shuffle(buildDeck(options));
    const { card, deck: d, discard: disc } = drawCard(freshDeck, []);
    setPlayers(ps); setCurrent(0);
    setDeck(d); setDiscard(disc);
    setTurn(startTurn(card));
    setTurnPhase('deck');
    setFinalRound(null); setSuddenDeath(false); setGameOverWinner(null); setCelebrationDone(false);
    setScreen('game');
  }

  function startSpin() {
    if (!turn || rollPhase === 'spinning') return;
    if (!canRollAgain(turn)) return;
    const count = diceToRollCount(turn);
    setSpinFaces(rollDice(count));
    spinRef.current = setInterval(() => setSpinFaces(rollDice(count)), 90);
    setRollPhase('spinning');
  }
  function stopSpinAndReveal() {
    if (spinRef.current) clearInterval(spinRef.current);
    setRollPhase('idle');
    setTurn(t => (t ? performRoll(t) : t));
  }
  function onDiceAreaTap() {
    if (isAITurn) return;
    if (rollPhase === 'idle') startSpin(); else stopSpinAndReveal();
  }

  function onDieTap(i: number) {
    if (isAITurn) return;
    if (!turn || rollPhase === 'spinning') return;
    const die = turn.dice[i];
    if (!die) return;
    if (die.cursed) {
      if (turn.card.type === 'guardian' && !turn.guardianUsed) setTurn(useGuardian(turn, i));
      return;
    }
    if (die.onTreasureIsland) return;
    setTurn(toggleHold(turn, i));
  }

  function depositOnIsland() {
    if (isAITurn) return;
    if (!turn) return;
    let s = turn;
    turn.dice.forEach((d, i) => { if (d.held) s = placeOnTreasureIsland(s, i); });
    setTurn(s);
  }

  // --- Intelligence artificielle (3 niveaux : Matelot, Corsaire, Capitaine — sans triche, mêmes jets aléatoires) ---

  function aiDecideHolds(t: TurnState, card: PirateCard, difficulty: AIDifficulty): { holdIndices: number[]; islandIndices: number[] } {
    const params = AI_PARAMS[difficulty];
    const rerollable = t.dice.map((d, i) => ({ d, i })).filter(({ d }) => !d.held && !d.cursed && !d.onTreasureIsland);
    const isRerollable = (i: number) => rerollable.some(r => r.i === i);
    const counts: Record<string, number[]> = {};
    t.dice.forEach((d, i) => { if (d.symbol !== 'skull') (counts[d.symbol] ||= []).push(i); });

    const holdSet = new Set<number>();
    for (const [sym, idxs] of Object.entries(counts)) {
      if (sym === 'coin' || sym === 'diamond') idxs.forEach(i => { if (isRerollable(i)) holdSet.add(i); });
      if (idxs.length >= params.minGroupHold) idxs.forEach(i => { if (isRerollable(i)) holdSet.add(i); });
    }
    if (card.type === 'ship' || card.type === 'zombieAttack') {
      (counts['sabre'] || []).forEach(i => { if (isRerollable(i)) holdSet.add(i); });
    }
    if (card.type === 'peace') {
      (counts['sabre'] || []).forEach(i => holdSet.delete(i));
    }

    const islandSet = new Set<number>();
    if (card.type === 'treasureIsland') {
      holdSet.forEach(i => islandSet.add(i));
      holdSet.clear();
    }

    return { holdIndices: [...holdSet], islandIndices: [...islandSet] };
  }

  function aiShouldContinue(t: TurnState, card: PirateCard, difficulty: AIDifficulty): boolean {
    if (!canRollAgain(t)) return false;
    const params = AI_PARAMS[difficulty];
    const totalSkulls = t.dice.filter(d => d.symbol === 'skull').length;

    if (card.type === 'ship') return t.dice.filter(d => d.symbol === 'sabre').length < (card.sabresRequired || 0);
    if (card.type === 'peace') return t.dice.some(d => d.symbol === 'sabre');
    if (card.type === 'zombieAttack') return t.dice.some(d => d.symbol !== 'sabre' && d.symbol !== 'skull');
    if (card.type === 'shipwreck') return t.rollCount < 2;
    if (t.onSkullIsland) return true;

    const preview = computeScore(t).points;
    const rerollableCount = t.dice.filter(d => !d.held && !d.cursed && !d.onTreasureIsland).length;

    if (totalSkulls >= 2) {
      // Un profil plus téméraire peut retenter sa chance si peu de dés restent
      // en jeu (donc peu de risque d'une 3e tête de mort) et que le gain
      // potentiel reste modeste.
      return rerollableCount > 0 && rerollableCount <= params.skullContinueMaxRerollable && preview < params.continueThreshold;
    }
    return preview < params.continueThreshold && t.rollCount < params.maxRolls;
  }

  async function aiRoll(t: TurnState): Promise<TurnState> {
    const count = t.dice.length === 0 ? 8 : t.dice.filter(d => !d.held && !d.cursed && !d.onTreasureIsland).length;
    setSpinFaces(rollDice(count));
    setRollPhase('spinning');
    const interval = setInterval(() => setSpinFaces(rollDice(count)), 90);
    await sleep(1300);
    clearInterval(interval);
    setRollPhase('idle');
    const next = performRoll(t);
    setTurn(next);
    await sleep(700);
    return next;
  }

  async function aiApplyHolds(t: TurnState, card: PirateCard, difficulty: AIDifficulty): Promise<TurnState> {
    let cur = t;
    if (card.type === 'guardian' && !cur.guardianUsed) {
      const skullIdx = cur.dice.findIndex(d => d.symbol === 'skull');
      if (skullIdx !== -1) { cur = useGuardian(cur, skullIdx); setTurn(cur); await sleep(600); }
    }
    const { holdIndices, islandIndices } = aiDecideHolds(cur, card, difficulty);
    const actions: Array<{ type: 'hold' | 'island'; i: number }> = [
      ...holdIndices.map(i => ({ type: 'hold' as const, i })),
      ...islandIndices.map(i => ({ type: 'island' as const, i })),
    ];
    const totalMs = 5000;
    if (actions.length === 0) {
      await sleep(totalMs);
      return cur;
    }
    const step = totalMs / actions.length;
    for (const a of actions) {
      await sleep(step);
      cur = a.type === 'hold' ? toggleHold(cur, a.i) : placeOnTreasureIsland(cur, a.i);
      setTurn(cur);
    }
    return cur;
  }

  async function playAITurn(card: PirateCard, difficulty: AIDifficulty) {
    setRollPhase('idle');
    await sleep(2000); // clic sur le dos de la carte
    setTurnPhase('card');
    await sleep(2000); // carte vue de face
    setTurnPhase('playing');

    let t = startTurn(card);
    setTurn(t);

    while (canRollAgain(t)) {
      t = await aiRoll(t);                              // ~2s : (re)lancer les dés
      t = await aiApplyHolds(t, card, difficulty);       // 5s : choix des dés à garder
      if (!aiShouldContinue(t, card, difficulty)) break;
    }

    await sleep(1200); // petit temps de réflexion avant de valider le tour
    finishTurn(t);
  }

  useEffect(() => {
    if (screen !== 'game' || !turn || turnPhase !== 'deck') return;
    const difficulty = players[current]?.difficulty;
    if (!difficulty) return;
    if (aiRunningRef.current) return;
    aiRunningRef.current = true;
    playAITurn(turn.card, difficulty).finally(() => { aiRunningRef.current = false; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, turnPhase, current, turn?.card.id]);

  function displaySymbol(i: number): DieSymbol | null {
    if (!turn) return null;
    if (turn.dice.length === 0) return rollPhase === 'spinning' ? spinFaces[i] ?? null : null;
    const positions = rerollIndexes(turn);
    const pos = positions.indexOf(i);
    if (pos !== -1 && rollPhase === 'spinning') return spinFaces[pos] ?? turn.dice[i].symbol;
    return turn.dice[i].symbol;
  }

  function finishTurn(explicitTurn?: TurnState) {
    const t = explicitTurn ?? turn;
    if (!t) return;
    const result = computeScore(t);

    const activePlayer = players[current];
    let ps = players.map(p => (p.id === activePlayer.id ? { ...p, score: p.score + result.points } : p));

    if (result.adversaryPenaltyPerSkull) {
      const penaltyTotal = result.adversaryPenaltyPerSkull * t.skullsRevealedThisTurn;
      ps = ps.map(p => (p.id === activePlayer.id ? p : { ...p, score: p.score - penaltyTotal }));
    }
    if (result.redistributeToOthers) {
      const others = ps.filter(p => p.id !== activePlayer.id);
      const share = Math.floor(result.redistributeToOthers / Math.max(1, others.length));
      ps = ps.map(p => (p.id === activePlayer.id ? p : { ...p, score: p.score + share }));
    }
    setPlayers(ps);

    // Toute condition de victoire (objectif normal, Magie Pirate, mort subite)
    // laisse d'abord une dernière chance égale à tous les autres joueurs :
    // le tour en cours est toujours mené à son terme, et personne n'est
    // privé de son tour suivant. Seule exception : s'il n'y a personne
    // d'autre à la table (solo), la victoire est actée tout de suite.
    if (result.magiePirate) {
      startFinalRoundOrEnd(ps, activePlayer.id);
      advanceTurn(ps);
      return;
    }

    // Gestion de la fin de partie / dernier tour
    if (finalRound) {
      const trigger = ps.find(p => p.id === finalRound.triggeredById)!;
      if (trigger.score < target) {
        // Le déclencheur est repassé sous l'objectif : le dernier tour est annulé.
        // La partie continue ; le prochain à atteindre l'objectif aura, lui
        // aussi, droit à un dernier tour complet pour tout le monde.
        setFinalRound(null);
        setSuddenDeath(true);
        advanceTurn(ps);
        return;
      }
      const remaining = finalRound.remainingIds.filter(id => id !== activePlayer.id);
      if (remaining.length === 0) {
        const winner = [...ps].sort((a, b) => b.score - a.score)[0];
        endGame(ps, winner);
        return;
      }
      setFinalRound({ ...finalRound, remainingIds: remaining });
      advanceTurn(ps);
      return;
    }

    const updatedActive = ps.find(p => p.id === activePlayer.id)!;
    if (updatedActive.score >= target) {
      setSuddenDeath(false);
      startFinalRoundOrEnd(ps, activePlayer.id);
    }
    advanceTurn(ps);
  }

  /**
   * Donne un dernier tour uniquement aux joueurs qui n'ont pas encore joué
   * dans le cycle en cours (ceux placés APRÈS le vainqueur dans l'ordre de
   * jeu). Les joueurs déjà passés avant lui ce cycle-ci ont déjà autant de
   * tours que lui : ils n'ont pas droit à un tour supplémentaire. Si le
   * vainqueur est le dernier à jouer ce cycle (ou en solo), tout le monde a
   * déjà joué à égalité : la victoire est actée immédiatement.
   */
  function startFinalRoundOrEnd(ps: Player[], winnerId: string) {
    const order = ps.map(p => p.id);
    const startIdx = order.indexOf(winnerId);
    const remainingIds = order.slice(startIdx + 1);
    if (remainingIds.length === 0) {
      endGame(ps, ps.find(p => p.id === winnerId)!);
      return;
    }
    setFinalRound({ remainingIds, triggeredById: winnerId });
  }

  function advanceTurn(ps: Player[]) {
    const nextIndex = (current + 1) % ps.length;
    const { card, deck: d, discard: disc } = drawCard(deck, [...discard, turn!.card]);
    setDeck(d); setDiscard(disc);
    setCurrent(nextIndex);
    setTurn(startTurn(card));
    setTurnPhase('deck');
  }

  function endGame(ps: Player[], winner: Player) {
    const sorted = [...ps].sort((a, b) => b.score - a.score);
    setSaved(s => [...s, {
      id: crypto.randomUUID(), date: new Date().toISOString(), target,
      winner: winner.name, winnerScore: winner.score, players: sorted,
    }]);
    setCelebrationDone(false);
    setGameOverWinner(winner);
    setTurn(null);
  }

  // ---------------------------------------------------------------------
  // Écrans
  // ---------------------------------------------------------------------

  if (screen === 'home') return (
    <main className="shell">
      <Header offline={offline} />
      <section className="hero"><h1>🏴‍☠️ Mille Sabords</h1><p>By C. Guilhem</p><p>Jeu de dés pirate.</p></section>
      <div className="grid">
        <button onClick={() => setScreen('setup')}>🎲 Nouvelle partie</button>
        <button onClick={() => setScreen('learn')}>🧠 Apprendre</button>
        <button onClick={() => setScreen('rules')}>📖 Règles</button>
        <button onClick={() => setScreen('history')}>📚 Historique</button>
      </div>
    </main>
  );

  if (screen === 'setup') return (
    <main className="shell">
      <Header offline={offline} />
      <Panel title="Préparer la partie">
        <label>Nombre de joueurs
          <select value={names.length} onChange={e => {
            const n = +e.target.value;
            setNames(Array.from({ length: n }, (_, i) => names[i] || `Joueur ${i + 1}`));
            setAiDifficulties(Array.from({ length: n }, (_, i) => aiDifficulties[i] ?? null));
          }}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map(n => <option key={n}>{n}</option>)}
          </select>
        </label>
        {names.map((n, i) => (
          <label key={i}>Nom du joueur {i + 1}
            <div className="actions">
              <input value={n} onChange={e => setNames(names.map((x, j) => (j === i ? e.target.value : x)))} style={{ flex: 1 }} />
              <select
                value={aiDifficulties[i] ?? 'human'}
                onChange={e => {
                  const v = e.target.value === 'human' ? null : (e.target.value as AIDifficulty);
                  setAiDifficulties(aiDifficulties.map((d, j) => (j === i ? v : d)));
                }}
              >
                <option value="human">🧑 Humain</option>
                <option value="matelot">🤖 Matelot</option>
                <option value="corsaire">🤖 Corsaire</option>
                <option value="capitaine">🤖 Capitaine</option>
              </select>
            </div>
          </label>
        ))}
        <label>Objectif de victoire</label>
        <div className="actions">
          {(['6000', '8000', 'autre'] as const).map(v => (
            <button key={v} className={targetChoice === v ? '' : 'secondary'} onClick={() => setTargetChoice(v)}>
              {v === 'autre' ? 'Autre' : `${v} pts`}
            </button>
          ))}
        </div>
        {targetChoice === 'autre' && (
          <label>Valeur personnalisée
            <input type="number" min="100" step="100" value={customTarget} onChange={e => setCustomTarget(Math.max(100, +e.target.value || 100))} />
          </label>
        )}
        <label>Cartes d'options (en plus des 29 cartes de base)</label>
        <div className="actions">
          {OPTION_CARDS.map(c => {
            const key = c.type as keyof OptionsConfig;
            const active = options[key];
            return (
              <button key={c.id} className={active ? '' : 'secondary'} onClick={() => setOptions(o => ({ ...o, [key]: !o[key] }))}>
                {c.icon} {c.label}
              </button>
            );
          })}
        </div>
        <button onClick={start}>🏴‍☠️ Commencer</button>
        <button className="secondary" onClick={() => setScreen('home')}>Retour</button>
      </Panel>
    </main>
  );

  if (screen === 'rules') return (
    <main className="shell">
      <Header offline={offline} />
      <Panel title="📖 Règles intégrées">
        <Rule t="But">Atteindre l'objectif choisi (6000, 8000 ou une valeur libre).</Rule>
        <Rule t="Tour">Révéler une carte puis lancer les 8 dés. Le joueur choisit de s'arrêter ou de relancer.</Rule>
        <Rule t="Relances">Un nouveau lancer nécessite au moins 2 dés (1 seul avec Attaque de Zombies). Une tête de mort est maudite et ne peut plus être relancée, sauf avec la Gardienne.</Rule>
        <Rule t="Points">3/4/5/6/7/8 dés identiques = 100/200/500/1000/2000/4000. Chaque diamant et pièce d'or vaut 100 points supplémentaires. Utiliser les 8 dés sans aucune tête de mort rapporte +500 (Coffre au trésor plein).</Rule>
        <Rule t="Île de la Tête-de-Mort">4 têtes de mort ou plus au premier lancer envoient sur l'île (sauf carte Bateau Pirate) : aucun point pour le joueur, mais chaque tête révélée fait perdre 100 points à chaque adversaire (200 avec la carte Pirate).</Rule>
        <Rule t="Cartes de base (29)">3 Pirate, 3 Île au Trésor, 3 Pièce d'or, 3 Diamant, 3 Animaux, 3 Gardienne, 3 Tête de Mort ×1, 2 Tête de Mort ×2, 6 Bateau Pirate (2 sabres/300 pts, 3 sabres/500 pts, 4 sabres/1000 pts, 2 exemplaires chacune).</Rule>
        <Rule t="Options (10)">3 Attaque de Zombies, 4 La Paix, 3 Naufrage — activables individuellement ou en bloc avant la partie.</Rule>
        <Rule t="Magie Pirate">Réaliser une combinaison de 9 symboles identiques (carte Pièce d'or/Diamant + 8 dés) déclenche la victoire — comme pour l'objectif normal, tous les autres joueurs ont encore droit à un dernier tour avant que le classement final ne soit acté.</Rule>
        <Rule t="Fin">Le premier à atteindre l'objectif déclenche le dernier tour des autres joueurs. Le plus haut score final gagne.</Rule>
        <button className="secondary" onClick={() => setScreen('home')}>Retour</button>
      </Panel>
    </main>
  );

  if (screen === 'history') return (
    <main className="shell">
      <Header offline={offline} />
      <Panel title="📚 Historique">
        <p>Stockage local : les parties restent disponibles hors ligne.</p>
        {saved.length ? saved.sort((a, b) => b.winnerScore - a.winnerScore).map(g => (
          <article className="history" key={g.id}>
            <b>🏆 {g.winner} — {g.winnerScore} pts</b>
            <span>{new Date(g.date).toLocaleString('fr-FR')} · objectif {g.target}</span>
            <span>{g.players.map(p => `${p.name}: ${p.score}`).join(' · ')}</span>
            <button className="danger" onClick={() => setSaved(saved.filter(x => x.id !== g.id))}>🗑️ Effacer</button>
          </article>
        )) : <p>Aucune partie.</p>}
        <button className="secondary" onClick={() => setScreen('home')}>Retour</button>
      </Panel>
    </main>
  );

  if (screen === 'learn') return (
    <main className="shell">
      <Header offline={offline} />
      <Panel title="🧠 Mode Apprendre">
        <p>Ce mode analysera chaque situation sans modifier les dés : probabilités d'obtenir une combinaison, risque de troisième tête de mort, gain moyen attendu et comparaison arrêt/relance.</p>
        <div className="tip">🎯 Le conseil sera calculé à partir de la situation réellement visible, jamais à partir du futur tirage.</div>
        <button className="secondary" onClick={() => setScreen('home')}>Retour</button>
      </Panel>
    </main>
  );

  if (gameOverWinner && !celebrationDone) return (
    <GameOverCelebration winnerName={gameOverWinner.name} onDismiss={() => setCelebrationDone(true)} />
  );

  if (gameOverWinner) return (
    <main className="shell">
      <Header offline={offline} />
      <Panel title="🏆 Fin de la partie">
        <p><b>{gameOverWinner.name}</b> remporte la partie avec <b>{gameOverWinner.score}</b> points !</p>
        <h3>Classement final</h3>
        <ol>{ranking.map(p => <li key={p.id}>{p.name} — <b>{p.score}</b></li>)}</ol>
        <button onClick={() => setScreen('home')}>Retour à l'accueil</button>
      </Panel>
    </main>
  );

  if (!turn) return null;

  const card = turn.card;

  if (turnPhase === 'deck') return (
    <main className="shell reveal-shell" onClick={isAITurn ? undefined : () => setTurnPhase('card')}>
      <div className="reveal-deck">
        <div className="deck-stack">
          <div className="deck-back" />
          <div className="deck-back" />
          <div className="deck-back deck-top">🏴‍☠️</div>
        </div>
        <h2>Au tour de {players[current]?.name}</h2>
        <p className="hint">{isAITurn ? '🤖 L\'IA va révéler sa carte...' : 'Touchez le paquet pour révéler votre carte'}</p>
      </div>
    </main>
  );

  if (turnPhase === 'card') return (
    <main className="shell reveal-shell" onClick={isAITurn ? undefined : () => setTurnPhase('playing')}>
      <div className="reveal-card">
        <img
          src={`/cards/${card.id}.jpg`}
          alt={card.label}
          className="reveal-card-art"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
        <h2>{card.icon} {card.label}</h2>
        <p>{cardDescription(card)}</p>
        <p className="hint">{isAITurn ? '🤖 L\'IA rejoint la table de jeu...' : 'Touchez la carte pour rejoindre la table de jeu'}</p>
      </div>
    </main>
  );

  const rollCount = diceToRollCount(turn);
  const canRoll = canRollAgain(turn);
  const turnEnded = turn.bust || turn.shipImmediateFailure;
  const canFinish = turn.dice.length > 0 && rollPhase === 'idle' && !(turn.onSkullIsland && !turnEnded);
  const preview = turn.dice.length > 0 && rollPhase === 'idle' ? computeScore(turn) : null;

  return (
    <main className="shell">
      <Header offline={offline} />
      <Panel title={`🎲 Tour de ${players[current]?.name}`}>
        {isAITurn && <p className="warning">{AI_LABELS[activeDifficulty!]} joue son tour...</p>}
        {finalRound && <p className="warning">🏁 Dernier tour ! L'objectif de {target} points a été atteint.</p>}
        {suddenDeath && !finalRound && <p className="warning">⚔️ Le déclencheur est repassé sous l'objectif : la partie continue jusqu'à ce que quelqu'un atteigne à nouveau {target} points — un dernier tour sera alors rejoué pour tout le monde.</p>}
        <div className={isAITurn ? 'locked' : ''}>
        <div className="card">
          <img
            src={`/cards/${card.id}.jpg`}
            alt={card.label}
            className="card-art"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
          <div>{card.icon} <b>{card.label}</b>
            {card.type === 'ship' && <span> — {card.sabresRequired} sabre(s) requis, bonus/pénalité {card.bonus} pts</span>}
          </div>
        </div>

        <div className="dice" onClick={turn.dice.length === 0 || rollPhase === 'spinning' ? onDiceAreaTap : undefined}>
          {Array.from({ length: 8 }).map((_, i) => {
            const die = turn.dice[i];
            const symbol = displaySymbol(i);
            const classes = ['die'];
            if (die?.held) classes.push('selected');
            if (die?.cursed) classes.push('cursed');
            if (die?.onTreasureIsland) classes.push('treasure');
            if (rollPhase === 'spinning') classes.push('spinning');
            return (
              <button
                key={i}
                className={classes.join(' ')}
                onClick={(e) => { if (turn.dice.length > 0 && rollPhase === 'idle') { e.stopPropagation(); onDieTap(i); } }}
              >
                {symbol ? SYMBOLS[symbol] : '🎴'}
              </button>
            );
          })}
        </div>

        {(canRoll || rollPhase === 'spinning') && (
          <button onClick={onDiceAreaTap} disabled={isAITurn}>
            {rollPhase === 'spinning'
              ? '✋ Arrêter les dés'
              : turn.dice.length === 0
                ? '🎲 Premier lancer — 8 dés'
                : `🎲 Relancer ${rollCount} dé${rollCount > 1 ? 's' : ''}`}
          </button>
        )}
        {!canRoll && rollPhase === 'idle' && !turnEnded && turn.dice.length > 0 && (
          <p className="hint">Plus assez de dés disponibles pour relancer : vous devez terminer votre tour.</p>
        )}

        {card.type === 'treasureIsland' && turn.dice.some(d => d.held) && (
          <button className="secondary" onClick={depositOnIsland} disabled={isAITurn}>🏝️ Déposer les dés tenus sur l'Île au Trésor</button>
        )}
        {card.type === 'guardian' && !turn.guardianUsed && (
          <p className="hint">🧙‍♀️ Touchez un dé tête de mort pour le relancer exceptionnellement.</p>
        )}

        {preview && (
          <>
            <div className="scorebox"><span>Points si vous vous arrêtez maintenant</span><b>{preview.points}</b></div>
            {preview.details.length > 0 && (
              <div className="details"><b>Détail du calcul</b>{preview.details.map((d, i) => <div key={i}>{d.label} : {d.points >= 0 ? '+' : ''}{d.points}</div>)}</div>
            )}
            {preview.bust && <p className="warning">☠️ Ce tour se termine de force.</p>}
          </>
        )}

        <button className="finish" disabled={!canFinish || isAITurn} onClick={() => finishTurn()}>✅ Terminer le tour</button>
        </div>

        <h3>Classement provisoire</h3>
        <ol>{ranking.map(p => <li key={p.id}>{p.name} {p.difficulty ? AI_LABELS[p.difficulty] : ''} — <b>{p.score}</b></li>)}</ol>
        <button className="secondary" onClick={() => setScreen('home')}>Quitter</button>
      </Panel>
    </main>
  );
}

function Header({ offline }: { offline: boolean }) {
  return (
    <header>
      🏴‍☠️ <b>Mille Sabords By C. Guilhem</b>
      <span className="net">{offline ? '📴 Hors ligne' : '☁️ En ligne'} · v{APP_VERSION}</span>
    </header>
  );
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="panel"><h2>{title}</h2>{children}</section>;
}
function Rule({ t, children }: { t: string; children: React.ReactNode }) {
  return <div className="rule"><h3>{t}</h3><p>{children}</p></div>;
}

function GameOverCelebration({ winnerName, onDismiss }: { winnerName: string; onDismiss: () => void }) {
  const [burst, setBurst] = useState(false);
  const [confetti, setConfetti] = useState<Array<{ id: number; left: number; color: string; delay: number; duration: number }>>([]);
  const played = useRef(false);
  const nextId = useRef(0);

  function addConfettiBatch(count: number) {
    const colors = ['#d8a94c', '#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#f5efe2'];
    setConfetti(prev => {
      const fresh = Array.from({ length: count }, () => ({
        id: nextId.current++,
        left: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 0.3,
        duration: 2.6 + Math.random() * 1.6,
      }));
      // Fenêtre glissante : évite d'accumuler indéfiniment des nœuds DOM
      // tant que l'écran n'est pas retouché.
      return [...prev, ...fresh].slice(-260);
    });
  }

  useEffect(() => {
    if (played.current) return;
    played.current = true;
    const IGNITE_DELAY = 900; // temps laissé au pirate pour rejoindre le canon et allumer la mèche

    let burstTimer: ReturnType<typeof setTimeout> | undefined;
    let firstConfettiTimer: ReturnType<typeof setTimeout> | undefined;
    let confettiInterval: ReturnType<typeof setInterval> | undefined;
    let soundInterval: ReturnType<typeof setInterval> | undefined;

    const igniteTimer = setTimeout(() => {
      playVictoryFanfare(); // boum → sifflement → explosion → 1re salve de cotillons
      burstTimer = setTimeout(() => setBurst(true), 1050);
      firstConfettiTimer = setTimeout(() => addConfettiBatch(90), 1080);
      // Pluie de confettis et bruitages qui continuent sans discontinuer
      // jusqu'à ce que l'utilisateur touche l'écran (composant démonté).
      confettiInterval = setInterval(() => addConfettiBatch(35), 1100);
      soundInterval = setInterval(() => playConfettiLoopSound(), 2600);
    }, IGNITE_DELAY);

    return () => {
      clearTimeout(igniteTimer);
      if (burstTimer) clearTimeout(burstTimer);
      if (firstConfettiTimer) clearTimeout(firstConfettiTimer);
      if (confettiInterval) clearInterval(confettiInterval);
      if (soundInterval) clearInterval(soundInterval);
    };
  }, []);

  return (
    <div className="celebration" onClick={onDismiss}>
      <div className="celebration-title">
        <div className="trophy">🏆</div>
        <h1>{winnerName}</h1>
        <p>remporte la partie !</p>
        <p className="tap-hint">Touchez l'écran pour voir le classement</p>
      </div>
      <div className="ignite-scene">
        <div className="pirate-figure">
          <div className="pirate-name-tag">🏴‍☠️ {winnerName}</div>
          <img
            src="/cards/pirate.jpg"
            alt={winnerName}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
        <div className="cannon-rig">
          <span className="spark">✨</span>
          <div className="cannon-flag">💀</div>
          <div className="cannon-barrel" />
          <div className="cannon-wheel" />
          <div className="cannonball" />
          {burst && <div className="burst" />}
        </div>
      </div>
      {confetti.map(c => (
        <span
          key={c.id}
          className="confetti-piece"
          style={{ left: `${c.left}%`, background: c.color, animationDelay: `${c.delay}s`, animationDuration: `${c.duration}s` }}
        />
      ))}
    </div>
  );
}
