// Sensors & Actuators scene templates.
// params: { type: string, showLabels: bool }
// 3D models for thermocouples, piezoelectric sensors, strain gauges, accelerometers, etc.

import { V3, COLORS, stdMat, makeFlow, makeWire } from './common.js';


function buildThermocouple({ THREE, style, params, quality }) {
  const group = new THREE.Group();

  // Two dissimilar metal wires
  const wireA = stdMat(0x9ca3af, { style, emissive: 0x6b7280 });
  const wireB = stdMat(0xd97706, { style, emissive: 0xd97706 });

  // Wire A (gray)
  const pathA = [V3(-0.8, 0, 0.5), V3(-0.4, 0, 0), V3(0, 0, 0)];
  const segA = new THREE.CatmullRomCurve3(pathA.map(p => p.clone()));
  const tubeA = new THREE.Mesh(
    new THREE.TubeGeometry(segA, 10, 0.025, 6, false),
    wireA
  );
  group.add(tubeA);

  // Wire B (gold)
  const pathB = [V3(0.8, 0, 0.5), V3(0.4, 0, 0), V3(0, 0, 0)];
  const segB = new THREE.CatmullRomCurve3(pathB.map(p => p.clone()));
  const tubeB = new THREE.Mesh(
    new THREE.TubeGeometry(segB, 10, 0.025, 6, false),
    wireB
  );
  group.add(tubeB);

  // Junction (measurement) - hot
  const junction = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 8, 8),
    stdMat(0xef4444, { style, emissive: 0xef4444 })
  );
  junction.userData.tooltip = `Hot junction (measurement) &bull; T &asymp; 150&deg;C &bull; Generates Seebeck voltage ~6.5 mV per 100&deg;C (Type K)`;
  group.add(junction);

  // Reference junction - cold
  const refJunc = new THREE.Mesh(
    new THREE.SphereGeometry(0.04, 8, 8),
    stdMat(0x3b82f6, { style, emissive: 0x3b82f6 })
  );
  refJunc.userData.tooltip = `Cold junction (reference) &bull; 0&deg;C (ice bath) or compensated &bull; Provides reference for Seebeck measurement`;
  refJunc.position.set(0, 0, 0.55);
  group.add(refJunc);

  // Voltmeter / readout indicator
  const meterMat = stdMat(0x1e293b, { style });
  const meter = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.05), meterMat);
  meter.position.set(0, -0.3, 0.7);
  group.add(meter);

  // Heat indicator (flame-like)
  const heatPts = [V3(0, 0.1, 0), V3(0.05, 0.2, 0), V3(0, 0.35, 0), V3(-0.05, 0.2, 0), V3(0, 0.1, 0)];
  const heatFlow = makeFlow(
    new THREE.CatmullRomCurve3(heatPts),
    { count: 6, color: 0xf97316, size: 0.06, rate: 0.2 }
  );
  group.add(heatFlow.object);

  return {
    group,
    targets: {
      device_body: { objects: [junction] },
      terminals: { objects: [tubeA, tubeB] },
      signal_flow: { flow: heatFlow },
    },
    tick() {},
  };
}

function buildPiezoelectric({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const seg = quality === 'low' ? 10 : 16;

  // Piezoelectric crystal
  const crystalMat = stdMat(0x60a5fa, { style, opacity: 0.7, emissive: 0x3b82f6 });
  const crystal = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.3, 0.6),
    crystalMat
  );
  crystal.userData.tooltip = `Piezoelectric crystal (PZT/Quartz) &bull; Generates voltage under mechanical stress &bull; d<sub>33</sub> &asymp; 300 pC/N`;
  group.add(crystal);

  // Electrodes (top and bottom)
  const elecMat = stdMat(0x9ca3af, { style, emissive: 0x6b7280 });
  const topElec = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.5), elecMat);
  topElec.userData.tooltip = `Top electrode &bull; Collects induced charge &bull; Signal output (+)`;
  topElec.position.y = 0.16;
  const botElec = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.5), elecMat);
  botElec.userData.tooltip = `Bottom electrode &bull; Ground reference &bull; Signal output (-)`;
  botElec.position.y = -0.16;
  group.add(topElec, botElec);

  // Lead wires
  const leadTop = makeWire(V3(0, 0.17, 0), V3(0.2, 0.4, 0), { color: COLORS.metal });
  const leadBot = makeWire(V3(0, -0.17, 0), V3(-0.2, -0.4, 0), { color: COLORS.metal });
  group.add(leadTop, leadBot);

  // Mechanical pressure arrows
  const pressMat = stdMat(0xef4444, { style, emissive: 0xef4444 });
  for (let i = -1; i <= 1; i++) {
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.08, 6), pressMat);
    arrow.position.set(i * 0.15, 0.3, 0);
    group.add(arrow);
  }

  // Vibration indicator
  const vibPts = [V3(0.3, 0, 0.3), V3(0.35, 0, 0.3), V3(0.3, 0, 0.3), V3(0.25, 0, 0.3)];
  const vibFlow = makeFlow(
    new THREE.CatmullRomCurve3(vibPts),
    { count: 4, color: 0x60a5fa, size: 0.04, rate: 0.3 }
  );
  group.add(vibFlow.object);

  return {
    group,
    targets: {
      device_body: { objects: [crystal] },
      terminals: { objects: [leadTop, leadBot] },
      signal_flow: { flow: vibFlow },
    },
    tick() {},
  };
}

