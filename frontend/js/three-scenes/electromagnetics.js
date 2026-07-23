// Electromagnetics & Motors scene templates.
// params: { type: string, showLabels: bool }
// Builds interactive 3D models for electromagnetic devices.

import { V3, COLORS, stdMat, makeFlow, makeWire } from './common.js';


function buildSolenoid({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const seg = quality === 'low' ? 12 : 24;

  // Coil windings as a series of torus segments
  const coilMat = stdMat(0xd97706, { style, emissive: 0xd97706 }); // copper
  for (let i = -4; i <= 4; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.7, 0.08, 8, seg),
      coilMat
    );
    ring.position.z = i * 0.3;
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
  }

  // Core (ferromagnetic)
  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.4, 2.8, seg),
    stdMat(0x4a5568, { style, emissive: 0x2d3748 })
  );
  core.rotation.x = Math.PI / 2;
  group.add(core);

  // Magnetic field lines (flow)
  const fieldCurve = new THREE.CatmullRomCurve3([
    V3(0, 0.9, -1.2), V3(0, 1.3, 0), V3(0, 0.9, 1.2),
    V3(0, 0, 1.5), V3(0, -0.9, 1.2), V3(0, -1.3, 0),
    V3(0, -0.9, -1.2), V3(0, 0, -1.5), V3(0, 0.9, -1.2),
  ]);
  const fieldFlow = makeFlow(fieldCurve, {
    count: quality === 'low' ? 10 : 20, color: 0x60a5fa, size: 0.08, rate: 0.2,
  });
  group.add(fieldFlow.object);

  // Leads
  const lead1 = makeWire(V3(0.7, 0, 0.9), V3(1.2, 0, 2.0), { color: COLORS.metal });
  const lead2 = makeWire(V3(-0.7, 0, -0.9), V3(-1.2, 0, -2.0), { color: COLORS.metal });
  group.add(lead1, lead2);

  return {
    group,
    targets: {
      device_body: { objects: [core] },
      terminals: { objects: [lead1, lead2] },
      current_flow: { flow: fieldFlow },
    },
    tick() {},
  };
}

function buildElectromagnet({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const seg = quality === 'low' ? 10 : 20;

  // C-shaped core
  const coreMat = stdMat(0x4a5568, { style });
  const core1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.5, 0.5), coreMat);
  core1.position.set(-1.0, 0, 0);
  const core2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.5, 0.5), coreMat);
  core2.position.set(1.0, 0, 0);
  const core3 = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.5, 0.5), coreMat);
  core3.position.set(0, 1.0, 0);
  const core4 = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.5, 0.5), coreMat);
  core4.position.set(0, -1.0, 0);
  group.add(core1, core2, core3, core4);

  // Coil on left leg
  for (let i = -2; i <= 2; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.06, 8, seg),
      stdMat(0xd97706, { style, emissive: 0xd97706 })
    );
    ring.position.set(-1.0, i * 0.3, 0);
    ring.rotation.y = Math.PI / 2;
    group.add(ring);
  }

  // Air gap with field lines
  const gapFlow = makeFlow(
    new THREE.CatmullRomCurve3([V3(0.5, 0, 0.6), V3(0, 0, 0.9), V3(-0.5, 0, 0.6)]),
    { count: 6, color: 0x60a5fa, size: 0.08, rate: 0.3 }
  );
  group.add(gapFlow.object);

  return {
    group,
    targets: {
      device_body: { objects: [core1, core2, core3, core4] },
      terminals: { objects: [] },
      current_flow: { flow: gapFlow },
    },
    tick() {},
  };
}

