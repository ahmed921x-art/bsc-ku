// HTML overlay: instructor, pipette HUD, action bar, instrument panels, modals.
import { PROTOCOL as P, PIPETTES, TIPS, REAGENTS, masterMix, fmtSci, fmtTime } from './data.js';
import { sumLiq, verifyReaction, simulatePCR, mobility, STANDARD_RUN, estimateSize } from './sim.js';
import { STATIONS } from './scene.js';
import { buildSchedule, gelGeometry, bandsForLane } from './lab.js';
import { sfx, setMuted, isMuted } from './audio.js';

const $ = (s, r = document) => r.querySelector(s);
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtV = (v) => v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2);

export class UI {
  constructor({ lab, engine, bus, world, mol, app }) {
    Object.assign(this, { lab, engine, bus, world, mol, app });
    this.tab = 'how';
    this.panel = null;
    this.presenter = false;
    this.assisted = false;
    this.molOpen = true; this.molBig = false;
    this.lastVersion = -1;
    this.bind();
    bus.on('toast', (t) => this.toast(t.msg, t.kind));
    bus.on('mistake', (d) => this.showMistake(d));
    bus.on('stepChange', () => { this.renderStep(); this.renderModules(); });
    bus.on('stepUpdate', () => this.renderTasks());
    bus.on('stepComplete', () => { sfx.success(); this.renderTasks(); this.toast('Step complete', 'ok'); });
    bus.on('panel', (p) => this.openPanel(p.inst));
    bus.on('select', () => this.renderAction());
    this.renderStep(); this.renderModules();
  }

