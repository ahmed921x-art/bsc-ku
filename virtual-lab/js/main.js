import * as THREE from 'three';
import { World, STATIONS } from './scene.js';
import { Lab } from './lab.js';
import { Engine } from './engine.js';
import { UI } from './ui.js';
import { Input, CameraRig } from './input.js';
import { MolViewer } from './molecular.js';
import { unlockAudio } from './audio.js';

class Bus {
  constructor() { this.h = {}; }
  on(t, f) { (this.h[t] ||= []).push(f); }
  emit(t, d) { (this.h[t] || []).forEach(f => f(d)); }
}

const QUALITY = { High: { pr: 2, shadow: 2048 }, Balanced: { pr: 1.5, shadow: 2048 }, Performance: { pr: 1, shadow: 1024 } };

const canvas = document.getElementById('lab3d');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 30);
const MODE = window.LAB_MODE === 'simple' ? 'simple' : 'full';
const bus = new Bus();
const world = new World(renderer);
const lab = new Lab(world, bus, MODE);
const engine = new Engine(lab, bus, MODE);
lab.engine = engine;
const rig = new CameraRig(camera);
const input = new Input(canvas, camera, world, lab, rig, bus);
const mol = new MolViewer(document.getElementById('molcanvas'));

const app = {
  autoCam: true,
  quality: (window.devicePixelRatio || 1) >= 2 ? 'Balanced' : 'High',
  molKey: null,
  mode: MODE,
  station: 'overview',
  goStation(key, instant = false) {
    if (!STATIONS[key]) return;
    this.station = key; lab.station = key;
    rig.setView(STATIONS[key], instant);
    if (STATIONS[key].x != null) world.focusShadow(STATIONS[key].x);
    if (lab.S.held) lab.holdPoint.set(STATIONS[key].x ?? 0, 0.13, 0.1);
    if (lab.pourDock) { lab.pourDock = null; lab.stopPour(); }
    document.querySelectorAll('#stations [data-st]').forEach(b => b.classList.toggle('on', b.dataset.st === key));
    const u = this.ui; if (u?.panel) { const o = Object.values(world.objects).find(o => o.inst === u.panel); if (o && o.station !== key) u.closePanel(); }
    lab.version++;
    bus.emit('lab', { type: 'station', station: key });
  },
  onStep(step) {
    this.molKey = step.mol;
    document.querySelectorAll('#stations [data-st]').forEach(b => b.classList.toggle('hint', b.dataset.st === step.station && b.dataset.st !== this.station));
    const manual = ['carry', 'tcload', 'unload', 'q-pcrsetup', 'q-cycle', 'q-load'].includes(step.id);
    if (!manual && step.station !== this.station && this.entered) this.goStation(step.station);
    this.ui?.renderMol();
  },
  onPanel() { lab.version++; },
  resizeMol() {
    const c = document.getElementById('molcanvas');
    const r = c.getBoundingClientRect();
    if (r.width > 10) mol.resize(r.width, r.height);
  },
  cycleQuality() {
    const keys = Object.keys(QUALITY); this.quality = keys[(keys.indexOf(this.quality) + 1) % keys.length];
    applyQuality();
  },
};
const ui = new UI({ lab, engine, bus, world, mol, app });
app.ui = ui;
if (MODE === 'simple') ui.assisted = true;

