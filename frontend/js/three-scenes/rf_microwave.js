// RF & Microwave scene templates.
// params: { type: string, showLabels: bool }
// 3D models for microstrip, stripline, coax, Smith chart, circulator, coupler.

import { V3, COLORS, stdMat, makeFlow, makeWire } from './common.js';


function buildMicrostrip({ THREE, style, params, quality }) {
  const group = new THREE.Group();

  // Ground plane
  const gnd = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.03, 1.0),
    stdMat(0x4a5568, { style })
  );
  gnd.position.y = -0.15;
  group.add(gnd);

  // Dielectric substrate
  const sub = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.1, 1.0),
    stdMat(0x0ea5e9, { style, opacity: 0.25 })
  );
  sub.position.y = -0.08;
  group.add(sub);

  // Microstrip trace
  const traceMat = stdMat(0xd97706, { style, emissive: 0xd97706 });
  const trace = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.02, 0.08),
    traceMat
  );
  trace.position.y = -0.01;
  group.add(trace);

  // Impedance labels as arrows
  const fields = makeFlow(
    new THREE.CatmullRomCurve3([V3(0, -0.05, 0.4), V3(0, 0.05, 0.4), V3(0, -0.05, 0.4)]),
    { count: 4, color: 0x22c55e, size: 0.04, rate: 0.2 }
  );
  group.add(fields.object);

  // SMA connector ends
  const connMat = stdMat(0x9ca3af, { style });
  for (let x of [-0.9, 0.9]) {
    const conn = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.1, 8), connMat);
    conn.position.set(x, -0.1, 0);
    conn.rotation.x = Math.PI / 2;
    group.add(conn);
  }

  return {
    group,
    targets: {
      device_body: { objects: [trace, sub] },
      terminals: { objects: [] },
      signal_flow: { flow: fields },
    },
    tick() {},
  };
}

function buildStripline({ THREE, style, params, quality }) {
  const group = new THREE.Group();

  // Ground planes (top and bottom)
  const gndMat = stdMat(0x4a5568, { style });
  const gndBot = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.03, 0.8), gndMat);
  gndBot.position.y = -0.15;
  const gndTop = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.03, 0.8), gndMat);
  gndTop.position.y = 0.15;
  group.add(gndBot, gndTop);

  // Dielectric
  const diel = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.26, 0.8),
    stdMat(0x0ea5e9, { style, opacity: 0.2 })
  );
  group.add(diel);

  // Center conductor
  const centerMat = stdMat(0xd97706, { style, emissive: 0xd97706 });
  const center = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.025, 0.06),
    centerMat
  );
  group.add(center);

  return {
    group,
    targets: {
      device_body: { objects: [diel] },
      terminals: { objects: [] },
    },
    tick() {},
  };
}

function buildCoaxialCable({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const seg = quality === 'low' ? 10 : 20;

  // Outer conductor (jacket)
  const jacket = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.35, 2.0, seg, 1, true),
    stdMat(0x1e293b, { style, opacity: 0.5 })
  );
  jacket.rotation.x = Math.PI / 2;
  group.add(jacket);

  // Dielectric insulator
  const dielec = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.25, 2.0, seg, 1, true),
    stdMat(0x60a5fa, { style, opacity: 0.15 })
  );
  dielec.rotation.x = Math.PI / 2;
  group.add(dielec);

  // Center conductor
  const centerMat = stdMat(0xd97706, { style, emissive: 0xd97706 });
  const center = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 2.0, seg),
    centerMat
  );
  center.rotation.x = Math.PI / 2;
  group.add(center);

  // Cut end showing layers
  const endRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.3, 0.05, 8, seg),
    stdMat(0x4a5568, { style })
  );
  endRing.position.z = 1.0;
  endRing.rotation.x = Math.PI / 2;
  group.add(endRing);

  // BNC connector on one end
  const bncMat = stdMat(0x9ca3af, { style });
  const bnc = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.35, 0.15, seg), bncMat);
  bnc.position.z = -1.1;
  bnc.rotation.x = Math.PI / 2;
  group.add(bnc);

  // Pin
  const pin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 0.2, 6),
    stdMat(0xd97706, { style })
  );
  pin.position.z = -1.25;
  pin.rotation.x = Math.PI / 2;
  group.add(pin);

  // EM field visualization
  const fieldPts = [];
  for (let i = 0; i <= 12; i++) {
    const angle = i * 0.5;
    fieldPts.push(V3(0.15 * Math.cos(angle), 0.15 * Math.sin(angle), -0.8 + i * 0.15));
  }
  const fieldFlow = makeFlow(
    new THREE.CatmullRomCurve3(fieldPts),
    { count: 8, color: COLORS.electron, size: 0.04, rate: 0.2 }
  );
  group.add(fieldFlow.object);

  return {
    group,
    targets: {
      device_body: { objects: [jacket] },
      terminals: { objects: [bnc, pin] },
      signal_flow: { flow: fieldFlow },
    },
    tick() {},
  };
}

