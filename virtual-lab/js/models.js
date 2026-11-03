// Procedural 3D models of laboratory equipment (real-world scale, metres).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { PROFILES, rAt, heightForVolume, PIPETTES, TIPS } from './data.js';
import { labelTexture, markerTexture, panelTexture, canvasTexture, Display, FONT, MONO, mulberry } from './textures.js';

const V2 = (x, y) => new THREE.Vector2(x, y);

export const MAT = {
  white: new THREE.MeshStandardMaterial({ color: 0xf1f1ee, roughness: 0.42, metalness: 0 }),
  offwhite: new THREE.MeshStandardMaterial({ color: 0xe3e5e2, roughness: 0.5 }),
  grey: new THREE.MeshStandardMaterial({ color: 0x9aa1a6, roughness: 0.45 }),
  lightgrey: new THREE.MeshStandardMaterial({ color: 0xc9cdd0, roughness: 0.4 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x2a2e33, roughness: 0.55 }),
  black: new THREE.MeshStandardMaterial({ color: 0x141618, roughness: 0.6 }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x1b1c1e, roughness: 0.9 }),
  alu: new THREE.MeshStandardMaterial({ color: 0xc8ccd0, roughness: 0.32, metalness: 0.85 }),
  steel: new THREE.MeshStandardMaterial({ color: 0xd9dde0, roughness: 0.22, metalness: 0.95 }),
  chrome: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.08, metalness: 1 }),
  clear: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.06, metalness: 0, transparent: true, opacity: 0.26, clearcoat: 1, clearcoatRoughness: 0.05, depthWrite: false, side: THREE.DoubleSide }),
  frosted: new THREE.MeshPhysicalMaterial({ color: 0xf6f8fa, roughness: 0.35, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0xeaf4f8, roughness: 0.03, metalness: 0, transparent: true, opacity: 0.2, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.4 }),
  acrylic: new THREE.MeshPhysicalMaterial({ color: 0xdff2ff, roughness: 0.04, transparent: true, opacity: 0.12, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 0.6 }),
  smoked: new THREE.MeshPhysicalMaterial({ color: 0x3a4a58, roughness: 0.1, transparent: true, opacity: 0.5, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide }),
  amber: new THREE.MeshStandardMaterial({ color: 0x8a4200, roughness: 0.35, transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 0.25 }),
  blueplastic: new THREE.MeshStandardMaterial({ color: 0x2f6fbf, roughness: 0.45 }),
  rackblue: new THREE.MeshStandardMaterial({ color: 0x3d7dd8, roughness: 0.5 }),
  rackwhite: new THREE.MeshStandardMaterial({ color: 0xeef0ef, roughness: 0.55 }),
  hole: new THREE.MeshStandardMaterial({ color: 0x0c0d0f, roughness: 1 }),
  green: new THREE.MeshStandardMaterial({ color: 0x3f8f3a, roughness: 0.6 }),
};

export function shadows(o, cast = true, receive = true) {
  o.traverse(c => { if (c.isMesh && !c.material.transparent) { c.castShadow = cast; c.receiveShadow = receive; } else if (c.isMesh) { c.receiveShadow = false; c.castShadow = false; } });
  return o;
}
function mesh(geo, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; }
function rbox(w, h, d, r = 0.004, mat = MAT.white) { return new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), mat); }
function lathe(pts, segs = 32, mat = MAT.white) { return new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, y]) => V2(r, y)), segs), mat); }

// ---------------------------------------------------------------------------
// Liquid inside a lathe-profiled vessel.
export class Liquid {
  constructor(kind, { opacity = 0.82, scale = 0.96, segs = 28 } = {}) {
    this.kind = kind; this.scale = scale; this.segs = segs;
    this.mat = new THREE.MeshPhysicalMaterial({ color: 0xdfe9f7, roughness: 0.12, metalness: 0, transparent: true, opacity, clearcoat: 1, clearcoatRoughness: 0.1, depthWrite: true });
    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), this.mat);
    this.mesh.renderOrder = 1;
    this.v = -1;
  }
  set(v, color) {
    if (color) this.mat.color.set(color);
    if (Math.abs(v - this.v) < 0.001) return;
    this.v = v;
    this.mesh.visible = v > 0.02;
    if (!this.mesh.visible) return;
    const p = PROFILES[this.kind];
    const h = heightForVolume(this.kind, v);
    const pts = [V2(0, p[0][0])];
    for (const [y, r] of p) { if (y < h) pts.push(V2(r * this.scale, y)); }
    pts.push(V2(rAt(p, h) * this.scale, h));
    pts.push(V2(0, h));
    this.mesh.geometry.dispose();
    this.mesh.geometry = new THREE.LatheGeometry(pts, this.segs);
    this.surfaceY = h;
  }
}

// ---------------------------------------------------------------------------
// 1.5 mL microcentrifuge tube with hinged cap.
export function microTube({ capColor = 0xf5f5f2, label = '', capLabel = '', liquidKind = 'micro' } = {}) {
  const g = new THREE.Group();
  const p = PROFILES.micro;
  const outer = [[0.0003, 0], ...p.map(([y, r]) => [r + 0.0006, y]), [0.0055, 0.0385], [0.0058, 0.0392]];
  const body = lathe(outer, 28, MAT.clear);
  body.renderOrder = 3;
  g.add(body);
  const frost = mesh(new THREE.CylinderGeometry(0.00545, 0.0053, 0.012, 20, 1, true, -0.9, 1.8), MAT.frosted, 0, 0.026, 0);
  frost.renderOrder = 2; g.add(frost);
  if (label) {
    const lab = mesh(new THREE.PlaneGeometry(0.0085, 0.0085), new THREE.MeshBasicMaterial({ map: markerTexture(label), transparent: true, depthWrite: false }), 0, 0.026, 0.0056);
    lab.renderOrder = 4; g.add(lab);
  }
  const capMat = new THREE.MeshPhysicalMaterial({ color: capColor, roughness: 0.3, transparent: true, opacity: 0.92, clearcoat: 0.6 });
  const pivot = new THREE.Group(); pivot.position.set(0, 0.0392, -0.0058); g.add(pivot);
  const cap = mesh(new THREE.CylinderGeometry(0.0062, 0.0062, 0.0028, 24), capMat, 0, 0.0014, 0.0058);
  const plug = mesh(new THREE.CylinderGeometry(0.0046, 0.0046, 0.004, 20), capMat, 0, -0.0015, 0.0058);
  const tab = mesh(new THREE.BoxGeometry(0.004, 0.001, 0.004), capMat, 0, 0.0008, 0.0128);
  pivot.add(cap, plug, tab);
  if (capLabel) {
    const top = mesh(new THREE.CircleGeometry(0.0052, 20), new THREE.MeshBasicMaterial({ map: markerTexture(capLabel, { color: '#111' }), transparent: true }), 0, 0.00285, 0.0058);
    top.rotation.x = -Math.PI / 2; pivot.add(top);
  }
  const strap = mesh(new THREE.BoxGeometry(0.003, 0.0006, 0.004), capMat, 0, 0.0392, -0.0075);
  g.add(strap);
  const liquid = new Liquid(liquidKind);
  g.add(liquid.mesh);
  g.userData.cap = pivot; g.userData.liquid = liquid; g.userData.mouthY = 0.039;
  g.userData.extras = new THREE.Group(); g.add(g.userData.extras);
  return shadows(g);
}

