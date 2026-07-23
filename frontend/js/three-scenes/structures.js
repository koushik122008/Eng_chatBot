// Structures & Mechanical Engineering scene templates.
// params: { type: string, showLabels: bool }
// 3D models for beams, trusses, columns, torsion, stress, retaining walls.

import { V3, COLORS, stdMat, makeFlow, makeWire } from './common.js';


function buildBeamBending({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const seg = quality === 'low' ? 10 : 20;
  let loadApplied = true;

  // Simply supported beam
  const beamMat = stdMat(0x3b82f6, { style, emissive: 0x2563eb });
  const beam = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 0.12, 0.3),
    beamMat
  );
  beam.userData.tooltip = `Simply supported beam &bull; Spans between two supports &bull; Max bending moment at center &bull; M<sub>max</sub> = PL/4 for point load`;
  beam.position.y = 0.6;
  group.add(beam);

  // Supports
  const supMat = stdMat(0x4a5568, { style });
  const supL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.3), supMat);
  supL.userData.tooltip = `Roller support &bull; Restrains vertical movement &bull; Allows horizontal expansion &bull; Single reaction force (R<sub>y</sub>)`;
  supL.position.set(-1.15, 0.15, 0);
  const supR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.3), supMat);
  supR.userData.tooltip = `Pinned support &bull; Restrains vertical and horizontal movement &bull; Two reaction forces (R<sub>x</sub>, R<sub>y</sub>)`;
  supR.position.set(1.15, 0.15, 0);
  group.add(supL, supR);

  // Pinned support (triangle)
  const pin = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.12, 3), supMat);
  pin.userData.tooltip = `Pinned base &bull; Triangular marker &bull; No moment transfer`;
  pin.position.set(-1.15, 0, 0);
  pin.rotation.z = Math.PI;
  group.add(pin);

  // Load (downward arrow)
  const loadMat = stdMat(0xef4444, { style, emissive: 0xef4444 });
  const loadPoint = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), loadMat);
  loadPoint.userData.tooltip = () => `Point load &bull; P &asymp; 10 kN &bull; ${loadApplied ? 'Applied' : 'Removed'} &bull; Click to toggle`;
  loadPoint.position.y = 0.72;
  group.add(loadPoint);

  // Loading arrow
  const arrowShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.4, 4), loadMat);
  arrowShaft.position.set(0, 0.92, 0);
  group.add(arrowShaft);
  const arrowHead = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.08, 6), loadMat);
  arrowHead.position.set(0, 0.72, 0);
  group.add(arrowHead);

  // Deflection curve (flow)
  const defPts = [];
  for (let i = 0; i <= 16; i++) {
    const t = (i / 16) * 2 - 1;
    const def = loadApplied ? -0.12 * Math.cos(t * Math.PI / 2) : 0;
    defPts.push(V3(t * 1.15, 0.6 + def, 0));
  }
  const defFlow = makeFlow(
    new THREE.CatmullRomCurve3(defPts),
    { count: 12, color: 0x60a5fa, size: 0.04, rate: 0.2, tooltip: () => `Deflection curve &bull; ${loadApplied ? 'P = 10 kN' : 'No load'} &bull; &delta;<sub>max</sub> = PL/4EI &bull; M<sub>max</sub> = PL/4` }
  );
  group.add(defFlow.object);

  const refresh = () => {
    defFlow.object.visible = loadApplied;
    defFlow.active = loadApplied;
    arrowShaft.visible = loadApplied;
    arrowHead.visible = loadApplied;
  };

  const onClick = () => {
    loadApplied = !loadApplied;
    refresh();
    if (window.gsap) {
      window.gsap.fromTo(loadPoint.scale, { x: 1.3, y: 1.3, z: 1.3 },
        { x: 1, y: 1, z: 1, duration: 0.3, ease: 'back.out(3)' });
    }
  };

  return {
    group,
    targets: {
      device_body: { objects: [beam] },
      terminals: { objects: [supL, supR, loadPoint] },
      signal_flow: { flow: defFlow },
    },
    tick() {},
    onClick,
  };
}

