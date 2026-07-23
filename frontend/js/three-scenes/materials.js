// Materials Science scene templates.
// params: { type: string, showLabels: bool }
// 3D models for crystal structures, stress-strain curves, phase diagrams, etc.

import { V3, COLORS, stdMat, makeFlow, makeWire } from './common.js';


function buildCrystalLattice({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const seg = quality === 'low' ? 1 : 2;

  // FCC unit cell
  const cellSize = 1.2;
  const atomMat = stdMat(0x60a5fa, { style, emissive: 0x3b82f6 });
  const bondMat = stdMat(0x4a5568, { style, opacity: 0.5 });

  // Corner atoms
  const cornerPositions = [];
  for (let x of [-1, 1]) {
    for (let y of [-1, 1]) {
      for (let z of [-1, 1]) {
        cornerPositions.push(V3(x * cellSize/2, y * cellSize/2, z * cellSize/2));
      }
    }
  }

  for (const pos of cornerPositions) {
    const atom = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, seg * 6, seg * 6),
      atomMat
    );
    atom.position.copy(pos);
    group.add(atom);
  }

  // Face-centered atoms
  const faceMat = stdMat(0xf97316, { style, emissive: 0xf97316 });
  const facePositions = [
    V3(0, cellSize/2, 0), V3(0, -cellSize/2, 0), // top/bottom
    V3(cellSize/2, 0, 0), V3(-cellSize/2, 0, 0), // front/back
    V3(0, 0, cellSize/2), V3(0, 0, -cellSize/2), // left/right
  ];

  for (const pos of facePositions) {
    const atom = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, seg * 6, seg * 6),
      faceMat
    );
    atom.position.copy(pos);
    group.add(atom);
  }

  // Unit cell edges
  const edgeMat = stdMat(0x94a3b8, { style, opacity: 0.4 });
  const h = cellSize / 2;
  const edges = [
    [[-h,-h,-h],[h,-h,-h]], [[h,-h,-h],[h,-h,h]], [[h,-h,h],[-h,-h,h]], [[-h,-h,h],[-h,-h,-h]],
    [[-h,h,-h],[h,h,-h]], [[h,h,-h],[h,h,h]], [[h,h,h],[-h,h,h]], [[-h,h,h],[-h,h,-h]],
    [[-h,-h,-h],[-h,h,-h]], [[h,-h,-h],[h,h,-h]], [[h,-h,h],[h,h,h]], [[-h,-h,h],[-h,h,h]],
  ];

  for (const [a, b] of edges) {
    const wire = makeWire(V3(...a), V3(...b), { color: 0x94a3b8, radius: 0.01 });
    group.add(wire);
  }

  return {
    group,
    targets: {
      device_body: { objects: [] },
      terminals: { objects: [] },
    },
    tick() {},
  };
}

