// Gear train template: 2-4 meshed spur gears demonstrating gear ratios.
// params: { gears: [{teeth: 6..60}, ...], rpm: 1..120 }
// targets: gear0, gear1, ... (gear0 is the driver)
import { COLORS, stdMat } from './common.js';

const GEAR_COLORS = [0x38bdf8, 0xf97316, 0x22c55e, 0xe879f9];

function makeGear(THREE, { teeth, radius, color, style, quality }) {
  const g = new THREE.Group();
  const thickness = 0.5;
  const seg = quality === 'low' ? 24 : 48;

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, thickness, seg),
    stdMat(color, { style }),
  );
  body.rotation.x = Math.PI / 2; // face the camera (rotate about z)
  g.add(body);

  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.22, radius * 0.22, thickness + 0.14, seg / 2),
    stdMat(COLORS.metal, { style }),
  );
  hub.rotation.x = Math.PI / 2;
  g.add(hub);

  // Teeth: small boxes around the rim.
  const toothW = (2 * Math.PI * radius) / teeth * 0.45;
  const toothGeo = new THREE.BoxGeometry(toothW, 0.26, thickness);
  const toothMat = stdMat(color, { style });
  for (let i = 0; i < teeth; i++) {
    const angle = (i / teeth) * Math.PI * 2;
    const tooth = new THREE.Mesh(toothGeo, toothMat);
    tooth.position.set(
      Math.cos(angle) * (radius + 0.11),
      Math.sin(angle) * (radius + 0.11),
      0,
    );
    tooth.rotation.z = angle + Math.PI / 2;
    g.add(tooth);
  }

  // A spoke marker so rotation is visible.
  const marker = new THREE.Mesh(
    new THREE.BoxGeometry(radius * 0.75, 0.1, thickness + 0.1),
    stdMat(0xf8fafc, { style }),
  );
  marker.position.x = radius * 0.5;
  g.add(marker);

  return g;
}

export function build({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const gearParams = (params.gears?.length >= 2 ? params.gears : [{ teeth: 12 }, { teeth: 24 }])
    .slice(0, 4);
  const rpm = params.rpm ?? 20;

  const radii = gearParams.map((g) => 0.05 * g.teeth + 0.25);

  // Lay gears out left-to-right so consecutive gears mesh.
  const gears = [];
  let x = 0;
  const targets = {};
  gearParams.forEach((gp, i) => {
    if (i > 0) x += radii[i - 1] + radii[i] + 0.13; // small gap for tooth mesh
    const mesh = makeGear(THREE, {
      teeth: gp.teeth, radius: radii[i],
      color: GEAR_COLORS[i % GEAR_COLORS.length], style, quality,
    });
    // Stagger mesh phase so teeth interleave visually.
    mesh.rotation.z = i % 2 ? Math.PI / gp.teeth : 0;
    mesh.position.x = x;
    mesh.userData.labelOffsetY = radii[i] + 0.55;
    group.add(mesh);
    gears.push({ mesh, teeth: gp.teeth });
  });

  // Center the train.
  const width = x;
  group.children.forEach((c) => { c.position.x -= width / 2; });

  // Angular speeds: driver at `rpm`; each meshed pair reverses direction and
  // scales speed by the tooth ratio.
  const omegas = [rpm * (Math.PI * 2) / 60];
  for (let i = 1; i < gears.length; i++) {
    omegas.push(-omegas[i - 1] * (gears[i - 1].teeth / gears[i].teeth));
  }

  const spinState = { on: true };
  gears.forEach((g, i) => {
    targets[`gear${i}`] = {
      objects: [g.mesh],
      custom: {
        // "rotate" starts/stops the whole train (meshed gears move together).
        rotate: () => ({
          start: () => { spinState.on = true; },
          stop: () => { spinState.on = false; },
        }),
        toggle: () => ({
          start: () => { spinState.on = !spinState.on; },
          stop: () => {},
        }),
      },
    };
  });

  return {
    group,
    targets,
    tick(dt) {
      if (!spinState.on) return;
      gears.forEach((g, i) => { g.mesh.rotation.z += omegas[i] * dt; });
    },
  };
}
