// Antennas & Wave Propagation scene templates.
// params: { type: string, showLabels: bool }
// Visualizes different antenna types with radiation patterns.

import { V3, COLORS, stdMat, makeFlow, makeWire } from './common.js';


function buildDipole({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const seg = quality === 'low' ? 12 : 24;

  // Two quarter-wave elements
  const armMat = stdMat(0x9ca3af, { style, emissive: 0x64748b });
  const left = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 8), armMat);
  left.position.y = -0.7;
  const right = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 8), armMat);
  right.position.y = 0.7;
  group.add(left, right);

  // Feed point (gap)
  const feed = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 8, 8),
    stdMat(0x22c55e, { style, emissive: 0x22c55e })
  );
  group.add(feed);

  // Radiation pattern (toroidal)
  const radPts = [];
  const r = 1.2;
  for (let i = 0; i <= seg; i++) {
    const theta = (i / seg) * Math.PI * 2;
    radPts.push(V3(r * Math.cos(theta), 0, r * Math.sin(theta)));
  }
  const radCurve = new THREE.CatmullRomCurve3(radPts);
  const radFlow = makeFlow(radCurve, {
    count: quality === 'low' ? 8 : 16, color: 0x60a5fa, size: 0.06, rate: 0.3,
    tooltip: () => `Dipole radiation &bull; f = 150 MHz &bull; &lambda; = 2.0 m &bull; P<sub>rad</sub> = 50 W &bull; Toroidal pattern &bull; Z<sub>in</sub> = 73 &Omega;`
  });
  group.add(radFlow.object);

  // Coaxial feed line
  const coax = makeWire(V3(0, 0, 0), V3(0, -1.5, 0), { color: COLORS.metal });
  group.add(coax);

  return {
    group,
    targets: {
      device_body: { objects: [left, right] },
      terminals: { objects: [feed] },
      signal_flow: { flow: radFlow },
    },
    tick() {},
  };
}

function buildMonopole({ THREE, style, params, quality }) {
  const group = new THREE.Group();

  // Quarter-wave vertical element
  const element = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 1.8, 8),
    stdMat(0x9ca3af, { style, emissive: 0x64748b })
  );
  element.position.y = 0.9;
  group.add(element);

  // Ground plane
  const ground = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.2, 0.05, 24),
    stdMat(0x4a5568, { style })
  );
  group.add(ground);

  // Feed
  const feed = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 8, 8),
    stdMat(0x22c55e, { style, emissive: 0x22c55e })
  );
  group.add(feed);

  // Radiation pattern (omnidirectional)
  const radPts = [];
  for (let i = 0; i <= 16; i++) {
    const theta = (i / 16) * Math.PI * 2;
    radPts.push(V3(1.0 * Math.cos(theta), 0.2, 1.0 * Math.sin(theta)));
  }
  const radFlow = makeFlow(
    new THREE.CatmullRomCurve3(radPts),
    { count: 10, color: 0x60a5fa, size: 0.06, rate: 0.25, tooltip: () => `Monopole radiation &bull; f = 75 MHz &bull; &lambda; = 4.0 m &bull; Omnidirectional &bull; G = 2.15 dBi` }
  );
  group.add(radFlow.object);

  return {
    group,
    targets: {
      device_body: { objects: [element, ground] },
      terminals: { objects: [feed] },
      signal_flow: { flow: radFlow },
    },
    tick() {},
  };
}

function buildPatchAntenna({ THREE, style, params, quality }) {
  const group = new THREE.Group();

  // Ground plane
  const ground = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 0.05, 2.0),
    stdMat(0x4a5568, { style })
  );
  group.add(ground);

  // Dielectric substrate
  const substrate = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.15, 1.8),
    stdMat(0x0ea5e9, { style, opacity: 0.3 })
  );
  substrate.position.y = 0.1;
  group.add(substrate);

  // Patch
  const patch = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.02, 0.6),
    stdMat(0xd97706, { style, emissive: 0xd97706 })
  );
  patch.position.y = 0.2;
  group.add(patch);

  // Feed line (microstrip)
  const feedLine = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.02, 0.6),
    stdMat(0xd97706, { style })
  );
  feedLine.position.set(0, 0.2, -0.7);
  group.add(feedLine);

  // Radiation pattern (directive)
  const radPts = [V3(0, 0.5, 1.0), V3(0.4, 0.3, 1.2), V3(0.8, 0, 1.4), V3(0.4, -0.3, 1.2), V3(0, -0.5, 1.0)];
  const radFlow = makeFlow(
    new THREE.CatmullRomCurve3(radPts),
    { count: 8, color: 0x60a5fa, size: 0.07, rate: 0.2, tooltip: () => `Patch radiation &bull; f = 2.4 GHz &bull; &lambda; = 12.5 cm &bull; Directive, G = 6 dBi &bull; Polarization: linear` }
  );
  group.add(radFlow.object);

  return {
    group,
    targets: {
      device_body: { objects: [patch, ground] },
      terminals: { objects: [feedLine] },
      signal_flow: { flow: radFlow },
    },
    tick() {},
  };
}

