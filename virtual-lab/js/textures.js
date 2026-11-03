// Procedural canvas textures: labels, instrument displays, surfaces.
import * as THREE from 'three';

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

export function canvasTexture(w, h, draw, { srgb = true, repeat = null, aniso = 4 } = {}) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  t.userData.canvas = c; t.userData.ctx = ctx;
  return t;
}

const FONT = '-apple-system, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
export { FONT, MONO };

// Printed reagent label, e.g. on a conical tube or bottle.
export function labelTexture({ title, sub = '', lines = [], color = '#1f6feb', w = 512, h = 256, bg = '#fbfbf8', hazard = null }) {
  return canvasTexture(w, h, (ctx) => {
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = color; ctx.fillRect(0, 0, w, h * 0.2);
    ctx.fillStyle = '#fff';
    ctx.font = `700 ${h * 0.12}px ${FONT}`;
    ctx.textBaseline = 'middle';
    ctx.fillText('BIOLAB REAGENTS', w * 0.04, h * 0.1);
    ctx.fillStyle = '#111';
    ctx.font = `800 ${h * 0.2}px ${FONT}`;
    fitText(ctx, title, w * 0.04, h * 0.36, w * 0.92);
    ctx.font = `500 ${h * 0.11}px ${FONT}`;
    ctx.fillStyle = '#333';
    if (sub) fitText(ctx, sub, w * 0.04, h * 0.55, w * 0.92);
    ctx.font = `400 ${h * 0.085}px ${FONT}`;
    lines.forEach((l, i) => fitText(ctx, l, w * 0.04, h * (0.7 + i * 0.1), w * 0.92));
    if (hazard) {
      ctx.save(); ctx.translate(w * 0.88, h * 0.72); ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#d00'; ctx.lineWidth = 6;
      ctx.fillRect(-h * 0.1, -h * 0.1, h * 0.2, h * 0.2); ctx.strokeRect(-h * 0.1, -h * 0.1, h * 0.2, h * 0.2);
      ctx.restore();
      ctx.fillStyle = '#000'; ctx.font = `900 ${h * 0.12}px ${FONT}`; ctx.textAlign = 'center';
      ctx.fillText(hazard, w * 0.88, h * 0.73); ctx.textAlign = 'left';
    }
  });
}

function fitText(ctx, text, x, y, maxW) {
  let size = parseFloat(ctx.font.match(/(\d+(\.\d+)?)px/)[1]);
  const base = ctx.font;
  while (ctx.measureText(text).width > maxW && size > 6) {
    size -= 1;
    ctx.font = base.replace(/(\d+(\.\d+)?)px/, size + 'px');
  }
  ctx.fillText(text, x, y);
  ctx.font = base;
}

