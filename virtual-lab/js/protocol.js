// The experiment: every step with instructor content, a live checklist and
// step-specific checks. Volumes come from PROTOCOL so editing the protocol
// changes what the instructor asks for and what the checks accept.
import { PROTOCOL as P, REAGENTS, masterMix } from './data.js';
import { sumLiq } from './sim.js';

const amt = (L, vid, r) => L.V(vid)?.liq[r] || 0;
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const tolFor = (v) => Math.max(0.05, v * 0.04);
const held = (L, id) => L.S.held?.id === id;
const loc = (L, id) => L.S.items[id]?.loc;
const evIs = (type, f = () => true) => (ev, L) => ev.type === type && f(ev, L);
const pipName = (id) => ({ P1000: 'P1000', P200a: 'P200', P200: 'P200', P20: 'P20', P2: 'P2', P20g: 'P20' }[id]);

// Builds the standard checklist for one pipetting transfer.
const TIPBOX = { P1000: 'tb1000', P200a: 'tb200a', P200: 'tb200', P20: 'tb10', P2: 'tb10', P20g: 'tb200g' };
const WASTE = { P1000: 'tipwaste1', P200a: 'tipwaste1', P200: 'tipwaste2', P20: 'tipwaste2', P2: 'tipwaste2', P20g: 'tipwaste4' };
const STOCK_OF = { edwards: 'st_edwards', iso: 'st_iso', etoh70: 'st_etoh', te: 'st_te', buffer10x: 's_buffer', mgcl2: 's_mg', dntp: 's_dntp', fwd: 's_fwd', rev: 's_rev', taq: 's_taq', posctrl: 's_pos', dye6x: 'DYE', ladder: 'LAD' };
function transferTasks({ pip, vol, reagent, from, to, label, toLabel }) {
  const src = from || STOCK_OF[reagent];
  const tol = tolFor(vol);
  const doneAmt = (L) => {
    if (reagent) return amt(L, to, reagent) >= vol - tol;
    return L.S.log.reduce((a, e) => a + (e.type === 'dispense' && e.vid === to && e.from === from ? e.vol : 0), 0) >= vol - tol;
  };
  return [
    { label: `Pick up the ${pipName(pip)}`, done: (L) => held(L, pip) || doneAmt(L), target: pip },
    { label: `Set the volume to ${vol} µL`, done: (L) => near(L.S.pip[pip].vol, vol, tol / 2) || doneAmt(L) },
    { label: 'Attach a fresh tip', done: (L) => !!L.S.pip[pip].tip || doneAmt(L), target: TIPBOX[pip] },
    { label: `Aspirate ${vol} µL of ${label}`, ev: evIs('aspirate', (e) => e.id === pip && (reagent ? e.reagent === reagent || e.vid === from : e.vid === from)), done: doneAmt, target: src },
    { label: `Dispense into ${toLabel}`, done: doneAmt, target: to },
    { label: 'Eject the tip into the tip waste', ev: evIs('ejectTip', (e, L) => e.id === pip && doneAmt(L)), done: (L) => doneAmt(L) && !L.S.pip[pip].tip && L.S.held?.id !== pip, target: WASTE[pip] },
  ];
}

function spinTasks(tube, sec) {
  return [
    { label: 'Open the centrifuge lid', target: 'centrifuge', done: (L) => L.S.inst.cfg.lid || L.S.log.some(e => e.type === 'cfgDone' && e.tubes.includes(tube)) },
    { label: `Place ${tube === 'A' ? 'Tube A' : 'Tube B'} in the rotor`, target: (L) => held(L, tube) ? 'centrifuge' : tube, done: (L) => loc(L, tube)?.startsWith('cfg#') || L.S.log.some(e => e.type === 'cfgDone' && e.tubes.includes(tube)) },
    { label: 'Place the BAL tube directly opposite', target: (L) => held(L, 'BAL') ? 'centrifuge' : 'BAL', done: (L) => { const a = loc(L, tube), b = loc(L, 'BAL'); return (a?.startsWith('cfg#') && b?.startsWith('cfg#') && (+a.slice(4) + 6) % 12 === +b.slice(4)) || L.S.log.some(e => e.type === 'cfgDone' && e.tubes.includes(tube)); } },
    { label: 'Close the lid', target: 'centrifuge', done: (L) => !L.S.inst.cfg.lid && loc(L, tube)?.startsWith('cfg#') || L.S.log.some(e => e.type === 'cfgDone' && e.tubes.includes(tube)) },
    { target: 'centrifuge', label: `Set 13,000 × g for ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')} and press Start`, ev: evIs('cfgStart', (e) => e.tubes.includes(tube)) },
    { label: 'Wait for the rotor to stop', ev: evIs('cfgDone', (e) => e.tubes.includes(tube)) },
  ];
}

const W = (s) => s; // marker for instructor prose

