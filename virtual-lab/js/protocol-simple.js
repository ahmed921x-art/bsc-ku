// Express version: the same experiment in 5 steps (about 4 minutes).
// PPE is on, the sample is cut and weighed, the master mix is in the PCR
// tubes, the gel is cast with the ladder loaded, and repetitive actions
// (balancing the rotor, pouring off, adding TE, loading the controls)
// are one tap. The presenter does the key hands-on moments.
import { PROTOCOL as P } from './data.js';
import { evIs, held, loc, amt } from './protocol.js';

const pipStep = (pip, box, from, to, reagentOrFrom, vol, label) => [
  { label: `Pick up the ${pip.replace(/[ag]$/, '')} and tap the tip box`, target: (L) => L.S.held?.id === pip ? box : pip, done: (L) => !!L.S.pip[pip].tip || amtDone(L, to, reagentOrFrom, vol) },
  { label: `Aspirate ${label}, then dispense it into ${to.startsWith('pcr') ? 'PCR tube ' + to.slice(3) : to.startsWith('well') ? 'well ' + to.slice(4) : 'Tube ' + to}`, target: (L) => tipFull(L, pip) ? to : from, done: (L) => amtDone(L, to, reagentOrFrom, vol) },
];
const tipFull = (L, pip) => { const t = L.S.pip[pip]?.tip; return t && Object.values(t.liq).reduce((a, b) => a + b, 0) > 0.01; };
function amtDone(L, to, key, vol) {
  if (key.startsWith('from:')) { const from = key.slice(5); return L.S.log.reduce((a, e) => a + (e.type === 'dispense' && e.vid === to && e.from === from ? e.vol : 0), 0) >= vol * 0.9; }
  return amt(L, to, key) >= vol * 0.9;
}