// 0.2 mL PCR 8-tube strip with attached cap strip.
export function pcrStrip({ n = 8, labels = [] } = {}) {
  const g = new THREE.Group();
  const p = PROFILES.pcr;
  const outer = [[0.0002, 0], ...p.map(([y, r]) => [r + 0.0005, y]), [0.0033, 0.0205]];
  const tubes = [], liquids = [], caps = [];
  const capMat = new THREE.MeshPhysicalMaterial({ color: 0xc9b8ff, roughness: 0.25, transparent: true, opacity: 0.92 });
  for (let i = 0; i < n; i++) {
    const t = new THREE.Group(); t.position.x = (i - (n - 1) / 2) * 0.009;
    const body = lathe(outer, 20, MAT.clear); body.renderOrder = 3; t.add(body);
    const liq = new Liquid('pcr', { segs: 16 }); t.add(liq.mesh); liquids.push(liq);
    const pivot = new THREE.Group(); pivot.position.set(0, 0.0205, -0.0034); t.add(pivot);
    const cap = mesh(new THREE.CylinderGeometry(0.0034, 0.0034, 0.0018, 16), capMat, 0, 0.0009, 0.0034);
    pivot.add(cap); caps.push(pivot);
    if (labels[i]) {
      const top = mesh(new THREE.CircleGeometry(0.003, 16), new THREE.MeshBasicMaterial({ map: markerTexture(labels[i], { color: '#0d1b6e' }), transparent: true }), 0, 0.0019, 0.0034);
      top.rotation.x = -Math.PI / 2; pivot.add(top);
    }
    g.add(t); tubes.push(t);
  }
  const bridge = mesh(new THREE.BoxGeometry(0.009 * (n - 1) + 0.006, 0.0012, 0.002), new THREE.MeshStandardMaterial({ color: 0xc9b8ff, roughness: 0.4 }), 0, 0.0198, 0); g.add(bridge);
  g.userData = { tubes, liquids, caps, mouthY: 0.0205 };
  return shadows(g);
}

// 15 mL conical reagent tube (cap removed, standing in rack).
export function conicalTube({ label, color = '#1f6feb', capColor = 0x2a62c9, sub = '', lines = [] }) {
  const g = new THREE.Group();
  const p = PROFILES.conical;
  const outer = [[0.0004, 0], ...p.map(([y, r]) => [r + 0.0008, y]), [0.0086, 0.118]];
  const body = lathe(outer, 28, MAT.clear); body.renderOrder = 3; g.add(body);
  const lab = mesh(new THREE.CylinderGeometry(0.0087, 0.0087, 0.045, 28, 1, true, -1.3, 2.6),
    new THREE.MeshStandardMaterial({ map: labelTexture({ title: label, sub, lines, color, w: 512, h: 220 }), roughness: 0.6 }), 0, 0.06, 0);
  g.add(lab);
  const liquid = new Liquid('conical'); g.add(liquid.mesh);
  const cap = mesh(new THREE.CylinderGeometry(0.0095, 0.0095, 0.012, 24), new THREE.MeshStandardMaterial({ color: capColor, roughness: 0.4 }), 0.016, 0.006, 0.012);
  g.add(cap);
  g.userData = { liquid, mouthY: 0.118 };
  return shadows(g);
}

export function bottle({ label, color = '#1f6feb', capColor = 0x1e5fbf, sub = '', lines = [], scale = 1 }) {
  const g = new THREE.Group();
  const p = PROFILES.bottle;
  const outer = [[0.001, 0], ...p.map(([y, r]) => [r + 0.0025, y]), [0.019, 0.22]];
  const body = lathe(outer, 36, MAT.glass); body.renderOrder = 3; g.add(body);
  const lab = mesh(new THREE.CylinderGeometry(0.0448, 0.0448, 0.075, 36, 1, true, -1.1, 2.2),
    new THREE.MeshStandardMaterial({ map: labelTexture({ title: label, sub, lines, color, w: 512, h: 300 }), roughness: 0.6 }), 0, 0.08, 0);
  g.add(lab);
  const liquid = new Liquid('bottle', { segs: 36 }); g.add(liquid.mesh);
  const cap = mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.024, 28), new THREE.MeshStandardMaterial({ color: capColor, roughness: 0.4 }), 0, 0.232, 0);
  g.add(cap);
  g.userData = { liquid, mouthY: 0.22, cap };
  g.scale.setScalar(scale);
  return shadows(g);
}

export function flask({ label, color = '#b58900' }) {
  const g = new THREE.Group();
  const p = PROFILES.flask;
  const outer = [[0.001, 0], ...p.map(([y, r]) => [r + 0.002, y]), [0.0165, 0.15]];
  const body = lathe(outer, 36, MAT.glass); body.renderOrder = 3; g.add(body);
  const liquid = new Liquid('flask', { segs: 36, opacity: 0.7 }); g.add(liquid.mesh);
  const lab = mesh(new THREE.PlaneGeometry(0.045, 0.026), new THREE.MeshStandardMaterial({ map: labelTexture({ title: label, sub: '1.5% w/v · 55 °C', color, w: 400, h: 230 }), transparent: false }), 0, 0.035, 0.0395);
  lab.rotation.x = -0.08; g.add(lab);
  // heat-resistant glove clip
  const foil = mesh(new THREE.CylinderGeometry(0.0175, 0.016, 0.014, 20), MAT.alu, 0, 0.142, 0); g.add(foil);
  g.userData = { liquid, mouthY: 0.15 };
  return shadows(g);
}

export function beaker({ label = 'LIQUID WASTE', color = '#c0392b' }) {
  const g = new THREE.Group();
  const p = PROFILES.beaker;
  const outer = [[0.001, 0], ...p.map(([y, r]) => [r + 0.0018, y]), [0.035, 0.09]];
  const body = lathe(outer, 36, MAT.glass); body.renderOrder = 3; g.add(body);
  const liquid = new Liquid('beaker', { segs: 36, opacity: 0.6 }); g.add(liquid.mesh);
  const lab = mesh(new THREE.PlaneGeometry(0.04, 0.02), new THREE.MeshStandardMaterial({ map: labelTexture({ title: label, sub: 'Aqueous / alcohol', color, w: 400, h: 200 }) }), 0, 0.05, 0.0335);
  g.add(lab);
  g.userData = { liquid, mouthY: 0.09 };
  return shadows(g);
}

// ---------------------------------------------------------------------------
// Adjustable micropipette. Origin = nozzle end, axis = +Y.
export function pipette(type) {
  const spec = PIPETTES[type];
  const g = new THREE.Group();
  const body = new THREE.Group(); g.add(body);
  const shaftMat = new THREE.MeshStandardMaterial({ color: 0xe9ebec, roughness: 0.35 });
  const longShaft = type === 'P1000' ? 0.072 : 0.064;
  body.add(lathe([[0.0016, 0], [0.0021, 0.008], [0.0034, longShaft * 0.6], [0.0045, longShaft]], 20, shaftMat));
  const ejector = mesh(new THREE.CylinderGeometry(0.0056, 0.006, 0.03, 20), MAT.lightgrey, 0, longShaft + 0.015, 0); body.add(ejector);
  const gripMat = new THREE.MeshStandardMaterial({ color: 0x3b4148, roughness: 0.6 });
  const grip = new THREE.Mesh(new THREE.CapsuleGeometry(0.0125, 0.11, 6, 20), gripMat); grip.position.y = longShaft + 0.03 + 0.065; body.add(grip);
  const band = mesh(new THREE.CylinderGeometry(0.0128, 0.0128, 0.014, 24), new THREE.MeshStandardMaterial({ color: spec.color, roughness: 0.4 }), 0, grip.position.y + 0.045, 0); body.add(band);
  const hook = mesh(new THREE.TorusGeometry(0.009, 0.0035, 8, 16, Math.PI), gripMat, 0, grip.position.y + 0.028, -0.013);
  hook.rotation.set(0, Math.PI / 2, Math.PI / 2); body.add(hook);
  // volume counter window
  const disp = new Display(256, 96, (ctx, w, h, d) => {
    ctx.fillStyle = '#e9eef0'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#111'; ctx.font = `800 ${h * 0.62}px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(d, w / 2, h * 0.55);
  });
  disp.update(spec.max.toFixed(spec.decimals));
  const win = mesh(new THREE.PlaneGeometry(0.016, 0.006), new THREE.MeshBasicMaterial({ map: disp.tex }), 0, grip.position.y - 0.02, 0.01245);
  body.add(win);
  const tag = mesh(new THREE.PlaneGeometry(0.012, 0.005), new THREE.MeshBasicMaterial({ map: panelTexture(spec.label, { bg: '#3b4148', fg: '#fff', size: 0.7 }) }), 0, grip.position.y + 0.02, 0.01255);
  body.add(tag);
  const plunger = new THREE.Group(); plunger.position.y = grip.position.y + 0.07; body.add(plunger);
  plunger.add(mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.02, 12), MAT.lightgrey, 0, 0.01, 0));
  plunger.add(mesh(new THREE.CylinderGeometry(0.0085, 0.008, 0.009, 20), new THREE.MeshStandardMaterial({ color: spec.color, roughness: 0.35 }), 0, 0.022, 0));
  const ejBtn = mesh(new THREE.BoxGeometry(0.006, 0.012, 0.008), MAT.lightgrey, 0.012, grip.position.y + 0.05, 0.004); body.add(ejBtn);
  const tipMount = new THREE.Group(); g.add(tipMount);
  g.userData = { spec, display: disp, plunger, plungerRest: plunger.position.y, tipMount, length: plunger.position.y + 0.03, tip: null };
  return shadows(g);
}

