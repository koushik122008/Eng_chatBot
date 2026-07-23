// Optics & Photonics scene templates.
// params: { type: string, showLabels: bool }

import { V3, COLORS, stdMat, makeFlow, makeWire } from './common.js';
const PI = Math.PI;

function buildConvexLens({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const seg = quality === 'low' ? 16 : 32;

  // Biconvex lens
  const lensMat = stdMat(0x60a5fa, { style, opacity: 0.3, emissive: 0x3b82f6 });
  const lens = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, seg, seg, 0, PI * 2, 0, PI * 0.35),
    lensMat
  );
  lens.scale.set(1, 1, 0.15);
  group.add(lens);
  // Mirror for back side
  const lens2 = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, seg, seg, 0, PI * 2, PI * 0.65, PI * 0.35),
    lensMat
  );
  lens2.scale.set(1, 1, 0.15);
  group.add(lens2);

  // Light rays through lens (converging)
  const rayPts = [
    V3(-1.0, 0.2, 0), V3(-0.5, 0.08, 0), V3(0, 0, 0), V3(0.5, -0.08, 0), V3(1.0, -0.2, 0),
  ];
  const rayFlow = makeFlow(new THREE.CatmullRomCurve3(rayPts),
    { count: 10, color: 0xfbbf24, size: 0.04, rate: 0.3, tooltip: () => `Light rays &bull; Converging through lens &bull; f = 0.7 m &bull; &lambda; = 550 nm &bull; &nu; = 545 THz &bull; P = 5 mW` });
  group.add(rayFlow.object);

  // Focus point
  const focus = new THREE.Mesh(
    new THREE.SphereGeometry(0.03, 8, 8),
    stdMat(0xef4444, { style, emissive: 0xef4444 })
  );
  focus.position.set(0.7, 0, 0);
  group.add(focus);

  return {
    group,
    targets: { device_body: { objects: [lens] }, terminals: { objects: [focus] }, signal_flow: { flow: rayFlow } },
    tick() {},
  };
}

function buildConcaveLens({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const seg = quality === 'low' ? 16 : 32;

  // Biconcave lens
  const lensMat = stdMat(0x60a5fa, { style, opacity: 0.3, emissive: 0x3b82f6 });
  const lens = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, seg, seg, 0, PI * 2, PI * 0.35, PI * 0.3),
    lensMat
  );
  lens.scale.set(1, 1, 0.2);
  group.add(lens);
  const lens2 = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, seg, seg, 0, PI * 2, PI * 0.35, PI * 0.3),
    lensMat
  );
  lens2.scale.set(1, 1, -0.2);
  group.add(lens2);

  // Diverging rays
  const rayPts = [
    V3(-1.0, 0.2, 0), V3(-0.5, 0.08, 0), V3(0, 0, 0),
    V3(0.5, 0.1, 0), V3(1.0, 0.25, 0),
  ];
  const rayFlow = makeFlow(new THREE.CatmullRomCurve3(rayPts),
    { count: 8, color: 0xfbbf24, size: 0.04, rate: 0.25, tooltip: () => `Light rays &bull; Diverging &bull; f = -0.5 m &bull; Virtual focus &bull; &lambda; = 550 nm` });
  group.add(rayFlow.object);

  return {
    group,
    targets: { device_body: { objects: [lens] }, terminals: { objects: [] }, signal_flow: { flow: rayFlow } },
    tick() {},
  };
}

function buildPrism({ THREE, style, params, quality }) {
  const group = new THREE.Group();

  // Triangular prism
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, -0.4);
  shape.lineTo(0.5, -0.4);
  shape.lineTo(0, 0.5);
  shape.closePath();
  const prism = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, { depth: 0.5, bevelEnabled: false }),
    stdMat(0x60a5fa, { style, opacity: 0.25, emissive: 0x3b82f6 })
  );
  prism.position.z = -0.25;
  group.add(prism);

  // Dispersion (white in, rainbow out)
  const colors = [0xef4444, 0xf97316, 0xfbbf24, 0x22c55e, 0x3b82f6, 0x8b5cf6];
  const rayPts = [V3(-0.8, 0.05, 0), V3(-0.3, 0.1, 0), V3(0, 0.35, 0)];
  const inFlow = makeFlow(new THREE.CatmullRomCurve3(rayPts),
    { count: 6, color: 0xffffff, size: 0.04, rate: 0.15, tooltip: () => `White light &bull; Dispersion &bull; n(&lambda;) varies &bull; &lambda; = 400-700 nm` });
  group.add(inFlow.object);

  for (let i = 0; i < colors.length; i++) {
    const a = -0.15 + i * 0.05;
    const outPts = [V3(0, 0.35, 0), V3(0.5, -0.05 + a, 0)];
    const outFlow = makeFlow(new THREE.CatmullRomCurve3(outPts),
      { count: 4, color: colors[i], size: 0.03, rate: 0.1 + i * 0.02 });
    group.add(outFlow.object);
  }

  return {
    group,
    targets: { device_body: { objects: [prism] }, terminals: { objects: [] }, signal_flow: { flow: inFlow } },
    tick() {},
  };
}