function buildStrainGauge({ THREE, style, params, quality }) {
  const group = new THREE.Group();

  // Beam / substrate
  const beamMat = stdMat(0x64748b, { style, opacity: 0.5 });
  const beam = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 0.08, 0.3),
    beamMat
  );
  beam.userData.tooltip = `Strain gauge substrate &bull; Foil or polyimide backing &bull; Gauge factor k &asymp; 2.0 &bull; &Delta;R/R = k &times; &epsilon;`;
  beam.position.y = 0.15;
  group.add(beam);

  // Strain gauge pattern (zigzag conductive path)
  const gaugeMat = stdMat(0xd97706, { style, emissive: 0xd97706 });
  const lines = [];
  const startX = -0.6;
  for (let i = 0; i < 5; i++) {
    const x = startX + i * 0.2;
    const vert = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.2, 0.01), gaugeMat);
    vert.position.set(x, 0.23, 0);
    group.add(vert);
    lines.push(vert);
  }

  // Horizontal connecting lines
  for (let i = 0; i < 4; i++) {
    const x1 = startX + i * 0.2;
    const x2 = startX + (i + 1) * 0.2;
    const y = i % 2 === 0 ? 0.33 : 0.13;
    const horiz = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.01, 0.01),
      gaugeMat
    );
    horiz.position.set(x1 + 0.1, y, 0);
    group.add(horiz);
  }

  // Terminal pads
  for (let side of [-1, 1]) {
    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.06, 0.06),
      stdMat(0x9ca3af, { style })
    );
    pad.position.set(side * 0.8, 0.15, 0);
    group.add(pad);
  }

  // Force arrows
  const forceMat = stdMat(0xef4444, { style, emissive: 0xef4444 });
  for (let side of [-1, 1]) {
    for (let i = -1; i <= 1; i++) {
      const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.06, 6), forceMat);
      arrow.position.set(side * 1.15, 0.15 + i * 0.08, 0);
      arrow.rotation.z = side * Math.PI / 2;
      group.add(arrow);
    }
  }

  return {
    group,
    targets: {
      device_body: { objects: [beam] },
      terminals: { objects: [] },
    },
    tick() {},
  };
}

function buildAccelerometer({ THREE, style, params, quality }) {
  const group = new THREE.Group();

  // MEMS chip package
  const pkgMat = stdMat(0x1e293b, { style });
  const pkg = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.1, 0.8), pkgMat);
  pkg.userData.tooltip = `MEMS accelerometer package &bull; Measures acceleration via capacitive displacement &bull; Range &plusmn;2g to &plusmn;16g`;
  group.add(pkg);

  // Proof mass (center)
  const massMat = stdMat(0x9ca3af, { style, emissive: 0x6b7280 });
  const mass = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.06, 0.2), massMat);
  mass.userData.tooltip = `Proof mass (seismic mass) &bull; Moves with acceleration &bull; Displacement &prop; acceleration (F = ma)`;
  mass.position.y = 0.02;
  group.add(mass);

  // Cantilever beams (suspension)
  const suspMat = stdMat(0x64748b, { style });
  for (let side of [-1, 1]) {
    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.02, 0.04),
      suspMat
    );
    beam.userData.tooltip = `Suspension beam &bull; Spring constant k &bull; Restores proof mass to center &bull; Determines resonant frequency`;
    beam.position.set(side * 0.35, 0.02, 0);
    group.add(beam);
  }

  // Sense fingers (comb drive)
  for (let i = -3; i <= 3; i++) {
    const finger = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.02, 0.015),
      stdMat(0xd97706, { style })
    );
    finger.userData.tooltip = `Sense finger (comb drive) &bull; Measures differential capacitance &bull; &Delta;C &prop; displacement`;
    finger.position.set(i * 0.08, 0.02, 0.15);
    group.add(finger);
  }

  // Bond pads
  const padMat = stdMat(0xd97706, { style, emissive: 0xd97706 });
  const corners = [[-0.45, -0.35], [0.45, -0.35], [-0.45, 0.35], [0.45, 0.35]];
  for (const [x, z] of corners) {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.005, 0.08), padMat);
    pad.position.set(x, -0.05, z);
    group.add(pad);
  }

  // Acceleration arrows
  const accMat = stdMat(0xef4444, { style, emissive: 0xef4444 });
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.08, 6), accMat);
  arrow.position.set(0, 0.12, 0.25);
  group.add(arrow);

  return {
    group,
    targets: {
      device_body: { objects: [pkg] },
      terminals: { objects: [] },
    },
    tick() {},
  };
}