export function tipMesh(tipType) {
  const t = TIPS[tipType];
  const g = new THREE.Group();
  const mat = new THREE.MeshPhysicalMaterial({ color: t.color, roughness: 0.25, transparent: true, opacity: tipType === 't10' ? 0.55 : 0.62, clearcoat: 0.5, depthWrite: false, side: THREE.DoubleSide });
  const cone = mesh(new THREE.CylinderGeometry(t.rTop, t.rBot, t.len, 18, 1, true), mat, 0, -t.len / 2, 0);
  cone.renderOrder = 3; g.add(cone);
  const collar = mesh(new THREE.CylinderGeometry(t.rTop * 1.12, t.rTop * 1.05, t.len * 0.12, 18, 1, true), mat, 0, -t.len * 0.06, 0); g.add(collar);
  const liqMat = new THREE.MeshPhysicalMaterial({ color: 0xdfe9f7, roughness: 0.1, transparent: true, opacity: 0.9 });
  const liq = new THREE.Mesh(new THREE.BufferGeometry(), liqMat); liq.renderOrder = 2; g.add(liq);
  g.userData = { spec: t, liq, liqMat, setVolume(v, color) {
    if (color) liqMat.color.set(color);
    liq.visible = v > 0.005;
    if (!liq.visible) return;
    const f = Math.min(1, v / t.cap);
    const h = t.len * Math.cbrt(f) * 0.92;
    const rb = t.rBot * 0.85, rt = (t.rBot + (t.rTop - t.rBot) * (h / t.len)) * 0.85;
    liq.geometry.dispose();
    liq.geometry = new THREE.CylinderGeometry(rt, rb, h, 14);
    liq.position.y = -t.len + h / 2;
  } };
  return g;
}

// Box of 96 tips with hinged lid.
export function tipBox(tipType) {
  const t = TIPS[tipType];
  const g = new THREE.Group();
  const col = tipType === 't1000' ? 0x2a5fb0 : tipType === 't200' ? 0xc79a12 : 0x6b7680;
  const baseMat = new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.3, transparent: true, opacity: 0.88 });
  const h = tipType === 't1000' ? 0.07 : 0.052;
  const base = rbox(0.124, h, 0.084, 0.003, baseMat); base.position.y = h / 2; g.add(base);
  const plate = rbox(0.12, 0.003, 0.08, 0.001, MAT.white); plate.position.y = h + 0.0015; g.add(plate);
  const geo = new THREE.CylinderGeometry(t.rTop, t.rBot, t.len * 0.75, 10, 1, true);
  geo.translate(0, -t.len * 0.75 / 2 + 0.005, 0);
  const tipMat = new THREE.MeshStandardMaterial({ color: t.color, roughness: 0.35, transparent: true, opacity: 0.85 });
  const inst = new THREE.InstancedMesh(geo, tipMat, 96);
  const m4 = new THREE.Matrix4();
  const positions = [];
  for (let r = 0; r < 8; r++) for (let c = 0; c < 12; c++) {
    const x = (c - 5.5) * 0.009, z = (r - 3.5) * 0.009;
    positions.push(new THREE.Vector3(x, h + 0.004, z));
    m4.makeTranslation(x, h + 0.004, z); inst.setMatrixAt(r * 12 + c, m4);
  }
  g.add(inst);
  const lidPivot = new THREE.Group(); lidPivot.position.set(0, h + 0.004, -0.042); g.add(lidPivot);
  const lid = rbox(0.124, 0.03, 0.084, 0.003, new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.2, transparent: true, opacity: 0.22, depthWrite: false }));
  lid.position.set(0, 0.015, 0.042); lidPivot.add(lid); lidPivot.rotation.x = -1.95;
  const lab = mesh(new THREE.PlaneGeometry(0.06, 0.016), new THREE.MeshBasicMaterial({ map: panelTexture(TIPS[tipType].label.toUpperCase(), { bg: '#fff', fg: '#222', size: 0.45, w: 384 }) }), 0, h * 0.55, 0.0425);
  g.add(lab);
  g.userData = { inst, positions, used: 0, h, take() {
    if (this.used >= 96) return null;
    const i = this.used++;
    m4.makeScale(0, 0, 0); inst.setMatrixAt(i, m4); inst.instanceMatrix.needsUpdate = true;
    return positions[i];
  }, setUsed(n) {
    for (let i = 0; i < 96; i++) {
      if (i < n) m4.makeScale(0, 0, 0); else m4.makeTranslation(positions[i].x, positions[i].y, positions[i].z);
      inst.setMatrixAt(i, m4);
    }
    this.used = n; inst.instanceMatrix.needsUpdate = true;
  } };
  return shadows(g);
}

export function pipetteStand(n) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.012, 32), MAT.dark); base.position.y = 0.006; g.add(base);
  const pole = mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.3, 12), MAT.alu, 0, 0.15, 0); g.add(pole);
  const head = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.012, 24), MAT.dark, 0, 0.26, 0); g.add(head);
  const anchors = [];
  for (let i = 0; i < n; i++) {
    const a = (i - (n - 1) / 2) * 0.75;
    const arm = new THREE.Group(); arm.rotation.y = a; arm.position.y = 0.26; g.add(arm);
    const clip = mesh(new THREE.BoxGeometry(0.008, 0.01, 0.03), MAT.dark, 0, 0, 0.035); arm.add(clip);
    const anc = new THREE.Group(); anc.position.set(0, -0.24, 0.05); arm.add(anc); anchors.push(anc);
  }
  g.userData.anchors = anchors;
  return shadows(g);
}

// Tube rack with nx × nz holes. Returns slot anchors.
export function tubeRack(nx, nz, { pitch = 0.017, hole = 0.0058, height = 0.03, mat = MAT.rackblue, holeDepth = 0.022 } = {}) {
  const g = new THREE.Group();
  const w = nx * pitch + 0.012, d = nz * pitch + 0.012;
  const top = rbox(w, 0.004, d, 0.0015, mat); top.position.y = height; g.add(top);
  const mid = rbox(w, 0.004, d, 0.0015, mat); mid.position.y = height * 0.45; g.add(mid);
  for (const sx of [-1, 1]) {
    const leg = rbox(0.004, height, d, 0.001, mat); leg.position.set(sx * (w / 2 - 0.002), height / 2, 0); g.add(leg);
  }
  const anchors = [];
  const holeGeo = new THREE.CircleGeometry(hole, 18);
  for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
    const x = (ix - (nx - 1) / 2) * pitch, z = (iz - (nz - 1) / 2) * pitch;
    const hm = new THREE.Mesh(holeGeo, MAT.hole); hm.rotation.x = -Math.PI / 2; hm.position.set(x, height + 0.0021, z); g.add(hm);
    const a = new THREE.Group(); a.position.set(x, height - holeDepth + 0.002, z); g.add(a); anchors.push(a);
  }
  g.userData.anchors = anchors;
  return shadows(g);
}

