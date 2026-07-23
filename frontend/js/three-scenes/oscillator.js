// Oscillator circuits category builder.
// types: rc_phase_shift, wien_bridge, colpitts, hartley, crystal, ring_oscillator, relaxation_osc, astable_multivibrator, lc_oscillator, vco_block
import { V3, COLORS, stdMat, makeWire, makeFlow, makeLabel } from './common.js';

export function build({ THREE, style, params, quality, template }) {
  const group = new THREE.Group();
  const type = template || 'rc_phase_shift';
  const seg = quality === 'low' ? 6 : 12;
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const wireR = 0.03;

  const makeR = (pos) => {
    const pts = [];
    for (let i = 0; i <= 7; i++) pts.push(V3((i / 7 - 0.5) * 0.4, i % 2 === 0 ? 0 : 0.15, 0));
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, 0.018, 4, false),
      new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.5, metalness: 0.2 }));
    m.position.copy(pos); return m;
  };
  const makeC = (pos) => {
    const g = new THREE.Group(); const mat = stdMat(0x60a5fa, { style });
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.25, 0.1), mat); p1.position.set(-0.04, 0, 0);
    const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.25, 0.1), mat); p2.position.set(0.04, 0, 0);
    g.add(p1, p2); g.position.copy(pos); return g;
  };
  const makeL = (pos) => {
    const pts = []; const turns = 5;
    for (let i = 0; i <= turns * 8; i++) {
      const t = i / (turns * 8);
      pts.push(V3((t - 0.5) * 0.25, Math.cos(t * turns * Math.PI * 2) * 0.18, Math.sin(t * turns * Math.PI * 2) * 0.18));
    }
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), turns * 8, 0.018, 4, false),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.4, metalness: 0.3 }));
    m.position.copy(pos); return m;
  };
  const makeOpAmp = (pos) => {
    const shape = new THREE.Shape(); const sz = 0.4;
    shape.moveTo(-sz, -sz); shape.lineTo(-sz, sz); shape.lineTo(sz, 0); shape.closePath();
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.2, bevelEnabled: false }), stdMat(0x334155, { style }));
    m.position.copy(pos); return m;
  };
  // Sine wave indicator
  const makeSineWave = (pos, color = 0x22c55e) => {
    const pts = [];
    for (let i = 0; i <= 20; i++) {
      const t = (i / 20) * 1.5 - 0.75;
      pts.push(V3(t, Math.sin(t * 6) * 0.2, 0.05));
    }
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.012, 4, false),
      new THREE.MeshBasicMaterial({ color }));
    m.position.copy(pos); return m;
  };

  if (type === 'rc_phase_shift') {
    const opAmp = makeOpAmp(V3(0.6, 0, 0)); group.add(opAmp);
    for (let i = 0; i < 3; i++) {
      const x = -1.4 + i * 0.5;
      group.add(makeR(V3(x, 0.3, 0)));
      group.add(makeC(V3(x + 0.2, -0.1, 0)));
      group.add(makeWire(V3(x + 0.2, -0.2, 0), V3(x + 0.2, -0.6, 0), { color: 0x4b5563, radius: wireR * 0.6 }));
      if (i < 2) group.add(makeWire(V3(x + 0.45, 0.3, 0), V3(x + 0.7, 0.3, 0), { color: COLORS.wireOff, radius: wireR * 0.7 }));
    }
    group.add(makeWire(V3(0.2, 0, 0), V3(-1.4, 0, 0), { color: COLORS.wireOff, radius: wireR * 0.7 }));
    group.add(makeWire(V3(1.0, 0, 0), V3(1.8, 0, 0), { color: 0x60a5fa, radius: wireR }));
    group.add(makeSineWave(V3(2.2, 0, 0)));
    const lbl = makeLabel('OUT'); lbl.position.set(2.2, 0.4, 0); group.add(lbl);

  } else if (type === 'wien_bridge') {
    const opAmp2 = makeOpAmp(V3(0.6, 0, 0)); group.add(opAmp2);
    group.add(makeR(V3(-0.6, 0.5, 0))); group.add(makeC(V3(-0.6, 0, 0)));
    group.add(makeR(V3(0, 0.5, 0))); group.add(makeC(V3(0, 0, 0)));
    group.add(makeWire(V3(-0.6, 0.8, 0), V3(0, 0.8, 0), { color: COLORS.wireOff, radius: wireR * 0.7 }));
    group.add(makeWire(V3(0.6, 0.3, 0), V3(0.8, 0.5, 0), { color: COLORS.wireOff, radius: wireR * 0.7 }));
    group.add(makeWire(V3(-0.4, 0.5, 0), V3(-0.6, 0.5, 0), { color: 0x22c55e, radius: wireR * 0.7 }));
    group.add(makeWire(V3(1.0, 0, 0), V3(1.8, 0, 0), { color: 0x60a5fa, radius: wireR }));
    group.add(makeSineWave(V3(2.2, 0, 0)));

  } else if (type === 'colpitts' || type === 'lc_oscillator' || type === 'vco_block' || type === 'hartley') {
    const isColpitts = type === 'colpitts';
    const q = new THREE.Group();
    const shape = new THREE.Shape();
    shape.moveTo(-0.4, -0.35); shape.lineTo(0.25, 0); shape.lineTo(-0.4, 0.35); shape.closePath();
    q.add(new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.2, bevelEnabled: false }), stdMat(COLORS.nType, { style })));
    q.position.set(0, 0, 0); group.add(q);

    if (isColpitts) {
      group.add(makeL(V3(0.3, 0.4, 0)));
      group.add(makeC(V3(-0.2, 0.4, 0))); group.add(makeC(V3(0.6, 0.4, 0)));
      group.add(makeWire(V3(0.3, 0.7, 0), V3(0.3, 1.2, 0), { color: 0xef4444, radius: wireR * 0.7 }));
    } else {
      group.add(makeC(V3(0.3, 0.4, 0)));
      group.add(makeL(V3(-0.2, 0.4, 0))); group.add(makeL(V3(0.6, 0.4, 0)));
      group.add(makeWire(V3(0.3, 0.7, 0), V3(0.3, 1.2, 0), { color: 0xef4444, radius: wireR * 0.7 }));
    }
    group.add(makeWire(V3(-0.4, 0, 0), V3(-1.2, 0, 0), { color: 0x4b5563, radius: wireR * 0.7 }));
    group.add(makeWire(V3(0.25, 0, 0), V3(1.2, 0, 0), { color: 0x60a5fa, radius: wireR }));
    group.add(makeSineWave(V3(1.6, 0, 0)));

  } else if (type === 'crystal') {
    // Crystal symbol: rectangle with crystal lattice lines
    const rect = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.2), stdMat(0x94a3b8, { style }));
    rect.position.set(0, 0, 0); group.add(rect);
    // Lattice lines
    for (let i = -1; i <= 1; i++) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.22), stdMat(0xe2e8f0, { style }));
      line.position.set(0, i * 0.1, 0); group.add(line);
    }
    group.add(makeWire(V3(-0.5, 0, 0), V3(-1.5, 0, 0), { color: COLORS.wireOff, radius: wireR }));
    group.add(makeWire(V3(0.5, 0, 0), V3(1.5, 0, 0), { color: 0x60a5fa, radius: wireR }));
    // Crystal caps
    group.add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.22), stdMat(COLORS.metal, { style })));
    group.add(makeSineWave(V3(1.8, 0, 0)));
    const lbl2 = makeLabel('XTAL'); lbl2.position.set(0, 0.6, 0); group.add(lbl2);

  } else if (type === 'ring_oscillator') {
    // 3 inverters in a loop
    for (let i = 0; i < 3; i++) {
      const x = -1.0 + i * 1.0;
      const inv = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.2), stdMat(COLORS.pType, { style }));
      inv.position.set(x, 0, 0); group.add(inv);
      // Inverter symbol (triangle + bubble)
      const tri = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.2, 3), stdMat(COLORS.metal, { style }));
      tri.position.set(x + 0.25, 0, 0.1); tri.rotation.z = -Math.PI / 2; group.add(tri);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), stdMat(COLORS.metal, { style }));
      dot.position.set(x + 0.35, 0, 0.1); group.add(dot);

      if (i < 2) group.add(makeWire(V3(x + 0.4, 0, 0), V3(x + 0.6, 0, 0), { color: 0x22c55e, radius: wireR * 0.7 }));
    }
    // Feedback loop
    group.add(makeWire(V3(1.4, 0, 0), V3(1.4, 0.6, 0), { color: 0x60a5fa, radius: wireR * 0.6 }));
    group.add(makeWire(V3(1.4, 0.6, 0), V3(-1.4, 0.6, 0), { color: 0x60a5fa, radius: wireR * 0.6 }));
    group.add(makeWire(V3(-1.4, 0.6, 0), V3(-1.4, 0, 0), { color: 0x60a5fa, radius: wireR * 0.6 }));
    // Output
    group.add(makeWire(V3(1.4, 0, 0), V3(2.0, 0, 0), { color: 0x60a5fa, radius: wireR }));
    group.add(makeSineWave(V3(2.3, 0, 0), 0xfde047));

  } else if (type === 'relaxation_osc') {
    const opAmp3 = makeOpAmp(V3(0.5, 0, 0)); group.add(opAmp3);
    group.add(makeC(V3(-0.4, -0.2, 0)));
    group.add(makeWire(V3(-0.4, -0.35, 0), V3(-0.4, -0.8, 0), { color: 0x4b5563, radius: wireR * 0.6 }));
    // Feedback resistor
    group.add(makeR(V3(0.5, 0.5, 0)));
    group.add(makeWire(V3(0.9, 0, 0), V3(0.9, 0.5, 0), { color: COLORS.wireOff, radius: wireR * 0.7 }));
    group.add(makeWire(V3(0.9, 0.5, 0), V3(0.2, 0.5, 0), { color: COLORS.wireOff, radius: wireR * 0.7 }));
    // Input
    group.add(makeWire(V3(-0.5, 0.2, 0), V3(-0.5, 0.5, 0), { color: COLORS.wireOff, radius: wireR * 0.7 }));
    group.add(makeWire(V3(-0.5, 0.5, 0), V3(0.2, 0.5, 0), { color: COLORS.wireOff, radius: wireR * 0.7 }));
    group.add(makeWire(V3(0.9, 0, 0), V3(1.6, 0, 0), { color: 0x60a5fa, radius: wireR }));
    group.add(makeSineWave(V3(1.9, 0, 0), 0xfde047));

  } else if (type === 'astable_multivibrator') {
    // Two transistors with cross-coupling
    for (let i = 0; i < 2; i++) {
      const x = -0.5 + i * 1.0;
      const q2 = new THREE.Group();
      const shape2 = new THREE.Shape();
      shape2.moveTo(-0.3, -0.25); shape2.lineTo(0.2, 0); shape2.lineTo(-0.3, 0.25); shape2.closePath();
      q2.add(new THREE.Mesh(new THREE.ExtrudeGeometry(shape2, { depth: 0.15, bevelEnabled: false }), stdMat(COLORS.nType, { style })));
      q2.position.set(x, 0, 0); group.add(q2);
      // RC networks
      group.add(makeR(V3(x, 0.4, 0)));
      group.add(makeWire(V3(x, 0.7, 0), V3(x, 1.0, 0), { color: 0xef4444, radius: wireR * 0.6 }));
      group.add(makeC(V3(x + 0.4, 0.2, 0)));
      group.add(makeWire(V3(x + 0.4, 0.35, 0), V3(x + 0.4, 0.7, 0), { color: COLORS.wireOff, radius: wireR * 0.6 }));
      // Cross coupling
      if (i === 0) {
        group.add(makeWire(V3(x + 0.5, 0, 0), V3(x + 1.2, 0, 0), { color: 0x60a5fa, radius: wireR * 0.6 }));
        group.add(makeWire(V3(x + 1.2, 0, 0), V3(x + 1.2, 0.5, 0), { color: 0x60a5fa, radius: wireR * 0.6 }));
        group.add(makeWire(V3(x + 1.2, 0.5, 0), V3(x + 1.0, 0.5, 0), { color: 0x60a5fa, radius: wireR * 0.6 }));
      }
    }
    group.add(makeSineWave(V3(1.0, -0.5, 0), 0xfde047));
  }

  group.position.y = -0.2;
  return { group, targets: { oscillator: { objects: [group] } }, tick() {} };
}