  // ------------------------------------------------------------ static bindings
  bind() {
    $('#btnPresenter').onclick = () => this.togglePresenter(!this.presenter);
    $('#presenterPill').onclick = () => this.togglePresenter(false);
    $('#btnMol').onclick = () => { this.molOpen = !this.molOpen; this.renderMol(); };
    $('#molExpand').onclick = () => { this.molBig = !this.molBig; this.renderMol(); };
    $('#molClose').onclick = () => { this.molOpen = false; this.renderMol(); };
    $('#btnUndo').onclick = () => { if (!this.lab.restore()) this.toast('Nothing to undo.'); else { this.toast('Undone', 'info'); } };
    $('#btnMenu').onclick = () => this.showMenu();
    $('#btnFull').onclick = () => this.fullscreen();
    $('#tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (!b) return; this.tab = b.dataset.tab; this.renderStep(); });
    $('#stations').addEventListener('click', (e) => { const b = e.target.closest('[data-st]'); if (b) this.app.goStation(b.dataset.st); });
    $('#btnSpeak').onclick = () => this.speak();
    $('#stepPrev').onclick = () => this.engine.prev();
    $('#stepNext').onclick = () => this.engine.next();
    $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal' && !this.modalLocked) this.closeModal(); });
  }
  fullscreen() {
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (document.fullscreenElement || document.webkitFullscreenElement) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
    if (req) req.call(el).catch?.(() => this.toast('On iPad: Share → "Add to Home Screen" and launch from the icon for true full-screen.', 'info'));
    else this.toast('On iPad: Share → "Add to Home Screen" and launch from the icon for true full-screen.', 'info');
  }
  togglePresenter(on) {
    this.presenter = on;
    document.body.classList.toggle('presenter', on);
    this.toast(on ? 'Demonstration mode — instructor hidden' : 'Instructor mode', 'info');
  }

  // ------------------------------------------------------------ instructor
  renderModules() {
    const mods = [...new Set(this.engine.steps.map(s => s.module))];
    const cur = this.engine.step.module;
    $('#modules').innerHTML = mods.map(m => {
      const idxs = this.engine.steps.map((s, i) => s.module === m ? i : -1).filter(i => i >= 0);
      const done = idxs.filter(i => this.engine.completed.has(i)).length;
      const state = m === cur ? 'cur' : done === idxs.length ? 'done' : '';
      const short = { 'DNA Extraction': 'Extraction', Thermocycling: 'Cycling', Electrophoresis: 'Gel' }[m] || m;
      return `<button class="chip ${state}" data-goto="${idxs[0]}"><span class="bar"><i style="width:${done / idxs.length * 100}%"></i></span>${esc(short)}</button>`;
    }).join('');
    $('#modules').onclick = (e) => { const b = e.target.closest('[data-goto]'); if (b) this.engine.goto(+b.dataset.goto); };
  }
  renderStep() {
    const st = this.engine.step, i = this.engine.idx, n = this.engine.steps.length;
    $('#stepCount').textContent = `Step ${i + 1} / ${n} · ${st.module}`;
    $('#stepTitle').textContent = st.title;
    $('#stepWhat').textContent = st.what;
    document.querySelectorAll('#tabs [data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === this.tab));
    let body = '';
    if (this.tab === 'how') body = `<ol class="how">${st.how.map(x => `<li>${esc(x)}</li>`).join('')}</ol>`;
    if (this.tab === 'why') body = `<p>${esc(st.why)}</p>`;
    if (this.tab === 'mol') body = `<p>${esc(st.molecular)}</p>${st.mol ? '<button class="btn ghost sm" id="openMol">Show molecular view</button>' : ''}`;
    if (this.tab === 'see') body = `<p>${esc(st.see)}</p>`;
    if (this.tab === 'mistakes') body = `<ul class="mist">${st.mistakes.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
    $('#tabBody').innerHTML = body;
    const om = $('#openMol'); if (om) om.onclick = () => { this.molOpen = true; this.renderMol(); };
    $('#stepPrev').disabled = i === 0;
    this.renderTasks();
    this.app.onStep(st);
  }
  renderTasks() {
    const ts = this.engine.tasks();
    $('#tasks').innerHTML = ts.map(t => `<li class="${t.done ? 'done' : ''}"><span class="tick"></span>${esc(t.label)}</li>`).join('');
    const complete = this.engine.isComplete();
    const last = this.engine.idx === this.engine.steps.length - 1;
    const nb = $('#stepNext');
    nb.classList.toggle('ready', complete && !last);
    nb.textContent = complete ? (last ? 'Experiment complete' : 'Next step →') : 'Skip →';
    nb.disabled = last;
    $('#instructor').classList.toggle('complete', complete);
    this.renderCards();
    this.renderModules();
  }
  renderCards() {
    const st = this.engine.step, L = this.lab;
    const cards = [];
    const B = L.V('B');
    const dnaNg = (B.sol.gdna || 0) + (B.sol.gppt || 0) + (B.pel.gdna || 0);
    if (['te', 'carry', 'calc', 'q-dissolve', 'q-pcrsetup'].includes(st.id) && (B.liq.te || 0) > 5) {
      const v = L.vol('B');
      cards.push(`<div class="card"><div class="card-h">Your extracted DNA · Tube B</div>
        <div class="kv"><span>Concentration</span><b>${(dnaNg / v).toFixed(1)} ng/µL</b></div>
        <div class="kv"><span>Total yield</span><b>${(dnaNg / 1000).toFixed(2)} µg in ${v.toFixed(0)} µL</b></div>
        <div class="kv"><span>Still in pellet</span><b>${((B.pel.gdna || 0) / Math.max(1, dnaNg) * 100).toFixed(0)}%</b></div>
        <div class="note">Model: ${P.model.dnaPer100mg} ng DNA released per 100 mg fully lysed tissue; losses come from your actual transfers, spins and pellet handling.</div></div>`);
    }
    if (['calc', 'mastermix', 'mixmm', 'aliquot', 'template', 'seal', 'q-pcrsetup'].includes(st.id)) {
      const mm = masterMix();
      const MM = L.V('MM');
      const aliq = ['aliquot', 'template', 'seal', 'q-pcrsetup'].includes(st.id);
      cards.push(`<div class="card"><div class="card-h">Master mix · ${mm.n} reactions <button class="btn ghost xs" data-act="calc">Calculator</button></div>
        <table class="rx"><tr><th>Component</th><th>Need</th><th>Added</th><th></th></tr>
        ${mm.rows.map(r => { const a = aliq ? null : (MM.liq[r.id] || 0); const ok = a == null ? null : Math.abs(a - r.total) <= Math.max(0.05, r.total * 0.04); const over = a != null && a > r.total * 1.06 + 0.05; return `<tr><td>${esc(r.label)}</td><td>${r.total}</td><td>${a == null ? '—' : fmtV(a)}</td><td class="${ok ? 'ok' : over ? 'bad' : a > 0 ? 'part' : 'miss'}">${a == null ? '' : ok ? '✓' : over ? 'excess' : a > 0 ? 'partial' : 'missing'}</td></tr>`; }).join('')}
        <tr class="tot"><td>Total in MM tube</td><td>${mm.total}</td><td>${fmtV(L.vol('MM'))}</td><td></td></tr></table>
        ${aliq ? `<div class="pcrtubes">${[1, 2, 3].map(i => `<div><b>Tube ${i}</b><span>${fmtV(L.vol('pcr' + i))} / ${P.pcr.rxnVol} µL</span><em>${['sample', '+ control', 'NTC'][i - 1]}</em></div>`).join('')}</div>` : ''}
        ${st.id === 'seal' ? '<button class="btn primary sm" data-act="verify">Verify reactions</button>' : ''}</div>`);
    }
    if (['program', 'run', 'unload', 'q-cycle'].includes(st.id)) cards.push(`<div class="card"><div class="card-h">Thermocycler</div><div class="row"><button class="btn ghost sm" data-act="tc">Open controls</button><button class="btn ghost sm" data-act="chart">Amplification graph</button></div></div>`);
    if (['image', 'results', 'q-run'].includes(st.id)) cards.push(`<div class="card"><div class="card-h">Gel documentation</div><button class="btn primary sm" data-act="analyse">Analyse gel</button></div>`);
    $('#cards').innerHTML = cards.join('');
    $('#cards').onclick = (e) => { const b = e.target.closest('[data-act]'); if (!b) return; const a = b.dataset.act; if (a === 'calc') this.showCalc(); if (a === 'verify') this.showVerify(); if (a === 'tc') this.openPanel('tc'); if (a === 'chart') this.showChart(); if (a === 'analyse') this.showAnalysis(); };
  }
  speak() {
    const st = this.engine.step;
    if (!('speechSynthesis' in window)) { this.toast('Speech is not available on this device.'); return; }
    if (speechSynthesis.speaking) { speechSynthesis.cancel(); return; }
    const txt = { how: st.how.join('. '), why: st.why, mol: st.molecular, see: st.see, mistakes: st.mistakes.join('. ') }[this.tab];
    const u = new SpeechSynthesisUtterance(`${st.what} ${txt}`); u.rate = 1.0; u.lang = 'en-US';
    speechSynthesis.speak(u);
  }

  // ------------------------------------------------------------ per-frame HUD
  update() {
    const L = this.lab;
    if (L.version !== this.lastVersion) {
      this.lastVersion = L.version;
      this.renderAction(); this.renderPip(); this.renderPPE();
      if (this.panel) this.renderPanel();
      if (this.chartOpen) this.drawChart();
      this.renderTasksThrottled();
    }
    $('#clock').textContent = fmtClock(L.S.t);
    if (this.mol && this.molOpen) $('#molCaption').textContent = this.mol.caption || '';
  }
  renderTasksThrottled() { const now = performance.now(); if (now - (this._tt || 0) > 250) { this._tt = now; this.renderTasks(); } else { clearTimeout(this._tto); this._tto = setTimeout(() => this.renderTasks(), 260); } }
  renderPPE() {
    const p = this.lab.S.ppe;
    $('#ppe').innerHTML = [['coat', 'Coat'], ['gloves', 'Gloves'], ['goggles', 'Goggles']].map(([k, l]) => `<span class="${p[k] ? 'on' : ''}">${l}</span>`).join('');
  }
  renderMol() {
    const on = this.molOpen && !!this.app.molKey;
    $('#molpip').classList.toggle('open', on);
    document.body.classList.toggle('molon', on && !this.molBig);
    $('#molpip').classList.toggle('big', this.molBig);
    $('#btnMol').classList.toggle('on', this.molOpen);
    this.app.resizeMol();
  }

  renderAction() {
    const L = this.lab, S = L.S, held = S.held, sel = L.selected;
    const bar = $('#actionbar');
    const acts = [];
    let label = '';
    const capBtn = (id) => { const vs = L.V(id === 'strip' ? 'pcr1' : id); if (!vs || vs.cap === null) return; acts.push({ t: vs.cap ? 'Open cap' : 'Close cap', f: () => L.toggleCap(id) }); };
    if (held?.kind === 'item') {
      const id = held.id, type = this.world.objects[id].itemType;
      label = `Holding: ${L.labelOf(id)}`;
      if (type === 'micro' || type === 'strip') { capBtn(id); acts.push({ t: 'Flick', f: () => L.flick(id) }); if (type === 'micro') acts.push({ t: 'Invert', f: () => L.invert(id) }); }
      if (id === 'tray') acts.push({ t: 'Rotate 180°', f: () => L.rotateTray() });
      if (id === 'tissue') acts.push({ t: `Trim (${S.tissueMg} mg)`, f: () => L.trimSample() });
      if ((id === 'flask' || id === 'taebottle') && L.pourDock) {
        acts.push({ t: 'Hold to pour', hold: true, primary: true });
        if (L.pourDock === 'tray') label += ` · gel ${S.gel.poured.toFixed(0)} mL (≈${(S.gel.poured / (7 * 10.2) * 10).toFixed(1)} mm)`;
        else label += ` · tank ${S.gel.buffer.toFixed(0)} mL`;
      }
      if (id === 'flask' || id === 'taebottle') label += L.pourDock ? '' : ' — tap the ' + (id === 'flask' ? 'casting tray' : 'gel tank');
      acts.push({ t: 'Put back', f: () => L.putBack() });
    } else if (held?.kind === 'pip') {
      label = '';
    } else if (S.items.pestle.loc?.startsWith('in:')) {
      const vid = S.items.pestle.loc.slice(3); const t = L.V(vid).tissue;
      label = `Grinding in ${L.vesselLabel(vid)} · ${Math.round((t?.lysed || 0) * 100)}%`;
      acts.push({ t: 'Remove pestle', f: () => L.removePestle() });
    } else if (sel) {
      if (sel === 'berry') { label = 'Strawberry'; acts.push({ t: 'Cut sample', primary: true, f: () => { L.cutSample(); L.select(null); } }); }
      else {
        label = L.labelOf(sel);
        if (L.V(sel === 'strip' ? 'pcr1' : sel)) {
          const vid = sel === 'strip' ? null : sel;
          if (vid) label += ` · ${fmtV(L.vol(vid))} µL`;
        }
        acts.push({ t: 'Pick up', primary: true, f: () => L.pickItem(sel) });
        if (sel === 'strip' || L.V(sel)?.cap !== undefined) capBtn(sel);
        if (sel === 'B' || sel === 'A') acts.push({ t: `Air-dry ${P.extraction.dryMin} min`, f: () => L.startDrying(sel, P.extraction.dryMin) });
        if (sel === 'tissue') acts.push({ t: `Trim (${S.tissueMg} mg)`, f: () => L.trimSample() });
      }
    }
    if (L.drying) { label = `Air-drying Tube B… ${L.drying.min.toFixed(1)} / ${L.drying.target} min`; }
    if (S.gel.poured > 0 && S.gel.solid < 1 && !L.pourActive) {
      acts.push({ t: L.ffGel ? 'Setting… (fast)' : `Gel setting ${Math.round(S.gel.solid * 100)}% · Fast-forward`, f: () => { L.ffGel = true; } });
    }
    bar.classList.toggle('show', acts.length > 0 || !!label);
    bar.innerHTML = `${label ? `<div class="lbl">${esc(label)}</div>` : ''}<div class="acts">${acts.map((a, i) => `<button class="btn ${a.primary ? 'primary' : ''}" data-i="${i}" ${a.hold ? 'data-hold="1"' : ''}>${esc(a.t)}</button>`).join('')}</div>`;
    bar.querySelectorAll('button').forEach(b => {
      const a = acts[+b.dataset.i];
      if (a.hold) {
        const start = (e) => { e.preventDefault(); L.pourActive = true; b.classList.add('pressed'); };
        const stop = () => { L.pourActive = false; L.stopPour(); b.classList.remove('pressed'); };
        b.addEventListener('pointerdown', start); b.addEventListener('pointerup', stop); b.addEventListener('pointerleave', stop); b.addEventListener('pointercancel', stop);
      } else b.onclick = () => { sfx.tap(); a.f(); };
    });
    $('#grindpad').classList.toggle('show', !!S.items.pestle.loc?.startsWith('in:'));
  }

  // ------------------------------------------------------------ pipette HUD
  renderPip() {
    const L = this.lab, held = L.S.held, hud = $('#piphud');
    if (held?.kind !== 'pip') { hud.classList.remove('show'); this.pipId = null; return; }
    const id = held.id, p = L.S.pip[id], spec = PIPETTES[p.type];
    hud.classList.add('show');
    if (this.pipId !== id) { this.pipId = id; this.buildPip(id); }
    const tipVol = p.tip ? sumLiq(p.tip.liq) : 0;
    const digits = this.digitsOf(p.vol, spec);
    hud.querySelectorAll('.dg b').forEach((el, i) => el.textContent = digits[i]);
    $('#pipTip').innerHTML = p.tip ? `<span class="chip on">${TIPS[p.tip.type].label}</span><span>${tipVol > 0.005 ? `<b>${fmtV(tipVol)} µL</b> ${esc(REAGENTS[L.mainReagent(p.tip.liq)]?.short || '')}` : `<span class="dim">${p.tip.used ? 'Used tip · empty' : 'Fresh tip · empty'}</span>`}</span>` : '<span class="chip warn">No tip</span><span class="dim">Tap a tip box</span>';
    $('#pipAt').innerHTML = p.at ? `Tip in <b>${esc(L.vesselLabel(p.at))}</b> · ${fmtV(L.vol(p.at))} µL` : 'Tip in air — tap a tube to insert';
    this.setPlungerVisual(p.plunger);
    $('#pipAssist').style.display = this.assisted ? '' : 'none';
    $('#pipLift').disabled = !p.at;
  }
  digitsOf(v, spec) {
    const nd = String(Math.round(spec.max)).length + spec.decimals;
    return v.toFixed(spec.decimals).replace('.', '').padStart(nd, '0').split('');
  }
  buildPip(id) {
    const L = this.lab, p = L.S.pip[id], spec = PIPETTES[p.type];
    const intD = String(Math.round(spec.max)).length, nd = intD + spec.decimals;
    const places = []; for (let i = 0; i < nd; i++) places.push(Math.pow(10, intD - 1 - i));
    const hud = $('#piphud');
    hud.innerHTML = `
      <div class="ph-h"><b>${spec.label}</b><span>${spec.min}–${spec.max} µL</span></div>
      <div class="dial">${places.map((pl, i) => `<div class="dg" data-pl="${pl}"><button data-d="1">▲</button><b>0</b><button data-d="-1">▼</button></div>${spec.decimals && i === intD - 1 ? '<i class="dot">.</i>' : ''}`).join('')}<span class="unit">µL</span></div>
      <div class="wheel" id="wheel"><span>◀ turn ▶</span></div>
      <div class="pl-wrap"><div class="plunger" id="plunger"><div class="marks"><span style="top:0">rest</span><span style="top:62%">1st stop</span><span style="top:94%">2nd stop</span></div><div class="track"><div class="thumb" id="pthumb"></div></div></div>
        <div class="pl-info"><div id="pipTip"></div><div id="pipAt" class="dim"></div>
        <div class="pl-btns"><button class="btn" id="pipLift">Lift tip</button><button class="btn" id="pipEject">Eject tip</button><button class="btn ghost" id="pipReturn">Return pipette</button></div>
        <div class="pl-btns" id="pipAssist"><button class="btn primary" data-as="aspirate">Aspirate</button><button class="btn primary" data-as="dispense">Dispense</button><button class="btn" data-as="mix">Mix</button></div></div></div>`;
    hud.querySelectorAll('.dg button').forEach(b => b.onclick = () => {
      const pl = +b.closest('.dg').dataset.pl, d = +b.dataset.d;
      L.setVolume(+(L.S.pip[id].vol + Math.max(pl, spec.step) * d).toFixed(4));
    });
    $('#pipLift').onclick = () => L.withdraw();
    $('#pipEject').onclick = () => L.ejectAuto();
    $('#pipReturn').onclick = () => L.returnPipette();
    hud.querySelectorAll('[data-as]').forEach(b => b.onclick = () => L.assist(b.dataset.as));
    // thumb wheel: horizontal drag changes volume in steps
    const wheel = $('#wheel'); let wx = null, acc = 0;
    wheel.onpointerdown = (e) => { wx = e.clientX; acc = 0; wheel.setPointerCapture(e.pointerId); };
    wheel.onpointermove = (e) => { if (wx == null) return; acc += e.clientX - wx; wx = e.clientX; const stepPx = 9; while (Math.abs(acc) >= stepPx) { const dir = Math.sign(acc); acc -= dir * stepPx; const s = spec.step * (spec.max >= 1000 ? 5 : spec.max >= 200 ? 5 : spec.max >= 20 ? 5 : 1); L.setVolume(+(L.S.pip[id].vol + dir * s).toFixed(4)); } };
    wheel.onpointerup = () => { wx = null; };
    // plunger slider
    const track = $('#plunger .track'), thumb = $('#pthumb');
    let drag = false;
    const pos = (e) => { const r = track.getBoundingClientRect(); return Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)); };
    const level = (f) => f < 0.3 ? 0 : f < 0.82 ? 1 : 2;
    thumb.parentElement.onpointerdown = (e) => { drag = true; track.setPointerCapture(e.pointerId); const f = pos(e); thumb.style.top = `${f * 100}%`; const lv = level(f); if (lv !== L.S.pip[id].plunger) stepTo(lv); };
    const stepTo = (lv) => { const cur = L.S.pip[id].plunger; if (lv > cur) { for (let k = cur + 1; k <= lv; k++) L.setPlunger(k); } else { L.setPlunger(lv); } };
    track.onpointermove = (e) => { if (!drag) return; const f = pos(e); thumb.style.top = `${f * 100}%`; const lv = level(f); if (lv !== L.S.pip[id].plunger) stepTo(lv); };
    track.onpointerup = () => { drag = false; this.setPlungerVisual(L.S.pip[id].plunger); };
    track.onpointercancel = track.onpointerup;
  }
  setPlungerVisual(lv) { const t = $('#pthumb'); if (t && !t.parentElement.matches(':active')) t.style.top = ['0%', '62%', '94%'][lv]; }

  // ------------------------------------------------------------ instrument panels
  openPanel(inst) {
    this.panel = inst; sfx.tap();
    if (inst === 'tc') this.lab.S.flags.tcOpened = true;
    $('#panel').classList.add('show');
    this.renderPanel(true);
    this.app.onPanel(inst);
  }
  closePanel() { this.panel = null; $('#panel').classList.remove('show'); this.app.onPanel(null); }
  renderPanel(full) {
    const L = this.lab, I = L.S.inst, el = $('#panel');
    const key = this.panel;
    let html = '';
    const title = { cfg: 'Microcentrifuge', vortex: 'Vortex mixer', spinner: 'Mini-spinner', tc: 'Thermocycler', chamber: 'Electrophoresis tank', ps: 'Power supply', trans: 'Blue-light transilluminator' }[key];
    if (key === 'cfg') {
      const c = I.cfg;
      const heldTube = L.S.held?.kind === 'item' && this.world.objects[L.S.held.id].itemType === 'micro' ? L.S.held.id : null;
      const rotor = Array.from({ length: 12 }, (_, i) => { const occ = L.occupant(`cfg#${i}`); const a = i * 30 * Math.PI / 180; const mv = this.cfgMove === occ && occ; return `<button class="pos ${occ ? 'occ' : ''} ${mv ? 'mv' : ''} ${!occ && (heldTube || this.cfgMove) && c.lid ? 'free' : ''}" data-pos="${i}" style="left:${50 + Math.cos(a) * 38}%;top:${50 + Math.sin(a) * 38}%">${occ ? esc(occ) : ''}</button>`; }).join('');
      html = `<div class="pgrid"><div class="rotor">${rotor}<div class="hub"></div></div><div class="pcol">
        ${stepper('Speed', `${c.g.toLocaleString()} × g`, 'cfg-g')}
        ${stepper('Time', fmtTime(c.running ? c.remain : c.sec), 'cfg-s')}
        <div class="row"><button class="btn" data-a="lid" ${c.running ? 'disabled' : ''}>${c.lid ? 'Close lid' : 'Open lid'}</button><button class="btn primary" data-a="start" ${c.running ? 'disabled' : ''}>${c.running ? 'Running…' : 'Start'}</button></div>
        <div class="note">${c.lid ? (heldTube ? `Tap a rotor position to place ${esc(L.vesselLabel(heldTube))}.` : 'Tap a tube on the rotor map, then an empty position, to move it.') : 'Open the lid to load or move tubes.'} Every tube needs a tube of equal mass (±0.1 g) directly opposite.</div></div></div>`;
    } else if (key === 'vortex') {
      const id = L.occupant('vortex-cup');
      html = `<div class="pcol"><div class="note">${id ? `On the cup: <b>${esc(L.vesselLabel(id))}</b> (${L.V(id).cap ? 'closed' : 'OPEN'})` : 'Place a tube on the rubber cup first.'}</div>
        <button class="btn primary big" id="vxHold">Press &amp; hold to vortex</button><div class="dim">${L.vortexing ? `Vortexing… ${L.vortexTime.toFixed(1)} s` : 'Release to stop.'}</div></div>`;
    } else if (key === 'spinner') {
      const s = I.spinner;
      html = `<div class="row"><button class="btn" data-a="slid">${s.lid ? 'Close lid' : 'Open lid'}</button><button class="btn primary" data-a="spin" ${s.running ? 'disabled' : ''}>${s.running ? 'Spinning…' : 'Spin 5 s'}</button></div><div class="note">A quick spin collects droplets from the caps and walls into the bottom of the tubes.</div>`;
    } else if (key === 'tc') {
      const t = I.tc, p = t.program;
      const sched = buildSchedule(p);
      html = `<div class="pgrid"><div class="prog">
          <div class="pr"><span>Initial denaturation</span><b>${p.init.t} °C · ${fmtTime(p.init.s)}</b></div>
          <div class="pr cyc"><span>${p.cycles} cycles</span><b>${p.den.t} °C ${p.den.s}s · ${p.ann.t} °C ${p.ann.s}s · ${p.ext.t} °C ${p.ext.s}s</b></div>
          <div class="pr"><span>Final extension</span><b>${p.final.t} °C · ${fmtTime(p.final.s)}</b></div>
          <div class="pr"><span>Hold</span><b>${p.hold} °C ∞</b></div>
          <div class="dim">Estimated run time ${Math.round(sched.total / 60)} min · heated lid ${p.lid} °C</div></div>
        <div class="pcol">
          <div class="tempbig" style="color:${t.running ? '#fff' : '#9fb3c8'}">${t.temp.toFixed(1)} °C</div>
          <div class="dim">${t.running ? esc(t.stage?.label || '') + (t.stage?.cycle ? ` · cycle ${t.stage.cycle}/${p.cycles}` : '') : t.done ? 'Run complete' : 'Idle'}</div>
          <div class="row"><button class="btn" data-a="tlid" ${t.running ? 'disabled' : ''}>${t.lid ? 'Close lid' : 'Open lid'}</button><button class="btn" data-a="prog" ${t.running ? 'disabled' : ''}>Program</button><button class="btn primary" data-a="tstart" ${t.running ? 'disabled' : ''}>Start run</button></div>
          <div class="row"><span class="dim">Speed</span>${[30, 60, 120, 300].map(s => `<button class="btn xs ${(P.tcSpeed || 60) === s ? 'on' : ''}" data-sp="${s}">×${s}</button>`).join('')}<button class="btn ghost xs" data-a="chart">Graph</button></div></div></div>`;
    } else if (key === 'chamber') {
      const g = L.S.gel;
      html = `<div class="pcol"><div class="kv"><span>Gel in tank</span><b>${L.S.items.tray.loc === 'chamber' ? (L.wellsAtCathode() ? 'yes — wells at black (−)' : 'yes — wells at RED (+)!') : 'no'}</b></div>
        <div class="kv"><span>Running buffer</span><b>${g.buffer.toFixed(0)} mL ${g.buffer >= 280 && g.buffer <= 470 ? '✓ gel covered' : g.buffer > 470 ? '(overfull)' : '(gel not covered)'}</b></div>
        <div class="row"><button class="btn primary" data-a="chlid">${I.chamberLid ? 'Take lid off' : 'Put lid on'}</button></div></div>`;
    } else if (key === 'ps') {
      const ps = I.ps;
      html = `<div class="pgrid"><div class="pcol">
        <div class="leads"><div class="dim">Connect the leads from the power supply to the tank lid:</div>
          <button class="btn ${ps.leads === 'correct' ? 'on' : ''}" data-lead="correct">Black → black (−) · Red → red (+)</button>
          <button class="btn ${ps.leads === 'reversed' ? 'on' : ''}" data-lead="reversed">Black → red (+) · Red → black (−)</button></div></div>
        <div class="pcol">${stepper('Voltage', `${ps.v} V`, 'ps-v')}${stepper('Time', `${ps.min} min`, 'ps-m')}
        <div class="row"><button class="btn primary" data-a="psrun" ${ps.on ? 'disabled' : ''}>Start</button><button class="btn" data-a="psstop" ${ps.on ? '' : 'disabled'}>Stop</button></div>
        <div class="dim">${ps.on ? `Running · ${fmtTime((ps.min - ps.elapsed) * 60)} left · ${Math.round(ps.v * 0.85)} mA` : ''}</div></div></div>`;
    } else if (key === 'trans') {
      const tr = I.trans;
      html = `<div class="row"><button class="btn ${tr.shield ? 'on' : ''}" data-a="shield">${tr.shield ? 'Raise amber shield' : 'Lower amber shield'}</button><button class="btn primary ${tr.on ? 'on' : ''}" data-a="light">${tr.on ? 'Light OFF' : 'Light ON'}</button><button class="btn" data-a="analyse">Analyse gel</button></div><div class="note">SYBR Safe: excitation ≈ 500 nm (blue), emission ≈ 530 nm. The amber filter blocks the excitation light.</div>`;
    }
    el.innerHTML = `<div class="sheet-h"><b>${title}</b><button class="x" id="panelClose">×</button></div>${html}`;
    $('#panelClose').onclick = () => this.closePanel();
    el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => this.panelAct(b.dataset.a));
    el.querySelectorAll('[data-st]').forEach(b => b.onclick = () => this.stepAct(b.dataset.st, +b.dataset.d));
    el.querySelectorAll('[data-sp]').forEach(b => b.onclick = () => { P.tcSpeed = +b.dataset.sp; this.renderPanel(); });
    el.querySelectorAll('[data-lead]').forEach(b => b.onclick = () => L.psLeads(b.dataset.lead));
    el.querySelectorAll('[data-pos]').forEach(b => b.onclick = () => this.rotorTap(+b.dataset.pos));
    const vx = $('#vxHold');
    if (vx) { const on = (e) => { e.preventDefault(); L.vortexStart(); vx.classList.add('pressed'); }, off = () => { L.vortexStop(); vx.classList.remove('pressed'); }; vx.addEventListener('pointerdown', on); vx.addEventListener('pointerup', off); vx.addEventListener('pointerleave', off); vx.addEventListener('pointercancel', off); }
  }
  rotorTap(i) {
    const L = this.lab, slot = `cfg#${i}`, occ = L.occupant(slot);
    if (!L.S.inst.cfg.lid) { this.toast('Open the lid first.'); return; }
    const held = L.S.held;
    if (held?.kind === 'item' && !occ) { L.placeAt(slot); this.cfgMove = null; return; }
    if (occ) { this.cfgMove = this.cfgMove === occ ? null : occ; sfx.tap(); this.renderPanel(); return; }
    if (this.cfgMove) { const id = this.cfgMove; this.cfgMove = null; L.pickItem(id); if (L.S.held?.id === id) L.placeAt(slot); }
  }
  stepAct(key, d) {
    const L = this.lab, I = L.S.inst;
    if (key === 'cfg-g') L.cfgSet('g', Math.max(1000, Math.min(16000, I.cfg.g + d * 500)));
    if (key === 'cfg-s') L.cfgSet('sec', Math.max(10, Math.min(1800, I.cfg.sec + d * (I.cfg.sec >= 120 ? 60 : 10))));
    if (key === 'ps-v') L.psSet('v', Math.max(20, Math.min(250, I.ps.v + d * 10)));
    if (key === 'ps-m') L.psSet('min', Math.max(5, Math.min(120, I.ps.min + d * 5)));
    sfx.click(0.3);
  }
  panelAct(a) {
    const L = this.lab;
    ({ lid: () => L.cfgToggleLid(), start: () => L.cfgStart(), slid: () => L.spinnerToggleLid(), spin: () => L.spinnerStart(),
      tlid: () => L.tcToggleLid(), prog: () => this.showProgram(), tstart: () => L.tcStart(), chart: () => this.showChart(),
      chlid: () => L.chamberToggleLid(), psrun: () => L.psStart(), psstop: () => L.psStop(),
      shield: () => L.transToggle('shield'), light: () => L.transToggle('on'), analyse: () => this.showAnalysis() })[a]?.();
  }