// 96-well PCR rack; one anchor for a strip in column 6.
export function pcrRack() {
  const g = new THREE.Group();
  const top = rbox(0.13, 0.016, 0.088, 0.003, new THREE.MeshStandardMaterial({ color: 0x2f6fbf, roughness: 0.5 })); top.position.y = 0.008; g.add(top);
  const tex = canvasTexture(512, 352, (ctx, w, h) => {
    ctx.fillStyle = '#2f6fbf'; ctx.fillRect(0, 0, w, h);
    for (let r = 0; r < 8; r++) for (let c = 0; c < 12; c++) {
      ctx.fillStyle = '#0d1a2b'; ctx.beginPath(); ctx.arc(30 + c * 41, 30 + r * 41, 12, 0, 7); ctx.fill();
    }
  });
  const face = mesh(new THREE.PlaneGeometry(0.124, 0.084), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }), 0, 0.0162, 0);
  face.rotation.x = -Math.PI / 2; g.add(face);
  const a = new THREE.Group(); a.position.set(0, 0.0125, 0); a.rotation.y = Math.PI / 2; g.add(a);
  g.userData.anchors = [a];
  return shadows(g);
}

export function coldBlock(n = 6) {
  const g = new THREE.Group();
  const w = 0.03 + n * 0.017;
  const b = rbox(w, 0.035, 0.04, 0.003, MAT.alu); b.position.y = 0.0175; g.add(b);
  const anchors = [];
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * 0.018;
    const hm = mesh(new THREE.CircleGeometry(0.0057, 18), MAT.hole, x, 0.0352, 0); hm.rotation.x = -Math.PI / 2; g.add(hm);
    const a = new THREE.Group(); a.position.set(x, 0.035 - 0.022, 0); g.add(a); anchors.push(a);
  }
  const lab = mesh(new THREE.PlaneGeometry(0.05, 0.012), new THREE.MeshBasicMaterial({ map: panelTexture('COLD BLOCK 4 °C', { bg: '#c8ccd0', fg: '#204a87', size: 0.5, w: 320 }) }), 0, 0.018, 0.0201);
  g.add(lab);
  g.userData.anchors = anchors;
  return shadows(g);
}

// ---------------------------------------------------------------------------
export function microcentrifuge() {
  const g = new THREE.Group();
  const body = rbox(0.24, 0.1, 0.27, 0.025, MAT.white); body.position.y = 0.05; g.add(body);
  const ring = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.004, 48), MAT.lightgrey, 0, 0.1, -0.02); g.add(ring);
  const well = mesh(new THREE.CylinderGeometry(0.092, 0.088, 0.003, 48), MAT.dark, 0, 0.1015, -0.02); g.add(well);
  const rotor = new THREE.Group(); rotor.position.set(0, 0.098, -0.02); g.add(rotor);
  const rotorBody = lathe([[0.0, 0.0], [0.07, 0.0], [0.072, 0.012], [0.05, 0.028], [0.0, 0.03]], 48, MAT.alu); rotor.add(rotorBody);
  const nut = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.01, 6), MAT.steel, 0, 0.034, 0); rotor.add(nut);
  const anchors = [];
  const axisUp = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6;
    const out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const hm = mesh(new THREE.CircleGeometry(0.0058, 16), MAT.hole, out.x * 0.056, 0.0215, out.z * 0.056);
    hm.lookAt(hm.position.clone().add(new THREE.Vector3(-out.x, 1, -out.z)));
    rotor.add(hm);
    const anc = new THREE.Group();
    const axis = new THREE.Vector3(-out.x * 0.7071, 0.7071, -out.z * 0.7071);
    anc.quaternion.setFromUnitVectors(axisUp, axis);
    anc.position.set(out.x * 0.056, 0.0215, out.z * 0.056).addScaledVector(axis, -0.024);
    rotor.add(anc); anchors.push(anc);
  }
  const pivot = new THREE.Group(); pivot.position.set(0, 0.1, -0.13); g.add(pivot);
  const lid = lathe([[0, 0.022], [0.06, 0.02], [0.098, 0.008], [0.103, 0.0]], 48, MAT.smoked); lid.position.z = 0.11; pivot.add(lid);
  const lidRing = mesh(new THREE.TorusGeometry(0.102, 0.004, 8, 48), MAT.lightgrey, 0, 0.001, 0.11); lidRing.rotation.x = Math.PI / 2; pivot.add(lidRing);
  const panel = new THREE.Group(); panel.position.set(0, 0.07, 0.118); panel.rotation.x = -0.55; g.add(panel);
  panel.add(mesh(new THREE.BoxGeometry(0.2, 0.05, 0.006), MAT.dark));
  const disp = new Display(512, 128, (ctx, w, h, d) => {
    ctx.fillStyle = '#071018'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = d.running ? '#5ef0ff' : '#8fd7ff'; ctx.font = `700 ${h * 0.5}px ${MONO}`; ctx.textBaseline = 'middle';
    ctx.fillText(`${d.speed}`, w * 0.04, h * 0.42); ctx.fillText(d.time, w * 0.62, h * 0.42);
    ctx.font = `500 ${h * 0.2}px ${FONT}`; ctx.fillStyle = '#6a8aa0';
    ctx.fillText('× g', w * 0.04, h * 0.84); ctx.fillText('min:sec', w * 0.62, h * 0.84);
    if (d.status) { ctx.fillStyle = d.statusColor || '#ffcf5a'; ctx.fillText(d.status, w * 0.3, h * 0.84); }
  });
  const screen = mesh(new THREE.PlaneGeometry(0.11, 0.028), new THREE.MeshBasicMaterial({ map: disp.tex }), -0.035, 0, 0.0035); panel.add(screen);
  const btnMat = new THREE.MeshStandardMaterial({ color: 0x2ea043, roughness: 0.4 });
  panel.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.004, 20).rotateX(Math.PI / 2), btnMat, 0.055, 0, 0.004));
  panel.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.004, 20).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xc0392b }), 0.08, 0, 0.004));
  const brand = mesh(new THREE.PlaneGeometry(0.08, 0.012), new THREE.MeshBasicMaterial({ map: panelTexture('MICROFUGE 24', { bg: '#f1f1ee', fg: '#555', size: 0.5, w: 320 }) }), 0, 0.03, 0.1355); g.add(brand);
  g.userData = { rotor, anchors, lid: pivot, display: disp };
  return shadows(g);
}

export function vortex() {
  const g = new THREE.Group();
  const body = rbox(0.11, 0.075, 0.13, 0.018, MAT.white); body.position.y = 0.0375; g.add(body);
  const top = mesh(new THREE.CylinderGeometry(0.03, 0.034, 0.01, 32), MAT.lightgrey, 0, 0.078, -0.01); g.add(top);
  const head = new THREE.Group(); head.position.set(0, 0.083, -0.01); g.add(head);
  const cup = lathe([[0.0, 0.0], [0.022, 0.0], [0.024, 0.012], [0.012, 0.016], [0.0, 0.01]], 32, MAT.rubber); head.add(cup);
  const anc = new THREE.Group(); anc.position.y = 0.008; head.add(anc);
  const knob = mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.012, 24).rotateX(Math.PI / 2), MAT.dark, 0.025, 0.035, 0.066); g.add(knob);
  const sw = mesh(new THREE.BoxGeometry(0.024, 0.012, 0.008), MAT.dark, -0.02, 0.035, 0.066); g.add(sw);
  const brand = mesh(new THREE.PlaneGeometry(0.05, 0.01), new THREE.MeshBasicMaterial({ map: panelTexture('VORTEX-GENIE', { bg: '#f1f1ee', fg: '#555', size: 0.5, w: 320 }) }), 0, 0.058, 0.0655); g.add(brand);
  g.userData = { head, anchors: [anc] };
  return shadows(g);
}

export function miniSpinner() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.05, 40), MAT.white); body.position.y = 0.025; g.add(body);
  const pivot = new THREE.Group(); pivot.position.set(0, 0.05, -0.055); g.add(pivot);
  const lid = new THREE.Mesh(new THREE.SphereGeometry(0.056, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), MAT.smoked); lid.scale.y = 0.45; lid.position.z = 0.055; pivot.add(lid);
  const rotor = new THREE.Group(); rotor.position.y = 0.05; g.add(rotor);
  rotor.add(mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.006, 32), MAT.dark));
  const anc = new THREE.Group(); anc.position.set(0, 0.004, 0); rotor.add(anc);
  const label = mesh(new THREE.PlaneGeometry(0.04, 0.01), new THREE.MeshBasicMaterial({ map: panelTexture('MINI SPIN', { bg: '#f1f1ee', fg: '#555', size: 0.5, w: 256 }) }), 0, 0.03, 0.0585); g.add(label);
  g.userData = { rotor, lid: pivot, anchors: [anc] };
  return shadows(g);
}

