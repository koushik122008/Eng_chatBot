// Thermal & Fluid Systems scene templates.
// params: { type: string, showLabels: bool }
// 3D models for heat sinks, heat exchangers, fluid flow, pumps, turbines, nozzles.

import { V3, COLORS, stdMat, makeFlow, makeWire } from './common.js';


function buildHeatSink({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  let flowActive = true;

  // Base plate
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 0.15, 1.5),
    stdMat(0x9ca3af, { style, emissive: 0x6b7280 })
  );
  base.position.y = -0.5;
  base.userData.tooltip = () => `Heat sink base &bull; ${flowActive ? 'Dissipating heat' : 'Idle'} &bull; Click to toggle flow`;
  group.add(base);

  // Fins
  const finMat = stdMat(0x9ca3af, { style, emissive: 0x6b7280 });
  for (let i = -4; i <= 4; i++) {
    const fin = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.8, 1.3),
      finMat
    );
    fin.userData.tooltip = `Cooling fin &bull; Increases surface area`;
    fin.position.set(i * 0.2, 0, 0);
    group.add(fin);
  }

  // Heat source (chip)
  const chip = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.08, 0.8),
    stdMat(0xef4444, { style, emissive: 0xef4444 })
  );
  chip.position.y = -0.65;
  chip.userData.tooltip = `Heat source (chip) &bull; Generates heat`;
  group.add(chip);

  // Heat flow arrows (rising)
  let heatFlowRate = 0.15;
  const heatFlow = makeFlow(
    new THREE.CatmullRomCurve3([
      V3(0.3, -0.2, 0), V3(0.2, 0.2, 0), V3(0.1, 0.5, 0),
      V3(0, 0.8, 0), V3(-0.1, 0.5, 0), V3(-0.2, 0.2, 0), V3(-0.3, -0.2, 0),
    ]),
    { count: 10, color: 0xf97316, size: 0.08, rate: 0.15, tooltip: () => `Heat convection &bull; ${flowActive ? 'Dissipating' : 'Idle'} &bull; T = 85&deg;C &bull; &Delta;T = 65&deg;C &bull; Air speed: 2.5 m/s` }
  );
  group.add(heatFlow.object);

  // Click handler
  const onClick = () => {
    flowActive = !flowActive;
    heatFlow.active = flowActive;
    chip.material.emissiveIntensity = flowActive ? 1 : 0.2;
    if (window.gsap) {
      window.gsap.fromTo(chip.scale, { x: 1.15, y: 1.15, z: 1.15 },
        { x: 1, y: 1, z: 1, duration: 0.35, ease: 'back.out(3)' });
    }
  };

  return {
    group,
    targets: {
      device_body: { objects: [base] },
      terminals: { objects: [chip] },
      signal_flow: { flow: heatFlow },
    },
    tick() {},
    onClick,
  };
}

function buildHeatExchanger({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const seg = quality === 'low' ? 8 : 16;
  let flowActive = true;

  // Shell (outer cylinder)
  const shell = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 0.8, 2.0, seg),
    stdMat(0x4a5568, { style, opacity: 0.35 })
  );
  shell.rotation.x = Math.PI / 2;
  shell.userData.tooltip = () => `Shell &bull; Outer pressure vessel &bull; ${flowActive ? 'Flowing' : 'Idle'} &bull; Click to toggle`;
  group.add(shell);

  // Tubes
  const tubeMat = stdMat(0x9ca3af, { style });
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      if (i === 0 && j === 0) continue;
      const tube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 2.0, 8),
        tubeMat
      );
      tube.rotation.x = Math.PI / 2;
      tube.position.set(i * 0.3, j * 0.3, 0);
      group.add(tube);
    }
  }

  // Baffles
  const baffleMat = stdMat(0x64748b, { style });
  for (let z of [-0.5, 0.3]) {
    const baffle = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.02, 0.5), baffleMat);
    baffle.position.z = z;
    group.add(baffle);
  }

  // Fluid flow
  const flowPts = [V3(0, 0, -1.2), V3(0.2, 0, -0.8), V3(-0.1, 0, -0.4), V3(0.1, 0, 0), V3(-0.2, 0, 0.4), V3(0, 0, 0.8)];
  const shellFlow = makeFlow(
    new THREE.CatmullRomCurve3(flowPts),
    { count: 10, color: 0x60a5fa, size: 0.05, rate: 0.15, tooltip: () => `Shell-side flow &bull; ${flowActive ? 'Active' : 'Stopped'} &bull; v = 1.8 m/s &bull; Q = 120 L/min &bull; T = 65&deg;C` }
  );
  group.add(shellFlow.object);

  const onClick = () => {
    flowActive = !flowActive;
    shellFlow.active = flowActive;
    shell.material.opacity = flowActive ? 0.35 : 0.15;
  };

  return {
    group,
    targets: {
      device_body: { objects: [shell] },
      terminals: { objects: [] },
      signal_flow: { flow: shellFlow },
    },
    tick() {},
    onClick,
  };
}