function buildCantileverBeam({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  let loadApplied = true;

  // Cantilever beam
  const beamMat = stdMat(0x3b82f6, { style, emissive: 0x2563eb });
  const beam = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, 0.25), beamMat);
  beam.userData.tooltip = `Cantilever beam &bull; Fixed at one end &bull; Max deflection at free end &bull; &delta;<sub>max</sub> = PL&sup3;/(3EI)`;
  beam.position.set(0, 0.55, 0);
  group.add(beam);

  // Fixed support
  const wall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.0, 0.8), stdMat(0x64748b, { style }));
  wall.userData.tooltip = `Fixed support (wall) &bull; Zero rotation &bull; Zero displacement &bull; Three reactions: M, R<sub>x</sub>, R<sub>y</sub>`;
  wall.position.set(-1.4, 0.1, 0);
  group.add(wall);

  // Cross-hatching
  for (let i = -2; i <= 2; i++) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.4), stdMat(0x475569, { style }));
    line.position.set(-1.4, 0.1 + i * 0.12, 0);
    group.add(line);
  }

  // End load
  const loadMat = stdMat(0xef4444, { style, emissive: 0xef4444 });
  const load = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), loadMat);
  load.position.set(1.25, 0.55, 0);
  load.userData.tooltip = () => `Point load &bull; P &asymp; 5 kN &bull; ${loadApplied ? 'Applied' : 'Removed'} &bull; Click to toggle`;
  group.add(load);

  // Load arrow
  const arr = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.3, 4), loadMat);
  arr.position.set(1.25, 0.8, 0);
  const arrHead = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.06, 6), loadMat);
  arrHead.position.set(1.25, 0.65, 0);
  group.add(arr, arrHead);

  // Deflection
  const defPts = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const def = loadApplied ? -0.15 * t * t : 0;
    defPts.push(V3(-1.25 + t * 2.5, 0.55 + def, 0));
  }
  const defFlow = makeFlow(
    new THREE.CatmullRomCurve3(defPts),
    { count: 10, color: 0x60a5fa, size: 0.04, rate: 0.2, tooltip: () => `Cantilever deflection &bull; ${loadApplied ? 'P = 5 kN' : 'No load'} &bull; &delta;<sub>max</sub> = PL&sup3;/3EI &bull; M<sub>max</sub> = PL` }
  );
  group.add(defFlow.object);

  const onClick = () => {
    loadApplied = !loadApplied;
    arr.visible = loadApplied;
    arrHead.visible = loadApplied;
    defFlow.object.visible = loadApplied;
    defFlow.active = loadApplied;
  };

  return {
    group,
    targets: {
      device_body: { objects: [beam, wall] },
      terminals: { objects: [load] },
      signal_flow: { flow: defFlow },
    },
    tick() {},
    onClick,
  };
}

