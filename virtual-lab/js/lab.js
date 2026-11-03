// Laboratory state + every physical action the user can perform.
// The state (this.S) is plain JSON so it can be snapshotted for undo; the 3D
// scene is synchronised from it every frame.
import * as THREE from 'three';
import { REAGENTS, PROTOCOL, PIPETTES, TIPS, LADDER_100, capacity, fmtTime } from './data.js';
import { tipMesh } from './models.js';
import { sumLiq, simulatePCR, mobility, STANDARD_RUN } from './sim.js';
import { STATIONS } from './scene.js';
import { sfx } from './audio.js';

const UP = new THREE.Vector3(0, 1, 0);
const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3(), tmpQ = new THREE.Quaternion();
const clone = (o) => JSON.parse(JSON.stringify(o));
const isMicro = (id) => ['A', 'B', 'BAL', 'MM', 'DYE', 'LAD'].includes(id);

export class Lab {
  constructor(world, bus) {
    this.w = world; this.bus = bus;
    this.anchorToSlot = new Map();
    for (const s of Object.values(world.slots)) this.anchorToSlot.set(s.anchor, s.id);
    this.S = this.initialState();
    this.undo = [];
    this.holdPoint = new THREE.Vector3(STATIONS.s1.x, 0.14, 0.05);
    this.station = 'overview';
    this.tipObjs = {};
    this.anims = [];
    this.selected = null;
    this.engine = null; // set by main
    this.pourActive = false;
    this.grindPhase = 0;
    this.vortexing = false;
    this.version = 0;
    this.syncAll(true);
  }

  initialState() {
    const S = {
      t: 0, ppe: { coat: false, gloves: false, goggles: false },
      items: {}, vessels: {}, pip: {}, tipUsed: {}, held: null,
      cutDone: false, tissueMg: 0,
      inst: {
        cfg: { lid: false, g: 13000, sec: 60, running: false, remain: 0, runs: 0 },
        spinner: { lid: false, running: false, remain: 0 },
        tc: { lid: false, running: false, done: false, t: 0, program: defaultCyclerProgram(), lidT: 25, temp: 25 },
        ps: { v: 100, min: 35, on: false, elapsed: 0, leads: 'none' },
        trans: { on: false, shield: false },
        chamberLid: false,
      },
      gel: { poured: 0, pouredAt: null, solid: 0, wells: null, combOut: false, buffer: 0, runVmin: 0, polarity: 0, ran: false, damaged: false },
      pcr: { ran: false, results: {} },
      flags: {}, log: [], counters: { inversions: 0 },
      calc: { opened: false }, verified: false,
    };
    for (const o of Object.values(this.w.objects)) {
      if (o.kind === 'item') S.items[o.id] = { loc: this.anchorToSlot.get(o.group.parent) || null, rot: 0, hidden: o.id === 'tissue' };
      if (o.kind === 'pipette') S.pip[o.id] = { type: o.ptype, loc: 'stand', vol: PIPETTES[o.ptype].max, tip: null, plunger: 0, primed: 0, at: null, dispensedHere: false, bubbled: false };
      if (o.kind === 'tipbox') S.tipUsed[o.id] = 0;
    }
    for (const v of Object.values(this.w.vessels)) {
      S.vessels[v.id] = { liq: { ...(v.init || {}) }, sol: {}, pel: {}, cap: v.capped ? true : null, mixed: true, tissue: null, contam: false };
    }
    S.vessels.LAD.sol = {};
    return S;
  }

  // ---------------------------------------------------------------- utilities
  get held() { return this.S.held; }
  V(id) { return this.S.vessels[id]; }
  vol(id) { return sumLiq(this.V(id).liq); }
  emit(type, data = {}) {
    const ev = { type, t: this.S.t, ...data };
    this.S.log.push(ev); if (this.S.log.length > 400) this.S.log.shift();
    this.version++;
    this.bus.emit('lab', ev);
  }
  toast(msg, kind = 'info') { this.bus.emit('toast', { msg, kind }); }
  snapshot(label) {
    this.undo.push({ label, S: JSON.stringify(this.S) });
    if (this.undo.length > 40) this.undo.shift();
  }
  restore() {
    const u = this.undo.pop(); if (!u) return false;
    this.S = JSON.parse(u.S);
    this.pourActive = false; this.vortexing = false;
    this.syncAll(true);
    this.version++;
    this.bus.emit('lab', { type: 'undo', label: u.label });
    return true;
  }
  mistake(def) { return this.engine ? this.engine.mistake(def) : null; }
  check(kind, ctx) { return this.engine ? this.engine.check(kind, ctx) : null; }
  colorOf(liq, sol = {}) {
    const total = sumLiq(liq);
    if (total <= 0) return '#dfe9f7';
    const c = new THREE.Color(0, 0, 0), t = new THREE.Color();
    for (const [k, v] of Object.entries(liq)) { t.set(REAGENTS[k]?.color || '#dde'); c.r += t.r * v / total; c.g += t.g * v / total; c.b += t.b * v / total; }
    if (sol.debris > 0.2) c.lerp(new THREE.Color('#b0303f'), Math.min(0.4, sol.debris / 20));
    if (sol.gppt > 100) c.lerp(new THREE.Color('#ffffff'), 0.25);
    return '#' + c.getHexString();
  }
  // proportional removal of `amount` µL (plus suspended solutes) from a vessel
  take(vs, amount) {
    const total = sumLiq(vs.liq); const f = total > 0 ? Math.min(1, amount / total) : 0;
    const liq = {}, sol = {};
    for (const [k, v] of Object.entries(vs.liq)) { liq[k] = v * f; vs.liq[k] = v - v * f; if (vs.liq[k] < 1e-6) delete vs.liq[k]; }
    for (const [k, v] of Object.entries(vs.sol)) { sol[k] = v * f; vs.sol[k] = v - v * f; if (vs.sol[k] < 1e-9) delete vs.sol[k]; }
    return { liq, sol };
  }
  put(vs, part) {
    for (const [k, v] of Object.entries(part.liq)) vs.liq[k] = (vs.liq[k] || 0) + v;
    for (const [k, v] of Object.entries(part.sol)) vs.sol[k] = (vs.sol[k] || 0) + v;
  }
  massOf(id) {
    const vs = this.V(id); let m = 0.95; // empty 1.5 mL tube ≈ 0.95 g
    for (const [k, v] of Object.entries(vs.liq)) m += v / 1000 * (REAGENTS[k]?.density || 1);
    if (vs.tissue) m += vs.tissue.mg / 1000 * (1 - vs.tissue.lysed * 0.85);
    return m;
  }
  vesselLabel(id) {
    const map = { A: 'Tube A', B: 'Tube B', BAL: 'Balance tube', MM: 'Master-mix tube', DYE: '6× loading dye', LAD: 'DNA ladder', liqwaste1: 'liquid waste', flask: 'agarose flask', taebottle: 'TAE bottle' };
    if (map[id]) return map[id];
    if (id.startsWith('pcr')) return `PCR tube ${id.slice(3)}`;
    if (id.startsWith('well')) return `well ${id.slice(4)}`;
    const rid = Object.keys(this.w.vessels[id]?.init || {})[0];
    return REAGENTS[rid]?.short || id;
  }
  mainReagent(liq) { let best = null, bv = 0; for (const [k, v] of Object.entries(liq)) if (v > bv) { bv = v; best = k; } return best; }

  // ---------------------------------------------------------------- PPE
  wear(id) {
    const map = { coat: 'coat', gloves: 'gloves', goggles: 'goggles' };
    if (!map[id] || this.S.ppe[id]) return;
    this.snapshot('wear');
    this.S.ppe[id] = true; sfx.cloth();
    this.toast({ coat: 'Lab coat on', gloves: 'Nitrile gloves on', goggles: 'Safety goggles on' }[id], 'ok');
    this.emit('wear', { item: id });
  }
  ppeOk() { const p = this.S.ppe; return p.coat && p.gloves && p.goggles; }

  // ---------------------------------------------------------------- tapping
  tap(objId, point) {
    const o = this.w.objects[objId]; if (!o) return;
    const h = this.S.held;
    if (!this.ppeOk() && o.kind !== 'ppe') {
      this.mistake({ id: 'no-ppe', title: 'Personal protective equipment first', block: true,
        what: 'You touched laboratory equipment without your lab coat, gloves and goggles.',
        why: 'Gloves protect you from SDS, isopropanol and DNA stains — and protect your samples from the nucleases and DNA on your skin. Goggles protect against splashes when vortexing or opening tubes.',
        fix: 'Go to the Safety station and put on all three items.' });
      return;
    }
    if (o.kind === 'ppe') return this.wear(objId);
    if (h?.kind === 'pip') return this.pipetteTap(o, point);
    if (h?.kind === 'item') return this.itemTap(o, point);
    return this.emptyTap(o, point);
  }

  emptyTap(o, point) {
    switch (o.kind) {
      case 'pipette': return this.pickPipette(o.id);
      case 'item': this.select(o.id); return;
      case 'berry': this.select('berry'); return;
      case 'instrument': this.bus.emit('panel', { inst: o.inst }); sfx.tap(); return;
      case 'tipbox': this.toast('Pick up a pipette first, then tap the tip box to attach a tip.'); return;
      case 'stock': this.toast(`${this.vesselLabel(o.id)} — pick up a pipette to draw from it.`); return;
      default: this.select(null);
    }
  }
  select(id) {
    this.selected = id; this.version++;
    if (id) sfx.tap();
    this.bus.emit('select', { id });
  }

