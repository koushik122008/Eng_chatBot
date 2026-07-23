// Amplifier circuits category builder.
// params: { type, gain, bias }
// types: common_emitter, common_base, common_collector, differential_pair,
//        darlington_pair, cascode, push_pull, instrumentation_amp,
//        transconductance_amp, multistage_amp, tuned_amplifier
import { V3, COLORS, stdMat, makeWire, makeFlow, makeLabel } from './common.js';


// Transistor symbol (triangle with emitter line)
function makeTransistor(THREE, pos, npn = true) {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, -0.4);
  shape.lineTo(0.3, 0);
  shape.lineTo(-0.5, 0.4);
  shape.closePath();
  const transMesh = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, { depth: 0.25, bevelEnabled: false }),
    stdMat(COLORS.nType, { style: 'schematic' }),
  );
  transMesh.userData.tooltip = `${npn ? 'NPN' : 'PNP'} BJT &bull; &beta; &asymp; 100-300 &bull; ${npn ? 'V<sub>BE</sub> &asymp; 0.65V' : 'V<sub>EB</sub> &asymp; 0.65V'} &bull; Three terminals: Base, Collector, Emitter`;
  g.add(transMesh);
  // Emitter arrow
  if (npn) {
    const arr = new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.12, 6),
      stdMat(COLORS.metal, { style: 'schematic' }),
    );
    arr.position.set(-0.05, -0.17, 0.15);
    arr.rotation.x = Math.PI / 2;
    arr.userData.tooltip = `Emitter arrow &bull; Current flow direction (NPN: out, PNP: in)`;
    g.add(arr);
  }
  g.position.copy(pos);
  return g;
}