function buildTruss({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  let loadApplied = true;
  const trussMat = stdMat(0x9ca3af, { style, emissive: 0x6b7280 });

  const nodes = [];
  for (let i = 0; i <= 6; i++) {
    const x = -1.5 + i * 0.5;
    nodes.push(V3(x, 0.6, 0));
    nodes.push(V3(x, 1.0, 0));
  }

  // Members (wires between nodes)
  const members = [];
  const memberMeshes = [];
  for (let i = 0; i < 6; i++) members.push([i * 2, (i + 1) * 2]);
  for (let i = 0; i < 6; i++) members.push([i * 2 + 1, (i + 1) * 2 + 1]);
  for (let i = 0; i <= 6; i++) members.push([i * 2, i * 2 + 1]);
  for (let i = 0; i < 6; i++) {
    if (i % 2 === 0) members.push([i * 2, (i + 1) * 2 + 1]);
    else members.push([i * 2 + 1, (i + 1) * 2]);
  }

  for (const [a, b] of members) {
    const wire = makeWire(nodes[a], nodes[b], { color: 0x9ca3af, radius: 0.015 });
    wire.userData.tooltip = () => `Truss member &bull; ${loadApplied ? 'Under load' : 'No load'} &bull; Axial force: tension/compression`;
    group.add(wire);
    memberMeshes.push(wire);
  }

  // Joints
  for (const node of nodes) {
    const joint = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), trussMat);
    joint.position.copy(node);
    group.add(joint);
  }

  // Supports
  const supMat = stdMat(0x4a5568, { style });
  const supL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.1), supMat);
  supL.position.set(-1.5, 0, 0);
  const supR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.1), supMat);
  supR.position.set(1.5, 0, 0);
  group.add(supL, supR);

  // Loads on top
  const loadMeshes = [];
  for (let i = 1; i <= 5; i++) {
    const load = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6),
      stdMat(0xef4444, { style, emissive: 0xef4444 }));
    load.position.set(-1.0 + (i - 1) * 0.5, 1.05, 0);
    load.userData.tooltip = () => `Load &bull; ${loadApplied ? 'P = 10 kN' : 'Removed'} &bull; Click to toggle`;
    group.add(load);
    loadMeshes.push(load);
  }

  const onClick = () => {
    loadApplied = !loadApplied;
    loadMeshes.forEach((l) => {
      l.material.emissiveIntensity = loadApplied ? 1 : 0;
      l.material.color.setHex(loadApplied ? 0xef4444 : 0x6b7280);
    });
    memberMeshes.forEach((m) => {
      m.material.color.setHex(loadApplied ? 0x9ca3af : 0x4a5568);
    });
  };

  return {
    group,
    targets: {
      device_body: { objects: [] },
      terminals: { objects: [supL, supR] },
    },
    tick() {},
    onClick,
  };
}

function buildColumnBuckling({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  let loadApplied = true;

  // Column
  const colMat = stdMat(0x3b82f6, { style, emissive: 0x2563eb });
  const column = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.8, 0.15), colMat);
  column.userData.tooltip = `Column &bull; Euler buckling load P<sub>cr</sub> = &pi;&sup2;EI/(KL)&sup2; &bull; Slenderness ratio &lambda; = L/r`;
  column.position.y = 0.9;
  group.add(column);

  // Base
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.5), stdMat(0x64748b, { style }));
  base.userData.tooltip = `Base plate &bull; Fixed support &bull; Distributes load to foundation`;
  group.add(base);

  // Top load plate
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.3), stdMat(0x64748b, { style }));
  plate.userData.tooltip = () => `Load plate &bull; Transmits axial compressive load &bull; P &asymp; ${loadApplied ? '50' : '0'} kN &bull; Click to toggle`;
  plate.position.y = 1.8;
  group.add(plate);

  // Loading arrows
  const loadMat = stdMat(0xef4444, { style, emissive: 0xef4444 });
  const loadArrows = [];
  for (let i = 0; i < 3; i++) {
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.08, 6), loadMat);
    arrow.position.set(-0.12 + i * 0.12, 1.95 + i * 0.08, 0);
    arrow.rotation.z = Math.PI;
    group.add(arrow);
    loadArrows.push(arrow);
  }

  // Buckled shape (flow)
  const buckPts = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const buck = loadApplied ? 0.04 * Math.sin(t * Math.PI) : 0;
    buckPts.push(V3(buck, t * 1.8, 0));
  }
  const buckFlow = makeFlow(
    new THREE.CatmullRomCurve3(buckPts),
    { count: 10, color: 0xf97316, size: 0.04, rate: 0.15, tooltip: () => `Buckling mode &bull; ${loadApplied ? 'P = 50 kN' : 'No load'} &bull; P<sub>cr</sub> = &pi;&sup2;EI/(KL)&sup2; &bull; &lambda; = L/r &asymp; 80` }
  );
  group.add(buckFlow.object);

  const onClick = () => {
    loadApplied = !loadApplied;
    loadArrows.forEach((a) => { a.visible = loadApplied; });
    buckFlow.active = loadApplied;
  };

  return {
    group,
    targets: {
      device_body: { objects: [column] },
      terminals: { objects: [base, plate] },
      signal_flow: { flow: buckFlow },
    },
    tick() {},
    onClick,
  };
}

