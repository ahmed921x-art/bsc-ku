// Molecular-scale 3D visualisations rendered in a picture-in-picture viewer.
import * as THREE from 'three';
import { mulberry, FONT } from './textures.js';

const BASE_COL = { A: 0xff6b6b, T: 0xffd93d, G: 0x6bcf7f, C: 0x4d96ff };
const COMP = { A: 'T', T: 'A', G: 'C', C: 'G' };
const SEQ = 'ATGTCACCACAAACAGAGACTAAAGCAAGT';

function sprite(text, { color = '#e6edf3', size = 0.5, bg = 'rgba(10,16,24,0.7)' } = {}) {
  const c = document.createElement('canvas'); const ctx = c.getContext('2d');
  ctx.font = `600 48px ${FONT}`; const w = Math.ceil(ctx.measureText(text).width) + 36; c.width = w; c.height = 72;
  ctx.font = `600 48px ${FONT}`;
  if (bg) { ctx.fillStyle = bg; roundRect(ctx, 0, 0, w, 72, 18); ctx.fill(); }
  ctx.fillStyle = color; ctx.textBaseline = 'middle'; ctx.fillText(text, 18, 38);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true, fog: false }));
  s.scale.set(size * w / 72, size, 1); s.renderOrder = 10;
  return s;
}
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
const ease = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const clamp01 = (x) => Math.max(0, Math.min(1, x));

export class MolViewer {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x070b12);
    this.scene.fog = new THREE.FogExp2(0x070b12, 0.035);
    this.camera = new THREE.PerspectiveCamera(40, 16 / 10, 0.1, 100);
    this.camera.position.set(0, 0, 14);
    this.scene.add(new THREE.HemisphereLight(0xbfd9ff, 0x101820, 1.1));
    const d = new THREE.DirectionalLight(0xffffff, 2.2); d.position.set(4, 6, 8); this.scene.add(d);
    const r = new THREE.PointLight(0x4aa8ff, 20, 30); r.position.set(-6, -3, 4); this.scene.add(r);
    this.root = new THREE.Group(); this.scene.add(this.root);
    this.cache = {}; this.key = null; this.params = { p: 0 }; this.t = 0;
    this.caption = '';
  }
  resize(w, h) { this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
  show(key) {
    if (key === this.key) return;
    this.key = key;
    this.root.clear();
    if (!key) return;
    if (!this.cache[key]) this.cache[key] = this.build(key);
    this.cur = this.cache[key];
    this.root.add(this.cur.group);
    this.camera.position.set(...(this.cur.cam || [0, 0, 14]));
    this.camera.lookAt(0, 0, 0);
  }
  set(params) { Object.assign(this.params, params); }
  render(dt) {
    if (!this.cur) return;
    const c = this.canvas, pr = this.renderer.getPixelRatio();
    if (Math.abs(c.width - Math.round(c.clientWidth * pr)) > 2 || Math.abs(c.height - Math.round(c.clientHeight * pr)) > 2) this.resize(c.clientWidth, c.clientHeight);
    this.t += dt;
    this.cur.update(this.t, this.params, dt);
    this.caption = this.cur.caption ? this.cur.caption(this.params) : '';
    this.renderer.render(this.scene, this.camera);
  }
  build(key) {
    switch (key) {
      case 'cells': return cellsScene(false);
      case 'lysis': return cellsScene(true);
      case 'spin-debris': return spinScene('debris');
      case 'spin-dna': return spinScene('dna');
      case 'precip': return precipScene(false);
      case 'dissolve': return precipScene(true);
      case 'pcr': case 'pcr-intro': return pcrScene(key === 'pcr-intro');
      case 'gel-mesh': case 'gel-run': return gelScene();
      default: return { group: new THREE.Group(), update() {} };
    }
  }
}

// ------------------------------------------------------------ DNA coil helper
function coilPoints(seed, n, compact, center, spread) {
  const rnd = mulberry(seed); const pts = [];
  let p = new THREE.Vector3(); const dir = new THREE.Vector3(1, 0, 0);
  for (let i = 0; i < n; i++) {
    dir.add(new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(0.9)).normalize();
    p = p.clone().addScaledVector(dir, spread);
    pts.push(p);
  }
  const c = pts.reduce((a, b) => a.add(b.clone()), new THREE.Vector3()).multiplyScalar(1 / n);
  return pts.map((q, i) => {
    const ext = q.clone().sub(c);
    const comp = new THREE.Vector3(Math.cos(i * 0.9) * compact, Math.sin(i * 0.7) * compact, Math.sin(i * 1.3) * compact);
    return { ext, comp, center };
  });
}

