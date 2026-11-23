// EMBERFALL sound effects, synthesised with WebAudio oscillators.
// No audio files: every blip is generated, so the game loads nothing.

let ctx = null;
let muted = false;

function ensureCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  }
  if (ctx && ctx.state === "suspended") ctx.resume();
  return ctx;
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

export function isMuted() {
  return muted;
}

function tone(freq, dur, type = "sine", gain = 0.12, when = 0) {
  if (muted) return;
  const ac = ensureCtx();
  if (!ac) return;
  const t = ac.currentTime + when;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur);
}

export const sfx = {
  draw() { tone(520, 0.08, "triangle", 0.06); },
  play() { tone(330, 0.12, "triangle", 0.12); tone(495, 0.14, "triangle", 0.1, 0.06); },
  spell() { tone(880, 0.18, "sine", 0.12); tone(1174, 0.2, "sine", 0.08, 0.08); },
  attack() { tone(160, 0.16, "sawtooth", 0.14); tone(90, 0.2, "square", 0.1, 0.05); },
  hurt() { tone(220, 0.14, "square", 0.1); },
  die() { tone(300, 0.3, "sawtooth", 0.1); tone(140, 0.35, "sawtooth", 0.08, 0.1); },
  turn() { tone(440, 0.1, "triangle", 0.08); tone(660, 0.12, "triangle", 0.08, 0.08); },
  win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.35, "triangle", 0.14, i * 0.13)); },
  lose() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.35, "sine", 0.12, i * 0.15)); },
  select() { tone(700, 0.05, "sine", 0.05); },
  error() { tone(140, 0.12, "square", 0.08); },
};
