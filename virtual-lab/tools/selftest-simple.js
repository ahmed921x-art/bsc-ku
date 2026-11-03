// End-to-end self-test for the quick (10-step) version, opened from simple.html.
// Run from the browser console:  await (await import('./tools/selftest-simple.js')).run()
import { PROTOCOL } from '../js/data.js';

export async function run({ log = true } = {}) {
  const { lab: L, engine: E, app, ui } = window.__lab;
  const mistakes = [], report = [];
  const realMistake = E.mistake.bind(E);
  E.mistake = (d) => { if (d) mistakes.push(`[${E.step.id}] ${d.id}`); return d; };
  const tick = (sec) => { for (let i = 0; i < sec * 20; i++) L.tick(0.05); };
  const xfer = (pip, vol, box, from, to, { keepTip = false } = {}) => {
    if (L.S.held?.id !== pip) L.pickPipette(pip);
    L.setVolume(vol);
    if (!L.S.pip[pip].tip) L.attachTip(box);
    L.moveTo(from); L.assist('aspirate'); L.moveTo(to); L.assist('dispense');
    if (!keepTip) { L.ejectAuto(); L.returnPipette(); }
  };
  const done = () => {
    const ok = E.isComplete();
    report.push({ step: E.step.id, ok, open: ok ? [] : E.tasks().filter(t => !t.done).map(t => t.label) });
    if (log) console.log(ok ? '✓' : '✗', E.step.id);
    E.next();
  };
  const spin = (tube, sec, home) => {
    if (!L.S.inst.cfg.lid) L.cfgToggleLid();
    L.pickItem(tube); L.placeAt('cfg#0'); L.pickItem('BAL'); L.placeAt('cfg#6');
    L.cfgToggleLid(); L.cfgSet('sec', sec); L.cfgStart(); tick(sec / PROTOCOL.speed + 1);
    L.cfgToggleLid(); L.pickItem(tube); L.placeAt(home); L.pickItem('BAL'); L.placeAt('rack1#9');
  };
  const X = PROTOCOL.extraction;
  E.goto(0); app.goStation('ppe', true);
  ['coat', 'gloves', 'goggles'].forEach(id => L.wear(id)); done();
  app.goStation('s1', true);
  L.select('berry'); L.cutSample(); L.pickItem('tissue'); L.placeIn('balance'); L.toggleCap('A'); L.pickItem('tissue'); L.tap('A'); done();
  xfer('P1000', X.bufferVol, 'tb1000', 'st_edwards', 'A');
  L.pickItem('pestle'); L.tap('A'); for (let i = 0; i < 800 && L.V('A').tissue.lysed < 1; i++) L.grind(0.004); L.removePestle(); L.toggleCap('A'); done();
  spin('A', X.spin1.min * 60, 'rack1#5'); L.toggleCap('A'); L.toggleCap('B'); xfer('P1000', X.supVol, 'tb1000', 'A', 'B'); done();
  xfer('P1000', X.isoVol, 'tb1000', 'st_iso', 'B'); L.toggleCap('B'); L.pickItem('B'); for (let i = 0; i < X.inversions; i++) L.invert('B'); L.putBack();
  spin('B', X.spin2.min * 60, 'rack1#6'); done();
  L.toggleCap('B'); xfer('P1000', 550, 'tb1000', 'B', 'liqwaste1'); L.startDrying('B', X.dryMin); tick(6);
  xfer('P200a', X.teVol, 'tb200a', 'st_te', 'B'); L.toggleCap('B'); L.pickItem('B'); for (let i = 0; i < 4; i++) L.flick('B'); L.putBack(); done();
  L.pickItem('B'); app.goStation('s2', true); L.tap('cold');
  L.toggleCap('strip'); L.toggleCap('MM'); L.toggleCap('B');
  for (const t of ['pcr1', 'pcr2', 'pcr3']) xfer('P200', PROTOCOL.pcr.aliquot, 'tb200', 'MM', t, { keepTip: t !== 'pcr3' });
  xfer('P2', 1, 'tb10', 'B', 'pcr1'); xfer('P2', 1, 'tb10', 's_pos', 'pcr2'); xfer('P2', 1, 'tb10', 's_water', 'pcr3'); done();
  L.toggleCap('strip'); L.pickItem('strip'); app.goStation('s3', true); L.tcToggleLid(); L.placeAt('tc-block'); L.tcToggleLid();
  L.tcStart(); for (let i = 0; i < 200 && !L.S.pcr.ran; i++) tick(1); done();
  L.tcToggleLid(); L.pickItem('strip'); app.goStation('s4', true); L.placeAt('pcrrack4'); L.toggleCap('strip'); L.toggleCap('LAD');
  xfer('P20g', PROTOCOL.gel.ladderVol, 'tb200g', 'LAD', 'well1');
  xfer('P20g', PROTOCOL.gel.loadVol, 'tb200g', 'pcr1', 'well2');
  xfer('P20g', PROTOCOL.gel.loadVol, 'tb200g', 'pcr2', 'well3');
  xfer('P20g', PROTOCOL.gel.loadVol, 'tb200g', 'pcr3', 'well4'); done();
  L.chamberToggleLid(); L.psLeads('correct'); L.psStart(); tick(PROTOCOL.gel.min * 60 / PROTOCOL.speed + 2);
  L.chamberToggleLid(); L.pickItem('tray'); L.placeAt('trans'); L.transToggle('shield'); L.transToggle('on');
  ui.showAnalysis(); const verdict = document.querySelector('.verdict')?.textContent; done();
  E.mistake = realMistake;
  const result = { steps: E.steps.length, failed: report.filter(r => !r.ok), mistakes, verdict };
  if (log) console.log(result);
  return result;
}