function buildPressureSensor({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const seg = quality === 'low' ? 10 : 16;

  // Diaphragm housing
  const housingMat = stdMat(0x4a5568, { style });
  const housing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 0.8, 0.4, seg),
    housingMat
  );
  housing.userData.tooltip = `Pressure sensor housing &bull; Stainless steel &bull; Protects internal piezoresistive elements &bull; Range 0-100 psi`;
  housing.position.y = 0.2;
  group.add(housing);

  // Diaphragm (thin membrane)
  const diaphMat = stdMat(0x9ca3af, { style, opacity: 0.6, emissive: 0x6b7280 });
  const diaphragm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 0.02, seg),
    diaphMat
  );
  diaphragm.userData.tooltip = `Diaphragm &bull; Thin membrane &bull; Deflects under pressure &bull; Strain &prop; applied pressure`;
  diaphragm.position.y = 0.41;
  group.add(diaphragm);

  // Piezoresistive elements
  const prMat = stdMat(0xd97706, { style, emissive: 0xd97706 });
  for (let i = -1; i <= 1; i++) {
    const elem = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.01, 0.02), prMat);
    elem.position.set(i * 0.15, 0.42, 0);
    group.add(elem);
  }

  // Pressure port
  const port = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.2, 0.2, seg),
    housingMat
  );
  port.position.y = -0.2;
  group.add(port);

  // Pressure arrows
  const pressMat = stdMat(0xef4444, { style, emissive: 0xef4444 });
  for (let i = -2; i <= 2; i++) {
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.06, 6), pressMat);
    arrow.position.set(i * 0.12, -0.35, 0);
    arrow.rotation.z = Math.PI;
    group.add(arrow);
  }

  // Deflection indicator
  const defPts = [V3(0, 0.42, 0.2), V3(0.01, 0.43, 0.2), V3(0, 0.42, 0.2)];
  const defFlow = makeFlow(
    new THREE.CatmullRomCurve3(defPts),
    { count: 4, color: 0x60a5fa, size: 0.04, rate: 0.15 }
  );
  group.add(defFlow.object);

  return {
    group,
    targets: {
      device_body: { objects: [housing] },
      terminals: { objects: [port] },
      signal_flow: { flow: defFlow },
    },
    tick() {},
  };
}

function buildThermistor({ THREE, style, params, quality }) {
  const group = new THREE.Group();

  // Thermistor bead
  const beadMat = stdMat(0x1e293b, { style, emissive: 0x0f172a });
  const bead = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 12, 12),
    beadMat
  );
  bead.userData.tooltip = `NTC Thermistor &bull; R<sub>T</sub> = R<sub>0</sub> &sdot; exp(&beta;(1/T - 1/T<sub>0</sub>)) &bull; &beta; &asymp; 3950K &bull; -40&deg;C to +125&deg;C`;
  group.add(bead);

  // Lead wires
  const leadMat = stdMat(0x9ca3af, { style });
  const lead1 = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 4), leadMat);
  lead1.userData.tooltip = `Lead wire &bull; Tin-plated copper &bull; Connects to measurement circuit`;
  lead1.position.set(-0.08, -0.4, 0);
  lead1.rotation.z = 0.1;
  const lead2 = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 4), leadMat);
  lead2.userData.tooltip = `Lead wire &bull; Tin-plated copper &bull; Second terminal`;
  lead2.position.set(0.08, -0.4, 0);
  lead2.rotation.z = -0.1;
  group.add(lead1, lead2);

  // Glass coating (transparent)
  const glass = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 12, 12),
    stdMat(0x60a5fa, { style, opacity: 0.15 })
  );
  group.add(glass);

  // Heat indicator
  const heatPts = [V3(0, 0.25, 0), V3(0.04, 0.3, 0), V3(0, 0.38, 0), V3(-0.04, 0.3, 0), V3(0, 0.25, 0)];
  const heatFlow = makeFlow(
    new THREE.CatmullRomCurve3(heatPts),
    { count: 5, color: 0xf97316, size: 0.05, rate: 0.2 }
  );
  group.add(heatFlow.object);

  return {
    group,
    targets: {
      device_body: { objects: [bead] },
      terminals: { objects: [lead1, lead2] },
      signal_flow: { flow: heatFlow },
    },
    tick() {},
  };
}

