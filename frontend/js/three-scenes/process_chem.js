// Chemistry / Process Engineering scene templates.
// params: { type: string, showLabels: bool }

import { V3, COLORS, stdMat, makeFlow, makeWire } from './common.js';
const PI = Math.PI;

function buildDistillationColumn({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const seg = quality === 'low' ? 10 : 20;
  const realistic = style === 'realistic';
  const segH = realistic ? 24 : seg;

  // Column shell (transparent to show internals)
  const shell = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.6, 2.4, segH, 1, true),
    stdMat(0x64748b, { style, opacity: realistic ? 0.15 : 0.25 })
  );
  shell.rotation.x = PI / 2;
  group.add(shell);

  // Tray stages
  const trayMat = stdMat(0x9ca3af, { style, metalness: realistic ? 0.6 : 0.05 });
  for (let i = 0; i < 6; i++) {
    const y = -1.0 + i * 0.4;
    const tray = new THREE.Mesh(
      new THREE.RingGeometry(0.1, 0.55, segH / 2),
      trayMat
    );
    tray.position.z = y;
    tray.rotation.x = -PI / 2;
    group.add(tray);

    // Downcomer
    const down = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.3, 0.02),
      stdMat(0x64748b, { style })
    );
    down.position.set(0.3, 0, y - 0.15);
    group.add(down);
  }

  // Reboiler (bottom)
  const reboiler = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.7, 0.3, segH),
    stdMat(0xdc2626, { style, emissive: 0xdc2626 })
  );
  reboiler.position.z = -1.35;
  reboiler.rotation.x = PI / 2;
  group.add(reboiler);

  // Condenser (top)
  const cond = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 0.65, 0.2, segH),
    stdMat(0x3b82f6, { style, emissive: 0x3b82f6 })
  );
  cond.position.z = 1.3;
  cond.rotation.x = PI / 2;
  group.add(cond);

  // Reflux drum
  const reflux = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, segH / 2, segH / 2),
    stdMat(0x22c55e, { style, emissive: 0x22c55e })
  );
  reflux.position.set(0.3, 0, 1.5);
  group.add(reflux);

  // Vapor flow
  const vapPts = [];
  for (let i = 0; i <= 8; i++) vapPts.push(V3(0, 0, -1.2 + i * 0.3));
  const vapFlow = makeFlow(new THREE.CatmullRomCurve3(vapPts),
    { count: 12, color: 0xf97316, size: 0.05, rate: 0.2 });
  group.add(vapFlow.object);

  return {
    group, targets: { device_body: { objects: [shell] }, terminals: { objects: [reboiler, cond] }, current_flow: { flow: vapFlow } }, tick() {},
  };
}

function buildReactor({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const seg = quality === 'low' ? 12 : 24;
  const realistic = style === 'realistic';

  // CSTR vessel
  const vessel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 0.8, 1.2, seg),
    stdMat(0x64748b, { style, opacity: realistic ? 0.2 : 0.3 })
  );
  vessel.rotation.x = PI / 2;
  group.add(vessel);

  // Agitator shaft
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 1.0, 6),
    stdMat(0x9ca3af, { style, metalness: realistic ? 0.8 : 0.05 })
  );
  shaft.position.z = 0;
  shaft.rotation.x = PI / 2;
  group.add(shaft);

  // Impeller blades
  const bladeMat = stdMat(0x9ca3af, { style, metalness: realistic ? 0.7 : 0.05 });
  const impeller = new THREE.Group();
  impeller.add(shaft);
  for (let i = 0; i < 6; i++) {
    const a = (i * PI) / 3;
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.04), bladeMat);
    b.position.set(Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3);
    b.rotation.y = -a;
    impeller.add(b);
  }
  group.add(impeller);

  // Heating jacket
  const jacket = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 0.9, 1.3, seg, 1, true),
    stdMat(0xef4444, { style, opacity: 0.1, emissive: 0xef4444 })
  );
  jacket.rotation.x = PI / 2;
  group.add(jacket);

  // Inlet/outlet nozzles
  const nozMat = stdMat(0x4a5568, { style });
  const inNoz = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.2, 8), nozMat);
  inNoz.position.set(0.3, 0, 0.7);
  inNoz.rotation.x = PI / 2;
  const outNoz = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.2, 8), nozMat);
  outNoz.position.set(-0.3, 0, -0.7);
  outNoz.rotation.x = PI / 2;
  group.add(inNoz, outNoz);

  let ang = 0;
  return {
    group,
    targets: { device_body: { objects: [vessel] }, terminals: { objects: [inNoz, outNoz] } },
    tick(dt) { ang += dt * 2; impeller.rotation.z = ang; },
  };
}

function buildCrystallizer({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const seg = quality === 'low' ? 10 : 20;

  // Vessel
  const vessel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.5, 1.0, seg, 1, true),
    stdMat(0x64748b, { style, opacity: 0.25 })
  );
  vessel.rotation.x = PI / 2;
  group.add(vessel);

  // Crystal growth (random small box crystals)
  const cryMat = stdMat(0x60a5fa, { style, opacity: 0.7, emissive: 0x3b82f6 });
  for (let i = 0; i < 20; i++) {
    const c = new THREE.Mesh(
      new THREE.BoxGeometry(0.03 + Math.random() * 0.06, 0.03 + Math.random() * 0.06, 0.03 + Math.random() * 0.06),
      cryMat
    );
    const angle = Math.random() * PI * 2;
    const r = Math.random() * 0.3;
    c.position.set(Math.cos(angle) * r, Math.sin(angle) * r, -0.3 + Math.random() * 0.6);
    group.add(c);
  }

  // Cone bottom
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.5, 0.3, seg),
    stdMat(0x4a5568, { style })
  );
  cone.position.z = 0.65;
  cone.rotation.x = PI / 2;
  group.add(cone);

  return {
    group,
    targets: { device_body: { objects: [vessel] }, terminals: { objects: [] } },
    tick() {},
  };
}