function buildStressStrain({ THREE, style, params, quality }) {
  const group = new THREE.Group();

  // Coordinate axes
  const axMat = stdMat(0x64748b, { style });
  const xAxis = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.015, 0.015), axMat);
  xAxis.position.set(0.5, -0.7, 0);
  group.add(xAxis);

  const yAxis = new THREE.Mesh(new THREE.BoxGeometry(0.015, 1.6, 0.015), axMat);
  yAxis.position.set(-0.7, 0.2, 0);
  group.add(yAxis);

  // Arrow tips
  const tipMat = stdMat(0x94a3b8, { style });
  const xTip = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.08, 6), tipMat);
  xTip.position.set(1.55, -0.7, 0);
  xTip.rotation.z = -Math.PI / 2;
  group.add(xTip);

  const yTip = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.08, 6), tipMat);
  yTip.position.set(-0.7, 1.1, 0);
  group.add(yTip);

  // Stress-strain curve
  const curveMat = stdMat(0x3b82f6, { style, emissive: 0x3b82f6 });
  const curvePts = [];
  const segments = 20;
  for (let i = 0; i <= segments; i++) {
    const strain = (i / segments) * 1.6;
    let stress;
    if (strain < 0.4) {
      stress = strain * 2.2; // elastic
    } else if (strain < 0.5) {
      stress = 0.88 + (strain - 0.4) * 0.2; // yield plateau
    } else if (strain < 1.0) {
      stress = 0.9 + (strain - 0.5) * 0.6; // strain hardening
    } else {
      stress = 1.2 - (strain - 1.0) * 0.5; // necking
    }
    curvePts.push(V3(-0.7 + strain, -0.7 + stress, 0));
  }

  const curveGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(curvePts.length * 3);
  for (let i = 0; i < curvePts.length; i++) {
    positions[i * 3] = curvePts[i].x;
    positions[i * 3 + 1] = curvePts[i].y;
    positions[i * 3 + 2] = curvePts[i].z;
  }
  curveGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const line = new THREE.Line(curveGeo, new THREE.LineBasicMaterial({ color: 0x3b82f6, linewidth: 2 }));
  group.add(line);

  // Key points
  const keyMat = stdMat(0xef4444, { style, emissive: 0xef4444 });
  const keyPoints = [
    V3(-0.3, -0.18, 0), // yield point
    V3(0.3, 0.18, 0),    // UTS
    V3(0.9, 0.2, 0),     // fracture
  ];
  for (const p of keyPoints) {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), keyMat);
    dot.position.copy(p);
    group.add(dot);
  }

  // Data point flow
  const dataPts = curvePts.slice(0, 10).map(p => p.clone());
  const dataFlow = makeFlow(
    new THREE.CatmullRomCurve3(dataPts),
    { count: 8, color: 0x60a5fa, size: 0.03, rate: 0.3 }
  );
  group.add(dataFlow.object);

  return {
    group,
    targets: {
      device_body: { objects: [] },
      terminals: { objects: [] },
      signal_flow: { flow: dataFlow },
    },
    tick() {},
  };
}

function buildPhaseDiagram({ THREE, style, params, quality }) {
  const group = new THREE.Group();

  // Axes
  const axMat = stdMat(0x64748b, { style });
  const xAxis = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.015, 0.015), axMat);
  xAxis.position.set(0.5, -0.7, 0);
  group.add(xAxis);

  const yAxis = new THREE.Mesh(new THREE.BoxGeometry(0.015, 1.2, 0.015), axMat);
  yAxis.position.set(-0.7, 0, 0);
  group.add(yAxis);

  // Phase regions
  // Liquid region (top)
  const liquidShape = new THREE.Shape();
  liquidShape.moveTo(-0.7, 0.2);
  liquidShape.quadraticCurveTo(0, 0.5, 0.7, 0.2);
  liquidShape.lineTo(0.7, 0.4);
  liquidShape.lineTo(-0.7, 0.4);
  liquidShape.closePath();

  const liquidMat = stdMat(0xef4444, { style, opacity: 0.2 });
  const liquid = new THREE.Mesh(
    new THREE.ShapeGeometry(liquidShape),
    liquidMat
  );
  liquid.position.z = 0;
  group.add(liquid);

  // Solid + Liquid region (middle)
  const slShape = new THREE.Shape();
  slShape.moveTo(-0.7, 0);
  slShape.quadraticCurveTo(0, 0.25, 0.7, 0);
  slShape.lineTo(0.7, 0.2);
  slShape.quadraticCurveTo(0, 0.5, -0.7, 0.2);
  slShape.closePath();

  const slMat = stdMat(0xf97316, { style, opacity: 0.2 });
  const sl = new THREE.Mesh(
    new THREE.ShapeGeometry(slShape),
    slMat
  );
  sl.position.z = 0;
  group.add(sl);

  // Solid region (bottom)
  const solidShape = new THREE.Shape();
  solidShape.moveTo(-0.7, -0.3);
  solidShape.quadraticCurveTo(0, -0.1, 0.7, -0.3);
  solidShape.lineTo(0.7, 0);
  solidShape.quadraticCurveTo(0, 0.25, -0.7, 0);
  solidShape.closePath();

  const solidMat = stdMat(0x3b82f6, { style, opacity: 0.2 });
  const solid = new THREE.Mesh(
    new THREE.ShapeGeometry(solidShape),
    solidMat
  );
  solid.position.z = 0;
  group.add(solid);

  // Phase boundaries (liquidus + solidus)
  const lineMat = new THREE.LineBasicMaterial({ color: 0x38bdf8 });
  const liqPts = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const x = -0.7 + t * 1.4;
    const y = 0.2 + 0.2 * Math.sin(t * Math.PI);
    liqPts.push(V3(x, y, 0));
  }
  const liqGeo = new THREE.BufferGeometry();
  const liqPos = new Float32Array(liqPts.length * 3);
  for (let i = 0; i < liqPts.length; i++) {
    liqPos[i * 3] = liqPts[i].x;
    liqPos[i * 3 + 1] = liqPts[i].y;
    liqPos[i * 3 + 2] = liqPts[i].z;
  }
  liqGeo.setAttribute('position', new THREE.BufferAttribute(liqPos, 3));
  group.add(new THREE.Line(liqGeo, lineMat));

  // Eutectic point
  const eutMat = stdMat(0xef4444, { style, emissive: 0xef4444 });
  const eut = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), eutMat);
  eut.position.set(0, -0.05, 0);
  group.add(eut);

  return {
    group,
    targets: {
      device_body: { objects: [] },
      terminals: { objects: [eut] },
    },
    tick() {},
  };
}

