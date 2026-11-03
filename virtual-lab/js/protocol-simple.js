// Quick version: the same experiment in 10 steps. The master mix (with loading
// dye) and the agarose gel are prepared in advance, so the presenter performs
// only the key hands-on actions.
import { PROTOCOL as P } from './data.js';
import { buildSteps, transferTasks, spinTasks, evIs, held, loc, amt } from './protocol.js';

export function buildSimpleSteps() {
  const full = Object.fromEntries(buildSteps().map(s => [s.id, s]));
  const E = P.extraction;
  const steps = [];

  steps.push({ ...full.ppe });
  steps.push({ ...full.sample });

  steps.push({
    id: 'q-lysis', module: 'DNA Extraction', station: 's1', title: 'Add buffer and grind',
    what: `Add ${E.bufferVol} µL Edwards extraction buffer to Tube A, then grind the strawberry with the micropestle.`,
    how: ['P1000 → set 400 µL → blue tip → tap the Edwards Buffer tube → Aspirate.', 'Tap Tube A → Dispense → eject the tip.', 'Pick up the micropestle, tap Tube A and rub circles on the grinding pad to 100%.', 'Remove the pestle and close Tube A.'],
    why: 'The buffer\'s SDS dissolves cell membranes, EDTA blocks DNA-cutting enzymes, and grinding breaks the rigid cellulose cell walls so the buffer reaches every cell.',
    molecular: 'Detergent micelles pull the lipid bilayers apart; the nuclear envelope dissolves and long DNA strands unfold into the buffer.',
    see: 'The red tissue disappears and the buffer turns pink with cell sap.',
    mistakes: ['Grinding too little leaves DNA trapped in intact cells.', 'Reusing a tip contaminates the buffer stock.'],
    mol: 'lysis',
    transfers: [{ reagent: 'edwards', to: 'A', vol: E.bufferVol }],
    tasks: [
      ...transferTasks({ pip: 'P1000', vol: E.bufferVol, reagent: 'edwards', to: 'A', label: 'Edwards buffer', toLabel: 'Tube A' }),
      { label: 'Grind with the micropestle to 100%', target: (L) => held(L, 'pestle') || loc(L, 'pestle') === 'in:A' ? 'A' : 'pestle', done: (L) => (L.V('A').tissue?.lysed || 0) >= 1 },
      { label: 'Remove the pestle and close Tube A', target: 'A', done: (L) => (L.V('A').tissue?.lysed || 0) >= 1 && !loc(L, 'pestle')?.startsWith('in:') && L.V('A').cap === true },
    ],
  });

  steps.push({
    id: 'q-clarify', module: 'DNA Extraction', station: 's1', title: 'Spin and keep the supernatant',
    what: `Centrifuge Tube A (balance tube opposite), then move ${E.supVol} µL of the clear supernatant to Tube B.`,
    how: ['Open the centrifuge, place Tube A and the BAL tube opposite each other, close the lid and press Start.', 'Put Tube A back in the rack and open Tubes A and B.', `P1000 → ${E.supVol} µL → fresh tip → aspirate from Tube A (away from the pellet) → dispense into Tube B.`],
    why: 'Spinning pellets the cell walls and SDS-denatured proteins; the DNA stays dissolved in the supernatant.',
    molecular: 'Dense debris sediments under the centrifugal force; long, light, hydrated DNA molecules remain in solution.',
    see: 'A red pellet at the bottom of Tube A; clear pink liquid moves to Tube B.',
    mistakes: ['No balance tube → the rotor shakes and the run is stopped.', 'Touching the pellet carries debris forward.'],
    mol: 'spin-debris',
    spin: { g: E.spin1.g, sec: E.spin1.min * 60 },
    transfers: [{ from: 'A', to: 'B', vol: E.supVol }],
    tasks: [
      ...spinTasks('A', E.spin1.min * 60),
      { label: 'Open Tubes A and B', target: (L) => L.V('A').cap ? 'A' : 'B', done: (L) => (L.V('A').cap === false && L.V('B').cap === false) || L.vol('B') > 10 },
      ...transferTasks({ pip: 'P1000', vol: E.supVol, from: 'A', to: 'B', label: 'supernatant', toLabel: 'Tube B' }),
    ],
  });

  steps.push({
    id: 'q-precip', module: 'DNA Extraction', station: 's1', title: 'Precipitate the DNA',
    what: `Add ${E.isoVol} µL isopropanol to Tube B, close it, invert ${E.inversions}×, then centrifuge ${E.spin2.min} min.`,
    how: [`P1000 → ${E.isoVol} µL → fresh tip → isopropanol → Tube B → eject.`, 'Close Tube B, pick it up and tap Invert ten times.', 'Spin Tube B with the BAL tube opposite.'],
    why: 'Isopropanol makes water a poor solvent for DNA; Na⁺ from the buffer neutralises the phosphate backbone so the DNA strands clump and can be pelleted.',
    molecular: 'The hydration shell collapses, Na⁺ binds the PO₄⁻ groups and thousands of strands aggregate into white threads.',
    see: 'Cloudy white threads after inverting; a small whitish pellet after the spin.',
    mistakes: ['Shaking hard shears the DNA.', 'Inverting an open tube spills the sample.'],
    mol: 'precip',
    spin: { g: E.spin2.g, sec: E.spin2.min * 60 },
    transfers: [{ reagent: 'iso', to: 'B', vol: E.isoVol }],
    tasks: [
      ...transferTasks({ pip: 'P1000', vol: E.isoVol, reagent: 'iso', to: 'B', label: 'isopropanol', toLabel: 'Tube B' }),
      { label: `Close Tube B and invert ${E.inversions}×`, target: 'B', done: (L) => (L.V('B').inversions || 0) >= E.inversions },
      ...spinTasks('B', E.spin2.min * 60),
    ],
  });

  steps.push({
    id: 'q-dissolve', module: 'DNA Extraction', station: 's1', title: 'Pour off, dry and dissolve',
    what: `Remove the isopropanol into the liquid waste, air-dry the pellet, then dissolve it in ${E.teVol} µL TE.`,
    how: ['Put Tube B back in the rack and open it.', 'P1000 → 550 µL → aspirate from Tube B (leave the pellet) → dispense into the LIQUID WASTE beaker → eject.', `Tap Tube B → "Air-dry ${E.dryMin} min".`, `P200 → ${E.teVol} µL TE → Tube B → eject, close and Flick until the pellet dissolves.`],
    why: 'Removing the alcohol leaves pure DNA in the pellet; drying stops ethanol/isopropanol from inhibiting the PCR; TE (pH 8, EDTA) keeps the DNA stable.',
    molecular: 'Water re-hydrates the phosphate backbone and the strands unwind back into solution.',
    see: 'The pellet disappears into a clear solution; the yield card shows your DNA concentration.',
    mistakes: ['Sucking up the pellet throws the DNA away.', 'Skipping the drying leaves alcohol that inhibits Taq.'],
    mol: 'dissolve',
    transfers: [{ from: 'B', to: 'liqwaste1', vol: 550, waste: true }, { reagent: 'te', to: 'B', vol: E.teVol }],
    tasks: [
      { label: 'Remove the supernatant into the liquid waste', target: (L) => L.S.held?.kind === 'pip' && L.S.pip[L.S.held.id].tip && L.S.pip[L.S.held.id].tip.liq && Object.keys(L.S.pip[L.S.held.id].tip.liq).length ? 'liqwaste1' : 'B', done: (L) => L.vol('B') < 120 && L.S.log.some(e => e.type === 'dispense' && e.vid === 'liqwaste1') },
      { label: `Air-dry ${E.dryMin} min`, target: 'B', done: (L) => (L.V('B').dryMin || 0) >= E.dryMin - 0.5 },
      ...transferTasks({ pip: 'P200a', vol: E.teVol, reagent: 'te', to: 'B', label: 'TE buffer', toLabel: 'Tube B' }),
      { label: 'Close and flick until dissolved', target: 'B', done: (L) => { const B = L.V('B'); return amt(L, 'B', 'te') > 10 && B.cap === true && (B.pel.gdna || 0) < 0.15 * ((B.sol.gdna || 0) + (B.pel.gdna || 0)); } },
    ],
  });

  steps.push({
    id: 'q-pcrsetup', module: 'PCR Setup', station: 's2', title: 'Set up three PCR reactions', unordered: true,
    what: `Bring Tube B to the PCR station. Put ${P.pcr.aliquot} µL ready-made master mix into PCR tubes 1–3, then add 1 µL: your DNA → 1, positive control → 2, water → 3.`,
    how: ['Pick up Tube B, switch to "PCR Setup", tap the cold block.', 'Open the PCR strip, the MM tube and Tube B.', `P200 → ${P.pcr.aliquot} µL → aspirate from MM → dispense into tubes 1, 2, 3 (one tip is fine while the tubes are empty).`, 'P2 → 1 µL with a fresh tip each: Tube B → tube 1, +C → tube 2, H₂O → tube 3.'],
    why: 'The master mix already contains buffer, Mg²⁺, dNTPs, both rbcL primers, Taq and loading dye. The positive control proves the PCR works; the water-only tube (NTC) proves nothing was contaminated.',
    molecular: 'Each microlitre of your extract carries thousands of chloroplast genomes, each with one rbcL gene — the starting templates.',
    see: 'Three blue-tinted 25 µL reactions.',
    mistakes: ['Reusing the template tip for the water tube puts DNA into the NTC.', 'Mixing up tubes makes the controls meaningless.'],
    mol: null,
    transfers: [
      ...[1, 2, 3].map(i => ({ from: 'MM', to: `pcr${i}`, vol: P.pcr.aliquot, aliquot: true })),
      { from: 'B', to: 'pcr1', vol: P.pcr.templateVol }, { reagent: 'posctrl', to: 'pcr2', vol: P.pcr.templateVol }, { reagent: 'water', from: 's_water', to: 'pcr3', vol: P.pcr.templateVol },
    ],
    tasks: [
      { label: 'Tube B in the cold block', target: (L) => held(L, 'B') ? 'cold' : 'B', done: (L) => loc(L, 'B')?.startsWith('cold') },
      ...[1, 2, 3].map(i => ({ label: `Tube ${i} ← ${P.pcr.aliquot} µL master mix`, target: (L) => L.V(`pcr${i}`).cap ? 'strip' : 'MM', done: (L) => L.vol(`pcr${i}`) >= P.pcr.aliquot - 1 })),
      { label: 'Tube 1 ← 1 µL your DNA', target: 'B', done: (L) => L.S.log.some(e => e.type === 'dispense' && e.vid === 'pcr1' && e.from === 'B') },
      { label: 'Tube 2 ← 1 µL positive control', target: 's_pos', done: (L) => amt(L, 'pcr2', 'posctrl') >= 0.9 },
      { label: 'Tube 3 ← 1 µL water (NTC)', target: 's_water', done: (L) => L.S.log.some(e => e.type === 'dispense' && e.vid === 'pcr3' && e.from === 's_water') },
    ],
  });

  steps.push({
    id: 'q-cycle', module: 'Thermocycling', station: 's3', title: 'Run the PCR',
    what: 'Close the strip, put it in the thermocycler and start the program (already loaded).',
    how: ['Tap the strip → Close caps, pick it up.', 'Switch to "Thermocycler", tap it → Open lid, tap the block to place the strip, close the lid.', 'Tap the thermocycler → Start run. Use ×120 or ×300 speed.'],
    why: `Each cycle — ${P.cycler.den.t} °C to separate the strands, ${P.cycler.ann.t} °C for the primers to bind, ${P.cycler.ext.t} °C for Taq to copy — can double the target, so ${P.cycler.cycles} cycles turn thousands of copies into ~10¹².`,
    molecular: 'Watch the molecular view: the helix melts, primers dock on each strand, and Taq extends them base by base.',
    see: 'The block steps through 95 → 55 → 72 °C and the cycle counter climbs to 35.',
    mistakes: ['Open caps evaporate at 95 °C.', 'Opening the lid mid-run aborts the program.'],
    mol: 'pcr',
    tasks: [
      { label: 'Close the strip caps', target: 'strip', done: (L) => L.V('pcr1').cap === true },
      { label: 'Strip in the thermocycler, lid closed', target: (L) => held(L, 'strip') ? 'cycler' : loc(L, 'strip') === 'tc-block' ? 'cycler' : 'strip', done: (L) => loc(L, 'strip') === 'tc-block' && !L.S.inst.tc.lid },
      { label: 'Start the run', target: 'cycler', ev: evIs('tcStart') },
      { label: 'Run complete', ev: evIs('tcDone') },
    ],
  });

  steps.push({
    id: 'q-load', module: 'Electrophoresis', station: 's4', title: 'Load the gel',
    what: `Bring the strip to the gel station and load: well 1 ← ${P.gel.ladderVol} µL ladder, wells 2–4 ← ${P.gel.loadVol} µL of tubes 1, 2, 3.`,
    how: ['Thermocycler → Open lid, pick up the strip, switch to "Electrophoresis", tap the PCR rack.', 'Open the strip and the LAD tube.', 'P20, fresh tip for every lane: aspirate, tap the well, dispense (first stop only), eject.'],
    why: 'The gel is already cast and submerged in TAE with the wells at the black (−) end. The samples already contain loading dye, so they sink into the wells. The ladder is the size ruler.',
    molecular: 'Glycerol in the dye makes the sample denser than the buffer, so it settles as a thin layer in the well.',
    see: 'Blue sample in wells 1–4.',
    mistakes: ['Wrong lane order → wrong interpretation.', 'Piercing the well bottom → the sample leaks under the gel.'],
    mol: 'gel-mesh',
    unordered: true,
    transfers: [{ from: 'LAD', reagent: 'ladder', to: 'well1', vol: P.gel.ladderVol }, { from: 'pcr1', to: 'well2', vol: P.gel.loadVol }, { from: 'pcr2', to: 'well3', vol: P.gel.loadVol }, { from: 'pcr3', to: 'well4', vol: P.gel.loadVol }],
    tasks: [
      { label: 'Strip in the electrophoresis PCR rack', target: (L) => held(L, 'strip') ? 'pcrrack4' : 'strip', done: (L) => loc(L, 'strip') === 'pcrrack4' },
      { label: `Well 1 ← ${P.gel.ladderVol} µL ladder`, target: 'LAD', done: (L) => amt(L, 'well1', 'ladder') >= P.gel.ladderVol * 0.85 },
      { label: 'Well 2 ← tube 1 (your DNA)', target: 'strip', done: (L) => L.S.log.some(e => e.type === 'dispense' && e.vid === 'well2' && e.from === 'pcr1') },
      { label: 'Well 3 ← tube 2 (+ control)', target: 'strip', done: (L) => L.S.log.some(e => e.type === 'dispense' && e.vid === 'well3' && e.from === 'pcr2') },
      { label: 'Well 4 ← tube 3 (NTC)', target: 'strip', done: (L) => L.S.log.some(e => e.type === 'dispense' && e.vid === 'well4' && e.from === 'pcr3') },
    ],
  });

  steps.push({
    id: 'q-run', module: 'Results', station: 's4', title: 'Run the gel and read the bands',
    what: `Run the gel at ${P.gel.volts} V, move it to the blue-light transilluminator and analyse the bands.`,
    how: ['Tap the tank → Lid on. Tap the power supply → Black → black, Red → red → Start.', 'When it stops, take the lid off, pick up the gel and tap the transilluminator.', 'Tap the transilluminator → Lower amber shield → Light ON → Analyse gel.'],
    why: 'DNA is negatively charged and runs toward red (+). Small fragments move faster through the agarose pores, so the bands separate by size; SYBR Safe makes them glow.',
    molecular: 'Compare with the ladder: a band between the 500 and 600 bp rungs is the ≈580 bp rbcL product.',
    see: 'Ladder rungs in lane 1, a bright band in lanes 2 and 3, nothing in lane 4.',
    mistakes: ['Reversed leads → DNA runs out of the wells.', 'Viewing without the amber shield washes out the bands.'],
    mol: 'gel-run',
    tasks: [
      { label: 'Lid on and leads connected', target: (L) => L.S.inst.chamberLid ? 'power' : 'chamber', done: (L) => (L.S.inst.chamberLid && L.S.inst.ps.leads !== 'none') || L.S.gel.runVmin > 0 },
      { label: 'Start the run', target: 'power', ev: evIs('psStart') },
      { label: 'Run finished', done: (L) => L.S.gel.runVmin >= P.gel.volts * P.gel.min * 0.85 && !L.S.inst.ps.on },
      { label: 'Gel on the transilluminator', target: (L) => held(L, 'tray') ? 'trans' : (L.S.inst.chamberLid ? 'chamber' : 'tray'), done: (L) => loc(L, 'tray') === 'trans' },
      { label: 'Amber shield down, light on', target: 'trans', done: (L) => L.S.inst.trans.shield && L.S.inst.trans.on },
      { label: 'Analyse the gel', done: (L) => !!L.S.flags.analysed },
    ],
  });

  return steps;
}

// State prepared in advance for the quick version.
export function applySimplePresets(S, PRESET_P = P) {
  const pc = PRESET_P.pcr, n = 4, dye = 4; // µL 6× dye per 25 µL reaction ≈ 1×
  const per = { buffer10x: 2.5, mgcl2: 1.5, dntp: 0.5, fwd: 0.5, rev: 0.5, taq: 0.125, dye6x: dye };
  const used = Object.values(per).reduce((a, b) => a + b, 0);
  per.water = pc.aliquot - used;
  S.vessels.MM.liq = Object.fromEntries(Object.entries(per).map(([k, v]) => [k, +(v * n).toFixed(3)]));
  S.vessels.MM.mixed = true;
  S.items.tray.loc = 'chamber';
  S.gel = { ...S.gel, poured: PRESET_P.gel.castVol, pouredAt: 0, solid: 1, wells: 'back', combOut: true, buffer: 350 };
  S.vessels.flask.liq.agarose -= PRESET_P.gel.castVol * 1000;
  S.vessels.taebottle.liq.tae -= 350 * 1000;
  S.inst.tc.program = JSON.parse(JSON.stringify(PRESET_P.cycler));
  S.calc.confirmed = true;
}
