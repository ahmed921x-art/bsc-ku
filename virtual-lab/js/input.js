// Touch-first input: tap, drag-and-drop, one-finger orbit, pinch zoom.
import * as THREE from 'three';
import { STATIONS } from './scene.js';

export class CameraRig {
  constructor(camera) {
    this.cam = camera;
    this.basePos = new THREE.Vector3(...STATIONS.overview.pos);
    this.baseTgt = new THREE.Vector3(...STATIONS.overview.target);
    this.pos = this.basePos.clone(); this.tgt = this.baseTgt.clone();
    this.yaw = 0; this.pitch = 0; this.zoom = 1; this.pan = new THREE.Vector3();
    this.focus = null; this.speed = 2.6;
    camera.position.copy(this.pos); camera.lookAt(this.tgt);
  }
  setView(view, instant = false) {
    this.basePos.set(...view.pos); this.baseTgt.set(...view.target);
    this.yaw = 0; this.pitch = 0; this.zoom = 1; this.pan.set(0, 0, 0); this.focus = null;
    if (instant) { this.pos.copy(this.basePos); this.tgt.copy(this.baseTgt); }
  }
  focusOn(point, dist = 0.3, lift = 0.6) {
    const dir = this.basePos.clone().sub(this.baseTgt).normalize();
    dir.y = Math.max(dir.y, lift); dir.normalize();
    this.focus = { tgt: point.clone(), pos: point.clone().addScaledVector(dir, dist) };
  }
  clearFocus() { this.focus = null; }
  update(dt) {
    let tgt, pos;
    if (this.focus) { tgt = this.focus.tgt.clone(); pos = this.focus.pos.clone(); }
    else { tgt = this.baseTgt.clone(); pos = this.basePos.clone(); }
    tgt.add(this.pan); pos.add(this.pan);
    const off = pos.clone().sub(tgt);
    const sph = new THREE.Spherical().setFromVector3(off);
    sph.theta += this.yaw; sph.phi = Math.max(0.25, Math.min(1.45, sph.phi + this.pitch)); sph.radius *= this.zoom;
    pos = tgt.clone().add(new THREE.Vector3().setFromSpherical(sph));
    const k = 1 - Math.exp(-dt * this.speed);
    this.pos.lerp(pos, k); this.tgt.lerp(tgt, k);
    this.cam.position.copy(this.pos); this.cam.lookAt(this.tgt);
  }
}

