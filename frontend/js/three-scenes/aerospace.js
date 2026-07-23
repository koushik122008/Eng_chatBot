// Aerospace Engineering scene templates.
// params: { type: string, showLabels: bool }

import { V3, COLORS, stdMat, makeFlow, makeWire } from './common.js';
const PI = Math.PI;

function buildAirfoil({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const seg = quality === 'low' ? 16 : 32;
  const realistic = style === 'realistic';

  // NACA airfoil cross-section using shape
  const shape = new THREE.Shape();
  const pts = 24;
  for (let i = 0; i <= pts; i++) {
    const t = (i / pts) * PI * 2;
    const x = 0.5 + 0.5 * Math.cos(t);
    // NACA 2412 approximation
    const yt = 0.12 * (0.2969 * Math.sqrt(x/0.5) - 0.126 * (x/0.5) - 0.3516 * (x/0.5)**2 + 0.2843 * (x/0.5)**3 - 0.1015 * (x/0.5)**4);
    const yc = x < 0.5 ? 0.02 * (x/0.5) * (2 - (x/0.5)) : 0.02 * (1 - x/0.5) * (1 + x/0.5);
    const theta = Math.atan2(0.02 * (1 - 2 * x/0.5), 1);
    const xu = x - yt * Math.sin(theta);
    const yu = yc + yt * Math.cos(theta);
    if (i === 0) shape.moveTo(xu - 0.5, yu * 0.5);
    else shape.lineTo(xu - 0.5, yu * 0.5);
  }
  for (let i = pts; i >= 0; i--) {
    const t = (i / pts) * PI * 2;
    const x = 0.5 + 0.5 * Math.cos(t);
    const yt = 0.12 * (0.2969 * Math.sqrt(x/0.5) - 0.126 * (x/0.5) - 0.3516 * (x/0.5)**2 + 0.2843 * (x/0.5)**3 - 0.1015 * (x/0.5)**4);
    const yc = x < 0.5 ? 0.02 * (x/0.5) * (2 - (x/0.5)) : 0.02 * (1 - x/0.5) * (1 + x/0.5);
    const theta = Math.atan2(0.02 * (1 - 2 * x/0.5), 1);
    const xl = x + yt * Math.sin(theta);
    const yl = yc - yt * Math.cos(theta);
    shape.lineTo(xl - 0.5, yl * 0.5);
  }
  shape.closePath();

  const wing = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, { depth: realistic ? 0.5 : 0.3, bevelEnabled: realistic, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 }),
    stdMat(0x64748b, { style, metalness: realistic ? 0.4 : 0.05 })
  );
  wing.position.z = -0.15;
  group.add(wing);

  // Flow lines over wing
  const flowPts = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const y = 0.08 * Math.sin(t * PI);
    flowPts.push(V3(-0.5 + t, 0.1 + y, 0.2));
  }
  let airspeed = 75; // m/s
  const flow = makeFlow(new THREE.CatmullRomCurve3(flowPts),
    { count: 8, color: 0x60a5fa, size: 0.04, rate: 0.25, tooltip: () => `Airflow over airfoil &bull; v = ${airspeed} m/s &bull; Mach = ${(airspeed / 340).toFixed(2)} &bull; Angle of attack = 4&deg; &bull; L/D ratio = 12.5` });
  group.add(flow.object);

  return {
    group,
    targets: { device_body: { objects: [wing] }, terminals: { objects: [] }, signal_flow: { flow } },
    tick() {},
  };
}