function buildDCMotor({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const seg = quality === 'low' ? 10 : 22;

  // Stator (outer housing)
  const stator = new THREE.Mesh(
    new THREE.CylinderGeometry(1.8, 1.8, 2.0, seg),
    stdMat(0x1e293b, { style })
  );
  stator.rotation.x = Math.PI / 2;
  group.add(stator);

  // Permanent magnets (poles)
  const magMat = stdMat(0xdc2626, { style, emissive: 0xdc2626 });
  const magN = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.2, 0.4), magMat);
  magN.position.set(0, 0, 1.6);
  const magS = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.2, 0.4), stdMat(0x2563eb, { style, emissive: 0x2563eb }));
  magS.position.set(0, 0, -1.6);
  group.add(magN, magS);

  // Rotor (armature)
  const rotorGroup = new THREE.Group();
  const rotorMat = stdMat(0x9ca3af, { style });
  const armature = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 1.5, seg), rotorMat);
  armature.rotation.x = Math.PI / 2;
  rotorGroup.add(armature);

  // Windings on rotor
  const wMat = stdMat(0xd97706, { style, emissive: 0xd97706 });
  for (let i = 0; i < 3; i++) {
    const angle = (i * 2 * Math.PI) / 3;
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.8, 0.3), wMat);
    w.position.set(Math.cos(angle) * 0.7, 0, Math.sin(angle) * 0.7);
    rotorGroup.add(w);
  }

  rotorGroup.position.z = 0;
  group.add(rotorGroup);

  // Commutator segments
  const comMat = stdMat(0xd97706, { style });
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + Math.PI / 4;
    const segm = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.15, 0.1),
      comMat
    );
    segm.position.set(Math.cos(angle) * 0.4, 0, Math.sin(angle) * 0.4);
    segm.lookAt(0, 0, 0);
    rotorGroup.add(segm);
  }

  // Shaft
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 2.8, 8),
    stdMat(0x9ca3af, { style })
  );
  shaft.rotation.x = Math.PI / 2;
  group.add(shaft);

  // Brushes
  const brushMat = stdMat(0x374151, { style });
  const brush1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.2), brushMat);
  brush1.position.set(0.6, 0, 0);
  const brush2 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.2), brushMat);
  brush2.position.set(-0.6, 0, 0);
  group.add(brush1, brush2);

  let angle = 0;

  return {
    group,
    targets: {
      device_body: { objects: [stator] },
      terminals: { objects: [brush1, brush2] },
    },
    tick(dt) {
      angle += dt * 1.5;
      rotorGroup.rotation.z = angle;
    },
  };
}

function buildTransformer({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const seg = quality === 'low' ? 8 : 16;

  // Core (E-I laminated)
  const coreMat = stdMat(0x64748b, { style });
  const coreParts = [
    new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.4, 1.2), coreMat), // top
    new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.4, 1.2), coreMat), // bottom
    new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.6, 1.2), coreMat), // left leg
    new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.6, 1.2), coreMat), // right leg
    new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.8, 1.2), coreMat), // center leg
  ];
  coreParts[0].position.y = 1.0;
  coreParts[1].position.y = -1.0;
  coreParts[2].position.x = -1.0;
  coreParts[3].position.x = 1.0;
  coreParts.forEach(p => group.add(p));

  // Primary winding (left, thinner wire, more turns)
  const priMat = stdMat(0xd97706, { style, emissive: 0xd97706 });
  for (let i = -4; i <= 4; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.05, 6, seg),
      priMat
    );
    ring.position.set(-0.65, i * 0.15, 0);
    ring.rotation.y = Math.PI / 2;
    group.add(ring);
  }

  // Secondary winding (right, thicker wire, fewer turns)
  const secMat = stdMat(0xca8a04, { style, emissive: 0xca8a04 });
  for (let i = -3; i <= 3; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.65, 0.08, 6, seg),
      secMat
    );
    ring.position.set(0.65, i * 0.2, 0);
    ring.rotation.y = Math.PI / 2;
    group.add(ring);
  }

  // Flux path indicator
  const fluxFlow = makeFlow(
    new THREE.CatmullRomCurve3([
      V3(0, 1.1, 0.8), V3(0.8, 0.6, 0.8), V3(0.8, -0.6, 0.8),
      V3(0, -1.1, 0.8), V3(-0.8, -0.6, 0.8), V3(-0.8, 0.6, 0.8),
      V3(0, 1.1, 0.8),
    ]),
    { count: 12, color: 0x60a5fa, size: 0.07, rate: 0.15 }
  );
  group.add(fluxFlow.object);

  return {
    group,
    targets: {
      device_body: { objects: coreParts },
      terminals: { objects: [] },
      power_flow: { flow: fluxFlow },
    },
    tick() {},
  };
}