function buildYagiUda({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const antMat = stdMat(0x9ca3af, { style, emissive: 0x64748b });

  // Boom
  const boom = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 3.0, 6),
    antMat
  );
  boom.rotation.z = Math.PI / 2;
  group.add(boom);

  // Driven element (folded dipole)
  const driven = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 6), antMat);
  driven.position.x = 0;
  driven.position.z = 0;
  group.add(driven);

  // Reflector (slightly longer)
  const reflector = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 6), antMat);
  reflector.position.x = -0.6;
  group.add(reflector);

  // Directors (progressively shorter)
  for (let i = 0; i < 3; i++) {
    const len = 0.7 - i * 0.08;
    const dir = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, len, 6), antMat);
    dir.position.x = 0.7 + i * 0.5;
    group.add(dir);
  }

  // Forward radiation
  const fwdPoints = [V3(1.5, 0, 0.3), V3(2.0, 0, 0), V3(1.5, 0, -0.3)];
  const fwdFlow = makeFlow(
    new THREE.CatmullRomCurve3(fwdPoints),
    { count: 8, color: COLORS.electron, size: 0.06, rate: 0.3, tooltip: () => `Yagi-Uda forward radiation &bull; f = 300 MHz &bull; &lambda; = 1.0 m &bull; G = 9 dBi &bull; F/B ratio &gt; 20 dB` }
  );
  group.add(fwdFlow.object);

  return {
    group,
    targets: {
      device_body: { objects: [boom] },
      terminals: { objects: [driven] },
      signal_flow: { flow: fwdFlow },
    },
    tick() {},
  };
}

function buildParabolicDish({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const seg = quality === 'low' ? 16 : 32;

  // Dish (parabolic reflector)
  const dishGeo = new THREE.SphereGeometry(1.2, seg, seg, 0, Math.PI * 2, 0, Math.PI / 2.5);
  const dish = new THREE.Mesh(dishGeo, stdMat(0x9ca3af, { style, emissive: 0x64748b }));
  dish.scale.set(1, 1, 0.3);
  dish.rotation.x = Math.PI;
  group.add(dish);

  // Feed horn at focus
  const feed = new THREE.Mesh(
    new THREE.ConeGeometry(0.15, 0.3, 8),
    stdMat(0x22c55e, { style, emissive: 0x22c55e })
  );
  feed.position.set(0, 0, 0.5);
  group.add(feed);

  // Support struts
  const strutMat = stdMat(0x4a5568, { style });
  for (let i = 0; i < 3; i++) {
    const angle = (i * 2 * Math.PI) / 3;
    const strut = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 0.45, 4),
      strutMat
    );
    strut.position.set(Math.cos(angle) * 0.5, Math.sin(angle) * 0.5, 0.25);
    strut.lookAt(0, 0, 0.5);
    group.add(strut);
  }

  // Reflected waves (parallel beam)
  const beamPts = [];
  for (let i = 0; i < 8; i++) {
    const t = i / 7;
    beamPts.push(V3(0, 0, 0.6 + t * 1.2));
  }
  const beamFlow = makeFlow(
    new THREE.CatmullRomCurve3(beamPts),
    { count: 10, color: 0x60a5fa, size: 0.08, rate: 0.35, tooltip: () => `Parabolic beam &bull; f = 12 GHz &bull; &lambda; = 2.5 cm &bull; G = 35 dBi &bull; HPBW = 2.5&deg;` }
  );
  group.add(beamFlow.object);

  return {
    group,
    targets: {
      device_body: { objects: [dish] },
      terminals: { objects: [feed] },
      signal_flow: { flow: beamFlow },
    },
    tick() {},
  };
}

