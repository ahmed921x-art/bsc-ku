// End-to-end self-test: performs the whole experiment through the same lab
// actions the touch interface uses, and reports any step whose checklist did
// not complete or any mistake the engine raised.
// Run from the browser console:  await (await import('./tools/selftest.js')).run()
import { PROTOCOL } from '../js/data.js';

export async function run({ log = true, stopAt = null } = {}) {
  try { return await runInner({ log, stopAt }); } catch (e) { if (e === 'STOP') return { stopped: stopAt }; throw e; }
}
async function runInner({ log, stopAt }) {
  const { lab: L, engine: E, app, ui } = window.__lab;
  const mistakes = [];
  const realMistake = E.mistake.bind(E);
  E.mistake = (d) => { if (d) mistakes.push(`[${E.step.id}] ${d.id}`); return d; };
  const report = [];
  const tick = (sec) => { for (let i = 0; i < sec * 20; i++) L.tick(0.05); };
  const xfer = (pip, vol, box, from, to, { keepTip = false, firstStopOnly = false } = {}) => {
    if (L.S.held?.id !== pip) L.pickPipette(pip);
    L.setVolume(vol);
    if (!L.S.pip[pip].tip) L.attachTip(box);
    L.setPlunger(1); L.moveTo(from); L.setPlunger(0);
    L.moveTo(to); L.setPlunger(1); if (!firstStopOnly) L.setPlunger(2); L.withdraw(); L.setPlunger(0);
    if (!keepTip) { L.ejectAuto(); L.returnPipette(); }
  };
  const done = (label) => {
    if (stopAt && E.step.id === stopAt) { E.mistake = realMistake; throw 'STOP'; }
    const ok = E.isComplete();
    report.push({ step: E.step.id, ok, open: ok ? [] : E.tasks().filter(t => !t.done).map(t => t.label) });
    if (log) console.log(ok ? '✓' : '✗', E.step.id, label || '');
    E.next();
  };
  const spin = (tube, sec, home) => {
    if (!L.S.inst.cfg.lid) L.cfgToggleLid();
    L.pickItem(tube); L.placeAt('cfg#0'); L.pickItem('BAL'); L.placeAt('cfg#6');
    L.cfgToggleLid(); L.cfgSet('sec', sec); L.cfgStart(); tick(sec / PROTOCOL.speed + 1);
    L.cfgToggleLid(); L.pickItem(tube); L.placeAt(home); L.pickItem('BAL'); L.placeAt('rack1#9');
  };
  const X = PROTOCOL.extraction;
  E.goto(0);
  app.goStation('ppe', true);
  ['coat', 'gloves', 'goggles'].forEach(id => L.wear(id)); done();
  app.goStation('s1', true);
  L.select('berry'); L.cutSample(); L.pickItem('tissue'); L.placeIn('balance'); L.toggleCap('A'); L.pickItem('tissue'); L.tap('A'); done();
  xfer('P1000', X.bufferVol, 'tb1000', 'st_edwards', 'A'); done();
  L.pickItem('pestle'); L.tap('A'); for (let i = 0; i < 800 && L.V('A').tissue.lysed < 1; i++) L.grind(0.004); L.removePestle(); L.toggleCap('A'); done();
  L.pickItem('A'); L.tap('vortex'); L.vortexStart(); L.vortexTime = 2; L.vortexStop(); L.pickItem('A'); L.placeAt('rack1#5'); done();
  spin('A', X.spin1.min * 60, 'rack1#5'); done();
  L.toggleCap('A'); L.toggleCap('B'); xfer('P1000', X.supVol, 'tb1000', 'A', 'B'); done();
  xfer('P1000', X.isoVol, 'tb1000', 'st_iso', 'B'); L.toggleCap('B'); L.pickItem('B'); for (let i = 0; i < X.inversions; i++) L.invert('B'); L.putBack(); done();
  spin('B', X.spin2.min * 60, 'rack1#6'); done();
  L.toggleCap('B'); xfer('P1000', 550, 'tb1000', 'B', 'liqwaste1'); done();
  xfer('P1000', X.washVol, 'tb1000', 'st_etoh', 'B'); L.toggleCap('B'); spin('B', X.spin3.min * 60, 'rack1#6'); L.toggleCap('B'); xfer('P1000', 500, 'tb1000', 'B', 'liqwaste1'); done();
  L.startDrying('B', X.dryMin); tick(6); done();
  xfer('P200a', X.teVol, 'tb200a', 'st_te', 'B'); L.toggleCap('B'); L.pickItem('B'); for (let i = 0; i < 4; i++) L.flick('B'); L.putBack(); done();
  // PCR set-up
  L.pickItem('B'); app.goStation('s2', true); L.tap('cold'); done();
  ui.showCalc(); document.getElementById('calcOk').click(); done();
  L.toggleCap('MM');
  const mm = (await import('../js/data.js')).masterMix();
  const v = (id) => mm.rows.find(r => r.id === id).total;
  xfer('P200', v('water'), 'tb200', 's_water', 'MM');
  xfer('P20', v('buffer10x'), 'tb10', 's_buffer', 'MM');
  xfer('P20', v('mgcl2'), 'tb10', 's_mg', 'MM');
  xfer('P2', v('dntp'), 'tb10', 's_dntp', 'MM');
  xfer('P2', v('fwd'), 'tb10', 's_fwd', 'MM');
  xfer('P2', v('rev'), 'tb10', 's_rev', 'MM');
  xfer('P2', v('taq'), 'tb10', 's_taq', 'MM'); done();
  L.toggleCap('MM'); L.pickItem('MM'); L.flick('MM'); L.flick('MM'); L.putBack(); done();
  L.toggleCap('strip'); L.toggleCap('MM');
  for (const t of ['pcr1', 'pcr2', 'pcr3']) xfer('P200', PROTOCOL.pcr.aliquot, 'tb200', 'MM', t, { keepTip: t !== 'pcr3' });
  done();
  L.toggleCap('B');
  xfer('P2', 1, 'tb10', 'B', 'pcr1'); xfer('P2', 1, 'tb10', 's_pos', 'pcr2'); xfer('P2', 1, 'tb10', 's_water', 'pcr3'); done();
  L.toggleCap('strip'); L.pickItem('strip'); L.flick('strip'); L.putBack();
  L.spinnerToggleLid(); L.pickItem('strip'); L.placeAt('spinner'); L.spinnerToggleLid(); L.spinnerStart(); tick(4);
  ui.showVerify(); ui.closeModal(); done();
  // thermocycler
  L.spinnerToggleLid(); L.pickItem('strip'); app.goStation('s3', true); L.tcToggleLid(); L.placeAt('tc-block'); L.tcToggleLid(); done();
  L.S.flags.programOpened = true; L.tcSetProgram(PROTOCOL.cycler); done();
  L.tcStart(); for (let i = 0; i < 200 && !L.S.pcr.ran; i++) tick(1); done();
  L.tcToggleLid(); L.pickItem('strip'); app.goStation('s4', true); L.placeAt('pcrrack4'); done();
  // gel
  L.pickItem('comb'); L.placeAt('comb-back');
  L.pickItem('flask'); L.dockPour('tray'); L.pourActive = true; for (let i = 0; i < 80; i++) L.pour(0.05); L.stopPour(); L.putBack();
  L.ffGel = true; tick(8); done();
  L.pickItem('tray'); L.placeAt('chamber'); done();
  L.pickItem('taebottle'); L.dockPour('chamber'); L.pourActive = true; for (let i = 0; i < 100; i++) L.pour(0.05); L.stopPour(); L.putBack(); done();
  L.pickItem('comb'); done();
  L.toggleCap('strip'); L.toggleCap('DYE');
  for (const t of ['pcr1', 'pcr2', 'pcr3']) xfer('P20g', PROTOCOL.gel.dyeVol, 'tb200g', 'DYE', t);
  done();
  L.toggleCap('LAD');
  xfer('P20g', PROTOCOL.gel.ladderVol, 'tb200g', 'LAD', 'well1', { firstStopOnly: true });
  xfer('P20g', PROTOCOL.gel.loadVol, 'tb200g', 'pcr1', 'well2', { firstStopOnly: true });
  xfer('P20g', PROTOCOL.gel.loadVol, 'tb200g', 'pcr2', 'well3', { firstStopOnly: true });
  xfer('P20g', PROTOCOL.gel.loadVol, 'tb200g', 'pcr3', 'well4', { firstStopOnly: true });
  done();
  L.chamberToggleLid(); L.psLeads('correct'); L.psStart(); tick(PROTOCOL.gel.min * 60 / PROTOCOL.speed + 2); done();
  L.chamberToggleLid(); L.pickItem('tray'); L.placeAt('trans'); L.transToggle('shield'); L.transToggle('on'); done();
  ui.showAnalysis();
  const verdict = document.querySelector('.verdict')?.textContent;
  done();
  E.mistake = realMistake;
  const result = { failed: report.filter(r => !r.ok), mistakes, verdict, pcr: Object.fromEntries(Object.entries(L.S.pcr.results).map(([k, r]) => [k, { N0: r.N0.toExponential(2), N: r.N.toExponential(2), E: +r.E.toFixed(3), products: r.products.map(p => `${p.bp}bp:${p.ng.toFixed(1)}ng`) }])) };
  if (log) console.log(result);
  return result;
}