function buildStepperMotor({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const seg = quality === 'low' ? 10 : 20;

  // Stator with teeth
  const stator = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.6, 1.8, 12),
    stdMat(0x1e293b, { style })
  );
  stator.rotation.x = Math.PI / 2;
  group.add(stator);

  // Stator poles with windings
  const poleMat = stdMat(0x334155, { style });
  const windMat = stdMat(0xd97706, { style, emissive: 0xd97706 });
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    const pole = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.7, 0.3),
      poleMat
    );
    pole.position.set(Math.cos(angle) * 1.3, 0, Math.sin(angle) * 1.3);
    pole.lookAt(0, 0, 0);
    group.add(pole);

    // Coil around pole
    for (let j = -2; j <= 2; j++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.25, 0.04, 6, 8),
        windMat
      );
      ring.position.set(Math.cos(angle) * 1.3, j * 0.12, Math.sin(angle) * 1.3);
      ring.position.set(ring.position.x * 1.0, 0, ring.position.z * 1.0);
      ring.rotation.y = -angle;
      group.add(ring);
    }
  }

  // Rotor (permanent magnet)
  const rotor = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.7, 1.2, 12),
    stdMat(0x7c3aed, { style, emissive: 0x7c3aed })
  );
  rotor.rotation.x = Math.PI / 2;
  rotor.position.z = 0;
  group.add(rotor);

  // Rotor teeth
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    const tooth = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.3, 0.1),
      stdMat(0x9ca3af, { style })
    );
    tooth.position.set(Math.cos(angle) * 0.9, 0, Math.sin(angle) * 0.9);
    group.add(tooth);
  }

  // Shaft
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 2.6, 6),
    stdMat(0x9ca3af, { style })
  );
  shaft.rotation.x = Math.PI / 2;
  group.add(shaft);

  let stepAngle = 0;

  return {
    group,
    targets: {
      device_body: { objects: [stator] },
      terminals: { objects: [] },
    },
    tick(dt) {
      stepAngle += dt * 0.8;
      rotor.rotation.z = stepAngle;
    },
  };
}

function buildRelay({ THREE, style, params, quality }) {
  const group = new THREE.Group();

  // Electromagnet core
  const coreMat = stdMat(0x4a5568, { style });
  const core = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 0.6), coreMat);
  core.position.set(-0.6, -0.3, 0);
  group.add(core);

  // Coil
  for (let i = -3; i <= 3; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.35, 0.04, 6, 12),
      stdMat(0xd97706, { style, emissive: 0xd97706 })
    );
    ring.position.set(-0.6, -0.3 + i * 0.1, 0);
    ring.rotation.y = Math.PI / 2;
    group.add(ring);
  }

  // Armature (moving part)
  const armMat = stdMat(0x64748b, { style });
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.3), armMat);
  arm.position.set(0.2, 0.3, 0);
  group.add(arm);

  // Spring
  const springMat = stdMat(0x9ca3af, { style });
  for (let i = -4; i <= 4; i++) {
    const coil = new THREE.Mesh(
      new THREE.TorusGeometry(0.06, 0.015, 4, 8),
      springMat
    );
    coil.position.set(-0.2, 0.3 + i * 0.08, 0.25);
    coil.rotation.x = Math.PI / 2;
    group.add(coil);
  }

  // Contacts (NC and NO)
  const contactMat = stdMat(0x9ca3af, { style });
  const ncContact = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.2), contactMat);
  ncContact.position.set(0.8, 0.5, 0);
  const noContact = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.2), contactMat);
  noContact.position.set(0.8, -0.1, 0);
  group.add(ncContact, noContact);

  // Terminals
  const termMat = stdMat(0x9ca3af, { style });
  for (let i = -1; i <= 1; i++) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.08), termMat);
    t.position.set(-0.6, -0.7, i * 0.25);
    group.add(t);
  }

  return {
    group,
    targets: {
      device_body: { objects: [core] },
      terminals: { objects: [] },
    },
    tick() {},
  };
}

export function build({ THREE, style, params, quality, template }) {
  const type = template || 'solenoid';
  switch (type) {
    case 'solenoid': return buildSolenoid({ THREE, style, params, quality });
    case 'electromagnet': return buildElectromagnet({ THREE, style, params, quality });
    case 'dc_motor': return buildDCMotor({ THREE, style, params, quality });
    case 'stepper_motor': return buildStepperMotor({ THREE, style, params, quality });
    case 'transformer_core': return buildTransformer({ THREE, style, params, quality });
    case 'relay': return buildRelay({ THREE, style, params, quality });
    case 'inductor_core': return buildSolenoid({ THREE, style, params, quality }); // reuse
    case 'magnetic_circuit': return buildElectromagnet({ THREE, style, params, quality }); // reuse
    case 'generator_alternator': return buildDCMotor({ THREE, style, params, quality }); // reuse
    default: return buildSolenoid({ THREE, style, params, quality });
  }
}
