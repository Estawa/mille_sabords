// Effets sonores de la célébration de fin de partie.
//
// ⚠️ Note pour toute IA reprenant ce projet : aucun fichier audio réel n'est
// utilisé ici. Faute d'accès réseau au moment de la création, tous les sons
// sont SYNTHÉTISÉS en direct via la Web Audio API (oscillateurs + bruit
// blanc filtré). C'est donc volontairement approximatif, en particulier les
// applaudissements/acclamations (impossibles à bien imiter sans un vrai
// enregistrement). Si l'utilisateur fournit un jour de vrais fichiers son,
// les déposer dans /public/sfx/ (ex. boom.mp3, sifflement.mp3, explosion.mp3,
// cotillons.mp3) et remplacer le contenu de playVictoryFanfare() par de
// simples <audio> ou new Audio('/sfx/...').play() — ce sera bien plus
// convaincant qu'une synthèse.

function createNoiseBurst(ctx: AudioContext, startTime: number, duration: number, peakGain: number, destination: AudioNode) {
  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.5);
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(peakGain, startTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  src.connect(gain).connect(destination);
  src.start(startTime);
  return src;
}

function scheduleApplause(ctx: AudioContext, startTime: number, duration: number, destination: AudioNode) {
  const clapCount = Math.floor(duration * 22);
  for (let i = 0; i < clapCount; i++) {
    const t = startTime + Math.random() * duration;
    const bufferSize = Math.floor(ctx.sampleRate * 0.03);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let j = 0; j < bufferSize; j++) data[j] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2200 + Math.random() * 1800;
    const gain = ctx.createGain();
    const peak = 0.12 + Math.random() * 0.1;
    gain.gain.setValueAtTime(peak, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    src.connect(filter).connect(gain).connect(destination);
    src.start(t);
  }
}

function scheduleCheerWhistles(ctx: AudioContext, startTime: number, destination: AudioNode) {
  for (let i = 0; i < 2; i++) {
    const t = startTime + i * 0.5 + Math.random() * 0.15;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, t);
    osc.frequency.linearRampToValueAtTime(1900, t + 0.4);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.22, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    osc.connect(gain).connect(destination);
    osc.start(t);
    osc.stop(t + 0.55);
  }
  // "cris" de foule approximés par un bruit large, discret et prolongé
  createNoiseBurst(ctx, startTime, 2.2, 0.09, destination);
}

let sharedCtx: AudioContext | null = null;
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtxClass) return null;
  if (!sharedCtx) sharedCtx = new AudioCtxClass();
  if (sharedCtx.state === 'suspended') sharedCtx.resume().catch(() => {});
  return sharedCtx;
}

/**
 * Séquence complète : tir de canon (boum) → sifflement du boulet qui monte
 * → explosion → applaudissements/acclamations/sifflet des cotillons.
 * À déclencher au moment où l'animation visuelle démarre.
 */
export function playVictoryFanfare() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const out = ctx.destination;
  const now = ctx.currentTime + 0.02;

  // --- Boum du tir ---
  const boom = ctx.createOscillator();
  boom.type = 'sine';
  boom.frequency.setValueAtTime(130, now);
  boom.frequency.exponentialRampToValueAtTime(35, now + 0.28);
  const boomGain = ctx.createGain();
  boomGain.gain.setValueAtTime(0.9, now);
  boomGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
  boom.connect(boomGain).connect(out);
  boom.start(now);
  boom.stop(now + 0.4);
  createNoiseBurst(ctx, now, 0.15, 0.6, out); // "crac" de poudre

  // --- Sifflement du boulet qui monte ---
  const whistle = ctx.createOscillator();
  whistle.type = 'sine';
  whistle.frequency.setValueAtTime(500, now + 0.12);
  whistle.frequency.linearRampToValueAtTime(1500, now + 0.95);
  const whistleGain = ctx.createGain();
  whistleGain.gain.setValueAtTime(0.0001, now + 0.12);
  whistleGain.gain.exponentialRampToValueAtTime(0.22, now + 0.3);
  whistleGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.0);
  whistle.connect(whistleGain).connect(out);
  whistle.start(now + 0.12);
  whistle.stop(now + 1.05);

  // --- Explosion du boulet ---
  const explosionAt = now + 1.05;
  createNoiseBurst(ctx, explosionAt, 0.6, 0.9, out);
  const thump = ctx.createOscillator();
  thump.type = 'triangle';
  thump.frequency.setValueAtTime(90, explosionAt);
  thump.frequency.exponentialRampToValueAtTime(28, explosionAt + 0.3);
  const thumpGain = ctx.createGain();
  thumpGain.gain.setValueAtTime(0.8, explosionAt);
  thumpGain.gain.exponentialRampToValueAtTime(0.0001, explosionAt + 0.35);
  thump.connect(thumpGain).connect(out);
  thump.start(explosionAt);
  thump.stop(explosionAt + 0.4);

  // --- Cotillons : applaudissements + acclamations + sifflet ---
  scheduleApplause(ctx, explosionAt + 0.15, 2.3, out);
  scheduleCheerWhistles(ctx, explosionAt + 0.25, out);
}