export function build({ THREE, style, params, quality, template }) {
  const group = new THREE.Group();
  const type = template || 'common_emitter';
  const seg = quality === 'low' ? 6 : 12;

  // Resistor zigzag
  const makeR = (pos, tooltip = 'Resistor') => {
    const pts = [];
    for (let i = 0; i <= 7; i++) {
      pts.push(V3((i / 7 - 0.5) * 0.5, i % 2 === 0 ? 0 : 0.18, 0));
    }
    const m = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.02, 4, false),
      new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.5, metalness: 0.2 }),
    );
    m.userData.tooltip = tooltip;
    m.position.copy(pos);
    return m;
  };

  // Capacitor (two lines)
  const makeC = (pos, rot = 0, tooltip = 'Capacitor &bull; DC blocking / coupling') => {
    const g = new THREE.Group();
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.25, 0.12), stdMat(COLORS.wireOff, { style }));
    p1.position.set(-0.05, 0, 0);
    p1.userData.tooltip = tooltip;
    const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.25, 0.12), stdMat(COLORS.wireOff, { style }));
    p2.position.set(0.05, 0, 0);
    p2.userData.tooltip = tooltip;
    g.add(p1, p2);
    g.position.copy(pos);
    g.rotation.z = rot;
    return g;
  };

  // DC voltage label
  const makeVDot = (pos, color, tooltip = 'V<sub>CC</sub> &bull; Supply voltage &asymp; 12V') => {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), stdMat(color, { style }));
    dot.userData.tooltip = tooltip;
    dot.position.copy(pos);
    return dot;
  };

  if (type === 'common_emitter' || ['cascode_amplifier', 'transconductance_amp', 'tuned_amplifier'].includes(type)) {
    // CE: Input -> C1 -> B, R1 to VCC, R2 to GND, RC to VCC, RE to GND, C2 to output
    const q1 = makeTransistor(THREE, V3(0, 0, 0));
    group.add(q1);
    group.add(makeWire(V3(-2.0, 0.3, 0), V3(-0.5, 0.3, 0), { color: 0x22c55e, radius: 0.025 }));
    group.add(makeC(V3(-1.2, 0.3, 0), 0, 'C<sub>1</sub> &bull; Input coupling capacitor &bull; Blocks DC, passes AC'));
    group.add(makeR(V3(-0.2, 0.8, 0), 'R<sub>C</sub> &bull; Collector load resistor &bull; Sets voltage gain A<sub>V</sub> = -R<sub>C</sub>/r<sub>e</sub>'));
    group.add(makeWire(V3(-0.2, 1.1, 0), V3(-0.2, 1.6, 0), { color: 0xef4444, radius: 0.02 }));
    group.add(makeVDot(V3(-0.2, 1.6, 0), 0xef4444, 'V<sub>CC</sub> &bull; +12V supply &bull; Powers the amplifier')); // VCC
    // Output
    group.add(makeWire(V3(0.3, 0, 0), V3(0.3, 0.5, 0), { color: 0x60a5fa, radius: 0.025 }));
    group.add(makeWire(V3(0.3, 0.5, 0), V3(1.5, 0.5, 0), { color: 0x60a5fa, radius: 0.025 }));
    group.add(makeC(V3(0.8, 0.5, 0), 0, 'C<sub>2</sub> &bull; Output coupling capacitor &bull; AC couples signal to load'));
    // Ground
    group.add(makeWire(V3(0, -0.4, 0), V3(0, -1.0, 0), { color: 0x4b5563, radius: 0.02 }));
    // Labels
    const inL = makeLabel('IN');
    inL.position.set(-2.4, 0.6, 0);
    group.add(inL);
    const outL = makeLabel('OUT');
    outL.position.set(1.8, 0.8, 0);
    group.add(outL);
    const vccL = makeLabel('VCC');
    vccL.position.set(-0.2, 2.0, 0);
    group.add(vccL);

  } else if (type === 'common_base') {
    const q2 = makeTransistor(THREE, V3(0, 0, 0));
    group.add(q2);
    // Base grounded
    group.add(makeWire(V3(-0.5, 0, 0), V3(-0.5, -0.8, 0), { color: 0x4b5563, radius: 0.02 }));
    // Input at emitter
    group.add(makeWire(V3(-2.0, -0.3, 0), V3(-0.5, -0.3, 0), { color: 0x22c55e, radius: 0.025 }));
    group.add(makeC(V3(-1.2, -0.3, 0), 0, 'C<sub>1</sub> &bull; Input coupling capacitor &bull; AC couples input to emitter'));
    // Output at collector
    group.add(makeWire(V3(0.3, 0, 0), V3(0.3, 0.6, 0), { color: 0x60a5fa, radius: 0.025 }));
    group.add(makeR(V3(0.3, 0.9, 0)));
    group.add(makeWire(V3(0.3, 1.2, 0), V3(0.3, 1.6, 0), { color: 0xef4444, radius: 0.02 }));
    group.add(makeVDot(V3(0.3, 1.6, 0), 0xef4444));
    group.add(makeWire(V3(0.3, 0.6, 0), V3(1.5, 0.6, 0), { color: 0x60a5fa, radius: 0.025 }));
    group.add(makeC(V3(0.8, 0.6, 0), 0, 'C<sub>2</sub> &bull; Output coupling capacitor'));

  } else if (type === 'common_collector') {
    const q3 = makeTransistor(THREE, V3(0, 0.1, 0));
    group.add(q3);
    group.add(makeWire(V3(-2.0, 0.3, 0), V3(-0.5, 0.3, 0), { color: 0x22c55e, radius: 0.025 }));
    group.add(makeC(V3(-1.2, 0.3, 0), 0, 'C<sub>1</sub> &bull; Input coupling capacitor (CC amp)'));
    group.add(makeWire(V3(0, 0.5, 0), V3(0, 1.2, 0), { color: 0xef4444, radius: 0.02 }));
    group.add(makeVDot(V3(0, 1.2, 0), 0xef4444));
    group.add(makeWire(V3(-0.5, -0.2, 0), V3(-0.5, -0.6, 0), { color: 0x22c55e, radius: 0.025 }));
    group.add(makeR(V3(-0.5, -0.9, 0)));
    group.add(makeWire(V3(-0.5, -1.2, 0), V3(-0.5, -1.6, 0), { color: 0x4b5563, radius: 0.02 }));
    // Output from emitter
    group.add(makeWire(V3(-0.5, -0.2, 0), V3(1.0, -0.2, 0), { color: 0x60a5fa, radius: 0.025 }));
    group.add(makeC(V3(0.4, -0.2, 0), 0, 'C<sub>2</sub> &bull; Output coupling capacitor (emitter follower)'));

  } else if (type === 'differential_pair') {
    const qL = makeTransistor(THREE, V3(-0.5, 0, 0));
    const qR = makeTransistor(THREE, V3(0.5, 0, 0));
    group.add(qL, qR);
    // Emitters together
    group.add(makeWire(V3(-0.5, -0.4, 0), V3(0, -0.7, 0), { color: COLORS.wireOff, radius: 0.025 }));
    group.add(makeWire(V3(0.5, -0.4, 0), V3(0, -0.7, 0), { color: COLORS.wireOff, radius: 0.025 }));
    group.add(makeWire(V3(0, -0.7, 0), V3(0, -1.5, 0), { color: 0x4b5563, radius: 0.02 }));
    group.add(makeR(V3(0, -1.8, 0), 'R<sub>EE</sub> &bull; Emitter tail resistor &bull; Provides common-mode rejection'));
    group.add(makeWire(V3(0, -2.1, 0), V3(0, -2.5, 0), { color: 0x4b5563, radius: 0.02 }));
    // RC loads
    group.add(makeR(V3(-0.5, 0.5, 0)));
    group.add(makeWire(V3(-0.5, 0.8, 0), V3(-0.5, 1.4, 0), { color: 0xef4444, radius: 0.02 }));
    group.add(makeVDot(V3(-0.5, 1.4, 0), 0xef4444));
    group.add(makeR(V3(0.5, 0.5, 0)));
    group.add(makeWire(V3(0.5, 0.8, 0), V3(0.5, 1.4, 0), { color: 0xef4444, radius: 0.02 }));
    group.add(makeVDot(V3(0.5, 1.4, 0), 0xef4444));
    // Inputs
    group.add(makeWire(V3(-2.0, 0.3, 0), V3(-0.8, 0.3, 0), { color: 0x22c55e, radius: 0.025 }));
    group.add(makeWire(V3(2.0, 0.3, 0), V3(0.8, 0.3, 0), { color: 0x22c55e, radius: 0.025 }));
    // Outputs
    group.add(makeWire(V3(-0.5, 0, 0), V3(-0.5, 0.4, 0), { color: 0x60a5fa, radius: 0.02 }));
    group.add(makeWire(V3(0.5, 0, 0), V3(0.5, 0.4, 0), { color: 0x60a5fa, radius: 0.02 }));

  } else if (type === 'darlington_pair') {
    const q1 = makeTransistor(THREE, V3(0, 0.25, 0));
    const q2 = makeTransistor(THREE, V3(0, -0.25, 0));
    group.add(q1, q2);
    // Q1 emitter -> Q2 base
    group.add(makeWire(V3(-0.2, 0.05, 0), V3(-0.2, -0.05, 0), { color: COLORS.wireOff, radius: 0.02 }));
    // Input to Q1 base
    group.add(makeWire(V3(-2.0, 0.4, 0), V3(-0.5, 0.4, 0), { color: 0x22c55e, radius: 0.025 }));
    // Output from Q2 emitter
    group.add(makeWire(V3(-0.5, -0.4, 0), V3(1.5, -0.4, 0), { color: 0x60a5fa, radius: 0.025 }));
    // Collector (both to VCC)
    group.add(makeWire(V3(0.3, 0.25, 0), V3(0.3, 0.8, 0), { color: 0xef4444, radius: 0.02 }));
    group.add(makeWire(V3(0.3, -0.25, 0), V3(0.3, 0.8, 0), { color: 0xef4444, radius: 0.02 }));
    group.add(makeWire(V3(0.3, 0.8, 0), V3(0.3, 1.4, 0), { color: 0xef4444, radius: 0.02 }));
    group.add(makeVDot(V3(0.3, 1.4, 0), 0xef4444));
    // Q2 emitter resistor
    group.add(makeR(V3(0, -0.6, 0)));
    group.add(makeWire(V3(0, -0.8, 0), V3(0, -1.2, 0), { color: 0x4b5563, radius: 0.02 }));

  } else if (type === 'push_pull') {
    const qN = makeTransistor(THREE, V3(0, 0.3, 0), true);
    const qP = makeTransistor(THREE, V3(0, -0.3, 0), false);
    group.add(qN, qP);
    // Input to both bases
    group.add(makeWire(V3(-1.5, 0.3, 0), V3(-0.5, 0.3, 0), { color: 0x22c55e, radius: 0.025 }));
    group.add(makeWire(V3(-1.5, -0.3, 0), V3(-0.5, -0.3, 0), { color: 0x22c55e, radius: 0.025 }));
    group.add(makeWire(V3(-2.0, 0, 0), V3(-1.5, 0, 0), { color: 0x22c55e, radius: 0.025 }));
    // Output (junction)
    group.add(makeWire(V3(-0.5, 0, 0), V3(1.5, 0, 0), { color: 0x60a5fa, radius: 0.025 }));
    // VCC / VEE
    group.add(makeWire(V3(0, 0.5, 0), V3(0, 1.2, 0), { color: 0xef4444, radius: 0.02 }));
    group.add(makeVDot(V3(0, 1.2, 0), 0xef4444));
    group.add(makeWire(V3(0, -0.5, 0), V3(0, -1.2, 0), { color: 0x3b82f6, radius: 0.02 }));
    group.add(makeVDot(V3(0, -1.2, 0), 0x3b82f6));

  } else if (type === 'cascode') {
    const qC = makeTransistor(THREE, V3(0, 0.25, 0), true);
    const qCS = makeTransistor(THREE, V3(0, -0.25, 0), true);
    group.add(qC, qCS);
    group.add(makeWire(V3(-2.0, -0.1, 0), V3(-0.5, -0.1, 0), { color: 0x22c55e, radius: 0.025 }));
    group.add(makeWire(V3(0, 0.55, 0), V3(0, 1.0, 0), { color: 0xef4444, radius: 0.02 }));
    group.add(makeR(V3(0, 1.3, 0)));
    group.add(makeWire(V3(0, 1.6, 0), V3(0, 2.2, 0), { color: 0xef4444, radius: 0.02 }));
    group.add(makeVDot(V3(0, 2.2, 0), 0xef4444));
    group.add(makeWire(V3(0.3, 0, 0), V3(1.5, 0, 0), { color: 0x60a5fa, radius: 0.025 }));
    // Cascode base bias
    group.add(makeWire(V3(0.5, 0.25, 0), V3(0.5, 0.6, 0), { color: COLORS.wireOff, radius: 0.02 }));

  } else if (type === 'instrumentation_amp') {
    // Three op-amp structure
    const sz = 0.5;
    const shape = new THREE.Shape();
    shape.moveTo(-sz, -sz);
    shape.lineTo(-sz, sz);
    shape.lineTo(sz, 0);
    shape.closePath();
    const makeOpAmp = (pos) => {
      const m = new THREE.Mesh(
        new THREE.ExtrudeGeometry(shape, { depth: 0.2, bevelEnabled: false }),
        stdMat(0x334155, { style }),
      );
      m.position.copy(pos);
      return m;
    };
    const a1 = makeOpAmp(V3(-0.6, 0.3, 0));
    const a2 = makeOpAmp(V3(-0.6, -0.3, 0));
    const a3 = makeOpAmp(V3(0.6, 0, 0));
    group.add(a1, a2, a3);
    // Inputs
    group.add(makeWire(V3(-2.0, 0.5, 0), V3(-0.9, 0.5, 0), { color: 0x22c55e, radius: 0.02 }));
    group.add(makeWire(V3(-2.0, -0.5, 0), V3(-0.9, -0.5, 0), { color: 0x22c55e, radius: 0.02 }));
    // RG resistor between A1/A2
    group.add(makeR(V3(-0.6, 0, 0)));
    // A3 summing
    group.add(makeWire(V3(-0.3, 0.3, 0), V3(0.3, 0.2, 0), { color: COLORS.wireOff, radius: 0.02 }));
    group.add(makeWire(V3(-0.3, -0.3, 0), V3(0.3, -0.2, 0), { color: COLORS.wireOff, radius: 0.02 }));
    // Output
    group.add(makeWire(V3(1.0, 0, 0), V3(1.8, 0, 0), { color: 0x60a5fa, radius: 0.025 }));

    const outLbl = makeLabel('Vout');
    outLbl.position.set(2.2, 0.3, 0);
    group.add(outLbl);

  } else if (type === 'multistage_amp') {
    // Two CE stages cascaded
    for (let stage = 0; stage < 2; stage++) {
      const x = -0.8 + stage * 1.6;
      const q = makeTransistor(THREE, V3(x, 0, 0));
      group.add(q);
      group.add(makeR(V3(x, 0.5, 0)));
      group.add(makeWire(V3(x, 0.8, 0), V3(x, 1.2, 0), { color: 0xef4444, radius: 0.02 }));
      group.add(makeVDot(V3(x, 1.2, 0), 0xef4444));
      group.add(makeWire(V3(x, -0.4, 0), V3(x, -0.8, 0), { color: 0x4b5563, radius: 0.02 }));
      if (stage === 0) {
        group.add(makeWire(V3(-2.0, 0.3, 0), V3(x - 0.5, 0.3, 0), { color: 0x22c55e, radius: 0.025 }));
        // Inter-stage coupling
        group.add(makeC(V3(x + 0.3, 0, 0)));
        group.add(makeWire(V3(x + 0.3, 0, 0), V3(x + 0.8, 0.3, 0), { color: 0x60a5fa, radius: 0.02 }));
      } else {
        group.add(makeWire(V3(x + 0.3, 0, 0), V3(1.5, 0, 0), { color: 0x60a5fa, radius: 0.025 }));
      }
    }
  }

  group.position.y = -0.2;
  return {
    group,
    targets: { amplifier: { objects: [group] } },
    tick() {},
  };
}