function applyQuality() {
  const q = QUALITY[app.quality];
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.pr));
  world.key.shadow.mapSize.set(q.shadow, q.shadow);
  if (world.key.shadow.map) { world.key.shadow.map.dispose(); world.key.shadow.map = null; }
  resize();
}
let viewShift = 0;
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.fov = w / h < 1.2 ? 48 : 40;
  applyViewOffset(true);
  app.resizeMol();
}
// Keep the 3D work area centred in the space not covered by panels.
let viewShiftY = 0;
function applyViewOffset(force) {
  const w = window.innerWidth, h = window.innerHeight;
  let right = 0, left = 0, top = 58, bottom = 70;
  if (app.entered && !ui.presenter) right = document.getElementById('instructor').getBoundingClientRect().width + 12;
  if (document.getElementById('piphud').classList.contains('show')) left = 310;
  const sheet = document.getElementById('panel');
  if (sheet.classList.contains('show')) bottom = h - sheet.getBoundingClientRect().top + 10;
  const tx = right - left, ty = bottom - top;
  const k = force ? 1 : 0.12;
  viewShift += (tx - viewShift) * k; viewShiftY += (ty - viewShiftY) * k;
  if (Math.abs(tx - viewShift) < 0.5) viewShift = tx;
  if (Math.abs(ty - viewShiftY) < 0.5) viewShiftY = ty;
  const dx = Math.round(viewShift), dy = Math.round(viewShiftY);
  const fw = w + Math.abs(dx), fh = h + Math.abs(dy);
  camera.aspect = fw / fh;
  camera.setViewOffset(fw, fh, dx > 0 ? dx : 0, dy > 0 ? dy : 0, w, h);
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
applyQuality();

// ------------------------------------------------------------ highlights
const hlMat = (c) => new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: 0.9, depthTest: false });
const highlights = {
  sel: new THREE.LineSegments(new THREE.BufferGeometry(), hlMat(0x59d0ff)),
  drag: new THREE.LineSegments(new THREE.BufferGeometry(), hlMat(0xffb35c)),
  hint: new THREE.LineSegments(new THREE.BufferGeometry(), hlMat(0x7ee787)),
};
app.hints = true;
for (const l of Object.values(highlights)) { l.matrixAutoUpdate = false; l.renderOrder = 20; l.visible = false; world.scene.add(l); }
const hintFill = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0x7ee787, transparent: true, opacity: 0.1, depthWrite: false }));
hintFill.renderOrder = 19; hintFill.matrixAutoUpdate = false; hintFill.visible = false; highlights.hint.add(hintFill);
const edgeCache = new Map();
function setHL(line, objId) {
  const o = objId && world.objects[objId];
  if (!o || !o.hit) { line.visible = false; line.userData.obj = null; return; }
  if (!edgeCache.has(o.hit.geometry.uuid)) edgeCache.set(o.hit.geometry.uuid, new THREE.EdgesGeometry(o.hit.geometry));
  line.geometry = edgeCache.get(o.hit.geometry.uuid);
  if (line === highlights.hint) { hintFill.geometry = o.hit.geometry; hintFill.visible = true; }
  line.userData.obj = o; line.visible = true;
}
bus.on('dragTarget', (t) => setHL(highlights.drag, t?.id));
bus.on('select', (s) => setHL(highlights.sel, s.id));
bus.on('stepChange', () => { lab.version++; });

// ------------------------------------------------------------ auto camera
const INST_DIST = { cfg: 0.62, vortex: 0.5, spinner: 0.5, tc: 0.78, chamber: 0.6, ps: 0.66, trans: 0.62 };
function autoCamera() {
  if (!app.autoCam || !app.entered) return;
  const S = lab.S, v3 = new THREE.Vector3();
  const pip = S.held?.kind === 'pip' ? S.pip[S.held.id] : null;
  if (pip?.at) {
    const vd = world.vessels[pip.at];
    world.worldPos(vd.node, v3); v3.y += vd.kind === 'well' ? 0.0 : 0.025;
    v3.y += vd.kind === 'well' ? 0.01 : 0.03; rig.focusOn(v3, vd.kind === 'well' ? 0.24 : vd.stock ? 0.36 : 0.28, 0.75); return;
  }
  const pl = S.items.pestle.loc;
  if (pl?.startsWith('in:')) { world.worldPos(world.objects[pl.slice(3)].group, v3); v3.y += 0.03; rig.focusOn(v3, 0.22, 0.6); return; }
  if (lab.pourDock) { world.worldPos(world.objects[lab.pourDock === 'tray' ? 'tray' : 'chamber'].group, v3); v3.y += 0.03; rig.focusOn(v3, 0.42, 0.7); return; }
  if (S.items.tray.loc === 'trans' && S.inst.trans.on) { world.worldPos(world.objects.trans.group, v3); v3.y += 0.06; rig.focusOn(v3, 0.34, 0.85); return; }
  if (ui.panel) {
    const o = Object.values(world.objects).find(o => o.inst === ui.panel);
    if (o && o.station === app.station) { world.worldPos(o.group, v3); v3.y += 0.06; rig.focusOn(v3, INST_DIST[ui.panel] || 0.5, 0.6); return; }
  }
  rig.clearFocus();
}

// ------------------------------------------------------------ grinding pad
const pad = document.getElementById('grindpad');
let last = null;
pad.addEventListener('pointerdown', (e) => { last = { x: e.clientX, y: e.clientY }; pad.setPointerCapture(e.pointerId); });
pad.addEventListener('pointermove', (e) => {
  if (!last) return;
  const d = Math.hypot(e.clientX - last.x, e.clientY - last.y); last = { x: e.clientX, y: e.clientY };
  lab.grind(d * 0.0011);
  pad.style.setProperty('--a', `${(lab.grindPhase * 40) % 360}deg`);
});
pad.addEventListener('pointerup', () => { last = null; });

// ------------------------------------------------------------ intro
document.getElementById('enter').onclick = () => {
  unlockAudio();
  document.getElementById('intro').classList.add('gone');
  document.body.classList.add('entered');
  app.entered = true;
  rig.speed = 1.2;
  app.goStation('ppe');
  setTimeout(() => { rig.speed = 2.6; }, 2500);
  ui.renderMol();
};
document.getElementById('enterDemo').onclick = () => { document.getElementById('enter').onclick(); ui.togglePresenter(true); };
bus.on('userGesture', unlockAudio);