function buildRocket({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const seg = quality === 'low' ? 8 : 16;
  const realistic = style === 'realistic';

  // Body
  const bodyMat = stdMat(0x9ca3af, { style, metalness: realistic ? 0.7 : 0.05 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.6, seg), bodyMat);
  body.rotation.x = PI / 2;
  group.add(body);

  // Nose cone
  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(0.2, 0.3, seg),
    stdMat(0xef4444, { style, metalness: realistic ? 0.3 : 0, emissive: 0xef4444 })
  );
  nose.position.z = 0.95;
  nose.rotation.x = PI / 2;
  group.add(nose);

  // Fins
  const finMat = stdMat(0x4a5568, { style });
  for (let i = 0; i < 4; i++) {
    const a = (i * PI) / 2;
    const fin = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.25, 0.01),
      finMat
    );
    fin.position.set(Math.cos(a) * 0.22, Math.sin(a) * 0.22, -0.75);
    fin.lookAt(0, 0, -0.75);
    group.add(fin);
  }

  // Nozzle
  const noz = new THREE.Mesh(
    new THREE.ConeGeometry(0.12, 0.1, seg),
    stdMat(0x1e293b, { style })
  );
  noz.position.z = -0.85;
  noz.rotation.x = PI / 2;
  group.add(noz);

  // Exhaust plume
  const plumePts = [];
  for (let i = 0; i < 10; i++) {
    const r = 0.02 + i * 0.03;
    plumePts.push(V3(0, 0, -0.9 - i * 0.08));
  }
  const plume = makeFlow(new THREE.CatmullRomCurve3(plumePts),
    { count: 12, color: 0xf97316, size: 0.06, rate: 0.4, tooltip: () => `Rocket exhaust &bull; Thrust = 450 kN &bull; I<sub>sp</sub> = 300 s &bull; v<sub>ex</sub> = 2.5 km/s &bull; Chamber P = 7 MPa` });
  group.add(plume.object);

  // Window
  const win = new THREE.Mesh(
    new THREE.CircleGeometry(0.06, seg),
    stdMat(0x60a5fa, { style, opacity: 0.6 })
  );
  win.position.set(0, 0.1, 0.5);
  win.rotation.y = PI / 2;
  group.add(win);

  return {
    group,
    targets: { device_body: { objects: [body] }, terminals: { objects: [noz] }, signal_flow: { flow: plume } },
    tick() {},
  };
}

function buildSatellite({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const seg = quality === 'low' ? 8 : 16;
  const realistic = style === 'realistic';

  // Bus
  const bus = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.3, 0.3),
    stdMat(0x64748b, { style, metalness: realistic ? 0.6 : 0.05 })
  );
  group.add(bus);

  // Solar panels
  const panelMat = stdMat(0x1d4ed8, { style, emissive: 0x1d4ed8 });
  for (let side of [-1, 1]) {
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.01, 0.3),
      panelMat
    );
    panel.position.set(side * 0.5, 0, 0);
    group.add(panel);

    // Panel strut
    const strut = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.01, 0.01),
      stdMat(0x9ca3af, { style })
    );
    strut.position.set(side * 0.25, 0, 0);
    group.add(strut);
  }

  // Antenna dish
  const dish = new THREE.Mesh(
    new THREE.CircleGeometry(0.15, seg),
    stdMat(0x9ca3af, { style, metalness: 0.9 })
  );
  dish.position.set(0, 0.2, -0.25);
  dish.rotation.x = -0.3;
  group.add(dish);

  // Antenna boom
  const boom = new THREE.Mesh(
    new THREE.CylinderGeometry(0.005, 0.005, 0.2, 4),
    stdMat(0x9ca3af, { style })
  );
  boom.position.set(0, 0.1, -0.25);
  group.add(boom);

  // Solar panel grid lines
  for (let side of [-1, 1]) {
    for (let i = -2; i <= 2; i++) {
      const line = new THREE.Mesh(
        new THREE.BoxGeometry(0.01, 0.005, 0.25),
        stdMat(0x2563eb, { style })
      );
      line.position.set(side * 0.5 + i * 0.1, 0.005, 0);
      group.add(line);
    }
  }

  // Communication signal (electromagnetic waves)
  const sigPts = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    sigPts.push(V3(Math.cos(t * PI * 2) * 0.3, 0.25 + Math.sin(t * PI * 4) * 0.08, -0.25 + t * 0.3));
  }
  const signalFlow = makeFlow(new THREE.CatmullRomCurve3(sigPts),
    { count: 8, color: 0x22c55e, size: 0.03, rate: 0.3, tooltip: () => `Communication signal &bull; f = 2.4 GHz &bull; &lambda; = 12.5 cm &bull; P<sub>tx</sub> = 5 W &bull; Bandwidth = 20 MHz` });
  group.add(signalFlow.object);

  // Solar radiation particles hitting panels
  const radPts = [V3(-0.65, 0.15, 0), V3(-0.5, 0.1, 0), V3(-0.35, 0.05, 0)];
  const radFlow = makeFlow(new THREE.CatmullRomCurve3(radPts),
    { count: 6, color: 0xfbbf24, size: 0.03, rate: 0.2, tooltip: () => `Solar radiation &bull; Flux = 1.36 kW/m&sup2; &bull; Panel efficiency = 22% &bull; P<sub>gen</sub> = 300 W` });
  group.add(radFlow.object);

  return {
    group,
    targets: { device_body: { objects: [bus] }, terminals: { objects: [] }, signal_flow: { flow: signalFlow }, radiation: { flow: radFlow } },
    tick(dt) {
      group.rotation.y += dt * 0.2;
    },
  };
}

