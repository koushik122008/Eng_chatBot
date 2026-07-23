// Semiconductor device category builder.
// params: { type, bias, showLabel }
// types: pn_junction, zener_diode, schottky_diode, led, photodiode,
//        pnp_transistor, n_jfet, p_jfet, igbt, scr, triac, varactor
import { V3, COLORS, stdMat, makeWire, makeFlow, makeLabel } from './common.js';

export function build({ THREE, style, params, quality, template }) {
  const group = new THREE.Group();
  const type = template || 'pn_junction';
  const bias = params.bias || 'forward';
  const real = style === 'realistic';
  const seg = quality === 'low' ? 8 : 16;

  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const wireMat = (c) => new THREE.MeshStandardMaterial({ color: c || COLORS.wireOff, roughness: 0.5, metalness: 0.2 });

  // Shared diode body
  const diodeBody = () => {
    const g = new THREE.Group();
    // Triangle pointing right
    const shape = new THREE.Shape();
    shape.moveTo(-0.8, -0.6);
    shape.lineTo(0.4, 0);
    shape.lineTo(-0.8, 0.6);
    shape.closePath();
    g.add(new THREE.Mesh(
      new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: false }),
      stdMat(real ? 0x1e293b : COLORS.nType, { style }),
    ));
    // Vertical bar
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 1.2, 0.3),
      stdMat(COLORS.metal, { style }),
    );
    bar.position.set(0.4, 0, 0);
    g.add(bar);
    return g;
  };

  // Shared transistor body (BJT)
  const bjtBody = (npn = true) => {
    const g = new THREE.Group();
    // Three-layer structure
    const layerH = 0.5, layerW = 1.8, layerD = 1.2;
    const c1 = npn ? COLORS.nType : COLORS.pType;
    const c2 = npn ? COLORS.pType : COLORS.nType;
    const c3 = npn ? COLORS.nType : COLORS.pType;

    const eLayer = new THREE.Mesh(new THREE.BoxGeometry(layerW, layerH, layerD), stdMat(c1, { style }));
    eLayer.position.set(-0.9, 0, 0);
    g.add(eLayer);

    const bLayer = new THREE.Mesh(new THREE.BoxGeometry(layerW * 0.35, layerH, layerD), stdMat(c2, { style }));
    bLayer.position.set(0, 0, 0);
    g.add(bLayer);

    const cLayer = new THREE.Mesh(new THREE.BoxGeometry(layerW, layerH, layerD), stdMat(c3, { style }));
    cLayer.position.set(0.9, 0, 0);
    g.add(cLayer);

    return g;
  };

  // --- RENDER BY TYPE ---
  if (type === 'pn_junction' || type === 'zener_diode' || type === 'schottky_diode' || type === 'varactor') {
    const body = diodeBody();
    body.position.set(0, 0, 0);
    group.add(body);

    // Anode lead (left)
    group.add(makeWire(V3(-1.2, 0, 0), V3(-2.2, 0, 0), { color: COLORS.metal }));
    // Cathode lead (right)
    group.add(makeWire(V3(0.8, 0, 0), V3(2.2, 0, 0), { color: COLORS.metal }));

    // Zener mark (Z-shaped bar on cathode)
    if (type === 'zener_diode') {
      const z1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.6, 0.32), stdMat(COLORS.metal, { style }));
      z1.position.set(0.48, 0.2, 0);
      group.add(z1);
      const z2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.6, 0.32), stdMat(COLORS.metal, { style }));
      z2.position.set(0.56, -0.2, 0);
      group.add(z2);
    }
    // Schottky mark (S-shaped)
    if (type === 'schottky_diode') {
      const s1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.7, 0.32), stdMat(COLORS.metal, { style }));
      s1.position.set(0.48, 0, 0);
      group.add(s1);
    }

    // Anode/Cathode labels
    const anode = makeLabel('A');
    anode.position.set(-2.6, 0.5, 0);
    group.add(anode);
    const cathode = makeLabel('K');
    cathode.position.set(2.6, 0.5, 0);
    group.add(cathode);

  } else if (type === 'led') {
    const body = diodeBody();
    body.position.set(0, 0, 0);
    group.add(body);
    group.add(makeWire(V3(-1.2, 0, 0), V3(-2.2, 0, 0), { color: COLORS.metal }));
    group.add(makeWire(V3(0.8, 0, 0), V3(2.2, 0, 0), { color: COLORS.metal }));

    // Light glow sphere
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, seg, seg),
      stdMat(0xfde047, { style, emissive: 0xfde047 }),
    );
    glow.position.set(0, 0.4, 0);
    glow.material.transparent = true;
    glow.material.opacity = 0.7;
    group.add(glow);

    // Light rays
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const ray = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.02, 0.02),
        new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.4 }),
      );
      ray.position.set(Math.cos(angle) * 0.7, 0.4 + Math.sin(angle) * 0.7, 0);
      ray.rotation.z = -angle;
      group.add(ray);
    }

  } else if (type === 'photodiode') {
    const body = diodeBody();
    body.position.set(0, 0, 0);
    group.add(body);
    group.add(makeWire(V3(-1.2, 0, 0), V3(-2.2, 0, 0), { color: COLORS.metal }));
    group.add(makeWire(V3(0.8, 0, 0), V3(2.2, 0, 0), { color: COLORS.metal }));

    // Light arrows (incoming)
    for (let i = -1; i <= 1; i++) {
      const arr = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.04, 0.04),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.6 }),
      );
      arr.position.set(0, 0.8 + i * 0.35, 0);
      arr.rotation.z = 0.3;
      group.add(arr);
    }

  } else if (type === 'pnp_transistor') {
    const body = bjtBody(false);
    body.position.set(0, 0.2, 0);
    group.add(body);

    // Emitter (left)
    group.add(makeWire(V3(-1.7, 0, 0), V3(-2.6, 0, 0), { color: COLORS.metal }));
    // Base (top)
    group.add(makeWire(V3(0, 0.5, 0), V3(0, 1.6, 0), { color: COLORS.metal }));
    // Collector (right)
    group.add(makeWire(V3(1.7, 0, 0), V3(2.6, 0, 0), { color: COLORS.metal }));

    const bLabel = makeLabel('B');
    bLabel.position.set(0, 2.0, 0);
    group.add(bLabel);
    const cLabel = makeLabel('C');
    cLabel.position.set(3.0, 0.5, 0);
    group.add(cLabel);
    const eLabel = makeLabel('E');
    eLabel.position.set(-3.0, 0.5, 0);
    group.add(eLabel);

    // Arrow direction (PNP: arrow points IN)
    const arrowHead = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.2, seg),
      stdMat(COLORS.metal, { style }),
    );
    arrowHead.position.set(0, 0.4, 0.25);
    arrowHead.rotation.x = Math.PI / 2;
    group.add(arrowHead);

  } else if (type === 'n_jfet' || type === 'p_jfet') {
    const isN = type === 'n_jfet';
    // Channel bar
    const chan = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.3, 0.6),
      stdMat(isN ? COLORS.nType : COLORS.pType, { style }),
    );
    chan.position.set(0, 0, 0);
    group.add(chan);

    // Gate (wraps around)
    const gateMat = stdMat(COLORS.metal, { style });
    const gateT = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 0.65), gateMat);
    gateT.position.set(0, 0.3, 0);
    group.add(gateT);
    const gateB = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 0.65), gateMat);
    gateB.position.set(0, -0.3, 0);
    group.add(gateB);

    // Source (left)
    group.add(makeWire(V3(-1.3, 0, 0), V3(-2.2, 0, 0), { color: COLORS.metal }));
    // Drain (right)
    group.add(makeWire(V3(1.3, 0, 0), V3(2.2, 0, 0), { color: COLORS.metal }));
    // Gate (top)
    group.add(makeWire(V3(0, 0.8, 0), V3(0, 1.6, 0), { color: COLORS.metal }));

    const sLbl = makeLabel('S');
    sLbl.position.set(-2.6, 0.5, 0);
    group.add(sLbl);
    const dLbl = makeLabel('D');
    dLbl.position.set(2.6, 0.5, 0);
    group.add(dLbl);
    const gLbl = makeLabel('G');
    gLbl.position.set(0, 2.0, 0);
    group.add(gLbl);

  } else if (type === 'igbt') {
    // IGBT: MOSFET-like gate + BJT-like output
    const sub = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.6, 1.0), stdMat(COLORS.pType, { style }));
    sub.position.set(0, -0.3, 0);
    group.add(sub);
    const nWell = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.3, 0.8), stdMat(COLORS.nType, { style }));
    nWell.position.set(0.4, 0, 0);
    group.add(nWell);
    const pWell = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.2, 0.6), stdMat(COLORS.pType, { style }));
    pWell.position.set(-0.6, 0.15, 0);
    group.add(pWell);

    // Gate
    const gateI = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.7), stdMat(COLORS.metal, { style }));
    gateI.position.set(0.4, 0.4, 0);
    group.add(gateI);

    group.add(makeWire(V3(-1.0, 0.2, 0), V3(-2.2, 0.2, 0), { color: COLORS.metal }));
    group.add(makeWire(V3(1.4, 0, 0), V3(2.2, 0, 0), { color: COLORS.metal }));
    group.add(makeWire(V3(0.4, 0.5, 0), V3(0.4, 1.4, 0), { color: COLORS.metal }));

    const eLbl2 = makeLabel('E');
    eLbl2.position.set(-2.6, 0.6, 0);
    group.add(eLbl2);
    const cLbl2 = makeLabel('C');
    cLbl2.position.set(2.6, 0.6, 0);
    group.add(cLbl2);
    const gLbl2 = makeLabel('G');
    gLbl2.position.set(0.4, 1.8, 0);
    group.add(gLbl2);

  } else if (type === 'scr') {
    // PNPN structure
    const layers = [COLORS.pType, COLORS.nType, COLORS.pType, COLORS.nType];
    for (let i = 0; i < 4; i++) {
      const layer = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.5, 1.0),
        stdMat(layers[i], { style }),
      );
      layer.position.set(-1.2 + i * 0.8, 0, 0);
      group.add(layer);
    }
    group.add(makeWire(V3(-1.6, 0, 0), V3(-2.6, 0, 0), { color: COLORS.metal }));
    group.add(makeWire(V3(1.6, 0, 0), V3(2.6, 0, 0), { color: COLORS.metal }));
    group.add(makeWire(V3(0, 0.5, 0), V3(0, 1.4, 0), { color: COLORS.metal }));

    const aLbl = makeLabel('A');
    aLbl.position.set(-3.0, 0.5, 0);
    group.add(aLbl);
    const kLbl = makeLabel('K');
    kLbl.position.set(3.0, 0.5, 0);
    group.add(kLbl);
    const gLbl3 = makeLabel('G');
    gLbl3.position.set(0, 1.8, 0);
    group.add(gLbl3);

  } else if (type === 'triac') {
    // Bidirectional thyristor - two SCRs antiparallel
    for (let side = -1; side <= 1; side += 2) {
      const g = new THREE.Group();
      for (let i = 0; i < 4; i++) {
        const layer = new THREE.Mesh(
          new THREE.BoxGeometry(0.6, 0.35, 0.6),
          stdMat(i % 2 === 0 ? COLORS.pType : COLORS.nType, { style }),
        );
        layer.position.set(side * (i * 0.5 - 0.75), side * 0.15, 0);
        g.add(layer);
      }
      group.add(g);
    }
    group.add(makeWire(V3(0, 0, 0), V3(-2.2, 0, 0), { color: COLORS.metal }));
    group.add(makeWire(V3(0, 0, 0), V3(2.2, 0, 0), { color: COLORS.metal }));

    const mt1 = makeLabel('MT1');
    mt1.position.set(-2.6, 0.5, 0);
    group.add(mt1);
    const mt2 = makeLabel('MT2');
    mt2.position.set(2.6, 0.5, 0);
    group.add(mt2);
  }

  // Interactive electron flow (click the diode/device to toggle bias)
  let flowObj = null;
  let isForwardBias = bias === 'forward';
  if (type === 'pn_junction' || type === 'schottky_diode' || type === 'led' || type === 'zener_diode') {
    const fwdCurve = new THREE.CatmullRomCurve3([V3(-1.8, 0.1, 0.05), V3(-0.5, 0.05, 0.1), V3(0.5, 0.05, 0.1), V3(1.8, 0.1, 0.05)]);
    const revCurve = new THREE.CatmullRomCurve3([V3(1.8, -0.1, -0.05), V3(0.5, -0.05, -0.1), V3(-0.5, -0.05, -0.1), V3(-1.8, -0.1, -0.05)]);
    flowObj = makeFlow(fwdCurve, { count: quality === 'low' ? 6 : 12, color: COLORS.electron, size: 0.06, rate: 0.3 });
    flowObj.active = isForwardBias;
    group.add(flowObj.object);

    // Reverse flow (hidden initially)
    const revFlow = makeFlow(revCurve, { count: quality === 'low' ? 4 : 8, color: 0xef4444, size: 0.04, rate: 0.15 });
    revFlow.active = false;
    group.add(revFlow.object);

    // Store both flows for toggle
    return {
      group,
      targets: { 
        body: { objects: [group] },
        current_flow: { flow: flowObj },
      },
      tick() {},
      onClick() {
        isForwardBias = !isForwardBias;
        flowObj.active = isForwardBias;
        revFlow.active = !isForwardBias;
        // Animate a flash effect on the diode body
        if (window.gsap) {
          // Find the diode body mesh (first child of the diode group)
          const bodyMesh = group.children.find(c => c.type === 'Group')?.children?.[0] || group.children[0];
          if (bodyMesh?.material) {
            window.gsap.fromTo(bodyMesh.material,
              { emissiveIntensity: 0.8 },
              { emissiveIntensity: 0, duration: 0.4, ease: 'power2.out' }
            );
          }
        }
      },
    };
  }

  return {
    group,
    targets: { body: { objects: [group] } },
    tick() {},
  };
}
