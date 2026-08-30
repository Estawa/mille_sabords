'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DieSymbol, PirateCard, SYMBOLS, OptionsConfig, OPTION_CARDS,
  TurnState,
  buildDeck, shuffle, rollDice,
  startTurn, performRoll, toggleHold, useGuardian, placeOnTreasureIsland,
  canRollAgain, computeScore,
} from '../lib/engine';

type Player = { id: string; name: string; score: number };
type SavedGame = { id: string; date: string; target: number; winner: string; winnerScore: number; players: Player[] };
const HISTORY = 'mille-sabords-history-v3';

export default function GameApp() {
  const [screen, setScreen] = useState<'home' | 'setup' | 'game' | 'rules' | 'history' | 'learn'>('home');

  // --- Configuration de partie ---
  const [names, setNames] = useState(['Joueur 1', 'Joueur 2']);
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
    const ps: Player[] = names.map((n, i) => ({ id: String(i), name: n.trim() || `Joueur ${i + 1}`, score: 0 }));
    const freshDeck = shuffle(buildDeck(options));
    const { card, deck: d, discard: disc } = drawCard(freshDeck, []);
    setPlayers(ps); setCurrent(0);
    setDeck(d); setDiscard(disc);
    setTurn(startTurn(card));
    setTurnPhase('deck');
    setFinalRound(null); setSuddenDeath(false); setGameOverWinner(null);
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
    if (rollPhase === 'idle') startSpin(); else stopSpinAndReveal();
  }

  function onDieTap(i: number) {
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
    if (!turn) return;
    let s = turn;
    turn.dice.forEach((d, i) => { if (d.held) s = placeOnTreasureIsland(s, i); });
    setTurn(s);
  }

  function displaySymbol(i: number): DieSymbol | null {
    if (!turn) return null;
    if (turn.dice.length === 0) return rollPhase === 'spinning' ? spinFaces[i] ?? null : null;
    const positions = rerollIndexes(turn);
    const pos = positions.indexOf(i);
    if (pos !== -1 && rollPhase === 'spinning') return spinFaces[pos] ?? turn.dice[i].symbol;
    return turn.dice[i].symbol;
  }

  function finishTurn() {
    if (!turn) return;
    const result = computeScore(turn);

    const activePlayer = players[current];
    let ps = players.map(p => (p.id === activePlayer.id ? { ...p, score: p.score + result.points } : p));

    if (result.adversaryPenaltyPerSkull) {
      const penaltyTotal = result.adversaryPenaltyPerSkull * turn.skullsRevealedThisTurn;
      ps = ps.map(p => (p.id === activePlayer.id ? p : { ...p, score: p.score - penaltyTotal }));
    }
    if (result.redistributeToOthers) {
      const others = ps.filter(p => p.id !== activePlayer.id);
      const share = Math.floor(result.redistributeToOthers / Math.max(1, others.length));
      ps = ps.map(p => (p.id === activePlayer.id ? p : { ...p, score: p.score + share }));
    }
    setPlayers(ps);

    // Victoire immédiate (Magie Pirate)
    if (result.magiePirate) {
      const winner = ps.find(p => p.id === activePlayer.id)!;
      endGame(ps, winner);
      return;
    }

    // Gestion de la fin de partie / dernier tour
    if (finalRound) {
      const trigger = ps.find(p => p.id === finalRound.triggeredById)!;
      if (trigger.score < target) {
        // Le déclencheur est repassé sous l'objectif : le dernier tour est annulé.
        // La partie continue ; le prochain à atteindre l'objectif gagne immédiatement.
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
      if (suddenDeath) {
        // Mort subite : victoire immédiate, sans nouveau tour final.
        endGame(ps, updatedActive);
        return;
      }
      const order = ps.map(p => p.id);
      const startIdx = order.indexOf(activePlayer.id);
      const remainingIds = order.filter((_, idx) => idx !== startIdx);
      if (remainingIds.length === 0) {
        // Solo (1 joueur) : personne d'autre à faire jouer, victoire immédiate.
        endGame(ps, updatedActive);
        return;
      }
      setFinalRound({ remainingIds, triggeredById: activePlayer.id });
    }
    advanceTurn(ps);
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
          <select value={names.length} onChange={e => { const n = +e.target.value; setNames(Array.from({ length: n }, (_, i) => names[i] || `Joueur ${i + 1}`)); }}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map(n => <option key={n}>{n}</option>)}
          </select>
        </label>
        {names.map((n, i) => (
          <label key={i}>Nom du joueur {i + 1}
            <input value={n} onChange={e => setNames(names.map((x, j) => (j === i ? e.target.value : x)))} />
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
        <Rule t="Magie Pirate">Réaliser une combinaison de 9 symboles identiques (carte Pièce d'or/Diamant + 8 dés) fait gagner la partie immédiatement.</Rule>
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
    <main className="shell reveal-shell" onClick={() => setTurnPhase('card')}>
      <div className="reveal-deck">
        <div className="deck-stack">
          <div className="deck-back" />
          <div className="deck-back" />
          <div className="deck-back deck-top">🏴‍☠️</div>
        </div>
        <h2>Au tour de {players[current]?.name}</h2>
        <p className="hint">Touchez le paquet pour révéler votre carte</p>
      </div>
    </main>
  );

  if (turnPhase === 'card') return (
    <main className="shell reveal-shell" onClick={() => setTurnPhase('playing')}>
      <div className="reveal-card">
        <img
          src={`/cards/${card.id}.jpg`}
          alt={card.label}
          className="reveal-card-art"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
        <h2>{card.icon} {card.label}</h2>
        <p>{cardDescription(card)}</p>
        <p className="hint">Touchez la carte pour rejoindre la table de jeu</p>
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
        {finalRound && <p className="warning">🏁 Dernier tour ! L'objectif de {target} points a été atteint.</p>}
        {suddenDeath && !finalRound && <p className="warning">⚔️ Le déclencheur est repassé sous l'objectif : la partie continue jusqu'à ce que quelqu'un atteigne à nouveau {target} points (victoire immédiate).</p>}
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
          <button onClick={onDiceAreaTap}>
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
          <button className="secondary" onClick={depositOnIsland}>🏝️ Déposer les dés tenus sur l'Île au Trésor</button>
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

        <button className="finish" disabled={!canFinish} onClick={finishTurn}>✅ Terminer le tour</button>

        <h3>Classement provisoire</h3>
        <ol>{ranking.map(p => <li key={p.id}>{p.name} — <b>{p.score}</b></li>)}</ol>
        <button className="secondary" onClick={() => setScreen('home')}>Quitter</button>
      </Panel>
    </main>
  );
}

function Header({ offline }: { offline: boolean }) {
  return <header>🏴‍☠️ <b>Mille Sabords By C. Guilhem</b><span className="net">{offline ? '📴 Hors ligne' : '☁️ En ligne'}</span></header>;
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="panel"><h2>{title}</h2>{children}</section>;
}
function Rule({ t, children }: { t: string; children: React.ReactNode }) {
  return <div className="rule"><h3>{t}</h3><p>{children}</p></div>;
}
