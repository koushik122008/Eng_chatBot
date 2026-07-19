// Spring-mass(-damper) oscillator with real integrated physics.
// params: { mass: 0.1..100, k: 0.1..1000, damping: 0..10, initialDisplacement: -2..2 }
// targets: mass, spring, equilibrium
import { COLORS, stdMat } from './common.js';

export function build({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const m = params.mass ?? 1;
  const k = params.k ?? 20;
  const c = params.damping ?? 0.4;
  const x0 = params.initialDisplacement ?? 1.0;
  const seg = quality === 'low' ? 60 : 160;

  const CEILING_Y = 2.6;
  const REST_LEN = 2.4;          // spring natural + static-stretch length (visual)
  const EQ_Y = CEILING_Y - REST_LEN;

  // Ceiling bar with hatch marks.
  const ceiling = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.18, 1.2), stdMat(0x475569, { style }));
  ceiling.position.y = CEILING_Y + 0.09;
  group.add(ceiling);
  for (let i = 0; i < 7; i++) {
    const hatch = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.35, 0.06), stdMat(0x334155, { style }));
    hatch.position.set(-1.4 + i * 0.47, CEILING_Y + 0.32, 0);
    hatch.rotation.z = -0.5;
    group.add(hatch);
  }

  // Spring: unit-length helix (y from 0 down to -1) that we scale to the
  // current length each frame.
  const coils = 9;
  const pts = [];
  for (let i = 0; i <= seg; i++) {
    const t = i / seg;
    pts.push(new THREE.Vector3(
      Math.cos(t * coils * Math.PI * 2) * 0.35,
      -t,
      Math.sin(t * coils * Math.PI * 2) * 0.35,
    ));
  }
  const spring = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, 0.045, quality === 'low' ? 5 : 8),
    stdMat(COLORS.metal, { style }),
  );
  spring.position.y = CEILING_Y;
  group.add(spring);

  // Mass block. Size hints at the mass value.
  const size = 0.7 + Math.min(0.6, Math.log10(Math.max(1, m)) * 0.4);
  const massMesh = new THREE.Mesh(
    new THREE.BoxGeometry(size, size, size),
    stdMat(0xf97316, { style }),
  );
  massMesh.userData.labelOffsetY = -size;
  group.add(massMesh);

  // Equilibrium line.
  const eqLine = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 0.02, 0.02),
    new THREE.MeshBasicMaterial({ color: 0x64748b, transparent: true, opacity: 0.7 }),
  );
  eqLine.position.y = EQ_Y - size / 2;
  group.add(eqLine);

  // Physics state: y = displacement from equilibrium (down negative visual? keep +down = stretch).
  const phys = { y: x0, v: 0 };

  const place = () => {
    const massTop = EQ_Y - phys.y;                // stretch (y>0) moves mass down
    massMesh.position.y = massTop - size / 2;
    const len = CEILING_Y - massTop;
    spring.scale.y = Math.max(0.2, len / 1);      // helix is unit length
  };
  place();

  const kick = (amount = x0) => { phys.y = amount || 1; phys.v = 0; };

  return {
    group,
    targets: {
      mass: {
        objects: [massMesh],
        custom: {
          // "oscillate" on the mass re-kicks the physics instead of a canned tween.
          oscillate: () => ({ start: () => kick(), stop: () => { phys.y = 0; phys.v = 0; } }),
          toggle: () => ({ start: () => kick(), stop: () => {} }),
        },
      },
      spring: { objects: [spring] },
      equilibrium: { objects: [eqLine], labelAnchor: eqLine },
    },
    tick(dt) {
      // Semi-implicit Euler on m*y'' = -k*y - c*y'
      const steps = 4;
      const h = Math.min(dt, 0.033) / steps;
      for (let i = 0; i < steps; i++) {
        const a = (-k * phys.y - c * phys.v) / m;
        phys.v += a * h;
        phys.y += phys.v * h;
      }
      place();
    },
  };
}
