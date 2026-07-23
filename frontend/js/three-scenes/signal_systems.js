// Signal processing & control systems category builder.
// types: pll, pid_controller, feedback_system, sample_hold, flash_adc, r2r_dac, mixer, vco_block
import { V3, COLORS, stdMat, makeWire, makeFlow, makeLabel } from './common.js';

export function build({ THREE, style, params, quality, template }) {
  const group = new THREE.Group();
  const type = template || 'pll';
  const seg = quality === 'low' ? 6 : 12;
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

  const makeBlock = (pos, w, h, color = 0x475569, label = '') => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.3), stdMat(color, { style }));
    m.position.copy(pos); group.add(m);
    if (label) { const l = makeLabel(label); l.position.set(pos.x, pos.y + h/2 + 0.3, 0); group.add(l); }
  };
  const makeOpAmp = (pos) => {
    const shape = new THREE.Shape(); const sz = 0.35;
    shape.moveTo(-sz, -sz); shape.lineTo(-sz, sz); shape.lineTo(sz, 0); shape.closePath();
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.15, bevelEnabled: false }), stdMat(0x334155, { style }));
    m.position.copy(pos); group.add(m);
  };

  if (type === 'pll') {
    // PLL: Phase Detector -> Loop Filter -> VCO -> Divider
    makeBlock(V3(-1.2, 0, 0), 0.8, 0.6, 0x475569, 'PD');
    makeBlock(V3(-0.2, 0, 0), 0.6, 0.4, 0x64748b, 'LPF');
    makeBlock(V3(0.7, 0, 0), 0.6, 0.5, 0x475569, 'VCO');
    makeBlock(V3(1.6, -0.3, 0), 0.5, 0.4, 0x64748b, '/N');
    group.add(makeWire(V3(-0.8, 0, 0), V3(-0.5, 0, 0), { color: COLORS.wireOff, radius: 0.025 }));
    group.add(makeWire(V3(0.1, 0, 0), V3(0.4, 0, 0), { color: COLORS.wireOff, radius: 0.025 }));
    group.add(makeWire(V3(1.0, 0, 0), V3(1.35, 0, 0), { color: COLORS.wireOff, radius: 0.025 }));
    // Feedback
    group.add(makeWire(V3(1.6, -0.5, 0), V3(1.6, -0.9, 0), { color: 0x60a5fa, radius: 0.02 }));
    group.add(makeWire(V3(1.6, -0.9, 0), V3(-1.6, -0.9, 0), { color: 0x60a5fa, radius: 0.02 }));
    group.add(makeWire(V3(-1.6, -0.9, 0), V3(-1.6, -0.3, 0), { color: 0x60a5fa, radius: 0.02 }));
    // Input
    group.add(makeWire(V3(-2.2, 0.3, 0), V3(-1.6, 0.3, 0), { color: 0x22c55e, radius: 0.025 }));
    // Output
    group.add(makeWire(V3(1.0, 0.3, 0), V3(1.0, 0.9, 0), { color: 0x60a5fa, radius: 0.025 }));
    group.add(makeWire(V3(1.0, 0.9, 0), V3(2.2, 0.9, 0), { color: 0x60a5fa, radius: 0.025 }));
    const refL = makeLabel('Ref'); refL.position.set(-2.6, 0.5, 0); group.add(refL);
    const outL2 = makeLabel('Out'); outL2.position.set(2.6, 1.1, 0); group.add(outL2);

  } else if (type === 'pid_controller') {
    // PID: P + I + D paths in parallel
    makeBlock(V3(-0.8, 0, 0), 0.6, 0.8, 0x475569, 'P');
    makeBlock(V3(-0.8, -0.6, 0), 0.6, 0.4, 0x64748b, 'I');
    makeBlock(V3(-0.8, 0.6, 0), 0.6, 0.4, 0x64748b, 'D');
    // Summing junction
    const sumCirc = new THREE.Mesh(new THREE.RingGeometry(0.15, 0.22, 12), stdMat(0x22c55e, { style }));
    sumCirc.position.set(0.3, 0, 0); group.add(sumCirc);
    // Connections
    group.add(makeWire(V3(-2.0, 0, 0), V3(-1.1, 0, 0), { color: 0x22c55e, radius: 0.025 }));
    group.add(makeWire(V3(-0.5, 0.6, 0), V3(0.15, 0.1, 0), { color: COLORS.wireOff, radius: 0.02 }));
    group.add(makeWire(V3(-0.5, 0, 0), V3(0.15, 0, 0), { color: COLORS.wireOff, radius: 0.02 }));
    group.add(makeWire(V3(-0.5, -0.6, 0), V3(0.15, -0.1, 0), { color: COLORS.wireOff, radius: 0.02 }));
    group.add(makeWire(V3(0.5, 0, 0), V3(1.5, 0, 0), { color: 0x60a5fa, radius: 0.025 }));
    const spL = makeLabel('SP'); spL.position.set(-2.4, 0.4, 0); group.add(spL);
    const pvL = makeLabel('PV'); pvL.position.set(1.9, 0.4, 0); group.add(pvL);

  } else if (type === 'feedback_system') {
    makeBlock(V3(-0.6, 0, 0), 0.8, 0.6, 0x475569, 'Controller');
    makeBlock(V3(0.6, 0, 0), 0.8, 0.6, 0x64748b, 'Plant');
    // Summing junction
    const sumJ = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.18, 10), stdMat(0x22c55e, { style }));
    sumJ.position.set(-1.6, 0, 0); group.add(sumJ);
    group.add(makeWire(V3(-2.2, 0, 0), V3(-1.8, 0, 0), { color: 0x22c55e, radius: 0.025 }));
    group.add(makeWire(V3(-1.4, 0, 0), V3(-1.0, 0, 0), { color: COLORS.wireOff, radius: 0.025 }));
    group.add(makeWire(V3(-0.2, 0, 0), V3(0.2, 0, 0), { color: COLORS.wireOff, radius: 0.025 }));
    group.add(makeWire(V3(1.0, 0, 0), V3(1.6, 0, 0), { color: 0x60a5fa, radius: 0.025 }));
    // Feedback
    group.add(makeWire(V3(1.4, -0.3, 0), V3(1.4, -0.7, 0), { color: 0x60a5fa, radius: 0.02 }));
    group.add(makeWire(V3(1.4, -0.7, 0), V3(-1.8, -0.7, 0), { color: 0x60a5fa, radius: 0.02 }));
    group.add(makeWire(V3(-1.8, -0.7, 0), V3(-1.8, -0.2, 0), { color: 0x60a5fa, radius: 0.02 }));
    // Sensor block
    makeBlock(V3(1.4, -0.3, 0), 0.4, 0.25, 0x64748b, '');

  } else if (type === 'sample_hold') {
    // S/H: Switch + Capacitor + Buffer
    const sw = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.15), stdMat(0x22c55e, { style }));
    sw.position.set(-0.5, 0, 0); group.add(sw);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.4, 0.15), stdMat(0x60a5fa, { style }));
    cap.position.set(0.2, -0.2, 0); group.add(cap);
    const buf = makeOpAmp(V3(0.7, 0, 0));
    group.add(makeWire(V3(-1.5, 0, 0), V3(-0.65, 0, 0), { color: 0x22c55e, radius: 0.025 }));
    group.add(makeWire(V3(-0.35, 0, 0), V3(0.1, 0, 0), { color: COLORS.wireOff, radius: 0.025 }));
    group.add(makeWire(V3(0.4, 0.2, 0), V3(0.4, 0.5, 0), { color: COLORS.wireOff, radius: 0.02 }));
    group.add(makeWire(V3(0.4, 0.5, 0), V3(-0.2, 0.5, 0), { color: COLORS.wireOff, radius: 0.02 }));
    group.add(makeWire(V3(0.4, -0.2, 0), V3(0.4, -0.5, 0), { color: 0x4b5563, radius: 0.02 }));
    group.add(makeWire(V3(1.05, 0, 0), V3(1.6, 0, 0), { color: 0x60a5fa, radius: 0.025 }));
    const clkL = makeLabel('CLK'); clkL.position.set(-0.5, 0.5, 0); group.add(clkL);

  } else if (type === 'flash_adc') {
    // 3-bit flash ADC: 7 comparators
    for (let i = 0; i < 7; i++) {
      const y = 0.9 - i * 0.3;
      const comp = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.15), stdMat(0x64748b, { style }));
      comp.position.set(-0.3, y, 0); group.add(comp);
      // Reference ladder
      group.add(makeWire(V3(-0.6, y, 0), V3(-0.45, y, 0), { color: 0xef4444, radius: 0.015 }));
      group.add(makeWire(V3(-0.6, y, 0), V3(-0.6, y + 0.15, 0), { color: 0xef4444, radius: 0.015 }));
    }
    group.add(makeWire(V3(-0.6, 0.9, 0), V3(-0.6, 1.3, 0), { color: 0xef4444, radius: 0.02 }));
    group.add(makeWire(V3(-0.6, 1.3, 0), V3(0.6, 1.3, 0), { color: 0xef4444, radius: 0.02 }));
    // Input
    group.add(makeWire(V3(-1.5, 0.5, 0), V3(-1.0, 0.5, 0), { color: 0x22c55e, radius: 0.025 }));
    group.add(makeWire(V3(-1.0, 0.5, 0), V3(-1.0, 0, 0), { color: 0x22c55e, radius: 0.02 }));
    for (let i = 0; i < 7; i++) {
      group.add(makeWire(V3(-1.0, 0.9 - i * 0.3, 0), V3(-0.45, 0.9 - i * 0.3, 0), { color: 0x22c55e, radius: 0.015 }));
    }
    // Encoder
    makeBlock(V3(0.5, 0, 0), 0.6, 0.6, 0x475569, 'ENC');
    for (let i = 0; i < 7; i++) {
      group.add(makeWire(V3(0, 0.9 - i * 0.3, 0), V3(0.2, 0.9 - i * 0.3, 0), { color: COLORS.wireOff, radius: 0.015 }));
    }

  } else if (type === 'r2r_dac') {
    // R-2R ladder
    for (let i = 0; i < 4; i++) {
      const x = -1.2 + i * 0.6;
      // 2R vertical
      const r2v = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.25, 0.1), stdMat(0xf97316, { style }));
      r2v.position.set(x, -0.2, 0); group.add(r2v);
      // R horizontal
      if (i < 3) {
        const rh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.1), stdMat(0xf97316, { style }));
        rh.position.set(x + 0.3, 0, 0); group.add(rh);
      }
      // 2R to ground
      group.add(makeWire(V3(x, -0.3, 0), V3(x, -0.7, 0), { color: 0x4b5563, radius: 0.015 }));
      // Bit input
      const bitLabel = makeLabel(`D${i}`); bitLabel.position.set(x, 0.4, 0); group.add(bitLabel);
    }
    // Op-amp output
    makeOpAmp(V3(0.8, 0, 0));
    group.add(makeWire(V3(0.6, 0, 0), V3(0.6, -0.3, 0), { color: COLORS.wireOff, radius: 0.02 }));
    group.add(makeWire(V3(0.6, -0.3, 0), V3(1.0, -0.3, 0), { color: COLORS.wireOff, radius: 0.02 }));
    group.add(makeWire(V3(1.15, 0, 0), V3(1.8, 0, 0), { color: 0x60a5fa, radius: 0.025 }));

  } else if (type === 'mixer') {
    // Mixer with two inputs and one output
    const mixSym = new THREE.Mesh(new THREE.CircleGeometry(0.4, seg), stdMat(0x475569, { style }));
    mixSym.position.set(0, 0, 0); group.add(mixSym);
    const xSym = makeLabel('X'); xSym.position.set(0, 0, 0.2); group.add(xSym);
    group.add(makeWire(V3(-1.5, 0.3, 0), V3(-0.4, 0.15, 0), { color: 0x22c55e, radius: 0.025 }));
    group.add(makeWire(V3(-1.5, -0.3, 0), V3(-0.4, -0.15, 0), { color: 0x22c55e, radius: 0.025 }));
    group.add(makeWire(V3(0.4, 0, 0), V3(1.5, 0, 0), { color: 0x60a5fa, radius: 0.025 }));
    const f1L = makeLabel('f1'); f1L.position.set(-1.9, 0.5, 0); group.add(f1L);
    const f2L = makeLabel('f2'); f2L.position.set(-1.9, -0.5, 0); group.add(f2L);
    const fOutL = makeLabel('f1±f2'); fOutL.position.set(1.9, 0.4, 0); group.add(fOutL);

  } else if (type === 'vco_block') {
    // VCO: triangle to sine conversion
    const tri = new THREE.Shape();
    tri.moveTo(-0.5, 0); tri.lineTo(-0.3, 0.3); tri.lineTo(-0.1, -0.3); tri.lineTo(0.1, 0.3); tri.lineTo(0.3, -0.3); tri.lineTo(0.5, 0);
    const triMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: 0.1, bevelEnabled: false }), stdMat(0x64748b, { style }));
    triMesh.position.set(-0.4, 0, 0); group.add(triMesh);
    // Control voltage input
    group.add(makeWire(V3(-2.0, 0, 0), V3(-0.8, 0, 0), { color: 0x22c55e, radius: 0.025 }));
    // Sine wave output
    const sinePts = [];
    for (let i = 0; i <= 20; i++) {
      const t = (i / 20) * 1.5 - 0.75;
      sinePts.push(V3(t + 0.6, Math.sin(t * 6) * 0.25, 0.05));
    }
    group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sinePts), 12, 0.015, 4, false),
      new THREE.MeshBasicMaterial({ color: 0x60a5fa })));
    group.add(makeWire(V3(0.3, 0, 0), V3(0.4, 0, 0), { color: COLORS.wireOff, radius: 0.02 }));
    group.add(makeWire(V3(1.4, 0.25, 0), V3(2.0, 0.25, 0), { color: 0x60a5fa, radius: 0.025 }));
    const vctrl = makeLabel('Vctrl'); vctrl.position.set(-2.4, 0.4, 0); group.add(vctrl);
  }

  group.position.y = -0.2;
  return { group, targets: { system: { objects: [group] } }, tick() {} };
}
