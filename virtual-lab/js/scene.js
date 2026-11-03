// Builds the laboratory room, places all equipment and registers interactive
// objects, slots (where items can be placed) and vessels (things that hold liquid).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as MD from './models.js';
import { MAT, shadows } from './models.js';
import { floorTexture, benchTexture, wallTexture, posterTexture, labelTexture, panelTexture } from './textures.js';

export const STATIONS = {
  overview: { label: 'Laboratory', pos: [0.1, 1.15, 2.35], target: [-0.1, 0.05, -0.2] },
  ppe: { label: 'Safety', x: -2.05, pos: [-2.0, 0.55, 1.02], target: [-2.02, 0.2, -0.2] },
  s1: { label: 'DNA Extraction', x: -1.35, pos: [-1.35, 0.66, 0.74], target: [-1.35, 0.0, -0.06] },
  s2: { label: 'PCR Setup', x: -0.45, pos: [-0.45, 0.66, 0.74], target: [-0.45, 0.0, -0.06] },
  s3: { label: 'Thermocycler', x: 0.42, pos: [0.42, 0.6, 0.7], target: [0.42, 0.05, -0.08] },
  s4: { label: 'Electrophoresis', x: 1.38, pos: [1.38, 0.66, 0.74], target: [1.38, 0.0, -0.06] },
};
export function stationAt(x) {
  let best = 's1', bd = 1e9;
  for (const [k, s] of Object.entries(STATIONS)) { if (s.x == null) continue; const d = Math.abs(s.x - x); if (d < bd) { bd = d; best = k; } }
  return best;
}

export class World {
  constructor(renderer) {
    this.scene = new THREE.Scene();
    this.objects = {};   // id -> {id, kind, group, station, ...}
    this.slots = {};     // id -> {id, anchor, type, owner, station}
    this.vessels = {};   // id -> {id, kind, liquid, objId, node, mouthY, stock}
    this.hitList = [];
    this.renderer = renderer;
    this.build();
  }

