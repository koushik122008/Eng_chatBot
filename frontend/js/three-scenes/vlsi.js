// VLSI / CMOS circuit layout category builder.
// types: cmos_inverter_layout, cmos_nand, cmos_nor, cmos_and, cmos_or, transmission_gate, pass_transistor, sram_cell_6t, dram_cell_1t, pla_block
import { V3, COLORS, stdMat, makeWire, makeFlow, makeLabel } from './common.js';

export function build({ THREE, style, params, quality, template }) {
  const group = new THREE.Group();
  const type = template || 'cmos_inverter_layout';
  const seg = quality === 'low' ? 8 : 16;
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

  // N-type diffusion
  const nDiff = (pos, w, h) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.5), stdMat(0x3b82f6, { style }));
    m.position.copy(pos); return m;
  };
  // P-type diffusion
  const pDiff = (pos, w, h) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.5), stdMat(0xf97316, { style }));
    m.position.copy(pos); return m;
  };
  // Polysilicon gate
  const poly = (pos, w, h) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.6), stdMat(0x9ca3af, { style }));
    m.position.copy(pos); return m;
  };
  // Metal contact
  const contact = (pos) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.7), stdMat(COLORS.wireOff, { style }));
    m.position.copy(pos); return m;
  };

  if (type === 'cmos_inverter_layout') {
    // Top: PMOS in N-well, Bottom: NMOS in P-substrate
    const nWell = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.6, 0.4), stdMat(0x1e3a5f, { style }));
    nWell.position.set(0, 0.9, 0); group.add(nWell);

    const pSub = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.6, 0.4), stdMat(0x3d1f0a, { style }));
    pSub.position.set(0, -0.9, 0); group.add(pSub);

    // PMOS (top)
    group.add(pDiff(V3(-0.6, 0.9, 0.25), 0.6, 0.3));
    group.add(pDiff(V3(0.6, 0.9, 0.25), 0.6, 0.3));
    group.add(poly(V3(0, 0.9, 0), 0.3, 0.25));

    // NMOS (bottom)
    group.add(nDiff(V3(-0.6, -0.9, 0.25), 0.6, 0.3));
    group.add(nDiff(V3(0.6, -0.9, 0.25), 0.6, 0.3));
    group.add(poly(V3(0, -0.9, 0), 0.3, 0.25));

    // Gate connection (polysilicon)
    group.add(poly(V3(0, 0, 0), 0.3, 1.4));

    // VDD top
    group.add(contact(V3(-0.6, 1.4, 0)));
    group.add(makeWire(V3(-0.6, 1.4, 0), V3(-0.6, 2.0, 0), { color: 0xef4444, radius: 0.03 }));
    // GND bottom
    group.add(contact(V3(-0.6, -1.4, 0)));
    group.add(makeWire(V3(-0.6, -1.4, 0), V3(-0.6, -2.0, 0), { color: 0x4b5563, radius: 0.03 }));
    // Output
    group.add(contact(V3(0.6, 0.9, 0.25)));
    group.add(contact(V3(0.6, -0.9, 0.25)));
    group.add(makeWire(V3(0.6, 0.9, 0), V3(0.6, -0.9, 0), { color: 0x60a5fa, radius: 0.03 }));
    group.add(makeWire(V3(0.6, 0, 0), V3(1.6, 0, 0), { color: 0x60a5fa, radius: 0.03 }));
    // Input
    group.add(makeWire(V3(-1.6, 0, 0), V3(-0.15, 0, 0), { color: 0x22c55e, radius: 0.03 }));

    const inL = makeLabel('IN'); inL.position.set(-2.0, 0.4, 0); group.add(inL);
    const outL = makeLabel('OUT'); outL.position.set(2.0, 0.4, 0); group.add(outL);

  } else if (type === 'cmos_nand' || ['cmos_and', 'cmos_or', 'pass_transistor'].includes(type)) {
    // Series NMOS, parallel PMOS
    group.add(nDiff(V3(0, -0.6, 0.25), 0.6, 0.3));
    group.add(nDiff(V3(0, 0, 0.25), 0.6, 0.3));
    group.add(pDiff(V3(-0.6, 0.6, 0.25), 0.6, 0.3));
    group.add(pDiff(V3(0.6, 0.6, 0.25), 0.6, 0.3));
    group.add(poly(V3(-0.6, 0.6, 0), 0.3, 0.25));
    group.add(poly(V3(0.6, 0.6, 0), 0.3, 0.25));

  } else if (type === 'cmos_nor') {
    group.add(pDiff(V3(0, 0.6, 0.25), 0.6, 0.3));
    group.add(pDiff(V3(0, 0, 0.25), 0.6, 0.3));
    group.add(nDiff(V3(-0.6, -0.6, 0.25), 0.6, 0.3));
    group.add(nDiff(V3(0.6, -0.6, 0.25), 0.6, 0.3));
    group.add(poly(V3(-0.6, -0.6, 0), 0.3, 0.25));
    group.add(poly(V3(0.6, -0.6, 0), 0.3, 0.25));

  } else if (type === 'transmission_gate') {
    // NMOS + PMOS in parallel
    group.add(nDiff(V3(0, -0.3, 0.25), 1.2, 0.3));
    group.add(pDiff(V3(0, 0.3, 0.25), 1.2, 0.3));
    group.add(poly(V3(0, -0.3, 0), 0.25, 0.2));
    const pGate = poly(V3(0, 0.3, 0), 0.25, 0.2);
    group.add(pGate);
    // Inversion bubble on PMOS gate
    const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), stdMat(0xcbd5e1, { style }));
    bubble.position.set(0.2, 0.3, 0.25);
    group.add(bubble);
    // Input / Output
    group.add(makeWire(V3(-1.2, 0, 0), V3(-0.6, 0, 0), { color: 0x22c55e, radius: 0.03 }));
    group.add(makeWire(V3(0.6, 0, 0), V3(1.2, 0, 0), { color: 0x60a5fa, radius: 0.03 }));

  } else if (type === 'sram_cell_6t') {
    // 6T SRAM cell: 2 cross-coupled inverters + 2 access transistors
    // Inverters (simplified)
    for (let i = -1; i <= 1; i += 2) {
      group.add(nDiff(V3(i * 0.4, -0.3, 0.25), 0.4, 0.3));
      group.add(pDiff(V3(i * 0.4, 0.3, 0.25), 0.4, 0.3));
      group.add(poly(V3(i * 0.4, 0, 0), 0.2, 0.4));
    }
    // Access transistors (word line)
    group.add(nDiff(V3(-0.8, -0.3, 0.25), 0.3, 0.3));
    group.add(nDiff(V3(0.8, -0.3, 0.25), 0.3, 0.3));
    group.add(poly(V3(-0.8, -0.3, 0), 0.2, 0.2));
    group.add(poly(V3(0.8, -0.3, 0), 0.2, 0.2));
    // Word line
    group.add(makeWire(V3(-0.8, -0.4, 0), V3(0.8, -0.4, 0), { color: 0x22c55e, radius: 0.02 }));
    // Bit lines
    group.add(makeWire(V3(-0.8, 0, 0), V3(-1.4, 0, 0), { color: 0x60a5fa, radius: 0.025 }));
    group.add(makeWire(V3(0.8, 0, 0), V3(1.4, 0, 0), { color: 0x60a5fa, radius: 0.025 }));

  } else if (type === 'dram_cell_1t') {
    // Single transistor + capacitor
    group.add(nDiff(V3(-0.3, 0, 0.25), 0.4, 0.3));
    group.add(poly(V3(0, 0, 0), 0.2, 0.2));
    // Storage capacitor
    const capPlate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.5), stdMat(0x60a5fa, { style }));
    capPlate.position.set(0, -0.4, 0);
    group.add(capPlate);
    // Word line
    group.add(makeWire(V3(0, 0.3, 0), V3(0, 0.9, 0), { color: 0x22c55e, radius: 0.02 }));
    // Bit line
    group.add(makeWire(V3(-0.5, 0, 0), V3(-1.2, 0, 0), { color: 0x60a5fa, radius: 0.025 }));

  } else if (type === 'pla_block') {
    // AND plane (rows) + OR plane (columns)
    for (let i = 0; i < 3; i++) {
      const row = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.08, 0.1), stdMat(0x64748b, { style }));
      row.position.set(0, -0.8 + i * 0.8, 0);
      group.add(row);
    }
    for (let j = 0; j < 3; j++) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.0, 0.1), stdMat(0x64748b, { style }));
      col.position.set(-0.8 + j * 0.8, 0, 0);
      group.add(col);
    }
    // Programmable connections (dots at intersections)
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if ((i + j) % 2 === 0) {
          const dot = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), stdMat(0x22c55e, { style }));
          dot.position.set(-0.8 + j * 0.8, -0.8 + i * 0.8, 0.15);
          group.add(dot);
        }
      }
    }
    // Inputs / Outputs
    for (let i = 0; i < 3; i++) {
      group.add(makeWire(V3(-1.6, -0.8 + i * 0.8, 0), V3(-1.0, -0.8 + i * 0.8, 0), { color: 0x22c55e, radius: 0.02 }));
      group.add(makeWire(V3(1.0, -0.8 + i * 0.8, 0), V3(1.6, -0.8 + i * 0.8, 0), { color: 0x60a5fa, radius: 0.02 }));
    }
  }

  group.position.y = -0.2;
  return { group, targets: { vlsi: { objects: [group] } }, tick() {} };
}
