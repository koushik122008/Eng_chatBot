// Digital gates category builder.
// types: and_gate, or_gate, not_gate, nand_gate, nor_gate, xor_gate, xnor_gate, buffer_gate, tri_state, schmitt_trigger
import { V3, COLORS, stdMat, makeWire, makeFlow, makeLabel } from './common.js';

const GATE_SYMBOLS = {
  and: { body(s) { s.moveTo(-1, -1); s.lineTo(0, -1); s.absarc(0, 0, 1, -Math.PI/2, Math.PI/2, false); s.lineTo(-1, 1); s.closePath(); }},
  or: { body(s) { s.moveTo(-1, -1); s.quadraticCurveTo(0.3, -0.95, 1.2, 0); s.quadraticCurveTo(0.3, 0.95, -1, 1); s.quadraticCurveTo(-0.45, 0, -1, -1); s.closePath(); }},
  not: { body(s) { s.moveTo(-1, -1); s.lineTo(1, 0); s.lineTo(-1, 1); s.closePath(); }},
};

export function build({ THREE, style, params, quality, template }) {
  const group = new THREE.Group();
  const type = template || 'and_gate';
  const seg = quality === 'low' ? 10 : 20;

  let kind = 'AND';
  if (type.includes('and')) kind = 'AND';
  else if ((type.includes('or') || type === 'or_gate') && !type.includes('nor') && !type.includes('xor')) kind = 'OR';
  else if (type === 'not_gate') kind = 'NOT';
  else if (type === 'nand_gate') kind = 'NAND';
  else if (type === 'nor_gate') kind = 'NOR';
  else if (type === 'xor_gate') kind = 'XOR';
  else if (type === 'xnor_gate') kind = 'XNOR';
  else if (type === 'buffer_gate' || type === 'tri_state' || type === 'schmitt_trigger') kind = 'BUF';

  const isNot = kind === 'NOT' || kind === 'NAND' || kind === 'NOR' || kind === 'XNOR';
  const isOr = kind === 'OR' || kind === 'NOR' || kind === 'XOR' || kind === 'XNOR';
  const nInputs = kind === 'NOT' || kind === 'BUF' ? 1 : 2;

  const shape = new THREE.Shape();
  const gateKey = isOr ? 'or' : (kind === 'NOT' || kind === 'BUF') ? 'not' : 'and';
  GATE_SYMBOLS[gateKey].body(shape);

  const body = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, { depth: 0.35, bevelEnabled: true, bevelSize: 0.03, bevelSegments: 2 }),
    stdMat(0x64748b, { style }),
  );
  body.position.z = -0.18;
  group.add(body);

  if (kind === 'XOR' || kind === 'XNOR') {
    const arcShape = new THREE.Shape();
    arcShape.moveTo(-1.25, -1);
    arcShape.quadraticCurveTo(-0.7, 0, -1.25, 1);
    arcShape.quadraticCurveTo(-0.78, 0, -1.4, -1);
    arcShape.closePath();
    group.add(new THREE.Mesh(new THREE.ExtrudeGeometry(arcShape, { depth: 0.35, bevelEnabled: false }),
      stdMat(0x64748b, { style })));
  }

  const tipX = isOr ? 1.2 : 1.0;
  let outX = tipX;
  if (isNot) {
    const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.14, seg, seg), stdMat(0xcbd5e1, { style }));
    bubble.position.set(tipX + 0.14, 0, 0);
    group.add(bubble);
    outX = tipX + 0.28;
  }
  if (kind === 'BUF') outX = tipX + 0.2;

  const V3 = (x, y, z = 0) => new THREE.Vector3(x, y, z);
  const inYs = nInputs === 1 ? [0] : [0.45, -0.45];

  for (let i = 0; i < nInputs; i++) {
    const sw = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), stdMat(COLORS.wireOff, { style }));
    sw.position.set(-2.5, inYs[i], 0);
    sw.userData.labelOffsetY = 0.5;
    group.add(sw);
    group.add(makeWire(V3(-2.3, inYs[i], 0), V3(-1.1, inYs[i], 0), { color: COLORS.wireOff, radius: 0.035 }));
  }

  group.add(makeWire(V3(outX, 0, 0), V3(2.0, 0, 0), { color: COLORS.wireOff, radius: 0.035 }));
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.3, seg, seg),
    stdMat(COLORS.lampOff, { style, emissive: COLORS.lampOn }));
  lamp.position.set(2.5, 0, 0);
  group.add(lamp);

  const gl = makeLabel(kind);
  gl.position.set(0, 1.4, 0);
  group.add(gl);

  const signal = makeFlow(new THREE.CatmullRomCurve3([V3(outX, 0, 0), V3(2.55, 0, 0)]),
    { count: 6, color: COLORS.wireOn, size: 0.1, rate: 0.5 });
  group.add(signal.object);

  group.position.y = -0.1;
  return {
    group,
    targets: { gate: { objects: [body] }, output: { objects: [lamp], flow: signal } },
    tick() {},
    onClick(obj) {
      if (obj.userData && obj.userData.inputIndex !== undefined) {
        obj.material.color.setHex(obj.material.color.getHex() === COLORS.wireOn ? COLORS.wireOff : COLORS.wireOn);
      }
    },
  };
}
