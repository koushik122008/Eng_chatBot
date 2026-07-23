// Manufacturing / Industrial scene templates.
// params: { type: string, showLabels: bool }

import { V3, COLORS, stdMat, makeFlow, makeWire } from './common.js';
const PI = Math.PI;

function buildCNCMill({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const seg = quality === 'low' ? 8 : 16;
  const realistic = style === 'realistic';

  // Machine base
  const baseMat = stdMat(0x4a5568, { style, metalness: realistic ? 0.6 : 0.05 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.15, 1.0), baseMat);
  base.position.y = -0.7;
  group.add(base);

  // Column
  const col = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.8, 0.4), baseMat);
  col.position.set(-0.6, -0.2, 0);
  group.add(col);

  // Spindle head (moving)
  const headGrp = new THREE.Group();
  const headMat = stdMat(0x9ca3af, { style, metalness: realistic ? 0.8 : 0.1 });
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.3), headMat);
  headGrp.add(head);

  // Spindle
  const spindle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.2, 8),
    stdMat(0xd97706, { style, metalness: 0.7 })
  );
  spindle.position.y = -0.2;
  headGrp.add(spindle);

  // End mill
  const endmill = new THREE.Mesh(
    new THREE.CylinderGeometry(0.01, 0.02, 0.1, 6),
    stdMat(0x9ca3af, { style, metalness: 0.9 })
  );
  endmill.position.y = -0.3;
  headGrp.add(endmill);

  headGrp.position.set(0.4, 0.2, 0);
  group.add(headGrp);

  // Table with workpiece
  const table = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, 0.6), headMat);
  table.position.set(0.4, -0.55, 0);
  group.add(table);

  // Workpiece
  const wp = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.2), stdMat(0x64748b, { style }));
  wp.position.set(0.45, -0.47, 0);
  group.add(wp);

  // Chips
  for (let i = 0; i < 8; i++) {
    const chip = new THREE.Mesh(
      new THREE.BoxGeometry(0.005 + Math.random() * 0.01, 0.002, 0.005 + Math.random() * 0.01),
      stdMat(0xd97706, { style })
    );
    chip.position.set(0.4 + Math.random() * 0.3, -0.35 + Math.random() * 0.1, (Math.random() - 0.5) * 0.3);
    chip.rotation.set(Math.random(), Math.random(), Math.random());
    group.add(chip);
  }

  let hPos = 0;
  return {
    group,
    targets: { device_body: { objects: [base] }, terminals: { objects: [] } },
    tick(dt) { hPos += dt * 0.3; headGrp.position.x = 0.4 + Math.sin(hPos) * 0.2; },
  };
}

function buildInjectionMold({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const realistic = style === 'realistic';

  // Fixed platen
  const platenMat = stdMat(0x4a5568, { style, metalness: realistic ? 0.6 : 0.05 });
  const fixed = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.6), platenMat);
  fixed.position.x = -0.5;
  group.add(fixed);

  // Moving platen
  const moving = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.6), platenMat);
  moving.position.x = 0.5;
  group.add(moving);

  // Mold cavity (detail)
  const cavMat = stdMat(0x9ca3af, { style, metalness: realistic ? 0.8 : 0.1 });
  const cavity = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.3), cavMat);
  cavity.position.set(-0.4, 0, 0);
  group.add(cavity);

  // Core
  const core = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.25), cavMat);
  core.position.set(0.4, 0, 0);
  group.add(core);

  // Injection nozzle
  const nozMat = stdMat(0xd97706, { style, metalness: 0.7 });
  const nozzle = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.1, 8), nozMat);
  nozzle.position.set(-0.6, 0.3, 0);
  nozzle.rotation.z = PI / 2;
  group.add(nozzle);

  // Tie bars
  for (let y of [-0.3, 0.3]) {
    for (let z of [-0.25, 0.25]) {
      const bar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 1.0, 6),
        stdMat(0x9ca3af, { style, metalness: 0.5 })
      );
      bar.position.set(0, y, z);
      bar.rotation.z = PI / 2;
      group.add(bar);
    }
  }

  return {
    group,
    targets: { device_body: { objects: [fixed, moving] }, terminals: { objects: [nozzle] } },
    tick() {},
  };
}

function buildConveyorBelt({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const realistic = style === 'realistic';

  // Belt surface
  const beltMat = stdMat(0x1e293b, { style });
  const belt = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.02, 0.3), beltMat);
  belt.position.y = -0.2;
  group.add(belt);

  // Rollers
  const rollMat = stdMat(0x9ca3af, { style, metalness: realistic ? 0.7 : 0.05 });
  for (let x of [-0.8, 0, 0.8]) {
    const roll = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.35, 8),
      rollMat
    );
    roll.position.set(x, -0.25, 0);
    roll.rotation.x = PI / 2;
    group.add(roll);
  }

  // Items on belt
  const itemMat = stdMat(0x3b82f6, { style, emissive: 0x3b82f6 });
  const items = [];
  for (let i = 0; i < 4; i++) {
    const item = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.06, 0.08),
      itemMat
    );
    item.position.set(-0.6 + i * 0.4, -0.15, 0);
    group.add(item);
    items.push(item);
    item.userData.speed = 0.15;
  }

  // Frame legs
  const legMat = stdMat(0x4a5568, { style });
  for (let x of [-0.9, 0.9]) {
    for (let z of [-0.18, 0.18]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.15, 4), legMat);
      leg.position.set(x, -0.35, z);
      group.add(leg);
    }
  }

  return {
    group,
    targets: { device_body: { objects: [belt] }, terminals: { objects: [] } },
    tick(dt) {
      items.forEach(item => {
        item.position.x += dt * item.userData.speed;
        if (item.position.x > 1.0) item.position.x = -1.0;
      });
    },
  };
}

