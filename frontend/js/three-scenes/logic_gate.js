// Logic gate template with clickable input switches and an output lamp.
// params: { gate: "AND"|"OR"|"NOT"|"NAND"|"NOR"|"XOR", inputs: [0|1, (0|1)] }
// targets: inputA, inputB, output, gate
import { COLORS, stdMat, makeFlow } from './common.js';

const GATE_LOGIC = {
  AND: (a, b) => a & b,
  OR: (a, b) => a | b,
  XOR: (a, b) => a ^ b,
  NAND: (a, b) => 1 - (a & b),
  NOR: (a, b) => 1 - (a | b),
  NOT: (a) => 1 - a,
};

function gateShape(THREE, kind) {
  const s = new THREE.Shape();
  if (kind === 'AND' || kind === 'NAND') {
    s.moveTo(-1, -1);
    s.lineTo(0, -1);
    s.absarc(0, 0, 1, -Math.PI / 2, Math.PI / 2, false);
    s.lineTo(-1, 1);
    s.closePath();
  } else if (kind === 'NOT') {
    s.moveTo(-1, -1);
    s.lineTo(1, 0);
    s.lineTo(-1, 1);
    s.closePath();
  } else { // OR / NOR / XOR
    s.moveTo(-1, -1);
    s.quadraticCurveTo(0.3, -0.95, 1.2, 0);
    s.quadraticCurveTo(0.3, 0.95, -1, 1);
    s.quadraticCurveTo(-0.45, 0, -1, -1);
    s.closePath();
  }
  return s;
}

export function build({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const kind = params.gate || 'AND';
  const nInputs = kind === 'NOT' ? 1 : 2;
  const state = (params.inputs || []).slice(0, nInputs).map((v) => (v ? 1 : 0));
  while (state.length < nInputs) state.push(0);
  const seg = quality === 'low' ? 12 : 32;

  // Gate body.
  const body = new THREE.Mesh(
    new THREE.ExtrudeGeometry(gateShape(THREE, kind), {
      depth: 0.45, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05,
      bevelSegments: 2, curveSegments: seg,
    }),
    stdMat(0x64748b, { style }),
  );
  body.position.z = -0.22;
  body.userData.labelOffsetY = 1.4;
  group.add(body);

  // XOR extra input arc.
  if (kind === 'XOR') {
    const arc = new THREE.Shape();
    arc.moveTo(-1.25, -1);
    arc.quadraticCurveTo(-0.7, 0, -1.25, 1);
    arc.quadraticCurveTo(-0.78, 0, -1.4, -1);
    arc.closePath();
    const arcMesh = new THREE.Mesh(
      new THREE.ExtrudeGeometry(arc, { depth: 0.45, bevelEnabled: false, curveSegments: seg }),
      stdMat(0x64748b, { style }),
    );
    arcMesh.position.z = -0.22;
    group.add(arcMesh);
  }

  // Inversion bubble for NOT/NAND/NOR.
  const tipX = (kind === 'AND' || kind === 'NAND') ? 1.0 : (kind === 'NOT' ? 1.0 : 1.2);
  let outStartX = tipX;
  if (kind === 'NOT' || kind === 'NAND' || kind === 'NOR') {
    const bubble = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, seg, seg),
      stdMat(0xcbd5e1, { style }),
    );
    bubble.position.set(tipX + 0.16, 0, 0);
    group.add(bubble);
    outStartX = tipX + 0.32;
  }

  const V3 = (x, y, z = 0) => new THREE.Vector3(x, y, z);
  const wireMat = () => new THREE.MeshStandardMaterial({
    color: COLORS.wireOff, roughness: 0.5, metalness: 0.2,
  });

  // Input switches + wires.
  const inputMeshes = [];
  const inputWires = [];
  const inputYs = nInputs === 1 ? [0] : [0.55, -0.55];
  for (let i = 0; i < nInputs; i++) {
    const y = inputYs[i];
    const sw = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.55, 0.55),
      stdMat(COLORS.wireOff, { style }),
    );
    sw.position.set(-3, y, 0);
    sw.userData.inputIndex = i;
    sw.userData.labelOffsetY = 0.7;
    group.add(sw);
    inputMeshes.push(sw);

    const wire = new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([V3(-2.7, y), V3(-1.1, y)]), 8, 0.05, 8,
      ),
      wireMat(),
    );
    wire.userData.inputIndex = i;
    group.add(wire);
    inputWires.push(wire);
  }

  // Output wire + lamp.
  const outWire = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V3(outStartX, 0), V3(2.5, 0)]), 8, 0.05, 8),
    wireMat(),
  );
  group.add(outWire);

  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, seg, seg),
    stdMat(COLORS.lampOff, { style, emissive: COLORS.lampOn }),
  );
  lamp.position.set(3, 0, 0);
  lamp.userData.labelOffsetY = 0.75;
  group.add(lamp);

  // Signal flow along the output wire (used by "flow" animations on target "output").
  const signal = makeFlow(
    new THREE.CatmullRomCurve3([V3(outStartX, 0), V3(2.55, 0)]),
    { count: 8, color: COLORS.wireOn, size: 0.12, rate: 0.5 },
  );
  group.add(signal.object);

  let lampGlow = 0; // eased toward the current output

  const compute = () => GATE_LOGIC[kind](...state);

  const refresh = () => {
    const out = compute();
    inputMeshes.forEach((m, i) => {
      m.material.color.setHex(state[i] ? COLORS.wireOn : COLORS.wireOff);
    });
    inputWires.forEach((w, i) => {
      w.material.color.setHex(state[i] ? COLORS.wireOn : COLORS.wireOff);
    });
    outWire.material.color.setHex(out ? COLORS.wireOn : COLORS.wireOff);
    lamp.material.color.setHex(out ? COLORS.lampOn : COLORS.lampOff);
    signal.active = !!out;
  };
  refresh();

  const toggleInput = (i) => {
    state[i] = 1 - state[i];
    refresh();
    if (window.gsap) {
      window.gsap.fromTo(inputMeshes[i].scale, { x: 1.25, y: 1.25, z: 1.25 },
        { x: 1, y: 1, z: 1, duration: 0.35, ease: 'back.out(3)' });
    }
  };

  const toggleAction = (i) => () => ({ start: () => toggleInput(i), stop: () => {} });

  return {
    group,
    targets: {
      gate: { objects: [body] },
      inputA: { objects: [inputMeshes[0]], custom: { toggle: toggleAction(0) } },
      ...(nInputs > 1 && {
        inputB: { objects: [inputMeshes[1]], custom: { toggle: toggleAction(1) } },
      }),
      output: { objects: [lamp], flow: signal },
    },
    tick(dt) {
      // Ease the lamp glow toward the current output state.
      const targetGlow = compute() ? 0.85 : 0;
      lampGlow += (targetGlow - lampGlow) * Math.min(1, dt * 6);
      lamp.material.emissiveIntensity = lampGlow;
    },
    onClick(obj) {
      let node = obj;
      while (node && node.userData.inputIndex === undefined) node = node.parent;
      if (node) toggleInput(node.userData.inputIndex);
    },
  };
}