// ------------------------------------------------------------ cells & lysis
function cellsScene(lysis) {
  const group = new THREE.Group();
  const cells = [];
  const wallMat = () => new THREE.MeshPhysicalMaterial({ color: 0x6fcf5a, transparent: true, opacity: 0.22, roughness: 0.4, side: THREE.DoubleSide, depthWrite: false });
  const memMat = () => new THREE.MeshPhysicalMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.18, roughness: 0.2, depthWrite: false });
  const nucMat = () => new THREE.MeshPhysicalMaterial({ color: 0xb48cff, transparent: true, opacity: 0.35, roughness: 0.3, depthWrite: false });
  const positions = [[-4.2, 1.6], [0, 1.9], [4.2, 1.6], [-2.1, -2.2], [2.1, -2.2]];
  positions.forEach(([x, y], i) => {
    const g = new THREE.Group(); g.position.set(x, y, 0); group.add(g);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(3.8, 3.5, 2.4, 1, 1, 1), wallMat()); g.add(wall);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(wall.geometry), new THREE.LineBasicMaterial({ color: 0x9dff7a, transparent: true, opacity: 0.6 })); g.add(edges);
    const mem = new THREE.Mesh(new THREE.SphereGeometry(1.5, 24, 16), memMat()); mem.scale.set(1.18, 1.05, 0.72); g.add(mem);
    const vac = new THREE.Mesh(new THREE.SphereGeometry(0.85, 20, 12), new THREE.MeshPhysicalMaterial({ color: 0xff5f87, transparent: true, opacity: 0.22, depthWrite: false })); vac.position.set(0.5, -0.3, 0); g.add(vac);
    const nuc = new THREE.Mesh(new THREE.SphereGeometry(0.62, 24, 16), nucMat()); nuc.position.set(-0.6, 0.45, 0.1); g.add(nuc);
    const chl = [];
    for (let k = 0; k < 5; k++) {
      const c = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), new THREE.MeshStandardMaterial({ color: 0x3fa34d, roughness: 0.5, transparent: true, opacity: 1 }));
      c.scale.set(1.5, 0.8, 0.8); c.position.set(-1.2 + k * 0.6, -0.9 + (k % 2) * 0.3, 0.3); g.add(c); chl.push(c);
    }
    const dna = coilPoints(i * 7 + 3, 70, 0.32, nuc.position, 0.35);
    const dnaMat = new THREE.MeshStandardMaterial({ color: 0x4aa8ff, emissive: 0x1450a0, emissiveIntensity: 0.6, roughness: 0.4 });
    const dnaMesh = new THREE.Mesh(new THREE.BufferGeometry(), dnaMat); g.add(dnaMesh);
    const frags = [];
    for (let k = 0; k < 10; k++) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.6 + Math.random() * 0.6, 0.06, 0.4), wallMat()); f.material.opacity = 0;
      f.userData.dir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
      f.userData.rot = new THREE.Vector3(Math.random(), Math.random(), Math.random());
      g.add(f); frags.push(f);
    }
    cells.push({ g, wall, edges, mem, vac, nuc, chl, dna, dnaMesh, frags, lastP: -1 });
  });
  // detergent micelles
  const micGeo = new THREE.SphereGeometry(0.12, 10, 8);
  const mic = new THREE.InstancedMesh(micGeo, new THREE.MeshStandardMaterial({ color: 0xffd34d, emissive: 0x664400, roughness: 0.3 }), 120);
  const micData = []; const rnd = mulberry(4);
  for (let i = 0; i < 120; i++) micData.push({ home: new THREE.Vector3((rnd() - 0.5) * 16, (rnd() - 0.5) * 10, (rnd() - 0.5) * 4 + 2), target: positions[i % 5], ph: rnd() * 6 });
  if (lysis) group.add(mic);
  const labels = new THREE.Group(); group.add(labels);
  const lbl = (t, x, y, col) => { const s = sprite(t, { color: col, size: 0.42 }); s.position.set(x, y, 2.2); labels.add(s); return s; };
  const lWall = lbl('cell wall', -6.6, 3.5, '#9dff7a'), lNuc = lbl('nucleus · DNA', -3.4, 3.9, '#c7a6ff'), lChl = lbl('chloroplasts (rbcL)', 5.4, -0.2, '#7ee787');
  const lMic = lysis ? lbl('SDS micelles', 5.6, 4.0, '#ffd34d') : null;
  const lDna = lbl('released DNA', 0, -4.6, '#79c0ff'); lDna.visible = false;
  const m4 = new THREE.Matrix4();
  return {
    group, cam: [0, 0, 15],
    caption(pr) {
      const p = lysis ? pr.p : 0;
      if (!lysis) return 'Intact strawberry cells: cellulose wall, membrane, vacuole, nucleus and chloroplasts. DNA is packed inside nuclei and chloroplasts.';
      if (p < 0.25) return 'Grinding breaks the rigid cellulose walls so the detergent can reach the membranes.';
      if (p < 0.6) return 'SDS micelles dissolve the lipid membranes; EDTA locks away Mg²⁺ so nucleases cannot cut DNA.';
      if (p < 0.95) return 'The nuclear envelope dissolves; histones are stripped off and long DNA strands unfold into the buffer.';
      return 'Lysis complete: DNA, RNA, proteins and cell debris are all in solution.';
    },
    update(t, pr) {
      const p = lysis ? clamp01(pr.p) : 0;
      group.rotation.y = Math.sin(t * 0.15) * 0.25;
      for (const c of cells) {
        const wallBreak = clamp01((p - 0.1) / 0.35), memGone = clamp01((p - 0.3) / 0.35), nucGone = clamp01((p - 0.5) / 0.3), release = clamp01((p - 0.55) / 0.45);
        c.wall.material.opacity = 0.22 * (1 - wallBreak); c.edges.material.opacity = 0.6 * (1 - wallBreak);
        c.mem.material.opacity = 0.18 * (1 - memGone); c.vac.material.opacity = 0.22 * (1 - memGone);
        c.nuc.material.opacity = 0.35 * (1 - nucGone);
        c.chl.forEach((k, i) => { k.position.x += Math.sin(t + i) * 0.002; k.material.opacity = 1 - release * 0.4; });
        c.frags.forEach((f) => { f.material.opacity = wallBreak > 0 && wallBreak < 1 ? 0.35 * Math.sin(wallBreak * Math.PI) : 0; f.position.copy(f.userData.dir).multiplyScalar(1.6 + wallBreak * 2.2); f.rotation.set(f.userData.rot.x * wallBreak * 4, f.userData.rot.y * wallBreak * 4, f.userData.rot.z * wallBreak * 4); });
        const pq = Math.round(release * 60) / 60 + Math.round(t * 4) / 400;
        if (Math.abs(pq - c.lastP) > 0.004) {
          c.lastP = pq;
          const pts = c.dna.map((d, i) => d.center.clone().add(d.comp.clone().lerp(d.ext.clone().multiplyScalar(1.6), ease(release))).add(new THREE.Vector3(Math.sin(t * 0.8 + i * 0.3) * 0.05 * release, Math.cos(t * 0.7 + i * 0.2) * 0.05 * release, 0)));
          c.dnaMesh.geometry.dispose();
          c.dnaMesh.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.045 + release * 0.01, 5, false);
        }
      }
      if (lysis) {
        micData.forEach((m, i) => {
          const [tx, ty] = m.target; const att = clamp01(p * 1.6);
          const pos = m.home.clone().lerp(new THREE.Vector3(tx + Math.cos(i) * 1.7, ty + Math.sin(i) * 1.6, Math.sin(i * 3) * 0.8), att * 0.85);
          pos.x += Math.sin(t * 1.3 + m.ph) * 0.15; pos.y += Math.cos(t * 1.1 + m.ph) * 0.15;
          m4.makeTranslation(pos.x, pos.y, pos.z); mic.setMatrixAt(i, m4);
        });
        mic.instanceMatrix.needsUpdate = true;
      }
      lWall.visible = p < 0.4; lNuc.visible = p < 0.7; lDna.visible = p > 0.65; if (lMic) lMic.visible = p > 0.05 && p < 0.9;
      void lChl;
    },
  };
}

