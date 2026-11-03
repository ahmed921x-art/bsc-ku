// Pure scientific models: reaction composition, PCR amplification, gel migration.
import { PROTOCOL, LADDER_100 } from './data.js';

export const sumLiq = (liq) => Object.values(liq || {}).reduce((a, b) => a + b, 0);

// Final concentrations in a PCR tube from what was actually pipetted into it.
export function reactionComposition(v) {
  const L = v.liq || {}, total = sumLiq(L);
  const c = { total };
  const f = (id) => (L[id] || 0);
  c.buffer = total ? f('buffer10x') * 10 / total : 0;                 // × (1 = correct)
  c.mg = total ? f('mgcl2') * 25 / total : 0;                         // mM
  c.dntp = total ? f('dntp') * 10 * 1000 / total : 0;                 // µM each
  c.fwd = total ? f('fwd') * 10 / total : 0;                          // µM
  c.rev = total ? f('rev') * 10 / total : 0;                          // µM
  c.taq = f('taq') * 5;                                               // U in tube
  c.posNg = f('posctrl') * 10;
  c.gdnaNg = (v.sol?.gdna || 0) + (v.sol?.gppt || 0) * 0.3;           // precipitate barely accessible
  c.templateNg = c.posNg + c.gdnaNg;
  c.ethanolPct = total ? (f('etoh70') * 0.7 + f('iso')) / total * 100 : 0;
  c.sdsPct = total ? f('edwards') * 0.5 / total : 0;                  // % w/v SDS
  c.glycerolPct = total ? (f('taq') * 50 + f('dye6x') * 30) / total : 0;
  c.debris = v.sol?.debris || 0;
  return c;
}

// Check a reaction against the protocol; returns rows used by the verification panel.
export function verifyReaction(v, role) {
  const c = reactionComposition(v), P = PROTOCOL.pcr;
  const rows = [];
  const add = (label, value, unit, ok, note) => rows.push({ label, value, unit, ok, note });
  add('Reaction volume', c.total.toFixed(2), 'µL', Math.abs(c.total - P.rxnVol) <= 1, `target ${P.rxnVol} µL`);
  add('PCR buffer', c.buffer.toFixed(2), '×', c.buffer >= 0.8 && c.buffer <= 1.2, 'target 1×');
  add('MgCl₂', c.mg.toFixed(2), 'mM', c.mg >= 1.0 && c.mg <= 3.0, 'optimal 1.5–2.0 mM');
  add('dNTPs (each)', c.dntp.toFixed(0), 'µM', c.dntp >= 100 && c.dntp <= 400, 'typical 200 µM');
  add('Forward primer', c.fwd.toFixed(2), 'µM', c.fwd >= 0.05 && c.fwd <= 1, 'typical 0.1–0.5 µM');
  add('Reverse primer', c.rev.toFixed(2), 'µM', c.rev >= 0.05 && c.rev <= 1, 'typical 0.1–0.5 µM');
  add('Taq polymerase', c.taq.toFixed(3), 'U', c.taq >= 0.3 && c.taq <= 1.5, '0.625 U / 25 µL');
  if (role === 'ntc') add('Template', c.templateNg.toFixed(2), 'ng', c.templateNg < 0.001, 'must be NONE (no-template control)');
  else add('Template DNA', c.templateNg.toFixed(1), 'ng', c.templateNg >= 0.5 && c.templateNg <= 200, '1–100 ng genomic DNA');
  return { rows, ok: rows.every(r => r.ok), comp: c };
}