function buildTorsionShaft({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const seg = quality === 'low' ? 10 : 20;
  let torqueApplied = true;

  // Shaft
  const shaftMat = stdMat(0x9ca3af, { style, emissive: 0x6b7280 });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 2.0, seg), shaftMat);
  shaft.userData.tooltip = `Shaft &bull; Transmits torque T &bull; Shear stress &tau; = Tr/J &bull; Angle of twist &phi; = TL/GJ`;
  shaft.rotation.x = Math.PI / 2;
  group.add(shaft);

  // Fixed end (left)
  const fixMat = stdMat(0x4a5568, { style });
  const fixed = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.3), fixMat);
  fixed.userData.tooltip = `Fixed end &bull; Zero rotation &bull; Restrains torsion`;
  fixed.position.x = -1.1;
  group.add(fixed);

  // Torque wheel (right)
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.04, 8, seg), stdMat(0x64748b, { style }));
  wheel.userData.tooltip = () => `Torque wheel &bull; Applied torque T &asymp; ${torqueApplied ? '100' : '0'} N&sdot;m &bull; Causes shear deformation &bull; Click to toggle`;
  wheel.position.x = 1.1;
  wheel.rotation.y = Math.PI / 2;
  group.add(wheel);

  // Torque arrows
  const torqueMat = stdMat(0xef4444, { style, emissive: 0xef4444 });
  const torqueArrows = [];
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.06, 6), torqueMat);
    arrow.position.set(1.1 + Math.cos(angle) * 0.25, Math.sin(angle) * 0.25, 0);
    arrow.lookAt(1.1, 0, 0);
    group.add(arrow);
    torqueArrows.push(arrow);
  }

  // Shear stress lines
  const shearPts = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const angle = t * Math.PI * 2;
    shearPts.push(V3(-0.8 + t * 1.6, 0.12 * Math.sin(angle), 0.12 * Math.cos(angle)));
  }
  const shearFlow = makeFlow(
    new THREE.CatmullRomCurve3(shearPts),
    { count: 10, color: 0xf97316, size: 0.04, rate: 0.2, tooltip: () => `Shear stress &bull; ${torqueApplied ? 'T = 100 N&sdot;m' : 'No torque'} &bull; &tau;<sub>max</sub> = Tr/J &bull; &phi; = TL/GJ &bull; G = 80 GPa` }
  );
  group.add(shearFlow.object);

  let torAngle = 0;
  let running = true;

  const onClick = () => {
    torqueApplied = !torqueApplied;
    running = !running;
    torqueArrows.forEach((a) => { a.visible = torqueApplied; });
    shearFlow.active = torqueApplied;
  };

  return {
    group,
    targets: {
      device_body: { objects: [shaft] },
      terminals: { objects: [fixed, wheel] },
      signal_flow: { flow: shearFlow },
    },
    tick(dt) {
      if (running) {
        torAngle += dt * 0.5;
        wheel.rotation.x = torAngle * 0.3;
      }
    },
    onClick,
  };
}