  // ------------------------------------------------------------------ registry
  reg(id, group, opts) {
    const { kind = 'static', station = null, x = 0, z = 0, y = 0, rotY = 0, parent = this.scene, hit = true, pad = 0.006, minSize = 0.03 } = opts;
    group.position.set(x, y, z); group.rotation.y = rotY;
    parent.add(group);
    const o = { id, kind, group, station, ...opts };
    delete o.parent;
    this.objects[id] = o;
    group.userData.objId = id;
    if (hit) this.addHit(o, pad, minSize);
    return o;
  }
  addHit(o, pad, minSize) {
    const g = o.group;
    const saved = { p: g.position.clone(), q: g.quaternion.clone(), parent: g.parent };
    // compute local bounds
    g.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(g.matrixWorld).invert();
    const box = new THREE.Box3(); const tmp = new THREE.Box3();
    g.traverse(c => {
      if (!c.isMesh || c.userData.isHit) return;
      if (!c.geometry.boundingBox) c.geometry.computeBoundingBox();
      tmp.copy(c.geometry.boundingBox).applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, c.matrixWorld));
      box.union(tmp);
    });
    const size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
    size.x = Math.max(size.x + pad, minSize); size.y = Math.max(size.y + pad, minSize * 0.7); size.z = Math.max(size.z + pad, minSize);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.copy(ctr); hit.userData = { isHit: true, objId: o.id };
    g.add(hit); o.hit = hit; this.hitList.push(hit);
    void saved;
  }
  slots_(owner, anchors, type, ids, station) {
    anchors.forEach((a, i) => { const id = ids ? ids[i] : `${owner}#${i}`; if (!id) return; this.slots[id] = { id, anchor: a, type, owner, station, index: i }; });
  }
  vessel(id, o) { this.vessels[id] = { id, ...o }; return this.vessels[id]; }

  // ------------------------------------------------------------------ build
  build() {
    const s = this.scene;
    s.background = new THREE.Color(0xcfd6db);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    s.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    s.environmentIntensity = 0.55;
    s.fog = new THREE.Fog(0xcfd6db, 6, 14);

    const hemi = new THREE.HemisphereLight(0xf4f8ff, 0x55595e, 0.55); s.add(hemi); this.hemi = hemi;
    const key = new THREE.DirectionalLight(0xfff6ea, 2.1);
    key.position.set(-0.6, 2.4, 1.4); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    const sc = key.shadow.camera; sc.left = -0.75; sc.right = 0.75; sc.top = 0.75; sc.bottom = -0.75; sc.near = 0.5; sc.far = 5;
    key.shadow.bias = -0.0004; key.shadow.normalBias = 0.01; key.shadow.radius = 3;
    s.add(key); s.add(key.target); this.key = key;
    const fill = new THREE.DirectionalLight(0xdfeaff, 0.6); fill.position.set(1.5, 1.5, 2); s.add(fill);
    this.buildRoom();
    this.buildPPE();
    this.buildS1();
    this.buildS2();
    this.buildS3();
    this.buildS4();
  }

  focusShadow(x) { this.key.position.set(x - 0.6, 2.4, 1.4); this.key.target.position.set(x, 0, -0.05); }

  buildRoom() {
    const s = this.scene;
    const floorTex = floorTexture();
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 8), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.55 }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, -0.9, 1.5); floor.receiveShadow = true; s.add(floor);
    const wallMat = new THREE.MeshStandardMaterial({ map: wallTexture(), roughness: 0.9, color: 0xeef1f2 });
    const back = new THREE.Mesh(new THREE.PlaneGeometry(10, 3), wallMat); back.position.set(0, 0.6, -0.55); back.receiveShadow = true; s.add(back);
    const left = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), wallMat); left.rotation.y = Math.PI / 2; left.position.set(-3.1, 0.6, 2.2); s.add(left);
    const right = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), wallMat); right.rotation.y = -Math.PI / 2; right.position.set(3.3, 0.6, 2.2); s.add(right);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(10, 8), new THREE.MeshStandardMaterial({ color: 0xf2f4f5, roughness: 1 })); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 1.95, 1.5); s.add(ceil);
    const panelMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let x = -2.4; x <= 2.6; x += 1.2) for (const z of [0.2, 1.6]) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), panelMat); p.rotation.x = Math.PI / 2; p.position.set(x, 1.945, z); s.add(p);
    }
    // skirting + wall tiles behind bench
    const splash = new THREE.Mesh(new THREE.PlaneGeometry(4.3, 0.3), new THREE.MeshStandardMaterial({ color: 0xf5f6f6, roughness: 0.3 })); splash.position.set(-0.22, 0.15, -0.548); s.add(splash);
    // bench
    const benchMat = new THREE.MeshStandardMaterial({ map: benchTexture(), roughness: 0.38, metalness: 0.0 });
    const top = new THREE.Mesh(new RoundedBoxGeometry(4.3, 0.032, 0.84, 2, 0.006), benchMat);
    top.position.set(-0.22, -0.016, -0.06); top.receiveShadow = true; top.castShadow = true; s.add(top); this.benchTop = top;
    const cabMat = new THREE.MeshStandardMaterial({ color: 0xe9ecee, roughness: 0.55 });
    const cab = new THREE.Mesh(new THREE.BoxGeometry(4.24, 0.8, 0.72), cabMat); cab.position.set(-0.22, -0.48, -0.12); cab.receiveShadow = true; s.add(cab);
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(4.24, 0.08, 0.66), MAT.dark); plinth.position.set(-0.22, -0.86, -0.14); s.add(plinth);
    for (let i = 0; i < 8; i++) {
      const x = -2.3 + 0.265 + i * 0.53;
      const door = new THREE.Mesh(new RoundedBoxGeometry(0.515, 0.68, 0.02, 2, 0.004), new THREE.MeshStandardMaterial({ color: 0xf3f5f6, roughness: 0.45 }));
      door.position.set(x, -0.46, 0.245); s.add(door);
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.012, 0.018), MAT.steel); h.position.set(x, -0.18, 0.265); s.add(h);
    }
    // overhead reagent shelf
    const shelfMat = new THREE.MeshStandardMaterial({ color: 0xdfe3e5, roughness: 0.5 });
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.02, 0.24), shelfMat); shelf.position.set(-0.22, 0.62, -0.43); shelf.castShadow = true; s.add(shelf);
    for (const x of [-2.2, -0.22, 1.76]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.18, 0.22), shelfMat); b.position.set(x, 0.53, -0.43); s.add(b); }
    const deco = [
      ['Tris base', '#1f6feb'], ['NaCl', '#2da44e'], ['EDTA', '#8250df'], ['SDS 10%', '#bf3989'], ['Agarose', '#9a6700'],
      ['TAE 50×', '#0969da'], ['Ethanol', '#cf222e'], ['Glycerol', '#57606a'], ['Isopropanol', '#cf222e'], ['Tween-20', '#1a7f37'],
      ['dNTP set', '#6639ba'], ['Loading dye', '#0550ae'],
    ];
    deco.forEach(([t, c], i) => {
      const b = MD.bottle({ label: t, color: c, capColor: new THREE.Color(c).getHex(), scale: 0.55 + (i % 3) * 0.08 });
      b.position.set(-2.05 + i * 0.32 + (i % 2) * 0.05, 0.63, -0.42); b.userData.liquid.set(400000 + (i % 4) * 150000, '#eef4f8');
      s.add(b);
    });
    // power strip on back wall
    const strip = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.05, 0.03), MAT.lightgrey); strip.position.set(-0.22, 0.32, -0.535); s.add(strip);
    for (let i = 0; i < 18; i++) { const o = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.03), MAT.dark); o.position.set(-2.0 + i * 0.21, 0.32, -0.519); s.add(o); }
    // posters
    const posters = [['safety', -2.6, 0.95], ['dogma', 2.0, 0.95], ['gel', 2.55, 0.95]];
    for (const [k, x, y] of posters) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.56), new THREE.MeshStandardMaterial({ map: posterTexture(k), roughness: 0.8 }));
      p.position.set(x, y, -0.545); s.add(p);
    }
    // window on left wall
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.0), new THREE.MeshBasicMaterial({ color: 0xeaf6ff })); win.rotation.y = Math.PI / 2; win.position.set(-3.09, 0.9, 1.4); s.add(win);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.06, 1.66), MAT.lightgrey); frame.position.set(-3.08, 0.9, 1.4); s.add(frame);
    const mull = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.0, 0.03), MAT.lightgrey); mull.position.set(-3.07, 0.9, 1.4); s.add(mull);
    // fume hood
    const hood = new THREE.Group(); hood.position.set(2.55, -0.9, -0.15); s.add(hood);
    const hb = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 0.8), cabMat); hb.position.y = 0.45; hood.add(hb);
    const hw = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.0, 0.04), cabMat); hw.position.set(0, 1.4, -0.38); hood.add(hw);
    for (const sx of [-1, 1]) { const side = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.1, 0.8), cabMat); side.position.set(sx * 0.52, 1.45, 0); hood.add(side); }
    const htop = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.25, 0.8), cabMat); htop.position.set(0, 2.0, 0); hood.add(htop);
    const sash = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.7, 0.01), MAT.glass); sash.position.set(0, 1.55, 0.36); sash.renderOrder = 4; hood.add(sash);
    const hl = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.02), new THREE.MeshBasicMaterial({ color: 0xffffff })); hl.position.set(0, 1.86, 0.2); hl.rotation.x = Math.PI / 2; hood.add(hl);
    const hoodLab = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.06), new THREE.MeshBasicMaterial({ map: panelTexture('FUME HOOD · 0.5 m/s', { bg: '#2a2e33', fg: '#7ee787', size: 0.4, w: 400, h: 80 }) })); hoodLab.position.set(0, 2.0, 0.401); hood.add(hoodLab);
    shadows(hood, true, true);
    const big = MD.largeCentrifuge(); big.position.set(-2.72, -0.9, 0.35); big.rotation.y = 0.5; s.add(big);
    const bigLab = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.04), new THREE.MeshBasicMaterial({ map: panelTexture('BENCHTOP CENTRIFUGE 5810', { bg: '#f1f1ee', fg: '#555', size: 0.42, w: 512, h: 100 }) })); bigLab.position.set(0, 0.22, 0.301); big.add(bigLab);
    // waste bins on floor
    const bio = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.55, 28), new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.6 })); bio.position.set(2.0, -0.62, 0.55); s.add(bio);
    // bench paper under extraction & PCR
    const paperMat = new THREE.MeshStandardMaterial({ color: 0xf7f7f3, roughness: 0.95 });
    for (const x of [-1.35, -0.45]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.3), paperMat); p.rotation.x = -Math.PI / 2; p.position.set(x + 0.06, 0.0008, 0.12); p.receiveShadow = true; s.add(p); }
  }

  buildPPE() {
    const X = STATIONS.ppe.x;
    this.reg('gloves', MD.gloveBox(), { kind: 'ppe', station: 'ppe', x: X - 0.22, z: -0.12, rotY: 0.3 });
    this.reg('goggles', MD.goggles(), { kind: 'ppe', station: 'ppe', x: X + 0.16, z: -0.1, y: 0.012 });
    const hook = new THREE.Group(); hook.position.set(X - 0.05, 0.585, -0.47); hook.scale.setScalar(0.56); this.scene.add(hook);
    this.reg('coat', MD.labCoat(), { kind: 'ppe', station: 'ppe', parent: hook, x: 0, y: 0, z: 0.0 });
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.78, 0.02), new THREE.MeshStandardMaterial({ color: 0x4d5d6c, roughness: 0.7 }));
    board.position.set(X - 0.05, 0.3, -0.54); board.scale.y = 0.7; board.receiveShadow = true; this.scene.add(board);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.12), new THREE.MeshBasicMaterial({ map: panelTexture('PPE REQUIRED BEYOND THIS POINT', { bg: '#0b5cad', fg: '#fff', size: 0.36, w: 640, h: 200 }) }));
    sign.position.set(X + 0.5, 0.7, -0.545); this.scene.add(sign);
  }

  pipettes(standId, x, z, list, station) {
    const st = MD.pipetteStand(list.length);
    this.reg(standId, st, { kind: 'stand', station, x, z, rotY: 0.35 });
    list.forEach(([id, type], i) => {
      const p = MD.pipette(type);
      const anchorSlot = `${standId}#${i}`;
      this.slots[anchorSlot] = { id: anchorSlot, anchor: st.userData.anchors[i], type: 'pipette', owner: standId, station };
      this.reg(id, p, { kind: 'pipette', ptype: type, station, parent: st.userData.anchors[i], x: 0, z: 0, home: anchorSlot, pad: 0.012 });
    });
  }

  tubeItem(id, opts, slot, station, extra = {}) {
    const t = MD.microTube(opts);
    const sl = this.slots[slot];
    this.reg(id, t, { kind: 'item', itemType: 'micro', station, parent: sl.anchor, x: 0, z: 0, pad: 0.008, ...extra });
    this.vessel(id, { kind: 'micro', liquid: t.userData.liquid, objId: id, node: t, mouthY: 0.039, capped: true, ...extra.vessel });
    return t;
  }

  buildS1() {
    const X = STATIONS.s1.x, st = 's1';
    this.pipettes('stand1', X - 0.31, -0.2, [['P1000', 'P1000'], ['P200a', 'P200']], st);
    this.reg('tb1000', MD.tipBox('t1000'), { kind: 'tipbox', tipType: 't1000', station: st, x: X - 0.17, z: -0.03 });
    this.reg('tb200a', MD.tipBox('t200'), { kind: 'tipbox', tipType: 't200', station: st, x: X - 0.17, z: 0.1 });
    const bal = MD.balance();
    this.reg('balance', bal, { kind: 'holder', station: st, x: X - 0.08, z: -0.28 });
    this.slots_('balance', bal.userData.anchors, 'tissue', ['balance-pan'], st);
    const cr = MD.tubeRack(5, 1, { pitch: 0.024, hole: 0.0085, height: 0.05, holeDepth: 0.03, mat: MAT.rackwhite });
    this.reg('conrack1', cr, { kind: 'holder', station: st, x: X + 0.1, z: -0.33, hit: false });
    const reagents = [
      ['st_edwards', 'Edwards Buffer', '#0b5cad', 0x2a62c9, '200 mM Tris · 250 mM NaCl', ['25 mM EDTA · 0.5% SDS'], 'edwards', 10000],
      ['st_iso', 'Isopropanol', '#cf222e', 0xcf222e, '100% · Flammable', ['Keep at room temp.'], 'iso', 10000],
      ['st_etoh', '70% Ethanol', '#bf3989', 0xbf3989, 'Wash solution', ['Flammable'], 'etoh70', 10000],
      ['st_te', 'TE Buffer', '#1a7f37', 0x1a7f37, '10 mM Tris · 1 mM EDTA', ['pH 8.0'], 'te', 8000],
      ['st_water1', 'Water', '#57606a', 0x8c959f, 'Nuclease-free', ['For balance tubes'], 'water', 8000],
    ];
    reagents.forEach(([id, label, color, capColor, sub, lines, rid, vol], i) => {
      const c = MD.conicalTube({ label, color, capColor, sub, lines });
      this.reg(id, c, { kind: 'stock', station: st, parent: cr.userData.anchors[i], x: 0, z: 0, y: 0, pad: 0.01 });
      c.position.y = -0.028;
      this.vessel(id, { kind: 'conical', liquid: c.userData.liquid, objId: id, node: c, mouthY: 0.118, stock: true, init: { [rid]: vol } });
    });
    const mc = MD.microcentrifuge();
    this.reg('centrifuge', mc, { kind: 'instrument', inst: 'cfg', station: st, x: X + 0.26, z: -0.15, rotY: -0.15 });
    this.slots_('centrifuge', mc.userData.anchors, 'micro', mc.userData.anchors.map((_, i) => `cfg#${i}`), st);
    const vx = MD.vortex();
    this.reg('vortex', vx, { kind: 'instrument', inst: 'vortex', station: st, x: X + 0.27, z: 0.13 });
    this.slots_('vortex', vx.userData.anchors, 'micro', ['vortex-cup'], st);
    const rack = MD.tubeRack(5, 2);
    this.reg('rack1', rack, { kind: 'holder', station: st, x: X + 0.05, z: 0.05 });
    this.slots_('rack1', rack.userData.anchors, 'micro', null, st);
    this.tubeItem('A', { capColor: 0xf3f3ef, label: 'A', capLabel: 'A' }, 'rack1#5', st);
    this.tubeItem('B', { capColor: 0xf3f3ef, label: 'B', capLabel: 'B' }, 'rack1#6', st);
    this.tubeItem('BAL', { capColor: 0x9ad0ff, label: 'BAL', capLabel: 'BAL' }, 'rack1#9', st, { vessel: { init: { water: 500 } } });
    const board = MD.cuttingBoard();
    this.reg('board', board, { kind: 'holder', station: st, x: X - 0.2, z: 0.24, hit: false });
    this.slots_('board', board.userData.anchors, 'tissue', ['board-dish', 'board-cut'], st);
    this.reg('berry', MD.strawberry(), { kind: 'berry', station: st, parent: board.userData.anchors[0], x: 0, z: 0, pad: 0.01 });
    this.reg('tissue', MD.tissuePiece(), { kind: 'item', itemType: 'tissue', station: st, parent: board.userData.anchors[1], x: 0, z: 0, minSize: 0.035 });
    const ph = MD.pestleHolder();
    this.reg('pholder', ph, { kind: 'holder', station: st, x: X - 0.02, z: 0.22 });
    this.slots_('pholder', ph.userData.anchors, 'pestle', ['pestle-home'], st);
    this.reg('pestle', MD.micropestle(), { kind: 'item', itemType: 'pestle', station: st, parent: ph.userData.anchors[0], x: 0, z: 0, minSize: 0.03 });
    this.reg('tipwaste1', MD.tipWaste(), { kind: 'tipwaste', station: st, x: X + 0.14, z: 0.27 });
    const bk = MD.beaker({});
    this.reg('liqwaste1', bk, { kind: 'stock', station: st, x: X + 0.3, z: 0.29 });
    this.vessel('liqwaste1', { kind: 'beaker', liquid: bk.userData.liquid, objId: 'liqwaste1', node: bk, mouthY: 0.09, stock: true, waste: true, init: { water: 15000 } });
  }

  buildS2() {
    const X = STATIONS.s2.x, st = 's2';
    this.pipettes('stand2', X - 0.31, -0.2, [['P200', 'P200'], ['P20', 'P20'], ['P2', 'P2']], st);
    this.reg('tb200', MD.tipBox('t200'), { kind: 'tipbox', tipType: 't200', station: st, x: X - 0.17, z: -0.03 });
    this.reg('tb10', MD.tipBox('t10'), { kind: 'tipbox', tipType: 't10', station: st, x: X - 0.17, z: 0.1 });
    const ice = MD.iceBucket();
    this.reg('ice', ice, { kind: 'holder', station: st, x: X + 0.05, z: -0.29, hit: false });
    const stocks = [
      ['s_buffer', 'buffer10x', 0x2f81f7, 'BUF', 1000], ['s_mg', 'mgcl2', 0xffffff, 'Mg', 1000], ['s_dntp', 'dntp', 0x8957e5, 'dNTP', 500], ['s_taq', 'taq', 0xd29922, 'Taq', 100],
      ['s_fwd', 'fwd', 0xf0883e, 'F', 500], ['s_rev', 'rev', 0xdb61a2, 'R', 500], ['s_water', 'water', 0x8c959f, 'H₂O', 1500], ['s_pos', 'posctrl', 0x3fb950, '+C', 200],
    ];
    stocks.forEach(([id, rid, cap, lab, vol], i) => {
      const t = MD.microTube({ capColor: cap, label: lab, capLabel: lab });
      t.userData.cap.rotation.x = -2.0;
      this.reg(id, t, { kind: 'stock', station: st, parent: ice.userData.anchors[i], x: 0, z: 0, pad: 0.012, minSize: 0.034 });
      this.vessel(id, { kind: 'micro', liquid: t.userData.liquid, objId: id, node: t, mouthY: 0.039, stock: true, init: { [rid]: vol } });
    });
    const cb = MD.coldBlock(5);
    this.reg('cold', cb, { kind: 'holder', station: st, x: X + 0.02, z: -0.08 });
    this.slots_('cold', cb.userData.anchors, 'micro', null, st);
    this.tubeItem('MM', { capColor: 0xf3f3ef, label: 'MM', capLabel: 'MM' }, 'cold#0', st);
    const pr = MD.pcrRack();
    this.reg('pcrrack2', pr, { kind: 'holder', station: st, x: X + 0.05, z: 0.13 });
    this.slots_('pcrrack2', pr.userData.anchors, 'strip', ['pcrrack2'], st);
    const strip = MD.pcrStrip({ labels: ['1', '2', '3', '4', '5', '6', '7', '8'] });
    this.reg('strip', strip, { kind: 'item', itemType: 'strip', station: st, parent: pr.userData.anchors[0], x: 0, z: 0, pad: 0.008, minSize: 0.03 });
    strip.userData.tubes.forEach((t, i) => this.vessel(`pcr${i + 1}`, { kind: 'pcr', liquid: strip.userData.liquids[i], objId: 'strip', node: t, mouthY: 0.0205, capped: true, stripIndex: i }));
    const sp = MD.miniSpinner();
    this.reg('spinner', sp, { kind: 'instrument', inst: 'spinner', station: st, x: X + 0.27, z: -0.1 });
    this.slots_('spinner', sp.userData.anchors, 'strip', ['spinner'], st);
    this.reg('tipwaste2', MD.tipWaste(), { kind: 'tipwaste', station: st, x: X + 0.28, z: 0.15 });
  }

  buildS3() {
    const X = STATIONS.s3.x, st = 's3';
    const tc = MD.thermocycler();
    this.reg('cycler', tc, { kind: 'instrument', inst: 'tc', station: st, x: X, z: -0.13 });
    this.slots_('cycler', tc.userData.anchors, 'strip', ['tc-block'], st);
    const pr = MD.pcrRack();
    this.reg('pcrrack3', pr, { kind: 'holder', station: st, x: X + 0.27, z: 0.13 });
    this.slots_('pcrrack3', pr.userData.anchors, 'strip', ['pcrrack3'], st);
    // lab notebook
    const nb = new THREE.Group();
    const cover = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.012, 0.21), new THREE.MeshStandardMaterial({ color: 0x1f3a5f, roughness: 0.7 })); cover.position.y = 0.006; nb.add(cover);
    const page = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.19), new THREE.MeshStandardMaterial({ map: labelTexture({ title: 'Lab Notebook', sub: 'Exp. 07 · rbcL PCR', lines: ['Ta 55 °C · 35 cycles', 'Expected ≈ 580 bp'], color: '#1f3a5f', w: 400, h: 560 }) }));
    page.rotation.x = -Math.PI / 2; page.position.y = 0.0125; nb.add(page);
    nb.position.set(X - 0.27, 0, 0.12); nb.rotation.y = 0.2; shadows(nb); this.scene.add(nb);
    const pen = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.14, 10), MAT.dark); pen.rotation.z = Math.PI / 2; pen.rotation.y = 0.5; pen.position.set(X - 0.16, 0.005, 0.18); pen.castShadow = true; this.scene.add(pen);
  }

  buildS4() {
    const X = STATIONS.s4.x, st = 's4';
    const cs = MD.castingStand();
    this.reg('caststand', cs, { kind: 'holder', station: st, x: X - 0.27, z: 0.14 });
    this.slots_('caststand', cs.userData.anchors, 'tray', ['caststand'], st);
    const tray = MD.castingTray();
    this.reg('tray', tray, { kind: 'item', itemType: 'tray', station: st, parent: cs.userData.anchors[0], x: 0, z: 0, pad: 0.01 });
    this.slots_('tray', tray.userData.anchors, 'comb', ['comb-back', 'comb-front'], st);
    tray.userData.wells.forEach((w, i) => this.vessel(`well${i + 1}`, { kind: 'well', objId: 'tray', node: w, mouthY: 0, well: i }));
    const combSpot = new THREE.Group(); combSpot.position.set(X - 0.27, 0, 0.28); this.scene.add(combSpot);
    this.slots['comb-home'] = { id: 'comb-home', anchor: combSpot, type: 'comb', owner: 'bench', station: st };
    this.reg('comb', MD.comb(), { kind: 'item', itemType: 'comb', station: st, parent: combSpot, x: 0, z: 0, minSize: 0.035 });
    const fl = MD.flask({ label: 'Agarose 1.5%' });
    const flaskSpot = new THREE.Group(); flaskSpot.position.set(X - 0.3, 0, -0.14); this.scene.add(flaskSpot);
    this.slots['flask-home'] = { id: 'flask-home', anchor: flaskSpot, type: 'flask', owner: 'bench', station: st };
    this.reg('flask', fl, { kind: 'item', itemType: 'flask', station: st, parent: flaskSpot, x: 0, z: 0 });
    this.vessel('flask', { kind: 'flask', liquid: fl.userData.liquid, objId: 'flask', node: fl, mouthY: 0.15, stock: true, init: { agarose: 60000 } });
    const tb = MD.bottle({ label: '1× TAE', color: '#0969da', sub: 'Running buffer', lines: ['40 mM Tris-acetate', '1 mM EDTA'] });
    const taeSpot = new THREE.Group(); taeSpot.position.set(X - 0.13, 0, -0.31); this.scene.add(taeSpot);
    this.slots['tae-home'] = { id: 'tae-home', anchor: taeSpot, type: 'bottle', owner: 'bench', station: st };
    this.reg('taebottle', tb, { kind: 'item', itemType: 'bottle', station: st, parent: taeSpot, x: 0, z: 0 });
    this.vessel('taebottle', { kind: 'bottle', liquid: tb.userData.liquid, objId: 'taebottle', node: tb, mouthY: 0.22, stock: true, init: { tae: 800000 } });
    const ch = MD.gelChamber();
    this.reg('chamber', ch, { kind: 'instrument', inst: 'chamber', station: st, x: X + 0.02, z: 0.06 });
    this.slots_('chamber', ch.userData.anchors, 'tray', ['chamber'], st);
    const ps = MD.powerSupply();
    this.reg('power', ps, { kind: 'instrument', inst: 'ps', station: st, x: X + 0.06, z: -0.29 });
    const tr = MD.transilluminator();
    this.reg('trans', tr, { kind: 'instrument', inst: 'trans', station: st, x: X + 0.27, z: -0.13 });
    this.slots_('trans', tr.userData.anchors, 'tray', ['trans'], st);
    this.pipettes('stand4', X - 0.11, -0.13, [['P20g', 'P20']], st);
    this.reg('tb200g', MD.tipBox('t200'), { kind: 'tipbox', tipType: 't200', station: st, x: X - 0.1, z: 0.3 });
    const r4 = MD.tubeRack(3, 1, { mat: MAT.rackwhite });
    this.reg('rack4', r4, { kind: 'holder', station: st, x: X + 0.17, z: 0.14 });
    this.slots_('rack4', r4.userData.anchors, 'micro', null, st);
    this.tubeItem('DYE', { capColor: 0x3b45c9, label: 'DYE', capLabel: '6×' }, 'rack4#0', st, { vessel: { init: { dye6x: 500 } } });
    this.tubeItem('LAD', { capColor: 0x6e40c9, label: 'LAD', capLabel: 'L' }, 'rack4#2', st, { vessel: { init: { ladder: 100 }, ladder: true } });
    const pr = MD.pcrRack();
    this.reg('pcrrack4', pr, { kind: 'holder', station: st, x: X + 0.29, z: 0.22 });
    this.slots_('pcrrack4', pr.userData.anchors, 'strip', ['pcrrack4'], st);
    this.reg('tipwaste4', MD.tipWaste(), { kind: 'tipwaste', station: st, x: X + 0.36, z: 0.06 });
  }

  // ------------------------------------------------------------------ helpers
  worldPos(obj, out = new THREE.Vector3()) { obj.updateMatrixWorld(true); return obj.getWorldPosition(out); }
  stationOfObj(id) { return this.objects[id]?.station; }
}