function buildPipeFlow({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const seg = quality === 'low' ? 10 : 20;
  let flowActive = true;

  // Transparent pipe
  const pipeMat = stdMat(0x64748b, { style, opacity: 0.25 });
  const pipe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 2.5, seg, 1, true),
    pipeMat
  );
  pipe.rotation.x = Math.PI / 2;
  pipe.userData.tooltip = () => `Fluid pipe &bull; Transparent walls &bull; ${flowActive ? 'Laminar flow' : 'Stopped'} &bull; Click to toggle`;
  group.add(pipe);

  // Laminar flow lines
  const flows = [];
  const colors = [0x60a5fa, 0x38bdf8, 0x22d3ee];
  for (let layer = 0; layer < 3; layer++) {
    const r = 0.1 + layer * 0.12;
    const flowPoints = [
      V3(r, 0, -1.3), V3(r, 0.05, -0.6), V3(r, 0, 0),
      V3(r, -0.05, 0.6), V3(r, 0, 1.3),
    ];
    const flow = makeFlow(
      new THREE.CatmullRomCurve3(flowPoints),
      { count: 6, color: colors[layer], size: 0.05, rate: 0.2 + layer * 0.1, tooltip: () => `Laminar flow &bull; ${flowActive ? 'Flowing' : 'Stopped'} &bull; v = ${(0.6 + layer * 0.4).toFixed(1)} m/s &bull; Re &asymp; 2100` }
    );
    group.add(flow.object);
    flows.push(flow);
  }

  // Flanges
  const flangeMat = stdMat(0x4a5568, { style });
  for (let z of [-1.25, 1.25]) {
    const flange = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.06, 8, seg), flangeMat);
    flange.userData.tooltip = `Flange &bull; Connects pipe sections`;
    flange.position.z = z;
    flange.rotation.x = Math.PI / 2;
    group.add(flange);
  }

  const onClick = () => {
    flowActive = !flowActive;
    flows.forEach((f) => { f.active = flowActive; });
    pipe.material.opacity = flowActive ? 0.25 : 0.12;
  };

  return {
    group,
    targets: {
      device_body: { objects: [pipe] },
      terminals: { objects: [] },
    },
    tick() {},
    onClick,
  };
}

