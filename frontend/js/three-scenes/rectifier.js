// Rectifier circuits category builder.
// params: { type, showFilter, loadResistance }
// types: half_wave, full_wave_ct, full_wave_bridge, precision, voltage_doubler, three_phase
import { V3, COLORS, stdMat, makeWire, makeFlow, makeLabel } from './common.js';

export function build({ THREE, style, params, quality, template }) {
  const group = new THREE.Group();
  const type = template || 'half_wave';
  const seg = quality === 'low' ? 8 : 16;
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

  // Diode symbol helper
  const makeDiode = (pos, rot = 0) => {
    const g = new THREE.Group();
    const shape = new THREE.Shape();
    shape.moveTo(-0.35, -0.25);
    shape.lineTo(0.2, 0);
    shape.lineTo(-0.35, 0.25);
    shape.closePath();
    const diodeMesh = new THREE.Mesh(
      new THREE.ExtrudeGeometry(shape, { depth: 0.2, bevelEnabled: false }),
      stdMat(COLORS.nType, { style }),
    );
    const diodeType = type === 'half_wave' || type === 'full_wave_ct' || type === 'precision_rectifier' || type === 'full_wave_bridge' ? 'Si' : 'fast';
    diodeMesh.userData.tooltip = `Diode (${type === 'voltage_doubler' ? '1N4148' : '1N4007'}) &bull; Vf &asymp; 0.7V &bull; ${type === 'half_wave' || type === 'full_wave_ct' || type === 'precision_rectifier' ? 'Conducting positive half-cycle' : type === 'full_wave_bridge' ? 'Bridge diode pair' : 'Rectifier diode'}`;
    g.add(diodeMesh);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.2), stdMat(COLORS.metal, { style }));
    bar.userData.tooltip = `Diode cathode bar &bull; Current flows anode &rarr; cathode`;
    bar.position.set(0.2, 0, 0);
    g.add(bar);
    g.position.copy(pos);
    g.rotation.z = rot;
    return g;
  };

  // Source transformer symbol
  const makeACSource = (pos) => {
    const g = new THREE.Group();
    const circle = new THREE.Mesh(
      new THREE.RingGeometry(0.3, 0.38, seg),
      stdMat(0x22c55e, { style, emissive: 0x22c55e }),
    );
    circle.position.copy(pos);
    circle.userData.tooltip = `AC Source &bull; 50/60Hz &bull; Vp &asymp; ±12V &bull; Click to toggle current flow`;
    g.add(circle);
    return g;
  };

  // Load resistor
  const makeLoad = (pos) => {
    const g = new THREE.Group();
    const pts = [];
    const segs = 7;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      pts.push(new THREE.Vector3((t - 0.5) * 0.6, i % 2 === 0 ? 0 : 0.2, 0));
    }
    const loadMesh = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.025, 6, false),
      new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.5, metalness: 0.2 }),
    );
    loadMesh.userData.tooltip = `Load Resistor R<sub>L</sub> &bull; ${type === 'half_wave' ? '1 k&Omega;' : type === 'full_wave_bridge' ? '10 k&Omega;' : '100 &Omega;'} &bull; Dissipates rectified DC power`;
    g.add(loadMesh);
    g.position.copy(pos);
    return g;
  };

  if (type === 'half_wave' || type === 'half_wave_rectifier' || type === 'precision_rectifier') {
    const src = makeACSource(V3(-2.5, 0, 0));
    group.add(src);
    group.add(makeWire(V3(-2.0, 0, 0), V3(-0.8, 0, 0), { color: COLORS.wireOff, radius: 0.03 }));
    const d = makeDiode(V3(-0.3, 0, 0));
    group.add(d);
    group.add(makeWire(V3(0.5, 0, 0), V3(1.2, 0, 0), { color: COLORS.wireOff, radius: 0.03 }));
    const load = makeLoad(V3(1.6, 0, 0));
    group.add(load);
    group.add(makeWire(V3(2.2, 0, 0), V3(2.8, 0, 0), { color: COLORS.wireOff, radius: 0.03 }));
    // Ground return
    group.add(makeWire(V3(-0.5, -0.6, 0), V3(2.5, -0.6, 0), { color: 0x4b5563, radius: 0.025 }));

    // Output waveform (half-wave)
    const outPts = [];
    for (let i = 0; i <= 30; i++) {
      const t = (i / 30) - 0.5;
      const y = Math.sin(t * 6) > 0 ? Math.sin(t * 6) * 0.5 : -0.05;
      outPts.push(new THREE.Vector3(t * 1.2 + 1.6, y + 0.7, 0.05));
    }
    const outCurve = new THREE.CatmullRomCurve3(outPts);
    const outMesh = new THREE.Mesh(
      new THREE.TubeGeometry(outCurve, 20, 0.015, 4, false),
      new THREE.MeshBasicMaterial({ color: 0x22c55e }),
    );
    outMesh.position.set(0, 0, 0);
    outMesh.userData.tooltip = `Half-wave output &bull; Only positive half-cycles pass &bull; Ripple frequency = input frequency (50/60Hz)`;
    group.add(outMesh);

  } else if (type === 'full_wave_ct' || type === 'full_wave_ct_rectifier') {
    const src = makeACSource(V3(-2.5, 0, 0));
    group.add(src);
    // Center-tapped transformer (two diodes)
    const d1 = makeDiode(V3(-0.3, 0.6, 0));
    group.add(d1);
    const d2 = makeDiode(V3(-0.3, -0.6, 0));
    group.add(d2);
    group.add(makeWire(V3(-0.8, 0.6, 0), V3(-0.05, 0.6, 0), { color: COLORS.wireOff, radius: 0.03 }));
    group.add(makeWire(V3(-0.8, -0.6, 0), V3(-0.05, -0.6, 0), { color: COLORS.wireOff, radius: 0.03 }));
    // Center tap
    group.add(makeWire(V3(-1.0, 0, 0), V3(-1.0, -1.0, 0), { color: 0x4b5563, radius: 0.025 }));
    // Combine outputs
    group.add(makeWire(V3(0.5, 0.6, 0), V3(1.2, 0, 0), { color: COLORS.wireOff, radius: 0.03 }));
    group.add(makeWire(V3(0.5, -0.6, 0), V3(1.2, 0, 0), { color: COLORS.wireOff, radius: 0.03 }));
    const load = makeLoad(V3(1.6, 0, 0));
    group.add(load);
    group.add(makeWire(V3(2.2, 0, 0), V3(2.8, 0, 0), { color: COLORS.wireOff, radius: 0.03 }));
    group.add(makeWire(V3(-1.0, -1.0, 0), V3(2.5, -1.0, 0), { color: 0x4b5563, radius: 0.025 }));

  } else if (type === 'full_wave_bridge') {
    // Bridge rectifier with 4 diodes
    const dTR = makeDiode(V3(0.3, 0.6, 0), 0);
    group.add(dTR);
    const dTL = makeDiode(V3(-0.3, 0.6, 0), 0);
    group.add(dTL);
    const dBR = makeDiode(V3(0.3, -0.6, 0), Math.PI);
    group.add(dBR);
    const dBL = makeDiode(V3(-0.3, -0.6, 0), Math.PI);
    group.add(dBL);

    // Bridge connections
    group.add(makeWire(V3(-0.6, 0.6, 0), V3(-0.6, -0.6, 0), { color: COLORS.wireOff, radius: 0.03 }));
    group.add(makeWire(V3(0.6, 0.6, 0), V3(0.6, -0.6, 0), { color: COLORS.wireOff, radius: 0.03 }));
    // AC input (left)
    const src = makeACSource(V3(-2.2, 0, 0));
    group.add(src);
    group.add(makeWire(V3(-1.8, 0, 0), V3(-0.6, 0, 0), { color: COLORS.wireOff, radius: 0.03 }));
    // DC output (right)
    group.add(makeWire(V3(0.6, 0.6, 0), V3(1.2, 0.6, 0), { color: 0x22c55e, radius: 0.03 }));
    group.add(makeWire(V3(-0.6, -0.6, 0), V3(1.2, -0.6, 0), { color: 0x4b5563, radius: 0.03 }));
    const load = makeLoad(V3(1.6, 0.6, 0));
    group.add(load);
    group.add(makeWire(V3(2.2, 0.6, 0), V3(2.8, 0.6, 0), { color: 0x22c55e, radius: 0.03 }));

    // Full-wave output
    const outPts2 = [];
    for (let i = 0; i <= 30; i++) {
      const t = (i / 30) - 0.5;
      const y = Math.abs(Math.sin(t * 6)) * 0.5;
      outPts2.push(new THREE.Vector3(t * 1.2 + 1.6, y + 1.0, 0.05));
    }
    const outCurve2 = new THREE.CatmullRomCurve3(outPts2);
    const bridgeOut = new THREE.Mesh(
      new THREE.TubeGeometry(outCurve2, 20, 0.015, 4, false),
      new THREE.MeshBasicMaterial({ color: 0x22c55e }),
    );
    bridgeOut.userData.tooltip = `Full-wave output &bull; Both half-cycles rectified &bull; Ripple frequency = 2 &times; input (100/120Hz) &bull; Easier to filter than half-wave`;
    group.add(bridgeOut);

    const acLbl = makeLabel('AC');
    acLbl.position.set(-2.6, 0.5, 0);
    group.add(acLbl);
    const dcLbl = makeLabel('DC');
    dcLbl.position.set(3.2, 0.5, 0);
    group.add(dcLbl);

  } else if (type === 'voltage_doubler') {
    // Voltage doubler: 2 diodes + 2 capacitors
    const d1 = makeDiode(V3(-0.3, 0.5, 0));
    group.add(d1);
    const d2 = makeDiode(V3(-0.3, -0.5, 0), Math.PI);
    group.add(d2);
    // Capacitors
    const cap1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.2), stdMat(0x60a5fa, { style }));
    cap1.position.set(0.5, 0.5, 0);
    group.add(cap1);
    const cap2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.2), stdMat(0x60a5fa, { style }));
    cap2.position.set(0.5, -0.5, 0);
    group.add(cap2);
    // Connections
    group.add(makeWire(V3(-2.0, 0, 0), V3(-0.6, 0, 0), { color: COLORS.wireOff, radius: 0.03 }));
    group.add(makeWire(V3(-0.6, 0.5, 0), V3(-0.05, 0.5, 0), { color: COLORS.wireOff, radius: 0.03 }));
    group.add(makeWire(V3(-0.6, -0.5, 0), V3(-0.05, -0.5, 0), { color: COLORS.wireOff, radius: 0.03 }));
    group.add(makeWire(V3(0.5, 0.8, 0), V3(1.5, 0.8, 0), { color: 0x22c55e, radius: 0.03 }));
    group.add(makeWire(V3(0.5, -0.8, 0), V3(1.5, -0.8, 0), { color: 0x4b5563, radius: 0.03 }));

    const src = makeACSource(V3(-2.5, 0, 0));
    group.add(src);

  } else if (type === 'three_phase' || type === 'three_phase_rectifier') {
    // Three-phase bridge: 6 diodes
    const positions = [-0.6, 0, 0.6];
    for (let i = 0; i < 3; i++) {
      const dTop = makeDiode(V3(positions[i], 0.5, 0), 0);
      group.add(dTop);
      const dBot = makeDiode(V3(positions[i], -0.5, 0), Math.PI);
      group.add(dBot);
    }
    // AC inputs
    for (let i = 0; i < 3; i++) {
      group.add(makeWire(V3(-2.0, positions[i] * 0.8, 0), V3(positions[i], 0, 0), { color: 0x22c55e, radius: 0.025 }));
    }
    // DC output
    group.add(makeWire(V3(-0.8, 0.5, 0), V3(1.5, 0.5, 0), { color: 0x22c55e, radius: 0.03 }));
    group.add(makeWire(V3(-0.8, -0.5, 0), V3(1.5, -0.5, 0), { color: 0x4b5563, radius: 0.03 }));
  }

  // === Interactive: click the source to toggle AC polarity ===
  let polarity = 1; // 1 or -1

  // Add an electron flow path visible through the conducting diode(s)
  let flowParticles = null;
  if (type === 'half_wave' || type === 'half_wave_rectifier' || type === 'precision_rectifier') {
    const fCurve = new THREE.CatmullRomCurve3([
      V3(-2.0, 0.1, 0.05), V3(-1.0, 0.1, 0.1), V3(-0.3, 0.05, 0.1),
      V3(0.2, 0.05, 0.1), V3(0.8, 0.1, 0.08), V3(1.6, 0.1, 0.05)
    ]);
    flowParticles = makeFlow(fCurve, { count: 8, color: COLORS.electron, size: 0.05, rate: 0.35 });
    flowParticles.active = false;
    group.add(flowParticles.object);
  } else if (type === 'full_wave_bridge') {
    const fCurve = new THREE.CatmullRomCurve3([
      V3(-1.8, 0, 0.05), V3(-0.8, 0, 0.1), V3(0, 0.05, 0.1),
      V3(0.6, 0.05, 0.08), V3(1.2, 0.05, 0.08), V3(1.6, 0.05, 0.05)
    ]);
    flowParticles = makeFlow(fCurve, { count: 8, color: COLORS.electron, size: 0.05, rate: 0.35 });
    flowParticles.active = false;
    group.add(flowParticles.object);
  }

  group.position.y = -0.2;
  return {
    group,
    targets: { 
      rectifier: { objects: [group] },
      ...(flowParticles ? { current_flow: { flow: flowParticles } } : {}),
    },
    tick() {},
    onClick(obj) {
      // Click the AC source ring to toggle current flow visibility
      if (obj === srcRing || obj === srcRing2) {
        polarity *= -1;
        if (flowParticles) {
          flowParticles.active = !flowParticles.active;
          if (window.gsap) {
            window.gsap.fromTo(flowParticles.object.children[0]?.material,
              { emissiveIntensity: 1.0 },
              { emissiveIntensity: 0.2, duration: 0.5, ease: 'sine.inOut' }
            );
          }
        }
      }
    },
  };
}