// Simulate amplification for one tube with a given thermocycler program.
export function simulatePCR(v, prog, role) {
  const M = PROTOCOL.model;
  const c = reactionComposition(v);
  const notes = [];
  let E = M.efficiency;
  const fac = {};
  // buffer: Tris/KCl provide pH and ionic strength
  fac.buffer = c.buffer < 0.2 ? 0.25 : c.buffer < 0.6 ? 0.7 : c.buffer > 2 ? 0.6 : 1;
  if (fac.buffer < 1) notes.push(c.buffer < 0.2 ? 'No PCR buffer: wrong pH and ionic strength, Taq works poorly.' : 'Buffer concentration off-target: reduced efficiency.');
  // Mg2+ is an essential cofactor of the polymerase
  fac.mg = c.mg < 0.3 ? 0 : c.mg < 0.9 ? 0.45 : c.mg <= 3 ? 1 : c.mg <= 5 ? 0.85 : 0.5;
  if (c.mg < 0.3) notes.push('No Mg²⁺: Taq cannot catalyse phosphodiester bond formation, so no product forms.');
  else if (c.mg > 3) notes.push('Excess Mg²⁺ stabilises mismatched primer binding: extra non-specific bands.');
  fac.dntp = c.dntp < 5 ? 0 : c.dntp < 50 ? 0.5 : c.dntp <= 500 ? 1 : 0.7;
  if (c.dntp < 5) notes.push('No dNTPs: there are no building blocks for new strands.');
  const primerOk = (x) => x < 0.005 ? 0 : x < 0.04 ? 0.6 : x <= 1.2 ? 1 : 0.8;
  fac.primers = Math.min(primerOk(c.fwd), primerOk(c.rev));
  if (c.fwd < 0.005 || c.rev < 0.005) notes.push(`Missing ${c.fwd < 0.005 ? 'forward' : 'reverse'} primer: only linear (one-sided) copying is possible, no exponential product.`);
  fac.taq = c.taq < 0.01 ? 0 : c.taq < 0.2 ? 0.5 : c.taq <= 2 ? 1 : 0.9;
  if (c.taq < 0.01) notes.push('No Taq polymerase: nothing extends the primers.');
  // inhibitors carried over from the extraction
  fac.inhib = (c.ethanolPct > 5 ? 0.2 : c.ethanolPct > 1 ? 0.7 : 1) * (c.sdsPct > 0.01 ? 0.3 : 1) * (c.debris > 0.5 ? 0.6 : 1);
  if (c.ethanolPct > 1) notes.push(`Ethanol carry-over (${c.ethanolPct.toFixed(1)}%) inhibits Taq.`);
  if (c.sdsPct > 0.01) notes.push('SDS carry-over denatures Taq.');
  // program
  const den = prog.den.t, ann = prog.ann.t, ext = prog.ext.t;
  fac.den = den >= 92 ? 1 : den >= 88 ? 0.55 : den >= 85 ? 0.15 : 0;
  if (den < 92) notes.push(`Denaturation at ${den} °C is too cool to fully separate the strands.`);
  const optimal = 55;
  fac.ann = ann > 66 ? 0.02 : ann > 62 ? 0.3 : ann >= 50 ? 1 : ann >= 45 ? 0.95 : 0.8;
  if (ann > 62) notes.push(`Annealing at ${ann} °C is above the primers' melting temperature: primers cannot stay bound.`);
  const spec = ann < 45 ? 'low' : ann < 50 ? 'medium' : 'high';
  if (ann < 50) notes.push(`Annealing at ${ann} °C is permissive: primers also bind partially matched sites.`);
  const extRate = 1000 / 60; // bp per second for Taq at 72 °C
  const needed = M.ampliconBp / extRate;
  fac.ext = (ext >= 65 && ext <= 75 ? 1 : ext >= 60 ? 0.6 : 0.2) * Math.min(1, prog.ext.s / needed);
  if (prog.ext.s < needed) notes.push(`Extension of ${prog.ext.s} s is shorter than the ≈${Math.ceil(needed)} s Taq needs to copy ${M.ampliconBp} bp.`);
  fac.init = prog.init.s >= 30 ? 1 : 0.85;
  E *= fac.buffer * fac.mg * fac.dntp * fac.primers * fac.taq * fac.inhib * fac.den * fac.ann * fac.ext;
  E = Math.max(0, Math.min(1, E));

  const cpCopiesPerNg = 1 / (M.cpGenomeBp * 650 / 6.022e23 * 1e9);
  const plantNg = c.templateNg;
  const N0 = plantNg * M.cpFraction * cpCopiesPerNg;
  // plateau limited by reagents
  const primerCopies = Math.min(c.fwd, c.rev) * 1e-6 * (c.total * 1e-6) * 6.022e23;
  const dntpCopies = c.dntp * 1e-6 * 4 * (c.total * 1e-6) * 6.022e23 / (2 * M.ampliconBp);
  const enzymeCap = M.nmaxCopies * Math.min(1, c.taq / 0.625);
  const Nmax = Math.max(1, Math.min(enzymeCap, primerCopies * 0.5, dntpCopies * 0.6));
  const curve = [N0];
  let N = N0;
  for (let i = 0; i < prog.cycles; i++) {
    N = N * (1 + E * Math.max(0, 1 - N / Nmax));
    curve.push(N);
  }
  const ngPerCopy = M.ampliconBp * 650 / 6.022e23 * 1e9;
  const products = [];
  const mainNg = N0 > 0 ? (N - N0) * ngPerCopy : 0;
  if (mainNg > 0.01) products.push({ bp: M.ampliconBp, ng: mainNg });
  // primer dimers: form when primers + Taq present, larger when little template
  if (fac.primers > 0 && fac.taq > 0 && fac.mg > 0 && fac.dntp > 0 && prog.cycles > 20) {
    const dimer = (N0 < 1e3 ? 6 : 1.5) * (spec === 'low' ? 2 : 1) * Math.min(1, prog.cycles / 35);
    products.push({ bp: 55, ng: dimer, diffuse: true });
  }
  if (N0 > 0 && E > 0.05 && (spec !== 'high' || c.mg > 3)) {
    const k = spec === 'low' ? 0.35 : spec === 'medium' ? 0.12 : 0.08;
    products.push({ bp: 320, ng: mainNg * k }); products.push({ bp: 960, ng: mainNg * k * 0.6 });
    if (spec === 'low') products.push({ bp: 0, ng: mainNg * 0.2, smear: true });
  }
  if (prog.cycles > 40 && mainNg > 50) products.push({ bp: 0, ng: mainNg * 0.1, smear: true });
  return { N0, N, Nmax, E, curve, products, notes, fac, comp: c, role };
}

