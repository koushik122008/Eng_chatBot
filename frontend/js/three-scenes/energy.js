// Renewable Energy & Energy Storage scene templates.
// params: { type: string, showLabels: bool }

import { V3, COLORS, stdMat, makeFlow, makeWire } from './common.js';
const PI = Math.PI;

function buildSolarPanel({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const seg = quality === 'low' ? 8 : 16;
  const realistic = style === 'realistic';

  // Frame
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 0.03, 1.2),
    stdMat(0x1e293b, { style, metalness: realistic ? 0.7 : 0.05 })
  );
  frame.position.y = -0.01;
  group.add(frame);

  // PV cells (grid of blue cells)
  const cellMat = stdMat(0x1d4ed8, { style, emissive: 0x1d4ed8, metalness: realistic ? 0.3 : 0 });
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 6; col++) {
      const cell = new THREE.Mesh(
        new THREE.BoxGeometry(0.27, 0.005, 0.22),
        cellMat
      );
      cell.position.set(-0.8 + col * 0.32, 0.01, -0.45 + row * 0.25);
      group.add(cell);

      // Silver grid lines
      const gridMat = stdMat(0x9ca3af, { style, metalness: realistic ? 0.9 : 0.3 });
      const busbar = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.002, 0.005),
        gridMat
      );
      busbar.position.set(-0.8 + col * 0.32, 0.015, -0.45 + row * 0.25);
      group.add(busbar);
    }
  }

  // Light reflection on panel
  if (realistic) {
    const glare = new THREE.Mesh(
      new THREE.PlaneGeometry(1.8, 1.0),
      new THREE.MeshBasicMaterial({
        color: 0x60a5fa, transparent: true, opacity: 0.08, side: THREE.DoubleSide,
      })
    );
    glare.position.set(-0.2, 0.02, 0.1);
    glare.rotation.x = -0.1;
    glare.rotation.z = 0.15;
    group.add(glare);
  }

  // Sun rays
  const rayPts = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI * 2;
    rayPts.push(V3(0, 0.3, 0));
    rayPts.push(V3(Math.cos(a) * 0.5, 0.5, Math.sin(a) * 0.5));
  }
  const rayFlow = makeFlow(
    new THREE.CatmullRomCurve3([V3(0, 0.3, 0), V3(0.1, 0.6, 0), V3(0, 0.9, 0), V3(-0.1, 0.6, 0), V3(0, 0.3, 0)]),
    { count: 8, color: 0xfbbf24, size: 0.04, rate: 0.15, tooltip: () => `Solar irradiance &bull; 1.36 kW/m&sup2; (AM0) &bull; Panel efficiency = 22% &bull; P<sub>rated</sub> = 300 W &bull; V<sub>oc</sub> = 45 V` }
  );
  group.add(rayFlow.object);

  return {
    group,
    targets: { device_body: { objects: [frame] }, terminals: { objects: [] }, signal_flow: { flow: rayFlow } },
    tick() {},
  };
}