  // ---------------------------------------------------------------- pipettes
  pickPipette(id) {
    const h = this.S.held;
    if (h?.kind === 'pip' && h.id === id) return;
    if (h) {
      if (h.kind === 'pip') { if (!this.returnPipette(true)) return; }
      else { if (!this.putBack(true)) return; }
    }
    this.snapshot('pick pipette');
    this.S.pip[id].loc = 'held'; this.S.held = { kind: 'pip', id };
    this.selected = null;
    this.holdPoint.set(STATIONS[this.station]?.x ?? 0, 0.13, 0.08);
    sfx.pick();
    this.emit('pickPipette', { id, ptype: this.S.pip[id].type });
  }
  returnPipette(silent) {
    const id = this.S.held?.id; const p = this.S.pip[id]; if (!p) return false;
    if (p.tip) {
      this.mistake({ id: 'store-with-tip', title: 'Eject the tip before storing the pipette', block: true,
        what: 'You tried to hang the pipette on its stand with a used tip still attached.',
        why: 'Liquid left in the tip can run back into the pipette shaft when it is stored, corroding the piston and contaminating every later sample with this reagent.',
        fix: 'Tap the tip-waste bin (or press "Eject tip"), then return the pipette.' });
      return false;
    }
    this.snapshot('return pipette');
    p.loc = 'stand'; p.at = null; p.plunger = 0; this.S.held = null;
    sfx.place();
    this.emit('returnPipette', { id });
    return true;
  }
  pipetteTap(o, point) {
    const id = this.S.held.id, p = this.S.pip[id];
    if (o.kind === 'tipbox') return this.attachTip(o.id);
    if (o.kind === 'tipwaste') return this.ejectTip(o.id);
    if (o.kind === 'stand') { if (o.id === this.w.objects[id].home.split('#')[0]) return this.returnPipette(); this.toast('That stand belongs to another set of pipettes.'); return; }
    if (o.kind === 'pipette') return this.pickPipette(o.id);
    const vid = this.resolveVessel(o, point);
    if (vid) return this.moveTo(vid);
    if (o.kind === 'instrument') { this.bus.emit('panel', { inst: o.inst }); return; }
    if (p.at) this.withdraw();
  }
  resolveVessel(o, point) {
    if (o.id === 'strip') {
      const local = o.group.worldToLocal(point.clone());
      const i = Math.max(0, Math.min(7, Math.round(local.x / 0.009 + 3.5)));
      return `pcr${i + 1}`;
    }
    if (o.id === 'tray') {
      if (!this.S.gel.wells || !this.S.gel.combOut) return null;
      let best = null, bd = 1e9;
      for (let i = 1; i <= 8; i++) { const n = this.w.vessels[`well${i}`].node; const d = this.w.worldPos(n, tmpV).distanceTo(point); if (d < bd) { bd = d; best = `well${i}`; } }
      return best;
    }
    if (this.w.vessels[o.id]) return o.id;
    return null;
  }
  setVolume(v) {
    const id = this.S.held?.id; const p = this.S.pip[id]; if (!p) return;
    const spec = PIPETTES[p.type];
    if (v > spec.max + 1e-9 || v < spec.min - 1e-9) {
      this.toast(`${spec.label} range is ${spec.min}–${spec.max} µL. Turning beyond the stop damages the mechanism — use a different pipette.`, 'warn');
      v = Math.min(spec.max, Math.max(spec.min, v));
    }
    p.vol = Math.round(v / spec.step) * spec.step;
    p.vol = +p.vol.toFixed(spec.decimals);
    sfx.click(0.25);
    this.version++;
    this.bus.emit('lab', { type: 'setVolume', id, vol: p.vol });
  }
  attachTip(boxId) {
    const id = this.S.held.id, p = this.S.pip[id]; const box = this.w.objects[boxId];
    if (p.tip) { this.toast('A tip is already attached. Eject it into the tip waste before taking a new one.', 'warn'); return; }
    if (!PIPETTES[p.type].tips.includes(box.tipType)) {
      this.mistake({ id: 'wrong-tip', title: 'Tip does not fit this pipette', block: true,
        what: `${TIPS[box.tipType].label}s do not seal on a ${p.type} shaft.`,
        why: 'Each pipette is calibrated with its own tip size. A poorly sealed tip leaks air, so the pipette aspirates less than the set volume and drips while you move it.',
        fix: `Use ${PIPETTES[p.type].tips.map(t => TIPS[t].label + 's').join(' or ')}.` });
      return;
    }
    this.snapshot('tip');
    const used = this.S.tipUsed[boxId];
    if (used >= 96) { this.toast('This box is empty.'); return; }
    this.S.tipUsed[boxId] = used + 1;
    p.tip = { type: box.tipType, liq: {}, sol: {}, contacts: [], residue: null, used: false };
    p.at = null;
    this.tipDip(boxId);
    sfx.tip();
    this.emit('attachTip', { id, box: boxId, tipType: box.tipType });
  }
  tipDip(boxId) {
    const box = this.w.objects[boxId].group;
    const pos = box.userData.positions[this.S.tipUsed[boxId] - 1];
    const target = box.localToWorld(pos.clone());
    this.dipTarget = { p: target, t: 0 };
  }
  ejectTip(wasteId) {
    const id = this.S.held.id, p = this.S.pip[id];
    if (!p.tip) { this.toast('No tip on the pipette.'); return; }
    this.snapshot('eject');
    const hadLiquid = sumLiq(p.tip.liq) > Math.max(0.2, p.vol * 0.05);
    p.tip = null; p.at = null; p.plunger = 0; p.primed = 0;
    sfx.eject();
    this.emit('ejectTip', { id, waste: wasteId, hadLiquid });
    if (hadLiquid) this.toast('Tip discarded with liquid still inside — that volume is lost.', 'warn');
  }
  ejectAuto() {
    const st = this.station;
    const waste = Object.values(this.w.objects).find(o => o.kind === 'tipwaste' && o.station === st) || Object.values(this.w.objects).find(o => o.kind === 'tipwaste');
    this.ejectTip(waste.id);
  }
  moveTo(vid) {
    const id = this.S.held.id, p = this.S.pip[id];
    const vs = this.V(vid), vdef = this.w.vessels[vid];
    if (vs.cap === true) { this.toast(`${this.vesselLabel(vid)} is closed. Open the cap first.`, 'warn'); this.select(vdef.objId); return; }
    if (vdef.objId && this.S.items[vdef.objId]?.loc === 'held') { this.toast('Put the tube in a rack before pipetting into it.'); return; }
    if (!p.tip) {
      this.mistake({ id: 'no-tip', title: 'No tip on the pipette', block: true,
        what: `You tried to put the bare ${p.type} shaft into ${this.vesselLabel(vid)}.`,
        why: 'The shaft is not sterile and is not designed to hold liquid. Liquid entering the shaft contaminates the pipette and every future sample, and cross-contaminates the reagent stock.',
        fix: 'Tap a matching tip box to attach a fresh tip first.' });
      return;
    }
    const tipVol = sumLiq(p.tip.liq);
    // cross-contamination check: tip touched other liquid and is now entering a different vessel with liquid
    const foreign = p.tip.contacts.filter(c => c !== vid);
    if (foreign.length && this.vol(vid) > 0.01 && tipVol < 0.01) {
      const m = this.check('reuse-tip', { vid, foreign, pip: id });
      const def = m || { id: 'reuse-tip', title: 'Used tip entering another reagent',
        what: `This tip has already touched ${foreign.map(f => this.vesselLabel(f)).join(', ')}. You are putting it into ${this.vesselLabel(vid)}.`,
        why: 'Traces of the previous liquid (and any DNA in it) cling to the outside and inside of the tip. Carrying them into another tube contaminates that stock. In PCR even a few molecules of carried-over DNA are amplified into a false-positive band.',
        fix: 'Eject the tip and take a fresh one for every new reagent or sample.', undoable: true };
      this.snapshot('move');
      p.at = vid; this.contaminate(p, vid);
      this.emit('moveTo', { id, vid });
      this.mistake(def);
      return;
    }
    this.snapshot('move');
    p.at = vid; p.enteredEmpty = this.vol(vid) < 0.01;
    if (p.plunger > 0 && this.vol(vid) > 0.01 && tipVol < 0.01 && p.primed === 0) p.bubbled = true;
    this.contaminate(p, vid);
    sfx.whoosh(0.2);
    this.emit('moveTo', { id, vid });
  }
  contaminate(p, vid) {
    const vs = this.V(vid);
    if (this.vol(vid) < 0.01 || vid.startsWith('well')) return;
    if (sumLiq(p.tip.liq) < 0.01 && p.tip.residue && sumLiq(p.tip.residue.liq) > 0) {
      const foreignResidue = p.tip.contacts.some(c => c !== vid);
      if (foreignResidue) { this.put(vs, p.tip.residue); vs.contam = true; }
    }
    if (!p.tip.contacts.includes(vid)) p.tip.contacts.push(vid);
  }
  withdraw() {
    const id = this.S.held?.id, p = this.S.pip[id]; if (!p || !p.at) return;
    p.at = null; p.dispensedHere = false;
    sfx.whoosh(0.15);
    this.version++;
    this.emit('withdraw', { id });
  }