  // ------------------------------------------------------------ modals
  openModal(html, { locked = false, wide = false } = {}) {
    const m = $('#modal');
    m.innerHTML = `<div class="dialog scroll ${wide ? 'wide' : ''}">${html}</div>`;
    m.classList.add('show'); this.modalLocked = locked;
    m.querySelectorAll('[data-close]').forEach(b => b.onclick = () => this.closeModal());
    return m;
  }
  closeModal() { $('#modal').classList.remove('show'); this.chartOpen = false; }
  showMistake(d) {
    sfx.error();
    const m = this.openModal(`<div class="mistake ${d.block ? 'block' : ''}"><div class="m-kicker">${d.block ? 'Action stopped' : 'Mistake detected'}</div><h2>${esc(d.title)}</h2>
      <div class="m-sec"><h4>What happened</h4><p>${esc(d.what)}</p></div>
      <div class="m-sec"><h4>Scientific consequence</h4><p>${esc(d.why)}</p></div>
      <div class="m-sec fix"><h4>How to fix it</h4><p>${esc(d.fix)}</p></div>
      <div class="row end">${d.undoable ? '<button class="btn" id="mCont">Continue anyway</button><button class="btn primary" id="mUndo">Undo &amp; correct</button>' : '<button class="btn primary" data-close>Got it</button>'}</div></div>`, { locked: true });
    const u = $('#mUndo', m); if (u) u.onclick = () => { this.lab.restore(); this.closeModal(); this.toast('Undone — try again', 'info'); };
    const c = $('#mCont', m); if (c) c.onclick = () => this.closeModal();
  }
  showMenu() {
    const m = this.openModal(`<h2>Laboratory menu</h2><div class="menu">
      <button class="btn ${this.app.hints ? 'on' : ''}" data-m="hints">Highlight next object: ${this.app.hints ? 'ON' : 'OFF'}</button>
      <button class="btn" data-m="protocol">Protocol &amp; parameters</button>
      <button class="btn" data-m="calc">Master-mix calculator</button>
      <button class="btn" data-m="chart">Amplification graph</button>
      <button class="btn" data-m="analysis">Gel analysis</button>
      <button class="btn ${this.assisted ? 'on' : ''}" data-m="assist">Assisted pipetting: ${this.assisted ? 'ON' : 'OFF'}</button>
      <button class="btn ${isMuted() ? '' : 'on'}" data-m="sound">Sound: ${isMuted() ? 'OFF' : 'ON'}</button>
      <button class="btn ${this.app.autoCam ? 'on' : ''}" data-m="cam">Auto close-up camera: ${this.app.autoCam ? 'ON' : 'OFF'}</button>
      <button class="btn" data-m="quality">Graphics: ${this.app.quality}</button>
      <button class="btn" data-m="mistakes">Mistake log (${this.engine.mistakes.length})</button>
      <button class="btn" data-m="help">How to operate</button>
      <button class="btn danger" data-m="restart">Restart experiment</button>
      <a class="btn" href="../index.html" style="display:grid;place-items:center;text-decoration:none">← BSC KU website</a>
      ${this.app.mode === 'simple' ? '<a class="btn" href="index.html" style="display:grid;place-items:center;text-decoration:none">Full version (33 steps)</a>' : ''}
      </div><div class="row end"><button class="btn primary" data-close>Close</button></div>`);
    m.querySelectorAll('[data-m]').forEach(b => b.onclick = () => {
      const k = b.dataset.m;
      if (k === 'protocol') this.showProtocol();
      if (k === 'calc') this.showCalc();
      if (k === 'chart') this.showChart();
      if (k === 'analysis') this.showAnalysis();
      if (k === 'assist') { this.assisted = !this.assisted; this.pipId = null; this.renderPip(); this.showMenu(); }
      if (k === 'sound') { setMuted(!isMuted()); this.showMenu(); }
      if (k === 'cam') { this.app.autoCam = !this.app.autoCam; this.showMenu(); }
      if (k === 'hints') { this.app.hints = !this.app.hints; this.lab.version++; this.showMenu(); }
      if (k === 'quality') { this.app.cycleQuality(); this.showMenu(); }
      if (k === 'mistakes') this.showMistakeLog();
      if (k === 'help') this.showHelp();
      if (k === 'restart') { if (b.dataset.sure) location.reload(); else { b.dataset.sure = '1'; b.textContent = 'Tap again to restart'; } }
    });
  }
  showHelp() {
    this.openModal(`<h2>Operating the laboratory</h2><div class="help">
      <p><b>Tap</b> an object to select or use it. <b>Drag</b> a tube, strip, tray or pipette to carry it; release over a destination to place it.</p>
      <p><b>One finger on empty space</b> looks around. <b>Pinch</b> to zoom, <b>two fingers</b> to pan.</p>
      <p><b>Pipetting:</b> pick up a pipette → set the volume with ▲▼ or the turn-wheel → tap a tip box → drag the plunger to the <i>first stop</i> → tap the source tube → slide the plunger back up to aspirate → tap the destination → push to the first and second stop → "Lift tip" → release → eject.</p>
      <p>Turn on <b>Assisted pipetting</b> in the menu for one-tap Aspirate / Dispense buttons.</p>
      <p><b>Undo</b> (↶) reverses the last action. Mistakes are explained with their scientific consequences.</p>
      <p><b>Demonstration mode</b> hides the instructor for a clean view; tap the "Instructor" pill to bring it back.</p></div>
      <div class="row end"><button class="btn primary" data-close>Close</button></div>`);
  }
  showMistakeLog() {
    const ms = this.engine.mistakes;
    this.openModal(`<h2>Mistake log</h2>${ms.length ? `<ol class="mlog">${ms.map(m => `<li><b>${esc(m.title)}</b><span>${esc(m.step)}</span></li>`).join('')}</ol>` : '<p class="dim">No mistakes so far.</p>'}<div class="row end"><button class="btn primary" data-close>Close</button></div>`);
  }
  showCalc() {
    const L = this.lab; L.S.calc.opened = true; L.version++;
    this.bus.emit('lab', { type: 'calcOpen' });
    const render = () => {
      const mm = masterMix();
      const pc = P.pcr;
      const m = this.openModal(`<h2>Master-mix calculator</h2>
        <div class="calc-top">${num('Reactions', pc.reactions, 'reactions', 1)}${num('Extra', pc.extra, 'extra', 1)}${num('Reaction volume (µL)', pc.rxnVol, 'rxnVol', 1)}${num('Template per reaction (µL)', pc.templateVol, 'templateVol', 0.5)}</div>
        <table class="rx calc"><tr><th>Component</th><th>Stock</th><th>Final</th><th>Per rxn (µL)</th><th>× ${mm.n} (µL)</th></tr>
        ${mm.rows.map((r, i) => `<tr><td>${esc(r.label)}</td><td>${r.stock == null ? '—' : `<input type="number" step="any" data-c="${i}" data-k="stock" value="${r.stock}"> ${esc(r.unit === 'U' ? 'U/µL' : r.unit)}`}</td><td>${r.final == null ? 'to volume' : `<input type="number" step="any" data-c="${i}" data-k="final" value="${r.final}"> ${esc(r.unit)}`}</td><td>${r.per}</td><td><b>${r.total}</b></td></tr>`).join('')}
        <tr class="tot"><td>Master mix</td><td></td><td></td><td>${mm.perTotal}</td><td><b>${mm.total}</b></td></tr></table>
        <p class="dim">Volume = final × reaction volume ÷ stock (Taq: units ÷ U/µL). Water makes up to ${pc.rxnVol - pc.templateVol} µL per reaction; template (${pc.templateVol} µL) is added to each tube separately. Aliquot ${mm.perTotal} µL per tube.</p>
        ${mm.rows.some(r => r.per < 0) ? '<p class="bad">Components exceed the reaction volume — check your entries.</p>' : ''}
        <div class="row end"><button class="btn" data-close>Close</button><button class="btn primary" id="calcOk">Use these volumes</button></div>`, { wide: true });
      m.querySelectorAll('input[data-p]').forEach(inp => inp.onchange = () => { const v = parseFloat(inp.value); if (isFinite(v) && v >= 0) { pc[inp.dataset.p] = v; render(); } });
      m.querySelectorAll('input[data-c]').forEach(inp => inp.onchange = () => { const v = parseFloat(inp.value); if (isFinite(v) && v > 0) { pc.comps[+inp.dataset.c][inp.dataset.k] = v; render(); } });
      $('#calcOk').onclick = () => { pc.aliquot = mm.perTotal; L.S.calc.confirmed = true; L.version++; this.engine.refresh(); this.bus.emit('lab', { type: 'calcConfirm' }); this.closeModal(); this.toast('Master-mix volumes set', 'ok'); };
    };
    render();
  }
  showVerify() {
    const L = this.lab;
    const roles = [['pcr1', 'sample', 'Tube 1 · strawberry DNA'], ['pcr2', 'positive', 'Tube 2 · positive control'], ['pcr3', 'ntc', 'Tube 3 · no-template control']];
    const res = roles.map(([v, role, label]) => ({ label, ...verifyReaction(L.V(v), role) }));
    const allOk = res.every(r => r.ok);
    if (allOk) { L.S.verified = true; L.version++; this.bus.emit('lab', { type: 'verified' }); }
    this.openModal(`<h2>Reaction verification ${allOk ? '<span class="pill ok">PASS</span>' : '<span class="pill bad">CHECK</span>'}</h2>
      <div class="verify">${res.map(r => `<div class="vcol"><h4>${esc(r.label)}</h4><table class="rx">${r.rows.map(x => `<tr class="${x.ok ? '' : 'badrow'}"><td>${esc(x.label)}</td><td><b>${x.value}</b> ${esc(x.unit)}</td><td class="${x.ok ? 'ok' : 'bad'}">${x.ok ? '✓' : '✗'}</td></tr><tr class="sub"><td colspan="3">${esc(x.note)}</td></tr>`).join('')}</table></div>`).join('')}</div>
      ${allOk ? '<p>All reactions match the protocol. Ready for thermocycling.</p>' : '<p class="bad">Fix the red rows before cycling (Undo, or add the missing component). You may still continue to see the consequence.</p>'}
      <div class="row end">${allOk ? '' : '<button class="btn" id="vForce">Proceed anyway</button>'}<button class="btn primary" data-close>Close</button></div>`, { wide: true });
    const f = $('#vForce'); if (f) f.onclick = () => { L.S.verified = true; L.version++; this.bus.emit('lab', { type: 'verified' }); this.closeModal(); };
  }
  showProgram() {
    const L = this.lab; L.S.flags.programOpened = true; this.bus.emit('lab', { type: 'programOpen' });
    const p = JSON.parse(JSON.stringify(L.S.inst.tc.program));
    const rows = [['init', 'Initial denaturation'], ['den', 'Denaturation'], ['ann', 'Annealing'], ['ext', 'Extension'], ['final', 'Final extension']];
    const render = () => {
      const m = this.openModal(`<h2>PCR program</h2><table class="rx prog-ed"><tr><th>Step</th><th>Temperature</th><th>Time</th></tr>
        ${rows.map(([k, l]) => `<tr${k === 'den' ? ' class="cycstart"' : ''}><td>${l}</td><td>${spin(`${k}.t`, p[k].t + ' °C')}</td><td>${spin(`${k}.s`, fmtTime(p[k].s))}</td></tr>`).join('')}
        <tr><td>Cycles (den → ann → ext)</td><td colspan="2">${spin('cycles', p.cycles + '×')}</td></tr>
        <tr><td>Hold</td><td colspan="2">${spin('hold', p.hold + ' °C')}</td></tr></table>
        <p class="dim">Protocol: ${P.cycler.init.t} °C ${fmtTime(P.cycler.init.s)} · ${P.cycler.cycles}× (${P.cycler.den.t} °C ${P.cycler.den.s}s, ${P.cycler.ann.t} °C ${P.cycler.ann.s}s, ${P.cycler.ext.t} °C ${P.cycler.ext.s}s) · ${P.cycler.final.t} °C ${fmtTime(P.cycler.final.s)} · ${P.cycler.hold} °C</p>
        <div class="row end"><button class="btn" data-close>Cancel</button><button class="btn primary" id="progSave">Save program</button></div>`, { wide: true });
      m.querySelectorAll('[data-sp]').forEach(b => b.onclick = () => {
        const [path, d] = [b.dataset.sp, +b.dataset.d];
        const [k, f] = path.split('.');
        if (path === 'cycles') p.cycles = Math.max(1, Math.min(50, p.cycles + d));
        else if (path === 'hold') p.hold = Math.max(4, Math.min(25, p.hold + d));
        else if (f === 't') p[k].t = Math.max(37, Math.min(99, p[k].t + d));
        else p[k].s = Math.max(5, Math.min(900, p[k].s + d * (p[k].s >= 120 ? 30 : 5)));
        sfx.click(0.3); render();
      });
      $('#progSave').onclick = () => { L.tcSetProgram(p); this.closeModal(); this.toast('Program saved', 'ok'); if (this.panel) this.renderPanel(); };
    };
    render();
  }
  showChart() {
    this.chartOpen = true;
    this.openModal(`<h2>Amplification: copies per cycle</h2><canvas id="chart" width="900" height="420"></canvas>
      <div class="chart-legend" id="chartLegend"></div>
      <p class="dim">Model: N(c+1) = N(c) · [1 + E · (1 − N/Nmax)]. Early cycles: reagents in excess → N ≈ N₀(1+E)ⁿ, a straight line on this log scale. Later: primers and dNTPs deplete, Taq saturates and product strands re-anneal to each other, so the curve bends into a plateau. Efficiency E and plateau Nmax are computed from what is actually in each tube and from the program.</p>
      <div class="row end"><button class="btn primary" data-close>Close</button></div>`, { wide: true });
    this.drawChart();
  }
  drawChart() {
    const cv = $('#chart'); if (!cv) return;
    const L = this.lab, ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
    const prog = L.S.inst.tc.program;
    const tubes = [['pcr1', 'Tube 1 · strawberry', '#ffb35c'], ['pcr2', 'Tube 2 · + control', '#59d0ff'], ['pcr3', 'Tube 3 · NTC', '#ff6b9d']];
    const data = tubes.map(([v, label, col]) => {
      const r = L.S.pcr.ran ? L.S.pcr.results[v] : (L.vol(v) > 1 ? simulatePCR(L.V(v), prog, v) : null);
      return { label, col, r };
    });
    const curCycle = L.S.inst.tc.running ? (L.S.inst.tc.stage?.cycle || 0) : L.S.pcr.ran ? prog.cycles : 0;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0b111a'; ctx.fillRect(0, 0, W, H);
    const pad = { l: 70, r: 20, t: 20, b: 44 };
    const maxC = prog.cycles, yMin = 0, yMax = 13;
    const X = (c) => pad.l + c / maxC * (W - pad.l - pad.r), Y = (lg) => H - pad.b - (lg - yMin) / (yMax - yMin) * (H - pad.t - pad.b);
    ctx.strokeStyle = '#1d2a3a'; ctx.lineWidth = 1; ctx.fillStyle = '#7d8fa3'; ctx.font = '14px -apple-system, Segoe UI, sans-serif';
    for (let e = 0; e <= yMax; e += 2) { ctx.beginPath(); ctx.moveTo(pad.l, Y(e)); ctx.lineTo(W - pad.r, Y(e)); ctx.stroke(); ctx.fillText(`10^${e}`, 14, Y(e) + 5); }
    for (let c = 0; c <= maxC; c += 5) { ctx.beginPath(); ctx.moveTo(X(c), pad.t); ctx.lineTo(X(c), H - pad.b); ctx.stroke(); ctx.fillText(c, X(c) - 6, H - pad.b + 20); }
    ctx.fillText('cycle', W / 2, H - 6);
    data.forEach(d => {
      if (!d.r) return;
      const cv2 = d.r.curve;
      ctx.strokeStyle = d.col; ctx.lineWidth = 3; ctx.beginPath();
      const upto = L.S.pcr.ran ? cv2.length - 1 : curCycle;
      for (let c = 0; c <= Math.min(upto, cv2.length - 1); c++) { const lg = Math.log10(Math.max(1, cv2[c])); c === 0 ? ctx.moveTo(X(c), Y(lg)) : ctx.lineTo(X(c), Y(lg)); }
      ctx.stroke();
      ctx.setLineDash([4, 6]); ctx.lineWidth = 1.2; ctx.globalAlpha = 0.35; ctx.beginPath();
      for (let c = 0; c < cv2.length; c++) { const lg = Math.log10(Math.max(1, cv2[c])); c === 0 ? ctx.moveTo(X(c), Y(lg)) : ctx.lineTo(X(c), Y(lg)); }
      ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    });
    if (curCycle) { ctx.strokeStyle = '#ffffff55'; ctx.beginPath(); ctx.moveTo(X(curCycle), pad.t); ctx.lineTo(X(curCycle), H - pad.b); ctx.stroke(); }
    const ngPer = P.model.ampliconBp * 650 / 6.022e23 * 1e9;
    $('#chartLegend').innerHTML = data.map(d => d.r ? `<div><i style="background:${d.col}"></i><b>${esc(d.label)}</b><span>N₀ ${fmtSci(d.r.N0)} · E ${(d.r.E * 100).toFixed(0)}% · final ${fmtSci(d.r.N)} copies ≈ ${((d.r.N - d.r.N0) * ngPer).toFixed(0)} ng</span>${d.r.notes?.length ? `<em>${esc(d.r.notes[0])}</em>` : ''}</div>` : `<div><i style="background:${d.col}"></i><b>${esc(d.label)}</b><span>empty</span></div>`).join('');
  }
  showProtocol() {
    const E = P.extraction, C = P.cycler, G = P.gel, M = P.model;
    const f = (label, obj, key, step = 1) => `<label class="pf"><span>${label}</span><input type="number" step="${step}" data-o="${obj || ''}" data-k="${key}" value="${key.split('.').reduce((a, k) => a[k], obj ? P[obj] : P)}"></label>`;
    const m = this.openModal(`<h2>Protocol &amp; simulation parameters</h2>
      <div class="pgroups">
      <div><h4>DNA extraction (Edwards et al., 1991, adapted)</h4>${f('Tissue min (mg)', 'extraction', 'tissueMin')}${f('Tissue max (mg)', 'extraction', 'tissueMax')}${f('Extraction buffer (µL)', 'extraction', 'bufferVol', 10)}${f('Supernatant transferred (µL)', 'extraction', 'supVol', 10)}${f('Isopropanol (µL)', 'extraction', 'isoVol', 10)}${f('Inversions', 'extraction', 'inversions')}${f('70% ethanol wash (µL)', 'extraction', 'washVol', 10)}${f('Air-dry (min)', 'extraction', 'dryMin')}${f('TE buffer (µL)', 'extraction', 'teVol', 10)}</div>
      <div><h4>Thermocycler program</h4>${f('Initial denaturation °C', 'cycler', 'init.t')}${f('Initial denaturation s', 'cycler', 'init.s', 5)}${f('Cycles', 'cycler', 'cycles')}${f('Denaturation °C', 'cycler', 'den.t')}${f('Denaturation s', 'cycler', 'den.s', 5)}${f('Annealing °C', 'cycler', 'ann.t')}${f('Annealing s', 'cycler', 'ann.s', 5)}${f('Extension °C', 'cycler', 'ext.t')}${f('Extension s', 'cycler', 'ext.s', 5)}${f('Final extension s', 'cycler', 'final.s', 30)}</div>
      <div><h4>Gel</h4>${f('Agarose %', 'gel', 'pct', 0.1)}${f('Cast volume (mL)', 'gel', 'castVol')}${f('Loading dye (µL)', 'gel', 'dyeVol')}${f('Ladder (µL)', 'gel', 'ladderVol')}${f('Sample load (µL)', 'gel', 'loadVol')}${f('Voltage (V)', 'gel', 'volts', 5)}${f('Run time (min)', 'gel', 'min')}
      <h4>Model assumptions</h4>${f('Max. efficiency E', 'model', 'efficiency', 0.01)}${f('Amplicon (bp)', 'model', 'ampliconBp', 10)}${f('cpDNA fraction', 'model', 'cpFraction', 0.01)}${f('Plateau copies', 'model', 'nmaxCopies', 1e11)}${f('DNA per 100 mg (ng)', 'model', 'dnaPer100mg', 100)}${f('Timer speed (×)', null, 'speed', 5)}</div></div>
      <p class="dim">Defaults: Edwards K, Johnstone C, Thompson C (1991) Nucleic Acids Res 19:1349 (buffer 200 mM Tris-HCl pH 7.5, 250 mM NaCl, 25 mM EDTA, 0.5% SDS; 1 vol isopropanol). PCR set-up follows NEB Taq (M0273) guidance: 1× buffer, 1.5 mM Mg²⁺, 200 µM each dNTP, 0.2 µM each primer, 0.625 U/25 µL. Primers rbcLa-F/rbcLa-R (CBOL plant barcode). Change these to match your own kit and lab.</p>
      <div class="row end"><button class="btn" data-close>Cancel</button><button class="btn primary" id="pSave">Apply</button></div>`, { wide: true });
    $('#pSave').onclick = () => {
      m.querySelectorAll('input[data-k]').forEach(inp => {
        const v = parseFloat(inp.value); if (!isFinite(v)) return;
        const obj = !inp.dataset.o ? P : P[inp.dataset.o];
        const ks = inp.dataset.k.split('.'); let o = obj; for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]];
        o[ks[ks.length - 1]] = v;
      });
      this.engine.refresh(); this.closeModal(); this.toast('Protocol updated', 'ok');
    };
  }
  showAnalysis() {
    const L = this.lab; L.S.flags.analysed = true; L.version++; this.bus.emit('lab', { type: 'analysed' });
    const g = L.S.gel, G = gelGeometry(L);
    const runFrac = g.runVmin / STANDARD_RUN;
    const lanes = [];
    for (let i = 0; i < 8; i++) lanes.push(bandsForLane(L, i).map(b => ({ ...b, d: b.smear ? null : runFrac * mobility(b.bp) * G.runLen * (g.polarity || 1) })));
    const ladderLane = lanes.findIndex((bs, i) => (L.V(`well${i + 1}`).liq.ladder || 0) > 0);
    const ladderD = ladderLane >= 0 ? lanes[ladderLane].filter(b => !b.genomic).map(b => ({ bp: b.bp, d: b.d })) : [];
    const roles = { 0: 'Ladder (100 bp)', 1: 'Strawberry sample', 2: 'Positive control', 3: 'No-template control' };
    const detect = (bs) => bs.filter(b => !b.genomic && !b.smear && b.ng >= 2 && b.d > 0 && b.d < 384);
    const target = P.model.ampliconBp;
    const lanesInfo = [1, 2, 3].map(i => {
      const bs = detect(lanes[i]);
      const main = bs.filter(b => b.bp > 100).sort((a, b) => b.ng - a.ng)[0];
      const est = main && ladderD.length ? estimateSize(main.d, ladderD) : null;
      const dimer = bs.some(b => b.bp < 100);
      const extra = bs.filter(b => b.bp > 100 && b !== main).length;
      return { i, bs, main, est, dimer, extra, loaded: sumLiq(L.V(`well${i + 1}`).liq) > 0.5 };
    });
    const [s, pc, ntc] = lanesInfo;
    const isTarget = (x) => x.main && x.est && Math.abs(x.est - target) / target < 0.15;
    let verdict;
    if (g.runVmin < 500) verdict = 'The gel has not been run yet.';
    else if (g.polarity < 0) verdict = 'The DNA ran in the wrong direction (wells at the anode or leads reversed) and left the gel — no bands can be interpreted. Repeat the gel with the wells at the black electrode.';
    else if (!pc.loaded || !ntc.loaded) verdict = 'Controls are missing from the gel, so the sample result cannot be interpreted with confidence.';
    else if (!isTarget(pc)) verdict = 'The positive control shows no band at the expected size, so the PCR itself failed (check reagents, Mg²⁺, Taq, program). The sample result is not interpretable.';
    else if (ntc.main) verdict = 'The no-template control shows a product band — the reagents or the NTC were contaminated with DNA. Any band in the sample lane could be contamination; the experiment must be repeated with fresh reagents.';
    else if (isTarget(s)) verdict = `Valid result: the positive control worked and the NTC is clean. The strawberry sample shows a single product of ≈${s.est} bp, matching the expected ≈${target} bp rbcLa amplicon. The chloroplast rbcL barcode region was successfully amplified from your extracted DNA.`;
    else verdict = 'Controls are valid but the strawberry lane has no band at the expected size: the extraction yielded too little usable template, or inhibitors (ethanol, SDS, polysaccharides) were carried over. Check the yield card and the PCR notes.';
    const notes = [1, 2, 3].map(i => L.S.pcr.results?.[`pcr${i}`]?.notes || []).flat();
    const imgC = $('#modal') && document.createElement('canvas');
    const m = this.openModal(`<h2>Gel analysis</h2><div class="ana"><div class="gelimg"><canvas id="gelShot" width="360" height="460"></canvas></div>
      <div class="anatext"><table class="rx"><tr><th>Lane</th><th>Content</th><th>Bands detected</th></tr>
      ${[0, 1, 2, 3].map(i => { const bs = detect(lanes[i]); return `<tr><td>${i + 1}</td><td>${roles[i]}</td><td>${i === 0 ? (ladderD.length ? '100–1517 bp rungs (500 & 1000 bp bright)' : 'not loaded') : bs.length ? bs.map(b => b.bp < 100 ? 'faint primer-dimer (<100 bp)' : `≈${ladderD.length ? estimateSize(b.d, ladderD) || b.bp : b.bp} bp (${b.ng.toFixed(0)} ng)`).join(', ') : (sumLiq(L.V(`well${i + 1}`).liq) > 0.5 ? 'no band' : 'empty')}</td></tr>`; }).join('')}</table>
      <div class="verdict">${esc(verdict)}</div>
      ${notes.length ? `<div class="m-sec"><h4>Simulator notes on the reactions</h4><ul>${[...new Set(notes)].map(n => `<li>${esc(n)}</li>`).join('')}</ul></div>` : ''}
      <p class="dim">Size estimate: band migration interpolated on a log(bp) scale between the two flanking ladder bands.</p></div></div>
      <div class="row end"><button class="btn primary" data-close>Close</button></div>`, { wide: true });
    void imgC;
    // draw gel image
    const tray = this.world.objects.tray.group.userData;
    const cv = $('#gelShot', m), ctx = cv.getContext('2d');
    ctx.fillStyle = '#050403'; ctx.fillRect(0, 0, 360, 460);
    ctx.save(); ctx.translate(52, 20);
    if (G.dir < 0) { ctx.translate(256, 384); ctx.rotate(Math.PI); }
    ctx.drawImage(tray.glowCanvas.userData.canvas, 0, 0, 256, 384);
    ctx.restore();
    ctx.fillStyle = '#c9d1d9'; ctx.font = '13px -apple-system, Segoe UI, sans-serif';
    for (let i = 0; i < 4; i++) ctx.fillText(String(i + 1), 52 + 128 + (i - 3.5) * 28.5 - 4, 14);
    if (ladderD.length) {
      ctx.textAlign = 'right';
      for (const b of ladderD) { if ([100, 300, 500, 1000, 1517].includes(b.bp)) ctx.fillText(`${b.bp}`, 46, 20 + 41 + b.d + 4); }
      ctx.textAlign = 'left';
    }
    ctx.fillStyle = '#ffb35c';
    if (s.main) ctx.fillText(`← ${s.est || s.main.bp} bp`, 52 + 128 + (1 - 3.5) * 28.5 + 140, 20 + 41 + s.main.d + 4);
  }

  toast(msg, kind = 'info') {
    const t = h(`<div class="toast ${kind}">${esc(msg)}</div>`);
    $('#toasts').appendChild(t);
    setTimeout(() => t.classList.add('out'), kind === 'warn' ? 4200 : 2600);
    setTimeout(() => t.remove(), kind === 'warn' ? 4700 : 3100);
    while ($('#toasts').children.length > 3) $('#toasts').firstChild.remove();
  }
}

function stepper(label, value, key) {
  return `<div class="stepper"><span>${label}</span><button class="btn sq" data-st="${key}" data-d="-1">−</button><b>${value}</b><button class="btn sq" data-st="${key}" data-d="1">+</button></div>`;
}
function spin(path, value) { return `<span class="spin"><button class="btn sq xs" data-sp="${path}" data-d="-1">−</button><b>${value}</b><button class="btn sq xs" data-sp="${path}" data-d="1">+</button></span>`; }
function num(label, v, key, step) { return `<label class="pf"><span>${label}</span><input type="number" step="${step}" data-p="${key}" value="${v}"></label>`; }
function fmtClock(t) { const h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60; return `${String(9 + h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; }
void STATIONS;
