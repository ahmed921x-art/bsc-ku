// End-to-end self-test for the express (5-step) version, opened from simple.html.
// Also counts presenter actions and on-screen waiting time.
// Run from the browser console:  await (await import('./tools/selftest-simple.js')).run()
import { PROTOCOL } from '../js/data.js';

export async function run({ log = true } = {}) {
  const { lab: L, engine: E, app, ui } = window.__lab;
  const mistakes = [], report = [];
  let actions = 0, waitSec = 0;
  const act = (n = 1) => { actions += n; };
  const realMistake = E.mistake.bind(E);
  E.mistake = (d) => { if (d) mistakes.push(`[${E.step.id}] ${d.id}`); return d; };
  const tick = (sec) => { for (let i = 0; i < sec * 20; i++) L.tick(0.05); waitSec += sec; };
  const pipette = (pip, box, from, to) => {
    L.pickPipette(pip); L.attachTip(box); L.moveTo(from); L.assist('aspirate');
    L.moveTo(to); L.assist('dispense'); L.ejectAuto(); L.returnPipette();
    act(7);
  };
  const done = () => {
    const ok = E.isComplete();
    report.push({ step: E.step.id, ok, open: ok ? [] : E.tasks().filter(t => !t.done).map(t => t.label) });
    if (log) console.log(ok ? '✓' : '✗', E.step.id);
    if (E.idx === report.length - 1) E.next();
  };
  const runUntil = (pred, max = 120) => { let t = 0; while (!pred() && t < max) { tick(0.5); t += 0.5; } };
  E.goto(0); app.goStation('s1', true);
  // 1 · lyse
  L.pickItem('tissue'); L.tap('A'); act();
  pipette('P1000', 'tb1000', 'st_edwards', 'A');
  L.pickItem('pestle'); L.tap('A'); act(2);
  for (let i = 0; i < 400 && L.V('A').tissue.lysed < 1; i++) L.grind(0.004);
  waitSec += 5; done();
  // 2 · spin, pour, isopropanol, invert
  L.quickSpin(); act(2); runUntil(() => !L.S.inst.cfg.running);
  L.pickItem('A'); L.tap('B'); act();
  pipette('P1000', 'tb1000', 'st_iso', 'B');
  L.select('B'); L.invertMany('B', PROTOCOL.extraction.inversions); act(2); done();
  // 3 · spin, pour off, TE
  L.quickSpin(); act(2); runUntil(() => !L.S.inst.cfg.running);
  L.pickItem('B'); L.tap('liqwaste1'); act();
  L.select('B'); L.addTE('B'); act(2); done();
  // 4 · template + PCR
  L.pickItem('B'); app.goStation('s2', true); L.tap('cold'); act(3);
  pipette('P2', 'tb10', 'B', 'pcr1');
  L.pickItem('strip'); app.goStation('s3', true); L.tap('cycler'); act(3);
  L.tcStart(); act(2); runUntil(() => L.S.pcr.ran, 60); done();
  // 5 · gel
  L.pickItem('strip'); app.goStation('s4', true); L.tap('pcrrack4'); act(3);
  pipette('P20g', 'tb200g', 'pcr1', 'well2');
  L.quickRunGel(); act(2); runUntil(() => L.S.gel.runVmin > 0 && !L.S.inst.ps.on, 60);
  L.pickItem('tray'); L.tap('trans'); L.transToggle('on'); act(4);
  ui.showAnalysis(); act(); const verdict = document.querySelector('.verdict')?.textContent; ui.closeModal(); done();
  E.mistake = realMistake;
  const estimateMin = (actions * 3 + waitSec) / 60;
  const result = { steps: E.steps.length, failed: report.filter(r => !r.ok), mistakes, verdict, actions, waitSec: Math.round(waitSec), estimateMin: +estimateMin.toFixed(1) };
  if (log) console.log(result);
  return result;
}