function buildFiberOptic({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const seg = quality === 'low' ? 6 : 12;

  // Core
  const coreMat = stdMat(0x60a5fa, { style, opacity: 0.6, emissive: 0x3b82f6 });
  const coreCurve = new THREE.CatmullRomCurve3([
    V3(-1.2, 0, 0), V3(-0.8, 0.3, 0), V3(-0.4, 0.1, 0),
    V3(0, 0.2, 0), V3(0.4, 0, 0), V3(0.8, -0.3, 0), V3(1.2, 0, 0),
  ]);
  const coreTube = new THREE.Mesh(
    new THREE.TubeGeometry(coreCurve, seg * 2, 0.04, 6, false),
    coreMat
  );
  group.add(coreTube);

  // Cladding
  const cladMat = stdMat(0x64748b, { style, opacity: 0.2 });
  const cladTube = new THREE.Mesh(
    new THREE.TubeGeometry(coreCurve, seg * 2, 0.06, 8, false),
    cladMat
  );
  group.add(cladTube);

  // Light pulse traveling through core
  const pulsePts = [];
  for (let i = 0; i <= 12; i++) pulsePts.push(coreCurve.getPoint(i / 12));
  const pulseFlow = makeFlow(new THREE.CatmullRomCurve3(pulsePts),
    { count: 8, color: 0x22c55e, size: 0.05, rate: 0.3, tooltip: () => `Optical pulse &bull; &lambda; = 1550 nm &bull; Data rate = 100 Gbps &bull; Attenuation = 0.2 dB/km &bull; TIR in core` });
  group.add(pulseFlow.object);

  return {
    group,
    targets: { device_body: { objects: [coreTube] }, terminals: { objects: [] }, signal_flow: { flow: pulseFlow } },
    tick() {},
  };
}

function buildLaserCavity({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const seg = quality === 'low' ? 12 : 24;

  // Gain medium (rod)
  const rodMat = stdMat(0xef4444, { style, opacity: 0.5, emissive: 0xef4444 });
  const rod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 0.6, seg),
    rodMat
  );
  rod.rotation.x = PI / 2;
  group.add(rod);

  // Mirrors (end caps)
  const mirMat = stdMat(0x9ca3af, { style, metalness: 0.9 });
  const mir1 = new THREE.Mesh(new THREE.CircleGeometry(0.12, seg), mirMat);
  mir1.position.x = -0.3;
  mir1.rotation.y = PI / 2;
  const mir2 = new THREE.Mesh(new THREE.CircleGeometry(0.12, seg), stdMat(0xd97706, { style, metalness: 0.5 }));
  mir2.position.x = 0.3;
  mir2.rotation.y = -PI / 2;
  group.add(mir1, mir2);

  // Pump source
  const pump = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.04, 0.3),
    stdMat(0x3b82f6, { style, emissive: 0x3b82f6 })
  );
  pump.position.set(0.4, -0.2, 0);
  group.add(pump);

  // Output beam
  const beamPts = [];
  for (let i = 0; i < 10; i++) beamPts.push(V3(0.35 + i * 0.07, 0, 0));
  const beamFlow = makeFlow(new THREE.CatmullRomCurve3(beamPts),
    { count: 8, color: 0xef4444, size: 0.03, rate: 0.4, tooltip: () => `Laser beam &bull; &lambda; = 632.8 nm &bull; P = 5 mW &bull; Coherent &bull; Beam waist = 0.5 mm` });
  group.add(beamFlow.object);

  return {
    group,
    targets: { device_body: { objects: [rod] }, terminals: { objects: [mir1, mir2] }, signal_flow: { flow: beamFlow } },
    tick() {},
  };
}

function buildDiffractionGrating({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const seg = quality === 'low' ? 24 : 48;

  // Grating surface
  const surf = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.02, 0.5),
    stdMat(0x64748b, { style })
  );
  surf.position.x = 0.4;
  group.add(surf);

  // Grating lines
  for (let i = -20; i <= 20; i++) {
    const line = new THREE.Mesh(
      new THREE.BoxGeometry(0.003, 0.005, 0.5),
      stdMat(0x9ca3af, { style, metalness: 0.8 })
    );
    line.position.set(0.4 + i * 0.018, 0.012, 0);
    group.add(line);
  }

  // Incident beam
  const inPts = [V3(-0.4, 0.15, 0), V3(0, 0.05, 0), V3(0.4, 0, 0)];
  const inFlow = makeFlow(new THREE.CatmullRomCurve3(inPts),
    { count: 6, color: 0xffffff, size: 0.04, rate: 0.2 });
  group.add(inFlow.object);

  // Diffracted orders
  for (let i = -2; i <= 2; i++) {
    if (i === 0) continue;
    const a = i * 0.08;
    const outPts = [V3(0.4, 0, 0), V3(0.7, a, 0)];
    const col = i < 0 ? 0x3b82f6 : 0xf97316;
    const cf = makeFlow(new THREE.CatmullRomCurve3(outPts),
      { count: 4, color: col, size: 0.03, rate: 0.15 + Math.abs(i) * 0.05 });
    group.add(cf.object);
  }

  return {
    group,
    targets: { device_body: { objects: [surf] }, terminals: { objects: [] }, signal_flow: { flow: inFlow } },
    tick() {},
  };
}

