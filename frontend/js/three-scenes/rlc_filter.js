// RLC / Filter Circuit 3D template.
// params: { type: "series_rlc"|"parallel_rlc"|"lowpass"|"highpass", r: 1..1000, l: 0.1..100, c: 0.01..1000, frequency: 1..10000 }
// targets: resistor, inductor, capacitor, source, output_signal, rlc_loop, resonance_indicator
import { V3, COLORS, stdMat, makeWire, makeFlow, makeLabel } from './common.js';

export function build({ THREE, style, params, quality, template }) {
  const group = new THREE.Group();
  const type = template || 'series_rlc';

  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const wireColor = COLORS.wireOff;
  const wireR = 0.04;

  // Component helpers defined inside build() so THREE is in scope
  const makeInductor = (pos, opts = {}) => {
    const g = new THREE.Group();
    const r = opts.radius || 0.3, turns = opts.turns || 5, h = opts.height || 0.5;
    const pts = [];
    const steps = turns * 16;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      pts.push(new THREE.Vector3((t - 0.5) * h, Math.cos(t * turns * Math.PI * 2) * r, Math.sin(t * turns * Math.PI * 2) * r));
    }
    const mesh = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), steps, 0.03, 6, false),
      new THREE.MeshStandardMaterial({ color: opts.color || COLORS.wireOff, roughness: 0.4, metalness: 0.3 }),
    );
    g.add(mesh);
    g.position.copy(pos);
    return g;
  };

  const makeCapacitor = (pos, opts = {}) => {
    const g = new THREE.Group();
    const mat = stdMat(opts.color || COLORS.wireOff, { style });
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.35, 0.04), mat);
    p1.position.set(-0.08, 0, 0);
    const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.35, 0.04), mat);
    p2.position.set(0.08, 0, 0);
    g.add(p1, p2);
    g.position.copy(pos);
    return g;
  };

  const makeResistor = (pos, opts = {}) => {
    const g = new THREE.Group();
    const segs = 7;
    const pts = [];
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      pts.push(new THREE.Vector3((t - 0.5) * 0.6, i % 2 === 0 ? 0 : 0.22, 0));
    }
    const mesh = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.03, 6, false),
      new THREE.MeshStandardMaterial({ color: opts.color || COLORS.wireOff, roughness: 0.5, metalness: 0.2 }),
    );
    g.add(mesh);
    g.position.copy(pos);
    return g;
  };

  const makeTrace = (opts = {}) => {
    const amp = opts.amp || 1, freq = opts.freq || 2, color = opts.color || 0x22c55e;
    const segments = opts.segments || 80, width = opts.width || 3;
    const pts = [];
    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * width - width / 2;
      pts.push(new THREE.Vector3(t, amp * Math.sin(freq * t * Math.PI) * 0.3, 0));
    }
    return new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), segments, 0.025, 4, false),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.3 }),
    );
  };

  // --- AC Source ---
  const srcRing = new THREE.Mesh(
    new THREE.RingGeometry(0.3, 0.38, 24),
    stdMat(0x22c55e, { style, emissive: 0x22c55e }),
  );
  srcRing.position.set(-2.0, 0, 0);
  srcRing.userData.tooltip = () => {
    const f = freqs ? freqs[freqIdx] : 50;
    return `AC Source &bull; f = <b>${f}</b> Hz (click to change)`;
  };
  group.add(srcRing);

  const srcWave = new THREE.Mesh(
    new THREE.TorusGeometry(0.15, 0.025, 8, 16, Math.PI),
    stdMat(0x22c55e, { style, emissive: 0x22c55e }),
  );
  srcWave.position.set(-2.0, 0, 0);
  srcWave.rotation.z = Math.PI / 2;
  group.add(srcWave);

  let source = srcRing;
  let resistor = null, inductor = null, capacitor = null;
  let outputSignal = null, rlcLoop = null;

  if (type === 'series_rlc') {
    group.add(makeWire(V3(-1.6, 0.6, 0), V3(-0.6, 0.6, 0), { color: wireColor, radius: wireR }));
    resistor = makeResistor(V3(0, 0.6, 0), { color: 0xf97316 });
    resistor.children[0].userData.tooltip = `R = ${params.r ?? 100} Ω &bull; ${params.r ? params.r >= 1000 ? `${(params.r/1000).toFixed(1)} kΩ` : `${params.r} Ω` : '100 Ω'}`;
    group.add(resistor);
    group.add(makeWire(V3(0.6, 0.6, 0), V3(1.2, 0.6, 0), { color: wireColor, radius: wireR }));
    inductor = makeInductor(V3(1.8, 0.6, 0), { color: 0x38bdf8 });
    inductor.children[0].userData.tooltip = `L = ${params.l ?? 10} mH &bull; X<sub>L</sub> = 2πfL`;
    group.add(inductor);
    group.add(makeWire(V3(2.4, 0.6, 0), V3(2.8, 0.6, 0), { color: wireColor, radius: wireR }));
    capacitor = makeCapacitor(V3(2.8, 0, 0), { color: 0xfde047 });
    capacitor.children[0].userData.tooltip = `C = ${params.c ?? 100} µF &bull; X<sub>C</sub> = 1/(2πfC)`;
    group.add(capacitor);
    group.add(makeWire(V3(2.8, -0.35, 0), V3(2.8, -0.6, 0), { color: wireColor, radius: wireR }));
    group.add(makeWire(V3(2.8, -0.6, 0), V3(-1.6, -0.6, 0), { color: wireColor, radius: wireR }));
    group.add(makeWire(V3(-1.6, -0.6, 0), V3(-1.6, -0.35, 0), { color: wireColor, radius: wireR }));

    const loopCurve = new THREE.CatmullRomCurve3([
      V3(-1.6, 0.3, 0.05), V3(-0.5, 0.3, 0.1), V3(0.5, 0.3, 0.05),
      V3(1.5, 0.3, 0.05), V3(2.5, 0.3, 0.05), V3(2.8, 0, 0.1),
      V3(2.5, -0.3, 0.05), V3(1.5, -0.3, 0.05), V3(0, -0.3, 0.1), V3(-1.6, -0.3, 0.05),
    ]);
    const loopFlow = makeFlow(loopCurve, {
      count: quality === 'low' ? 12 : 24, color: 0x22c55e, size: 0.05, rate: 0.4,
    });
    rlcLoop = loopFlow;
    group.add(loopFlow.object);

    outputSignal = makeWire(V3(2.8, 0.4, 0), V3(3.6, 0.4, 0), { color: 0x60a5fa, radius: 0.04 });
    group.add(outputSignal, makeWire(V3(3.6, 0.4, 0), V3(3.6, -0.6, 0), { color: 0x60a5fa, radius: 0.035 }));

  } else if (type === 'parallel_rlc') {
    group.add(makeWire(V3(-1.0, 0, 0), V3(0, 0.8, 0), { color: wireColor, radius: wireR }));
    group.add(makeWire(V3(0, -0.8, 0), V3(-1.0, 0, 0), { color: wireColor, radius: wireR }));

    resistor = makeResistor(V3(-0.7, 0, 0), { color: 0xf97316 });
    resistor.children[0].userData.tooltip = `R = ${params.r ?? 100} Ω`;
    group.add(resistor);
    group.add(makeWire(V3(-0.7, 0.35, 0), V3(0, 0.8, 0), { color: wireColor, radius: wireR * 0.8 }));
    group.add(makeWire(V3(0, -0.8, 0), V3(-0.7, -0.35, 0), { color: wireColor, radius: wireR * 0.8 }));

    inductor = makeInductor(V3(0, 0.15, 0), { color: 0x38bdf8, radius: 0.25, turns: 4, height: 0.3 });
    inductor.children[0].userData.tooltip = `L = ${params.l ?? 10} mH`;
    group.add(inductor);
    group.add(makeWire(V3(0, 0.4, 0), V3(0, 0.8, 0), { color: wireColor, radius: wireR * 0.8 }));
    group.add(makeWire(V3(0, -0.8, 0), V3(0, -0.1, 0), { color: wireColor, radius: wireR * 0.8 }));

    capacitor = makeCapacitor(V3(0.7, 0, 0), { color: 0xfde047 });
    capacitor.children[0].userData.tooltip = `C = ${params.c ?? 100} µF`;
    group.add(capacitor);
    group.add(makeWire(V3(0.7, 0.35, 0), V3(0, 0.8, 0), { color: wireColor, radius: wireR * 0.8 }));
    group.add(makeWire(V3(0, -0.8, 0), V3(0.7, -0.35, 0), { color: wireColor, radius: wireR * 0.8 }));

    group.add(makeWire(V3(-2.0, 0, 0), V3(-1.0, 0, 0), { color: wireColor, radius: wireR }));

    const loopCurve = new THREE.CatmullRomCurve3([
      V3(-1.5, 0.1, 0.05), V3(-0.7, 0.3, 0.1), V3(0, 0.3, 0.05),
      V3(0.7, 0.3, 0.1), V3(0.7, -0.3, 0.1), V3(0, -0.3, 0.05),
      V3(-0.7, -0.3, 0.1), V3(-1.5, -0.1, 0.05),
    ]);
    const loopFlow = makeFlow(loopCurve, {
      count: quality === 'low' ? 10 : 20, color: 0x22c55e, size: 0.05, rate: 0.35,
    });
    rlcLoop = loopFlow;
    group.add(loopFlow.object);
    outputSignal = makeWire(V3(0, 0.8, 0), V3(1.6, 0.8, 0), { color: 0x60a5fa, radius: 0.04 });
    group.add(outputSignal);

  } else if (type === 'lowpass' || type === 'highpass') {
    const isLP = type === 'lowpass';
    group.add(makeWire(V3(-2.2, 0.5, 0), V3(-1.2, 0.5, 0), { color: 0x22c55e, radius: wireR }));
    resistor = makeResistor(V3(-0.6, 0.5, 0), { color: 0xf97316 });
    resistor.children[0].userData.tooltip = `R = ${params.r ?? 100} Ω`;
    group.add(resistor);
    group.add(makeWire(V3(0, 0.5, 0), V3(1.0, 0.5, 0), { color: wireColor, radius: wireR }));

    if (isLP) {
      capacitor = makeCapacitor(V3(1.0, 0, 0), { color: 0x60a5fa });
      group.add(capacitor);
      group.add(makeWire(V3(1.0, 0.35, 0), V3(1.0, 0.5, 0), { color: 0x60a5fa, radius: wireR * 0.8 }));
      group.add(makeWire(V3(1.0, -0.35, 0), V3(1.0, -0.7, 0), { color: 0x4b5563, radius: wireR * 0.7 }));
    } else {
      inductor = makeInductor(V3(1.0, 0.15, 0), { color: 0x60a5fa, radius: 0.2, turns: 4, height: 0.25 });
      group.add(inductor);
      group.add(makeWire(V3(1.0, 0.4, 0), V3(1.0, 0.5, 0), { color: 0x60a5fa, radius: wireR * 0.8 }));
      group.add(makeWire(V3(1.0, -0.1, 0), V3(1.0, -0.7, 0), { color: 0x4b5563, radius: wireR * 0.7 }));
    }

    outputSignal = makeWire(V3(1.0, 0.5, 0), V3(2.2, 0.5, 0), { color: 0x60a5fa, radius: wireR });
    group.add(outputSignal);
    group.add(makeWire(V3(-2.2, -0.7, 0), V3(2.2, -0.7, 0), { color: 0x4b5563, radius: wireR * 0.7 }));

    const srcRing2 = new THREE.Mesh(
      new THREE.RingGeometry(0.25, 0.33, 20),
      stdMat(0x22c55e, { style, emissive: 0x22c55e }),
    );
    srcRing2.position.set(-2.6, 0.5, 0);
    srcRing2.userData.tooltip = () => {
      const f = freqs ? freqs[freqIdx] : 50;
      return `Source &bull; f = <b>${f}</b> Hz (click to change)`;
    };
    group.add(srcRing2);

    const trace = makeTrace({ amp: 0.6, freq: isLP ? 1.5 : 2.5, color: 0x60a5fa, segments: 50, width: 1.4 });
    trace.position.set(1.6, 0.5, 0.05);
    trace.scale.set(0.6, 0.6, 0.6);
    trace.material.transparent = true;
    trace.material.opacity = 0.7;
    group.add(trace);

    const fCurve = new THREE.CatmullRomCurve3([
      V3(-2.0, 0.2, 0.05), V3(-1.0, 0.2, 0.08), V3(0, 0.2, 0.05),
      V3(1.0, 0.2, 0.08), V3(1.6, 0.2, 0.05),
    ]);
    const fFlow = makeFlow(fCurve, {
      count: quality === 'low' ? 8 : 16, color: 0x22c55e, size: 0.05, rate: 0.3,
    });
    rlcLoop = fFlow;
    group.add(fFlow.object);
    source = srcRing2;
  }

  // Resonance indicator
  const resoRing = new THREE.Mesh(
    new THREE.RingGeometry(0.08, 0.15, 16),
    new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.0, side: THREE.DoubleSide }),
  );
  resoRing.position.set(2.4, -0.2, 0.1);
  resoRing.userData.tooltip = () => {
    const f = freqs ? freqs[freqIdx] : 50;
    const nearResonance = Math.abs(f - 159) < 50;
    return `Resonance &bull; f<sub>0</sub> ≈ 159 Hz ${nearResonance ? '<span style="color:#22c55e">⚡ NEAR RESONANCE</span>' : ''}`;
  };
  group.add(resoRing);

  // Freqs array — accessible from tooltip closures and interactive controls
  const freqs = [50, 200, 500, 159, 1000]; // Hz (159 ≈ 1/2π√LC for default R=10Ω, L=10mH, C=100µF)
  let freqIdx = 0;
  const freqLabel = makeLabel('50 Hz');
  freqLabel.position.set(0, -1.0, 0);
  group.add(freqLabel);
  resoRing.userData.freeUpdate = true; // tick() controls opacity when true

  const freqColors = [0x22c55e, 0x38bdf8, 0xf97316, 0xfde047, 0xef4444];

  group.position.y = -0.1;

  // Build targets dynamically to skip null component references
  const targets = {};
  if (resistor) targets.resistor = { objects: [resistor] };
  if (inductor) targets.inductor = { objects: [inductor] };
  if (capacitor) targets.capacitor = { objects: [capacitor] };
  targets.source = { objects: [source] };
  if (outputSignal) targets.output_signal = { objects: [outputSignal] };
  if (rlcLoop) targets.rlc_loop = { flow: rlcLoop };
  targets.resonance_indicator = {
    objects: [resoRing],
    custom: {
      highlight: () => ({
        start: () => {
          resoRing.material.opacity = 0.7;
          if (window.gsap) {
            window.gsap.to(resoRing.material, {
              opacity: 0.2, duration: 1.2, yoyo: true, repeat: 5, ease: 'sine.inOut',
              onComplete: () => { resoRing.material.opacity = 0; },
            });
          }
        },
        stop: () => { resoRing.material.opacity = 0; },
      }),
    },
  };

  // Patch the resonance_indicator highlight to respect freeUpdate
  targets.resonance_indicator.custom.highlight = () => ({
    start: () => {
      resoRing.userData.freeUpdate = false;
      resoRing.material.opacity = 0.7;
      if (window.gsap) {
        window.gsap.to(resoRing.material, {
          opacity: 0.2, duration: 1.2, yoyo: true, repeat: 3, ease: 'sine.inOut',
          onComplete: () => {
            resoRing.material.opacity = 0;
            resoRing.userData.freeUpdate = true;
          },
        });
      } else {
        resoRing.userData.freeUpdate = true;
      }
    },
    stop: () => {
      resoRing.material.opacity = 0;
      resoRing.userData.freeUpdate = true;
    },
  });

  return {
    group,
    targets,
    tick() {
      // Only update opacity when not overridden by gsap highlight
      if (!resoRing.userData.freeUpdate) return;
      const f = freqs[freqIdx];
      const resonanceFreq = 159;
      const ratio = Math.min(f, resonanceFreq) / Math.max(f, resonanceFreq);
      const brightness = Math.pow(1 - Math.abs(1 - ratio) * 2, 2);
      resoRing.material.opacity = brightness * 0.6;
      if (rlcLoop) rlcLoop.rate = 0.15 + (f / 1000) * 0.5;
    },
    onClick(obj) {
      // Click the source or any component to change frequency
      if (obj === resoRing || obj === source || obj?.material?.color) {
        freqIdx = (freqIdx + 1) % freqs.length;
        const f = freqs[freqIdx];
        // Update label
        const lbl = freqLabel;
        if (lbl && lbl.element) {
          lbl.element.textContent = f + ' Hz';
        } else if (lbl) {
          // Fallback: try to find children
          freqLabel.element.textContent = f + ' Hz';
        }
        // Visually highlight
        if (window.gsap) {
          window.gsap.fromTo(freqLabel.position, 
            { y: -1.0 }, 
            { y: -1.15, duration: 0.15, yoyo: true, repeat: 1, ease: 'sine.inOut' }
          );
        }
        if (rlcLoop) {
          rlcLoop.active = true;
          rlcLoop.rate = 0.15 + (f / 1000) * 0.5;
        }
      }
    },
  };
}