export function buildSimpleSteps() {
  const E = P.extraction;
  return [
    {
      id: 'x-lyse', module: 'DNA Extraction', station: 's1', title: 'Break open the cells',
      what: 'Put the strawberry piece into Tube A, add 400 µL extraction buffer, and grind.',
      how: ['Drag the red piece from the balance onto Tube A.', 'Pick up the P1000 (already set to 400 µL), tap the blue tip box.', 'Tap the Edwards Buffer tube → Aspirate, tap Tube A → Dispense, then Eject tip.', 'Pick up the micropestle, tap Tube A and rub circles on the pad.'],
      why: 'SDS in the buffer dissolves the cell membranes and EDTA blocks DNA-cutting enzymes; grinding breaks the tough cellulose walls.',
      molecular: 'Membranes fall apart into detergent micelles and long DNA strands unfold out of the nuclei.',
      see: 'The red tissue disappears and the buffer turns pink.',
      mistakes: ['Not grinding enough leaves DNA locked inside intact cells.'],
      mol: 'lysis', autoVol: { P1000: E.bufferVol },
      transfers: [{ reagent: 'edwards', to: 'A', vol: E.bufferVol }],
      tasks: [
        { label: 'Strawberry piece into Tube A', target: (L) => held(L, 'tissue') ? 'A' : 'tissue', done: (L) => !!L.V('A').tissue },
        ...pipStep('P1000', 'tb1000', 'st_edwards', 'A', 'edwards', E.bufferVol, '400 µL buffer'),
        { label: 'Grind to 100%', target: (L) => loc(L, 'pestle')?.startsWith('in:') ? null : held(L, 'pestle') ? 'A' : 'pestle', done: (L) => (L.V('A').tissue?.lysed || 0) >= 1 },
      ],
    },
    {
      id: 'x-precip', module: 'DNA Extraction', station: 's1', title: 'Spin, then precipitate the DNA',
      what: 'Spin Tube A, pour the clear liquid into Tube B, add 300 µL isopropanol and invert.',
      how: ['Tap the centrifuge → "Quick spin" (it loads the balance tube for you).', 'Drag Tube A onto Tube B to pour off the clear supernatant — the pellet stays behind.', 'P1000 (set to 300 µL) → tip → Isopropanol → Tube B → eject.', 'Tap Tube B → "Invert ×10".'],
      why: 'The spin pellets cell walls and denatured proteins. Isopropanol plus the salt in the buffer makes DNA insoluble, so it clumps together.',
      molecular: 'Na⁺ neutralises the negative phosphate backbone; without their water shell the strands stick together as white threads.',
      see: 'A red pellet in Tube A; white cloudy threads in Tube B after inverting.',
      mistakes: ['Pouring too far carries the debris pellet over.', 'Shaking hard breaks the long DNA strands.'],
      mol: 'precip', autoVol: { P1000: E.isoVol },
      transfers: [{ reagent: 'iso', to: 'B', vol: E.isoVol }],
      tasks: [
        { label: 'Quick-spin Tube A', target: 'centrifuge', done: (L) => L.S.log.some(e => e.type === 'cfgDone' && e.tubes.includes('A')) },
        { label: 'Pour the supernatant into Tube B', target: (L) => held(L, 'A') ? 'B' : 'A', done: (L) => L.S.log.some(e => e.type === 'decant' && e.from === 'A' && e.to === 'B') },
        ...pipStep('P1000', 'tb1000', 'st_iso', 'B', 'iso', E.isoVol, '300 µL isopropanol'),
        { label: 'Invert ×10', target: 'B', done: (L) => (L.V('B').inversions || 0) >= E.inversions },
      ],
    },
    {
      id: 'x-dna', module: 'DNA Extraction', station: 's1', title: 'Collect your DNA',
      what: 'Spin Tube B, pour the alcohol into the waste, then add TE to dissolve the DNA pellet.',
      how: ['Tap the centrifuge → "Quick spin".', 'Drag Tube B onto the liquid-waste beaker — the DNA pellet stays in the tube.', 'Tap Tube B → "Add TE & dissolve".'],
      why: 'The spin packs the DNA into a pellet; the alcohol is removed and the DNA is re-dissolved in TE buffer (pH 8, EDTA protects it). This tube is your PCR template.',
      molecular: 'Water re-hydrates the phosphate backbone and the strands unwind back into solution.',
      see: 'A small white pellet that disappears in TE. The yield card shows your DNA concentration.',
      mistakes: ['Pouring the pellet out with the alcohol throws your DNA away.'],
      mol: 'dissolve',
      tasks: [
        { label: 'Quick-spin Tube B', target: 'centrifuge', done: (L) => L.S.log.some(e => e.type === 'cfgDone' && e.tubes.includes('B')) },
        { label: 'Pour the alcohol into the waste', target: (L) => held(L, 'B') ? 'liqwaste1' : 'B', done: (L) => L.S.log.some(e => e.type === 'decant' && e.from === 'B' && e.to === 'liqwaste1') },
        { label: 'Add TE and dissolve', target: 'B', done: (L) => amt(L, 'B', 'te') > 50 },
      ],
    },
    {
      id: 'x-pcr', module: 'PCR', station: 's2', title: 'Add your DNA and run the PCR',
      what: 'Bring Tube B to the PCR station, add 1 µL to PCR tube 1, then load the strip into the thermocycler and start.',
      how: ['Drag Tube B, switch to "PCR Setup", tap the cold block.', 'P2 (set to 1 µL) → tip → Tube B → Aspirate → PCR tube 1 → Dispense → eject.', 'Drag the strip, switch to "Thermocycler", tap the thermocycler, then tap it again → Start run.'],
      why: 'Tubes 1–3 already hold master mix (buffer, Mg²⁺, dNTPs, rbcL primers, Taq, dye). Tube 2 has positive-control DNA and tube 3 only water, so the result can be trusted. Each cycle can double the target.',
      molecular: 'Watch the molecular view: 95 °C melts the helix, primers bind at 55 °C, and Taq copies at 72 °C.',
      see: 'The cycle counter climbs to 35 while the block heats and cools.',
      mistakes: ['Reusing the tip from Tube B on another tube contaminates it.'],
      mol: 'pcr', autoVol: { P2: P.pcr.templateVol },
      transfers: [{ from: 'B', to: 'pcr1', vol: P.pcr.templateVol }],
      tasks: [
        { label: 'Tube B in the cold block', target: (L) => held(L, 'B') ? 'cold' : 'B', done: (L) => loc(L, 'B')?.startsWith('cold') },
        ...pipStep('P2', 'tb10', 'B', 'pcr1', 'from:B', P.pcr.templateVol, '1 µL of your DNA'),
        { label: 'Strip in the thermocycler', target: (L) => held(L, 'strip') ? 'cycler' : 'strip', done: (L) => loc(L, 'strip') === 'tc-block' },
        { label: 'Start the run', target: 'cycler', ev: evIs('tcStart') },
        { label: 'Run complete', ev: evIs('tcDone') },
      ],
    },
    {
      id: 'x-gel', module: 'Gel & Results', station: 's4', title: 'Run the gel and read the result',
      what: 'Load 10 µL of your PCR product into well 2, run the gel, and view the bands on the blue light.',
      how: ['Drag the strip from the thermocycler, switch to "Electrophoresis", tap the PCR rack.', 'P20 (set to 10 µL) → tip → PCR tube 1 → Aspirate → well 2 → Dispense → eject. (Ladder and controls are already loaded.)', 'Tap the power supply → "Run gel".', 'When it stops, drag the gel tray onto the transilluminator, tap it → "Light ON", then "Analyse gel".'],
      why: 'DNA is negatively charged and runs toward red (+); small pieces move faster through the agarose, so fragments separate by size and glow with SYBR Safe.',
      molecular: 'A band between the 500 and 600 bp ladder rungs is the ≈580 bp rbcL product from your strawberry.',
      see: 'Ladder in lane 1, a bright band in lanes 2 (you) and 3 (+ control), nothing in lane 4 (NTC).',
      mistakes: ['Reversed leads would run the DNA out of the gel.'],
      mol: 'gel-run', autoVol: { P20g: P.gel.loadVol },
      transfers: [{ from: 'pcr1', to: 'well2', vol: P.gel.loadVol }],
      tasks: [
        { label: 'Strip in the electrophoresis rack', target: (L) => held(L, 'strip') ? 'pcrrack4' : 'strip', done: (L) => loc(L, 'strip') === 'pcrrack4' },
        ...pipStep('P20g', 'tb200g', 'strip', 'well2', 'from:pcr1', P.gel.loadVol, '10 µL from PCR tube 1'),
        { label: 'Run the gel', target: 'power', done: (L) => L.S.gel.runVmin >= P.gel.volts * P.gel.min * 0.85 && !L.S.inst.ps.on },
        { label: 'Gel on the transilluminator, light on', target: (L) => held(L, 'tray') ? 'trans' : loc(L, 'tray') === 'trans' ? 'trans' : 'tray', done: (L) => loc(L, 'tray') === 'trans' && L.S.inst.trans.on },
        { label: 'Analyse the gel', done: (L) => !!L.S.flags.analysed },
      ],
    },
  ];
}

