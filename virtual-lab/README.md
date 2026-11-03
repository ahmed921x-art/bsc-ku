# BioLab Virtual Bench

An interactive 3D molecular-biology laboratory for iPad. You perform the whole experiment yourself with touch:
DNA extraction from strawberry → PCR set-up → thermocycling → agarose gel electrophoresis → result interpretation.

Everything runs in the browser with no internet connection: Three.js is bundled in `vendor/`, there are no external fonts, sounds are synthesised, and every 3D model is procedural.

---

## 1. Launch

### Option A — iPad in the classroom, served from your laptop (no internet needed)

1. Install Python 3 on the laptop (Windows: python.org; macOS already has it).
2. Open a terminal in this folder and run:

   ```bash
   python serve.py
   ```

3. The terminal prints two addresses. On the iPad (same Wi-Fi network, or the laptop's hotspot), open the **"On your iPad"** address in Safari, e.g. `http://192.168.1.23:8080`.
4. Optional: Safari → Share → **Add to Home Screen**, then launch from the icon for a full-screen, toolbar-free view.

If the iPad cannot connect, allow Python through the laptop's firewall when prompted (Windows shows a dialog the first time).

### Option B — fully offline on the iPad (installed web app)

Service workers (offline caching) need HTTPS. Upload this folder to any free static HTTPS host — for example drag the folder onto Netlify Drop (app.netlify.com/drop), or push it to GitHub Pages. Then on the iPad:

1. Open the HTTPS address once in Safari while online (the app caches all of its files).
2. Share → **Add to Home Screen**.
3. From then on, launch from the home-screen icon — it works in flight mode.

### Option C — on this computer

```bash
python serve.py 8080 127.0.0.1
```

Then open `http://localhost:8080`. (Opening `index.html` directly from disk does not work — browsers block ES modules on `file://`.)

---

## 2. Operating the laboratory

| Gesture | Effect |
|---|---|
| Tap an object | Use it: pick up a pipette, open an instrument, select a tube, wear PPE |
| Drag a tube, strip, tray, comb, bottle or pipette | Carry it; release over a destination to place it |
| Tap a destination while holding something | Place / insert / pour target |
| One finger on empty space | Look around |
| Pinch / two-finger drag | Zoom / pan |

**Pipetting (realistic mode)**
1. Tap a pipette on its stand (P1000, P200, P20, P2 — pick the one whose range covers the volume).
2. Set the volume with ▲▼ or the turn-wheel. Volumes outside the pipette's range are refused.
3. Tap the matching tip box to attach a tip.
4. Drag the plunger to the **1st stop** while the tip is in air, tap the source tube, then slide the plunger back to rest → aspirates the set volume.
5. Tap the destination, push to the **1st stop** then **2nd stop** (blow-out), press **Lift tip**, then release.
6. **Eject tip** discards it into the tip waste.

Real mistakes are detected and explained: pressing to the 2nd stop before aspirating (over-draw), releasing the plunger while the tip is still in liquid (sucks the sample back), reusing a tip (cross-contamination, physically carried into the next tube), no tip, wrong tip size, wrong volume, wrong tube, wrong lane, and more.

Menu → **Assisted pipetting** adds one-tap Aspirate / Dispense / Mix buttons for faster demonstrations.

**Top bar:** module progress · PPE status · lab clock · ↶ Undo · ⌬ Molecular view · ◐ Demonstration mode · ⤢ Full screen · ≡ Menu.

**Instructor panel (right):** WHAT TO DO, live checklist, and tabs **How / Why / Molecular / Expect / Mistakes**. 🔊 Voice reads the current tab aloud. "Skip →" lets a presenter move on; "Next step →" pulses green when the step is complete.

**Demonstration mode (◐):** hides the instructor for a clean view in front of an audience; the "Instructor" pill brings it back. The next object to touch is outlined in green (Menu → Highlight next object).

**Molecular view:** follows the experiment — cell walls breaking and DNA unfolding during grinding, sedimentation during centrifugation, Na⁺-mediated precipitation, re-dissolving in TE, and a base-by-base PCR cycle (denaturation, primer annealing, Taq extension) synchronised to the thermocycler block temperature. Tap ⤢ to enlarge.

---

## 3. The experiment and its science

| Stage | Protocol (all values editable in Menu → Protocol & parameters) |
|---|---|
| Sample | 80–150 mg strawberry flesh, calyx removed, weighed |
| Lysis | 400 µL Edwards buffer (200 mM Tris-HCl pH 7.5, 250 mM NaCl, 25 mM EDTA, 0.5% SDS); micropestle; vortex 5 s |
| Clarify | 13,000 × g, 1 min (balanced rotor); 300 µL supernatant to a fresh tube |
| Precipitate | 300 µL isopropanol (1 vol), invert 10×, 13,000 × g 5 min |
| Wash | discard supernatant, 500 µL 70% ethanol, 13,000 × g 2 min, discard |
| Dry / dissolve | air-dry 10 min, 100 µL TE pH 8.0 |
| PCR (25 µL) | 1× buffer, 1.5 mM MgCl₂, 200 µM each dNTP, 0.2 µM each primer (rbcLa-F / rbcLa-R), 0.625 U Taq, 1 µL template; master mix for 3 + 1 reactions |
| Controls | tube 1 strawberry DNA · tube 2 positive control · tube 3 no-template control |
| Cycling | 95 °C 2 min; 35 × (95 °C 30 s, 55 °C 30 s, 72 °C 45 s); 72 °C 5 min; 4 °C |
| Gel | 1.5% agarose in 1× TAE with SYBR Safe; 5 µL 6× dye per PCR tube; ladder 5 µL, samples 10 µL; 100 V 35 min; blue-light transilluminator with amber filter |

**How results are produced (no scripted outcome).** Every tube holds real volumes of named reagents. Concentrations in each PCR tube are computed from what you actually pipetted. Per-cycle efficiency is reduced by missing or mis-dosed buffer, Mg²⁺, dNTPs, primers or Taq; by ethanol/SDS carry-over from your extraction; and by the program (denaturation temperature, annealing vs. primer Tm, extension time vs. product length). Amplification follows N(c+1) = N(c)·[1 + E·(1 − N/Nmax)]: exponential while reagents are in excess, then a plateau. Starting copies N₀ come from your DNA yield (chloroplast DNA fraction × copies per ng). Gel bands migrate as a log-linear function of size scaled by V·min and gel %, brightness follows mass loaded, and band sizes are estimated by interpolation against the ladder.

**Stated model assumptions** (editable): max efficiency 0.90; amplicon 580 bp (the rbcLa region is ≈550–600 bp depending on species); chloroplast DNA = 15% of plant total DNA; plateau ≈10¹² copies; 3000 ng DNA released per 100 mg fully lysed strawberry tissue. These are teaching approximations, not measured constants.

**References**
- Edwards K, Johnstone C, Thompson C (1991). A simple and rapid method for the preparation of plant genomic DNA for PCR analysis. *Nucleic Acids Research* 19(6):1349.
- New England Biolabs, Taq DNA Polymerase with Standard Taq Buffer (M0273) PCR protocol.
- CBOL Plant Working Group / Kress et al. — rbcLa plant DNA barcode primers rbcLa-F (5′-ATGTCACCACAAACAGAGACTAAAGC-3′) and rbcLa-R (5′-GTAAAATCAAGTCCACCRCG-3′).
- Invitrogen SYBR Safe DNA gel stain (excitation ≈ 500 nm, emission ≈ 530 nm).

---

## 4. Project structure

```
index.html            page shell, import map
css/app.css           interface design (tokens at the top)
js/main.js            renderer, render loop, auto-camera, highlights
js/scene.js           room, bench layout, object/slot/vessel registry
js/models.js          procedural 3D equipment models
js/lab.js             lab state + every physical action, chemistry, visual sync
js/engine.js          workflow engine, checklists, generic mistake rules
js/protocol.js        the 33 steps: instructor text, checklists, step checks
js/sim.js             PCR kinetics, reaction verification, gel migration
js/molecular.js       molecular-scale 3D animations
js/ui.js              instructor, pipette HUD, instrument panels, dialogs
js/audio.js           synthesised sound effects
js/data.js            reagents, vessel geometry, editable protocol, pipette specs
sw.js, manifest.webmanifest, icons/   offline install
serve.py              local / LAN server
tools/selftest.js     automated end-to-end run of the whole experiment
vendor/               Three.js r180 (MIT)
```

**Self-test:** open the app, enter the lab, then in the browser console run
`await (await import('./tools/selftest.js')).run()` — it performs all 33 steps through the same actions the touch interface uses and reports any incomplete step or raised mistake.

---

## 5. Tips for presenting

- Before class: open the app once, enter, and set Menu → Graphics to *Balanced* (default on Retina iPads) or *Performance* on older models.
- Use **Demonstration mode** while performing, switch the instructor back on to explain *Why* and *Molecular*.
- Thermocycler speed (×30…×300) and the gel "Fast-forward" keep long incubations within a lecture.
- Deliberate mistakes are great teaching moments: try a missing MgCl₂, annealing at 68 °C, or placing the gel with the wells at the red electrode — then show the consequences on the gel.