function buildDislocation({ THREE, style, params, quality }) {
  const group = new THREE.Group();

  // Edge dislocation: atomic planes
  const planeMat = stdMat(0x60a5fa, { style, opacity: 0.4 });

  // Perfect crystal planes (left side)
  for (let i = -3; i <= 5; i++) {
    const plane = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 0.01, 0.6),
      planeMat
    );
    plane.position.set(-0.5 + (i + 3) * 0.1, i * 0.1, 0);
    group.add(plane);
  }

  // Extra half-plane (dislocation line)
  const extraMat = stdMat(0xef4444, { style, emissive: 0xef4444 });
  const extra = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.01, 0.6),
    extraMat
  );
  extra.position.set(0.2, 0, 0);
  group.add(extra);

  // Dislocation core
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.03, 8, 8),
    stdMat(0xf97316, { style, emissive: 0xf97316 })
  );
  core.position.set(0.4, 0, 0);
  group.add(core);

  // Burger's circuit
  const bvMat = stdMat(0x22c55e, { style, emissive: 0x22c55e });
  const circuitPts = [
    V3(-0.5, 0.4, 0.3), V3(0.5, 0.4, 0.3), V3(0.5, -0.1, 0.3),
    V3(0.2, -0.1, 0.3), V3(0.2, -0.4, 0.3), V3(-0.5, -0.4, 0.3), V3(-0.5, 0.4, 0.3),
  ];
  const circFlow = makeFlow(
    new THREE.CatmullRomCurve3(circuitPts),
    { count: 8, color: 0x22c55e, size: 0.04, rate: 0.2 }
  );
  group.add(circFlow.object);

  // Slip plane indicator
  const slip = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.005, 0.6),
    stdMat(0x94a3b8, { style, opacity: 0.3 })
  );
  slip.position.set(0, -0.15, 0);
  group.add(slip);

  return {
    group,
    targets: {
      device_body: { objects: [] },
      terminals: { objects: [core] },
      signal_flow: { flow: circFlow },
    },
    tick() {},
  };
}