// ------------------------------------------------------------ centrifugation
function spinScene(kind) {
  const group = new THREE.Group();
  const prof = [[0.0, -4], [0.6, -3.3], [1.9, -1.4], [2.0, 4]].map(([r, y]) => new THREE.Vector2(r, y));
  const tube = new THREE.Mesh(new THREE.LatheGeometry(prof, 40), new THREE.MeshPhysicalMaterial({ color: 0xdfefff, transparent: true, opacity: 0.12, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false }));
  group.add(tube);
  const liq = new THREE.Mesh(new THREE.LatheGeometry([[0, -3.95], [0.58, -3.3], [1.85, -1.4], [1.9, 2.5], [0, 2.5]].map(([r, y]) => new THREE.Vector2(r, y)), 40), new THREE.MeshPhysicalMaterial({ color: kind === 'debris' ? 0xd2456a : 0xeef3ff, transparent: true, opacity: kind === 'debris' ? 0.18 : 0.1, depthWrite: false }));
  group.add(liq);
  const N = 380, rnd = mulberry(kind === 'debris' ? 21 : 33);
  const geo = kind === 'debris' ? new THREE.IcosahedronGeometry(0.09, 0) : new THREE.CapsuleGeometry(0.04, 0.35, 2, 6);
  const mat = new THREE.MeshStandardMaterial({ color: kind === 'debris' ? 0x8a2234 : 0xf6f1ee, roughness: 0.7, emissive: kind === 'dna' ? 0x222233 : 0x000000 });
  const inst = new THREE.InstancedMesh(geo, mat, N); group.add(inst);
  const parts = [];
  for (let i = 0; i < N; i++) {
    const y = -3 + rnd() * 5.3, rr = Math.min(1.7, 0.4 + (y + 3.5) * 0.6) * Math.sqrt(rnd()), a = rnd() * 6.28;
    const start = new THREE.Vector3(Math.cos(a) * rr, y, Math.sin(a) * rr);
    const end = new THREE.Vector3(1.0 + (rnd() - 0.5) * 0.7, -3.25 + rnd() * 0.5, (rnd() - 0.5) * 0.9);
    parts.push({ start, end, delay: rnd() * 0.5, rot: new THREE.Euler(rnd() * 6, rnd() * 6, rnd() * 6) });
  }
  const strands = [];
  if (kind === 'debris') {
    for (let k = 0; k < 9; k++) {
      const pts = []; const r2 = mulberry(k + 50); let p = new THREE.Vector3((r2() - 0.5) * 2.4, -1 + r2() * 3, (r2() - 0.5) * 1.5);
      for (let j = 0; j < 14; j++) { p = p.clone().add(new THREE.Vector3((r2() - 0.5) * 0.5, (r2() - 0.5) * 0.5, (r2() - 0.5) * 0.3)); pts.push(p); }
      const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.03, 5), new THREE.MeshStandardMaterial({ color: 0x4aa8ff, emissive: 0x1450a0, emissiveIntensity: 0.8 }));
      group.add(m); strands.push(m);
    }
  }
  const arrow = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 10), new THREE.MeshBasicMaterial({ color: 0xffb35c })); arrow.add(shaft);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 14), new THREE.MeshBasicMaterial({ color: 0xffb35c })); head.position.y = -1.3; head.rotation.x = Math.PI; arrow.add(head);
  arrow.position.set(3.6, 0, 0); group.add(arrow);
  const lab = sprite('centrifugal force', { color: '#ffb35c', size: 0.4 }); lab.position.set(3.6, 1.6, 0); group.add(lab);
  const lp = sprite(kind === 'debris' ? 'pellet: cell walls + SDS–protein' : 'DNA pellet', { color: kind === 'debris' ? '#ff8fa3' : '#ffffff', size: 0.42 }); lp.position.set(-1.5, -4.5, 0.5); group.add(lp);
  if (kind === 'debris') { const ls = sprite('supernatant: dissolved DNA', { color: '#79c0ff', size: 0.42 }); ls.position.set(-2.4, 3.2, 0.5); group.add(ls); }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  group.rotation.z = -0.35;
  return {
    group, cam: [0, 0, 13],
    caption(pr) {
      return kind === 'debris' ? (pr.p < 0.95 ? 'Dense insoluble material — cell walls, starch and SDS-denatured proteins — is forced to the bottom; DNA stays dissolved.' : 'Debris pelleted. The DNA is in the clear supernatant above.')
        : (pr.p < 0.95 ? 'The DNA–salt precipitate is denser than the alcohol mixture and sediments into a compact pellet.' : 'DNA pellet formed on the outer (hinge) side of the tube. The supernatant can now be removed.');
    },
    update(t, pr) {
      const p = clamp01(pr.p);
      group.rotation.y = Math.sin(t * 0.3) * 0.35;
      parts.forEach((pt, i) => {
        const f = ease(clamp01((p - pt.delay * 0.6) / 0.6));
        const pos = pt.start.clone().lerp(pt.end, f);
        pos.x += Math.sin(t * 1.5 + i) * 0.04 * (1 - f); pos.y += Math.cos(t * 1.2 + i) * 0.04 * (1 - f);
        q.setFromEuler(pt.rot); m4.compose(pos, q, new THREE.Vector3(1, 1, 1)); inst.setMatrixAt(i, m4);
      });
      inst.instanceMatrix.needsUpdate = true;
      strands.forEach((s, i) => { s.position.y = Math.sin(t * 0.7 + i) * 0.1; s.rotation.y = t * 0.1 + i; });
      arrow.visible = p > 0.02 && p < 0.98; lab.visible = arrow.visible;
    },
  };
}