export function thermocycler() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe8eaec, roughness: 0.38 });
  const body = rbox(0.27, 0.14, 0.36, 0.015, bodyMat); body.position.y = 0.07; g.add(body);
  const accent = rbox(0.272, 0.012, 0.362, 0.004, new THREE.MeshStandardMaterial({ color: 0x1d5fa8, roughness: 0.4 })); accent.position.y = 0.012; g.add(accent);
  for (let i = 0; i < 9; i++) { const v = mesh(new THREE.BoxGeometry(0.002, 0.07, 0.25), MAT.dark, 0.1352, 0.075, -0.03); v.position.z = -0.12 + i * 0.03; v.scale.z = 0.08; g.add(v); }
  const bay = mesh(new THREE.BoxGeometry(0.16, 0.02, 0.12), MAT.dark, 0, 0.131, -0.04); g.add(bay);
  const blockTex = canvasTexture(512, 384, (ctx, w, h) => {
    ctx.fillStyle = '#b9bfc5'; ctx.fillRect(0, 0, w, h);
    for (let r = 0; r < 8; r++) for (let c = 0; c < 12; c++) {
      const x = 34 + c * 40, y = 40 + r * 43;
      const grd = ctx.createRadialGradient(x, y, 2, x, y, 15); grd.addColorStop(0, '#1b1e22'); grd.addColorStop(1, '#5d646b');
      ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(x, y, 14, 0, 7); ctx.fill();
    }
    ctx.fillStyle = '#333'; ctx.font = `600 16px ${FONT}`;
    'ABCDEFGH'.split('').forEach((l, i) => ctx.fillText(l, 6, 46 + i * 43));
  });
  const block = mesh(new THREE.PlaneGeometry(0.11, 0.075), new THREE.MeshStandardMaterial({ map: blockTex, metalness: 0.7, roughness: 0.35 }), 0, 0.1415, -0.04);
  block.rotation.x = -Math.PI / 2; g.add(block);
  const anc = new THREE.Group(); anc.position.set(0.0, 0.1415 - 0.012, -0.04); anc.rotation.y = Math.PI / 2; g.add(anc);
  const pivot = new THREE.Group(); pivot.position.set(0, 0.14, -0.175); g.add(pivot);
  const lid = rbox(0.25, 0.05, 0.27, 0.012, bodyMat); lid.position.set(0, 0.025, 0.135); pivot.add(lid);
  const heat = mesh(new THREE.BoxGeometry(0.15, 0.002, 0.11), MAT.alu, 0, -0.0005, 0.135); pivot.add(heat);
  const handle = rbox(0.12, 0.016, 0.02, 0.006, MAT.dark); handle.position.set(0, 0.025, 0.272); pivot.add(handle);
  const brand = mesh(new THREE.PlaneGeometry(0.1, 0.016), new THREE.MeshBasicMaterial({ map: panelTexture('THERMACYCLE 96', { bg: '#e8eaec', fg: '#1d5fa8', size: 0.55, w: 400 }), transparent: false }), 0, 0.0505, 0.12);
  brand.rotation.x = -Math.PI / 2; pivot.add(brand);
  const panel = new THREE.Group(); panel.position.set(0, 0.068, 0.181); panel.rotation.x = -0.25; g.add(panel);
  panel.add(mesh(new THREE.BoxGeometry(0.2, 0.085, 0.006), MAT.black));
  const disp = new Display(640, 270, drawCyclerScreen);
  const screen = mesh(new THREE.PlaneGeometry(0.17, 0.072), new THREE.MeshBasicMaterial({ map: disp.tex, toneMapped: false }), 0, 0, 0.0035); panel.add(screen);
  g.userData = { lid: pivot, anchors: [anc], display: disp, heat };
  return shadows(g);
}

function drawCyclerScreen(ctx, w, h, d) {
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0d1720'); g.addColorStop(1, '#06090d');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#4aa8ff'; ctx.fillRect(0, 0, w, 34);
  ctx.fillStyle = '#fff'; ctx.font = `700 20px ${FONT}`; ctx.textBaseline = 'middle';
  ctx.fillText(d.title || 'THERMACYCLE 96', 14, 17);
  ctx.textAlign = 'right'; ctx.fillText(d.lid != null ? `LID ${Math.round(d.lid)} °C` : '', w - 14, 17); ctx.textAlign = 'left';
  ctx.fillStyle = d.color || '#e6edf3'; ctx.font = `800 96px ${MONO}`;
  ctx.fillText(`${d.temp.toFixed(1)}°`, 18, 112);
  ctx.font = `600 26px ${FONT}`; ctx.fillStyle = '#9fb3c8';
  ctx.fillText(d.stage || 'Ready', 18, 186);
  ctx.textAlign = 'right'; ctx.fillStyle = '#e6edf3'; ctx.font = `700 34px ${MONO}`;
  if (d.cycle != null) ctx.fillText(`Cycle ${d.cycle}/${d.cycles}`, w - 18, 96);
  ctx.font = `500 26px ${MONO}`; ctx.fillStyle = '#9fb3c8';
  if (d.remaining != null) ctx.fillText(`${d.remaining} left`, w - 18, 140);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#20303f'; ctx.fillRect(18, 220, w - 36, 16);
  ctx.fillStyle = '#4aa8ff'; ctx.fillRect(18, 220, (w - 36) * (d.progress || 0), 16);
}

// Casting tray (UV-transparent) with gel slab and comb slots.
export function castingTray() {
  const g = new THREE.Group();
  const trayMat = new THREE.MeshPhysicalMaterial({ color: 0xe8f6ff, roughness: 0.1, transparent: true, opacity: 0.4, clearcoat: 1, depthWrite: false });
  const floor = mesh(new THREE.BoxGeometry(0.072, 0.003, 0.104), trayMat, 0, 0.0015, 0); g.add(floor);
  for (const sx of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.003, 0.012, 0.104), trayMat, sx * 0.0375, 0.006, 0));
  const gelCanvas = canvasTexture(256, 384, () => {});
  const glowCanvas = canvasTexture(256, 384, () => {});
  const gelMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, transparent: true, opacity: 0.0, map: gelCanvas, emissiveMap: glowCanvas, emissive: new THREE.Color(0xff9a2e), emissiveIntensity: 0, depthWrite: false, envMapIntensity: 0.4 });
  const gel = mesh(new THREE.BoxGeometry(0.07, 1, 0.102), gelMat, 0, 0.003, 0);
  gel.scale.y = 0.0001; gel.visible = false; g.add(gel);
  gel.renderOrder = 2;
  const pour = mesh(new THREE.BoxGeometry(0.07, 1, 0.102), new THREE.MeshPhysicalMaterial({ color: 0xf6f3d8, roughness: 0.05, transparent: true, opacity: 0.55, clearcoat: 1, depthWrite: false }), 0, 0.003, 0);
  pour.visible = false; g.add(pour);
  const combAnchors = [new THREE.Group(), new THREE.Group()];
  combAnchors[0].position.set(0, 0.003, -0.04); combAnchors[1].position.set(0, 0.003, 0.04);
  g.add(...combAnchors);
  // well hit targets (8 lanes) created at back end; mirrored when comb was at front.
  const wells = [];
  for (let i = 0; i < 8; i++) {
    const w = new THREE.Group(); w.position.set((i - 3.5) * 0.0078, 0.006, -0.04); g.add(w); wells.push(w);
  }
  g.userData = { gel, gelMat, pour, gelCanvas, glowCanvas, anchors: combAnchors, wells };
  return shadows(g);
}

export function comb() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x1d1f22, roughness: 0.4 });
  const bar = rbox(0.078, 0.014, 0.004, 0.001, mat); bar.position.y = 0.013; g.add(bar);
  for (let i = 0; i < 8; i++) g.add(mesh(new THREE.BoxGeometry(0.0055, 0.008, 0.0015), mat, (i - 3.5) * 0.0078, 0.002, 0));
  return shadows(g);
}