  // Plunger: 0 rest, 1 first stop, 2 second stop (blow-out).
  setPlunger(level) {
    const id = this.S.held?.id, p = this.S.pip[id]; if (!p) return;
    const old = p.plunger; if (level === old) return;
    if (!p.tip) { p.plunger = level; sfx.click(0.3); this.version++; return; }
    const tipVol = sumLiq(p.tip.liq);
    const vid = p.at; const vs = vid ? this.V(vid) : null;
    const inLiquid = vid ? (this.vol(vid) > 0.3 || vid.startsWith('well')) : false;
    if (level > old) {
      if (tipVol > 0.001) {
        if (!vid) {
          this.snapshot('spill');
          p.tip.liq = {}; p.tip.sol = {}; p.plunger = level;
          this.mistake({ id: 'dispense-air', title: 'Liquid dispensed onto the bench', undoable: true,
            what: 'You pressed the plunger while the tip was not inside any tube.',
            why: 'The measured volume was squirted onto the bench. In a real experiment this loses reagent and can contaminate the workspace with DNA or SDS.',
            fix: 'Tap the destination tube first so the tip is inside it, then press the plunger.' });
          return;
        }
        if (old < 1 && level >= 1) this.dispense(vid, level === 2 ? 1 : 0.985);
        else if (level === 2 && old === 1) this.dispense(vid, 1);
        if (level === 2 && vid.startsWith('well')) this.toast('Avoid the second stop when loading wells — the air bubble can push the sample out of the well.', 'warn');
        p.dispensedHere = true;
      } else {
        if (inLiquid && !p.dispensedHere) { p.bubbled = true; sfx.bubble(); this.toast('Air bubbles! Press the plunger to the first stop BEFORE the tip enters the liquid.', 'warn'); }
        if (!inLiquid || p.dispensedHere) p.primed = level;
      }
      p.plunger = level; sfx.click(0.35);
    } else {
      // releasing
      if (level === 0 && old >= 1) {
        if (p.dispensedHere && inLiquid && vid && !vid.startsWith('well') && this.vol(vid) > 0.3) {
          this.snapshot('re-aspirate');
          const back = Math.min(this.vol(vid), p.vol * 0.9);
          const part = this.take(vs, back); this.put(p.tip, part);
          p.plunger = 0; p.dispensedHere = false;
          this.mistake({ id: 're-aspirate', title: 'Liquid sucked back into the tip', undoable: true,
            what: `You released the plunger while the tip was still in ${this.vesselLabel(vid)}.`,
            why: 'Releasing the plunger aspirates. Most of what you just dispensed was drawn back up, so the tube now holds the wrong volume — and the tip is contaminated with the mixture.',
            fix: 'After dispensing, keep the plunger pressed, lift the tip out ("Lift tip"), and only then release the plunger.' });
          this.emit('reaspirate', { id, vid });
          return;
        }
        if (vid && inLiquid && tipVol < 0.001 && !p.dispensedHere) {
          this.aspirate(vid, p.primed === 2 ? 1.12 : (p.primed === 1 ? 1 : 0), p.primed);
        } else if (vid && !inLiquid && tipVol < 0.001 && p.primed) {
          this.toast(`The tip is not touching liquid in ${this.vesselLabel(vid)} — you only drew up air.`, 'warn');
        }
        p.primed = 0; p.dispensedHere = false; p.bubbled = false;
      }
      p.plunger = level; sfx.click(0.25);
    }
    this.version++;
  }
  aspirate(vid, factor, primed) {
    const id = this.S.held.id, p = this.S.pip[id], vs = this.V(vid);
    if (factor === 0) { this.toast('Press the plunger to the first stop before immersing the tip, then release to aspirate.', 'warn'); return; }
    const want = p.vol * factor * (p.bubbled ? 0.85 : 1);
    const avail = this.vol(vid);
    const reagent = this.mainReagent(vs.liq);
    const m = this.check('aspirate', { vid, pip: id, ptype: p.type, vol: p.vol, reagent, primed });
    if (m && m.block) { this.mistake(m); return; }
    this.snapshot('aspirate');
    let got = Math.min(want, Math.max(0, avail - (this.w.vessels[vid].stock ? 0 : 0)));
    // pellet disturbance: drawing down past ~25 µL above a pellet
    const pelletMass = (vs.pel.debris || 0) + (vs.pel.gdna || 0) / 1000;
    let disturbed = false;
    if (pelletMass > 0 && avail - got < 25 && !vs.waste) {
      disturbed = true;
      if (vs.pel.debris) { vs.sol.debris = (vs.sol.debris || 0) + vs.pel.debris * 0.4; vs.pel.debris *= 0.6; }
      if (vs.pel.gdna) { vs.sol.gppt = (vs.sol.gppt || 0) + vs.pel.gdna * 0.5; vs.pel.gdna *= 0.5; }
    }
    if (vs.tissue && vs.tissue.mg * (1 - vs.tissue.lysed) > 10) disturbed = true;
    const part = this.take(vs, got);
    this.put(p.tip, part);
    p.tip.used = true;
    p.tip.residue = { liq: Object.fromEntries(Object.entries(part.liq).map(([k, v]) => [k, v * 0.005])), sol: Object.fromEntries(Object.entries(part.sol).map(([k, v]) => [k, v * 0.005])) };
    if (!p.tip.contacts.includes(vid)) p.tip.contacts.push(vid);
    sfx.aspirate();
    this.emit('aspirate', { id, vid, vol: got, set: p.vol, reagent, air: got < want - 0.01, primed, ptype: p.type });
    if (got < want - 0.01) this.toast(`Only ${got.toFixed(1)} µL available — the tip drew up air.`, 'warn');
    if (primed === 2) {
      this.mistake(m || { id: 'second-stop-aspirate', title: 'Over-aspiration (second stop)', undoable: true,
        what: 'You pressed the plunger to the SECOND stop before aspirating.',
        why: `The second stop is only for blowing out. Starting from it draws up about 10–15% more than set (${(p.vol * 1.12).toFixed(p.vol < 10 ? 2 : 0)} µL instead of ${p.vol} µL), so every concentration in the tube will be off.`,
        fix: 'Undo, then press only to the FIRST stop, immerse the tip, and release slowly.' });
    } else if (disturbed) {
      this.mistake({ id: 'pellet-disturbed', title: 'Pellet disturbed', undoable: true,
        what: 'The tip went too close to the pellet and drew up particulate material.',
        why: 'The pellet contains insoluble cell debris (or your DNA). Carrying debris forward adds polysaccharides and proteins that inhibit Taq polymerase; aspirating a DNA pellet throws your DNA away.',
        fix: 'Keep the tip against the wall opposite the pellet and leave ~20 µL behind.' });
    } else if (m) this.mistake(m);
  }
  dispense(vid, frac) {
    const id = this.S.held.id, p = this.S.pip[id], vs = this.V(vid);
    const tipVol = sumLiq(p.tip.liq);
    const reagent = this.mainReagent(p.tip.liq);
    const m = this.check('dispense', { vid, pip: id, reagent, vol: tipVol * frac, source: p.tip.contacts[0] });
    if (m && m.block) { this.mistake(m); return; }
    this.snapshot('dispense');
    const amount = tipVol * frac;
    const before = this.vol(vid);
    const part = this.take(p.tip, amount);
    this.put(vs, part);
    if (vid.startsWith('well')) {
      const cap = 15;
      if (this.vol(vid) > cap) { this.toast('Well overflowing — sample is floating out into the buffer.', 'warn'); vs.overflow = true; }
      if (this.S.gel.buffer < 200) vs.dry = true;
    }
    if (before > 0.01 && !vs.waste && !p.enteredEmpty) { if (!p.tip.contacts.includes(vid)) p.tip.contacts.push(vid); }
    vs.mixed = before < 0.01 && Object.keys(vs.liq).length <= 1;
    this.process(vid);
    sfx.dispense();
    this.emit('dispense', { id, vid, vol: amount, reagent, from: p.tip.contacts[0], composition: part.liq, frac });
    if (m) this.mistake(m);
  }
  // Assisted mode: perform the correct plunger sequence automatically.
  assist(action) {
    const id = this.S.held?.id, p = this.S.pip[id]; if (!p) return;
    if (action === 'aspirate') {
      if (!p.at) { this.toast('Tap the source tube first so the tip is inside the liquid.'); return; }
      const v = p.at; p.at = null; this.setPlunger(1); p.at = v; this.setPlunger(0);
    } else if (action === 'dispense') {
      if (!p.at) { this.toast('Tap the destination first.'); return; }
      if (p.at.startsWith('well')) this.setPlunger(1); else this.setPlunger(2);
      this.withdraw(); this.setPlunger(0);
    } else if (action === 'mix') this.pipetteMix();
  }
  pipetteMix() {
    const id = this.S.held?.id, p = this.S.pip[id]; if (!p?.at || !p.tip) return;
    const vs = this.V(p.at);
    if (sumLiq(p.tip.liq) > 0.01) { this.toast('Dispense first, then mix by pipetting up and down.'); return; }
    if (this.vol(p.at) < 1) return;
    this.snapshot('mix');
    vs.mixed = true; this.dissolve(p.at, 0.6);
    if (!p.tip.contacts.includes(p.at)) p.tip.contacts.push(p.at);
    p.tip.residue = { liq: Object.fromEntries(Object.entries(vs.liq).map(([k, v]) => [k, v * 0.0005])), sol: Object.fromEntries(Object.entries(vs.sol).map(([k, v]) => [k, v * 0.0005])) };
    this.mixAnim = { t: 0 };
    sfx.squish();
    this.emit('mix', { vid: p.at, how: 'pipette' });
  }

  // ---------------------------------------------------------------- items
  pickItem(id) {
    const it = this.S.items[id]; if (!it) return;
    const h = this.S.held;
    if (h) {
      if (h.kind === 'item' && h.id === id) return;
      if (h.kind === 'pip') { if (this.S.pip[h.id].tip) { this.toast('Eject the tip and put the pipette down first.', 'warn'); return; } this.returnPipette(true); }
      else if (!this.putBack(true)) return;
    }
    if (id === 'tray' && it.loc === 'caststand' && this.S.gel.poured > 0 && this.S.gel.solid < 1) {
      this.mistake({ id: 'move-liquid-gel', title: 'The gel has not set yet', block: true,
        what: 'You tried to move the casting tray while the agarose is still liquid.',
        why: 'Agarose forms its pore network as it cools below ~40 °C. Moving it now distorts the gel, gives uneven thickness and wells that collapse — bands will be wavy or smeared.',
        fix: 'Wait until the gel turns opaque (≈20–30 min), or fast-forward the timer.' });
      return;
    }
    if (it.loc?.startsWith('cfg#') && this.S.inst.cfg.running) { this.toast('The rotor is spinning — wait for it to stop.', 'warn'); return; }
    if (it.loc?.startsWith('cfg#') && !this.S.inst.cfg.lid) { this.toast('Open the centrifuge lid first.'); this.bus.emit('panel', { inst: 'cfg' }); return; }
    if (it.loc === 'tc-block' && !this.S.inst.tc.lid) { this.toast('Open the thermocycler lid first.'); this.bus.emit('panel', { inst: 'tc' }); return; }
    if (it.loc === 'tc-block' && this.S.inst.tc.running) { this.toast('The PCR program is still running.'); return; }
    if (it.loc === 'spinner' && !this.S.inst.spinner.lid) { this.toast('Open the mini-spinner lid first.'); return; }
    if (id === 'comb' && (it.loc === 'comb-back' || it.loc === 'comb-front')) return this.removeComb();
    if (it.loc?.startsWith('in:')) { return; }
    this.snapshot('pick');
    it.from = it.loc; it.loc = 'held'; this.S.held = { kind: 'item', id };
    this.selected = null;
    this.holdPoint.set(STATIONS[this.station]?.x ?? 0, 0.13, 0.1);
    sfx.pick();
    this.emit('pickItem', { id });
  }
  itemTap(o, point) {
    const id = this.S.held.id, it = this.S.items[id];
    const type = this.w.objects[id].itemType;
    if (type === 'tissue' && (o.id === 'A' || o.id === 'B')) return this.tissueInto(o.id);
    if (type === 'pestle' && this.w.vessels[o.id]) return this.pestleInto(o.id);
    if ((type === 'flask' || type === 'bottle') && (o.id === 'tray' || o.id === 'chamber' || o.id === 'caststand')) return this.dockPour(o.id === 'caststand' ? 'tray' : o.id);
    if (o.kind === 'item' && o.id !== id && this.S.items[o.id]?.loc && this.w.slots[this.S.items[o.id].loc]) {
      // tapping an item that sits in a slot: if same type, swap is not allowed — pick nearest free slot of that holder
      const holder = this.w.slots[this.S.items[o.id].loc].owner;
      if (o.id === 'tray' && type === 'comb') return this.placeIn('tray', point);
      return this.placeIn(holder, point);
    }
    if (o.kind === 'item' && o.id === id) return;
    return this.placeIn(o.id, point);
  }
  slotsOf(owner) { return Object.values(this.w.slots).filter(s => s.owner === owner); }
  occupant(slotId) { for (const [k, v] of Object.entries(this.S.items)) if (v.loc === slotId) return k; return null; }
  placeIn(ownerId, point) {
    const id = this.S.held.id, type = this.w.objects[id].itemType;
    let cands = this.slotsOf(ownerId).filter(s => s.type === type && !this.occupant(s.id));
    if (!cands.length) {
      const any = this.slotsOf(ownerId).some(s => s.type === type);
      this.toast(any ? 'No free position there.' : `The ${this.labelOf(id)} does not go there.`, 'warn');
      return;
    }
    if (point) {
      cands.sort((a, b) => this.w.worldPos(a.anchor, tmpV).distanceTo(point) - this.w.worldPos(b.anchor, tmpV2).distanceTo(point));
    }
    this.placeAt(cands[0].id);
  }
  placeAt(slotId) {
    const id = this.S.held.id, it = this.S.items[id], slot = this.w.slots[slotId];
    if (slot.owner === 'centrifuge' && !this.S.inst.cfg.lid) { this.toast('Open the centrifuge lid first.', 'warn'); this.bus.emit('panel', { inst: 'cfg' }); return; }
    if (slot.owner === 'cycler' && !this.S.inst.tc.lid) { this.toast('Open the thermocycler lid first.', 'warn'); this.bus.emit('panel', { inst: 'tc' }); return; }
    if (slot.owner === 'spinner' && !this.S.inst.spinner.lid) { this.toast('Open the mini-spinner lid first.', 'warn'); this.bus.emit('panel', { inst: 'spinner' }); return; }
    if (slot.owner === 'chamber' && this.S.inst.chamberLid) { this.toast('Take the lid off the gel tank first.', 'warn'); this.bus.emit('panel', { inst: 'chamber' }); return; }
    if (slot.owner === 'tray' && id === 'comb' && this.S.gel.poured > 0 && this.S.gel.solid >= 1) { this.toast('The gel is already set — the comb cannot go back in.', 'warn'); return; }
    const m = this.check('place', { id, slot: slotId, owner: slot.owner });
    if (m && m.block) { this.mistake(m); return; }
    this.snapshot('place');
    it.loc = slotId; this.S.held = null;
    if (slot.owner === 'tray' && id === 'comb' && this.S.gel.poured > 0) {
      this.toast('Comb inserted into liquid agarose — wells will still form, but insert the comb before pouring next time.', 'warn');
    }
    sfx.place();
    this.emit('place', { id, slot: slotId, owner: slot.owner });
    if (m) this.mistake(m);
  }
  putBack(silent) {
    const h = this.S.held; if (!h || h.kind !== 'item') return true;
    const it = this.S.items[h.id];
    if (h.id === 'pestle' && it.loc?.startsWith('in:')) { this.removePestle(); return true; }
    const from = it.from && this.w.slots[it.from] && !this.occupant(it.from) ? it.from : null;
    const type = this.w.objects[h.id].itemType;
    let slot = from;
    if (!slot) slot = Object.values(this.w.slots).find(s => s.type === type && s.station === this.station && !this.occupant(s.id) && !['centrifuge', 'cycler', 'spinner', 'vortex', 'chamber', 'trans'].includes(s.owner))?.id;
    if (!slot) slot = Object.values(this.w.slots).find(s => s.type === type && !this.occupant(s.id))?.id;
    if (!slot) { this.toast('No free place to put it down.'); return false; }
    this.pourActive = false; this.pourDock = null;
    this.placeAt(slot);
    return true;
  }
  labelOf(id) { return { strip: 'PCR strip', tray: 'gel tray', comb: 'comb', flask: 'agarose flask', taebottle: 'TAE bottle', pestle: 'micropestle', tissue: 'strawberry tissue' }[id] || this.vesselLabel(id); }
  toggleCap(id) {
    const vids = id === 'strip' ? Array.from({ length: 8 }, (_, i) => `pcr${i + 1}`) : [id];
    const vs0 = this.V(vids[0]); if (!vs0 || vs0.cap === null) return;
    if (this.S.items.pestle.loc === `in:${id}`) { this.toast('Remove the pestle first.'); return; }
    const open = vs0.cap === true;
    const pipAt = Object.values(this.S.pip).some(p => p.at && vids.includes(p.at));
    if (!open && pipAt) { this.toast('Lift the pipette tip out first.'); return; }
    this.snapshot('cap');
    for (const v of vids) this.V(v).cap = !open;
    sfx.cap(open);
    this.emit('cap', { id, open });
  }
  flick(id) {
    const vids = id === 'strip' ? ['pcr1', 'pcr2', 'pcr3', 'pcr4', 'pcr5', 'pcr6', 'pcr7', 'pcr8'] : [id];
    if (vids.some(v => this.V(v).cap === false && this.vol(v) > 0)) {
      this.snapshot('spill');
      for (const v of vids) if (this.V(v).cap === false) this.take(this.V(v), this.vol(v) * 0.3);
      this.mistake({ id: 'flick-open', title: 'Tube flicked with the cap open', undoable: true,
        what: 'You flicked an open tube.',
        why: 'About a third of the liquid splashed out — losing sample, changing volumes and creating aerosols that can contaminate nearby tubes.',
        fix: 'Close the cap firmly before flicking, inverting or vortexing.' });
      this.emit('spill', { id });
      return;
    }
    this.snapshot('flick');
    for (const v of vids) { this.V(v).mixed = true; this.dissolve(v, 0.5); }
    this.shake(id, 'flick'); sfx.flick();
    this.emit('mix', { vid: id, how: 'flick' });
  }
  invert(id) {
    if (this.V(id)?.cap === false && this.vol(id) > 0) return this.flick(id);
    this.snapshot('invert');
    const vs = this.V(id);
    vs.mixed = true;
    vs.inversions = (vs.inversions || 0) + 1;
    this.precipitate(id, 0.12);
    this.dissolve(id, 0.15);
    this.shake(id, 'invert'); sfx.invert();
    this.emit('mix', { vid: id, how: 'invert', count: vs.inversions });
  }
  shake(id, kind) { this.anims.push({ id, kind, t: 0, dur: kind === 'invert' ? 0.55 : 0.35 }); }
  rotateTray() {
    if (this.S.held?.id !== 'tray') return;
    this.S.items.tray.rot = this.S.items.tray.rot ? 0 : 1; sfx.place(); this.version++;
    this.emit('rotate', { rot: this.S.items.tray.rot });
  }

