// Workflow engine: tracks the current step, evaluates checklists from lab
// events/state, and turns rule violations into explained mistakes.
import { buildSteps, programMatches } from './protocol.js';
import { PROTOCOL as P, REAGENTS } from './data.js';

const tolFor = (v) => Math.max(0.05, v * 0.04);

export class Engine {
  constructor(lab, bus) {
    this.lab = lab; this.bus = bus;
    this.steps = buildSteps();
    this.idx = 0;
    this.sticky = this.steps.map(() => new Set());
    this.completed = new Set();
    this.mistakes = [];
    bus.on('lab', (ev) => this.onEvent(ev));
  }
  get step() { return this.steps[this.idx]; }
  tasks(i = this.idx) {
    const st = this.steps[i];
    const raw = st.tasks.map((t, k) => {
      let done = this.sticky[i].has(k);
      if (!done && t.done) { try { done = !!t.done(this.lab); } catch (e) { done = false; } }
      return { label: t.label, done };
    });
    // In an ordered checklist a later completed item implies the earlier ones were done.
    if (!st.unordered) { let later = false; for (let k = raw.length - 1; k >= 0; k--) { if (later) raw[k].done = true; if (raw[k].done) later = true; } }
    return raw;
  }
  // Object the presenter should touch next (first open checklist item with a target).
  hintTarget() {
    const st = this.step, ts = this.tasks();
    for (let k = 0; k < ts.length; k++) {
      if (ts[k].done) continue;
      let t = st.tasks[k].target;
      if (typeof t === 'function') t = t(this.lab);
      if (!t) { if (st.unordered) continue; return null; }
      const v = this.lab.w.vessels[t];
      const id = v ? v.objId : t;
      if (this.lab.S.held?.id === id) return null;
      return id;
    }
    return null;
  }
  onEvent(ev) {
    if (ev.type === 'undo') {
      // re-derive sticky flags for current step from scratch after undo
      this.sticky[this.idx] = new Set();
      this.completed.delete(this.idx);
    }
    const st = this.step;
    st.tasks.forEach((t, k) => { if (t.ev && t.ev(ev, this.lab)) this.sticky[this.idx].add(k); });
    const ts = this.tasks();
    const all = ts.every(t => t.done);
    if (all && !this.completed.has(this.idx)) {
      this.completed.add(this.idx);
      this.bus.emit('stepComplete', { idx: this.idx, step: st });
    }
    this.bus.emit('stepUpdate', {});
  }
  isComplete(i = this.idx) { return this.completed.has(i); }
  goto(i) {
    if (i < 0 || i >= this.steps.length) return;
    this.idx = i;
    this.bus.emit('stepChange', { idx: i, step: this.step });
    this.onEvent({ type: 'enter' });
  }
  next() { this.goto(this.idx + 1); }
  prev() { this.goto(this.idx - 1); }
  refresh() { // protocol edited: rebuild step text/expectations, keep progress
    const idx = this.idx; this.steps = buildSteps();
    while (this.sticky.length < this.steps.length) this.sticky.push(new Set());
    this.idx = idx; this.bus.emit('stepChange', { idx, step: this.step });
  }

  mistake(def) {
    if (!def) return null;
    this.mistakes.push({ ...def, step: this.step.id, t: this.lab.S.t });
    this.bus.emit('mistake', def);
    return def;
  }