export function castingStand() {
  const g = new THREE.Group();
  const base = rbox(0.12, 0.012, 0.15, 0.004, MAT.dark); base.position.y = 0.006; g.add(base);
  for (const sz of [-1, 1]) { const gate = rbox(0.09, 0.03, 0.008, 0.002, MAT.rackwhite); gate.position.set(0, 0.025, sz * 0.056); g.add(gate); }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.006, 10), MAT.steel, sx * 0.05, -0.001, sz * 0.065));
  const bubble = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.003, 16), new THREE.MeshPhysicalMaterial({ color: 0x9be37a, transparent: true, opacity: 0.6 }), 0.045, 0.013, 0.06); g.add(bubble);
  const anc = new THREE.Group(); anc.position.y = 0.012; g.add(anc);
  g.userData.anchors = [anc];
  return shadows(g);
}

export function gelChamber() {
  const g = new THREE.Group();
  const W = 0.12, D = 0.24, H = 0.065;
  const walls = [
    [W, H, 0.004, 0, H / 2, -D / 2], [W, H, 0.004, 0, H / 2, D / 2],
    [0.004, H, D, -W / 2, H / 2, 0], [0.004, H, D, W / 2, H / 2, 0], [W, 0.004, D, 0, 0.002, 0],
  ];
  for (const [w, h, d, x, y, z] of walls) { const m = mesh(new THREE.BoxGeometry(w, h, d), MAT.acrylic, x, y, z); m.renderOrder = 4; g.add(m); }
  const platform = mesh(new THREE.BoxGeometry(0.085, 0.022, 0.12), new THREE.MeshStandardMaterial({ color: 0x2b3640, roughness: 0.5 }), 0, 0.013, 0);
  g.add(platform);
  const wireMat = new THREE.MeshStandardMaterial({ color: 0xe5e4e2, metalness: 1, roughness: 0.2 });
  for (const sz of [-1, 1]) { const wre = mesh(new THREE.CylinderGeometry(0.0005, 0.0005, 0.1, 6).rotateZ(Math.PI / 2), wireMat, 0, 0.006, sz * 0.105); g.add(wre); }
  const jackB = mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.014, 16), MAT.black, W / 2 - 0.012, H + 0.006, -D / 2 + 0.012); g.add(jackB);
  const jackR = mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.014, 16), new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.4 }), W / 2 - 0.012, H + 0.006, D / 2 - 0.012); g.add(jackR);
  const signs = [['−', '#111', -1], ['+', '#c62828', 1]];
  for (const [t, c, sz] of signs) {
    const s = mesh(new THREE.PlaneGeometry(0.014, 0.014), new THREE.MeshBasicMaterial({ map: panelTexture(t, { bg: '#ffffff', fg: c, size: 0.9, w: 64, h: 64 }) }), -W / 2 + 0.014, H - 0.012, sz * (D / 2 + 0.0025));
    if (sz < 0) s.rotation.y = Math.PI; g.add(s);
  }
  const buffer = mesh(new THREE.BoxGeometry(W - 0.006, 1, D - 0.006), new THREE.MeshPhysicalMaterial({ color: 0x6fa7d6, transparent: true, opacity: 0.18, roughness: 0.05, clearcoat: 1, depthWrite: false, envMapIntensity: 0.5 }), 0, 0.004, 0);
  buffer.scale.y = 0.0001; buffer.visible = false; buffer.renderOrder = 5; g.add(buffer);
  const lid = new THREE.Group(); lid.position.set(0, H + 0.003, 0); lid.visible = false; g.add(lid);
  const lidTop = mesh(new THREE.BoxGeometry(W + 0.01, 0.004, D + 0.01), MAT.acrylic); lidTop.renderOrder = 6; lid.add(lidTop);
  const anc = new THREE.Group(); anc.position.set(0, 0.024, 0); g.add(anc);
  const bubbles = new THREE.Group(); g.add(bubbles);
  const bubbleGeo = new THREE.SphereGeometry(0.0007, 6, 4);
  const bubbleMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 });
  for (let i = 0; i < 60; i++) {
    const b = new THREE.Mesh(bubbleGeo, bubbleMat);
    b.userData = { z: (i % 2 ? 1 : -1) * 0.105, x: (Math.random() - 0.5) * 0.1, s: Math.random() };
    bubbles.add(b);
  }
  bubbles.visible = false;
  g.userData = { buffer, lid, anchors: [anc], bubbles, jackB, jackR, H };
  return shadows(g);
}

export function powerSupply() {
  const g = new THREE.Group();
  const body = rbox(0.2, 0.085, 0.17, 0.008, new THREE.MeshStandardMaterial({ color: 0xdfe3e6, roughness: 0.4 })); body.position.y = 0.0425; g.add(body);
  const face = mesh(new THREE.PlaneGeometry(0.19, 0.075), MAT.dark, 0, 0.0425, 0.0851); g.add(face);
  const disp = new Display(512, 192, (ctx, w, h, d) => {
    ctx.fillStyle = '#100800'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = d.on ? '#ff6b2c' : '#5a2a12'; ctx.font = `700 ${h * 0.42}px ${MONO}`; ctx.textBaseline = 'middle';
    ctx.fillText(`${String(d.v).padStart(3, ' ')}V`, w * 0.03, h * 0.38);
    ctx.fillText(`${String(d.ma).padStart(3, ' ')}mA`, w * 0.48, h * 0.38);
    ctx.font = `600 ${h * 0.24}px ${MONO}`; ctx.fillStyle = d.on ? '#ffb35c' : '#6b3a1a';
    ctx.fillText(`${d.time}  ${d.on ? 'RUN' : 'STOP'}`, w * 0.03, h * 0.8);
  });
  const scr = mesh(new THREE.PlaneGeometry(0.11, 0.04), new THREE.MeshBasicMaterial({ map: disp.tex, toneMapped: false }), -0.03, 0.055, 0.0855); g.add(scr);
  for (const [x, c] of [[0.055, 0x111111], [0.08, 0xc62828]]) g.add(mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.006, 16).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: c }), x, 0.025, 0.088));
  g.add(mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.01, 20).rotateX(Math.PI / 2), MAT.alu, 0.065, 0.058, 0.088));
  const brand = mesh(new THREE.PlaneGeometry(0.07, 0.01), new THREE.MeshBasicMaterial({ map: panelTexture('POWERPAC 300 V', { bg: '#2a2e33', fg: '#c9d1d9', size: 0.5, w: 320 }) }), -0.04, 0.022, 0.0856); g.add(brand);
  g.userData = { display: disp, jacks: [new THREE.Vector3(0.055, 0.025, 0.09), new THREE.Vector3(0.08, 0.025, 0.09)] };
  return shadows(g);
}

export function transilluminator() {
  const g = new THREE.Group();
  const body = rbox(0.26, 0.05, 0.22, 0.008, MAT.dark); body.position.y = 0.025; g.add(body);
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x0b1a33, emissive: new THREE.Color(0x2d6bff), emissiveIntensity: 0, roughness: 0.15 });
  const glass = mesh(new THREE.BoxGeometry(0.2, 0.002, 0.16), glassMat, 0, 0.051, 0); g.add(glass);
  const pivot = new THREE.Group(); pivot.position.set(0, 0.052, -0.1); g.add(pivot);
  const shield = mesh(new THREE.BoxGeometry(0.24, 0.003, 0.2), MAT.amber, 0, 0.0, 0.1); shield.renderOrder = 6; pivot.add(shield);
  const shieldFront = mesh(new THREE.BoxGeometry(0.24, 0.06, 0.003), MAT.amber, 0, -0.03, 0.2); pivot.add(shieldFront);
  pivot.position.y = 0.112; shield.position.y = 0; pivot.rotation.x = -1.2;
  const label = mesh(new THREE.PlaneGeometry(0.1, 0.012), new THREE.MeshBasicMaterial({ map: panelTexture('BLUE-LIGHT TRANSILLUMINATOR 470 nm', { bg: '#2a2e33', fg: '#8fb8ff', size: 0.38, w: 512 }) }), 0, 0.025, 0.1105); g.add(label);
  const light = new THREE.PointLight(0x3b7bff, 0, 0.3, 2); light.position.set(0, 0.08, 0); g.add(light);
  const anc = new THREE.Group(); anc.position.set(0, 0.052, 0); g.add(anc);
  g.userData = { glassMat, shield: pivot, anchors: [anc], light };
  return shadows(g);
}