  // ---------------------------------------------------------------- sample prep
  cutSample() {
    if (this.S.cutDone) { this.toast('You already have a tissue piece on the board.'); return; }
    this.snapshot('cut');
    this.S.cutDone = true; this.S.items.tissue.hidden = false;
    this.S.tissueMg = Math.round(108 + Math.random() * 22);
    sfx.cut();
    this.emit('cut', { mg: this.S.tissueMg });
    this.toast('Calyx removed and a small piece of strawberry flesh cut.', 'ok');
  }
  trimSample() {
    this.snapshot('trim'); this.S.tissueMg = Math.max(60, Math.round(this.S.tissueMg * 0.82)); sfx.cut(); this.version++; this.emit('trim', { mg: this.S.tissueMg });
  }
  tissueInto(vid) {
    const vs = this.V(vid);
    if (vs.cap === true) { this.toast(`Open ${this.vesselLabel(vid)} first.`, 'warn'); this.select(vid); return; }
    const m = this.check('tissue', { vid });
    if (m && m.block) { this.mistake(m); return; }
    this.snapshot('tissue');
    vs.tissue = { mg: this.S.tissueMg, lysed: 0, released: 0 };
    this.S.items.tissue.loc = `in:${vid}`; this.S.held = null;
    sfx.place();
    this.process(vid);
    this.emit('tissue', { vid, mg: this.S.tissueMg });
    if (m) this.mistake(m);
  }
  pestleInto(vid) {
    const vs = this.V(vid);
    if (vs.cap === true) { this.toast('Open the tube first.', 'warn'); return; }
    if (!vs.tissue) { this.toast('There is no tissue in this tube to grind.'); return; }
    this.snapshot('pestle');
    this.S.items.pestle.loc = `in:${vid}`;
    sfx.place();
    this.emit('pestleIn', { vid });
  }
  grind(delta) {
    const loc = this.S.items.pestle.loc; if (!loc?.startsWith('in:')) return;
    const vid = loc.slice(3), vs = this.V(vid);
    if (!vs.tissue) return;
    vs.tissue.lysed = Math.min(1, vs.tissue.lysed + delta);
    this.grindPhase += delta * 60;
    this.process(vid);
    this.version++;
    if (Math.random() < 0.25) sfx.grind();
    this.bus.emit('grind', { vid, lysed: vs.tissue.lysed });
    if (vs.tissue.lysed >= 1 && !vs.tissue.doneEv) { vs.tissue.doneEv = true; this.emit('ground', { vid }); }
  }
  removePestle() {
    const loc = this.S.items.pestle.loc; if (!loc?.startsWith('in:')) return;
    this.snapshot('pestle out');
    const vid = loc.slice(3);
    this.S.items.pestle.loc = 'pestle-home';
    if (this.S.held?.id === 'pestle') this.S.held = null;
    // a little homogenate stays on the pestle
    this.take(this.V(vid), Math.min(8, this.vol(vid) * 0.02));
    sfx.place();
    this.emit('pestleOut', { vid });
  }

  // ---------------------------------------------------------------- chemistry
  process(vid) {
    const vs = this.V(vid);
    if (vs.tissue) {
      const total = sumLiq(vs.liq);
      const det = total > 0 ? (vs.liq.edwards || 0) / total : 0;
      const eff = det > 0.4 ? 1 : det > 0.1 ? 0.5 : 0.15;
      const M = PROTOCOL.model;
      const targetRelease = M.dnaPer100mg * vs.tissue.mg / 100 * vs.tissue.lysed * (total > 50 ? eff : 0);
      if (targetRelease > vs.tissue.released) {
        vs.sol.gdna = (vs.sol.gdna || 0) + (targetRelease - vs.tissue.released);
        vs.tissue.released = targetRelease;
      }
      const juice = vs.tissue.mg * 0.85 * vs.tissue.lysed;
      const has = vs.tissue.juice || 0;
      if (juice > has) { vs.liq.lysate = (vs.liq.lysate || 0) + (juice - has); vs.tissue.juice = juice; vs.sol.debris = (vs.sol.debris || 0) + (juice - has) * 0.14; }
    }
    const total = sumLiq(vs.liq);
    const alc = total > 0 ? ((vs.liq.iso || 0) + (vs.liq.etoh70 || 0) * 0.7) / total : 0;
    vs.alcohol = alc;
  }
  precipitate(vid, amount) {
    const vs = this.V(vid);
    if ((vs.alcohol || 0) < 0.3 || !vs.sol.gdna) return;
    const salt = (vs.liq.edwards || 0) + (vs.liq.lysate || 0) > 0;
    const f = Math.min(1, amount * (salt ? 1 : 0.3));
    const mv = vs.sol.gdna * f;
    vs.sol.gdna -= mv; vs.sol.gppt = (vs.sol.gppt || 0) + mv;
  }
  dissolve(vid, amount) {
    const vs = this.V(vid);
    if ((vs.alcohol || 0) >= 0.3) return;
    const total = sumLiq(vs.liq);
    if (total < 5) return;
    const hard = vs.overdried ? 0.35 : 1;
    if (vs.pel.gdna) { const mv = vs.pel.gdna * Math.min(1, amount * hard); vs.pel.gdna -= mv; vs.sol.gdna = (vs.sol.gdna || 0) + mv; if (vs.pel.gdna < 1) delete vs.pel.gdna; }
    if (vs.sol.gppt) { const mv = vs.sol.gppt * Math.min(1, amount * 1.5); vs.sol.gppt -= mv; vs.sol.gdna = (vs.sol.gdna || 0) + mv; }
  }
  centrifugeVessel(vid, g, sec) {
    const vs = this.V(vid); const work = g * sec / 60;
    this.process(vid);
    if ((vs.alcohol || 0) >= 0.3) this.precipitate(vid, 0.5);
    const eDeb = Math.min(1, work / 6000), eDna = Math.min(1, work / 50000);
    if (vs.sol.debris) { const mv = vs.sol.debris * eDeb; vs.sol.debris -= mv; vs.pel.debris = (vs.pel.debris || 0) + mv; }
    if (vs.tissue) { vs.pel.debris = (vs.pel.debris || 0) + vs.tissue.mg * 0.1 * (1 - vs.tissue.lysed); }
    if (vs.sol.gppt) { const mv = vs.sol.gppt * eDna; vs.sol.gppt -= mv; vs.pel.gdna = (vs.pel.gdna || 0) + mv; }
    // proteins denatured by SDS co-pellet with debris in the first spin
    vs.spun = (vs.spun || 0) + 1;
  }
  dryPellet(vid, minutes) {
    const vs = this.V(vid);
    if (vs.cap === true) return false;
    const evap = minutes * 6.0;
    for (const k of ['iso', 'etoh70']) if (vs.liq[k]) { vs.liq[k] = Math.max(0, vs.liq[k] - evap); if (vs.liq[k] < 0.01) delete vs.liq[k]; }
    vs.dryMin = (vs.dryMin || 0) + minutes;
    if (vs.dryMin > 30 && sumLiq(vs.liq) < 1) vs.overdried = true;
    this.process(vid);
    return true;
  }