// ------------------------------------------------------------ precipitation / dissolving
function precipScene(reverse) {
  const group = new THREE.Group();
  const strands = [], rnd = mulberry(77);
  for (let k = 0; k < 14; k++) {
    const pts = []; let p = new THREE.Vector3((rnd() - 0.5) * 10, (rnd() - 0.5) * 6, (rnd() - 0.5) * 3); const d = new THREE.Vector3(1, 0, 0);
    for (let j = 0; j < 18; j++) { d.add(new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(0.8)).normalize(); p = p.clone().addScaledVector(d, 0.45); pts.push(p); }
    const cen = pts.reduce((a, b) => a.add(b.clone()), new THREE.Vector3()).multiplyScalar(1 / pts.length);
    const local = pts.map(q => q.clone().sub(cen));
    const target = new THREE.Vector3((rnd() - 0.5) * 1.2, (rnd() - 0.5) * 1.0, (rnd() - 0.5) * 0.8);
    const mat = new THREE.MeshStandardMaterial({ color: 0x4aa8ff, emissive: 0x1450a0, emissiveIntensity: 0.7, roughness: 0.4 });
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(local), 60, 0.06, 6), mat);
    m.position.copy(cen); group.add(m);
    strands.push({ m, home: cen, target, spin: new THREE.Vector3(rnd(), rnd(), rnd()) });
  }
  const W = 260, water = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshStandardMaterial({ color: 0x9ad6ff, transparent: true, opacity: 0.55 }), W);
  const wData = []; for (let i = 0; i < W; i++) { const s = strands[i % strands.length]; wData.push({ s, off: new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize().multiplyScalar(0.35 + rnd() * 0.3), far: new THREE.Vector3((rnd() - 0.5) * 14, (rnd() - 0.5) * 9, (rnd() - 0.5) * 4) }); }
  group.add(water);
  const NA = 90, na = new THREE.InstancedMesh(new THREE.SphereGeometry(0.11, 10, 8), new THREE.MeshStandardMaterial({ color: 0xc58cff, emissive: 0x40206a, roughness: 0.3 }), NA);
  const naData = []; for (let i = 0; i < NA; i++) naData.push({ s: strands[i % strands.length], off: new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize().multiplyScalar(0.18), far: new THREE.Vector3((rnd() - 0.5) * 14, (rnd() - 0.5) * 9, (rnd() - 0.5) * 4) });
  group.add(na);
  const l1 = sprite('DNA (PO₄⁻ backbone)', { color: '#79c0ff', size: 0.42 }); l1.position.set(-4.5, 3.6, 1); group.add(l1);
  const l2 = sprite('Na⁺', { color: '#c58cff', size: 0.42 }); l2.position.set(4.5, 3.6, 1); group.add(l2);
  const l3 = sprite('H₂O hydration shell', { color: '#9ad6ff', size: 0.42 }); l3.position.set(4.2, -3.8, 1); group.add(l3);
  const l4 = sprite(reverse ? 'DNA dissolving in TE' : 'visible white DNA threads', { color: '#ffffff', size: 0.46 }); l4.position.set(0, -2.4, 2); group.add(l4);
  const m4 = new THREE.Matrix4();
  return {
    group, cam: [0, 0, 13],
    caption(pr) {
      const p = reverse ? 1 - clamp01(pr.p) : clamp01(pr.p);
      if (reverse) return pr.p < 0.95 ? 'TE re-hydrates the phosphate backbone; strands repel each other and unwind back into solution. Tris keeps pH 8.0, EDTA blocks nucleases.' : 'DNA dissolved — ready to use as PCR template.';
      if (p < 0.3) return 'DNA is soluble: water molecules shield each negatively charged phosphate.';
      if (p < 0.7) return 'Isopropanol lowers the dielectric constant — Na⁺ ions now neutralise the phosphates and the water shell collapses.';
      return 'Uncharged DNA strands stick together and aggregate into visible white threads.';
    },
    update(t, pr) {
      const p = ease(reverse ? 1 - clamp01(pr.p) : clamp01(pr.p));
      group.rotation.y = Math.sin(t * 0.2) * 0.3;
      strands.forEach((s, i) => {
        s.m.position.copy(s.home).lerp(s.target, p);
        s.m.position.x += Math.sin(t * 0.6 + i) * 0.1 * (1 - p); s.m.position.y += Math.cos(t * 0.5 + i) * 0.1 * (1 - p);
        s.m.rotation.set(s.spin.x * t * 0.2 * (1 - p) + p * 0.5, s.spin.y * t * 0.2 * (1 - p), s.spin.z * t * 0.1);
        s.m.material.color.setRGB(0.29 + p * 0.66, 0.66 + p * 0.3, 1);
        s.m.material.emissiveIntensity = 0.7 - p * 0.4;
      });
      wData.forEach((w, i) => { const pos = w.s.m.position.clone().add(w.off).lerp(w.far, p); pos.x += Math.sin(t * 2 + i) * 0.05; m4.makeTranslation(pos.x, pos.y, pos.z); water.setMatrixAt(i, m4); });
      water.instanceMatrix.needsUpdate = true;
      naData.forEach((n, i) => { const pos = n.far.clone().lerp(n.s.m.position.clone().add(n.off), clamp01(p * 1.4)); pos.y += Math.sin(t + i) * 0.05 * (1 - p); m4.makeTranslation(pos.x, pos.y, pos.z); na.setMatrixAt(i, m4); });
      na.instanceMatrix.needsUpdate = true;
      l4.visible = p > 0.75;
      l3.visible = p < 0.5;
    },
  };
}