// ------------------------------------------------------------ molecular params
function molParams() {
  const S = lab.S, key = app.molKey, st = engine.step;
  const prm = {};
  if (key === 'lysis') prm.p = S.vessels.A.tissue?.lysed || 0;
  if (key === 'spin-debris' || key === 'spin-dna') {
    const c = S.inst.cfg;
    if (c.running) prm.p = 1 - c.remain / c.sec;
    else prm.p = engine.isComplete() || (st.id !== 'spin1' && st.id !== 'spin2' && st.id !== 'wash') ? 1 : S.log.some(e => e.type === 'cfgDone' && e.t > (stepEnteredAt || 0)) ? 1 : 0;
  }
  if (key === 'precip') prm.p = Math.min(1, (S.vessels.B.inversions || 0) / 10);
  if (key === 'dissolve') { const B = S.vessels.B; const s = (B.sol.gdna || 0), pel = (B.pel.gdna || 0) + (B.sol.gppt || 0); prm.p = s + pel > 0 ? s / (s + pel) : 0; }
  if (key === 'pcr') { const t = S.inst.tc; if (t.running && t.stage) Object.assign(prm, { phase: t.stage.phase, frac: t.stage.frac, ramping: t.stage.ramping, temp: t.temp }); else prm.phase = t.done ? 'hold' : 'idle'; }
  if (key === 'gel-run' || key === 'gel-mesh') prm.running = S.inst.ps.on || key === 'gel-run';
  return prm;
}
let stepEnteredAt = 0;
bus.on('stepChange', () => { stepEnteredAt = lab.S.t; });

// ------------------------------------------------------------ loop
const clock = new THREE.Clock();
let lastVer = -1, molFrame = 0, darkness = 0;
rig.setView(STATIONS.overview, true);
function frame() {
  const dt = Math.min(0.05, clock.getDelta());
  lab.tick(dt);
  if (lab.pourActive) lab.pour(dt);
  lab.sync(dt);
  if (lab.version !== lastVer) {
    lastVer = lab.version; autoCamera();
    const ht = app.hints && app.entered ? engine.hintTarget() : null;
    setHL(highlights.hint, ht && world.objects[ht]?.station === app.station ? ht : null);
  }
  if (!app.entered) { const t = performance.now() / 1000; rig.yaw = Math.sin(t * 0.08) * 0.18; }
  applyViewOffset(false);
  rig.update(dt);
  // gel documentation "darkroom": dim the room while the blue light is on
  const dark = lab.S.inst.trans.on && lab.S.items.tray.loc === 'trans' ? 1 : 0;
  darkness += (dark - darkness) * Math.min(1, dt * 3);
  world.key.intensity = 2.1 * (1 - darkness * 0.85); world.hemi.intensity = 0.55 * (1 - darkness * 0.8);
  world.scene.environmentIntensity = 0.55 * (1 - darkness * 0.8); renderer.toneMappingExposure = 1.05 - darkness * 0.25;
  for (const l of Object.values(highlights)) {
    if (!l.visible || !l.userData.obj) continue;
    l.userData.obj.hit.updateWorldMatrix(true, false);
    l.matrix.copy(l.userData.obj.hit.matrixWorld);
    l.material.opacity = l === highlights.hint ? 0.35 + Math.sin(performance.now() / 320) * 0.3 : 0.55 + Math.sin(performance.now() / 180) * 0.35;
  }
  if (lab.selected && !world.objects[lab.selected]?.group.visible) setHL(highlights.sel, null);
  if (lab.S.held && highlights.sel.visible) { lab.selected = null; setHL(highlights.sel, null); }
  renderer.render(world.scene, camera);
  ui.update();
  if (ui.molOpen && app.molKey && !document.hidden) {
    molFrame++;
    if (molFrame % (ui.molBig ? 1 : 2) === 0) { mol.show(app.molKey); mol.set(molParams()); mol.render(dt * (ui.molBig ? 1 : 2)); }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// prevent iOS gestures from scrolling / zooming the page
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('touchmove', (e) => { if (!e.target.closest('.scroll')) e.preventDefault(); }, { passive: false });
let lastTouch = 0;
document.addEventListener('touchend', (e) => { const now = Date.now(); if (now - lastTouch < 300 && !e.target.closest('input')) e.preventDefault(); lastTouch = now; }, { passive: false });

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
window.__lab = { lab, engine, world, ui, app, rig, mol, input };
// Screen position of an object (used by automated interaction tests).
window.__lab.scr = (id) => {
  const o = world.objects[id] || null; const vd = world.vessels[id];
  const v = new THREE.Vector3();
  (vd ? vd.node : (o.hit || o.group)).getWorldPosition(v);
  if (vd) v.y += 0.02;
  v.project(camera);
  return { x: Math.round((v.x + 1) / 2 * innerWidth), y: Math.round((1 - v.y) / 2 * innerHeight) };
};
