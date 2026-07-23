// Power electronics category builder.
// types: buck_converter, boost_converter, buck_boost, flyback, forward_converter, h_bridge, inverter_3ph, cuk_converter, sepic, charge_pump
import { V3, COLORS, stdMat, makeWire, makeFlow, makeLabel } from './common.js';

export function build({ THREE, style, params, quality, template }) {
  const group = new THREE.Group();
  const type = template || 'buck_converter';
  const seg = quality === 'low' ? 6 : 12;
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

  // Shared interactive state
  let switchStates = []; // 0 = OFF, 1 = ON
  let flowActive = true;
  let pumpIntensity = 0.3;
  const wireGroups = [];

  const signalColor = (on) => on ? 0x22c55e : COLORS.wireOff;

  const makeL = (pos, tooltip = 'Inductor &bull; Stores energy in magnetic field &bull; L &asymp; 100 &micro;H') => {
    const pts = []; const turns = 5;
    for (let i = 0; i <= turns * 8; i++) {
      const t = i / (turns * 8);
      pts.push(V3((t - 0.5) * 0.25, Math.cos(t * turns * Math.PI * 2) * 0.18, Math.sin(t * turns * Math.PI * 2) * 0.18));
    }
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), turns * 8, 0.02, 4, false),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.4, metalness: 0.3 }));
    m.userData.tooltip = tooltip;
    return m;
  };
  const makeC = (pos, tooltip = 'Capacitor &bull; Smooths output ripple &bull; C &asymp; 100 &micro;F') => {
    const g = new THREE.Group(); const mat = stdMat(0x60a5fa, { style });
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.3, 0.12), mat);
    p1.userData.tooltip = tooltip;
    const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.3, 0.12), mat);
    p2.position.set(0.06, 0, 0);
    p2.userData.tooltip = tooltip;
    g.add(p1, p2);
    g.position.copy(pos); return g;
  };
  const makeDiode = (pos, rot = 0, tooltip = 'Power diode &bull; Freewheeling/clamp diode &bull; V<sub>RRM</sub> &asymp; 200V') => {
    const g = new THREE.Group();
    const shape = new THREE.Shape();
    shape.moveTo(-0.3, -0.2); shape.lineTo(0.15, 0); shape.lineTo(-0.3, 0.2); shape.closePath();
    const dMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.15, bevelEnabled: false }), stdMat(COLORS.nType, { style }));
    dMesh.userData.tooltip = tooltip;
    g.add(dMesh);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.4, 0.15), stdMat(COLORS.metal, { style }));
    bar.position.set(0.15, 0, 0);
    bar.userData.tooltip = tooltip;
    g.add(bar);
    g.position.copy(pos); g.rotation.z = rot; return g;
  };
  const makeSwitch = (pos, idx, tooltip = 'Switching transistor (MOSFET/IGBT) &bull; PWM controlled &bull; f<sub>sw</sub> &asymp; 100kHz') => {
    const g = new THREE.Group();
    const swMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.25, 0.15), stdMat(0x22c55e, { style }));
    swMesh.userData.switchIndex = idx;
    swMesh.userData.tooltip = () => {
      const on = switchStates[idx] ?? 1;
      return `${tooltip} &bull; <b>${on ? 'ON' : 'OFF'}</b> &bull; Click to toggle`;
    };
    g.add(swMesh);
    g.position.copy(pos); return g;
  };

  if (type === 'buck_converter' || ['flyback', 'forward_converter', 'cuk_converter', 'sepic', 'charge_pump'].includes(type)) {
    switchStates = [1];
    group.add(makeSwitch(V3(-1.2, 0.4, 0), 0));
    group.add(makeL(V3(0.2, 0.4, 0)));
    group.add(makeDiode(V3(-1.2, -0.2, 0)));
    group.add(makeC(V3(1.0, 0, 0)));
    // Wires — will be updated dynamically via refresh

  } else if (type === 'boost_converter') {
    switchStates = [1];
    group.add(makeL(V3(-1.0, 0.4, 0)));
    group.add(makeSwitch(V3(0.2, 0.4, 0), 0));
    group.add(makeDiode(V3(0.2, 0, 0), Math.PI / 2));
    group.add(makeC(V3(0.6, 0, 0)));

  } else if (type === 'buck_boost') {
    switchStates = [1];
    group.add(makeSwitch(V3(-0.8, 0.4, 0), 0));
    group.add(makeL(V3(0.2, 0.4, 0)));
    group.add(makeDiode(V3(0.8, 0, 0)));
    group.add(makeC(V3(1.2, -0.3, 0)));

  } else if (type === 'h_bridge') {
    switchStates = [1, 0, 0, 1];
    for (let i = 0; i < 4; i++) {
      const x = i < 2 ? -0.6 : 0.6;
      const y = i % 2 === 0 ? 0.6 : -0.6;
      group.add(makeSwitch(V3(x, y, 0), i));
    }
    // Motor symbol
    const motor = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.45, 16), stdMat(0x64748b, { style }));
    motor.position.set(0, 0, 0); group.add(motor);
    const mMesh = makeLabel('M'); mMesh.position.set(0, 0, 0.2); group.add(mMesh);

  } else if (type === 'inverter_3ph') {
    switchStates = [1, 0, 1, 0, 1, 0];
    for (let phase = 0; phase < 3; phase++) {
      const x = -1.0 + phase * 1.0;
      group.add(makeSwitch(V3(x, 0.4, 0), phase * 2));
      group.add(makeSwitch(V3(x, -0.4, 0), phase * 2 + 1));
    }
    // AC output labels
    for (let phase = 0; phase < 3; phase++) {
      const lbl = makeLabel(phase === 0 ? 'R' : phase === 1 ? 'Y' : 'B');
      lbl.position.set(-1.0 + phase * 1.0, -1.3, 0); group.add(lbl);
    }
  }

  // Make wire with tooltip
  const makePowerWire = (from, to, color, radius = 0.025) => {
    const w = makeWire(from, to, { color, radius });
    w.userData.tooltip = flowActive
      ? `Power path &bull; Carrying current &bull; ${color === 0xef4444 ? 'V<sub>IN</sub>' : 'V<sub>OUT</sub>'}`
      : `Power path &bull; Idle &bull; Click to toggle`;
    wireGroups.push({ wire: w, color, active: color !== 0x4b5563 });
    group.add(w);
    return w;
  };

  // Build wires based on type (stored for refresh)
  const wires = [];

  function buildWires() {
    // Remove old wire meshes
    for (const w of wires) {
      if (w.parent) w.parent.remove(w);
    }
    wires.length = 0;

    const on = (idx) => switchStates[idx] ?? 1;
    const wireColor = (base) => flowActive ? base : COLORS.wireOff;

    if (type === 'buck_converter' || ['flyback', 'forward_converter', 'cuk_converter', 'sepic', 'charge_pump'].includes(type)) {
      wires.push(makePowerWire(V3(-2.0, 0.4, 0), V3(-1.4, 0.4, 0), wireColor(0xef4444)));
      wires.push(makePowerWire(V3(-0.4, 0.4, 0), V3(-0.05, 0.4, 0), wireColor(COLORS.wireOff)));
      wires.push(makePowerWire(V3(0.5, 0.4, 0), V3(0.8, 0.4, 0), wireColor(COLORS.wireOff)));
      wires.push(makePowerWire(V3(1.3, 0, 0), V3(2.0, 0, 0), wireColor(0x60a5fa)));
      wires.push(makePowerWire(V3(-1.2, -0.5, 0), V3(-1.2, -0.8, 0), wireColor(0x4b5563), 0.02));
      wires.push(makePowerWire(V3(-1.2, -0.8, 0), V3(1.6, -0.8, 0), wireColor(0x4b5563), 0.02));
      wires.push(makePowerWire(V3(1.0, -0.25, 0), V3(1.0, -0.8, 0), wireColor(0x4b5563), 0.02));
      const lbl = makeLabel('BUCK'); lbl.position.set(0, 0.9, 0); group.add(lbl);
      wires.push(lbl);
    } else if (type === 'boost_converter') {
      wires.push(makePowerWire(V3(-2.0, 0.4, 0), V3(-1.3, 0.4, 0), wireColor(0xef4444)));
      wires.push(makePowerWire(V3(-0.6, 0.4, 0), V3(-0.05, 0.4, 0), wireColor(COLORS.wireOff)));
      wires.push(makePowerWire(V3(0.5, 0.4, 0), V3(1.2, 0.4, 0), wireColor(0x60a5fa)));
      wires.push(makePowerWire(V3(0.2, -0.25, 0), V3(0.2, -0.7, 0), wireColor(0x4b5563), 0.02));
      wires.push(makePowerWire(V3(0.6, -0.25, 0), V3(0.6, -0.7, 0), wireColor(0x4b5563), 0.02));
      wires.push(makePowerWire(V3(-2.0, -0.7, 0), V3(1.4, -0.7, 0), wireColor(0x4b5563), 0.02));
    } else if (type === 'buck_boost') {
      wires.push(makePowerWire(V3(-2.0, 0.4, 0), V3(-1.0, 0.4, 0), wireColor(0xef4444)));
      wires.push(makePowerWire(V3(-0.4, 0.4, 0), V3(-0.05, 0.4, 0), wireColor(COLORS.wireOff)));
      wires.push(makePowerWire(V3(0.5, 0.4, 0), V3(1.0, 0.4, 0), wireColor(COLORS.wireOff)));
      wires.push(makePowerWire(V3(0.8, 0.3, 0), V3(1.5, 0, 0), wireColor(0x60a5fa)));
      wires.push(makePowerWire(V3(-0.8, 0.1, 0), V3(-0.8, -0.5, 0), wireColor(0x4b5563), 0.02));
      wires.push(makePowerWire(V3(-0.8, -0.5, 0), V3(1.8, -0.5, 0), wireColor(0x4b5563), 0.02));
      wires.push(makePowerWire(V3(1.5, -0.3, 0), V3(1.5, -0.5, 0), wireColor(0x4b5563), 0.02));
    } else if (type === 'h_bridge') {
      wires.push(makePowerWire(V3(-0.6, 0.8, 0), V3(0.6, 0.8, 0), wireColor(0xef4444), 0.02));
      wires.push(makePowerWire(V3(0, 0.8, 0), V3(0, 1.4, 0), wireColor(0xef4444)));
      wires.push(makePowerWire(V3(-0.6, -0.8, 0), V3(0.6, -0.8, 0), wireColor(0x4b5563), 0.02));
      wires.push(makePowerWire(V3(0, -0.8, 0), V3(0, -1.4, 0), wireColor(0x4b5563)));
      wires.push(makePowerWire(V3(-0.6, 0.3, 0), V3(-0.3, 0.15, 0), wireColor(0x60a5fa), 0.02));
      wires.push(makePowerWire(V3(0.6, 0.3, 0), V3(0.3, 0.15, 0), wireColor(0x60a5fa), 0.02));
      wires.push(makePowerWire(V3(-0.6, -0.3, 0), V3(-0.3, -0.15, 0), wireColor(0x60a5fa), 0.02));
      wires.push(makePowerWire(V3(0.6, -0.3, 0), V3(0.3, -0.15, 0), wireColor(0x60a5fa), 0.02));
    } else if (type === 'inverter_3ph') {
      for (let phase = 0; phase < 3; phase++) {
        const x = -1.0 + phase * 1.0;
        wires.push(makePowerWire(V3(x, 0.6, 0), V3(x, 1.0, 0), wireColor(0xef4444), 0.02));
        wires.push(makePowerWire(V3(x, -0.6, 0), V3(x, -1.0, 0), wireColor(0x4b5563), 0.02));
        wires.push(makePowerWire(V3(x, 0, 0), V3(x, 0.5, 0), wireColor(0x22c55e), 0.02));
      }
      wires.push(makePowerWire(V3(-1.0, 1.0, 0), V3(1.0, 1.0, 0), wireColor(0xef4444), 0.02));
      wires.push(makePowerWire(V3(-1.0, -1.0, 0), V3(1.0, -1.0, 0), wireColor(0x4b5563), 0.02));
      wires.push(makePowerWire(V3(0, 1.0, 0), V3(0, 1.6, 0), wireColor(0xef4444)));
      wires.push(makePowerWire(V3(0, -1.0, 0), V3(0, -1.6, 0), wireColor(0x4b5563)));
    }

    // Update switch colors based on state
    group.children.forEach((child) => {
      if (child.type === 'Group') {
        child.children.forEach((m) => {
          if (m.userData.switchIndex !== undefined && m.isMesh) {
            const on = switchStates[m.userData.switchIndex] ?? 1;
            m.material.color.setHex(on ? 0x22c55e : 0x6b7280);
          }
        });
      }
    });
  }

  buildWires();

  // Flow animation for active converters
  const flowPts = [];
  for (let i = 0; i <= 8; i++) {
    const t = (i / 8) * 2 - 1;
    flowPts.push(V3(t * 0.8, 0.3 + 0.1 * Math.sin(t * 3), 0));
  }
  const flowAnim = makeFlow(
    new THREE.CatmullRomCurve3(flowPts),
    { count: 8, color: 0x22c55e, size: 0.05, rate: 0.3, tooltip: () => `Power flow &bull; ${flowActive ? 'Active' : 'Idle'} &bull; f<sub>sw</sub> = 100 kHz &bull; D = 0.4 &bull; V<sub>in</sub> = 12 V &bull; V<sub>out</sub> = 5 V` }
  );
  group.add(flowAnim.object);

  const refresh = () => {
    flowAnim.active = flowActive;
    // Rebuild wires with current colors
    for (const w of wires) {
      if (w.parent) w.parent.remove(w);
    }
    wires.length = 0;
    buildWires();
  };

  // Walk-up helper for onClick — find switchIndex in ancestors
  const clickHandler = (obj) => {
    let node = obj;
    while (node && node.userData.switchIndex === undefined && node.parent) node = node.parent;
    if (node && node.userData.switchIndex !== undefined) {
      const idx = node.userData.switchIndex;
      switchStates[idx] = 1 - (switchStates[idx] ?? 1);
      if (window.gsap) {
        window.gsap.fromTo(node.scale, { x: 1.2, y: 1.2, z: 1.2 },
          { x: 1, y: 1, z: 1, duration: 0.3, ease: 'back.out(3)' });
      }
      refresh();
      return true;
    }
    // Fallback: toggle flow
    flowActive = !flowActive;
    refresh();
    return true;
  };

  group.position.y = -0.2;
  return {
    group,
    targets: {
      power: { objects: [group] },
      signal_flow: { flow: flowAnim },
    },
    tick(dt) {
      pumpIntensity += (flowActive ? 0.3 : 0) - pumpIntensity * 0.05;
    },
    onClick: clickHandler,
  };
}