function buildWindTurbine({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const seg = quality === 'low' ? 8 : 16;

  // Tower
  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.06, 2.0, 8),
    stdMat(0x9ca3af, { style, metalness: 0.6 })
  );
  tower.position.y = 1.0;
  group.add(tower);

  // Nacelle
  const nacelle = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.1, 0.2),
    stdMat(0x4a5568, { style })
  );
  nacelle.position.set(0, 2.0, 0.05);
  group.add(nacelle);

  // Hub
  const hub = new THREE.Mesh(
    new THREE.SphereGeometry(0.04, 8, 8),
    stdMat(0x64748b, { style })
  );
  hub.position.set(0, 2.0, 0.15);
  group.add(hub);

  // Blades (rotating)
  const blades = new THREE.Group();
  blades.position.set(0, 2.0, 0.15);
  const bladeMat = stdMat(0x64748b, { style });
  for (let i = 0; i < 3; i++) {
    const a = (i * PI * 2) / 3;
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 1.0, 0.06),
      bladeMat
    );
    blade.position.y = 0.5;
    blade.rotation.z = a;
    blades.add(blade);
  }
  group.add(blades);

  // Wind flow lines
  const windPts = [];
  for (let i = 0; i <= 10; i++) windPts.push(V3(-0.8 + i * 0.18, 1.5 + Math.sin(i * 0.5) * 0.05, 0));
  const windFlow = makeFlow(new THREE.CatmullRomCurve3(windPts),
    { count: 6, color: 0x60a5fa, size: 0.04, rate: 0.2, tooltip: () => `Wind flow &bull; v = 12 m/s &bull; Turbine rated at 3 MW &bull; Cut-in: 3 m/s, Cut-out: 25 m/s &bull; RPM = 15` });
  group.add(windFlow.object);

  // Second flow line (offset)
  const windPts2 = [];
  for (let i = 0; i <= 10; i++) windPts2.push(V3(-0.8 + i * 0.18, 2.2 + Math.sin(i * 0.7 + 1) * 0.08, 0.1));
  const windFlow2 = makeFlow(new THREE.CatmullRomCurve3(windPts2),
    { count: 6, color: 0x60a5fa, size: 0.03, rate: 0.18, tooltip: () => `Upper wind &bull; v = 14 m/s &bull; Shear effect &bull; Turbulence intensity = 8%` });
  group.add(windFlow2.object);

  let ang = 0;
  return {
    group,
    targets: { device_body: { objects: [tower] }, terminals: { objects: [] }, wind_flow: { flow: windFlow }, wind_flow2: { flow: windFlow2 } },
    tick(dt) { ang += dt * 1.5; blades.rotation.x = ang; },
    onClick(obj) {
      // Click the tower or blades to toggle wind visualization
      if (obj === tower || obj.parent === blades) {
        windFlow.active = !windFlow.active;
        windFlow2.active = windFlow.active;
      }
    },
  };
}

function buildFuelCell({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const seg = quality === 'low' ? 6 : 12;

  // Stack of cells
  const stackMat = stdMat(0x4a5568, { style, metalness: 0.5 });
  for (let i = 0; i < 5; i++) {
    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.03, 0.5),
      stackMat
    );
    plate.position.set(0, -0.2 + i * 0.1, 0);
    group.add(plate);

    // Membrane (between plates)
    if (i < 4) {
      const mem = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.02, 0.4),
        stdMat(0x22c55e, { style, opacity: 0.4, emissive: 0x22c55e })
      );
      mem.position.set(0, -0.15 + i * 0.1, 0);
      group.add(mem);
    }
  }

  // End plates
  const endMat = stdMat(0x1e293b, { style, metalness: 0.8 });
  const end1 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.6), endMat);
  end1.position.y = -0.25;
  const end2 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.6), endMat);
  end2.position.y = 0.25;
  group.add(end1, end2);

  // Gas flow indicators
  const h2Flow = makeFlow(
    new THREE.CatmullRomCurve3([V3(-0.5, -0.15, 0.3), V3(0, -0.05, 0.35), V3(0.5, -0.15, 0.3)]),
    { count: 6, color: 0x60a5fa, size: 0.04, rate: 0.2, tooltip: () => `H<sub>2</sub> gas flow &bull; PEM fuel cell &bull; V = 0.7 V/cell &bull; Efficiency = 45% &bull; P = 1.2 kW &bull; T = 80&deg;C` }
  );
  group.add(h2Flow.object);

  return {
    group,
    targets: { device_body: { objects: [] }, terminals: { objects: [end1, end2] }, signal_flow: { flow: h2Flow } },
    tick() {},
  };
}

function buildBatteryCell({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const seg = quality === 'low' ? 8 : 16;
  const realistic = style === 'realistic';

  // Cylindrical cell (18650 style)
  const canMat = stdMat(0xdc2626, { style, metalness: realistic ? 0.8 : 0.2, emissive: 0xdc2626 });
  const can = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.25, 1.0, seg),
    canMat
  );
  group.add(can);

  // Positive terminal
  const posTerm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.06, 0.04, 8),
    stdMat(0x9ca3af, { style, metalness: 0.7 })
  );
  posTerm.position.y = 0.52;
  group.add(posTerm);

  // Negative terminal (bottom)
  const negTerm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.02, 6),
    stdMat(0x9ca3af, { style, metalness: 0.7 })
  );
  negTerm.position.y = -0.51;
  group.add(negTerm);

  // Vent (top)
  const vent = new THREE.Mesh(
    new THREE.TorusGeometry(0.02, 0.005, 4, 8),
    stdMat(0x4a5568, { style })
  );
  vent.position.y = 0.48;
  vent.rotation.x = PI / 2;
  group.add(vent);

  // Current flow indicator
  const flow = makeFlow(
    new THREE.CatmullRomCurve3([V3(0, -0.3, 0.3), V3(0, 0, 0.35), V3(0, 0.3, 0.3)]),
    { count: 6, color: COLORS.electron, size: 0.04, rate: 0.3, tooltip: () => `Current flow &bull; Li-ion 18650 &bull; V = 3.7 V &bull; Capacity = 2.5 Ah &bull; Energy = 9.25 Wh &bull; C-rate = 0.5C` }
  );
  group.add(flow.object);

  return {
    group,
    targets: { device_body: { objects: [can] }, terminals: { objects: [posTerm, negTerm] }, signal_flow: { flow } },
    tick() {},
  };
}