// ------------------------------------------------------------ PCR
function pcrScene(intro) {
  const group = new THREE.Group();
  const N = SEQ.length, rise = 0.38, R = 1.0, twist = Math.PI / 5;
  const bbGeo = new THREE.SphereGeometry(0.17, 12, 8);
  const baseGeo = new THREE.BoxGeometry(0.16, 0.1, 0.62);
  const mk = (col, emi = 0) => new THREE.MeshStandardMaterial({ color: col, roughness: 0.35, emissive: col, emissiveIntensity: emi });
  const strandMat = [mk(0x4aa8ff, 0.25), mk(0x3ee6c4, 0.25)];
  const newMat = [mk(0xffb35c, 0.35), mk(0xff7bd5, 0.35)];
  const baseMats = Object.fromEntries(Object.entries(BASE_COL).map(([k, c]) => [k, mk(c, 0.15)]));
  const strands = [0, 1].map((s) => {
    const g = new THREE.Group(); group.add(g);
    const nts = [];
    for (let i = 0; i < N; i++) {
      const b = s === 0 ? SEQ[i] : COMP[SEQ[i]];
      const nt = new THREE.Group();
      const bb = new THREE.Mesh(bbGeo, strandMat[s]); nt.add(bb);
      const base = new THREE.Mesh(baseGeo, baseMats[b]); base.position.z = -0.38; nt.add(base);
      g.add(nt); nts.push({ nt, base, b });
    }
    return { g, nts };
  });
  // new strands (synthesised), primers are their first 7 nucleotides
  const PL = 7;
  const news = [0, 1].map((s) => {
    const g = new THREE.Group(); group.add(g);
    const nts = [];
    for (let i = 0; i < N; i++) {
      const tmplBase = s === 0 ? COMP[SEQ[i]] : SEQ[i];
      const b = COMP[tmplBase];
      const nt = new THREE.Group();
      const isPrimer = s === 0 ? i < PL : i >= N - PL;
      const bb = new THREE.Mesh(bbGeo, isPrimer ? mk(s === 0 ? 0xff9b3d : 0xe45cff, 0.6) : newMat[s]); nt.add(bb);
      const base = new THREE.Mesh(baseGeo, baseMats[b]); base.position.z = -0.38; nt.add(base);
      nt.visible = false; g.add(nt); nts.push({ nt, isPrimer });
    }
    return { g, nts };
  });
  // Taq polymerase blobs
  const taqMat = new THREE.MeshPhysicalMaterial({ color: 0x9d7bff, transparent: true, opacity: 0.55, roughness: 0.3, clearcoat: 1, emissive: 0x2a1460, depthWrite: false });
  const taqs = [0, 1].map(() => { const g = new THREE.Group(); for (let k = 0; k < 5; k++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.55 + k * 0.05, 18, 12), taqMat); m.position.set(Math.cos(k * 1.3) * 0.35, Math.sin(k * 1.7) * 0.3, Math.sin(k) * 0.3); g.add(m); } group.add(g); g.visible = false; return g; });
  // free dNTPs
  const DN = 70, dntp = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.13), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x333333, roughness: 0.4 }), DN);
  const rnd = mulberry(8); const dData = [];
  const cols = Object.values(BASE_COL);
  for (let i = 0; i < DN; i++) { dData.push(new THREE.Vector3((rnd() - 0.5) * 14, (rnd() - 0.5) * 8, (rnd() - 0.5) * 5)); dntp.setColorAt(i, new THREE.Color(cols[i % 4])); }
  group.add(dntp);
  const ends = [sprite("5'", { color: '#79c0ff', size: 0.4, bg: null }), sprite("3'", { color: '#79c0ff', size: 0.4, bg: null }), sprite("3'", { color: '#3ee6c4', size: 0.4, bg: null }), sprite("5'", { color: '#3ee6c4', size: 0.4, bg: null })];
  ends.forEach(e => group.add(e));
  const lF = sprite('forward primer', { color: '#ff9b3d', size: 0.38 }), lR = sprite('reverse primer', { color: '#e45cff', size: 0.38 }), lT = sprite('Taq polymerase', { color: '#b9a2ff', size: 0.38 }), lD = sprite('dNTPs', { color: '#ffffff', size: 0.34 });
  group.add(lF, lR, lT, lD);
  const m4 = new THREE.Matrix4();
  const x0 = -(N - 1) * rise / 2;
  const place = (nt, i, y, ang, flip, tw) => {
    const a = i * twist * tw + ang;
    nt.position.set(x0 + i * rise, y + Math.cos(a) * R * tw, Math.sin(a) * R * tw);
    nt.rotation.set(-a * tw + (flip ? Math.PI : 0), 0, 0);
    if (tw < 0.5) nt.rotation.x = flip ? Math.PI / 2 : -Math.PI / 2;
  };
  let lastState = '';
  return {
    group, cam: [0, 0.4, 15],
    caption(pr) {
      if (intro) return 'Template: the rbcL gene on chloroplast DNA. Forward and reverse primers mark the two ends of the 580 bp target.';
      const ph = pr.phase;
      if (ph === 'denature') return `Denaturation · ${Math.round(pr.temp || 95)} °C — hydrogen bonds between base pairs break; the double helix melts into two single strands.`;
      if (ph === 'anneal') return `Annealing · ${Math.round(pr.temp || 55)} °C — primers find and base-pair with their complementary 3' ends on each template strand.`;
      if (ph === 'extend') return `Extension · ${Math.round(pr.temp || 72)} °C — Taq binds each primer and adds dNTPs 5'→3', copying the template (~1000 nt/min).`;
      if (ph === 'hold') return 'Program finished — the reaction is held at 4 °C.';
      return 'Waiting for the thermocycler to start.';
    },
    update(t, pr) {
      let phase = pr.phase || 'idle', f = clamp01(pr.frac ?? 0);
      if (intro) { phase = 'intro'; }
      if (pr.ramping && phase === 'denature') f = 0;
      // separation & twist
      let sep = 0, tw = 1;
      if (phase === 'denature') { sep = ease(clamp01(f * 1.4)); tw = 1 - sep; }
      else if (phase === 'anneal' || phase === 'extend') { sep = 1; tw = 0; }
      else if (phase === 'hold') { sep = 0; tw = 1; }
      const Y = 1.9 * sep;
      strands[0].nts.forEach((n, i) => place(n.nt, i, Y, 0, false, Math.max(tw, 0.0001)));
      strands[1].nts.forEach((n, i) => place(n.nt, i, -Y, Math.PI, true, Math.max(tw, 0.0001)));
      // primers + extension
      const showNew = phase === 'anneal' || phase === 'extend';
      const ann = phase === 'anneal' ? ease(clamp01(f * 1.3)) : phase === 'extend' ? 1 : 0;
      const ext = phase === 'extend' ? clamp01(f * 1.15) : 0;
      news.forEach((ns, s) => {
        ns.nts.forEach((n, i) => {
          const k = s === 0 ? i : N - 1 - i; // order of synthesis
          let vis = false;
          if (showNew) vis = n.isPrimer || k < PL + ext * (N - PL);
          n.nt.visible = vis;
          if (!vis) return;
          const targetY = s === 0 ? -Y + 0.95 : Y - 0.95;
          const flyY = s === 0 ? -6 : 6;
          const y = n.isPrimer ? flyY + (targetY - flyY) * ann : targetY;
          n.nt.position.set(x0 + i * rise + (n.isPrimer ? (1 - ann) * (s === 0 ? -3 : 3) : 0), y, 0);
          n.nt.rotation.x = s === 0 ? Math.PI / 2 : -Math.PI / 2;
          const appear = n.isPrimer ? 1 : clamp01((PL + ext * (N - PL) - k) * 1.5);
          n.nt.scale.setScalar(appear);
        });
      });
      taqs.forEach((tq, s) => {
        tq.visible = phase === 'extend' && ext < 1;
        const k = PL + ext * (N - PL); const i = s === 0 ? k : N - 1 - k;
        tq.position.set(x0 + i * rise, s === 0 ? -Y + 0.7 : Y - 0.7, 0.2);
        tq.rotation.z = t * 0.6;
      });
      // labels & ends
      const lx = x0 - 0.7, rx = x0 + (N - 1) * rise + 0.7;
      ends[0].position.set(lx, Y + (tw > 0.5 ? 0.2 : 0), 0); ends[1].position.set(rx, Y + (tw > 0.5 ? 0.2 : 0), 0);
      ends[2].position.set(lx, -Y - (tw > 0.5 ? 0.2 : 0), 0); ends[3].position.set(rx, -Y - (tw > 0.5 ? 0.2 : 0), 0);
      lF.visible = showNew || intro; lR.visible = showNew || intro;
      lF.position.set(x0 + 1.2, (showNew ? -Y + 0.95 : -2.6) - 0.75, 1); lR.position.set(x0 + (N - 1) * rise - 1.2, (showNew ? Y - 0.95 : 2.6) + 0.75, 1);
      lT.visible = phase === 'extend' && ext < 1; lT.position.copy(taqs[0].position).add(new THREE.Vector3(0, -1.0, 1));
      lD.position.set(5.5, -3.6, 1);
      if (intro) { news.forEach((ns, s) => ns.nts.forEach((n, i) => { n.nt.visible = n.isPrimer; if (n.isPrimer) { n.nt.position.set(x0 + i * rise, s === 0 ? -3.0 : 3.0, 0); n.nt.scale.setScalar(1); n.nt.rotation.x = s === 0 ? Math.PI / 2 : -Math.PI / 2; } })); }
      dData.forEach((p, i) => {
        const q = p.clone(); q.x += Math.sin(t * 0.7 + i) * 0.4; q.y += Math.cos(t * 0.6 + i * 1.3) * 0.3;
        m4.makeRotationFromEuler(new THREE.Euler(t + i, t * 0.7, 0)); m4.setPosition(q); dntp.setMatrixAt(i, m4);
      });
      dntp.instanceMatrix.needsUpdate = true;
      group.rotation.y = Math.sin(t * 0.25) * 0.18;
      group.rotation.x = 0.12;
      lastState = phase;
      void lastState;
    },
  };
}