  // Called by the lab before applying an action. Returns a mistake def or null.
  check(kind, ctx) {
    const st = this.step, L = this.lab;
    const own = st.check ? st.check(kind, ctx, L) : null;
    if (own) return own;
    const specs = st.transfers || [];
    if (kind === 'aspirate' && specs.length) {
      const spec = specs.find(s => s.from ? s.from === ctx.vid : s.reagent === ctx.reagent);
      if (spec && !spec.waste && Math.abs(ctx.vol - spec.vol) > tolFor(spec.vol)) {
        const tooBig = ctx.vol > spec.vol;
        return { id: 'wrong-volume', title: 'Pipette set to the wrong volume', block: true,
          what: `The ${ctx.ptype} is set to ${ctx.vol} µL, but this step needs ${spec.vol} µL of ${spec.from ? L.vesselLabel(spec.from) : REAGENTS[spec.reagent].short}.`,
          why: volumeConsequence(spec, tooBig),
          fix: `Adjust the volume dial to ${spec.vol} µL before aspirating.` };
      }
      if (!spec && !L.w.vessels[ctx.vid]?.waste && st.id !== 'spin1' && !['st_water1'].includes(ctx.vid)) {
        L.toast(`${L.vesselLabel(ctx.vid)} is not part of this step — check the instruction.`, 'warn');
      }
    }
    if (kind === 'dispense' && specs.length) {
      const vd = L.w.vessels[ctx.vid];
      if (vd?.waste) return null;
      if (ctx.vid === 'BAL') return null;
      const forDest = specs.filter(s => s.to === ctx.vid);
      if (!forDest.length) {
        return { id: 'wrong-destination', title: 'Dispensed into the wrong vessel', undoable: true,
          what: `You dispensed ${ctx.vol.toFixed(ctx.vol < 10 ? 2 : 0)} µL of ${REAGENTS[ctx.reagent]?.short || 'liquid'} into ${L.vesselLabel(ctx.vid)}.`,
          why: destinationConsequence(ctx, L),
          fix: `Undo. This step's destination${specs.length > 1 ? 's are' : ' is'} ${[...new Set(specs.filter(s => !s.waste).map(s => L.vesselLabel(s.to)))].join(', ')}.` };
      }
      const spec = forDest.find(s => s.from ? s.from === ctx.source : s.reagent === ctx.reagent);
      if (!spec && ctx.vid.startsWith('well')) {
        const expected = forDest[0];
        return { id: 'wrong-lane', title: 'Sample loaded into the wrong lane', undoable: true,
          what: `${L.vesselLabel(ctx.vid)} should receive ${L.vesselLabel(expected.from)}, but you loaded ${L.vesselLabel(ctx.source)}.`,
          why: 'Lane order is how you identify samples on the finished gel. A swapped lane means the ladder or controls end up where you expect your sample, and the result is misread.',
          fix: 'Undo and load the lane plan: 1 ladder · 2 sample · 3 positive control · 4 NTC.' };
      }
      if (!spec && forDest.length && !forDest.some(s => s.aliquot)) {
        return { id: 'wrong-reagent', title: 'Wrong reagent for this tube', undoable: true,
          what: `${L.vesselLabel(ctx.vid)} should receive ${forDest.map(s => s.from ? L.vesselLabel(s.from) : REAGENTS[s.reagent].short).join(' / ')}, not ${REAGENTS[ctx.reagent]?.short || L.vesselLabel(ctx.source)}.`,
          why: 'Each tube has a defined role. Putting the wrong liquid in changes its chemistry or its control function — e.g. DNA in the no-template control makes it useless for detecting contamination.',
          fix: 'Undo and check which stock you are drawing from.' };
      }
      if (spec && spec.reagent && !spec.from) {
        const after = (L.V(ctx.vid).liq[ctx.reagent] || 0) + ctx.vol;
        if (after > spec.vol + tolFor(spec.vol) * 1.5) {
          return { id: 'too-much', title: 'Too much added', undoable: true,
            what: `${L.vesselLabel(ctx.vid)} would contain ${after.toFixed(2)} µL ${REAGENTS[ctx.reagent].short}; the protocol needs ${spec.vol} µL.`,
            why: volumeConsequence(spec, true),
            fix: 'Undo the extra addition.' };
        }
      }
    }
    if (kind === 'centrifuge' && st.spin) {
      if (ctx.g < st.spin.g * 0.6 || ctx.sec < st.spin.sec * 0.5) {
        return { id: 'spin-weak', title: 'Spin too gentle or too short', undoable: true,
          what: `You set ${ctx.g.toLocaleString()} × g for ${Math.round(ctx.sec)} s; the protocol uses ${st.spin.g.toLocaleString()} × g for ${st.spin.sec} s.`,
          why: 'Sedimentation depends on force × time. Too little and the debris (or the DNA precipitate) stays suspended, so it is carried forward (debris) or discarded (DNA).',
          fix: 'Undo and set the protocol speed and time.' };
      }
    }
    if (kind === 'tcStart') {
      const p = ctx.program, c = P.cycler;
      if (!programMatches(p)) {
        const issues = [];
        if (p.den.t < 92 || p.init.t < 92) issues.push(`Denaturation at ${Math.min(p.den.t, p.init.t)} °C may not fully separate the strands (use ${c.den.t} °C).`);
        if (p.ann.t > c.ann.t + 5) issues.push(`Annealing at ${p.ann.t} °C is above the primers' Tm — they will not bind.`);
        if (p.ann.t < c.ann.t - 5) issues.push(`Annealing at ${p.ann.t} °C is permissive — expect extra non-specific bands.`);
        if (p.ext.s < P.model.ampliconBp / (1000 / 60)) issues.push(`Extension of ${p.ext.s} s is too short for ${P.model.ampliconBp} bp.`);
        if (p.ext.t < 65 || p.ext.t > 75) issues.push(`Extension at ${p.ext.t} °C is far from Taq's 72 °C optimum.`);
        if (p.cycles < 25) issues.push(`${p.cycles} cycles may give too little product to see.`);
        if (p.cycles > 40) issues.push(`${p.cycles} cycles go far past the plateau — expect smears and artefacts.`);
        if (!issues.length) issues.push('Some times or temperatures differ from the protocol.');
        return { id: 'program-mismatch', title: 'Program differs from the protocol', undoable: true,
          what: issues.join(' '),
          why: 'Each PCR step is tuned to the primers and product: denaturation must melt the 580 bp product, annealing must sit just below primer Tm, and extension must give Taq time to copy the whole product.',
          fix: 'Undo and correct the program — or continue to see what this program actually produces.' };
      }
    }
    return null;
  }
}

