// Reagents, vessel geometry, editable protocol parameters and the PCR math.

export const REAGENTS = {
  edwards: { name: 'Edwards extraction buffer', short: 'Extraction buffer', color: '#dfe9f7', density: 1.02,
    detail: '200 mM Tris-HCl pH 7.5 · 250 mM NaCl · 25 mM EDTA · 0.5% SDS' },
  lysate: { name: 'Strawberry juice (cell sap)', short: 'Cell sap', color: '#d23a5a', density: 1.03 },
  iso: { name: 'Isopropanol (2-propanol), 100%', short: 'Isopropanol', color: '#f2f6fb', density: 0.786, volatile: true },
  etoh70: { name: '70% ethanol', short: '70% ethanol', color: '#f2f6fb', density: 0.885, volatile: true },
  te: { name: 'TE buffer (10 mM Tris-HCl, 1 mM EDTA, pH 8.0)', short: 'TE buffer', color: '#e9f3fb', density: 1.0 },
  water: { name: 'Nuclease-free water', short: 'Water', color: '#e6f1fb', density: 1.0 },
  buffer10x: { name: '10× PCR buffer (Mg²⁺-free)', short: '10× buffer', color: '#e8eefc', density: 1.02 },
  mgcl2: { name: '25 mM MgCl₂', short: 'MgCl₂', color: '#eef3f8', density: 1.0 },
  dntp: { name: 'dNTP mix, 10 mM each', short: 'dNTPs', color: '#eef6f2', density: 1.0 },
  fwd: { name: 'rbcLa-F primer, 10 µM', short: 'Fwd primer', color: '#fff2e0', density: 1.0,
    detail: "5'-ATGTCACCACAAACAGAGACTAAAGC-3'" },
  rev: { name: 'rbcLa-R primer, 10 µM', short: 'Rev primer', color: '#f9e8f7', density: 1.0,
    detail: "5'-GTAAAATCAAGTCCACCRCG-3'" },
  taq: { name: 'Taq DNA polymerase, 5 U/µL (in 50% glycerol)', short: 'Taq', color: '#f4f4ea', density: 1.13, viscous: true },
  posctrl: { name: 'Positive control DNA (spinach gDNA, 10 ng/µL)', short: '+ control DNA', color: '#eaf0f6', density: 1.0 },
  dye6x: { name: '6× loading dye (bromophenol blue, xylene cyanol, glycerol)', short: '6× loading dye', color: '#3b45c9', density: 1.08 },
  ladder: { name: '100 bp DNA ladder, ready-to-load (with dye)', short: '100 bp ladder', color: '#4a50c8', density: 1.05 },
  agarose: { name: '1.5% agarose in 1× TAE + SYBR Safe (≈ 55 °C)', short: 'Molten agarose', color: '#f3f1dc', density: 1.0 },
  tae: { name: '1× TAE running buffer', short: '1× TAE', color: '#e3eef8', density: 1.0 },
};

// Inner profiles of vessels, [y, r] in metres from the vessel origin (bottom).
export const PROFILES = {
  micro: [[0.0015, 0.0008], [0.014, 0.0045], [0.037, 0.0048]],
  pcr: [[0.0012, 0.0006], [0.009, 0.0025], [0.019, 0.0028]],
  conical: [[0.002, 0.001], [0.02, 0.0072], [0.112, 0.0076]],
  beaker: [[0.003, 0.03], [0.085, 0.031]],
  flask: [[0.003, 0.04], [0.07, 0.034], [0.115, 0.014], [0.145, 0.0135]],
  bottle: [[0.006, 0.042], [0.15, 0.042], [0.178, 0.02], [0.2, 0.017]],
};

const tables = {};
export function profileTable(kind) {
  if (tables[kind]) return tables[kind];
  const p = PROFILES[kind];
  const y0 = p[0][0], y1 = p[p.length - 1][0];
  const N = 240, out = [];
  let vol = 0, prevR = rAt(p, y0), prevY = y0;
  out.push([y0, 0]);
  for (let i = 1; i <= N; i++) {
    const y = y0 + (y1 - y0) * i / N, r = rAt(p, y);
    const dy = y - prevY;
    vol += Math.PI / 3 * dy * (prevR * prevR + prevR * r + r * r) * 1e9; // µL
    out.push([y, vol]);
    prevR = r; prevY = y;
  }
  tables[kind] = out;
  return out;
}
export function rAt(p, y) {
  if (y <= p[0][0]) return p[0][1];
  for (let i = 1; i < p.length; i++) {
    if (y <= p[i][0]) {
      const t = (y - p[i - 1][0]) / (p[i][0] - p[i - 1][0]);
      return p[i - 1][1] + (p[i][1] - p[i - 1][1]) * t;
    }
  }
  return p[p.length - 1][1];
}
export function capacity(kind) { const t = profileTable(kind); return t[t.length - 1][1]; }
export function heightForVolume(kind, v) {
  const t = profileTable(kind);
  if (v <= 0) return t[0][0];
  for (let i = 1; i < t.length; i++) {
    if (v <= t[i][1]) {
      const f = (v - t[i - 1][1]) / (t[i][1] - t[i - 1][1]);
      return t[i - 1][0] + (t[i][0] - t[i - 1][0]) * f;
    }
  }
  return t[t.length - 1][0];
}