function buildComposite({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const seg = quality === 'low' ? 6 : 12;

  // Matrix material (transparent block)
  const matrixMat = stdMat(0x3b82f6, { style, opacity: 0.15 });
  const matrix = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.8, 0.8),
    matrixMat
  );
  group.add(matrix);

  // Fiber reinforcements
  const fiberMat = stdMat(0x9ca3af, { style, emissive: 0x6b7280 });
  const fiberPositions = [];
  for (let x = -0.4; x <= 0.4; x += 0.3) {
    for (let z = -0.25; z <= 0.25; z += 0.25) {
      const fiber = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 1.0, 6),
        fiberMat
      );
      fiber.position.set(x, 0, z);
      fiber.rotation.y = 0.1;
      group.add(fiber);
      fiberPositions.push(fiber);
    }
  }

  // Interface region
  const ifaceMat = stdMat(0x22c55e, { style, opacity: 0.2 });
  for (const fp of fiberPositions) {
    const iface = new THREE.Mesh(
      new THREE.TorusGeometry(0.035, 0.008, 6, seg),
      ifaceMat
    );
    iface.position.copy(fp.position);
    iface.rotation.x = Math.PI / 2;
    group.add(iface);
  }

  // Load direction indicator
  const loadMat = stdMat(0xef4444, { style, emissive: 0xef4444 });
  for (let side of [-1, 1]) {
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.08, 6), loadMat);
    arrow.position.set(side * 0.75, 0, 0);
    arrow.rotation.z = side * Math.PI / 2;
    group.add(arrow);
  }

  // Stress flow through fibers
  const stressPts = [V3(-0.6, 0, 0), V3(-0.2, 0, 0), V3(0.2, 0, 0), V3(0.6, 0, 0)];
  const stressFlow = makeFlow(
    new THREE.CatmullRomCurve3(stressPts),
    { count: 8, color: COLORS.electron, size: 0.04, rate: 0.2 }
  );
  group.add(stressFlow.object);

  return {
    group,
    targets: {
      device_body: { objects: [matrix] },
      terminals: { objects: [] },
      signal_flow: { flow: stressFlow },
    },
    tick() {},
  };
}

function buildGrainStructure({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const seg = quality === 'low' ? 8 : 12;

  // Multiple grains (irregular polyhedra approximated by spheres/boxes)
  const grainColors = [0x60a5fa, 0x3b82f6, 0x2563eb, 0x1d4ed8, 0x7c3aed, 0x6d28d9];

  const grainData = [
    { size: [0.5, 0.3, 0.4], pos: [-0.3, 0.1, 0] },
    { size: [0.4, 0.5, 0.3], pos: [0.35, -0.1, 0] },
    { size: [0.3, 0.3, 0.5], pos: [0, 0.3, 0.15] },
    { size: [0.35, 0.4, 0.3], pos: [-0.1, -0.25, -0.1] },
    { size: [0.3, 0.35, 0.35], pos: [0.3, 0.2, -0.15] },
    { size: [0.4, 0.3, 0.4], pos: [-0.35, -0.15, 0.15] },
  ];

  for (let i = 0; i < grainData.length; i++) {
    const g = grainData[i];
    const grain = new THREE.Mesh(
      new THREE.BoxGeometry(...g.size),
      stdMat(grainColors[i], { style, opacity: 0.5, emissive: grainColors[i] })
    );
    grain.position.set(...g.pos);
    grain.rotation.set(Math.random() * 0.3, Math.random() * 0.3, Math.random() * 0.3);
    group.add(grain);
  }

  // Grain boundaries
  const gbMat = stdMat(0x94a3b8, { style, opacity: 0.4 });
  const gbLines = [
    [[-0.05, 0.15, 0], [0.15, 0.05, 0]],
    [[0.1, -0.15, 0], [-0.05, -0.1, 0]],
    [[0, 0.2, 0.1], [0.2, 0.15, 0]],
    [[-0.15, -0.1, 0.1], [-0.25, 0, 0.1]],
  ];
  for (const [a, b] of gbLines) {
    const wire = makeWire(V3(...a), V3(...b), { color: 0x94a3b8, radius: 0.008 });
    group.add(wire);
  }

  return {
    group,
    targets: {
      device_body: { objects: [] },
      terminals: { objects: [] },
    },
    tick() {},
  };
}

export function build({ THREE, style, params, quality, template }) {
  const type = template || 'crystal_lattice';
  switch (type) {
    case 'crystal_lattice': return buildCrystalLattice({ THREE, style, params, quality });
    case 'stress_strain': return buildStressStrain({ THREE, style, params, quality });
    case 'phase_diagram': return buildPhaseDiagram({ THREE, style, params, quality });
    case 'dislocation': return buildDislocation({ THREE, style, params, quality });
    case 'grain_structure': return buildGrainStructure({ THREE, style, params, quality });
    case 'composite': return buildComposite({ THREE, style, params, quality });
    default: return buildCrystalLattice({ THREE, style, params, quality });
  }
}