export class Input {
  constructor(canvas, camera, world, lab, rig, bus) {
    Object.assign(this, { canvas, camera, world, lab, rig, bus });
    this.ray = new THREE.Raycaster();
    this.ndc = new THREE.Vector2();
    this.pointers = new Map();
    this.mode = null;
    this.enabled = true;
    const opts = { passive: false };
    canvas.addEventListener('pointerdown', (e) => this.down(e), opts);
    window.addEventListener('pointermove', (e) => this.move(e), opts);
    window.addEventListener('pointerup', (e) => this.up(e), opts);
    window.addEventListener('pointercancel', (e) => this.up(e), opts);
    canvas.addEventListener('wheel', (e) => { e.preventDefault(); this.rig.zoom = Math.max(0.35, Math.min(1.8, this.rig.zoom * (1 + e.deltaY * 0.001))); }, opts);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.12);
  }
  setNDC(e) {
    const r = this.canvas.getBoundingClientRect();
    this.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(this.ndc, this.camera);
  }
  visible(o) { let n = o; while (n) { if (!n.visible && !n.userData.isHit) return false; n = n.parent; } return true; }
  pick(e, excludeId) {
    this.setNDC(e);
    const held = this.lab.S.held?.id;
    const list = this.world.hitList.filter(h => h.userData.objId !== held && h.userData.objId !== excludeId && this.visible(h.parent));
    const hits = this.ray.intersectObjects(list, false);
    if (!hits.length) return null;
    // Items resting in or on a holder (tissue inside the balance shield, tubes in a
    // rack) win over the holder itself; then prefer small objects over large ones.
    const first = hits[0], firstId = first.object.userData.objId;
    if (this.world.objects[firstId]?.kind === 'holder') {
      const inside = hits.find(h => {
        const loc = this.lab.S.items[h.object.userData.objId]?.loc;
        return loc && this.world.slots[loc]?.owner === firstId;
      });
      if (inside) return { id: inside.object.userData.objId, point: inside.point.clone() };
    }
    const h0 = first;
    const near = hits.filter(h => h.distance < h0.distance + 0.03);
    near.sort((a, b) => vol(a.object) - vol(b.object));
    const h = near[0];
    return { id: h.object.userData.objId, point: h.point.clone() };
  }
  planePoint(e, y = 0.12) {
    this.setNDC(e); this.plane.constant = -y;
    const p = new THREE.Vector3();
    return this.ray.ray.intersectPlane(this.plane, p) ? p : null;
  }
  down(e) {
    if (!this.enabled) return;
    e.preventDefault();
    try { this.canvas.setPointerCapture?.(e.pointerId); } catch (err) { /* pointer already released */ }
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now() });
    this.bus.emit('userGesture');
    if (this.pointers.size === 2) { this.mode = 'pinch'; this.pinch0 = this.pinchDist(); this.zoom0 = this.rig.zoom; this.mid0 = this.mid(); this.pan0 = this.rig.pan.clone(); return; }
    if (this.pointers.size > 2) return;
    this.downHit = this.pick(e);
    this.mode = 'pending';
  }
  move(e) {
    const p = this.pointers.get(e.pointerId); if (!p) return;
    e.preventDefault();
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (this.mode === 'pinch' && this.pointers.size >= 2) {
      const d = this.pinchDist(); this.rig.zoom = Math.max(0.3, Math.min(1.8, this.zoom0 * this.pinch0 / d));
      const m = this.mid(); const k = 0.0009 * this.rig.zoom;
      const right = new THREE.Vector3().subVectors(this.rig.cam.position, this.rig.tgt).cross(new THREE.Vector3(0, 1, 0)).normalize();
      this.rig.pan.copy(this.pan0).addScaledVector(right, (m.x - this.mid0.x) * k).add(new THREE.Vector3(0, 0, -(m.y - this.mid0.y) * k * 0.6));
      return;
    }
    const moved = Math.hypot(e.clientX - p.sx, e.clientY - p.sy);
    if (this.mode === 'pending' && moved > 10) {
      const held = this.lab.S.held;
      if (held) { this.mode = 'drag'; if (held.kind === 'pip' && this.lab.S.pip[held.id].at) this.lab.withdraw(); }
      else if (this.downHit && this.world.objects[this.downHit.id]?.kind === 'item' && this.lab.ppeOk()) {
        this.lab.pickItem(this.downHit.id);
        this.mode = this.lab.S.held ? 'drag' : 'orbit';
      } else if (this.downHit && this.world.objects[this.downHit.id]?.kind === 'pipette' && this.lab.ppeOk()) {
        this.lab.pickPipette(this.downHit.id); this.mode = this.lab.S.held ? 'drag' : 'orbit';
      } else this.mode = 'orbit';
    }
    if (this.mode === 'drag') {
      const held = this.lab.S.held; if (!held) { this.mode = 'orbit'; return; }
      const y = held.kind === 'pip' ? 0.075 : 0.12;
      const pt = this.planePoint(e, y);
      if (pt) { pt.x = Math.max(-2.3, Math.min(1.85, pt.x)); pt.z = Math.max(-0.38, Math.min(0.42, pt.z)); this.lab.holdPoint.copy(pt); }
      if (this.lab.pourDock) { this.lab.pourDock = null; this.lab.stopPour(); }
      const tgt = this.pick(e);
      this.bus.emit('dragTarget', tgt);
    } else if (this.mode === 'orbit') {
      this.rig.yaw = Math.max(-0.6, Math.min(0.6, this.rig.yaw - dx * 0.004));
      this.rig.pitch = Math.max(-0.35, Math.min(0.35, this.rig.pitch - dy * 0.003));
    }
  }
  up(e) {
    const p = this.pointers.get(e.pointerId); if (!p) return;
    this.pointers.delete(e.pointerId);
    if (this.mode === 'pinch') { if (this.pointers.size === 0) this.mode = null; return; }
    const moved = Math.hypot(e.clientX - p.sx, e.clientY - p.sy);
    if (this.mode === 'pending' && moved <= 10) {
      const hit = this.downHit;
      if (hit) this.lab.tap(hit.id, hit.point);
      else if (this.lab.S.held?.kind === 'item') {
        const pt = this.planePoint(e, 0.12); if (pt) this.lab.holdPoint.copy(pt);
      } else this.lab.select(null);
    } else if (this.mode === 'drag') {
      const tgt = this.pick(e);
      this.bus.emit('dragTarget', null);
      if (tgt) this.lab.tap(tgt.id, tgt.point);
    }
    this.mode = null;
  }
  pinchDist() { const a = [...this.pointers.values()]; return Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) || 1; }
  mid() { const a = [...this.pointers.values()]; return { x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2 }; }
}
function vol(o) { const p = o.geometry.parameters; return p.width * p.height * p.depth; }