export function buildSteps() {
  const E = P.extraction, mm = masterMix();
  const mmRow = (id) => mm.rows.find(r => r.id === id);
  const steps = [];

  // ------------------------------------------------------------- SAFETY
  steps.push({
    id: 'ppe', unordered: true, module: 'Safety', station: 'ppe', title: 'Gown up: personal protective equipment',
    what: 'Put on your lab coat, nitrile gloves and safety goggles.',
    how: ['Tap the lab coat hanging on the wall hook.', 'Tap the glove box to put on nitrile gloves.', 'Tap the goggles on the bench.'],
    why: W('You will handle SDS (a detergent that irritates skin and eyes), flammable isopropanol, and a DNA stain. Gloves also protect the experiment: skin carries nucleases and human DNA that can degrade or contaminate samples.'),
    molecular: W('Human skin cells shed DNA and DNase I-like enzymes. A single skin flake contains thousands of genome copies — enough to give a false signal in a sensitive PCR.'),
    see: 'The PPE icons in the top bar turn green as each item is worn.',
    mistakes: ['Working without gloves contaminates samples with your own DNA and nucleases.', 'Wearing gloves outside the lab spreads contamination to door handles and phones.'],
    mol: null,
    tasks: [
      { label: 'Lab coat', done: (L) => L.S.ppe.coat, target: 'coat' },
      { label: 'Nitrile gloves', done: (L) => L.S.ppe.gloves, target: 'gloves' },
      { label: 'Safety goggles', done: (L) => L.S.ppe.goggles, target: 'goggles' },
    ],
  });

  // ------------------------------------------------------------- EXTRACTION
  steps.push({
    id: 'sample', module: 'DNA Extraction', station: 's1', title: 'Prepare the strawberry sample',
    what: `Cut a small piece of strawberry, weigh ${E.tissueMin}–${E.tissueMax} mg, and put it into Tube A.`,
    how: ['Tap the strawberry and choose "Cut sample" — the green calyx is removed and a piece of flesh is cut.', 'Drag the piece onto the balance pan and read the mass.', 'If it is too heavy, use "Trim".', 'Tap Tube A and open its cap.', 'Drag the tissue into Tube A (or hold it and tap the tube).'],
    why: W(`Strawberries are a classic teaching sample: they are octoploid (8 copies of each chromosome), soft, and easy to break open. ${E.tissueMin}–${E.tissueMax} mg matches the ${E.bufferVol} µL of extraction buffer in the Edwards et al. (1991) protocol — too much tissue overloads the buffer with polysaccharides and pigments.`),
    molecular: W('Each strawberry cell has a rigid cellulose cell wall, a plasma membrane, a large vacuole full of sugars and acids, and a nucleus containing the genome wrapped around histone proteins. Chloroplasts carry their own small circular genome — the one our PCR will target.'),
    see: `The balance shows a mass around 0.1 g. The red piece sits at the bottom of Tube A.`,
    mistakes: ['Including the green calyx adds leaf tissue with different chemistry.', 'Using too much tissue gives a sticky, viscous lysate and lower purity.', 'Leaving the tube open for long invites contamination.'],
    mol: 'cells',
    tasks: [
      { label: 'Cut a piece of strawberry', done: (L) => L.S.cutDone, target: 'berry' },
      { label: 'Weigh it on the balance', target: (L) => held(L, 'tissue') ? 'balance' : 'tissue', done: (L) => loc(L, 'tissue') === 'balance-pan' || L.S.log.some(e => e.type === 'place' && e.slot === 'balance-pan') },
      { label: `Mass between ${E.tissueMin} and ${E.tissueMax} mg`, done: (L) => L.S.tissueMg >= E.tissueMin && L.S.tissueMg <= E.tissueMax && L.S.log.some(e => e.type === 'place' && e.slot === 'balance-pan') },
      { label: 'Open Tube A', done: (L) => L.V('A').cap === false || !!L.V('A').tissue, target: 'A' },
      { label: 'Put the tissue into Tube A', done: (L) => !!L.V('A').tissue, target: (L) => held(L, 'tissue') ? 'A' : 'tissue' },
    ],
    check(kind, ctx, L) {
      if (kind === 'tissue' && !L.S.log.some(e => e.type === 'place' && e.slot === 'balance-pan')) return { id: 'not-weighed', title: 'Weigh the tissue first', block: true, what: 'The piece has not been weighed.', why: 'The buffer volume is matched to the tissue mass. Without weighing you cannot know whether the lysis chemistry will be overloaded.', fix: 'Place the piece on the balance pan, read the mass, then transfer it.' };
      if (kind === 'tissue' && L.S.tissueMg > E.tissueMax) return { id: 'too-much-tissue', title: 'Too much tissue', block: true, what: `${L.S.tissueMg} mg is above the ${E.tissueMax} mg limit.`, why: `${E.bufferVol} µL of buffer cannot fully lyse this much tissue. Excess polysaccharides and phenolics co-precipitate with DNA and inhibit Taq polymerase later.`, fix: 'Tap the tissue and trim it.' };
      return null;
    },
  });

  steps.push({
    id: 'buffer', module: 'DNA Extraction', station: 's1', title: 'Add extraction buffer',
    what: `Add ${E.bufferVol} µL Edwards extraction buffer to Tube A with the P1000.`,
    how: ['Tap the P1000 on the stand to pick it up.', `Set ${E.bufferVol} µL using the volume dial.`, 'Tap the blue 1000 µL tip box to attach a tip.', 'Press the plunger to the FIRST stop, then tap the Edwards Buffer tube to immerse the tip.', 'Release the plunger slowly to aspirate.', 'Tap Tube A, press to the first stop, then the second stop to blow out.', 'Lift the tip out ("Lift tip"), release the plunger, and eject the tip into the tip waste.'],
    why: W('Edwards buffer contains everything needed to break cells open and protect DNA: SDS dissolves membranes and denatures proteins, Tris holds the pH at 7.5, NaCl keeps DNA soluble and later helps it precipitate, and EDTA chelates Mg²⁺ so DNA-cutting nucleases cannot work.'),
    molecular: W('SDS molecules insert into the lipid bilayer and pull lipids into micelles. EDTA wraps around Mg²⁺ ions — nucleases need Mg²⁺ as a cofactor, so they are switched off.'),
    see: 'The clear buffer fills the conical bottom of Tube A, about one quarter of the tube.',
    mistakes: ['Pressing to the second stop before aspirating draws ~10–15% too much.', 'Releasing the plunger while the tip is still in the liquid sucks the buffer back up.', 'Reusing the tip from another reagent contaminates the buffer stock.'],
    mol: 'cells',
    transfers: [{ reagent: 'edwards', to: 'A', vol: E.bufferVol }],
    tasks: transferTasks({ pip: 'P1000', vol: E.bufferVol, reagent: 'edwards', to: 'A', label: 'Edwards buffer', toLabel: 'Tube A' }),
  });

  steps.push({
    id: 'grind', module: 'DNA Extraction', station: 's1', title: 'Disrupt the tissue',
    what: 'Grind the strawberry inside Tube A with the micropestle until it is fully homogenised.',
    how: ['Pick up the micropestle from its holder.', 'Tap Tube A (cap open) to insert it.', 'Rub your finger in circles on the grinding pad — keep going until the bar reaches 100%.', 'Tap "Remove pestle", then close Tube A.'],
    why: W('The cellulose cell wall does not dissolve in detergent. Mechanical grinding breaks the walls so the buffer can reach every membrane. Incomplete grinding is the most common cause of low DNA yield from plant tissue.'),
    molecular: W('Shear forces tear the cell walls; SDS then dissolves the plasma membrane and the nuclear envelope. Histones are stripped off and long chromosomal DNA unfolds into the solution, together with chloroplast DNA circles.'),
    see: 'The red chunk disappears and the buffer turns pink-red with cell sap and suspended debris.',
    mistakes: ['Grinding too briefly leaves intact cells — DNA stays trapped.', 'Grinding with the cap of a different tube nearby risks splashing between tubes.'],
    mol: 'lysis',
    tasks: [
      { label: 'Pick up the micropestle', target: 'pestle', done: (L) => held(L, 'pestle') || loc(L, 'pestle') === 'in:A' || (L.V('A').tissue?.lysed || 0) > 0 },
      { label: 'Insert it into Tube A', target: 'A', done: (L) => loc(L, 'pestle') === 'in:A' || (L.V('A').tissue?.lysed || 0) > 0 },
      { label: 'Grind to 100% homogenised', done: (L) => (L.V('A').tissue?.lysed || 0) >= 1 },
      { label: 'Remove the pestle', done: (L) => (L.V('A').tissue?.lysed || 0) >= 1 && !loc(L, 'pestle')?.startsWith('in:') },
      { label: 'Close Tube A', target: 'A', done: (L) => (L.V('A').tissue?.lysed || 0) >= 1 && L.V('A').cap === true },
    ],
  });

  steps.push({
    id: 'vortex', module: 'DNA Extraction', station: 's1', title: 'Vortex to complete lysis',
    what: 'Vortex the closed Tube A for about 5 seconds.',
    how: ['Pick up Tube A (drag it, or tap it and choose "Pick up").', 'Tap the vortex mixer to place it on the rubber cup.', 'Open the vortex control and press and hold "Vortex" for a few seconds.'],
    why: W('Vortexing mixes the homogenate with the buffer so every fragment of tissue is exposed to SDS and EDTA. Edwards et al. vortex for 5 s before leaving the extract at room temperature.'),
    molecular: W('Turbulent mixing brings detergent micelles into contact with remaining membranes. Released DNA is long and fragile — brief vortexing is fine for this crude PCR template, but vigorous vortexing shears genomic DNA into smaller pieces.'),
    see: 'The tube vibrates in a tight circle; the lysate looks uniform with no visible chunks.',
    mistakes: ['Vortexing an open tube sprays SDS buffer.', 'Very long vortexing shears genomic DNA (a problem for long-fragment work, not for a 580 bp PCR).'],
    mol: 'lysis',
    tasks: [
      { label: 'Place Tube A on the vortex', target: (L) => held(L, 'A') ? 'vortex' : 'A', done: (L) => loc(L, 'A') === 'vortex-cup' || L.S.log.some(e => e.type === 'vortexed' && e.id === 'A') },
      { label: 'Vortex ~5 s (hold the button)', target: 'vortex', done: (L) => L.S.log.some(e => e.type === 'vortexed' && e.id === 'A' && e.sec > 0.8) },
    ],
  });

  steps.push({
    id: 'spin1', module: 'DNA Extraction', station: 's1', title: `Centrifuge: pellet the debris`,
    what: `Spin Tube A at 13,000 × g for ${E.spin1.min} min with the balance tube opposite.`,
    how: ['Open the centrifuge (tap it → "Open lid").', 'Drag Tube A into a rotor position.', 'Drag the BAL tube into the position directly opposite (180°).', 'Close the lid, check 13,000 × g and the time, and press Start.'],
    why: W('Centrifugation separates the insoluble material — cell walls, starch, SDS–protein complexes — from the DNA, which stays dissolved in the supernatant. This is also where most protein is removed: SDS has denatured it and much of it pellets with the debris.'),
    molecular: W('In the centrifugal field, dense particles sediment to the tube wall facing away from the centre. DNA molecules are long but light and highly hydrated, so they remain in solution.'),
    see: 'The rotor spins up, the display counts down, and afterwards a dark red pellet sits at the bottom of Tube A under a clear pink supernatant.',
    mistakes: ['No balance tube → violent vibration; the centrifuge refuses to run.', 'Open caps can snap off at high speed.', 'Spinning too slowly or briefly leaves debris floating in the supernatant.'],
    mol: 'spin-debris',
    spin: { g: E.spin1.g, sec: E.spin1.min * 60 },
    tasks: spinTasks('A', E.spin1.min * 60),
  });

  steps.push({
    id: 'supernatant', module: 'DNA Extraction', station: 's1', title: 'Transfer the supernatant',
    what: `Transfer ${E.supVol} µL of the supernatant from Tube A to Tube B — do not touch the pellet.`,
    how: ['Take Tube A out of the centrifuge and put it back in the rack.', 'Open Tube A and Tube B.', `Pick up the P1000, set ${E.supVol} µL and attach a fresh tip.`, 'Press to the first stop, tap Tube A (the tip stays near the surface, away from the pellet) and release slowly.', 'Dispense into Tube B, lift, release, and eject the tip.'],
    why: W('Only the supernatant contains the dissolved DNA. Taking a little less than the full volume (≈300 of ≈480 µL) leaves a safety margin above the pellet.'),
    molecular: W('The supernatant contains genomic and chloroplast DNA, RNA, salts and soluble sugars. Leaving the pellet behind removes cell-wall fragments and denatured proteins that would inhibit the polymerase.'),
    see: 'Tube B now holds a clear pink liquid; Tube A keeps its red pellet and a little liquid.',
    mistakes: ['Pushing the tip down to the bottom disturbs the pellet.', 'Trying to recover every last microlitre carries debris over.'],
    mol: 'spin-debris',
    transfers: [{ from: 'A', to: 'B', vol: E.supVol }],
    tasks: [
      { label: 'Return Tube A to the rack', done: (L) => loc(L, 'A')?.startsWith('rack1') || L.vol('B') > 10 },
      { label: 'Open Tube A and Tube B', done: (L) => (L.V('A').cap === false && L.V('B').cap === false) || L.vol('B') > 10 },
      ...transferTasks({ pip: 'P1000', vol: E.supVol, from: 'A', to: 'B', label: 'supernatant', toLabel: 'Tube B' }),
    ],
  });

  steps.push({
    id: 'isopropanol', module: 'DNA Extraction', station: 's1', title: 'Precipitate the DNA',
    what: `Add ${E.isoVol} µL isopropanol to Tube B, close it, and invert gently ${E.inversions} times.`,
    how: [`P1000 → ${E.isoVol} µL → fresh tip → aspirate isopropanol → dispense into Tube B.`, 'Eject the tip and close Tube B.', 'Pick up Tube B and tap "Invert" — slowly, ten times.'],
    why: W('DNA is soluble in water because water shields the negative charges of its phosphate backbone. Isopropanol lowers the dielectric constant of the solution; Na⁺ ions from the buffer then neutralise the phosphates and the DNA molecules stick together and fall out of solution. One volume of isopropanol is enough (ethanol would need 2–2.5 volumes).'),
    molecular: W('Hydration shells around DNA collapse. Na⁺ ions bind to PO₄⁻ groups along the backbone, removing the electrostatic repulsion between strands. Thousands of long DNA molecules aggregate into visible white threads.'),
    see: 'After a few inversions faint white, cloudy threads appear in the pink liquid.',
    mistakes: ['Vigorous shaking shears the long DNA strands.', 'Too little isopropanol (<0.7 volumes) gives incomplete precipitation.', 'Forgetting to close the cap before inverting spills the sample.'],
    mol: 'precip',
    transfers: [{ reagent: 'iso', to: 'B', vol: E.isoVol }],
    tasks: [
      ...transferTasks({ pip: 'P1000', vol: E.isoVol, reagent: 'iso', to: 'B', label: 'isopropanol', toLabel: 'Tube B' }),
      { label: 'Close Tube B', done: (L) => amt(L, 'B', 'iso') > 1 && L.V('B').cap === true },
      { label: `Invert gently ${E.inversions}×`, done: (L) => (L.V('B').inversions || 0) >= E.inversions },
    ],
  });

  steps.push({
    id: 'spin2', module: 'DNA Extraction', station: 's1', title: 'Centrifuge: pellet the DNA',
    what: `Spin Tube B at 13,000 × g for ${E.spin2.min} min with the BAL tube opposite.`,
    how: ['Open the centrifuge lid.', 'Place Tube B and the BAL tube opposite each other.', `Close the lid, set ${E.spin2.min}:00 and press Start.`],
    why: W('The DNA precipitate is fine and diffuse. Several minutes at high speed compact it into a small pellet so the alcohol can be poured off without losing DNA.'),
    molecular: W('Aggregated DNA–salt complexes are denser than the surrounding alcohol mixture and sediment against the outer wall of the tube.'),
    see: 'A small whitish (sometimes slightly pink) pellet on the hinge side at the bottom of Tube B.',
    mistakes: ['Too short a spin leaves DNA floating and it is discarded with the supernatant.', 'Not noting the hinge orientation makes the tiny pellet hard to find.'],
    mol: 'spin-dna',
    spin: { g: E.spin2.g, sec: E.spin2.min * 60 },
    tasks: spinTasks('B', E.spin2.min * 60),
  });

  steps.push({
    id: 'discard', module: 'DNA Extraction', station: 's1', title: 'Discard the supernatant',
    what: 'Remove the isopropanol supernatant from Tube B into the liquid-waste beaker, leaving the DNA pellet.',
    how: ['Put Tube B back in the rack and open it.', 'P1000 → set 550 µL → fresh tip.', 'Aspirate from Tube B (the tip stays away from the pellet).', 'Dispense into the LIQUID WASTE beaker and eject the tip.'],
    why: W('The supernatant contains isopropanol, salt, sugars and soluble contaminants; the DNA is now in the pellet. Leaving ~50 µL behind protects the pellet.'),
    molecular: W('Polysaccharides and small molecules that stayed soluble in isopropanol are removed here. The DNA pellet is loosely attached and can slide if disturbed.'),
    see: 'Tube B is almost empty with the pellet still visible.',
    mistakes: ['Aspirating to the very bottom sucks up the pellet — your DNA goes to waste.', 'Pouring instead of pipetting can lose a loosely attached pellet.'],
    mol: 'spin-dna',
    transfers: [{ from: 'B', to: 'liqwaste1', vol: 550, waste: true }],
    tasks: [
      { label: 'Return Tube B to the rack and open it', done: (L) => (loc(L, 'B')?.startsWith('rack1') && L.V('B').cap === false) || L.vol('B') < 120 },
      { label: 'Aspirate ~550 µL from Tube B', ev: evIs('aspirate', (e) => e.vid === 'B'), done: (L) => L.vol('B') < 120 },
      { label: 'Dispense it into the liquid waste', done: (L) => L.vol('B') < 120 && L.S.log.some(e => e.type === 'dispense' && e.vid === 'liqwaste1') },
      { label: 'Pellet still in the tube', done: (L) => (L.V('B').pel.gdna || 0) > 50 && L.vol('B') < 120 },
      { label: 'Eject the tip', done: (L) => L.vol('B') < 120 && !L.S.pip.P1000.tip },
    ],
  });

  steps.push({
    id: 'wash', module: 'DNA Extraction', station: 's1', title: 'Wash the pellet with 70% ethanol',
    what: `Add ${E.washVol} µL 70% ethanol, spin ${E.spin3.min} min at 13,000 × g, then discard the ethanol.`,
    how: [`P1000 → ${E.washVol} µL 70% ethanol → Tube B, eject the tip, close the cap.`, `Spin with the BAL tube opposite for ${E.spin3.min} min.`, 'Back in the rack, open Tube B and remove the ethanol (set 500 µL) into the liquid waste.'],
    why: W('70% ethanol dissolves the remaining salt and SDS but does not redissolve DNA. Residual salt and detergent would otherwise inhibit Taq polymerase.'),
    molecular: W('The 30% water dissolves Na⁺ salts and detergent; the 70% ethanol keeps the DNA in its precipitated, dehydrated state.'),
    see: 'The pellet often turns whiter and more compact after washing.',
    mistakes: ['Using 100% ethanol does not remove salts well.', 'Skipping the second spin can dislodge the pellet when you pipette.'],
    mol: 'spin-dna',
    spin: { g: E.spin3.g, sec: E.spin3.min * 60 },
    transfers: [{ reagent: 'etoh70', to: 'B', vol: E.washVol }, { from: 'B', to: 'liqwaste1', vol: 500, waste: true }],
    tasks: [
      { label: `Add ${E.washVol} µL 70% ethanol to Tube B`, done: (L) => amt(L, 'B', 'etoh70') >= E.washVol * 0.9 || L.S.log.some(e => e.type === 'dispense' && e.vid === 'B' && e.reagent === 'etoh70') },
      { label: 'Eject tip and close Tube B', done: (L) => washIdx(L) >= 0 && (L.V('B').cap === true || seenAfter(L, washIdx(L), e => e.type === 'cfgStart' && e.tubes.includes('B'))) },
      { label: `Spin ${E.spin3.min} min at 13,000 × g`, ev: evIs('cfgDone', (e, L) => e.tubes.includes('B') && amt(L, 'B', 'etoh70') > 50) },
      { label: 'Remove the ethanol into the liquid waste', done: (L) => seenAfter(L, washIdx(L), e => e.type === 'cfgDone' && e.tubes.includes('B')) && L.vol('B') < 100 && seenAfter(L, washIdx(L), e => e.type === 'dispense' && e.vid === 'liqwaste1') },
    ],
  });

  steps.push({
    id: 'dry', module: 'DNA Extraction', station: 's1', title: 'Air-dry the pellet',
    what: `Leave Tube B open for ~${E.dryMin} minutes so the remaining alcohol evaporates.`,
    how: ['Make sure Tube B is open and in the rack.', `Tap Tube B and choose "Air-dry ${E.dryMin} min".`],
    why: W('Ethanol carried into the PCR inhibits Taq polymerase. But over-drying makes DNA very hard to redissolve — stop when the pellet turns from white to translucent.'),
    molecular: W('Alcohol evaporates faster than water. Completely dehydrated DNA packs tightly and rehydrates slowly.'),
    see: 'The liquid film disappears; the pellet becomes glassy/translucent.',
    mistakes: ['Skipping drying → ethanol carry-over → weak or no PCR.', 'Drying >30 min or with heat → DNA difficult to dissolve.'],
    mol: null,
    tasks: [
      { label: 'Tube B open', done: (L) => L.V('B').cap === false || (L.V('B').dryMin || 0) > 5 },
      { label: `Air-dry ${E.dryMin} min`, done: (L) => (L.V('B').dryMin || 0) >= E.dryMin - 0.5 },
    ],
  });

  steps.push({
    id: 'te', module: 'DNA Extraction', station: 's1', title: 'Dissolve the DNA in TE buffer',
    what: `Add ${E.teVol} µL TE buffer with the P200, close Tube B, and flick to dissolve the pellet.`,
    how: ['Pick up the P200 on this station\'s stand.', `Set ${E.teVol} µL, attach a yellow 200 µL tip, aspirate TE, dispense onto the pellet.`, 'Eject the tip, close Tube B and flick it several times (pick up → Flick).'],
    why: W('TE is the standard storage buffer for DNA: Tris keeps the pH at 8.0, where DNA is stable, and 1 mM EDTA blocks any remaining nucleases. This tube is now your PCR template.'),
    molecular: W('Water molecules re-hydrate the phosphate backbone; the strands repel each other again and unwind back into solution.'),
    see: 'The pellet disappears and the solution is clear. The yield panel shows the DNA concentration.',
    mistakes: ['Pipetting the pellet up and down hard shears DNA.', 'Using water instead of TE leaves DNA unprotected from nucleases during storage.'],
    mol: 'dissolve',
    transfers: [{ reagent: 'te', to: 'B', vol: E.teVol }],
    tasks: [
      ...transferTasks({ pip: 'P200a', vol: E.teVol, reagent: 'te', to: 'B', label: 'TE buffer', toLabel: 'Tube B' }),
      { label: 'Close Tube B', done: (L) => amt(L, 'B', 'te') > 10 && L.V('B').cap === true },
      { label: 'Flick until the pellet dissolves', done: (L) => { const B = L.V('B'); return amt(L, 'B', 'te') > 10 && (B.pel.gdna || 0) < 0.15 * ((B.sol.gdna || 0) + (B.pel.gdna || 0)); } },
    ],
  });

  // ------------------------------------------------------------- PCR SET-UP
  steps.push({
    id: 'carry', module: 'PCR Setup', station: 's2', title: 'Bring your DNA to the PCR station',
    what: 'Carry Tube B (your template DNA) to the cold block at the PCR Setup station.',
    how: ['Pick up Tube B.', 'Switch to the "PCR Setup" station with the station bar.', 'Tap the aluminium cold block to put Tube B in a free position.'],
    why: W('PCR is set up in a separate, clean area away from where DNA is extracted or amplified products are handled. This "one-way workflow" reduces contamination. Reagents are kept cold to slow enzyme activity and non-specific priming before cycling.'),
    molecular: W('At room temperature Taq has some activity and primers can bind loosely to each other or to partly matched sites. Cold slows these unwanted reactions.'),
    see: 'Tube B sits in the cold block next to the master-mix tube.',
    mistakes: ['Bringing amplified PCR product back into the setup area is the classic source of false positives.'],
    mol: null,
    tasks: [
      { label: 'Pick up Tube B', target: 'B', done: (L) => held(L, 'B') || loc(L, 'B')?.startsWith('cold') },
      { label: 'Go to the PCR Setup station', done: (L) => L.station === 's2' || loc(L, 'B')?.startsWith('cold') },
      { label: 'Place it in the cold block', target: 'cold', done: (L) => loc(L, 'B')?.startsWith('cold') },
    ],
  });

  steps.push({
    id: 'calc', module: 'PCR Setup', station: 's2', title: 'Calculate the master mix',
    what: 'Open the master-mix calculator, check the numbers and confirm.',
    how: ['Tap "Master mix" in the PCR panel.', `We run ${P.pcr.reactions} reactions — sample, positive control, no-template control — plus ${P.pcr.extra} extra for pipetting loss.`, 'Change the stock or final concentrations if your kit differs, then tap "Use these volumes".'],
    why: W('A master mix contains everything common to all reactions. Pipetting one larger volume is far more accurate than adding 0.125 µL of Taq to each tube, and every reaction gets exactly the same chemistry, so differences between tubes come only from the template.'),
    molecular: W(`For each component: volume = final concentration × reaction volume ÷ stock concentration. E.g. MgCl₂: 1.5 mM × 25 µL ÷ 25 mM = 1.5 µL per reaction.`),
    see: `Total per reaction: ${mm.perTotal} µL master mix + ${P.pcr.templateVol} µL template = ${P.pcr.rxnVol} µL.`,
    mistakes: ['Forgetting the extra reaction → the last tube comes up short.', 'Mixing up µM and mM changes a concentration 1000-fold.'],
    mol: null,
    tasks: [
      { label: 'Open the calculator', done: (L) => L.S.calc.opened },
      { label: 'Confirm the volumes', done: (L) => !!L.S.calc.confirmed },
    ],
  });

  const mmTransfers = [
    { reagent: 'water', pip: 'P200', label: 'water' }, { reagent: 'buffer10x', pip: 'P20', label: '10× buffer' },
    { reagent: 'mgcl2', pip: 'P20', label: 'MgCl₂' }, { reagent: 'dntp', pip: 'P2', label: 'dNTPs' },
    { reagent: 'fwd', pip: 'P2', label: 'forward primer' }, { reagent: 'rev', pip: 'P2', label: 'reverse primer' },
    { reagent: 'taq', pip: 'P2', label: 'Taq polymerase' },
  ];
  steps.push({
    id: 'mastermix', unordered: true, module: 'PCR Setup', station: 's2', title: 'Build the master mix',
    dynamic: true,
    what: 'Pipette each component into the MM tube — water first, Taq polymerase last. Fresh tip for every reagent.',
    how: ['Open the MM tube.', 'Choose the pipette whose range covers the volume (P200: 20–200 µL, P20: 2–20 µL, P2: 0.2–2 µL).', 'For each reagent: set volume → fresh tip → aspirate from the stock on ice → dispense into MM → eject.', 'Add Taq last: it is in 50% glycerol, so aspirate slowly and wipe nothing — the reaction table shows what is in the tube.'],
    why: W('Water first means every later small volume lands in liquid, not on a dry wall. Enzyme last limits the time Taq spends in an incomplete mix. Fresh tips prevent primer or template carry-over between stocks.'),
    molecular: W('Buffer: Tris-HCl (pH) + KCl (helps primers anneal). Mg²⁺: cofactor bridging the dNTP phosphates in the polymerase active site. dNTPs: the four building blocks dATP, dCTP, dGTP, dTTP. Primers: two 20–26 nt oligos defining the ends of the rbcL fragment. Taq: heat-stable polymerase from Thermus aquaticus.'),
    see: 'The reaction table fills in green row by row; total master mix ≈ ' + mm.total + ' µL.',
    mistakes: ['Using the wrong pipette range gives large errors (a P200 at 2 µL is ±10%).', 'Forgetting MgCl₂ or Taq gives no product at all.', 'Pipetting Taq too fast leaves glycerol on the outside of the tip and adds too much enzyme.'],
    mol: null,
    get transfers() { const m = masterMix(); return mmTransfers.map(t => ({ reagent: t.reagent, to: 'MM', vol: m.rows.find(r => r.id === t.reagent).total, perPip: true })); },
    get tasks() {
      const m = masterMix();
      return [
        { label: 'Open the MM tube', done: (L) => L.V('MM').cap === false || L.vol('MM') > 1 },
        ...mmTransfers.map(t => { const v = m.rows.find(r => r.id === t.reagent).total; return { label: `${t.label}: ${v} µL`, done: (L) => amt(L, 'MM', t.reagent) >= v - tolFor(v) }; }),
      ];
    },
    check(kind, ctx, L) {
      if (kind === 'dispense' && ctx.vid === 'MM' && ctx.reagent === 'taq') {
        const missing = ['water', 'buffer10x', 'mgcl2', 'dntp', 'fwd', 'rev'].filter(r => amt(L, 'MM', r) < 0.1);
        if (missing.length) return { id: 'taq-early', title: 'Taq added before the mix is complete', undoable: true, what: `Still missing: ${missing.map(r => REAGENTS[r].short).join(', ')}.`, why: 'Enzymes are added last so they are not exposed to unbuffered or extreme conditions, and so the small glycerol-rich volume goes into an already liquid mix where it disperses on mixing.', fix: 'Undo, add the remaining components, then Taq.' };
      }
      return null;
    },
  });

  steps.push({
    id: 'mixmm', module: 'PCR Setup', station: 's2', title: 'Mix the master mix',
    what: 'Close the MM tube and mix gently by flicking or inverting — do not vortex the enzyme.',
    how: ['Close the MM tube.', 'Pick it up and Flick (or Invert) 3–4 times.', 'Put it back in the cold block.'],
    why: W('Taq is stored in 50% glycerol, which is denser than water and sinks to the bottom. Without mixing, the first aliquots would get almost no enzyme and the last ones too much.'),
    molecular: W('Glycerol increases viscosity and density. Gentle mixing distributes enzyme, primers and Mg²⁺ evenly; vortexing can denature enzymes by shearing and foaming.'),
    see: 'The mix is uniform; no streaks of glycerol.',
    mistakes: ['Aliquoting an unmixed master mix → reactions with very different enzyme amounts.', 'Vortexing enzyme mixes hard causes foaming and loss of activity.'],
    mol: null,
    tasks: [
      { label: 'Close the MM tube', done: (L) => L.V('MM').cap === true || mixedAfterLastDispense(L, 'MM') },
      { label: 'Mix gently (flick / invert)', done: (L) => mixedAfterLastDispense(L, 'MM') },
      { label: 'Back in the cold block', done: (L) => loc(L, 'MM')?.startsWith('cold') && L.S.log.some(e => e.type === 'mix' && e.vid === 'MM') },
    ],
    check(kind, ctx) { if (kind === 'vortex' && ctx.id === 'MM') return { id: 'vortex-enzyme', title: 'Avoid vortexing enzyme mixes', undoable: true, what: 'You placed the master mix on the vortex.', why: 'Vigorous vortexing can partially denature Taq at air–liquid interfaces and creates foam that traps volume.', fix: 'Flick or invert the closed tube instead.' }; return null; },
  });

  steps.push({
    id: 'aliquot', unordered: true, module: 'PCR Setup', station: 's2', title: 'Aliquot the master mix',
    what: `Dispense ${P.pcr.aliquot} µL master mix into PCR tubes 1, 2 and 3.`,
    how: ['Tap the PCR strip and open the caps.', 'Open the MM tube.', `P200 → ${P.pcr.aliquot} µL → fresh tip. You may reuse this tip for the three tubes as long as it never touches the liquid already in a tube.`, 'Aspirate from MM → dispense into tube 1; repeat for tubes 2 and 3.'],
    why: W('Each reaction receives identical chemistry. Tube 1 will get your strawberry DNA, tube 2 a known positive control DNA, and tube 3 water only (no-template control, NTC).'),
    molecular: W('No DNA is present yet, so reusing the tip between empty tubes cannot carry template. Once a tube contains template, a tip that touched it must never go back into the master mix.'),
    see: 'Three small equal drops in the bottom of tubes 1–3.',
    mistakes: ['Touching the liquid in tube 1 and going back into the MM contaminates the whole master mix.', 'Not mixing the MM first → uneven enzyme distribution.'],
    mol: null,
    transfers: [1, 2, 3].map(i => ({ reagent: 'water', from: 'MM', to: `pcr${i}`, vol: P.pcr.aliquot, aliquot: true })),
    tasks: [
      { label: 'Open the PCR strip', done: (L) => L.V('pcr1').cap === false || L.vol('pcr1') > 1 },
      { label: 'Open the MM tube', done: (L) => L.V('MM').cap === false || L.vol('pcr1') > 1 },
      ...[1, 2, 3].map(i => ({ label: `Tube ${i}: ${P.pcr.aliquot} µL master mix`, done: (L) => near(L.vol(`pcr${i}`), P.pcr.aliquot, 1) || L.vol(`pcr${i}`) > P.pcr.aliquot })),
    ],
    check(kind, ctx, L) {
      if (kind === 'aspirate' && ctx.vid === 'MM' && !mixedAfterLastDispense(L, 'MM')) return { id: 'unmixed-mm', title: 'Master mix not mixed', block: true, what: 'You are drawing from a master mix that has not been mixed since the last component went in.', why: 'Taq polymerase in 50% glycerol sits at the bottom. Aliquots taken now would contain very unequal amounts of enzyme and primers.', fix: 'Close the MM tube, flick it a few times, then aliquot.' };
      return null;
    },
  });

  steps.push({
    id: 'template', unordered: true, module: 'PCR Setup', station: 's2', title: 'Add template DNA and controls',
    what: `Add ${P.pcr.templateVol} µL template to each tube: Tube B → tube 1, positive control → tube 2, water → tube 3.`,
    how: ['Open Tube B.', `P2 → ${P.pcr.templateVol} µL → FRESH clear tip for each tube.`, 'Tube 1: your strawberry DNA from Tube B.', 'Tube 2: positive-control DNA (+C, on ice).', 'Tube 3: nuclease-free water (H₂O, on ice) — the no-template control.', 'Pipette up and down once to rinse the template into the mix.'],
    why: W('The controls make the result interpretable. A band in the positive control proves the PCR worked; no band in the NTC proves the reagents were not contaminated. Without both, neither a band nor its absence in tube 1 means anything.'),
    molecular: W('Each microlitre of your extract contains thousands of chloroplast genome copies, each with one rbcL gene — the starting templates (N₀) for amplification.'),
    see: 'Each tube now contains 25 µL.',
    mistakes: ['Using the same tip for template and then water puts DNA into the NTC.', 'Adding template to the wrong tube makes the controls meaningless.'],
    mol: null,
    transfers: [{ from: 'B', to: 'pcr1', vol: P.pcr.templateVol }, { reagent: 'posctrl', to: 'pcr2', vol: P.pcr.templateVol }, { reagent: 'water', from: 's_water', to: 'pcr3', vol: P.pcr.templateVol }],
    tasks: [
      { label: 'Open Tube B', done: (L) => L.V('B').cap === false || L.S.log.some(e => e.type === 'dispense' && e.vid === 'pcr1' && e.from === 'B') },
      { label: 'Tube 1 ← 1 µL strawberry DNA', done: (L) => L.S.log.some(e => e.type === 'dispense' && e.vid === 'pcr1' && e.from === 'B') },
      { label: 'Tube 2 ← 1 µL positive control', done: (L) => amt(L, 'pcr2', 'posctrl') >= 0.9 },
      { label: 'Tube 3 ← 1 µL water (NTC)', done: (L) => L.S.log.some(e => e.type === 'dispense' && e.vid === 'pcr3' && e.from === 's_water') },
      { label: 'Eject the last tip', done: (L) => L.S.log.some(e => e.type === 'dispense' && e.vid === 'pcr3' && e.from === 's_water') && !L.S.pip.P2.tip },
    ],
  });

  steps.push({
    id: 'seal', module: 'PCR Setup', station: 's2', title: 'Seal, mix, spin and verify',
    what: 'Close the strip, flick to mix, quick-spin it, then run the reaction verification.',
    how: ['Tap the strip → Close caps.', 'Pick it up → Flick.', 'Open the mini-spinner, place the strip, close the lid, press Spin.', 'Open the PCR panel → "Verify reactions" and review every tube.'],
    why: W('Mixing ensures template and master mix are uniform. A quick spin pulls droplets from the walls and caps to the bottom, so all 25 µL sit in the heated block. Verification catches missing or mis-measured components before an 80-minute run is wasted.'),
    molecular: W('Droplets on the cap would not experience the programmed temperatures and evaporate/condense unpredictably, changing concentrations.'),
    see: 'All three reactions pass verification (green).',
    mistakes: ['Skipping the spin leaves droplets on the walls — inconsistent results.', 'Running without controls makes the result uninterpretable.'],
    mol: null,
    tasks: [
      { label: 'Close the strip caps', done: (L) => L.V('pcr1').cap === true },
      { label: 'Flick to mix', done: (L) => L.S.log.some(e => e.type === 'mix' && e.vid === 'strip') },
      { label: 'Quick-spin in the mini-spinner', ev: evIs('spinDone') },
      { label: 'Verify the reactions', done: (L) => L.S.verified === true },
    ],
  });

  // ------------------------------------------------------------- THERMOCYCLER
  steps.push({
    id: 'tcload', module: 'Thermocycling', station: 's3', title: 'Load the thermocycler',
    what: 'Carry the strip to the thermocycler, open the lid, place the strip in the block and close the lid.',
    how: ['Take the strip out of the spinner (open its lid first).', 'Switch to the Thermocycler station.', 'Tap the thermocycler → "Open lid".', 'Tap the block to drop the strip into column 6.', 'Close the lid.'],
    why: W('The aluminium block changes temperature quickly and evenly. The heated lid (105 °C) presses on the caps and keeps them hotter than the liquid, so water vapour does not condense under the caps.'),
    molecular: W('Without a heated lid, water evaporates at 95 °C and condenses on the cap; the reaction volume shrinks and salt and Mg²⁺ become more concentrated each cycle.'),
    see: 'The strip sits in the block; the lid closes over it.',
    mistakes: ['Tubes not pushed fully into the wells heat poorly.', 'Running with the lid open → evaporation.'],
    mol: null,
    tasks: [
      { label: 'Pick up the PCR strip', target: 'strip', done: (L) => held(L, 'strip') || loc(L, 'strip') === 'tc-block' },
      { label: 'Open the thermocycler lid', target: 'cycler', done: (L) => L.S.inst.tc.lid || loc(L, 'strip') === 'tc-block' },
      { label: 'Place the strip in the block', target: 'cycler', done: (L) => loc(L, 'strip') === 'tc-block' },
      { label: 'Close the lid', target: 'cycler', done: (L) => loc(L, 'strip') === 'tc-block' && !L.S.inst.tc.lid },
    ],
  });

  steps.push({
    id: 'program', module: 'Thermocycling', station: 's3', title: 'Program the PCR',
    what: `Enter the rbcL program: ${P.cycler.init.t} °C ${P.cycler.init.s / 60} min; ${P.cycler.cycles} × (${P.cycler.den.t} °C ${P.cycler.den.s} s, ${P.cycler.ann.t} °C ${P.cycler.ann.s} s, ${P.cycler.ext.t} °C ${P.cycler.ext.s} s); ${P.cycler.final.t} °C ${P.cycler.final.s / 60} min; hold ${P.cycler.hold} °C.`,
    how: ['Tap the thermocycler → "Program".', 'The instrument shows the last user\'s program — change every field to the values in the instruction.', 'Tap "Save program".'],
    why: W(`Denaturation (${P.cycler.den.t} °C) melts the double helix. Annealing (${P.cycler.ann.t} °C) is set a few degrees below the primers' melting temperature so they bind only their exact target. Extension at 72 °C is Taq's optimum; Taq adds ~1000 nt per minute, so ${P.cycler.ext.s} s comfortably covers ${P.model.ampliconBp} bp.`),
    molecular: W('Higher annealing temperature = more stringent binding. Too high and primers fall off; too low and they tolerate mismatches, priming at wrong sites.'),
    see: 'The display shows the saved program and the estimated run time.',
    mistakes: ['Annealing above ~62 °C → primers cannot bind → no product.', 'Annealing below ~50 °C → extra non-specific bands.', 'Extension shorter than the product needs → incomplete strands, weak band.', 'Too few cycles → faint band; too many → smears.'],
    mol: 'pcr-intro',
    tasks: [
      { label: 'Open the program editor', target: 'cycler', done: (L) => L.S.log.some(e => e.type === 'tcProgram') || L.S.flags.programOpened },
      { label: 'Program matches the protocol', done: (L) => programMatches(L.S.inst.tc.program) },
    ],
  });

  steps.push({
    id: 'run', module: 'Thermocycling', station: 's3', title: 'Run the PCR',
    what: 'Start the run and follow the cycles — temperature, molecular events and amplification curve.',
    how: ['Tap the thermocycler → "Start run".', 'Use the speed control to fast-forward.', 'Watch the molecular view: denaturation, annealing, extension.', 'Open the amplification graph to follow copy number cycle by cycle.'],
    why: W('Each cycle can at most double the number of target copies. Early on, reagents are in huge excess so growth is exponential: N = N₀(1 + E)ⁿ. Later, primers and dNTPs are used up, Taq becomes limiting, and products re-anneal to each other instead of to primers — the curve flattens into a plateau.'),
    molecular: W('In cycle 1 the primers copy the long chloroplast DNA, producing strands with one defined end. From cycle 3 onward, strands with both ends defined by the primers — exactly 580 bp — appear, and from then on they dominate.'),
    see: 'Block temperature steps through ~95 → 55 → 72 °C; the cycle counter climbs; the graph rises steeply then levels off.',
    mistakes: ['Opening the lid mid-run aborts the program.', 'Expecting more product from more cycles: after the plateau extra cycles only add smears and artefacts.'],
    mol: 'pcr',
    tasks: [
      { label: 'Start the run', ev: evIs('tcStart'), target: 'cycler' },
      { label: 'Run complete', ev: evIs('tcDone') },
    ],
  });

  steps.push({
    id: 'unload', module: 'Thermocycling', station: 's3', title: 'Unload the PCR products',
    what: 'Open the lid, take out the strip and carry it to the PCR rack at the Electrophoresis station.',
    how: ['Thermocycler → Open lid.', 'Pick up the strip.', 'Switch to the Electrophoresis station and tap the PCR rack there.'],
    why: W('PCR products are now present in enormous numbers (~10¹² copies per tube). They are handled only in the post-PCR area — never carried back to the setup bench.'),
    molecular: W('One aerosol droplet from an opened PCR tube can contain millions of amplicons, enough to contaminate future reactions.'),
    see: 'The strip in the rack beside the gel tank.',
    mistakes: ['Opening PCR tubes in the setup area.'],
    mol: null,
    tasks: [
      { label: 'Open the lid', done: (L) => L.S.inst.tc.lid || loc(L, 'strip') !== 'tc-block' },
      { label: 'Pick up the strip', done: (L) => loc(L, 'strip') !== 'tc-block' },
      { label: 'Place it in the Electrophoresis PCR rack', done: (L) => loc(L, 'strip') === 'pcrrack4' },
    ],
  });

  // ------------------------------------------------------------- GEL
  steps.push({
    id: 'cast', module: 'Electrophoresis', station: 's4', title: 'Cast the agarose gel',
    what: `Insert the comb, pour ~${P.gel.castVol} mL molten ${P.gel.pct}% agarose, and let it set.`,
    how: ['Pick up the comb and tap the BACK slot of the tray (the end away from you).', 'Pick up the agarose flask and tap the casting tray.', 'Press and hold "Pour" until the gel is ~5 mm thick (~35 mL).', 'Put the flask back and wait for the gel to set (use fast-forward).'],
    why: W(`${P.gel.pct}% agarose has pores that separate fragments of roughly 150–3000 bp well, ideal for a ${P.model.ampliconBp} bp product. The gel already contains SYBR Safe, which binds DNA and fluoresces orange under blue light.`),
    molecular: W('As agarose cools below ~40 °C, its polysaccharide chains form double helices that bundle into a porous network — a molecular sieve.'),
    see: 'The gel turns from clear to slightly opaque when set.',
    mistakes: ['No comb → no wells.', 'Moving the tray before it sets → wavy, uneven gel.', 'A gel thicker than ~6 mm makes bands fainter and blurrier.'],
    mol: 'gel-mesh',
    tasks: [
      { label: 'Insert the comb into the tray', target: (L) => held(L, 'comb') ? 'tray' : 'comb', done: (L) => ['comb-back', 'comb-front'].includes(loc(L, 'comb')) || L.S.gel.wells },
      { label: `Pour ~${P.gel.castVol} mL agarose`, target: (L) => held(L, 'flask') ? 'tray' : 'flask', done: (L) => L.S.gel.poured >= P.gel.castVol * 0.8 },
      { label: 'Return the flask', done: (L) => L.S.gel.poured > 10 && loc(L, 'flask') === 'flask-home' },
      { label: 'Wait until the gel has set', done: (L) => L.S.gel.solid >= 1 },
    ],
  });

  steps.push({
    id: 'tank', module: 'Electrophoresis', station: 's4', title: 'Place the gel in the tank',
    what: 'Move the tray into the electrophoresis tank with the wells at the BLACK (−) end.',
    how: ['Pick up the tray (the comb stays in for now).', 'If the comb end is not toward the black electrode (back), tap "Rotate 180°".', 'Tap the tank to set it on the platform.'],
    why: W('DNA is negatively charged at neutral pH because every nucleotide carries a phosphate group. It migrates toward the positive anode (red). The wells must therefore sit at the negative cathode (black) so the DNA runs through the gel: "run to red".'),
    molecular: W('Charge per nucleotide is constant, so charge-to-mass ratio is the same for all fragments. Separation is purely by size: small fragments slip through the pores quickly; large ones are retarded.'),
    see: 'The tray sits in the tank; the comb is next to the black (−) electrode.',
    mistakes: ['Wells at the red end → DNA runs out of the gel into the buffer and is lost.'],
    mol: 'gel-mesh',
    tasks: [
      { label: 'Tray in the tank', target: (L) => held(L, 'tray') ? 'chamber' : 'tray', done: (L) => loc(L, 'tray') === 'chamber' },
      { label: 'Wells at the black (−) electrode', done: (L) => loc(L, 'tray') === 'chamber' && L.wellsAtCathode() },
    ],
    check(kind, ctx, L) {
      if (kind === 'place' && ctx.slot === 'chamber') {
        const g = L.S.gel, rot = L.S.items.tray.rot;
        const ok = !g.wells || (g.wells === 'back') === (rot === 0);
        if (!ok) return { id: 'wells-anode', title: 'Wells are at the positive (red) end', undoable: true, what: 'You placed the gel with the wells next to the red (+) electrode.', why: 'DNA\'s phosphate backbone makes it negatively charged, so it moves toward red (+). Starting next to red, it would leave the wells and run straight into the buffer — your samples would be lost.', fix: 'Undo, then tap "Rotate 180°" while holding the tray before placing it.' };
      }
      return null;
    },
  });

  steps.push({
    id: 'tae', module: 'Electrophoresis', station: 's4', title: 'Add running buffer',
    what: 'Pour 1× TAE into the tank until the gel is covered by 3–5 mm (≈300–400 mL).',
    how: ['Pick up the 1× TAE bottle.', 'Tap the tank to bring it over the reservoir.', 'Press and hold "Pour" and watch the level indicator.', 'Put the bottle back.'],
    why: W('TAE (Tris-acetate-EDTA) conducts the current and holds the pH steady so DNA stays negatively charged. It must be the same buffer the gel was made with, otherwise ion fronts distort the bands.'),
    molecular: W('Tris and acetate ions carry the current; EDTA chelates Mg²⁺, blocking any nucleases.'),
    see: 'A thin layer of buffer over the whole gel surface.',
    mistakes: ['Too little buffer → gel dries and overheats.', 'Water instead of buffer → almost no current, no migration.'],
    mol: null,
    tasks: [
      { label: 'Pour TAE into the tank', target: (L) => held(L, 'taebottle') ? 'chamber' : 'taebottle', done: (L) => L.S.gel.buffer > 50 },
      { label: 'Gel covered by 3–5 mm (300–450 mL)', done: (L) => L.S.gel.buffer >= 280 && L.S.gel.buffer <= 470 },
      { label: 'Return the bottle', done: (L) => L.S.gel.buffer >= 280 && loc(L, 'taebottle') === 'tae-home' },
    ],
  });

  steps.push({
    id: 'comb', module: 'Electrophoresis', station: 's4', title: 'Remove the comb',
    what: 'Pull the comb straight up out of the submerged gel.',
    how: ['Tap the comb (or drag it) to lift it out vertically.'],
    why: W('Removing the comb under buffer lets the wells fill with buffer instead of air, so they keep their shape and do not tear.'),
    molecular: W('The wells are pockets in the agarose network — rigid but brittle.'),
    see: 'A row of eight rectangular wells at the black end.',
    mistakes: ['Pulling at an angle tears the well bottoms; samples then leak under the gel.'],
    mol: null,
    tasks: [{ label: 'Comb removed', target: 'comb', done: (L) => L.S.gel.combOut }],
  });

  steps.push({
    id: 'dye', unordered: true, module: 'Electrophoresis', station: 's4', title: 'Add loading dye to the PCR products',
    what: `Add ${P.gel.dyeVol} µL 6× loading dye to PCR tubes 1, 2 and 3 (fresh tip each).`,
    how: ['Open the PCR strip.', `P20 → ${P.gel.dyeVol} µL → fresh tip → aspirate 6× DYE → dispense into tube 1 → eject. Repeat for tubes 2 and 3.`],
    why: W('Loading dye contains glycerol, which makes the sample denser than the buffer so it sinks into the well, and two tracking dyes that let you watch the run. 5 µL of 6× dye in 25 µL gives ≈1× final.'),
    molecular: W('Bromophenol blue (purple) runs like a ~300 bp fragment in this gel; xylene cyanol (cyan) runs like a fragment of several kilobases. Neither is DNA — they only show progress.'),
    see: 'The PCR tubes turn blue-purple.',
    mistakes: ['No dye → the sample floats out of the well.', 'Reusing the tip carries product from one tube to the next.'],
    mol: null,
    transfers: [1, 2, 3].map(i => ({ reagent: 'dye6x', to: `pcr${i}`, vol: P.gel.dyeVol })),
    tasks: [
      { label: 'Open the strip', done: (L) => L.V('pcr1').cap === false || amt(L, 'pcr1', 'dye6x') > 0 },
      ...[1, 2, 3].map(i => ({ label: `Tube ${i} ← ${P.gel.dyeVol} µL dye`, done: (L) => amt(L, `pcr${i}`, 'dye6x') >= P.gel.dyeVol * 0.9 })),
    ],
  });

  steps.push({
    id: 'load', unordered: true, module: 'Electrophoresis', station: 's4', title: 'Load the gel',
    what: `Lane 1: ${P.gel.ladderVol} µL ladder. Lane 2: ${P.gel.loadVol} µL sample (tube 1). Lane 3: positive control (tube 2). Lane 4: NTC (tube 3).`,
    how: ['Use the P20 with a fresh tip for every lane.', 'Ladder: set 5 µL, aspirate from LAD, tap well 1 (far left).', 'Hold the tip just inside the well — do not pierce the bottom.', 'Press SLOWLY to the first stop only (no blow-out), lift out, then release.', 'Repeat 10 µL from tubes 1, 2, 3 into wells 2, 3, 4.'],
    why: W('The ladder contains fragments of known size (100–1517 bp) and is the ruler for estimating the size of your product. Keeping a fixed lane order and recording it is essential for interpretation.'),
    molecular: W('The dense sample sinks to the bottom of the well and forms a thin layer, so all molecules start migrating from the same line — giving sharp bands.'),
    see: 'Blue-purple sample visible in wells 1–4.',
    mistakes: ['Puncturing the well → sample runs under the gel.', 'Blowing out to the second stop → air bubble ejects the sample.', 'Mixing up lanes → wrong interpretation.'],
    mol: null,
    transfers: [{ from: 'LAD', reagent: 'ladder', to: 'well1', vol: P.gel.ladderVol }, { from: 'pcr1', to: 'well2', vol: P.gel.loadVol }, { from: 'pcr2', to: 'well3', vol: P.gel.loadVol }, { from: 'pcr3', to: 'well4', vol: P.gel.loadVol }],
    tasks: [
      { label: `Well 1 ← ${P.gel.ladderVol} µL ladder`, done: (L) => amt(L, 'well1', 'ladder') >= P.gel.ladderVol * 0.85 },
      { label: 'Well 2 ← sample (tube 1)', done: (L) => L.S.log.some(e => e.type === 'dispense' && e.vid === 'well2' && e.from === 'pcr1') },
      { label: 'Well 3 ← positive control (tube 2)', done: (L) => L.S.log.some(e => e.type === 'dispense' && e.vid === 'well3' && e.from === 'pcr2') },
      { label: 'Well 4 ← NTC (tube 3)', done: (L) => L.S.log.some(e => e.type === 'dispense' && e.vid === 'well4' && e.from === 'pcr3') },
    ],
  });

  steps.push({
    id: 'electro', module: 'Electrophoresis', station: 's4', title: 'Run the gel',
    what: `Put the lid on, connect black-to-black and red-to-red, and run at ${P.gel.volts} V for ${P.gel.min} min.`,
    how: ['Tap the gel tank → "Lid on".', 'Tap the power supply → connect the leads (black to −, red to +).', `Set ${P.gel.volts} V and ${P.gel.min} min, then Start.`, 'Check that bubbles rise from both electrodes.'],
    why: W(`~${P.gel.volts} V across this tank gives about 5–8 V/cm — fast enough to finish in a lecture slot, slow enough to avoid heating that blurs bands.`),
    molecular: W('Water is electrolysed at the electrodes: H₂ at the cathode (more bubbles), O₂ at the anode. The DNA snakes through the agarose pores toward the anode; migration distance is roughly proportional to log(1/size).'),
    see: 'Bubbles at both electrodes; the purple dye front moves away from the wells toward red.',
    mistakes: ['Leads reversed → DNA runs backwards out of the wells.', 'Voltage too high → gel heats, bands smile and smear.', 'Running too long → small fragments run off the end.'],
    mol: 'gel-run',
    tasks: [
      { label: 'Lid on the tank', target: 'chamber', done: (L) => L.S.inst.chamberLid || L.S.gel.runVmin > 0 },
      { label: 'Leads connected', target: 'power', done: (L) => L.S.inst.ps.leads !== 'none' || L.S.gel.runVmin > 0 },
      { label: 'Start the power supply', target: 'power', ev: evIs('psStart') },
      { label: `Run until the dye front has moved (${P.gel.min} min)`, done: (L) => L.S.gel.runVmin >= P.gel.volts * P.gel.min * 0.85 && !L.S.inst.ps.on },
    ],
    check(kind, ctx) {
      if (kind === 'psStart' && ctx.volts > 150) return { id: 'high-voltage', title: 'Voltage too high', undoable: true, what: `${ctx.volts} V in a mini-gel tank.`, why: 'Current produces heat (P = V × I). Above ~10 V/cm the gel warms unevenly: the centre runs faster than the edges ("smiling"), bands broaden, and the gel can even melt.', fix: `Undo and use ~${P.gel.volts} V.` };
      return null;
    },
  });

  steps.push({
    id: 'image', module: 'Electrophoresis', station: 's4', title: 'Visualise the DNA bands',
    what: 'Switch off the power, move the gel to the blue-light transilluminator, lower the amber shield and turn on the light.',
    how: ['Make sure the power supply has stopped; take the lid off the tank.', 'Pick up the gel tray and tap the transilluminator.', 'Tap the transilluminator → lower the amber shield → Light ON.'],
    why: W('SYBR Safe bound to DNA absorbs blue light (~470–500 nm) and emits green-orange light (~520–530 nm). The amber filter blocks the blue excitation light so only the emission reaches your eyes or camera.'),
    molecular: W('The dye intercalates/binds between base pairs; its fluorescence increases >1000-fold when bound, so band brightness is roughly proportional to DNA mass.'),
    see: 'Glowing bands: the ladder rungs in lane 1, and a bright band in lanes 2 and 3 if amplification succeeded.',
    mistakes: ['Looking without the amber shield: bands are washed out by blue light.', 'Handling the gel with ungloved hands.'],
    mol: null,
    tasks: [
      { label: 'Power off & lid off', done: (L) => !L.S.inst.ps.on && !L.S.inst.chamberLid },
      { label: 'Gel on the transilluminator', target: (L) => held(L, 'tray') ? 'trans' : 'tray', done: (L) => loc(L, 'tray') === 'trans' },
      { label: 'Amber shield down', target: 'trans', done: (L) => L.S.inst.trans.shield },
      { label: 'Blue light on', target: 'trans', done: (L) => L.S.inst.trans.on },
    ],
  });

  steps.push({
    id: 'results', module: 'Results', station: 's4', title: 'Interpret the results',
    what: 'Open the gel analysis and compare each lane with the ladder.',
    how: ['Tap "Analyse gel" in the instructor panel.', 'Read the estimated size of each band.', 'Check the controls first: positive control band? NTC empty?'],
    why: W('Interpretation always starts with the controls. Only if the positive control worked and the NTC is clean can you conclude whether the strawberry sample contains the rbcL target.'),
    molecular: W('A single sharp band at ≈580 bp means the primers amplified one specific region of the chloroplast rbcL gene. A faint fuzzy band below 100 bp is usually primer-dimer, not a real product.'),
    see: 'Lane 2 and 3: a band between the 500 and 600 bp ladder rungs. Lane 4: no band (maybe faint primer-dimer).',
    mistakes: ['Interpreting the sample before checking the controls.', 'Mistaking primer-dimer for a product.'],
    mol: null,
    tasks: [{ label: 'Open the gel analysis', done: (L) => !!L.S.flags.analysed }],
  });

  return steps;
}