  // ---------------------------------------------------------------- pouring (gel)
  dockPour(target) {
    const id = this.S.held.id;
    if (id === 'flask' && target === 'chamber') {
      this.mistake({ id: 'agarose-in-tank', title: 'Wrong liquid for the tank', block: true, what: 'Molten agarose goes into the casting tray, not the electrophoresis tank.', why: 'The tank needs liquid running buffer to conduct current. Agarose would set into a solid block around the electrodes.', fix: 'Tap the casting tray on its stand.' }); return;
    }
    if (id === 'taebottle' && target === 'tray') {
      this.mistake({ id: 'tae-in-tray', title: 'Wrong liquid for the tray', block: true, what: 'Running buffer goes into the electrophoresis tank.', why: 'The casting tray needs molten agarose to form the gel. TAE alone will not set.', fix: 'Tap the electrophoresis tank instead.' }); return;
    }
    if (target === 'tray' && this.S.items.tray.loc !== 'caststand') { this.toast('Pour the gel with the tray sealed in the casting stand.'); return; }
    if (target === 'chamber' && this.S.inst.chamberLid) { this.toast('Remove the tank lid first.'); return; }
    if (target === 'tray' && !['comb-back', 'comb-front'].includes(this.S.items.comb.loc) && this.S.gel.poured === 0) {
      const m = { id: 'no-comb', title: 'Comb not inserted', block: true,
        what: 'You are about to pour agarose without the comb in the tray.',
        why: 'The comb\'s teeth mould the wells. Without it the gel will be a flat slab with nowhere to load the DNA.',
        fix: 'Put the comb into one of the slots at the end of the tray, then pour.' };
      this.mistake(m); return;
    }
    this.pourDock = target; this.version++;
    this.emit('pourDock', { target });
  }
  pour(dt) {
    if (!this.pourDock) return;
    const id = this.S.held?.id; if (!id) return;
    const g = this.S.gel;
    if (this.pourDock === 'tray') {
      if (!this.pourStarted) { this.snapshot('pour'); this.pourStarted = true; }
      const add = dt * 9; // mL/s
      const fv = this.V('flask'); const have = (fv.liq.agarose || 0) / 1000;
      if (have <= 0) return;
      fv.liq.agarose -= add * 1000; g.poured += add; g.pouredAt = this.S.t; g.solid = 0;
      if (!this.combWellsSet) g.wells = this.S.items.comb.loc === 'comb-back' ? 'back' : this.S.items.comb.loc === 'comb-front' ? 'front' : null;
      if (g.poured > 60) { g.poured = 60; }
    } else if (this.pourDock === 'chamber') {
      if (!this.pourStarted) { this.snapshot('pour'); this.pourStarted = true; }
      g.buffer += dt * 70;
      if (g.buffer > 520) g.buffer = 520;
    }
    this.version++;
    sfx.pour(true);
  }
  stopPour() {
    if (this.pourActive || this.pourStarted) {
      this.pourActive = false; this.pourStarted = false; sfx.pour(false);
      const g = this.S.gel;
      if (this.pourDock === 'tray') this.emit('poured', { mL: g.poured });
      if (this.pourDock === 'chamber') this.emit('buffered', { mL: g.buffer });
      this.version++;
    }
  }
  removeComb() {
    const g = this.S.gel;
    if (g.poured > 0 && g.solid < 1) {
      this.mistake({ id: 'comb-early', title: 'Comb pulled before the gel set', undoable: true, block: true,
        what: 'The agarose is still liquid.', why: 'Wells only keep their shape once the agarose has gelled. Pulling the comb now lets liquid agarose flow back in and the wells disappear.', fix: 'Wait for the gel to become opaque, then remove the comb.' });
      return;
    }
    const m = this.check('removeComb', {});
    if (m && m.block) { this.mistake(m); return; }
    this.snapshot('comb out');
    this.S.items.comb.loc = 'comb-home';
    if (g.poured > 0) g.combOut = true;
    if (g.poured > 0 && g.buffer < 100 && this.S.items.tray.loc === 'chamber') this.toast('Tip: removing the comb under buffer protects the wells from tearing.', 'info');
    sfx.place();
    this.emit('combOut', {});
    if (m) this.mistake(m);
  }

  // ---------------------------------------------------------------- instruments
  cfgToggleLid() {
    const c = this.S.inst.cfg; if (c.running) { this.toast('Lid is locked while the rotor spins.', 'warn'); return; }
    this.snapshot('lid'); c.lid = !c.lid; sfx.lid(); this.emit('cfgLid', { open: c.lid });
  }
  cfgSet(key, val) { const c = this.S.inst.cfg; if (c.running) return; c[key] = val; this.version++; this.emit('cfgSet', { key, val }); }
  cfgTubes() {
    const out = [];
    for (let i = 0; i < 12; i++) { const occ = this.occupant(`cfg#${i}`); if (occ) out.push({ i, id: occ }); }
    return out;
  }
  cfgStart() {
    const c = this.S.inst.cfg;
    if (c.running) return;
    if (c.lid) { this.toast('Close the lid before starting.', 'warn'); return; }
    const tubes = this.cfgTubes();
    if (!tubes.length) { this.toast('The rotor is empty.'); return; }
    const open = tubes.filter(t => this.V(t.id).cap === false);
    if (open.length) {
      this.mistake({ id: 'cfg-open-cap', title: 'Open tube in the centrifuge', block: true,
        what: `${open.map(t => this.vesselLabel(t.id)).join(', ')} is open.`,
        why: 'At 13,000 × g an open lid can snap off and liquid is flung out as an aerosol, contaminating the rotor and losing your sample.',
        fix: 'Open the lid, close the cap(s), and start again.' });
      return;
    }
    // balance: every tube needs a partner opposite with similar mass
    const bad = [];
    for (const t of tubes) {
      const opp = this.occupant(`cfg#${(t.i + 6) % 12}`);
      if (!opp) bad.push({ t, reason: 'nothing opposite' });
      else if (Math.abs(this.massOf(t.id) - this.massOf(opp)) > 0.15) bad.push({ t, reason: `mass differs by ${Math.abs(this.massOf(t.id) - this.massOf(opp)).toFixed(2)} g` });
    }
    if (bad.length) {
      this.mistake({ id: 'imbalance', title: 'Rotor is unbalanced', block: true,
        what: `${bad.map(b => `${this.vesselLabel(b.t.id)}: ${b.reason}`).join('; ')}.`,
        why: 'At 13,000 × g a small mass difference becomes a large off-centre force. The rotor vibrates violently, can damage the drive shaft, and tubes may break. The centrifuge would refuse to run or "walk" across the bench.',
        fix: 'Place a balance tube of equal mass (±0.1 g) directly opposite every sample. Use the BAL tube; add water to it if needed.' });
      return;
    }
    const m = this.check('centrifuge', { g: c.g, sec: c.sec, tubes });
    if (m && m.block) { this.mistake(m); return; }
    this.snapshot('spin');
    c.running = true; c.remain = c.sec; c.spin = 0;
    sfx.centrifuge(true);
    this.emit('cfgStart', { g: c.g, sec: c.sec, tubes: tubes.map(t => t.id) });
    if (m) this.mistake(m);
  }
  spinnerToggleLid() { const s = this.S.inst.spinner; if (s.running) return; this.snapshot('lid'); s.lid = !s.lid; sfx.lid(); this.emit('spinLid', { open: s.lid }); }
  spinnerStart() {
    const s = this.S.inst.spinner;
    if (s.lid) { this.toast('Close the lid first.'); return; }
    if (!this.occupant('spinner')) { this.toast('Put the PCR strip in first.'); return; }
    if (this.V('pcr1').cap === false) { this.mistake({ id: 'spin-open', title: 'Strip caps are open', block: true, what: 'The PCR strip is open.', why: 'Spinning open tubes flings liquid out and can splash between wells — cross-contaminating reactions.', fix: 'Close the strip caps first.' }); return; }
    s.running = true; s.remain = 5; sfx.centrifuge(true, 0.6);
    this.emit('spinStart', {});
  }
  vortexStart() {
    const id = this.occupant('vortex-cup');
    if (!id) { this.toast('Place a tube on the vortex cup first.'); return; }
    if (this.V(id).cap === false) {
      this.snapshot('spill'); this.take(this.V(id), this.vol(id) * 0.25);
      this.mistake({ id: 'vortex-open', title: 'Vortexed an open tube', undoable: true,
        what: `${this.vesselLabel(id)} was open on the vortex.`,
        why: 'Vortexing an open tube sprays droplets and aerosol — sample is lost and SDS-containing buffer can reach your face and the bench.',
        fix: 'Close the cap before vortexing.' });
      this.emit('spill', { id }); return;
    }
    if (!this.vortexing) {
      const m = this.check('vortex', { id });
      if (m && m.block) { this.mistake(m); return; }
      this.snapshot('vortex');
      this.vortexing = true; this.vortexTime = 0; sfx.vortex(true);
      if (m) this.mistake(m);
    }
  }
  vortexStop() {
    if (!this.vortexing) return;
    this.vortexing = false; sfx.vortex(false);
    const id = this.occupant('vortex-cup');
    if (id) {
      const vs = this.V(id); vs.mixed = true;
      if (vs.tissue) vs.tissue.lysed = Math.min(1, vs.tissue.lysed + 0.05 * this.vortexTime);
      this.process(id); this.dissolve(id, 0.6);
      this.emit('vortexed', { id, sec: this.vortexTime });
    }
  }
  tcToggleLid() { const t = this.S.inst.tc; if (t.running) { this.toast('Lid is locked during the run.', 'warn'); return; } this.snapshot('lid'); t.lid = !t.lid; sfx.lid(); this.emit('tcLid', { open: t.lid }); }
  tcSetProgram(prog) { this.S.inst.tc.program = clone(prog); this.version++; this.emit('tcProgram', {}); }
  tcStart() {
    const t = this.S.inst.tc;
    if (t.running) return;
    if (t.lid) { this.toast('Close the heated lid first.', 'warn'); return; }
    if (this.occupant('tc-block') !== 'strip') { this.toast('Load the PCR strip into the block first.', 'warn'); return; }
    if (this.V('pcr1').cap === false) {
      this.mistake({ id: 'tc-open', title: 'PCR tubes are open', block: true, what: 'The strip caps are open.', why: 'At 95 °C the reaction evaporates out of open tubes within minutes, and the heated lid cannot seal them.', fix: 'Open the lid, take out the strip, close the caps and reload it.' });
      return;
    }
    const m = this.check('tcStart', { program: t.program });
    if (m && m.block) { this.mistake(m); return; }
    this.snapshot('tc start');
    t.running = true; t.done = false; t.t = 0; t.temp = 25; t.schedule = buildSchedule(t.program);
    sfx.beep(2);
    this.emit('tcStart', { program: clone(t.program) });
    if (m) this.mistake(m);
  }
  tcFinish() {
    const t = this.S.inst.tc; const prog = t.program;
    const roles = { pcr1: 'sample', pcr2: 'positive', pcr3: 'ntc' };
    const results = {};
    for (let i = 1; i <= 8; i++) {
      const vid = `pcr${i}`, vs = this.V(vid);
      if (this.vol(vid) < 1) continue;
      const r = simulatePCR(vs, prog, roles[vid] || 'extra');
      results[vid] = { N0: r.N0, N: r.N, E: r.E, curve: r.curve, notes: r.notes, products: r.products, fac: r.fac };
      for (const pr of r.products) {
        const key = pr.smear ? 'smear' : `amp:${pr.bp}`;
        vs.sol[key] = (vs.sol[key] || 0) + pr.ng;
      }
      // evaporation if lid was open is prevented; template denatured
    }
    this.S.pcr = { ran: true, results, program: clone(prog) };
    t.running = false; t.done = true;
    sfx.beep(3);
    this.emit('tcDone', { results });
  }
  chamberToggleLid() {
    if (this.S.inst.ps.on) { this.toast('Switch off the power supply before touching the tank lid.', 'warn'); return; }
    this.snapshot('lid'); this.S.inst.chamberLid = !this.S.inst.chamberLid;
    if (!this.S.inst.chamberLid) this.S.inst.ps.leads = 'none';
    sfx.lid(); this.emit('chamberLid', { on: this.S.inst.chamberLid });
  }
  psSet(key, val) { if (this.S.inst.ps.on) return; this.S.inst.ps[key] = val; this.version++; this.emit('psSet', { key, val }); }
  psLeads(mode) {
    if (!this.S.inst.chamberLid) { this.toast('Put the lid on the tank first — the leads plug into the lid.', 'warn'); return; }
    this.snapshot('leads'); this.S.inst.ps.leads = mode; sfx.cap(false); this.emit('leads', { mode });
  }
  psStart() {
    const ps = this.S.inst.ps, g = this.S.gel;
    if (ps.on) return;
    if (!this.S.inst.chamberLid || ps.leads === 'none') { this.toast('Close the tank lid and connect both leads first.', 'warn'); return; }
    if (this.S.items.tray.loc !== 'chamber') { this.toast('The gel is not in the tank.', 'warn'); return; }
    if (g.buffer < 250) {
      this.mistake({ id: 'low-buffer', title: 'Gel not covered by buffer', block: true, what: `Only ${Math.round(g.buffer)} mL of TAE in the tank; the gel needs to be submerged by 3–5 mm (≈300 mL).`,
        why: 'Without buffer over the gel, current flows unevenly, the gel heats and dries, and the DNA cannot migrate through the wells.', fix: 'Remove the lid, add more 1× TAE, then restart.' });
      return;
    }
    const wellsAtCathode = this.wellsAtCathode();
    const pol = ps.leads === 'correct' ? 1 : -1;
    const m = this.check('psStart', { wellsAtCathode, leads: ps.leads, volts: ps.v, min: ps.min });
    if (m && m.block) { this.mistake(m); return; }
    if (!wellsAtCathode || pol < 0) {
      const reason = !wellsAtCathode && pol < 0 ? 'the gel is reversed AND the leads are swapped' : !wellsAtCathode ? 'the wells are at the positive (red) end of the tank' : 'the red and black leads are swapped';
      const twoWrongs = !wellsAtCathode && pol < 0;
      if (!twoWrongs) {
        this.snapshot('ps start');
        g.polarity = -1; ps.on = true; ps.elapsed = 0; sfx.beep(1);
        this.emit('psStart', { reversed: true });
        this.mistake({ id: 'wrong-polarity', title: 'DNA will run the wrong way', undoable: true,
          what: `Current is flowing, but ${reason}.`,
          why: 'DNA is negatively charged because of its phosphate backbone, so it always moves toward the positive anode (red). With the wells at the anode end, your DNA leaves the wells straight into the buffer and is lost. Remember: "run to red".',
          fix: 'Undo, then place the gel with the wells at the black (−) electrode and plug black-to-black, red-to-red.' });
        return;
      }
    }
    this.snapshot('ps start');
    g.polarity = 1; ps.on = true; ps.elapsed = 0;
    sfx.beep(1);
    this.emit('psStart', { reversed: false });
    if (m) this.mistake(m);
  }
  psStop() { const ps = this.S.inst.ps; if (!ps.on) return; ps.on = false; sfx.beep(2); this.S.gel.ran = true; this.emit('psStop', { runVmin: this.S.gel.runVmin }); }
  wellsAtCathode() {
    const g = this.S.gel, rot = this.S.items.tray.rot;
    if (!g.wells) return true;
    return (g.wells === 'back') === (rot === 0);
  }
  transToggle(key) {
    const tr = this.S.inst.trans;
    this.snapshot('trans');
    tr[key] = !tr[key]; sfx.click(0.5);
    if (key === 'on' && tr.on) sfx.hum();
    this.emit('trans', { key, val: tr[key] });
    if (key === 'on' && tr.on && !tr.shield) this.toast('Lower the amber shield — it filters the blue excitation light so only the orange SYBR Safe emission reaches your eyes.', 'warn');
  }