function buildStressConcentration({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  let loadApplied = true;

  // Plate with hole
  const plateMat = stdMat(0x3b82f6, { style, emissive: 0x2563eb });
  const plate = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.06, 1.0), plateMat);
  plate.userData.tooltip = () => `Plate with circular hole &bull; Stress concentration factor K<sub>t</sub> &asymp; 3.0 &bull; ${loadApplied ? 'Under tension' : 'Relaxed'} &bull; Click to toggle`;
  plate.position.y = 0.5;
  group.add(plate);

  // Hole
  const hole = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.03, 8, 16),
    stdMat(0xef4444, { style, emissive: 0xef4444 }));
  hole.position.set(0, 0.5, 0);
  hole.rotation.x = Math.PI / 2;
  group.add(hole);

  // Tension arrows (left)
  const loadMat = stdMat(0xef4444, { style, emissive: 0xef4444 });
  const leftArrows = [];
  for (let i = -2; i <= 2; i++) {
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.06, 6), loadMat);
    arrow.position.set(-1.2, 0.5 + i * 0.15, 0);
    arrow.rotation.z = Math.PI / 2;
    group.add(arrow);
    leftArrows.push(arrow);
  }
  const rightArrows = [];
  for (let i = -2; i <= 2; i++) {
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.06, 6), loadMat);
    arrow.position.set(1.2, 0.5 + i * 0.15, 0);
    arrow.rotation.z = -Math.PI / 2;
    group.add(arrow);
    rightArrows.push(arrow);
  }

  // Stress flow lines
  const flowPts = [V3(-1.0, 0.5, 0.3), V3(-0.5, 0.5, 0.3), V3(-0.18, 0.5, 0.3), V3(0, 0.5, 0.3), V3(0.18, 0.5, 0.3), V3(0.5, 0.5, 0.3), V3(1.0, 0.5, 0.3)];
  const stressFlow = makeFlow(
    new THREE.CatmullRomCurve3(flowPts),
    { count: 8, color: 0xf97316, size: 0.05, rate: 0.2, tooltip: () => `Stress concentration &bull; ${loadApplied ? '&sigma;<sub>nom</sub> = 100 MPa' : 'Relaxed'} &bull; K<sub>t</sub> &asymp; 3.0 &bull; d/w = 0.3` }
  );
  group.add(stressFlow.object);

  const onClick = () => {
    loadApplied = !loadApplied;
    leftArrows.forEach((a) => { a.visible = loadApplied; });
    rightArrows.forEach((a) => { a.visible = loadApplied; });
    stressFlow.active = loadApplied;
    hole.material.emissiveIntensity = loadApplied ? 1 : 0.2;
  };

  return {
    group,
    targets: {
      device_body: { objects: [plate] },
      terminals: { objects: [hole] },
      signal_flow: { flow: stressFlow },
    },
    tick() {},
    onClick,
  };
}

function buildRetainingWall({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  let soilActive = true;

  // Wall stem
  const wallMat = stdMat(0x64748b, { style, emissive: 0x4a5568 });
  const stem = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.4, 1.2), wallMat);
  stem.position.set(0.1, 0.7, 0);
  group.add(stem);

  // Base slab
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.12, 1.2), stdMat(0x4a5568, { style }));
  base.position.set(-0.3, 0.06, 0);
  group.add(base);

  // Toe (front)
  const toe = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 1.2), stdMat(0x4a5568, { style }));
  toe.position.set(0.7, 0.05, 0);
  group.add(toe);

  // Backfill
  const soilMat = stdMat(0x92400e, { style, opacity: 0.5 });
  const backfill = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 1.2), soilMat);
  backfill.position.set(-0.6, 0.45, 0);
  backfill.userData.tooltip = () => `Backfill soil &bull; ${soilActive ? 'Active earth pressure' : 'No pressure'} &bull; Click to toggle`;
  group.add(backfill);

  // Drainage
  const drainMat = stdMat(0x9ca3af, { style, opacity: 0.3 });
  const drain = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 1.0), drainMat);
  drain.position.set(0.0, 0.4, 0);
  group.add(drain);

  // Lateral earth pressure arrows
  const pressMat = stdMat(0xef4444, { style, emissive: 0xef4444 });
  const pressArrows = [];
  for (let i = 0; i < 4; i++) {
    const y = 0.2 + i * 0.25;
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.08, 6), pressMat);
    arrow.position.set(-0.5, y, 0.3);
    arrow.rotation.z = Math.PI / 2;
    group.add(arrow);
    pressArrows.push(arrow);
  }

  const onClick = () => {
    soilActive = !soilActive;
    backfill.material.opacity = soilActive ? 0.5 : 0.15;
    pressArrows.forEach((a) => { a.visible = soilActive; });
  };

  return {
    group,
    targets: {
      device_body: { objects: [stem, base] },
      terminals: { objects: [] },
    },
    tick() {},
    onClick,
  };
}