function buildRobotArm({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const seg = quality === 'low' ? 8 : 16;
  const realistic = style === 'realistic';

  // Base
  const baseMat = stdMat(0x4a5568, { style, metalness: realistic ? 0.6 : 0.05 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 0.1, seg), baseMat);
  base.position.y = -0.7;
  group.add(base);

  // Turntable (rotating base)
  const turntable = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.3, 0.06, seg),
    stdMat(0x9ca3af, { style, metalness: realistic ? 0.8 : 0.1 })
  );
  turntable.position.y = -0.62;
  const armGroup = new THREE.Group();
  armGroup.add(turntable);

  // Main arm
  const lowerArm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.08), baseMat);
  lowerArm.position.y = 0.2;
  armGroup.add(lowerArm);

  // Elbow joint
  const jointMat = stdMat(0x64748b, { style, metalness: 0.7 });
  const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), jointMat);
  elbow.position.y = 0.4;
  armGroup.add(elbow);

  // Upper arm
  const upperArm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.35, 0.06), baseMat);
  upperArm.position.y = 0.6;
  upperArm.rotation.x = 0.3;
  armGroup.add(upperArm);

  // End effector
  const eeMat = stdMat(0xd97706, { style, metalness: 0.5 });
  const effector = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.04), eeMat);
  effector.position.set(0.04, 0.82, 0);
  armGroup.add(effector);

  armGroup.position.y = -0.62;
  group.add(armGroup);

  let t = 0;
  return {
    group,
    targets: { device_body: { objects: [base] }, terminals: { objects: [] } },
    tick(dt) {
      t += dt * 0.5;
      armGroup.rotation.y = t;
      upperArm.rotation.x = 0.3 + Math.sin(t * 2) * 0.15;
    },
  };
}

function buildWeldingTorch({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const realistic = style === 'realistic';

  // Torch body
  const torchMat = stdMat(0x1e293b, { style });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.3, 8), torchMat);
  body.rotation.x = PI / 2;
  body.position.x = -0.15;
  group.add(body);

  // Handle
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, 0.15, 8), torchMat);
  handle.position.set(-0.35, -0.02, 0);
  handle.rotation.z = 0.5;
  group.add(handle);

  // Nozzle
  const nozMat = stdMat(0x9ca3af, { style, metalness: 0.8 });
  const nozzle = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.06, 8), nozMat);
  nozzle.position.set(0, 0, 0);
  nozzle.rotation.x = -PI / 2;
  group.add(nozzle);

  // Weld arc
  const arcPts = [];
  for (let i = 0; i < 8; i++) {
    arcPts.push(V3(0, 0, -0.05 + Math.random() * 0.03));
  }
  const arcFlow = makeFlow(
    new THREE.CatmullRomCurve3([V3(0, 0, -0.06), V3(0.01, 0, -0.12), V3(-0.01, 0, -0.18)]),
    { count: 6, color: 0xfbbf24, size: 0.03, rate: 0.4 }
  );
  group.add(arcFlow.object);

  // Workpiece
  const wp = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.2), stdMat(0x64748b, { style }));
  wp.position.set(0, -0.2, 0);
  group.add(wp);

  // Sparks
  const sparkMat = stdMat(0xef4444, { style, emissive: 0xef4444 });
  for (let i = 0; i < 10; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.005, 4, 4), sparkMat);
    s.position.set((Math.random() - 0.5) * 0.2, -0.15, (Math.random() - 0.5) * 0.1);
    s.userData.vx = (Math.random() - 0.5) * 0.1;
    s.userData.vy = Math.random() * 0.05;
    group.add(s);
  }

  return {
    group,
    targets: { device_body: { objects: [body] }, terminals: { objects: [] }, signal_flow: { flow: arcFlow } },
    tick(dt, t) {
      group.children.forEach(c => {
        if (c.userData.vx !== undefined) {
          c.position.x += c.userData.vx * dt * 0.5;
          c.position.y += c.userData.vy * dt * 0.3;
          if (c.position.y > 0) c.position.y = -0.1;
        }
      });
    },
  };
}

export function build({ THREE, style, params, quality, template }) {
  const type = template || 'cnc_mill';
  switch (type) {
    case 'cnc_mill': return buildCNCMill({ THREE, style, params, quality });
    case 'injection_mold': return buildInjectionMold({ THREE, style, params, quality });
    case 'conveyor_belt': return buildConveyorBelt({ THREE, style, params, quality });
    case 'robot_arm': return buildRobotArm({ THREE, style, params, quality });
    case 'welding_torch': return buildWeldingTorch({ THREE, style, params, quality });
    default: return buildCNCMill({ THREE, style, params, quality });
  }
}