// Relative mobility (fraction of the standard run distance) for a fragment size.
export function mobility(bp, pct = PROTOCOL.gel.pct) {
  const base = 1.85 - 0.5 * Math.log10(Math.max(bp, 20));
  return Math.max(0.02, base * Math.pow(1.5 / pct, 0.35));
}
export const DYE_FRONTS = [{ name: 'Bromophenol blue', eqBp: 300, color: 'rgba(70,60,200,' }, { name: 'Xylene cyanol', eqBp: 4000, color: 'rgba(40,120,190,' }];
export const STANDARD_RUN = 100 * 35; // V·min that moves a fragment its full mobility

// Bands present in one well, given what was loaded.
export function laneBands(well) {
  const bands = [];
  const L = well.liq || {}, sol = well.sol || {};
  if (L.ladder) for (const b of LADDER_100) bands.push({ bp: b.bp, ng: b.ng * L.ladder / 5 });
  for (const [k, ng] of Object.entries(sol)) {
    if (k.startsWith('amp:')) bands.push({ bp: +k.slice(4), ng });
    if (k === 'smear') bands.push({ bp: 0, ng, smear: true });
    if (k === 'dimer') bands.push({ bp: 55, ng, diffuse: true });
  }
  const g = (sol.gdna || 0) + (sol.gppt || 0);
  if (g > 0.5) bands.push({ bp: 20000, ng: g, genomic: true });
  if (L.posctrl) bands.push({ bp: 20000, ng: L.posctrl * 10, genomic: true });
  return bands;
}

// Estimate fragment size from migration using the ladder (log-linear interpolation).
export function estimateSize(dist, ladderDists) {
  const pts = ladderDists.filter(p => p.d > 0).sort((a, b) => a.d - b.d);
  for (let i = 1; i < pts.length; i++) {
    if (dist >= pts[i - 1].d && dist <= pts[i].d) {
      const t = (dist - pts[i - 1].d) / (pts[i].d - pts[i - 1].d);
      return Math.round(Math.pow(10, Math.log10(pts[i - 1].bp) + t * (Math.log10(pts[i].bp) - Math.log10(pts[i - 1].bp))));
    }
  }
  return null;
}