function buildEvaporator({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const seg = quality === 'low' ? 10 : 20;

  // Calandria (heating chamber)
  const calandria = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 0.8, 0.6, seg),
    stdMat(0x4a5568, { style, opacity: 0.3 })
  );
  calandria.rotation.x = PI / 2;
  group.add(calandria);

  // Tubes inside
  for (let i = -2; i <= 2; i++) {
    for (let j = -2; j <= 2; j++) {
      if (i*i + j*j > 4) continue;
      const tube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.6, 8),
        stdMat(0x9ca3af, { style })
      );
      tube.position.set(i * 0.12, j * 0.12, 0);
      tube.rotation.x = PI / 2;
      group.add(tube);
    }
  }

  // Vapor head
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.6, seg, seg, 0, PI * 2, 0, PI / 3),
    stdMat(0x64748b, { style, opacity: 0.2 })
  );
  head.position.z = 0.5;
  head.rotation.x = PI / 2;
  group.add(head);

  // Vapor flow
  const vapFlow = makeFlow(
    new THREE.CatmullRomCurve3([V3(0, 0, 0.7), V3(0.05, 0, 0.9), V3(0, 0, 1.1)]),
    { count: 6, color: 0x60a5fa, size: 0.05, rate: 0.25 }
  );
  group.add(vapFlow.object);

  return {
    group,
    targets: { device_body: { objects: [calandria] }, terminals: { objects: [] }, signal_flow: { flow: vapFlow } },
    tick() {},
  };
}

function buildCentrifuge({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const seg = quality === 'low' ? 10 : 20;

  // Bowl
  const bowl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.5, 0.8, seg),
    stdMat(0x9ca3af, { style, metalness: 0.5 })
  );
  bowl.rotation.x = PI / 2;
  const bowlGrp = new THREE.Group();
  bowlGrp.add(bowl);

  // Feed pipe
  const feed = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.6, 6),
    stdMat(0x4a5568, { style })
  );
  feed.position.set(0, 0, 0.5);
  feed.rotation.x = PI / 2;
  bowlGrp.add(feed);

  // Liquid ring
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.45, 0.02, 8, seg),
    stdMat(0x3b82f6, { style, opacity: 0.3, emissive: 0x3b82f6 })
  );
  ring.position.z = 0;
  ring.rotation.x = PI / 2;
  bowlGrp.add(ring);

  group.add(bowlGrp);

  // Casing
  const casing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.7, 0.9, seg, 1, true),
    stdMat(0x4a5568, { style, opacity: 0.15 })
  );
  casing.rotation.x = PI / 2;
  group.add(casing);

  let ang = 0;
  return {
    group,
    targets: { device_body: { objects: [casing] }, terminals: { objects: [] } },
    tick(dt) { ang += dt * 3; bowlGrp.rotation.z = ang; },
  };
}

function buildFermenter({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const seg = quality === 'low' ? 10 : 20;

  // Main vessel
  const vessel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.8, 1.2, seg, 1, true),
    stdMat(0x22c55e, { style, opacity: 0.12, emissive: 0x22c55e })
  );
  vessel.rotation.x = PI / 2;
  group.add(vessel);

  // Liquid level
  const liquid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.58, 0.78, 0.6, seg, 1, true),
    stdMat(0x22d3ee, { style, opacity: 0.3 })
  );
  liquid.position.z = 0.25;
  liquid.rotation.x = PI / 2;
  group.add(liquid);

  // Bubbles (CO2)
  const bubbleMat = stdMat(0xffffff, { style, opacity: 0.3 });
  for (let i = 0; i < 15; i++) {
    const b = new THREE.Mesh(
      new THREE.SphereGeometry(0.015 + Math.random() * 0.025, 6, 6),
      bubbleMat
    );
    const a = Math.random() * PI * 2;
    const r = Math.random() * 0.25;
    b.position.set(Math.cos(a) * r, Math.sin(a) * r, -0.2 + Math.random() * 0.5);
    group.add(b);
    b.userData.riseSpeed = 0.2 + Math.random() * 0.3;
    b.userData.offset = Math.random() * 10;
  }

  // Sparger (bottom)
  const sparger = new THREE.Mesh(
    new THREE.TorusGeometry(0.15, 0.02, 6, seg),
    stdMat(0x9ca3af, { style })
  );
  sparger.position.z = -0.6;
  sparger.rotation.x = PI / 2;
  group.add(sparger);

  return {
    group,
    targets: { device_body: { objects: [vessel] }, terminals: { objects: [sparger] } },
    tick(dt, t) {
      // Animate bubbles
      group.children.forEach(c => {
        if (c.userData.riseSpeed) {
          c.position.z += dt * c.userData.riseSpeed * 0.15;
          if (c.position.z > 0.55) c.position.z = -0.55;
          c.position.x += Math.sin(t * 2 + c.userData.offset) * dt * 0.02;
        }
      });
    },
  };
}

export function build({ THREE, style, params, quality, template }) {
  const type = template || 'distillation_column';
  switch (type) {
    case 'distillation_column': return buildDistillationColumn({ THREE, style, params, quality });
    case 'chemical_reactor': return buildReactor({ THREE, style, params, quality });
    case 'crystallizer': return buildCrystallizer({ THREE, style, params, quality });
    case 'evaporator': return buildEvaporator({ THREE, style, params, quality });
    case 'centrifuge': return buildCentrifuge({ THREE, style, params, quality });
    case 'fermenter': return buildFermenter({ THREE, style, params, quality });
    default: return buildDistillationColumn({ THREE, style, params, quality });
  }
}