function buildPropeller({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const seg = quality === 'low' ? 8 : 16;
  const realistic = style === 'realistic';

  // Hub
  const hub = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 8, 8),
    stdMat(0x9ca3af, { style, metalness: realistic ? 0.8 : 0.1 })
  );
  group.add(hub);

  // Blades
  const bladeMat = stdMat(0x64748b, { style, metalness: realistic ? 0.5 : 0.05 });
  const blades = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const a = (i * PI) / 2;
    // Twisted blade approximation
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.01, 0.04),
      bladeMat
    );
    blade.position.set(Math.cos(a) * 0.3, Math.sin(a) * 0.3, 0);
    blade.rotation.z = -a;
    blade.rotation.x = 0.3;
    blades.add(blade);

    // Tip
    const tipMat = stdMat(0xef4444, { style, emissive: 0xef4444 });
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.008, 4, 4), tipMat);
    tip.position.set(Math.cos(a) * 0.55, Math.sin(a) * 0.55, 0);
    blades.add(tip);
  }
  group.add(blades);

  // Cone spinner
  const spinner = new THREE.Mesh(
    new THREE.ConeGeometry(0.06, 0.08, 8),
    stdMat(0xdc2626, { style, metalness: realistic ? 0.5 : 0 })
  );
  spinner.position.z = -0.04;
  spinner.rotation.x = PI / 2;
  group.add(spinner);

  // Thrust airflow lines
  const thrustPts = [];
  for (let i = 0; i <= 10; i++) thrustPts.push(V3(0, 0, 0.1 + i * 0.08));
  const thrustFlow = makeFlow(new THREE.CatmullRomCurve3(thrustPts),
    { count: 8, color: 0x60a5fa, size: 0.04, rate: 0.3, tooltip: () => `Thrust airflow &bull; F = 1.2 kN &bull; v = 60 m/s &bull; Pitch = 1.8 m &bull; RPM = 2400` });
  group.add(thrustFlow.object);

  // Slipstream (spiral)
  const slipPts = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    slipPts.push(V3(Math.cos(t * PI * 4) * 0.15 * t, Math.sin(t * PI * 4) * 0.15 * t, 0.1 + t * 0.4));
  }
  const slipFlow = makeFlow(new THREE.CatmullRomCurve3(slipPts),
    { count: 10, color: 0x60a5fa, size: 0.03, rate: 0.25, tooltip: () => `Propeller slipstream &bull; Spiral wake &bull; v = 15 m/s &bull; Torque = 85 N&sdot;m` });
  group.add(slipFlow.object);

  let ang = 0;
  return {
    group,
    targets: { device_body: { objects: [hub] }, terminals: { objects: [] }, thrust_flow: { flow: thrustFlow }, slipstream: { flow: slipFlow } },
    tick(dt) { ang += dt * 5; blades.rotation.z = ang; },
    onClick() {
      thrustFlow.active = !thrustFlow.active;
      slipFlow.active = thrustFlow.active;
    },
  };
}