export function iceBucket() {
  const g = new THREE.Group();
  const outer = rbox(0.26, 0.085, 0.17, 0.02, new THREE.MeshStandardMaterial({ color: 0x2f7fd0, roughness: 0.75 })); outer.position.y = 0.0425; g.add(outer);
  const iceGeo = new THREE.IcosahedronGeometry(0.008, 0);
  const iceMat = new THREE.MeshPhysicalMaterial({ color: 0xeef8ff, roughness: 0.15, transparent: true, opacity: 0.85, clearcoat: 1 });
  const ice = new THREE.InstancedMesh(iceGeo, iceMat, 260);
  const rnd = mulberry(5); const m4 = new THREE.Matrix4(); const q = new THREE.Quaternion(); const e = new THREE.Euler();
  for (let i = 0; i < 260; i++) {
    e.set(rnd() * 6, rnd() * 6, rnd() * 6); q.setFromEuler(e);
    const s = 0.6 + rnd() * 0.8;
    m4.compose(new THREE.Vector3((rnd() - 0.5) * 0.23, 0.074 + rnd() * 0.01, (rnd() - 0.5) * 0.14), q, new THREE.Vector3(s, s * 0.8, s));
    ice.setMatrixAt(i, m4);
  }
  g.add(ice);
  const snow = mesh(new THREE.BoxGeometry(0.235, 0.004, 0.145), new THREE.MeshStandardMaterial({ color: 0xe6f2fb, roughness: 0.9 }), 0, 0.074, 0); g.add(snow);
  const anchors = [];
  for (let i = 0; i < 8; i++) {
    const r = Math.floor(i / 4), c = i % 4;
    const a = new THREE.Group(); a.position.set((c - 1.5) * 0.05, 0.058, (r - 0.5) * 0.06); g.add(a); anchors.push(a);
  }
  g.userData.anchors = anchors;
  return shadows(g);
}

export function balance() {
  const g = new THREE.Group();
  const body = rbox(0.2, 0.06, 0.26, 0.012, MAT.white); body.position.y = 0.03; g.add(body);
  const shield = new THREE.Group(); shield.position.set(0, 0.06, -0.03); g.add(shield);
  const box = mesh(new THREE.BoxGeometry(0.17, 0.16, 0.17), MAT.glass, 0, 0.08, 0); box.renderOrder = 4; shield.add(box);
  const frame = mesh(new THREE.BoxGeometry(0.172, 0.006, 0.172), MAT.lightgrey, 0, 0.16, 0); shield.add(frame);
  const pan = mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.003, 32), MAT.steel, 0, 0.065, -0.03); g.add(pan);
  const boat = mesh(new THREE.BoxGeometry(0.035, 0.004, 0.035), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }), 0, 0.068, -0.03); g.add(boat);
  const disp = new Display(384, 96, (ctx, w, h, d) => {
    ctx.fillStyle = '#0a1a0a'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#7dff8a'; ctx.font = `700 ${h * 0.62}px ${MONO}`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText(d, w * 0.95, h * 0.55);
  });
  disp.update('0.0000 g');
  const panel = mesh(new THREE.PlaneGeometry(0.09, 0.022), new THREE.MeshBasicMaterial({ map: disp.tex, toneMapped: false }), 0, 0.045, 0.1305);
  panel.rotation.x = -0.15; g.add(panel);
  const anc = new THREE.Group(); anc.position.set(0, 0.07, -0.03); g.add(anc);
  g.userData = { display: disp, anchors: [anc] };
  return shadows(g);
}

export function strawberry() {
  const g = new THREE.Group();
  const pts = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const y = t * 0.036;
    const r = Math.sin(Math.pow(t, 0.75) * Math.PI) * 0.0165 * (1 - 0.25 * t) + (t > 0.95 ? 0 : 0);
    pts.push([Math.max(r, 0.0004), y]);
  }
  pts[pts.length - 1] = [0.0, 0.036];
  const berryMat = new THREE.MeshPhysicalMaterial({ color: 0xc8102e, roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.25, sheen: 0.3, sheenColor: new THREE.Color(0xff5070) });
  const berry = lathe(pts, 32, berryMat);
  berry.rotation.x = Math.PI; berry.position.y = 0.036;
  const pivot = new THREE.Group(); pivot.add(berry); pivot.rotation.z = Math.PI / 2.2; pivot.position.y = 0.016; g.add(pivot);
  const seedGeo = new THREE.SphereGeometry(0.0007, 6, 4); seedGeo.scale(1, 1.6, 1);
  const seeds = new THREE.InstancedMesh(seedGeo, new THREE.MeshStandardMaterial({ color: 0xe8c547, roughness: 0.5 }), 120);
  const m4 = new THREE.Matrix4(); const rnd = mulberry(2);
  for (let i = 0; i < 120; i++) {
    const t = 0.08 + rnd() * 0.85, a = rnd() * Math.PI * 2;
    const r = Math.sin(Math.pow(t, 0.75) * Math.PI) * 0.0165 * (1 - 0.25 * t);
    const p = new THREE.Vector3(Math.cos(a) * r, t * 0.036, Math.sin(a) * r);
    const n = new THREE.Vector3(Math.cos(a), 0.3, Math.sin(a)).normalize();
    m4.lookAt(new THREE.Vector3(), n, new THREE.Vector3(0, 1, 0)); m4.setPosition(p);
    seeds.setMatrixAt(i, m4);
  }
  berry.add(seeds);
  const calyx = new THREE.Group(); calyx.position.y = 0.036; pivot.add(calyx);
  calyx.rotation.x = 0;
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x3d8b37, roughness: 0.6, side: THREE.DoubleSide });
  for (let i = 0; i < 7; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.004, 0.016, 4), leafMat);
    leaf.scale.z = 0.25; leaf.position.set(0, 0.0, 0); leaf.rotation.set(0, i * 0.9, 0);
    const holder = new THREE.Group(); holder.rotation.y = i * Math.PI * 2 / 7; holder.add(leaf);
    leaf.rotation.set(-1.25, 0, 0); leaf.position.set(0, 0.002, 0.008);
    calyx.add(holder);
  }
  calyx.position.y = 0; calyx.rotation.x = Math.PI; berry.add(calyx);
  calyx.position.y = 0.036;
  const stem = mesh(new THREE.CylinderGeometry(0.0012, 0.0015, 0.012, 8), leafMat, 0, 0.042, 0); berry.add(stem);
  g.userData = { berry, calyx };
  return shadows(g);
}

export function tissuePiece() {
  const g = new THREE.Group();
  const geo = new THREE.IcosahedronGeometry(0.0034, 1);
  const pos = geo.attributes.position; const rnd = mulberry(9);
  for (let i = 0; i < pos.count; i++) pos.setXYZ(i, pos.getX(i) * (0.8 + rnd() * 0.4), pos.getY(i) * (0.6 + rnd() * 0.3), pos.getZ(i) * (0.8 + rnd() * 0.4));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: 0xd8203c, roughness: 0.35, clearcoat: 0.6 }));
  m.position.y = 0.0025; g.add(m);
  return shadows(g);
}

export function cuttingBoard() {
  const g = new THREE.Group();
  const b = rbox(0.18, 0.01, 0.12, 0.004, new THREE.MeshStandardMaterial({ color: 0xf4f4ef, roughness: 0.7 })); b.position.y = 0.005; g.add(b);
  const blade = mesh(new THREE.BoxGeometry(0.03, 0.0006, 0.006), MAT.steel, 0.07, 0.011, 0.03); blade.rotation.y = 0.3; g.add(blade);
  const handle = mesh(new THREE.BoxGeometry(0.07, 0.004, 0.006), new THREE.MeshStandardMaterial({ color: 0x5b7083 }), 0.022, 0.012, 0.045); handle.rotation.y = 0.3; g.add(handle);
  const petri = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.012, 40, 1, true), MAT.glass); petri.position.set(-0.035, 0.016, -0.005); g.add(petri);
  const pbase = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.0015, 40), MAT.glass, -0.035, 0.011, -0.005); g.add(pbase);
  const anchors = [new THREE.Group(), new THREE.Group()];
  anchors[0].position.set(-0.035, 0.012, -0.005); anchors[1].position.set(0.035, 0.01, -0.03);
  g.add(...anchors);
  g.userData.anchors = anchors;
  return shadows(g);
}