// Handwritten-style marker label on a tube.
export function markerTexture(text, { w = 128, h = 128, color = '#1a237e', bg = null } = {}) {
  return canvasTexture(w, h, (ctx) => {
    if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); }
    ctx.fillStyle = color;
    ctx.font = `700 ${h * (text.length > 3 ? 0.32 : 0.55)}px "Marker Felt", "Comic Sans MS", ${FONT}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2);
  });
}

export function panelTexture(text, { w = 256, h = 64, bg = '#22262b', fg = '#cfd6de', size = 0.42, align = 'center', font = FONT, weight = 700 } = {}) {
  return canvasTexture(w, h, (ctx) => {
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = fg; ctx.font = `${weight} ${h * size}px ${font}`;
    ctx.textAlign = align; ctx.textBaseline = 'middle';
    ctx.fillText(text, align === 'center' ? w / 2 : w * 0.06, h / 2);
  });
}

// Speckled vinyl lab floor.
export function floorTexture() {
  return canvasTexture(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#9aa3a8'; ctx.fillRect(0, 0, w, h);
    const rnd = mulberry(7);
    for (let i = 0; i < 26000; i++) {
      const v = 120 + rnd() * 90 | 0;
      ctx.fillStyle = `rgba(${v},${v + 4},${v + 8},${0.25 + rnd() * 0.35})`;
      ctx.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2.5, 1 + rnd() * 2.5);
    }
    ctx.strokeStyle = 'rgba(60,66,70,0.35)'; ctx.lineWidth = 2;
    for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(i * w / 4, 0); ctx.lineTo(i * w / 4, h); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * h / 4); ctx.lineTo(w, i * h / 4); ctx.stroke(); }
  }, { repeat: [6, 6] });
}

// Epoxy resin bench top: subtle mottling.
export function benchTexture() {
  return canvasTexture(1024, 256, (ctx, w, h) => {
    ctx.fillStyle = '#26292c'; ctx.fillRect(0, 0, w, h);
    const rnd = mulberry(3);
    for (let i = 0; i < 9000; i++) {
      const v = 30 + rnd() * 26 | 0;
      ctx.fillStyle = `rgba(${v},${v + 2},${v + 4},0.5)`;
      ctx.beginPath(); ctx.arc(rnd() * w, rnd() * h, rnd() * 3, 0, 7); ctx.fill();
    }
  }, { repeat: [3, 1] });
}

export function wallTexture() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#dfe4e6'; ctx.fillRect(0, 0, w, h);
    const rnd = mulberry(11);
    for (let i = 0; i < 6000; i++) {
      ctx.fillStyle = `rgba(255,255,255,${rnd() * 0.12})`;
      ctx.fillRect(rnd() * w, rnd() * h, 2, 2);
      ctx.fillStyle = `rgba(0,0,0,${rnd() * 0.04})`;
      ctx.fillRect(rnd() * w, rnd() * h, 2, 2);
    }
  }, { repeat: [4, 2] });
}

export function posterTexture(kind) {
  return canvasTexture(512, 720, (ctx, w, h) => {
    ctx.fillStyle = '#fbfbfa'; ctx.fillRect(0, 0, w, h);
    if (kind === 'safety') {
      ctx.fillStyle = '#0b5cad'; ctx.fillRect(0, 0, w, 120);
      ctx.fillStyle = '#fff'; ctx.font = `800 44px ${FONT}`; ctx.fillText('LABORATORY', 30, 58); ctx.fillText('SAFETY RULES', 30, 104);
      ctx.fillStyle = '#222'; ctx.font = `500 26px ${FONT}`;
      ['Wear lab coat, gloves & goggles', 'No food or drink', 'Change tips between reagents', 'Balance the centrifuge', 'Use amber shield with blue light', 'Dispose of tips correctly', 'Wash hands before leaving'].forEach((t, i) => {
        ctx.fillStyle = '#0b5cad'; ctx.beginPath(); ctx.arc(46, 182 + i * 76, 14, 0, 7); ctx.fill();
        ctx.fillStyle = '#222'; ctx.fillText(t, 76, 192 + i * 76);
      });
    } else if (kind === 'dogma') {
      ctx.fillStyle = '#1b1f24'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#7fd1ff'; ctx.font = `800 40px ${FONT}`; ctx.fillText('PCR', 30, 70);
      ctx.fillStyle = '#e6edf3'; ctx.font = `500 24px ${FONT}`;
      ctx.fillText('Polymerase Chain Reaction', 30, 108);
      const steps = [['95 °C', 'Denaturation', '#ff7b72'], ['55 °C', 'Annealing', '#79c0ff'], ['72 °C', 'Extension', '#7ee787']];
      steps.forEach((s, i) => {
        const y = 170 + i * 150;
        ctx.fillStyle = s[2]; ctx.fillRect(30, y, 8, 110);
        ctx.font = `800 46px ${MONO}`; ctx.fillText(s[0], 56, y + 50);
        ctx.fillStyle = '#e6edf3'; ctx.font = `500 28px ${FONT}`; ctx.fillText(s[1], 56, y + 92);
      });
      ctx.fillStyle = '#8b949e'; ctx.font = `400 22px ${FONT}`; ctx.fillText('N = N₀ (1 + E)ⁿ', 30, 660);
    } else {
      ctx.fillStyle = '#f4f1e8'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#333'; ctx.font = `800 36px ${FONT}`; ctx.fillText('Gel Electrophoresis', 30, 70);
      ctx.fillStyle = '#111'; ctx.fillRect(60, 120, 390, 520);
      for (let l = 0; l < 6; l++) {
        ctx.fillStyle = '#333'; ctx.fillRect(80 + l * 62, 140, 40, 10);
        for (let b = 0; b < (l === 0 ? 10 : 1); b++) {
          const y = l === 0 ? 200 + b * 40 : 330 + l * 14;
          ctx.fillStyle = `rgba(255,170,60,${l === 0 ? 0.8 : 0.95})`; ctx.fillRect(80 + l * 62, y, 40, 6);
        }
      }
      ctx.fillStyle = '#333'; ctx.font = `500 22px ${FONT}`; ctx.fillText('− (cathode)  →  + (anode)', 100, 680);
    }
  });
}

export function mulberry(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// A live LCD/OLED display texture that can be redrawn.
export class Display {
  constructor(w, h, draw) {
    this.tex = canvasTexture(w, h, () => {});
    this.ctx = this.tex.userData.ctx; this.w = w; this.h = h; this.draw = draw;
  }
  update(data) {
    this.ctx.clearRect(0, 0, this.w, this.h);
    this.draw(this.ctx, this.w, this.h, data);
    this.tex.needsUpdate = true;
  }
}