  // ---------------------------------------------------------------- time
  tick(dtReal) {
    const sp = PROTOCOL.speed;
    const dt = dtReal * sp;
    const I = this.S.inst;
    let active = false;
    if (I.cfg.running) {
      active = true; I.cfg.remain -= dt; I.cfg.spin = Math.min(1, (I.cfg.spin || 0) + dtReal * 0.8);
      if (I.cfg.remain <= 0) {
        I.cfg.running = false; I.cfg.remain = 0; I.cfg.runs++;
        for (const t of this.cfgTubes()) this.centrifugeVessel(t.id, I.cfg.g, I.cfg.sec);
        sfx.centrifuge(false); sfx.beep(3);
        this.emit('cfgDone', { g: I.cfg.g, sec: I.cfg.sec, tubes: this.cfgTubes().map(t => t.id) });
      }
    }
    if (I.spinner.running) {
      active = true; I.spinner.remain -= dtReal * 2;
      if (I.spinner.remain <= 0) { I.spinner.running = false; sfx.centrifuge(false); for (let i = 1; i <= 8; i++) this.V(`pcr${i}`).spun = true; this.emit('spinDone', {}); }
    }
    if (this.vortexing) { this.vortexTime += dtReal; active = true; }
    if (I.tc.running) {
      active = true;
      I.tc.t += dtReal * (PROTOCOL.tcSpeed || 60);
      const st = stateAt(I.tc.schedule, I.tc.t);
      I.tc.temp = st.temp; I.tc.stage = st; I.tc.lidT = Math.min(I.tc.program.lid, 25 + I.tc.t * 1.5);
      if (st.done) this.tcFinish();
      this.version++;
    }
    const g = this.S.gel;
    if (g.poured > 0 && g.solid < 1 && !this.pourActive) {
      g.solid = Math.min(1, g.solid + dt / (20 * 60) * (this.ffGel ? 8 : 1));
      if (g.solid >= 1) { this.emit('gelSet', {}); }
    }
    if (I.ps.on) {
      active = true;
      const dmin = dt / 60;
      I.ps.elapsed += dmin;
      g.runVmin += I.ps.v * dmin;
      if (I.ps.elapsed >= I.ps.min) this.psStop();
      this.version++;
    }
    if (this.drying) {
      const vs = this.V(this.drying.vid);
      const dmin = dt / 60 * 4;
      this.dryPellet(this.drying.vid, dmin);
      this.drying.min += dmin; this.version++;
      if (this.drying.min >= this.drying.target) { this.emit('dried', { vid: this.drying.vid, min: vs.dryMin }); this.drying = null; }
    }
    this.S.t += active ? dt : dtReal;
  }
  startDrying(vid, minutes) {
    if (this.V(vid).cap === true) { this.toast('Open the cap so the alcohol can evaporate.', 'warn'); return; }
    this.snapshot('dry');
    this.drying = { vid, min: 0, target: minutes };
    this.emit('dryStart', { vid, minutes });
  }

