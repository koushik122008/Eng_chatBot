// Op-Amp Circuit 3D template.
// params: { config: "inverting"|"noninverting"|"integrator", r1: number, r2: number, inputVoltage: -10..10 }
// targets: opamp_body, inverting_input, noninverting_input, output, feedback, signal_in, signal_out, r1_obj, r2_obj
import { V3, COLORS, stdMat, makeWire, makeFlow, makeLabel } from './common.js';

export function build({ THREE, style, params, quality, template }) {
  const group = new THREE.Group();
  const config = params.config || 'inverting';
  const real = style === 'realistic';

  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

  // Helpers defined inside build() so THREE is in scope
  const makeResistor = (pos, rot, opts = {}) => {
    const g = new THREE.Group();
    const segs = 7;
    const w = 0.7, h = 0.25;
    const pts = [];
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      pts.push(new THREE.Vector3((t - 0.5) * w, i % 2 === 0 ? 0 : h * 0.6, 0));
    }
    const mesh = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.03, 6, false),
      new THREE.MeshStandardMaterial({ color: opts.color || COLORS.wireOff, roughness: 0.5, metalness: 0.2 }),
    );
    g.add(mesh);
    g.position.copy(pos);
    if (rot) g.rotation.copy(rot);
    return g;
  };

  const makeCapacitor = (pos, rot) => {
    const g = new THREE.Group();
    const mat = stdMat(COLORS.wireOff, { style });
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.4, 0.04), mat);
    p1.position.set(-0.08, 0, 0);
    const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.4, 0.04), mat);
    p2.position.set(0.08, 0, 0);
    g.add(p1, p2);
    g.position.copy(pos);
    if (rot) g.rotation.copy(rot);
    return g;
  };

  // --- Op-amp triangle body ---
  const shape = new THREE.Shape();
  const sz = 1.2;
  shape.moveTo(-sz, -sz);
  shape.lineTo(-sz, sz);
  shape.lineTo(sz, 0);
  shape.closePath();

  const opampBody = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, { depth: 0.4, bevelEnabled: true, bevelSize: 0.05, bevelSegments: 4 }),
    stdMat(real ? 0x1e293b : 0x334155, { style }),
  );
  opampBody.position.set(0, 0, -0.2);
  opampBody.userData.tooltip = () => `Op-Amp (${config === 'inverting' ? 'Inverting' : config === 'noninverting' ? 'Non-Inverting' : 'Integrator'}) &bull; A<sub>v</sub> = ${config === 'inverting' ? `-R<sub>f</sub>/R<sub>in</sub>` : config === 'noninverting' ? '1 + R<sub>f</sub>/R<sub>1</sub>' : '-1/(R·C·s)'}`;
  opampBody.userData.labelOffsetY = sz + 0.4;
  group.add(opampBody);

  // +/- labels
  const plusLabel = makeLabel('+');
  plusLabel.position.set(-sz - 0.3, sz * 0.55, 0);
  group.add(plusLabel);
  const minusLabel = makeLabel('\u2212');
  minusLabel.position.set(-sz - 0.3, -sz * 0.55, 0);
  group.add(minusLabel);

  // --- Pins ---
  const invPin = makeWire(V3(-sz - 0.1, -sz * 0.55, 0), V3(-sz - 1.2, -sz * 0.55, 0), { color: COLORS.metal });
  invPin.userData.tooltip = `Inverting Input (V<sub>&minus;</sub>) &bull; Virtual ground`;
  const noninvPin = makeWire(V3(-sz - 0.1, sz * 0.55, 0), V3(-sz - 1.2, sz * 0.55, 0), { color: COLORS.metal });
  noninvPin.userData.tooltip = `Non-Inverting Input (V<sub>+</sub>) &bull; ${config === 'noninverting' ? 'Signal input' : 'GND'}`;
  const outPin = makeWire(V3(sz + 0.1, 0, 0), V3(sz + 1.2, 0, 0), { color: COLORS.metal });
  outPin.userData.tooltip = `Output (V<sub>out</sub>)`;
  group.add(invPin, noninvPin, outPin);

  if (real) {
    group.add(makeWire(V3(-0.2, sz * 0.9, 0.25), V3(-0.2, sz + 0.6, 0.25), { color: 0xef4444, radius: 0.035 }));
    group.add(makeWire(V3(0.2, -sz * 0.9, 0.25), V3(0.2, -sz - 0.6, 0.25), { color: 0x3b82f6, radius: 0.035 }));
  }

  // --- Config-specific networks ---
  let r1Obj = null, r2Obj = null;
  let signalIn = null, signalOut = null;
  let feedback = null;

  if (config === 'inverting') {
    const inPos = V3(-sz - 1.2, -sz * 0.55, 0);
    const sigPos = V3(-sz - 2.8, -sz * 0.55, 0);
    signalIn = makeWire(sigPos, inPos, { color: 0x22c55e, radius: 0.04 });
    r1Obj = makeResistor(V3(-sz - 2.0, -sz * 0.55, 0), new THREE.Euler(0, 0, 0));
    group.add(signalIn, r1Obj);

    const outPos = V3(sz + 1.2, 0, 0);
    const fbEnd = V3(-sz - 1.2, -sz * 0.55, 0);
    const fbCurve = new THREE.CatmullRomCurve3([outPos, V3(sz + 1.6, -1.2, 0), V3(sz + 1.6, -sz * 1.8, 0), V3(-sz - 1.2, -sz * 1.8, 0), fbEnd]);
    feedback = new THREE.Mesh(
      new THREE.TubeGeometry(fbCurve, 20, 0.04, 6, false),
      new THREE.MeshStandardMaterial({ color: 0x60a5fa, roughness: 0.4, metalness: 0.3 }),
    );
    r2Obj = makeResistor(V3(sz + 1.6, -sz * 1.8, 0), new THREE.Euler(0, 0, Math.PI / 2), { color: 0x60a5fa });
    signalOut = makeWire(outPos, V3(sz + 2.6, 0, 0), { color: 0x60a5fa, radius: 0.045 });
    group.add(feedback, r2Obj, signalOut);

    const gnd = makeWire(sigPos, V3(-sz - 2.8, -sz * 0.55 - 0.5, 0), { color: 0x4b5563, radius: 0.035 });
    group.add(gnd);

  } else if (config === 'noninverting') {
    signalIn = makeWire(V3(-sz - 2.4, sz * 0.55, 0), V3(-sz - 1.2, sz * 0.55, 0), { color: 0x22c55e, radius: 0.04 });
    group.add(signalIn);

    const outPos = V3(sz + 1.2, 0, 0);
    const fbEnd = V3(-sz - 1.2, -sz * 0.55, 0);
    const fbCurve = new THREE.CatmullRomCurve3([outPos, V3(sz + 1.6, -1.2, 0), V3(sz + 1.6, -sz * 1.8, 0), V3(-sz - 1.2, -sz * 1.8, 0), fbEnd]);
    feedback = new THREE.Mesh(
      new THREE.TubeGeometry(fbCurve, 20, 0.04, 6, false),
      new THREE.MeshStandardMaterial({ color: 0x60a5fa, roughness: 0.4, metalness: 0.3 }),
    );
    r2Obj = makeResistor(V3(sz + 1.6, -sz * 1.8, 0), new THREE.Euler(0, 0, Math.PI / 2), { color: 0x60a5fa });
    const gndPos = V3(-sz - 1.2, -sz * 0.55 - 0.8, 0);
    const r1Wire = makeWire(fbEnd, gndPos, { color: COLORS.wireOff, radius: 0.035 });
    r1Obj = makeResistor(V3(-sz - 1.2, -sz * 0.55 - 0.4, 0), new THREE.Euler(0, 0, Math.PI / 2));
    signalOut = makeWire(outPos, V3(sz + 2.6, 0, 0), { color: 0x60a5fa, radius: 0.045 });
    group.add(feedback, r2Obj, r1Wire, r1Obj, signalOut);

  } else if (config === 'integrator') {
    const sigPos = V3(-sz - 2.8, -sz * 0.55, 0);
    const inPos = V3(-sz - 1.2, -sz * 0.55, 0);
    signalIn = makeWire(sigPos, inPos, { color: 0x22c55e, radius: 0.04 });
    r1Obj = makeResistor(V3(-sz - 2.0, -sz * 0.55, 0), new THREE.Euler(0, 0, 0));
    group.add(signalIn, r1Obj);

    const outPos = V3(sz + 1.2, 0, 0);
    const fbEnd = V3(-sz - 1.2, -sz * 0.55, 0);
    const fbCurve = new THREE.CatmullRomCurve3([outPos, V3(sz + 1.6, -1.2, 0), V3(sz + 1.6, -sz * 1.8, 0), V3(-sz - 1.2, -sz * 1.8, 0), fbEnd]);
    feedback = new THREE.Mesh(
      new THREE.TubeGeometry(fbCurve, 20, 0.04, 6, false),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.4, metalness: 0.3 }),
    );
    const cap = makeCapacitor(V3(sz + 1.6, -sz * 1.8, 0), new THREE.Euler(0, 0, Math.PI / 2));
    signalOut = makeWire(outPos, V3(sz + 2.6, 0, 0), { color: 0x60a5fa, radius: 0.045 });
    group.add(feedback, cap, signalOut);

    const gnd = makeWire(sigPos, V3(-sz - 2.8, -sz * 0.55 - 0.5, 0), { color: 0x4b5563, radius: 0.035 });
    group.add(gnd);
  }

  // --- Signal flow particles ---
  const flowY = config === 'noninverting' ? 1 : -1;
  const flowCurve = new THREE.CatmullRomCurve3([
    V3(-sz - 2.4, -sz * 0.55 * flowY, 0),
    V3(-sz - 0.5, -sz * 0.55 * flowY, 0.1),
    V3(0, 0, 0),
    V3(sz + 0.5, 0, 0.1),
    V3(sz + 2.2, 0, 0),
  ]);
  const signalFlow = makeFlow(flowCurve, {
    count: quality === 'low' ? 8 : 16,
    color: 0x60a5fa,
    size: 0.06,
    rate: 0.3,
  });
  group.add(signalFlow.object);
  group.position.y = -0.2;

  // Build targets dynamically to skip null component references
  const targets = {
    opamp_body: { objects: [opampBody] },
    inverting_input: { objects: [invPin] },
    noninverting_input: { objects: [noninvPin] },
    output: { objects: [outPin] },
    signal_flow: { flow: signalFlow },
  };
  if (feedback) targets.feedback = { objects: [feedback] };
  if (signalIn) targets.signal_in = { objects: [signalIn] };
  if (signalOut) targets.signal_out = { objects: [signalOut] };
  if (r1Obj) targets.r1_obj = { objects: [r1Obj] };
  if (r2Obj) targets.r2_obj = { objects: [r2Obj] };

  return {
    group,
    targets,
    tick() {},
  };
}