function buildSmithChart({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const seg = quality === 'low' ? 16 : 32;

  // Base circle
  const baseMat = stdMat(0x0f172a, { style, opacity: 0.7 });
  const base = new THREE.Mesh(
    new THREE.CircleGeometry(1.2, seg),
    baseMat
  );
  base.rotation.x = -Math.PI / 2;
  group.add(base);

  // Outer ring
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.2, 0.015, 8, seg),
    stdMat(0x38bdf8, { style })
  );
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  // Resistance circles
  const rMat = stdMat(0x3b82f6, { style, opacity: 0.3 });
  for (let r of [0.2, 0.5, 1.0, 2.0, 5.0]) {
    const radius = 1.2 / (1 + r);
    const cx = 1.2 * (1 - radius / 1.2);
    const circ = new THREE.Mesh(
      new THREE.RingGeometry(radius - 0.005, radius + 0.005, seg / 2),
      rMat
    );
    circ.position.x = -1.2 + cx;
    circ.rotation.x = -Math.PI / 2;
    group.add(circ);
  }

  // Reactance arcs
  const xMat = stdMat(0x22c55e, { style, opacity: 0.25 });
  for (let x of [0.5, 1.0, 2.0]) {
    const pts = [];
    const step = 0.05;
    for (let t = -1.2; t <= 0; t += step) {
      const y = x * (1.2 - t) / (1 + (1.2 - t) / x);
      if (y < 1.2) pts.push(V3(t, 0, y));
    }
    if (pts.length > 2) {
      const curve = new THREE.CatmullRomCurve3(pts);
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 12, 0.005, 4, false),
        xMat
      );
      tube.rotation.x = -Math.PI / 2;
      group.add(tube);
    }
  }

  // Center marker
  const center = new THREE.Mesh(
    new THREE.SphereGeometry(0.02, 8, 8),
    stdMat(0xef4444, { style, emissive: 0xef4444 })
  );
  center.position.set(0, 0.01, 0);
  group.add(center);

  // Graticule labels
  return {
    group,
    targets: {
      device_body: { objects: [base] },
      terminals: { objects: [] },
    },
    tick() {},
  };
}

function buildCirculator({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const seg = quality === 'low' ? 12 : 24;

  // Ferrite puck
  const ferriteMat = stdMat(0x4a5568, { style, emissive: 0x374151 });
  const puck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.6, 0.2, seg),
    ferriteMat
  );
  group.add(puck);

  // Magnet (top)
  const magnet = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 0.08, seg),
    stdMat(0xdc2626, { style })
  );
  magnet.position.y = 0.14;
  group.add(magnet);

  // Three ports at 120 degrees
  const portMat = stdMat(0x9ca3af, { style });
  for (let i = 0; i < 3; i++) {
    const angle = (i * 2 * Math.PI) / 3 - Math.PI / 2;
    const port = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.06, 0.04),
      portMat
    );
    port.position.set(Math.cos(angle) * 0.6, 0, Math.sin(angle) * 0.6);
    port.rotation.y = -angle;
    group.add(port);

    // Microstrip line
    const line = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.02, 0.02),
      stdMat(0xd97706, { style, emissive: 0xd97706 })
    );
    line.position.set(Math.cos(angle) * 0.9, 0, Math.sin(angle) * 0.9);
    line.rotation.y = -angle;
    group.add(line);
  }

  // Circular flow arrow
  const flowPts = [];
  for (let i = 0; i <= 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    flowPts.push(V3(0.4 * Math.cos(angle), 0.12, 0.4 * Math.sin(angle)));
  }
  const circFlow = makeFlow(
    new THREE.CatmullRomCurve3(flowPts),
    { count: 8, color: 0x60a5fa, size: 0.05, rate: 0.25 }
  );
  group.add(circFlow.object);

  return {
    group,
    targets: {
      device_body: { objects: [puck] },
      terminals: { objects: [] },
      signal_flow: { flow: circFlow },
    },
    tick() {},
  };
}

function buildCoupler({ THREE, style, params, quality }) {
  const group = new THREE.Group();

  // Main transmission line
  const lineMat = stdMat(0xd97706, { style, emissive: 0xd97706 });
  const mainLine = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.02, 0.04),
    lineMat
  );
  mainLine.position.set(0, 0.05, 0);
  group.add(mainLine);

  // Coupled line (parallel)
  const coupledLine = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.02, 0.04),
    stdMat(0xca8a04, { style, emissive: 0xca8a04 })
  );
  coupledLine.position.set(0, -0.05, 0.15);
  group.add(coupledLine);

  // Substrate
  const sub = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.08, 0.6),
    stdMat(0x0ea5e9, { style, opacity: 0.15 })
  );
  sub.position.y = -0.05;
  group.add(sub);

  // Ground
  const gnd = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.02, 0.6),
    stdMat(0x4a5568, { style })
  );
  gnd.position.y = -0.1;
  group.add(gnd);

  // Port labels
  for (let x of [-0.75, 0.75]) {
    for (let z of [-0.6, 0.6]) {
      const port = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.02, 0.04),
        stdMat(0x22c55e, { style, emissive: 0x22c55e })
      );
      port.position.set(x, 0.02, z);
      group.add(port);
    }
  }

  // Coupling indicator
  const coupPts = [
    V3(0, 0.05, 0), V3(0.05, 0, 0.05), V3(0, -0.05, 0.1),
    V3(-0.05, 0, 0.15), V3(0, 0.05, 0.15),
  ];
  const coupFlow = makeFlow(
    new THREE.CatmullRomCurve3(coupPts),
    { count: 6, color: COLORS.electron, size: 0.04, rate: 0.2 }
  );
  group.add(coupFlow.object);

  return {
    group,
    targets: {
      device_body: { objects: [mainLine, coupledLine] },
      terminals: { objects: [] },
      signal_flow: { flow: coupFlow },
    },
    tick() {},
  };
}

export function build({ THREE, style, params, quality, template }) {
  const type = template || 'microstrip_line';
  switch (type) {
    case 'microstrip_line': return buildMicrostrip({ THREE, style, params, quality });
    case 'stripline': return buildStripline({ THREE, style, params, quality });
    case 'coaxial_cable': return buildCoaxialCable({ THREE, style, params, quality });
    case 'smith_chart': return buildSmithChart({ THREE, style, params, quality });
    case 'circulator': return buildCirculator({ THREE, style, params, quality });
    case 'directional_coupler': return buildCoupler({ THREE, style, params, quality });
    default: return buildMicrostrip({ THREE, style, params, quality });
  }
}