function buildVenturi({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const seg = quality === 'low' ? 10 : 20;
  let flowActive = true;

  // Venturi tube
  const tubeMat = stdMat(0x64748b, { style, opacity: 0.3 });
  const tube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 2.0, seg, 1, true),
    tubeMat
  );
  tube.rotation.x = Math.PI / 2;
  tube.userData.tooltip = () => `Venturi meter &bull; Measures flow rate via pressure drop &bull; ${flowActive ? 'Active' : 'Stopped'} &bull; Click to toggle`;
  group.add(tube);

  // Inlet section
  const inlet = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.5, 0.4, seg),
    stdMat(0x4a5568, { style, opacity: 0.3 })
  );
  inlet.position.z = -1.2;
  inlet.rotation.x = Math.PI / 2;
  group.add(inlet);

  // Outlet section
  const outlet = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.7, 0.4, seg),
    stdMat(0x4a5568, { style, opacity: 0.3 })
  );
  outlet.position.z = 1.2;
  outlet.rotation.x = Math.PI / 2;
  group.add(outlet);

  // Throat
  const throat = new THREE.Mesh(
    new THREE.TorusGeometry(0.3, 0.08, 8, seg),
    stdMat(0x22c55e, { style, emissive: 0x22c55e })
  );
  throat.position.z = 0;
  throat.rotation.x = Math.PI / 2;
  throat.userData.tooltip = `Throat &bull; Narrowest section &bull; Highest velocity, lowest pressure`;
  group.add(throat);

  // Flow
  const flowPts = [V3(0, 0, -1.6), V3(0.1, 0, -1.0), V3(0, 0, -0.3), V3(0, 0, 0.3), V3(-0.1, 0, 1.0), V3(0, 0, 1.6)];
  const venturiFlow = makeFlow(
    new THREE.CatmullRomCurve3(flowPts),
    { count: 12, color: 0x60a5fa, size: 0.06, rate: 0.3, tooltip: () => `Venturi flow &bull; ${flowActive ? 'Active' : 'Stopped'} &bull; v<sub>inlet</sub> = 2.0 m/s &bull; v<sub>throat</sub> = 8.5 m/s &bull; &Delta;P = 12.5 kPa` }
  );
  group.add(venturiFlow.object);

  const onClick = () => {
    flowActive = !flowActive;
    venturiFlow.active = flowActive;
    tube.material.opacity = flowActive ? 0.3 : 0.12;
  };

  return {
    group,
    targets: {
      device_body: { objects: [tube, inlet, outlet] },
      terminals: { objects: [throat] },
      current_flow: { flow: venturiFlow },
    },
    tick() {},
    onClick,
  };
}

function buildPitotTube({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  let flowActive = true;

  // Pitot tube body
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 1.5, 8),
    stdMat(0x9ca3af, { style, emissive: 0x6b7280 })
  );
  body.rotation.z = Math.PI / 2;
  body.position.x = 0.75;
  body.userData.tooltip = () => `Pitot tube &bull; Measures stagnation pressure &bull; ${flowActive ? 'Measuring' : 'Idle'} &bull; Click to toggle`;
  group.add(body);

  // Stagnation opening
  const tip = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 8, 8),
    stdMat(0x22c55e, { style, emissive: 0x22c55e })
  );
  tip.position.x = 1.5;
  group.add(tip);

  // Static pressure ports
  for (let angle of [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2]) {
    const port = new THREE.Mesh(
      new THREE.TorusGeometry(0.04, 0.015, 4, 8),
      stdMat(0x64748b, { style })
    );
    port.position.set(0.3, Math.cos(angle) * 0.08, Math.sin(angle) * 0.08);
    port.rotation.y = Math.PI / 2;
    group.add(port);
  }

  // Airflow lines
  const airPts = [];
  for (let i = 0; i < 10; i++) {
    airPts.push(V3(-1.5 + i * 0.3, 0.1, 0));
  }
  const airFlow = makeFlow(
    new THREE.CatmullRomCurve3(airPts),
    { count: 8, color: COLORS.electron, size: 0.05, rate: 0.25, tooltip: () => `Airflow &bull; ${flowActive ? 'Measuring' : 'Idle'} &bull; v = 45 m/s &bull; P<sub>stag</sub> = 1.25 kPa &bull; Mach = 0.13` }
  );
  group.add(airFlow.object);

  // Pressure lines
  const tube1 = makeWire(V3(0.3, 0.08, 0), V3(0.3, -0.5, 0), { color: COLORS.metal, radius: 0.02 });
  const tube2 = makeWire(V3(1.2, 0.06, 0), V3(1.2, -0.5, 0), { color: COLORS.metal, radius: 0.02 });
  group.add(tube1, tube2);

  const onClick = () => {
    flowActive = !flowActive;
    airFlow.active = flowActive;
    tip.material.emissiveIntensity = flowActive ? 1 : 0.2;
  };

  return {
    group,
    targets: {
      device_body: { objects: [body] },
      terminals: { objects: [tip] },
      current_flow: { flow: airFlow },
    },
    tick() {},
    onClick,
  };
}