// Event-order helpers (simulated time can stand still between actions).
function lastIdx(L, pred) { const log = L.S.log; for (let i = log.length - 1; i >= 0; i--) if (pred(log[i])) return i; return -1; }
function mixedAfterLastDispense(L, vid) {
  const d = lastIdx(L, e => e.type === 'dispense' && e.vid === vid);
  const m = lastIdx(L, e => e.type === 'mix' && (e.vid === vid || (vid.startsWith('pcr') && e.vid === 'strip')));
  return m > d;
}
function washIdx(L) { return L.S.log.findIndex(e => e.type === 'dispense' && e.vid === 'B' && e.reagent === 'etoh70'); }
function seenAfter(L, start, pred) { if (start < 0) return false; return L.S.log.some((e, i) => i > start && pred(e)); }
export function programMatches(p) {
  const c = P.cycler;
  return p.init.t === c.init.t && p.init.s === c.init.s && p.cycles === c.cycles && p.den.t === c.den.t && p.den.s === c.den.s && p.ann.t === c.ann.t && p.ann.s === c.ann.s && p.ext.t === c.ext.t && p.ext.s === c.ext.s && p.final.t === c.final.t && p.final.s === c.final.s && p.hold === c.hold;
}

// Checklist helpers shared with the quick (10-step) version.
export { transferTasks, spinTasks, evIs, held, loc, amt, tolFor };