function buildSupercapacitor({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const seg = quality === 'low' ? 8 : 16;

  // Coin cell type
  const caseMat = stdMat(0x64748b, { style, metalness: 0.6 });
  const caseB = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.4, 0.12, seg),
    caseMat
  );
  caseB.rotation.x = PI / 2;
  group.add(caseB);

  // Electrodes (porous carbon layers)
  for (let i of [-1, 1]) {
    const layer = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 0.02, seg),
      stdMat(0x1e293b, { style })
    );
    layer.position.z = i * 0.03;
    layer.rotation.x = PI / 2;
    group.add(layer);
  }

  // Separator
  const sep = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.32, 0.01, seg),
    stdMat(0x22c55e, { style, opacity: 0.4, emissive: 0x22c55e })
  );
  sep.rotation.x = PI / 2;
  group.add(sep);

  // Ion flow between electrodes
  const ionPts = [V3(0, 0, -0.06), V3(0, 0, 0), V3(0, 0, 0.06)];
  const ionFlow = makeFlow(new THREE.CatmullRomCurve3(ionPts),
    { count: 8, color: COLORS.electron, size: 0.03, rate: 0.35, tooltip: () => `Ion migration &bull; Supercapacitor &bull; C = 10 F &bull; V = 2.7 V &bull; Energy density = 5 Wh/kg &bull; Power density = 10 kW/kg` });
  group.add(ionFlow.object);

  return {
    group,
    targets: { device_body: { objects: [caseB] }, terminals: { objects: [] }, ion_flow: { flow: ionFlow } },
    tick() {},
    onClick() {
      ionFlow.active = !ionFlow.active;
    },
  };
}

function buildElectrolyzer({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const seg = quality === 'low' ? 8 : 16;

  // Cell stack
  for (let i = 0; i < 4; i++) {
    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.02, 0.4),
      stdMat(0x4a5568, { style, metalness: 0.5 })
    );
    plate.position.y = -0.15 + i * 0.1;
    group.add(plate);
  }

  // Electrolyte
  const elec = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.35, 0.3),
    stdMat(0x3b82f6, { style, opacity: 0.2, emissive: 0x3b82f6 })
  );
  group.add(elec);

  // Gas bubble evolution
  const bubMat = stdMat(0xffffff, { style, opacity: 0.3 });
  for (let i = 0; i < 12; i++) {
    const b = new THREE.Mesh(
      new THREE.SphereGeometry(0.01 + Math.random() * 0.02, 4, 4),
      bubMat
    );
    b.position.set(
      (Math.random() - 0.5) * 0.4,
      -0.1 + Math.random() * 0.3,
      (Math.random() - 0.5) * 0.2
    );
    b.userData.rise = Math.random();
    group.add(b);
  }

  return {
    group,
    targets: { device_body: { objects: [elec] }, terminals: { objects: [] } },
    tick(dt, t) {
      group.children.forEach(c => {
        if (c.userData.rise !== undefined) {
          c.userData.rise += dt * 0.3;
          c.position.y = -0.1 + (c.userData.rise % 1) * 0.4;
        }
      });
    },
  };
}

export function build({ THREE, style, params, quality, template }) {
  const type = template || 'solar_panel';
  switch (type) {
    case 'solar_panel': return buildSolarPanel({ THREE, style, params, quality });
    case 'wind_turbine': return buildWindTurbine({ THREE, style, params, quality });
    case 'fuel_cell': return buildFuelCell({ THREE, style, params, quality });
    case 'battery_cell': return buildBatteryCell({ THREE, style, params, quality });
    case 'supercapacitor': return buildSupercapacitor({ THREE, style, params, quality });
    case 'electrolyzer': return buildElectrolyzer({ THREE, style, params, quality });
    default: return buildSolarPanel({ THREE, style, params, quality });
  }
}