// Everything prepared before the demonstration starts.
export function applySimplePresets(S, PP = P) {
  PP.speed = 120; PP.tcSpeed = 300;
  S.ppe = { coat: true, gloves: true, goggles: true };
  S.cutDone = true; S.tissueMg = 112;
  S.items.tissue.hidden = false; S.items.tissue.loc = 'balance-pan';
  S.vessels.A.cap = false;
  const per = { buffer10x: 2.5, mgcl2: 1.5, dntp: 0.5, fwd: 0.5, rev: 0.5, taq: 0.125, dye6x: 4 };
  per.water = +(PP.pcr.aliquot - Object.values(per).reduce((a, b) => a + b, 0)).toFixed(3);
  for (const i of [1, 2, 3]) S.vessels[`pcr${i}`].liq = { ...per };
  S.vessels.pcr2.liq.posctrl = 1;
  S.vessels.pcr3.liq.water += 1;
  for (const i of [1, 2, 3]) S.vessels[`pcr${i}`].cap = false;
  for (let i = 4; i <= 8; i++) S.vessels[`pcr${i}`].cap = false;
  S.vessels.MM.liq = {};
  S.items.tray.loc = 'chamber';
  S.gel = { ...S.gel, poured: PP.gel.castVol, pouredAt: 0, solid: 1, wells: 'back', combOut: true, buffer: 350 };
  S.vessels.flask.liq.agarose -= PP.gel.castVol * 1000;
  S.vessels.taebottle.liq.tae -= 350 * 1000;
  S.vessels.well1.liq = { ladder: PP.gel.ladderVol };
  S.vessels.LAD.liq.ladder -= PP.gel.ladderVol;
  S.inst.tc.program = JSON.parse(JSON.stringify(PP.cycler));
  S.calc.confirmed = true; S.verified = true;
}
