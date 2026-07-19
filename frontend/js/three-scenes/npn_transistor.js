// NPN transistor / PN-junction cross-section template.
// params: { bias: "cutoff"|"active"|"saturation", showDepletionRegion: bool }
// targets: emitter, base, collector, depletion, electrons (flow), holes (flow)
import { COLORS, stdMat, makeFlow, makeWire } from './common.js';

// Depletion-region widths per junction for each bias mode.
const BIAS_WIDTHS = {
  cutoff: { be: 0.5, bc: 0.5 },
  active: { be: 0.14, bc: 0.55 },
  saturation: { be: 0.12, bc: 0.14 },
};

export function build({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const bias = params.bias || 'active';
  const showDepletion = params.showDepletionRegion !== false;
  const seg = quality === 'low' ? 10 : 24;

  const H = 1.7, D = 1.7;

  const makeRegion = (width, x, color) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, H, D),
      stdMat(color, { style }),
    );
    mesh.position.x = x;
    mesh.userData.labelOffsetY = H / 2 + 0.35;
    group.add(mesh);
    return mesh;
  };

  const emitter = makeRegion(2.0, -1.75, COLORS.nType);
  const base = makeRegion(0.9, 0, COLORS.pType);
  const collector = makeRegion(2.0, 1.75, COLORS.nType);

  // Depletion regions at the two junctions.
  const widths = BIAS_WIDTHS[bias] || BIAS_WIDTHS.active;
  const depletionMat = () => stdMat(0xe2e8f0, { style, opacity: 0.4 });
  const depBE = new THREE.Mesh(new THREE.BoxGeometry(widths.be, H + 0.02, D + 0.02), depletionMat());
  depBE.position.x = -0.45;
  const depBC = new THREE.Mesh(new THREE.BoxGeometry(widths.bc, H + 0.02, D + 0.02), depletionMat());
  depBC.position.x = 0.45;
  depBE.visible = depBC.visible = showDepletion;
  group.add(depBE, depBC);

  // Leads: emitter (left), base (top), collector (right).
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const leadE = makeWire(V3(-2.75, 0, 0), V3(-3.9, 0, 0), { color: COLORS.metal });
  const leadB = makeWire(V3(0, H / 2, 0), V3(0, H / 2 + 1.2, 0), { color: COLORS.metal });
  const leadC = makeWire(V3(2.75, 0, 0), V3(3.9, 0, 0), { color: COLORS.metal });
  group.add(leadE, leadB, leadC);

  if (style === 'realistic') {
    // Translucent epoxy package shell around the die.
    const shell = new THREE.Mesh(
      new THREE.CapsuleGeometry(1.7, 3.4, 4, seg),
      new THREE.MeshStandardMaterial({
        color: 0x111827, transparent: true, opacity: 0.18,
        roughness: 0.15, metalness: 0.1,
      }),
    );
    shell.rotation.z = Math.PI / 2;
    group.add(shell);
  }

  // Electron flow: emitter -> base -> collector (conventional NPN operation).
  const electronCurve = new THREE.CatmullRomCurve3([
    V3(-3.6, 0.05, 0), V3(-1.7, 0.1, 0.1), V3(0, 0.2, 0), V3(1.7, 0.1, -0.1), V3(3.6, 0.05, 0),
  ]);
  const electrons = makeFlow(electronCurve, {
    count: quality === 'low' ? 14 : 28, color: COLORS.electron,
  });
  group.add(electrons.object);

  // Hole (base current) flow: base lead down into the base region.
  const holeCurve = new THREE.CatmullRomCurve3([
    V3(0, H / 2 + 1.1, 0), V3(0.05, 0.6, 0.05), V3(0, -0.2, 0),
  ]);
  const holes = makeFlow(holeCurve, {
    count: quality === 'low' ? 6 : 10, color: COLORS.hole, size: 0.11, rate: 0.18,
  });
  group.add(holes.object);

  group.position.y = 0.2;

  return {
    group,
    targets: {
      emitter: { objects: [emitter] },
      base: { objects: [base], labelAnchor: base },
      collector: { objects: [collector] },
      depletion: { objects: [depBE, depBC] },
      electrons: { flow: electrons },
      holes: { flow: holes },
    },
    tick() {},
  };
}
