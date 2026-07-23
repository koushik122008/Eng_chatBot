// MOSFET / CMOS Inverter 3D cross-section template.
// params: { type: "nmos"|"pmos"|"cmos_inverter", vgs: 0..5, vds: 0..5 }
// targets: gate, source, drain, channel, substrate, oxide, electrons (flow), gate_contact, cmos_input, cmos_output
import { V3, COLORS, stdMat, makeFlow, makeWire } from './common.js';

export function build({ THREE, style, params, quality, template }) {
  const group = new THREE.Group();
  const type = template || 'nmos';
  const vgs = Math.min(Math.max(params.vgs ?? 3, 0), 5);
  const seg = quality === 'low' ? 8 : 20;

  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const real = style === 'realistic';

  // --- Shared materials ---
  const oxideMat = () => {
    const m = stdMat(0x94a3b8, { style, opacity: real ? 0.35 : 0.5 });
    m.transparent = true;
    return m;
  };
  const substrateMat = () => stdMat(type === 'pmos' ? 0x3b82f6 : 0xf97316, { style });
  const gateMat = () => stdMat(0x9ca3af, { style, ...(real ? { emissive: 0x222222 } : {}) });

  // --- Substrate body ---
  const subW = 3.6, subH = 1.0, subD = 1.6;
  const substrate = new THREE.Mesh(
    new THREE.BoxGeometry(subW, subH, subD),
    substrateMat(),
  );
  substrate.position.y = -0.5;
  substrate.userData.tooltip = `Substrate (${type === 'pmos' ? 'N-well' : 'P-type'})`;
  substrate.userData.labelOffsetY = subH / 2 + 0.3;
  group.add(substrate);

  // --- Oxide layer ---
  const oxide = new THREE.Mesh(
    new THREE.BoxGeometry(subW * 0.55, 0.12, subD * 0.7),
    oxideMat(),
  );
  oxide.position.set(0, 0.06, 0);
  oxide.userData.tooltip = 'Gate Oxide (SiO₂) &bull; ~2 nm thick';
  group.add(oxide);

  // --- Gate (polysilicon / metal) ---
  const gate = new THREE.Mesh(
    new THREE.BoxGeometry(subW * 0.35, 0.18, subD * 0.5),
    gateMat(),
  );
  gate.position.set(0, 0.21, 0);
  gate.userData.tooltip = () => `Gate (Polysilicon) &bull; V<sub>GS</sub> = <b>${vgsLevels[vgsIdx] || vgs}</b> V (click to cycle)`;
  group.add(gate);

  // --- Gate contact (vertical lead) ---
  const gateContact = makeWire(V3(0, 0.3, 0), V3(0, 1.2, 0), { color: COLORS.metal, radius: 0.05 });
  group.add(gateContact);

  // Gate terminal sphere
  const gateTerm = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 12, 12),
    stdMat(COLORS.metal, { style }),
  );
  gateTerm.position.set(0, 1.2, 0);
  gateTerm.userData.tooltip = () => `Gate (G) &bull; V<sub>GS</sub> = <b>${vgsLevels[vgsIdx] || vgs}</b> V`;
  group.add(gateTerm);

  // --- Source & Drain regions (N+ / P+ diffusions) ---
  const sdW = 0.5, sdH = 0.55, sdD = subD * 0.6;
  const sdColor = type === 'pmos' ? COLORS.pType : COLORS.nType;

  const source = new THREE.Mesh(
    new THREE.BoxGeometry(sdW, sdH, sdD),
    stdMat(sdColor, { style }),
  );
  source.position.set(-0.95, -0.225, 0);
  source.userData.tooltip = () => `Source (S) &bull; V<sub>S</sub> = ${type === 'pmos' ? 'V<sub>DD</sub>' : '0 V'}`;
  source.userData.labelOffsetY = sdH / 2 + 0.25;
  group.add(source);

  const drain = new THREE.Mesh(
    new THREE.BoxGeometry(sdW, sdH, sdD),
    stdMat(sdColor, { style }),
  );
  drain.position.set(0.95, -0.225, 0);
  drain.userData.tooltip = () => `Drain (D) &bull; V<sub>DS</sub> = <b>${params.vds ?? 5}</b> V`;
  drain.userData.labelOffsetY = sdH / 2 + 0.25;
  group.add(drain);

  // Source & drain contacts
  const srcContact = makeWire(V3(-0.95, 0.05, 0), V3(-0.95, 0.9, 0), { color: COLORS.metal, radius: 0.045 });
  const drnContact = makeWire(V3(0.95, 0.05, 0), V3(0.95, 0.9, 0), { color: COLORS.metal, radius: 0.045 });
  group.add(srcContact, drnContact);

  const srcTerm = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), stdMat(COLORS.metal, { style }));
  srcTerm.position.set(-0.95, 0.9, 0);
  srcTerm.userData.tooltip = 'Source Contact &bull; Metal';
  group.add(srcTerm);

  const drnTerm = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), stdMat(COLORS.metal, { style }));
  drnTerm.position.set(0.95, 0.9, 0);
  drnTerm.userData.tooltip = 'Drain Contact &bull; Metal';
  group.add(drnTerm);

  // --- Channel region (between source and drain) ---
  const channel = new THREE.Mesh(
    new THREE.BoxGeometry(subW * 0.35, 0.08, subD * 0.5),
    stdMat(0x38bdf8, { style, opacity: Math.min(0.2 + vgs * 0.15, 0.95) }),
  );
  channel.material.transparent = true;
  channel.position.set(0, -0.04, 0);
  channel.userData.tooltip = () => `Channel &bull; Conductivity: ${Math.min(0.2 + vgs * 0.15, 0.95) > 0.5 ? '<span style="color:#22c55e">ON</span>' : '<span style="color:#ef4444">OFF</span>'} (V<sub>GS</sub> = ${vgsLevels[vgsIdx] || vgs}V)`;
  group.add(channel);

  // --- Electron flow through the channel ---
  const showFlow = vgs > 0.5;
  const flowDir = type === 'pmos' ? -1 : 1;
  const electronCurve = new THREE.CatmullRomCurve3([
    V3(-0.95 * flowDir, -0.04, 0.05),
    V3(-0.5 * flowDir, -0.02, 0.08),
    V3(0, 0, 0),
    V3(0.5 * flowDir, -0.02, -0.08),
    V3(0.95 * flowDir, -0.04, -0.05),
  ]);
  const electrons = makeFlow(electronCurve, {
    count: quality === 'low' ? 10 : 20,
    color: COLORS.electron,
    size: 0.07,
    rate: 0.3,
  });
  electrons.active = showFlow;
  group.add(electrons.object);

  // --- Substrate contact (body bias) ---
  const subContact = makeWire(V3(-1.6, -1.0, 0), V3(-1.6, -1.4, 0), { color: COLORS.metal, radius: 0.04 });
  group.add(subContact);

  // --- CMOS Inverter extras ---
  let cmosInput = null, cmosOutput = null;
  let pmosSource = null, pmosDrain = null;

  if (type === 'cmos_inverter') {
    // Add a PMOS on top of the NMOS to form the inverter
    const pmosY = 1.6;
    const pSub = new THREE.Mesh(
      new THREE.BoxGeometry(subW, subH * 0.7, subD * 0.8),
      stdMat(COLORS.nType, { style }),
    );
    pSub.position.set(0, pmosY - 0.35, 0);
    group.add(pSub);

    const pOxide = new THREE.Mesh(
      new THREE.BoxGeometry(subW * 0.55, 0.1, subD * 0.6),
      oxideMat(),
    );
    pOxide.position.set(0, pmosY + 0.04, 0);
    group.add(pOxide);

    const pGate = new THREE.Mesh(
      new THREE.BoxGeometry(subW * 0.35, 0.15, subD * 0.4),
      gateMat(),
    );
    pGate.position.set(0, pmosY + 0.17, 0);
    group.add(pGate);

    // PMOS source (connected to VDD)
    pmosSource = new THREE.Mesh(
      new THREE.BoxGeometry(sdW, sdH * 0.65, sdD),
      stdMat(COLORS.pType, { style }),
    );
    pmosSource.position.set(-0.95, pmosY - 0.33, 0);
    group.add(pmosSource);

    // PMOS drain (connected to output)
    pmosDrain = new THREE.Mesh(
      new THREE.BoxGeometry(sdW, sdH * 0.65, sdD),
      stdMat(COLORS.pType, { style }),
    );
    pmosDrain.position.set(0.95, pmosY - 0.33, 0);
    group.add(pmosDrain);

    // VDD wire to PMOS source
    const vddWire = makeWire(V3(-0.95, pmosY + 0.3, 0), V3(-0.95, pmosY + 1.0, 0), { color: 0xef4444, radius: 0.04 });
    group.add(vddWire);
    const vddDot = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), stdMat(0xef4444, { style }));
    vddDot.position.set(-0.95, pmosY + 1.0, 0);
    group.add(vddDot);

    // Input wire to both gates
    cmosInput = makeWire(V3(0, 1.5, 0), V3(0, 2.0, 0), { color: 0x22c55e, radius: 0.045 });
    group.add(cmosInput);
    const inDot = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), stdMat(0x22c55e, { style }));
    inDot.position.set(0, 2.0, 0);
    group.add(inDot);

    // Output wire from NMOS drain & PMOS drain
    cmosOutput = makeWire(V3(0.95, pmosY - 0.33, 0), V3(0.95, pmosY + 0.6, 0), { color: 0x60a5fa, radius: 0.05 });
    const outWire2 = makeWire(V3(0.95, 0.9, 0), V3(0.95, pmosY + 0.6, 0), { color: 0x60a5fa, radius: 0.045 });
    group.add(cmosOutput, outWire2);

    const outDot = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), stdMat(0x60a5fa, { style }));
    outDot.position.set(0.95, pmosY + 0.6, 0);
    group.add(outDot);
  }

  group.position.y = 0.3;

  const targets = {
    gate: { objects: [gate] },
    source: { objects: [source] },
    drain: { objects: [drain] },
    channel: { objects: [channel] },
    substrate: { objects: [substrate] },
    oxide: { objects: [oxide] },
    electrons: { flow: electrons },
    gate_contact: { objects: [gateContact, gateTerm] },
  };

  if (type === 'cmos_inverter') {
    targets.cmos_input = { objects: [cmosInput] };
    targets.cmos_output = { objects: [cmosOutput] };
    targets.pmos_source = { objects: [pmosSource] };
    targets.pmos_drain = { objects: [pmosDrain] };
  }

  // VGS level indicator (visual bar) — safe initial size
  const safeVgs = Math.max(vgs, 0.5);
  const vgsIndicator = new THREE.Mesh(
    new THREE.BoxGeometry(safeVgs * 0.15, 0.04, 0.04),
    stdMat(0x22c55e, { style, emissive: 0x22c55e })
  );
  vgsIndicator.position.set(-1.4 + safeVgs * 0.08, 1.6, 0);
  group.add(vgsIndicator);

  // VGS label block
  const vgsLabel = makeWire(V3(-1.4, 1.65, 0), V3(-1.4 + 0.75, 1.65, 0), { color: 0x22c55e, radius: 0.02 });
  group.add(vgsLabel);

  // Interactive VGS control: clicking gate cycles through VGS values
  const vgsLevels = [0.5, 1.5, 3.0, 4.5];
  let vgsIdx = vgsLevels.findIndex(v => v >= vgs);
  if (vgsIdx < 0) vgsIdx = 2;

  targets.channel.custom = {
    toggle: () => {
      channel.material.opacity = channel.material.opacity > 0.5 ? 0.15 : 0.8;
      channel.material.needsUpdate = true;
    },
  };

  targets.vgs_indicator = { objects: [vgsIndicator] };

  return {
    group,
    targets,
    tick() {},
    onClick(obj) {
      // Clicking gate toggles electron flow and cycles VGS
      if (obj === gate || obj === gateTerm) {
        electrons.active = !electrons.active;
        // Cycle VGS level
        vgsIdx = (vgsIdx + 1) % vgsLevels.length;
        const newVgs = vgsLevels[vgsIdx];
        vgsIndicator.scale.x = newVgs / safeVgs;
        channel.material.opacity = Math.min(0.2 + newVgs * 0.15, 0.95);
        if (window.gsap) {
          window.gsap.fromTo(vgsIndicator.material,
            { emissiveIntensity: 1.0 },
            { emissiveIntensity: 0.3, duration: 0.5, ease: 'sine.inOut' }
          );
        }
      }
    },
  };
}