function buildRCCBeam({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  let momentApplied = true;

  // Concrete beam
  const beamMat = stdMat(0x64748b, { style, opacity: momentApplied ? 0.6 : 0.4 });
  const beam = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.5, 0.5), beamMat);
  beam.userData.tooltip = () => `Reinforced concrete beam &bull; ${momentApplied ? 'Under bending' : 'No load'} &bull; Click to toggle`;
  beam.position.y = 0.25;
  group.add(beam);

  // Steel reinforcement bars
  const steelMat = stdMat(0xd97706, { style, emissive: 0xd97706 });
  for (let i = -1; i <= 1; i++) {
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.0, 6), steelMat);
    bar.position.set(0, 0.05, i * 0.15);
    bar.rotation.x = Math.PI / 2;
    group.add(bar);
  }
  for (let i = -1; i <= 1; i++) {
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.0, 6),
      stdMat(0xca8a04, { style, emissive: 0xca8a04 }));
    bar.position.set(0, 0.45, i * 0.1);
    bar.rotation.x = Math.PI / 2;
    group.add(bar);
  }

  // Stirrups
  for (let i = -4; i <= 4; i++) {
    const x = i * 0.2;
    const stirMat = stdMat(0xd97706, { style });
    const bottom = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.35), stirMat);
    bottom.position.set(x, 0.02, 0);
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.35), stirMat);
    top.position.set(x, 0.48, 0);
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.46, 0.01), stirMat);
    left.position.set(x, 0.25, -0.17);
    const right = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.46, 0.01), stirMat);
    right.position.set(x, 0.25, 0.17);
    group.add(bottom, top, left, right);
  }

  // Neutral axis indicator
  const na = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.005, 0.01),
    stdMat(0x3b82f6, { style, opacity: 0.7 }));
  na.position.y = 0.18;
  group.add(na);

  // Moment arrows
  const momMat = stdMat(0x22c55e, { style, emissive: 0x22c55e });
  const momArrows = [];
  for (let side of [-1, 1]) {
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.06, 6), momMat);
    arrow.position.set(side * 1.2, 0.25, 0);
    arrow.rotation.z = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    group.add(arrow);
    momArrows.push(arrow);
  }

  const onClick = () => {
    momentApplied = !momentApplied;
    beam.material.opacity = momentApplied ? 0.6 : 0.4;
    momArrows.forEach((a) => { a.visible = momentApplied; });
    beam.userData.tooltip = `Reinforced concrete beam &bull; ${momentApplied ? 'Under bending' : 'No load'}`;
  };

  return {
    group,
    targets: {
      device_body: { objects: [beam] },
      terminals: { objects: [] },
    },
    tick() {},
    onClick,
  };
}

export function build({ THREE, style, params, quality, template }) {
  const type = template || 'beam_bending';
  switch (type) {
    case 'beam_bending': return buildBeamBending({ THREE, style, params, quality });
    case 'cantilever_beam': return buildCantileverBeam({ THREE, style, params, quality });
    case 'truss': return buildTruss({ THREE, style, params, quality });
    case 'column_buckling': return buildColumnBuckling({ THREE, style, params, quality });
    case 'torsion_shaft': return buildTorsionShaft({ THREE, style, params, quality });
    case 'stress_concentration': return buildStressConcentration({ THREE, style, params, quality });
    case 'retaining_wall': return buildRetainingWall({ THREE, style, params, quality });
    case 'rcc_beam': return buildRCCBeam({ THREE, style, params, quality });
    default: return buildBeamBending({ THREE, style, params, quality });
  }
}