  // ---------------------------------------------------------------- visual sync
  syncAll(instant) { this.sync(1 / 60, instant); }
  sync(dt, instant = false) {
    const w = this.w, S = this.S;
    const k = instant ? 1 : 1 - Math.pow(0.0001, dt);
    // shake / invert animation offsets
    const animQ = {};
    for (const a of this.anims) {
      a.t += dt; const f = Math.min(1, a.t / a.dur);
      const q = a.kind === 'invert'
        ? new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.sin(f * Math.PI) * Math.PI * 0.98)
        : new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.sin(f * Math.PI * 6) * 0.25 * (1 - f));
      animQ[a.id] = q;
    }
    this.anims = this.anims.filter(a => a.t < a.dur);
    // items
    for (const [id, it] of Object.entries(S.items)) {
      const o = w.objects[id], g = o.group;
      g.visible = !it.hidden;
      let parent, pos = null, quat = null, scl = 1;
      if (it.loc === 'held') {
        parent = w.scene;
        pos = this.holdTarget(id);
        quat = this.holdQuat(id);
      } else if (it.loc?.startsWith('in:')) {
        const vg = w.objects[it.loc.slice(3)].group; parent = vg;
        if (id === 'tissue') { pos = new THREE.Vector3(0, 0.004, 0); quat = new THREE.Quaternion(); const t = S.vessels[it.loc.slice(3)]?.tissue; scl = t ? 0.75 * (1 - t.lysed * 0.85) : 0.7; }
        if (id === 'pestle') {
          const ph = this.grindPhase;
          pos = new THREE.Vector3(Math.cos(ph) * 0.0012, 0.003 + Math.abs(Math.sin(ph * 0.5)) * 0.002, Math.sin(ph) * 0.0012);
          quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.sin(ph) * 0.06, ph * 0.3, Math.cos(ph) * 0.06));
          if (S.held?.id === 'pestle') S.held = null;
        }
      } else if (it.loc && w.slots[it.loc]) {
        parent = w.slots[it.loc].anchor; pos = new THREE.Vector3(); quat = new THREE.Quaternion();
        if (id === 'tray' && it.rot) quat.setFromAxisAngle(UP, Math.PI);
        if (id === 'tray' && it.loc === 'trans') pos.y = 0.001;
      }
      if (parent && g.parent !== parent) { parent.attach(g); g.userData.bq = g.quaternion.clone(); }
      if (!g.userData.bq) g.userData.bq = g.quaternion.clone();
      if (pos) { if (instant) g.position.copy(pos); else g.position.lerp(pos, k); }
      if (quat) { if (instant) g.userData.bq.copy(quat); else g.userData.bq.slerp(quat, k); }
      g.quaternion.copy(g.userData.bq);
      if (animQ[id]) g.quaternion.multiply(animQ[id]);
      g.scale.setScalar(instant ? scl : g.scale.x + (scl - g.scale.x) * k);
    }
    // pipettes
    for (const [id, p] of Object.entries(S.pip)) {
      const o = w.objects[id], g = o.group;
      if (p.loc === 'stand') {
        const anchor = w.slots[o.home].anchor;
        if (g.parent !== anchor) anchor.attach(g);
        const tgt = new THREE.Vector3();
        if (instant) { g.position.copy(tgt); g.quaternion.identity(); } else { g.position.lerp(tgt, k); g.quaternion.slerp(new THREE.Quaternion(), k); }
      } else {
        if (g.parent !== w.scene) w.scene.attach(g);
        const { pos, quat } = this.pipetteTarget(id);
        if (instant) { g.position.copy(pos); g.quaternion.copy(quat); } else { g.position.lerp(pos, Math.min(1, k * 1.2)); g.quaternion.slerp(quat, k); }
      }
      // plunger
      const pl = g.userData.plunger; const want = g.userData.plungerRest - [0, 0.006, 0.0095][p.plunger];
      pl.position.y += (want - pl.position.y) * Math.min(1, dt * 18);
      // display
      const spec = PIPETTES[p.type];
      const txt = p.vol.toFixed(spec.decimals);
      if (g.userData.dispText !== txt) { g.userData.dispText = txt; g.userData.display.update(txt); }
      // tip
      const hasTip = !!p.tip;
      let tm = this.tipObjs[id];
      if (hasTip && (!tm || tm.userData.type !== p.tip.type)) {
        if (tm) tm.parent.remove(tm);
        tm = tipMesh(p.tip.type); tm.userData.type = p.tip.type; g.userData.tipMount.add(tm); this.tipObjs[id] = tm;
      } else if (!hasTip && tm) { tm.parent.remove(tm); delete this.tipObjs[id]; tm = null; }
      if (tm) tm.userData.setVolume(sumLiq(p.tip.liq), this.colorOf(p.tip.liq, p.tip.sol));
    }
    // vessels
    for (const [vid, vs] of Object.entries(S.vessels)) {
      const vd = w.vessels[vid];
      if (vd.liquid) {
        const v = sumLiq(vs.liq);
        vd.liquid.set(Math.min(v, capacity(vd.kind) * 0.995), this.colorOf(vs.liq, vs.sol));
      }
      if (vs.cap !== null && vd.node.userData.cap) {
        const cg = vd.node.userData.cap; const want = vs.cap ? 0 : -2.0;
        cg.rotation.x = instant ? want : cg.rotation.x + (want - cg.rotation.x) * Math.min(1, dt * 10);
      } else if (vs.cap !== null && vd.stripIndex != null) {
        const cg = w.objects.strip.group.userData.caps[vd.stripIndex]; const want = vs.cap ? 0 : -2.0;
        cg.rotation.x = instant ? want : cg.rotation.x + (want - cg.rotation.x) * Math.min(1, dt * 10);
      }
      this.syncPellet(vid, vs, vd);
    }
    for (const [box, n] of Object.entries(S.tipUsed)) { const ud = w.objects[box].group.userData; if (ud.used !== n) ud.setUsed(n); }
    this.syncInstruments(dt, instant);
  }
  syncPellet(vid, vs, vd) {
    if (vd.kind !== 'micro') return;
    const ex = vd.node.userData.extras; if (!ex) return;
    const deb = vs.pel.debris || 0, dna = (vs.pel.gdna || 0);
    const key = `${deb.toFixed(1)}|${dna.toFixed(0)}`;
    if (ex.userData.key === key) return;
    ex.userData.key = key;
    ex.clear();
    if (deb > 0.3) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.0026, 12, 8), new THREE.MeshStandardMaterial({ color: 0x8a2234, roughness: 0.9 }));
      m.scale.set(1, 0.5, 1); m.position.set(0.0012, 0.0028, 0.0012); ex.add(m);
    }
    if (dna > 100) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.0016 + Math.min(0.0012, dna / 4000 * 0.0012), 12, 8), new THREE.MeshStandardMaterial({ color: 0xf6eef0, roughness: 0.7, emissive: 0x221a1c }));
      m.scale.set(1, 0.45, 1.3); m.position.set(0.0028, 0.0045, 0); ex.add(m);
    }
  }
  holdTarget(id) {
    const p = this.holdPoint.clone();
    if (this.pourDock && this.S.held?.id === id) {
      const tgt = this.pourDock === 'tray' ? this.w.objects.tray.group : this.w.objects.chamber.group;
      const c = this.w.worldPos(tgt, new THREE.Vector3());
      const tilt = this.pourActive ? 1 : 0.2;
      const h = id === 'flask' ? 0.04 : 0.1;
      return new THREE.Vector3(c.x - 0.05 - tilt * 0.03, c.y + h + 0.05 + tilt * 0.02, c.z + (this.pourDock === 'chamber' ? 0.05 : 0));
    }
    p.y += Math.sin(performance.now() / 600) * 0.002;
    return p;
  }
  holdQuat(id) {
    const q = new THREE.Quaternion();
    if (this.pourDock && this.S.held?.id === id) {
      q.setFromEuler(new THREE.Euler(0, 0, this.pourActive ? -1.75 : -0.35));
      return q;
    }
    if (id === 'tray' && this.S.items.tray.rot) q.setFromAxisAngle(UP, Math.PI);
    return q;
  }
  pipetteTarget(id) {
    const p = this.S.pip[id];
    const tipLen = p.tip ? TIPS[p.tip.type].len : 0;
    const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.12, 0, -0.1));
    let tipEnd;
    if (this.dipTarget && this.dipTarget.t < 0.5 && this.S.held?.id === id) {
      this.dipTarget.t += 1 / 60;
      tipEnd = this.dipTarget.p.clone(); tipEnd.y += 0.002 + Math.max(0, this.dipTarget.t - 0.25) * 0.25;
      return { pos: tipEnd.add(new THREE.Vector3(0, 0.0, 0)), quat: new THREE.Quaternion() };
    }
    if (p.at) {
      const vd = this.w.vessels[p.at], vs = this.V(p.at);
      const node = vd.node;
      node.updateMatrixWorld(true);
      let y;
      if (vd.kind === 'well') y = 0.0005;
      else if (vd.liquid) {
        const v = sumLiq(vs.liq);
        y = v > 0.3 ? Math.max((vd.liquid.surfaceY || 0) - 0.0035, 0.002) : 0.004;
        if (vs.pel && (vs.pel.debris || vs.pel.gdna) && v > 0.3) y = Math.max(y, 0.008);
      } else y = 0.01;
      tipEnd = node.localToWorld(new THREE.Vector3(vd.kind === 'micro' ? -0.0015 : 0, y, 0));
      const q = new THREE.Quaternion();
      node.getWorldQuaternion(q);
      quat.copy(q).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0.05, 0, 0)));
      if (vd.kind === 'well' || vd.kind === 'micro' && this.S.items[vd.objId]?.loc?.startsWith('cfg')) quat.set(0, 0, 0, 1);
      const pos = tipEnd.clone().add(new THREE.Vector3(0, tipLen, 0).applyQuaternion(quat));
      if (this.mixAnim) { this.mixAnim.t += 1 / 60; pos.y += Math.abs(Math.sin(this.mixAnim.t * 18)) * 0.002; if (this.mixAnim.t > 1) this.mixAnim = null; }
      return { pos, quat };
    }
    tipEnd = this.holdPoint.clone();
    const pos = tipEnd.add(new THREE.Vector3(0, tipLen + 0.02, 0).applyQuaternion(quat));
    return { pos, quat };
  }
  syncInstruments(dt, instant) {
    const w = this.w, I = this.S.inst;
    const lerpRot = (obj, axis, want, speed = 6) => { obj.rotation[axis] = instant ? want : obj.rotation[axis] + (want - obj.rotation[axis]) * Math.min(1, dt * speed); };
    const cfg = w.objects.centrifuge.group.userData;
    lerpRot(cfg.lid, 'x', I.cfg.lid ? -1.75 : 0);
    if (I.cfg.running) {
      const ramp = Math.min(1, (I.cfg.sec - I.cfg.remain) / 6, I.cfg.remain / 6 + 0.05);
      cfg.rotor.rotation.y += dt * 60 * Math.max(0.05, ramp);
    }
    cfg.display.update({ speed: I.cfg.g.toLocaleString(), time: fmtTime(I.cfg.running ? I.cfg.remain : I.cfg.sec), running: I.cfg.running, status: I.cfg.running ? 'RUN' : I.cfg.lid ? 'LID OPEN' : 'READY', statusColor: I.cfg.running ? '#5ef0ff' : '#ffcf5a' });
    const vx = w.objects.vortex.group.userData;
    if (this.vortexing) { const t = performance.now() / 1000; vx.head.position.x = Math.cos(t * 120) * 0.002; vx.head.position.z = -0.01 + Math.sin(t * 120) * 0.002; } else { vx.head.position.x = 0; vx.head.position.z = -0.01; }
    const sp = w.objects.spinner.group.userData;
    lerpRot(sp.lid, 'x', I.spinner.lid ? -1.6 : 0);
    if (I.spinner.running) sp.rotor.rotation.y += dt * 50;
    const tc = w.objects.cycler.group.userData;
    lerpRot(tc.lid, 'x', I.tc.lid ? -1.35 : 0, 4);
    const st = I.tc.stage;
    const remainS = I.tc.running && I.tc.schedule ? I.tc.schedule.total - I.tc.t : null;
    const key = `${I.tc.temp.toFixed(1)}|${st?.label}|${st?.cycle}|${I.tc.running}|${I.tc.done}|${Math.round(I.tc.lidT)}`;
    if (tc.key !== key) {
      tc.key = key;
      tc.display.update({ temp: I.tc.temp, stage: I.tc.running ? st?.label : I.tc.done ? 'Complete · holding at 4 °C' : I.tc.lid ? 'Lid open' : 'Ready — program loaded', cycle: st?.cycle, cycles: I.tc.program.cycles, remaining: remainS != null ? fmtTime(remainS / 60).replace(':', 'h ') + 'm' : null, progress: I.tc.running ? I.tc.t / I.tc.schedule.total : I.tc.done ? 1 : 0, color: tempColor(I.tc.temp), lid: I.tc.running ? I.tc.lidT : null });
    }
    // gel tank, tray, power, transilluminator
    const ch = w.objects.chamber.group.userData, g = this.S.gel;
    ch.buffer.visible = g.buffer > 1;
    const bh = Math.min(0.06, g.buffer / 520 * 0.06);
    ch.buffer.scale.y = Math.max(0.0001, bh); ch.buffer.position.y = 0.004 + bh / 2;
    ch.lid.visible = I.chamberLid;
    ch.bubbles.visible = I.ps.on;
    if (I.ps.on) {
      const t = performance.now() / 1000;
      ch.bubbles.children.forEach((b, i) => { const u = b.userData; const ph = (t * 0.6 + u.s) % 1; b.position.set(u.x, 0.006 + ph * Math.max(0.005, bh - 0.004), u.z + (Math.random() - 0.5) * 0.002); b.scale.setScalar(u.z > 0 ? 0.6 : 1); });
    }
    const ps = w.objects.power.group.userData;
    const pk = `${I.ps.v}|${I.ps.on}|${Math.floor(I.ps.elapsed * 10)}|${I.ps.min}`;
    if (ps.key !== pk) { ps.key = pk; ps.display.update({ v: I.ps.v, ma: I.ps.on ? Math.round(I.ps.v * 0.85) : 0, time: fmtTime((I.ps.on ? I.ps.min - I.ps.elapsed : I.ps.min) * 60).padStart(5, '0'), on: I.ps.on }); }
    this.syncLeads();
    const tr = w.objects.trans.group.userData;
    tr.glassMat.emissiveIntensity += ((I.trans.on ? 2.2 : 0) - tr.glassMat.emissiveIntensity) * Math.min(1, dt * 8);
    tr.light.intensity = I.trans.on ? 0.25 : 0;
    lerpRot(tr.shield, 'x', I.trans.shield ? 0 : -1.2);
    this.syncGel();
    // balance
    const bal = w.objects.balance.group.userData;
    const onPan = this.occupant('balance-pan') === 'tissue';
    const txt = onPan ? `${(this.S.tissueMg / 1000).toFixed(4)} g` : '0.0000 g';
    if (bal.key !== txt) { bal.key = txt; bal.display.update(txt); }
    w.objects.coat.group.visible = !this.S.ppe.coat;
    w.objects.goggles.group.visible = !this.S.ppe.goggles;
    const berry = w.objects.berry.group;
    berry.scale.setScalar(this.S.cutDone ? 0.88 : 1);
    // pour stream
    this.syncPour();
  }
  syncLeads() {
    const ps = this.S.inst.ps, w = this.w;
    if (!this.leads) {
      this.leads = new THREE.Group(); w.scene.add(this.leads);
      this.leadKey = '';
    }
    const key = `${ps.leads}|${this.S.inst.chamberLid}`;
    if (key === this.leadKey) return;
    this.leadKey = key; this.leads.clear();
    if (ps.leads === 'none' || !this.S.inst.chamberLid) return;
    const chG = w.objects.chamber.group, psG = w.objects.power.group;
    const jb = w.worldPos(chG.userData.jackB, new THREE.Vector3()), jr = w.worldPos(chG.userData.jackR, new THREE.Vector3());
    const pb = psG.localToWorld(psG.userData.jacks[0].clone()), pr = psG.localToWorld(psG.userData.jacks[1].clone());
    const pairs = ps.leads === 'correct' ? [[pb, jb, 0x111111], [pr, jr, 0xc62828]] : [[pb, jr, 0x111111], [pr, jb, 0xc62828]];
    for (const [a, b, col] of pairs) {
      const mid = a.clone().lerp(b, 0.5); mid.y += 0.06; mid.z += 0.06;
      const curve = new THREE.CatmullRomCurve3([a, a.clone().add(new THREE.Vector3(0, 0.0, 0.03)), mid, b.clone().add(new THREE.Vector3(0, 0.03, 0)), b]);
      const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.0018, 8), new THREE.MeshStandardMaterial({ color: col, roughness: 0.5 }));
      m.castShadow = true; this.leads.add(m);
      const plug = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.02, 12), new THREE.MeshStandardMaterial({ color: col })); plug.position.copy(b).add(new THREE.Vector3(0, 0.01, 0)); this.leads.add(plug);
    }
  }
  syncPour() {
    if (!this.stream) {
      this.stream = new THREE.Mesh(new THREE.CylinderGeometry(0.0018, 0.0025, 1, 10), new THREE.MeshPhysicalMaterial({ color: 0xf3f1dc, transparent: true, opacity: 0.7, roughness: 0.05 }));
      this.w.scene.add(this.stream);
    }
    const on = this.pourActive && this.pourDock;
    this.stream.visible = !!on;
    if (!on) return;
    const id = this.S.held.id; const g = this.w.objects[id].group;
    const lip = g.localToWorld(new THREE.Vector3(0, id === 'flask' ? 0.15 : 0.22, 0));
    const tgt = this.w.worldPos(this.pourDock === 'tray' ? this.w.objects.tray.group : this.w.objects.chamber.group, new THREE.Vector3());
    const bottomY = tgt.y + (this.pourDock === 'tray' ? 0.004 : 0.01);
    const h = Math.max(0.005, lip.y - bottomY);
    this.stream.material.color.set(id === 'flask' ? 0xf3f1dc : 0xbfe0f5);
    this.stream.scale.y = h; this.stream.position.set(lip.x + 0.004, bottomY + h / 2, lip.z);
  }
  syncGel() {
    const g = this.S.gel, tray = this.w.objects.tray.group.userData;
    const vol = g.poured;
    const th = vol / (0.07 * 0.102) / 1e6; // metres
    tray.gel.visible = vol > 0.5;
    tray.gel.scale.y = Math.max(0.0001, th);
    tray.gel.position.y = 0.003 + th / 2;
    tray.gelMat.opacity = 0.35 + g.solid * 0.5;
    // wells nodes follow comb side
    const zW = g.wells === 'front' ? 0.04 : -0.04;
    tray.wells.forEach((w, i) => { w.position.z = zW; w.position.y = 0.003 + th * 0.6; w.position.x = (i - 3.5) * 0.0078 * (g.wells === 'front' ? -1 : 1); });
    const tr = this.S.inst.trans;
    const onTrans = this.S.items.tray.loc === 'trans';
    const viewing = onTrans && tr.on;
    tray.gelMat.emissiveIntensity = viewing ? (tr.shield ? 2.6 : 1.1) : 0;
    tray.gelMat.color.set(viewing ? (tr.shield ? 0x1a1208 : 0x3050a0) : 0xffffff);
    const key = `${vol.toFixed(1)}|${g.solid.toFixed(2)}|${g.wells}|${g.combOut}|${g.runVmin.toFixed(0)}|${g.polarity}|${this.wellKey()}|${viewing}`;
    if (tray.key === key) return;
    tray.key = key;
    drawGel(this, tray);
  }
  wellKey() { let s = ''; for (let i = 1; i <= 8; i++) s += sumLiq(this.V(`well${i}`).liq).toFixed(1) + ','; return s; }
}