// ---------------------------------------------------------------------------
// Editable protocol. Every value used by the simulator lives here so it is
// explicit; the Protocol editor writes into this object.
export const PROTOCOL = {
  extraction: {
    tissueMin: 80, tissueMax: 150,   // mg of strawberry tissue
    bufferVol: 400,                  // µL Edwards buffer
    spin1: { g: 13000, min: 1 },
    supVol: 300,                     // µL supernatant transferred
    isoVol: 300,                     // µL isopropanol (1 vol)
    inversions: 10,
    spin2: { g: 13000, min: 5 },
    washVol: 500,                    // µL 70% ethanol
    spin3: { g: 13000, min: 2 },
    dryMin: 10,
    teVol: 100,                      // µL TE
  },
  pcr: {
    reactions: 3, extra: 1, rxnVol: 25, templateVol: 1, aliquot: 24,
    comps: [
      { id: 'water', label: 'Nuclease-free water', stock: null, final: null, unit: '' },
      { id: 'buffer10x', label: '10× PCR buffer', stock: 10, final: 1, unit: '×' },
      { id: 'mgcl2', label: 'MgCl₂', stock: 25, final: 1.5, unit: 'mM' },
      { id: 'dntp', label: 'dNTPs (each)', stock: 10, final: 0.2, unit: 'mM' },
      { id: 'fwd', label: 'Forward primer', stock: 10, final: 0.2, unit: 'µM' },
      { id: 'rev', label: 'Reverse primer', stock: 10, final: 0.2, unit: 'µM' },
      { id: 'taq', label: 'Taq polymerase', stock: 5, final: 0.625, unit: 'U' },
    ],
  },
  cycler: {
    init: { t: 95, s: 120 }, cycles: 35,
    den: { t: 95, s: 30 }, ann: { t: 55, s: 30 }, ext: { t: 72, s: 45 },
    final: { t: 72, s: 300 }, hold: 4, lid: 105,
  },
  gel: { pct: 1.5, castVol: 35, dyeVol: 5, ladderVol: 5, loadVol: 10, volts: 100, min: 35 },
  model: {
    efficiency: 0.90,       // per-cycle efficiency under ideal conditions
    ampliconBp: 580,        // rbcLa product size assumed by the simulator
    cpFraction: 0.15,       // fraction of plant total DNA that is chloroplast DNA
    cpGenomeBp: 155000,
    nmaxCopies: 1.0e12,     // plateau ceiling set by enzyme/primer/dNTP depletion
    dnaPer100mg: 3000,      // ng DNA released from 100 mg strawberry tissue by full lysis
  },
  speed: 40,                // simulated seconds per real second for timers
};

// Per-reaction volume for a component, from the calculator definition.
export function perReaction(comp, P = PROTOCOL.pcr) {
  if (comp.id === 'water') {
    const others = P.comps.filter(c => c.id !== 'water').reduce((a, c) => a + perReaction(c, P), 0);
    return round3(P.rxnVol - others - P.templateVol);
  }
  if (comp.unit === 'U') return round3(comp.final / comp.stock);
  return round3(P.rxnVol * comp.final / comp.stock);
}
export function masterMix(P = PROTOCOL.pcr) {
  const n = P.reactions + P.extra;
  const rows = P.comps.map(c => ({ ...c, per: perReaction(c, P), total: round3(perReaction(c, P) * n) }));
  const perTotal = round3(rows.reduce((a, r) => a + r.per, 0));
  return { n, rows, perTotal, total: round3(perTotal * n) };
}
export function round3(x) { return Math.round(x * 1000) / 1000; }

export const PIPETTES = {
  P2: { min: 0.2, max: 2, step: 0.01, decimals: 2, tips: ['t10'], color: 0xd9472b, label: 'P2' },
  P20: { min: 2, max: 20, step: 0.02, decimals: 2, tips: ['t10', 't200'], color: 0xf2c230, label: 'P20' },
  P200: { min: 20, max: 200, step: 0.1, decimals: 1, tips: ['t200'], color: 0xf2c230, label: 'P200' },
  P1000: { min: 100, max: 1000, step: 1, decimals: 0, tips: ['t1000'], color: 0x2b72d9, label: 'P1000' },
};
export const TIPS = {
  t10: { label: '10 µL tip', cap: 10, len: 0.046, rTop: 0.0028, rBot: 0.0004, color: 0xf4f7fb },
  t200: { label: '200 µL tip', cap: 200, len: 0.051, rTop: 0.0034, rBot: 0.0005, color: 0xf6d34a },
  t1000: { label: '1000 µL tip', cap: 1000, len: 0.074, rTop: 0.0046, rBot: 0.0006, color: 0x4a8fe6 },
};

export const LADDER_100 = [
  { bp: 1517, ng: 45 }, { bp: 1200, ng: 35 }, { bp: 1000, ng: 95 }, { bp: 900, ng: 27 }, { bp: 800, ng: 24 },
  { bp: 700, ng: 21 }, { bp: 600, ng: 18 }, { bp: 500, ng: 97 }, { bp: 400, ng: 38 }, { bp: 300, ng: 29 },
  { bp: 200, ng: 25 }, { bp: 100, ng: 48 },
];

export function fmtSci(n) {
  if (!isFinite(n) || n <= 0) return '0';
  const e = Math.floor(Math.log10(n));
  if (e < 4) return Math.round(n).toLocaleString();
  const m = n / Math.pow(10, e);
  const sup = String(e).split('').map(d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]).join('');
  return `${m.toFixed(1)} × 10${sup}`;
}
export function fmtTime(s) {
  s = Math.max(0, Math.round(s));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