function buildPump({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const seg = quality === 'low' ? 10 : 20;
  let flowActive = true;

  // Volute casing
  const casing = new THREE.Mesh(
    new THREE.CylinderGeometry(1.0, 1.0, 0.6, seg),
    stdMat(0x4a5568, { style })
  );
  casing.userData.tooltip = () => `Pump volute &bull; ${flowActive ? 'Running' : 'Stopped'} &bull; Click to toggle`;
  group.add(casing);

  // Impeller
  const impMat = stdMat(0x9ca3af, { style, emissive: 0x6b7280 });
  const impeller = new THREE.Group();
  const impDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.3, 0.08, seg),
    impMat
  );
  impeller.add(impDisc);

  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.45, 0.15),
      stdMat(0x64748b, { style })
    );
    blade.position.set(Math.cos(angle) * 0.25, 0, Math.sin(angle) * 0.25);
    blade.rotation.y = -angle + 0.3;
    impeller.add(blade);
  }
  impeller.position.y = 0.05;
  group.add(impeller);

  // Suction inlet
  const inlet = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.4, 0.3, seg),
    stdMat(0x4a5568, { style })
  );
  inlet.position.y = -0.45;
  group.add(inlet);

  // Discharge outlet
  const outlet = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.2, 0.6),
    stdMat(0x4a5568, { style })
  );
  outlet.position.set(0.6, 0.1, 0);
  group.add(outlet);

  // Shaft
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.8, 6),
    stdMat(0x9ca3af, { style })
  );
  shaft.position.y = 0.5;
  group.add(shaft);

  // Flow
  const flowPts = [V3(-0.4, -0.45, 0), V3(0, -0.15, 0), V3(0.2, 0.1, 0), V3(0.6, 0.1, 0)];
  const pumpFlow = makeFlow(
    new THREE.CatmullRomCurve3(flowPts),
    { count: 8, color: 0x60a5fa, size: 0.06, rate: 0.2, tooltip: () => `Pump flow &bull; ${flowActive ? 'Running' : 'Stopped'} &bull; Q = 80 L/min &bull; H = 25 m &bull; N = 1450 RPM` }
  );
  group.add(pumpFlow.object);

  let impAngle = 0;
  let running = true;

  const onClick = () => {
    flowActive = !flowActive;
    running = !running;
    pumpFlow.active = flowActive;
  };

  return {
    group,
    targets: {
      device_body: { objects: [casing] },
      terminals: { objects: [inlet, outlet] },
      current_flow: { flow: pumpFlow },
    },
    tick(dt) {
      if (running) {
        impAngle += dt * 2.0;
        impeller.rotation.y = impAngle;
      }
    },
    onClick,
  };
}

function buildTurbine({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const seg = quality === 'low' ? 10 : 20;
  let running = true;

  // Casing (transparent)
  const casing = new THREE.Mesh(
    new THREE.CylinderGeometry(1.0, 1.0, 0.8, seg, 1, true),
    stdMat(0x4a5568, { style, opacity: 0.2 })
  );
  casing.userData.tooltip = () => `Turbine casing &bull; ${running ? 'Spinning' : 'Stopped'} &bull; Click to toggle`;
  group.add(casing);

  // Rotor blades
  const bladeMat = stdMat(0x9ca3af, { style, emissive: 0x6b7280 });
  const rotor = new THREE.Group();
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 0.2, seg),
    bladeMat
  );
  rotor.add(hub);

  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.55, 0.12),
      stdMat(0x64748b, { style })
    );
    blade.position.set(Math.cos(angle) * 0.5, 0, Math.sin(angle) * 0.5);
    blade.rotation.y = -angle + 0.4;
    rotor.add(blade);
  }
  group.add(rotor);

  // Stator vanes
  const vaneMat = stdMat(0x4a5568, { style });
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    const vane = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.3, 0.08),
      vaneMat
    );
    vane.position.set(Math.cos(angle) * 0.8, 0, Math.sin(angle) * 0.8);
    vane.rotation.y = -angle - 0.2;
    group.add(vane);
  }

  let rotAngle = 0;

  const onClick = () => {
    running = !running;
    casing.material.opacity = running ? 0.2 : 0.08;
  };

  return {
    group,
    targets: {
      device_body: { objects: [casing] },
      terminals: { objects: [] },
    },
    tick(dt) {
      if (running) {
        rotAngle += dt * 2.5;
        rotor.rotation.y = rotAngle;
      }
    },
    onClick,
  };
}