// ---------------------------------------------------------------- gel drawing
export function gelGeometry(lab) {
  const g = lab.S.gel;
  // canvas is 256 × 384; v axis: 0 = back (−z) end of tray
  const wellY = g.wells === 'front' ? 384 - 41 : 41;
  const dir = g.wells === 'front' ? -1 : 1;
  const runLen = 300;
  return { wellY, dir, runLen, laneX: (i) => 128 + (i - 3.5) * 28.5 * (g.wells === 'front' ? -1 : 1) };
}
export function bandsForLane(lab, i) {
  const vs = lab.V(`well${i + 1}`);
  const out = [];
  if (sumLiq(vs.liq) < 0.05) return out;
  const L = vs.liq, sol = vs.sol;
  if (L.ladder) for (const b of LADDER_BANDS()) out.push({ bp: b.bp, ng: b.ng * L.ladder / 5 });
  for (const [k, ng] of Object.entries(sol)) {
    if (k.startsWith('amp:')) out.push({ bp: +k.slice(4), ng, diffuse: +k.slice(4) < 80 });
    if (k === 'smear') out.push({ smear: true, ng });
  }
  const gd = (sol.gdna || 0) + (sol.gppt || 0) + (L.posctrl || 0) * 10;
  if (gd > 0.3) out.push({ bp: 20000, ng: gd, genomic: true });
  return out;
}
function LADDER_BANDS() { return LADDER_100; }

function drawGel(lab, tray) {
  const g = lab.S.gel;
  const base = tray.gelCanvas.userData.ctx, glow = tray.glowCanvas.userData.ctx;
  const W = 256, H = 384;
  base.clearRect(0, 0, W, H); glow.clearRect(0, 0, W, H);
  base.fillStyle = `rgba(178,190,192,${0.4 + g.solid * 0.4})`; base.fillRect(0, 0, W, H);
  glow.fillStyle = '#050302'; glow.fillRect(0, 0, W, H);
  if (!g.wells) { tray.gelCanvas.needsUpdate = true; tray.glowCanvas.needsUpdate = true; return; }
  const G = gelGeometry(lab);
  const runFrac = g.runVmin / STANDARD_RUN;
  for (let i = 0; i < 8; i++) {
    const x = G.laneX(i);
    if (g.combOut || g.solid >= 1) {
      base.fillStyle = g.combOut ? 'rgba(30,36,44,0.85)' : 'rgba(120,120,110,0.35)';
      base.fillRect(x - 10, G.wellY - 3.5, 20, 7);
      glow.fillStyle = 'rgba(40,30,20,1)'; glow.fillRect(x - 10, G.wellY - 3, 20, 6);
    }
    const vs = lab.V(`well${i + 1}`);
    const vol = sumLiq(vs.liq);
    if (vol < 0.05) continue;
    const dye = (vs.liq.dye6x || 0) + (vs.liq.ladder || 0);
    const pol = g.polarity || 1;
    if (dye > 0 && runFrac < 0.12) { base.fillStyle = `rgba(58,48,190,${Math.min(0.95, 0.45 + dye * 0.12) * (1 - runFrac * 6)})`; base.fillRect(x - 10, G.wellY - 3.5, 20, 7); }
    // dye fronts
    if (dye > 0) {
      for (const [bp, col] of [[300, '52,40,200'], [4000, '20,120,200']]) {
        const d = runFrac * mobility(bp) * G.runLen * pol;
        const y = G.wellY + G.dir * d;
        if (y < 0 || y > H) continue;
        base.fillStyle = `rgba(${col},${Math.min(0.95, 0.55 + dye * 0.08)})`;
        base.fillRect(x - 10, y - 3, 20, 6);
      }
    }
    // DNA bands (glow only)
    for (const b of bandsForLane(lab, i)) {
      if (b.smear) {
        const y0 = G.wellY + G.dir * runFrac * mobility(3000) * G.runLen * pol, y1 = G.wellY + G.dir * runFrac * mobility(100) * G.runLen * pol;
        const grd = glow.createLinearGradient(0, y0, 0, y1); grd.addColorStop(0, 'rgba(255,190,90,0.0)'); grd.addColorStop(0.5, `rgba(255,190,90,${Math.min(0.5, b.ng / 200)})`); grd.addColorStop(1, 'rgba(255,190,90,0)');
        glow.fillStyle = grd; glow.fillRect(x - 9, Math.min(y0, y1), 18, Math.abs(y1 - y0));
        continue;
      }
      const d = runFrac * mobility(b.bp) * G.runLen * pol;
      const y = G.wellY + G.dir * d;
      if (pol < 0 && runFrac > 0.02) continue; // ran out into buffer
      if (y < 0 || y > H) continue;
      const a = Math.max(0, Math.min(1, Math.log10(1 + b.ng) / 2.3));
      if (a < 0.08) continue;
      if (b.genomic) {
        glow.fillStyle = `rgba(255,200,110,${a * 0.8})`; glow.fillRect(x - 9, y - 3, 18, 5);
        continue;
      }
      glow.fillStyle = `rgba(255,${180 + a * 60},${90 + a * 80},${a})`;
      glow.shadowColor = 'rgba(255,170,60,0.9)'; glow.shadowBlur = 4 + a * 6;
      const hgt = b.diffuse ? 8 : 4;
      glow.fillRect(x - 9, y - hgt / 2, 18, hgt);
      glow.shadowBlur = 0;
    }
  }
  tray.gelCanvas.needsUpdate = true; tray.glowCanvas.needsUpdate = true;
}

// ---------------------------------------------------------------- thermocycler schedule
export function defaultCyclerProgram() {
  return { init: { t: 94, s: 180 }, cycles: 30, den: { t: 94, s: 30 }, ann: { t: 50, s: 30 }, ext: { t: 72, s: 60 }, final: { t: 72, s: 300 }, hold: 4, lid: 105 };
}
const RAMP = 3.0; // °C per second block ramp rate
export function buildSchedule(p) {
  const segs = []; let t = 0, T = 25;
  const add = (temp, hold, label, cycle, phase) => {
    const ramp = Math.abs(temp - T) / RAMP;
    segs.push({ start: t, ramp, hold, from: T, to: temp, label, cycle, phase });
    t += ramp + hold; T = temp;
  };
  add(p.init.t, p.init.s, 'Initial denaturation', 0, 'denature');
  for (let c = 1; c <= p.cycles; c++) {
    add(p.den.t, p.den.s, 'Denaturation', c, 'denature');
    add(p.ann.t, p.ann.s, 'Annealing', c, 'anneal');
    add(p.ext.t, p.ext.s, 'Extension', c, 'extend');
  }
  add(p.final.t, p.final.s, 'Final extension', p.cycles, 'extend');
  add(p.hold, 5, 'Hold', p.cycles, 'hold');
  return { segs, total: t };
}
export function stateAt(sched, t) {
  if (t >= sched.total) { const last = sched.segs[sched.segs.length - 1]; return { temp: last.to, label: 'Hold 4 °C', cycle: last.cycle, phase: 'hold', done: true, frac: 1 }; }
  for (const s of sched.segs) {
    if (t < s.start + s.ramp + s.hold) {
      const into = t - s.start;
      const temp = into < s.ramp ? s.from + (s.to - s.from) * (into / Math.max(0.001, s.ramp)) : s.to;
      const frac = into < s.ramp ? 0 : (into - s.ramp) / Math.max(0.001, s.hold);
      return { temp, label: into < s.ramp ? `Ramping → ${s.to} °C` : `${s.label} · ${s.to} °C`, cycle: s.cycle, phase: s.phase, ramping: into < s.ramp, frac, done: false };
    }
  }
  return { temp: 4, done: true };
}
export function tempColor(T) {
  if (T >= 90) return '#ff7b72';
  if (T >= 65) return '#7ee787';
  if (T >= 40) return '#79c0ff';
  return '#e6edf3';
}