function buildJetEngine({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const seg = quality === 'low' ? 10 : 20;
  const realistic = style === 'realistic';

  // Nacelle (transparent)
  const nacMat = stdMat(0x64748b, { style, opacity: realistic ? 0.1 : 0.2 });
  const nacelle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.5, 1.2, seg, 1, true),
    nacMat
  );
  nacelle.rotation.x = PI / 2;
  group.add(nacelle);

  // Fan blades (front)
  const fanMat = stdMat(0x9ca3af, { style, metalness: realistic ? 0.8 : 0.1 });
  const fan = new THREE.Group();
  for (let i = 0; i < 12; i++) {
    const a = (i * PI) / 6;
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.01, 0.02),
      fanMat
    );
    blade.position.set(Math.cos(a) * 0.2, Math.sin(a) * 0.2, 0);
    blade.rotation.z = -a;
    blade.rotation.x = 0.4;
    fan.add(blade);
  }
  fan.position.z = 0.55;
  group.add(fan);

  // Compressor blades
  const compMat = stdMat(0x475569, { style });
  for (let i = 0; i < 4; i++) {
    const disc = new THREE.Mesh(
      new THREE.RingGeometry(0.08, 0.25, seg / 2),
      compMat
    );
    disc.position.z = 0.2 - i * 0.08;
    disc.rotation.x = PI / 2;
    group.add(disc);
  }

  // Turbine blades (rear)
  const turbMat = stdMat(0xd97706, { style, metalness: 0.7 });
  for (let i = 0; i < 3; i++) {
    const disc = new THREE.Mesh(
      new THREE.RingGeometry(0.08, 0.22, seg / 2),
      turbMat
    );
    disc.position.z = -0.3 - i * 0.08;
    disc.rotation.x = PI / 2;
    group.add(disc);
  }

  // Core (center shaft)
  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 1.0, 8),
    stdMat(0x4a5568, { style })
  );
  core.position.z = 0.1;
  core.rotation.x = PI / 2;
  group.add(core);

  // Exhaust
  const exPts = [];
  for (let i = 0; i < 8; i++) {
    exPts.push(V3(0, 0, -0.55 - i * 0.06));
  }
  const exhaust = makeFlow(new THREE.CatmullRomCurve3(exPts),
    { count: 10, color: 0xf97316, size: 0.05, rate: 0.35, tooltip: () => `Jet engine exhaust &bull; Thrust = 25 kN &bull; T<sub>ex</sub> = 650&deg;C &bull; v<sub>ex</sub> = 450 m/s &bull; BPR = 5.5:1` });
  group.add(exhaust.object);

  return {
    group,
    targets: { device_body: { objects: [nacelle] }, terminals: { objects: [] }, signal_flow: { flow: exhaust } },
    tick(dt) { fan.rotation.z += dt * 3; },
  };
}

export function build({ THREE, style, params, quality, template }) {
  const type = template || 'airfoil';
  switch (type) {
    case 'airfoil': return buildAirfoil({ THREE, style, params, quality });
    case 'rocket': return buildRocket({ THREE, style, params, quality });
    case 'satellite': return buildSatellite({ THREE, style, params, quality });
    case 'propeller': return buildPropeller({ THREE, style, params, quality });
    case 'jet_engine': return buildJetEngine({ THREE, style, params, quality });
    default: return buildAirfoil({ THREE, style, params, quality });
  }
}