function buildInterferometer({ THREE, style, params, quality }) {
  const group = new THREE.Group();

  // Beam splitter
  const bs = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.3, 0.3),
    stdMat(0x60a5fa, { style, opacity: 0.4, emissive: 0x3b82f6 })
  );
  group.add(bs);

  // Mirrors
  const mirMat = stdMat(0x9ca3af, { style, metalness: 0.9 });
  const m1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.02), mirMat);
  m1.position.set(0.5, 0.5, 0.15);
  const m2 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.2, 0.3), mirMat);
  m2.position.set(-0.5, 0.5, 0);
  group.add(m1, m2);

  // Light paths
  const path1 = makeFlow(
    new THREE.CatmullRomCurve3([V3(-0.5, -0.3, 0), V3(0, 0, 0), V3(0.5, 0.3, 0)]),
    { count: 8, color: 0xfbbf24, size: 0.03, rate: 0.25 });
  const path2 = makeFlow(
    new THREE.CatmullRomCurve3([V3(0.5, -0.3, 0), V3(0, 0, 0), V3(-0.5, 0.3, 0)]),
    { count: 8, color: 0xfbbf24, size: 0.03, rate: 0.25 });
  group.add(path1.object, path2.object);

  // Detector
  const det = new THREE.Mesh(
    new THREE.SphereGeometry(0.04, 8, 8),
    stdMat(0x22c55e, { style, emissive: 0x22c55e })
  );
  det.position.set(0.5, -0.3, 0);
  group.add(det);

  return {
    group,
    targets: { device_body: { objects: [bs] }, terminals: { objects: [det] }, signal_flow: { flow: path1 } },
    tick() {},
  };
}

function buildBeamSplitter({ THREE, style, params, quality }) {
  const group = new THREE.Group();

  // Cube beamsplitter
  const cubeMat = stdMat(0x60a5fa, { style, opacity: 0.35, emissive: 0x3b82f6 });
  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.3, 0.3),
    cubeMat
  );
  group.add(cube);

  // Diagonal coating
  const coat = new THREE.Mesh(
    new THREE.BoxGeometry(0.01, 0.3, 0.3),
    stdMat(0xd97706, { style, metalness: 0.5, emissive: 0xd97706 })
  );
  coat.rotation.z = PI / 4;
  coat.position.set(0, 0, 0);
  group.add(coat);

  // Input and output beams
  const inFlow = makeFlow(
    new THREE.CatmullRomCurve3([V3(-0.5, 0, 0), V3(-0.15, 0, 0)]),
    { count: 6, color: 0xfbbf24, size: 0.03, rate: 0.2 });
  const out1 = makeFlow(
    new THREE.CatmullRomCurve3([V3(0, 0.15, 0), V3(0, 0.5, 0)]),
    { count: 6, color: 0x60a5fa, size: 0.03, rate: 0.2 });
  const out2 = makeFlow(
    new THREE.CatmullRomCurve3([V3(0.15, 0, 0), V3(0.5, 0, 0)]),
    { count: 6, color: 0x60a5fa, size: 0.03, rate: 0.2 });
  group.add(inFlow.object, out1.object, out2.object);

  return {
    group,
    targets: { device_body: { objects: [cube] }, terminals: { objects: [] }, signal_flow: { flow: inFlow } },
    tick() {},
  };
}

export function build({ THREE, style, params, quality, template }) {
  const type = template || 'convex_lens';
  switch (type) {
    case 'convex_lens': return buildConvexLens({ THREE, style, params, quality });
    case 'concave_lens': return buildConcaveLens({ THREE, style, params, quality });
    case 'prism': return buildPrism({ THREE, style, params, quality });
    case 'fiber_optic': return buildFiberOptic({ THREE, style, params, quality });
    case 'laser_cavity': return buildLaserCavity({ THREE, style, params, quality });
    case 'diffraction_grating': return buildDiffractionGrating({ THREE, style, params, quality });
    case 'interferometer': return buildInterferometer({ THREE, style, params, quality });
    case 'beam_splitter': return buildBeamSplitter({ THREE, style, params, quality });
    default: return buildConvexLens({ THREE, style, params, quality });
  }
}
