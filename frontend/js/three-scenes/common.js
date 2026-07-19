// Shared helpers for scene templates.
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

export const COLORS = {
  nType: 0x3b82f6,     // blue
  pType: 0xf97316,     // orange
  metal: 0x9ca3af,
  wireOff: 0x4b5563,
  wireOn: 0x22c55e,
  electron: 0x60a5fa,
  hole: 0xfbbf24,
  accent: 0x38bdf8,
  lampOn: 0xfde047,
  lampOff: 0x374151,
};

export function stdMat(color, { style = 'schematic', opacity = 1, emissive = 0x000000 } = {}) {
  const realistic = style === 'realistic';
  return new THREE.MeshStandardMaterial({
    color,
    roughness: realistic ? 0.35 : 0.8,
    metalness: realistic ? 0.5 : 0.05,
    transparent: opacity < 1,
    opacity,
    emissive,
    emissiveIntensity: 0,
  });
}

// Particle stream flowing along a THREE.Curve. Returned object plugs into the
// viewer's "flow" animation type: set .active / .speed, call .update(dt).
export function makeFlow(curve, { count = 24, color = COLORS.electron, size = 0.09, rate = 0.25 } = {}) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color, size, sizeAttenuation: true, transparent: true, opacity: 0.95,
  });
  const points = new THREE.Points(geometry, material);
  points.visible = false;
  points.frustumCulled = false;

  const offsets = Array.from({ length: count }, (_, i) => i / count);

  return {
    object: points,
    active: false,
    speed: 1,
    update(dt) {
      if (!this.active) { points.visible = false; return; }
      points.visible = true;
      const pos = geometry.attributes.position;
      for (let i = 0; i < count; i++) {
        offsets[i] = (offsets[i] + dt * rate * this.speed) % 1;
        const p = curve.getPoint(offsets[i]);
        pos.setXYZ(i, p.x, p.y, p.z);
      }
      pos.needsUpdate = true;
    },
  };
}

export function makeLabel(text) {
  const div = document.createElement('div');
  div.className = 'scene-label';
  div.textContent = text;
  return new CSS2DObject(div);
}

// Attach labels from a spec's labels[] to named targets.
export function attachLabels(labels, targets) {
  for (const { id, text } of labels || []) {
    const target = targets[id];
    const anchor = target?.labelAnchor || target?.objects?.[0];
    if (!anchor) continue;
    const label = makeLabel(text);
    label.position.set(0, (anchor.userData.labelOffsetY ?? 0.9), 0);
    anchor.add(label);
  }
}

export function disposeGroup(group) {
  group.traverse((obj) => {
    if (obj.isCSS2DObject) obj.element?.remove();
    obj.geometry?.dispose?.();
    if (obj.material) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((m) => { m.map?.dispose?.(); m.dispose?.(); });
    }
  });
}

// Rounded "lead" wire between two points.
export function makeWire(from, to, { color = COLORS.wireOff, radius = 0.04, segments = 20 } = {}) {
  const curve = new THREE.CatmullRomCurve3([from, to].map((p) => p.clone()));
  const geo = new THREE.TubeGeometry(curve, segments, radius, 8, false);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.3 });
  return new THREE.Mesh(geo, mat);
}