export function micropestle() {
  const g = new THREE.Group();
  const p = lathe([[0.0, 0.0], [0.0025, 0.002], [0.0042, 0.012], [0.0035, 0.02], [0.003, 0.07], [0.006, 0.072], [0.006, 0.085], [0.0, 0.086]], 18, MAT.white);
  g.add(p);
  return shadows(g);
}
export function pestleHolder() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.03, 20), MAT.rackblue, 0, 0.015, 0));
  const a = new THREE.Group(); a.position.y = 0.012; g.add(a);
  g.userData.anchors = [a];
  return shadows(g);
}

export function tipWaste() {
  const g = new THREE.Group();
  const bin = rbox(0.075, 0.085, 0.075, 0.005, new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.6 })); bin.position.y = 0.0425; g.add(bin);
  const bag = mesh(new THREE.BoxGeometry(0.066, 0.003, 0.066), new THREE.MeshStandardMaterial({ color: 0xe25c1b, roughness: 0.8 }), 0, 0.0845, 0); g.add(bag);
  const hole = mesh(new THREE.CircleGeometry(0.022, 24), MAT.hole, 0, 0.0865, 0); hole.rotation.x = -Math.PI / 2; g.add(hole);
  const lab = mesh(new THREE.PlaneGeometry(0.06, 0.022), new THREE.MeshBasicMaterial({ map: panelTexture('TIP WASTE', { bg: '#e25c1b', fg: '#fff', size: 0.55, w: 320, h: 120 }) }), 0, 0.055, 0.0381); g.add(lab);
  g.userData = { mouthY: 0.085 };
  return shadows(g);
}

export function gloveBox() {
  const g = new THREE.Group();
  const b = rbox(0.125, 0.065, 0.235, 0.004, new THREE.MeshStandardMaterial({ map: labelTexture({ title: 'Nitrile Gloves', sub: 'Powder-free · Size M · 100', color: '#6a3fb5', w: 512, h: 256 }), roughness: 0.6 }));
  b.position.y = 0.0325; g.add(b);
  const glove = mesh(new THREE.SphereGeometry(0.02, 12, 8), new THREE.MeshStandardMaterial({ color: 0x7e57c2, roughness: 0.6 }), 0, 0.068, 0); glove.scale.set(1.2, 0.5, 1.8); g.add(glove);
  return shadows(g);
}
export function goggles() {
  const g = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x23272d, roughness: 0.5 });
  const visorMat = new THREE.MeshPhysicalMaterial({ color: 0xd8f0ff, roughness: 0.05, transparent: true, opacity: 0.35, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false });
  const visor = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.05, 32, 1, true, -1.25, 2.5), visorMat);
  visor.renderOrder = 3; g.add(visor);
  for (const y of [-0.025, 0.025]) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.004, 6, 32, 2.5), frameMat);
    rim.rotation.set(Math.PI / 2, 0, -1.25 + Math.PI / 2); rim.rotation.z = Math.PI / 2 - 1.25; rim.position.y = y; g.add(rim);
  }
  const bridge = mesh(new THREE.BoxGeometry(0.02, 0.05, 0.006), frameMat, 0, 0, 0.074); g.add(bridge);
  for (const sx of [-1, 1]) { const vent = mesh(new THREE.BoxGeometry(0.012, 0.03, 0.01), frameMat, sx * 0.07, 0, 0.026); vent.rotation.y = sx * 1.2; g.add(vent); }
  const strap = new THREE.Mesh(new THREE.TorusGeometry(0.072, 0.003, 4, 32, Math.PI * 2 - 2.5), new THREE.MeshStandardMaterial({ color: 0x1565c0, roughness: 0.7 }));
  strap.rotation.set(Math.PI / 2, 0, 1.25 + Math.PI / 2); g.add(strap);
  g.rotation.x = -Math.PI / 2 + 0.25; g.position.y = 0.03;
  const outer = new THREE.Group(); outer.add(g);
  return shadows(outer);
}
export function labCoat() {
  const g = new THREE.Group();
  const coatMat = new THREE.MeshStandardMaterial({ color: 0xf7f8f8, roughness: 0.82 });
  const seamMat = new THREE.MeshStandardMaterial({ color: 0xe1e5e8, roughness: 0.9 });
  // hanger
  const hanger = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.008, 6, 30, Math.PI), new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 0.6 }));
  hanger.rotation.z = 0; hanger.scale.y = 0.35; hanger.position.y = -0.07; g.add(hanger);
  g.add(mesh(new THREE.TorusGeometry(0.02, 0.004, 6, 12, Math.PI * 1.5), MAT.steel, 0, 0.0, 0));
  // body: tapered panel built from a lathe-like extruded shape
  const shape = new THREE.Shape();
  shape.moveTo(-0.16, -0.06); shape.lineTo(-0.2, -0.12); shape.lineTo(-0.22, -0.9); shape.lineTo(0.22, -0.9); shape.lineTo(0.2, -0.12); shape.lineTo(0.16, -0.06); shape.lineTo(0.05, -0.05); shape.lineTo(0, -0.2); shape.lineTo(-0.05, -0.05); shape.closePath();
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.015, bevelSegments: 3 }), coatMat);
  body.position.z = -0.04; g.add(body);
  // lapels
  for (const sx of [-1, 1]) {
    const lap = mesh(new THREE.BoxGeometry(0.06, 0.2, 0.01), seamMat, sx * 0.045, -0.15, 0.062); lap.rotation.z = sx * 0.35; g.add(lap);
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.56, 16), coatMat); sleeve.position.set(sx * 0.215, -0.42, 0.0); sleeve.rotation.z = sx * 0.06; g.add(sleeve);
    const cuff = mesh(new THREE.CylinderGeometry(0.056, 0.056, 0.03, 16), seamMat, sx * 0.232, -0.69, 0); g.add(cuff);
    const pocket = mesh(new THREE.BoxGeometry(0.11, 0.1, 0.008), seamMat, sx * 0.1, -0.66, 0.064); g.add(pocket);
  }
  g.add(mesh(new THREE.BoxGeometry(0.004, 0.7, 0.006), seamMat, 0.0, -0.55, 0.064));
  for (let i = 0; i < 4; i++) g.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.004, 12).rotateX(Math.PI / 2), MAT.lightgrey, 0.016, -0.28 - i * 0.14, 0.066));
  const breast = mesh(new THREE.BoxGeometry(0.08, 0.07, 0.006), seamMat, -0.1, -0.27, 0.064); g.add(breast);
  const pen = mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.09, 8), new THREE.MeshStandardMaterial({ color: 0x1f6feb }), -0.12, -0.24, 0.07); g.add(pen);
  const badge = mesh(new THREE.PlaneGeometry(0.09, 0.035), new THREE.MeshBasicMaterial({ map: panelTexture('MOLECULAR BIOLOGY', { bg: '#0b5cad', fg: '#fff', size: 0.4, w: 320, h: 120 }) }), 0.1, -0.26, 0.068); g.add(badge);
  return shadows(g);
}

export function largeCentrifuge() {
  const g = new THREE.Group();
  const body = rbox(0.55, 0.36, 0.6, 0.04, MAT.white); body.position.y = 0.18; g.add(body);
  const lid = rbox(0.5, 0.03, 0.42, 0.02, MAT.lightgrey); lid.position.set(0, 0.37, -0.04); g.add(lid);
  const win = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.005, 32), MAT.smoked, 0, 0.388, -0.04); g.add(win);
  const panel = mesh(new THREE.BoxGeometry(0.4, 0.06, 0.01), MAT.dark, 0, 0.3, 0.3); panel.rotation.x = -0.3; g.add(panel);
  return shadows(g);
}