function buildNozzle({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const seg = quality === 'low' ? 10 : 16;
  let flowActive = true;

  // Nozzle body
  const nozMat = stdMat(0x64748b, { style, opacity: 0.3 });
  const noz = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.3, 2.0, seg, 1, true),
    nozMat
  );
  noz.rotation.x = Math.PI / 2;
  noz.userData.tooltip = () => `Convergent-divergent nozzle &bull; ${flowActive ? 'Exhausting' : 'Idle'} &bull; Click to toggle`;
  group.add(noz);

  // Throat ring
  const throat = new THREE.Mesh(
    new THREE.TorusGeometry(0.15, 0.025, 6, seg),
    stdMat(0x22c55e, { style, emissive: 0x22c55e })
  );
  throat.rotation.x = Math.PI / 2;
  group.add(throat);

  // Convergent section
  const conv = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.3, 0.6, seg),
    stdMat(0x4a5568, { style, opacity: 0.3 })
  );
  conv.position.z = -1.3;
  conv.rotation.x = Math.PI / 2;
  group.add(conv);

  // Exhaust flow
  const exhaustPts = [];
  for (let i = 0; i < 10; i++) {
    const r = 0.1 + i * 0.04;
    exhaustPts.push(V3(0, 0, 0.6 + i * 0.18));
  }
  const exhaustFlow = makeFlow(
    new THREE.CatmullRomCurve3(exhaustPts),
    { count: 14, color: 0xf97316, size: 0.08, rate: 0.35, tooltip: () => `Exhaust jet &bull; ${flowActive ? 'Exhausting' : 'Idle'} &bull; v = 350 m/s &bull; T = 420&deg;C &bull; Mach = 1.8` }
  );
  group.add(exhaustFlow.object);

  // Mach diamonds (shock diamonds)
  const diamonds = [];
  for (let i = 0; i < 4; i++) {
    const diam = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.08 + i * 0.03, 0.02),
      stdMat(0xfbbf24, { style, opacity: 0.6 })
    );
    diam.position.set(0, 0, 0.8 + i * 0.3);
    group.add(diam);
    diamonds.push(diam);
  }

  const onClick = () => {
    flowActive = !flowActive;
    exhaustFlow.active = flowActive;
    diamonds.forEach((d) => { d.material.opacity = flowActive ? 0.6 : 0.05; });
    noz.material.opacity = flowActive ? 0.3 : 0.1;
  };

  return {
    group,
    targets: {
      device_body: { objects: [noz] },
      terminals: { objects: [throat] },
      current_flow: { flow: exhaustFlow },
    },
    tick() {},
    onClick,
  };
}

export function build({ THREE, style, params, quality, template }) {
  const type = template || 'heat_sink';
  switch (type) {
    case 'heat_sink': return buildHeatSink({ THREE, style, params, quality });
    case 'heat_exchanger': return buildHeatExchanger({ THREE, style, params, quality });
    case 'pipe_flow': return buildPipeFlow({ THREE, style, params, quality });
    case 'venturi_meter': return buildVenturi({ THREE, style, params, quality });
    case 'pitot_tube': return buildPitotTube({ THREE, style, params, quality });
    case 'pump_cross': return buildPump({ THREE, style, params, quality });
    case 'turbine_blade': return buildTurbine({ THREE, style, params, quality });
    case 'nozzle': return buildNozzle({ THREE, style, params, quality });
    default: return buildHeatSink({ THREE, style, params, quality });
  }
}