function buildPotentiometer({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const seg = quality === 'low' ? 10 : 20;

  // Body
  const bodyMat = stdMat(0x1e293b, { style });
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.6, 0.4, seg),
    bodyMat
  );
  body.userData.tooltip = `Potentiometer &bull; Variable resistor &bull; R = 10 k&Omega; &bull; Three terminals: CW, CCW, Wiper`;
  body.rotation.x = Math.PI / 2;
  group.add(body);

  // Resistive track (inside)
  const trackMat = stdMat(0xd97706, { style, opacity: 0.6, emissive: 0xd97706 });
  const track = new THREE.Mesh(
    new THREE.TorusGeometry(0.4, 0.03, 8, seg),
    trackMat
  );
  track.rotation.x = Math.PI / 2;
  group.add(track);

  // Wiper arm
  const wiperMat = stdMat(0x9ca3af, { style, emissive: 0x6b7280 });
  const wiper = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.02, 0.02),
    wiperMat
  );
  wiper.position.x = 0.15;
  wiper.position.y = 0.1;
  group.add(wiper);

  // Terminals
  const termMat = stdMat(0x9ca3af, { style });
  for (let i = -1; i <= 1; i++) {
    const term = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.2, 0.04), termMat);
    term.position.set(i * 0.3, -0.35, 0);
    group.add(term);
  }

  // Knob indicator
  const knob = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.04, 0.15),
    stdMat(0xef4444, { style })
  );
  knob.position.set(0, 0.3, 0);
  group.add(knob);

  let wiperAngle = 0;

  return {
    group,
    targets: {
      device_body: { objects: [body] },
      terminals: { objects: [] },
    },
    tick(dt) {
      wiperAngle += dt * 0.3;
      wiper.rotation.y = Math.sin(wiperAngle) * 0.8;
    },
  };
}

function buildPhotodiode({ THREE, style, params, quality }) {
  const group = new THREE.Group();

  // Photodiode body
  const bodyMat = stdMat(0x1e293b, { style });
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.3, 0.2, 12),
    bodyMat
  );
  body.userData.tooltip = `PIN Photodiode &bull; Converts light to current &bull; Responsivity &asymp; 0.6 A/W at 850nm &bull; Reverse biased`;
  group.add(body);

  // Lens (dome)
  const lens = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    stdMat(0x3b82f6, { style, opacity: 0.4 })
  );
  lens.position.y = 0.12;
  group.add(lens);

  // Active area
  const active = new THREE.Mesh(
    new THREE.CircleGeometry(0.12, 12),
    stdMat(0x1d4ed8, { style, emissive: 0x1d4ed8 })
  );
  active.position.y = 0.11;
  active.rotation.x = -Math.PI / 2;
  group.add(active);

  // Leads
  const leadMat = stdMat(0x9ca3af, { style });
  const lead1 = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.3, 4), leadMat);
  lead1.position.set(-0.12, -0.3, 0);
  const lead2 = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.3, 4), leadMat);
  lead2.position.set(0.12, -0.3, 0);
  group.add(lead1, lead2);

  // Light rays (incoming)
  const lightPts = [];
  for (let i = 0; i < 5; i++) {
    const x = (i - 2) * 0.06;
    lightPts.push(V3(x, 0.3 + i * 0.04, 0));
  }
  const lightFlow = makeFlow(
    new THREE.CatmullRomCurve3(lightPts.map(p => p.clone())),
    { count: 6, color: 0x60a5fa, size: 0.04, rate: 0.25 }
  );
  group.add(lightFlow.object);

  return {
    group,
    targets: {
      device_body: { objects: [body] },
      terminals: { objects: [lead1, lead2] },
      signal_flow: { flow: lightFlow },
    },
    tick() {},
  };
}

export function build({ THREE, style, params, quality, template }) {
  const type = template || 'thermocouple';
  switch (type) {
    case 'thermocouple': return buildThermocouple({ THREE, style, params, quality });
    case 'piezoelectric': return buildPiezoelectric({ THREE, style, params, quality });
    case 'strain_gauge': return buildStrainGauge({ THREE, style, params, quality });
    case 'accelerometer': return buildAccelerometer({ THREE, style, params, quality });
    case 'pressure_sensor': return buildPressureSensor({ THREE, style, params, quality });
    case 'photodiode_sensor': return buildPhotodiode({ THREE, style, params, quality });
    case 'thermistor': return buildThermistor({ THREE, style, params, quality });
    case 'potentiometer': return buildPotentiometer({ THREE, style, params, quality });
    default: return buildThermocouple({ THREE, style, params, quality });
  }
}