function buildHornAntenna({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const seg = quality === 'low' ? 8 : 16;

  // Waveguide section
  const wg = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.3, 0.8),
    stdMat(0x4a5568, { style })
  );
  wg.position.z = -0.4;
  group.add(wg);

  // Flared section (using a pyramid approximation)
  const hornMat = stdMat(0x64748b, { style, emissive: 0x4a5568 });
  const flareShape = new THREE.Shape();
  flareShape.moveTo(-0.2, -0.15);
  flareShape.lineTo(0.2, -0.15);
  flareShape.lineTo(0.7, -0.5);
  flareShape.lineTo(-0.7, -0.5);
  flareShape.closePath();
  const extrudeSettings = { depth: 0.6, bevelEnabled: false };
  const flare = new THREE.Mesh(
    new THREE.ExtrudeGeometry(flareShape, extrudeSettings),
    hornMat
  );
  flare.position.set(0, 0, 0.4);
  group.add(flare);

  // Radiated waves
  const wavePts = [];
  for (let i = 0; i < 8; i++) {
    wavePts.push(V3(0, 0, 0.8 + i * 0.2));
  }
  const waveFlow = makeFlow(
    new THREE.CatmullRomCurve3(wavePts),
    { count: 10, color: 0x60a5fa, size: 0.06, rate: 0.4, tooltip: () => `Horn radiation &bull; f = 10 GHz &bull; &lambda; = 3.0 cm &bull; G = 15 dBi &bull; Matched to waveguide TE10 mode` }
  );
  group.add(waveFlow.object);

  return {
    group,
    targets: {
      device_body: { objects: [wg, flare] },
      terminals: { objects: [] },
      signal_flow: { flow: waveFlow },
    },
    tick() {},
  };
}

function buildWaveguide({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const seg = quality === 'low' ? 8 : 16;

  // Rectangular waveguide section
  const wgMat = stdMat(0x4a5568, { style });
  const wg = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 2.0, 1, 1, 4), wgMat);
  wg.position.z = 0;
  group.add(wg);

  // Hollow interior
  const inner = new THREE.Mesh(
    new THREE.BoxGeometry(0.65, 0.25, 2.01),
    stdMat(0x0b1020, { style, opacity: 0.8 })
  );
  inner.position.z = 0;
  group.add(inner);

  // TE10 mode field pattern
  const fieldPts = [];
  for (let i = 0; i < 12; i++) {
    const x = Math.sin(i * 0.5) * 0.2;
    fieldPts.push(V3(x, 0, -1.0 + i * 0.18));
  }
  const fieldFlow = makeFlow(
    new THREE.CatmullRomCurve3(fieldPts),
    { count: 8, color: COLORS.electron, size: 0.06, rate: 0.25, tooltip: () => `TE10 mode &bull; f = 8 GHz &bull; &lambda;<sub>g</sub> = 4.5 cm &bull; Cutoff f<sub>c</sub> = 6.6 GHz &bull; Wave impedance Z<sub>TE</sub> = 480 &Omega;` }
  );
  group.add(fieldFlow.object);

  // Flanges
  const flangeMat = stdMat(0x64748b, { style });
  for (let z of [-1.0, 1.0]) {
    const flange = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.55, 0.05), flangeMat);
    flange.position.z = z;
    group.add(flange);
  }

  return {
    group,
    targets: {
      device_body: { objects: [wg] },
      terminals: { objects: [] },
      signal_flow: { flow: fieldFlow },
    },
    tick() {},
  };
}

export function build({ THREE, style, params, quality, template }) {
  const type = template || 'dipole_antenna';
  switch (type) {
    case 'dipole_antenna': return buildDipole({ THREE, style, params, quality });
    case 'monopole_antenna': return buildMonopole({ THREE, style, params, quality });
    case 'patch_antenna': return buildPatchAntenna({ THREE, style, params, quality });
    case 'yagi_uda': return buildYagiUda({ THREE, style, params, quality });
    case 'parabolic_dish': return buildParabolicDish({ THREE, style, params, quality });
    case 'horn_antenna': return buildHornAntenna({ THREE, style, params, quality });
    case 'wave_guide': return buildWaveguide({ THREE, style, params, quality });
    default: return buildDipole({ THREE, style, params, quality });
  }
}
