// Shared helpers for scene templates.
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// Vector3 shorthand — needs THREE imported at the top of common.js
export const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

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

export function stdMat(color, { style = 'schematic', opacity = 1, emissive = 0x000000, roughness, metalness } = {}) {
  const realistic = style === 'realistic';
  return new THREE.MeshStandardMaterial({
    color,
    roughness: roughness ?? (realistic ? 0.3 : 0.8),
    metalness: metalness ?? (realistic ? 0.55 : 0.05),
    transparent: opacity < 1,
    opacity,
    emissive,
    emissiveIntensity: realistic ? 0.08 : 0,
  });
}

// Environment sphere for realistic backgrounds
export function makeEnvironment(THREE, style) {
  if (style !== 'realistic') return null;
  const env = new THREE.Mesh(
    new THREE.SphereGeometry(18, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshBasicMaterial({
      color: 0x1a2744,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.6,
    })
  );
  env.position.y = -1;
  return env;
}

// Floor plane with subtle reflection for realistic mode
export function makeFloor(THREE, style) {
  if (style !== 'realistic') return null;
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 14),
    new THREE.MeshStandardMaterial({
      color: 0x0a1020,
      roughness: 0.7,
      metalness: 0.1,
      transparent: true,
      opacity: 0.4,
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -2.0;
  return floor;
}

// Particle stream flowing along a THREE.Curve. Returned object plugs into the
// viewer's "flow" animation type: set .active / .speed, call .update(dt).
export function makeFlow(curve, { count = 24, color = COLORS.electron, size = 0.09, rate = 0.25, tooltip } = {}) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color, size, sizeAttenuation: true, transparent: true, opacity: 0.95,
  });
  const points = new THREE.Points(geometry, material);
  points.visible = false;
  points.frustumCulled = false;
  if (tooltip) points.userData.tooltip = tooltip;

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