// ------------------------------------------------------------ gel migration
function gelScene() {
  const group = new THREE.Group();
  const rnd = mulberry(12);
  const pos = [];
  for (let i = 0; i < 520; i++) {
    const a = new THREE.Vector3((rnd() - 0.5) * 16, (rnd() - 0.5) * 8, (rnd() - 0.5) * 4);
    const d = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize().multiplyScalar(0.8 + rnd() * 1.6);
    pos.push(a.x, a.y, a.z, a.x + d.x, a.y + d.y, a.z + d.z);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const mesh = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xcfd8c0, transparent: true, opacity: 0.32 }));
  group.add(mesh);
  const frags = [];
  const sizes = [{ bp: 100, len: 6, col: 0x7ee787 }, { bp: 580, len: 16, col: 0xffb35c }, { bp: 1500, len: 30, col: 0x79c0ff }];
  sizes.forEach((s, k) => {
    for (let j = 0; j < 4; j++) {
      const pts = []; let p = new THREE.Vector3(0, 0, 0); const r2 = mulberry(k * 10 + j);
      for (let q = 0; q < s.len; q++) { p = p.clone().add(new THREE.Vector3(0.18 + r2() * 0.08, (r2() - 0.5) * 0.25, (r2() - 0.5) * 0.25)); pts.push(p); }
      const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), s.len * 3, 0.07, 6), new THREE.MeshStandardMaterial({ color: s.col, emissive: s.col, emissiveIntensity: 0.5 }));
      m.userData = { speed: 1.85 - 0.5 * Math.log10(s.bp), y: (j - 1.5) * 1.6 + (k - 1) * 0.35, z: (rnd() - 0.5) * 2, ph: rnd() * 6, len: s.len * 0.21 };
      group.add(m); frags.push(m);
    }
  });
  const plateMat = (c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.3 });
  const cath = new THREE.Mesh(new THREE.BoxGeometry(0.25, 8.5, 3), plateMat(0x333333)); cath.position.x = -8.4; group.add(cath);
  const an = new THREE.Mesh(new THREE.BoxGeometry(0.25, 8.5, 3), plateMat(0xc62828)); an.position.x = 8.4; group.add(an);
  const lc = sprite('− cathode (wells)', { color: '#c9d1d9', size: 0.42 }); lc.position.set(-6.4, 4.7, 1); group.add(lc);
  const la = sprite('+ anode', { color: '#ff7b72', size: 0.42 }); la.position.set(7.0, 4.7, 1); group.add(la);
  const l1 = sprite('100 bp', { color: '#7ee787', size: 0.36 }), l2 = sprite('580 bp', { color: '#ffb35c', size: 0.36 }), l3 = sprite('1500 bp', { color: '#79c0ff', size: 0.36 });
  group.add(l1, l2, l3);
  return {
    group, cam: [0, 0, 14.5],
    caption(pr) { return pr.running ? 'Negatively charged DNA snakes through the agarose pores toward the anode. Short fragments slip through quickly; long ones are held back.' : 'Agarose forms a porous mesh. Under an electric field DNA fragments separate by size.'; },
    update(t, pr) {
      const run = pr.running ? 1 : 0.25;
      frags.forEach((m, i) => {
        const u = m.userData;
        const span = 15;
        const x = -7.6 + ((t * u.speed * 0.9 * run + u.ph) % (span / Math.max(0.6, u.speed) * u.speed)) ;
        m.position.set(Math.min(7.5 - u.len, x), u.y + Math.sin(t * 2 + i) * 0.06, u.z);
        m.rotation.x = Math.sin(t * 1.5 + i) * 0.15;
      });
      const pick = (bp) => frags.find(f => Math.abs(f.userData.speed - (1.85 - 0.5 * Math.log10(bp))) < 1e-6);
      l1.position.copy(pick(100).position).add(new THREE.Vector3(0.6, 0.6, 1));
      l2.position.copy(pick(580).position).add(new THREE.Vector3(1.6, 0.6, 1));
      l3.position.copy(pick(1500).position).add(new THREE.Vector3(3.0, 0.6, 1));
      group.rotation.y = Math.sin(t * 0.2) * 0.15;
    },
  };
}
