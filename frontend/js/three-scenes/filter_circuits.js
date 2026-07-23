// Filter circuits category builder.
// params: { type, cutoff, order }
// types: rc_lowpass, rc_highpass, rlc_bandpass, rlc_bandstop, butterworth_lp,
//        butterworth_hp, chebyshev_lp, sallen_key_lp, sallen_key_hp, active_bpf
import { V3, COLORS, stdMat, makeWire, makeFlow, makeLabel } from './common.js';

export function build({ THREE, style, params, quality, template }) {
  const group = new THREE.Group();
  const type = template || 'rc_lowpass';
  const seg = quality === 'low' ? 6 : 12;
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

  const wireColor = COLORS.wireOff;
  const wireR = 0.03;

  const makeR = (pos) => {
    const pts = [];
    for (let i = 0; i <= 7; i++) {
      pts.push(V3((i / 7 - 0.5) * 0.5, i % 2 === 0 ? 0 : 0.18, 0));
    }
    const m = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.02, 4, false),
      new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.5, metalness: 0.2 }),
    );
    m.position.copy(pos);
    return m;
  };

  const makeC = (pos) => {
    const g = new THREE.Group();
    const mat = stdMat(0x60a5fa, { style });
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.3, 0.12), mat);
    p1.position.set(-0.05, 0, 0);
    const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.3, 0.12), mat);
    p2.position.set(0.05, 0, 0);
    g.add(p1, p2);
    g.position.copy(pos);
    return g;
  };

  const makeL = (pos) => {
    const pts = [];
    const turns = 5;
    for (let i = 0; i <= turns * 8; i++) {
      const t = i / (turns * 8);
      pts.push(V3((t - 0.5) * 0.3, Math.cos(t * turns * Math.PI * 2) * 0.2, Math.sin(t * turns * Math.PI * 2) * 0.2));
    }
    const m = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), turns * 8, 0.02, 4, false),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.4, metalness: 0.3 }),
    );
    m.position.copy(pos);
    return m;
  };

  // Op-amp triangle
  const makeOpAmp = (pos) => {
    const shape = new THREE.Shape();
    const sz = 0.4;
    shape.moveTo(-sz, -sz);
    shape.lineTo(-sz, sz);
    shape.lineTo(sz, 0);
    shape.closePath();
    const m = new THREE.Mesh(
      new THREE.ExtrudeGeometry(shape, { depth: 0.2, bevelEnabled: false }),
      stdMat(0x334155, { style }),
    );
    m.position.copy(pos);
    return m;
  };

  if (type === 'rc_lowpass' || type === 'rc_highpass') {
    const isLP = type === 'rc_lowpass';
    // Input
    group.add(makeWire(V3(-2.0, 0.4, 0), V3(-1.0, 0.4, 0), { color: 0x22c55e, radius: wireR }));
    if (isLP) {
      group.add(makeR(V3(-0.5, 0.4, 0)));
      group.add(makeWire(V3(0, 0.4, 0), V3(0.6, 0.4, 0), { color: wireColor, radius: wireR }));
      group.add(makeC(V3(0.6, 0, 0)));
      group.add(makeWire(V3(0.6, 0.25, 0), V3(0.6, 0.4, 0), { color: wireColor, radius: wireR * 0.8 }));
      group.add(makeWire(V3(0.6, -0.25, 0), V3(0.6, -0.6, 0), { color: 0x4b5563, radius: wireR * 0.7 }));
    } else {
      group.add(makeC(V3(-0.5, 0.4, 0)));
      group.add(makeWire(V3(0, 0.4, 0), V3(0.6, 0.4, 0), { color: wireColor, radius: wireR }));
      group.add(makeR(V3(0.6, 0, 0)));
      group.add(makeWire(V3(0.6, 0.25, 0), V3(0.6, 0.4, 0), { color: wireColor, radius: wireR * 0.8 }));
      group.add(makeWire(V3(0.6, -0.25, 0), V3(0.6, -0.6, 0), { color: 0x4b5563, radius: wireR * 0.7 }));
    }
    // Output
    group.add(makeWire(V3(1.0, 0.4, 0), V3(2.0, 0.4, 0), { color: 0x60a5fa, radius: wireR }));
    // Ground rail
    group.add(makeWire(V3(-2.0, -0.6, 0), V3(2.0, -0.6, 0), { color: 0x4b5563, radius: wireR * 0.7 }));

    // Frequency response curve
    const respPts = [];
    for (let i = 0; i <= 30; i++) {
      const t = i / 30;
      const atten = isLP ? 1 / (1 + t * 5) : t * 5 / (1 + t * 5);
      respPts.push(V3(t * 1.5 - 0.5, atten * 0.5 + 1.0, 0.05));
    }
    group.add(new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(respPts), 15, 0.015, 4, false),
      new THREE.MeshBasicMaterial({ color: 0x60a5fa }),
    ));

  } else if (type === 'rlc_bandpass' || type === 'rlc_bandstop' || type === 'active_bpf') {
    const isBP = type === 'rlc_bandpass';
    group.add(makeWire(V3(-2.0, 0.4, 0), V3(-1.0, 0.4, 0), { color: 0x22c55e, radius: wireR }));
    // RLC series
    group.add(makeR(V3(-0.5, 0.4, 0)));
    group.add(makeWire(V3(0, 0.4, 0), V3(0.3, 0.4, 0), { color: wireColor, radius: wireR }));
    group.add(makeL(V3(0.6, 0.4, 0)));
    group.add(makeWire(V3(1.0, 0.4, 0), V3(1.2, 0.4, 0), { color: wireColor, radius: wireR }));
    group.add(makeC(V3(1.6, 0.4, 0)));
    group.add(makeWire(V3(2.0, 0.4, 0), V3(2.5, 0.4, 0), { color: 0x60a5fa, radius: wireR }));
    // Return
    group.add(makeWire(V3(1.6, 0.15, 0), V3(1.6, -0.4, 0), { color: 0x4b5563, radius: wireR * 0.7 }));
    group.add(makeWire(V3(-0.5, 0.15, 0), V3(-0.5, -0.4, 0), { color: 0x4b5563, radius: wireR * 0.7 }));

    if (isBP) {
      // Bandpass resonance curve
      const bpPts = [];
      for (let i = 0; i <= 30; i++) {
        const t = i / 30;
        const resp = Math.exp(-(((t - 0.5) * 6) ** 2));
        bpPts.push(V3(t * 1.5 - 0.3, resp * 0.6 + 0.9, 0.05));
      }
      group.add(new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(bpPts), 15, 0.015, 4, false),
        new THREE.MeshBasicMaterial({ color: 0x22c55e }),
      ));
    }

  } else if (type === 'butterworth_lp' || type === 'butterworth_hp' || type === 'chebyshev_lp') {
    const isLP = type === 'butterworth_lp';
    // Sallen-Key topology (2nd order active)
    const opAmp = makeOpAmp(V3(0.6, 0, 0));
    group.add(opAmp);
    // Input
    group.add(makeWire(V3(-2.0, 0.4, 0), V3(-0.5, 0.4, 0), { color: 0x22c55e, radius: wireR }));
    if (isLP) {
      group.add(makeR(V3(-0.8, 0.4, 0)));
      group.add(makeC(V3(0, 0.4, 0)));
      group.add(makeWire(V3(0.3, 0.1, 0), V3(0.3, -0.3, 0), { color: wireColor, radius: wireR * 0.7 }));
      group.add(makeR(V3(0.5, -0.3, 0)));
      group.add(makeWire(V3(0.5, -0.55, 0), V3(0.5, -0.8, 0), { color: 0x4b5563, radius: wireR * 0.6 }));
    } else {
      group.add(makeC(V3(-0.8, 0.4, 0)));
      group.add(makeR(V3(0, 0.4, 0)));
      group.add(makeWire(V3(0.3, 0.1, 0), V3(0.3, -0.3, 0), { color: wireColor, radius: wireR * 0.7 }));
      group.add(makeC(V3(0.5, -0.3, 0)));
      group.add(makeWire(V3(0.5, -0.55, 0), V3(0.5, -0.8, 0), { color: 0x4b5563, radius: wireR * 0.6 }));
    }
    // Output
    group.add(makeWire(V3(1.0, 0, 0), V3(1.8, 0, 0), { color: 0x60a5fa, radius: wireR }));

  } else if (type === 'sallen_key_lp' || type === 'sallen_key_hp') {
    const isLP = type === 'sallen_key_lp';
    const opAmp2 = makeOpAmp(V3(0.6, 0, 0));
    group.add(opAmp2);
    group.add(makeWire(V3(-2.0, 0.4, 0), V3(-1.0, 0.4, 0), { color: 0x22c55e, radius: wireR }));

    if (isLP) {
      group.add(makeR(V3(-0.6, 0.4, 0)));
      group.add(makeR(V3(-0.2, 0.4, 0)));
      group.add(makeWire(V3(0.2, 0.4, 0), V3(0.6, 0.2, 0), { color: wireColor, radius: wireR * 0.7 }));
      group.add(makeC(V3(-0.6, 0.1, 0)));
      group.add(makeWire(V3(-0.6, -0.1, 0), V3(-0.6, -0.6, 0), { color: 0x4b5563, radius: wireR * 0.6 }));
      group.add(makeC(V3(0, 0, 0)));
      group.add(makeWire(V3(0, -0.25, 0), V3(0, -0.6, 0), { color: 0x4b5563, radius: wireR * 0.6 }));
    } else {
      group.add(makeC(V3(-0.6, 0.4, 0)));
      group.add(makeC(V3(-0.2, 0.4, 0)));
      group.add(makeWire(V3(0.2, 0.4, 0), V3(0.6, 0.2, 0), { color: wireColor, radius: wireR * 0.7 }));
      group.add(makeR(V3(-0.6, 0.1, 0)));
      group.add(makeWire(V3(-0.6, -0.1, 0), V3(-0.6, -0.6, 0), { color: 0x4b5563, radius: wireR * 0.6 }));
      group.add(makeR(V3(0, 0, 0)));
      group.add(makeWire(V3(0, -0.25, 0), V3(0, -0.6, 0), { color: 0x4b5563, radius: wireR * 0.6 }));
    }
    // Feedback
    group.add(makeWire(V3(0.6, 0.3, 0), V3(0.6, 0.7, 0), { color: wireColor, radius: wireR * 0.6 }));
    group.add(makeWire(V3(0.6, 0.7, 0), V3(-0.6, 0.7, 0), { color: wireColor, radius: wireR * 0.6 }));
    group.add(makeWire(V3(1.0, 0, 0), V3(1.8, 0, 0), { color: 0x60a5fa, radius: wireR }));
  }

  group.position.y = -0.2;
  return {
    group,
    targets: { filter: { objects: [group] } },
    tick() {},
  };
}
