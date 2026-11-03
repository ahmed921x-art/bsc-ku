// Subtle synthesized sound effects (no audio files needed, works offline).
let ctx = null, master = null, noiseBuf = null;
const loops = {};
let muted = false;

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = 0.55; master.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}
export function unlockAudio() { const c = ensure(); if (c && c.state === 'suspended') c.resume(); }
export function setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.55; }
export function isMuted() { return muted; }

function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
function tone(freq, dur, { type = 'sine', vol = 0.15, attack = 0.005, slide = 0 } = {}) {
  const c = ensure(); if (!c || muted) return;
  const t = c.currentTime, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
  env(g, t, attack, vol, dur); o.connect(g); g.connect(master); o.start(t); o.stop(t + attack + dur + 0.05);
}
function noise(dur, { vol = 0.1, freq = 2000, q = 1, type = 'bandpass', attack = 0.003, sweep = 0 } = {}) {
  const c = ensure(); if (!c || muted) return;
  const t = c.currentTime, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = noiseBuf; f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(50, freq + sweep), t + dur);
  env(g, t, attack, vol, dur); s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random()); s.stop(t + dur + 0.1);
}
function loop(name, on, build) {
  const c = ensure(); if (!c) return;
  if (on && !loops[name]) { loops[name] = build(c); }
  else if (!on && loops[name]) {
    const l = loops[name]; delete loops[name];
    const t = c.currentTime; l.gain.gain.setTargetAtTime(0.0001, t, 0.35);
    setTimeout(() => l.nodes.forEach(n => { try { n.stop(); } catch (e) { /* already stopped */ } }), 1800);
  }
}

export const sfx = {
  tap: () => tone(1400, 0.03, { vol: 0.04, type: 'triangle' }),
  click: (v = 0.3) => tone(2200, 0.02, { vol: 0.08 * v + 0.02, type: 'square' }),
  pick: () => { noise(0.08, { vol: 0.06, freq: 900, q: 0.8 }); tone(520, 0.06, { vol: 0.04, type: 'triangle' }); },
  place: () => { tone(180, 0.08, { vol: 0.09, type: 'triangle' }); noise(0.05, { vol: 0.05, freq: 3000 }); },
  tip: () => { tone(900, 0.03, { vol: 0.08, type: 'square' }); noise(0.04, { vol: 0.08, freq: 5000, q: 3 }); },
  eject: () => { noise(0.07, { vol: 0.1, freq: 4000, q: 2 }); tone(300, 0.08, { vol: 0.05, type: 'triangle', slide: -150 }); },
  whoosh: (v = 0.2) => noise(0.18, { vol: 0.04 * v * 4, freq: 600, q: 0.6, sweep: 1200 }),
  aspirate: () => noise(0.35, { vol: 0.07, freq: 500, q: 2, sweep: 900, attack: 0.05 }),
  dispense: () => noise(0.3, { vol: 0.07, freq: 1400, q: 2, sweep: -900, attack: 0.03 }),
  squish: () => { for (let i = 0; i < 4; i++) setTimeout(() => noise(0.1, { vol: 0.05, freq: 700 + i * 80, q: 3 }), i * 110); },
  bubble: () => { for (let i = 0; i < 3; i++) setTimeout(() => tone(500 + Math.random() * 600, 0.05, { vol: 0.05, slide: 400 }), i * 60); },
  flick: () => { tone(260, 0.04, { vol: 0.08, type: 'triangle' }); noise(0.12, { vol: 0.05, freq: 1200, q: 3 }); },
  invert: () => noise(0.4, { vol: 0.05, freq: 800, q: 2, sweep: 600, attack: 0.1 }),
  cut: () => { noise(0.12, { vol: 0.1, freq: 3200, q: 4 }); tone(150, 0.05, { vol: 0.06, type: 'triangle' }); },
  grind: () => noise(0.08, { vol: 0.05, freq: 600 + Math.random() * 300, q: 2 }),
  cap: (open) => { tone(open ? 700 : 420, 0.03, { vol: 0.1, type: 'square' }); noise(0.03, { vol: 0.06, freq: 2500 }); },
  lid: () => { tone(220, 0.12, { vol: 0.08, type: 'triangle', slide: 60 }); noise(0.1, { vol: 0.04, freq: 1500 }); },
  cloth: () => noise(0.35, { vol: 0.06, freq: 1800, q: 0.5, attack: 0.08 }),
  cut2: () => {},
  beep: (n = 1) => { for (let i = 0; i < n; i++) setTimeout(() => tone(1760, 0.09, { vol: 0.07, type: 'sine' }), i * 160); },
  success: () => { [660, 880, 1320].forEach((f, i) => setTimeout(() => tone(f, 0.18, { vol: 0.07, type: 'sine' }), i * 90)); },
  error: () => { tone(220, 0.2, { vol: 0.08, type: 'sawtooth', slide: -60 }); },
  pour: (on) => loop('pour', on, (c) => {
    const s = c.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
    const g = c.createGain(); g.gain.value = 0.0001; g.gain.setTargetAtTime(muted ? 0 : 0.08, c.currentTime, 0.1);
    s.connect(f); f.connect(g); g.connect(master); s.start(); return { gain: g, nodes: [s] };
  }),
  vortex: (on) => loop('vortex', on, (c) => {
    const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 48;
    const s = c.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 400; f.Q.value = 1;
    const g = c.createGain(); g.gain.value = 0.0001; g.gain.setTargetAtTime(muted ? 0 : 0.06, c.currentTime, 0.05);
    o.connect(g); s.connect(f); f.connect(g); g.connect(master); o.start(); s.start(); return { gain: g, nodes: [o, s] };
  }),
  centrifuge: (on, pitch = 1) => loop('cfg', on, (c) => {
    const o = c.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(60, c.currentTime); o.frequency.exponentialRampToValueAtTime(380 * pitch, c.currentTime + 4);
    const s = c.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.7;
    const g = c.createGain(); g.gain.value = 0.0001; g.gain.setTargetAtTime(muted ? 0 : 0.05, c.currentTime, 0.6);
    o.connect(g); s.connect(f); f.connect(g); g.connect(master); o.start(); s.start(); return { gain: g, nodes: [o, s] };
  }),
  hum: () => tone(120, 0.6, { vol: 0.03, type: 'sine' }),
};