function volumeConsequence(spec, tooBig) {
  const r = spec.reagent;
  const map = {
    edwards: tooBig ? 'More buffer dilutes the DNA and changes the isopropanol ratio later.' : 'Too little buffer cannot lyse the tissue fully and its EDTA cannot protect the DNA.',
    iso: tooBig ? 'Extra isopropanol co-precipitates more salt, which then inhibits PCR.' : 'Below ~0.7 volumes, isopropanol does not precipitate DNA completely — yield drops.',
    etoh70: 'The wash volume is less critical, but keeping it equal to the protocol keeps the balance tube matched.',
    te: tooBig ? 'The DNA will be more dilute.' : 'The pellet may not dissolve completely in a smaller volume.',
    mgcl2: 'Mg²⁺ concentration controls polymerase activity and primer specificity: too little → no product; too much → non-specific bands.',
    taq: tooBig ? 'Excess enzyme (and glycerol) increases non-specific products.' : 'Too little enzyme → weak amplification.',
    dntp: 'dNTPs chelate Mg²⁺; changing them changes free Mg²⁺ and fidelity.',
    fwd: 'Primer concentration affects specificity and primer-dimer formation.', rev: 'Primer concentration affects specificity and primer-dimer formation.',
    buffer10x: 'The buffer sets pH and K⁺; 1× is required for Taq to work properly.',
    water: 'Water sets the final volume, so every concentration in the reaction depends on it.',
    dye6x: 'The dye-to-sample ratio sets sample density; too little and the sample floats out of the well.',
  };
  return map[r] || (spec.from ? 'Transferring a different volume changes how much of the sample moves forward and risks disturbing the pellet.' : 'Every downstream concentration depends on this volume.');
}
function destinationConsequence(ctx, L) {
  if (ctx.vid.startsWith('pcr')) return 'PCR tubes must contain exactly the planned components. An extra reagent changes concentrations and may contaminate a control.';
  if (L.w.vessels[ctx.vid]?.stock) return 'You added liquid into a shared stock. That stock is now contaminated and must be discarded — everyone using it would carry your reagent into their experiment.';
  return 'The liquid is now in a tube where it does not belong, changing that tube\'s composition.';
}
