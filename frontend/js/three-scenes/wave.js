// Waveform / signal template: 1-3 components and (optionally) their sum.
// params: { mode: "time"|"superposition",
//           waves: [{type: sine|square|triangle|sawtooth, freq, amp, phase}] }
// targets: wave0, wave1, wave2, sum
import { stdMat } from './common.js';

const WAVE_COLORS = [0x38bdf8, 0xf97316, 0x22c55e];
const SUM_COLOR = 0xe879f9;

const FN = {
  sine: (p) => Math.sin(p),
  square: (p) => Math.sign(Math.sin(p)) * 0.85,
  triangle: (p) => (2 / Math.PI) * Math.asin(Math.sin(p)),
  sawtooth: (p) => 2 * ((p / (2 * Math.PI)) % 1) - 1,
};

const SPAN = 8;   // x extent
const POINTS = 160;

export function build({ THREE, style, params, quality }) {
  const group = new THREE.Group();
  const mode = params.mode || 'time';
  const waves = (params.waves?.length ? params.waves : [{ type: 'sine', freq: 1, amp: 1 }])
    .slice(0, 3);
  const n = quality === 'low' ? 90 : POINTS;

  // Axes.
  const axisMat = new THREE.LineBasicMaterial({ color: 0x334155 });
  const xAxis = new THREE.Line(new THREE.BufferGeometry().setFromPoints(
    [new THREE.Vector3(-SPAN / 2, 0, 0), new THREE.Vector3(SPAN / 2, 0, 0)]), axisMat);
  const yAxis = new THREE.Line(new THREE.BufferGeometry().setFromPoints(
    [new THREE.Vector3(-SPAN / 2, -2.2, 0), new THREE.Vector3(-SPAN / 2, 2.2, 0)]), axisMat);
  group.add(xAxis, yAxis);

  const makeLine = (color, z) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95 });
    const line = new THREE.Line(geo, mat);
    line.position.z = z;
    line.frustumCulled = false;
    return line;
  };

  const componentLines = waves.map((w, i) => {
    const line = makeLine(WAVE_COLORS[i % WAVE_COLORS.length],
      mode === 'superposition' ? -0.4 - i * 0.4 : 0);
    group.add(line);
    return line;
  });

  let sumLine = null;
  if (mode === 'superposition' && waves.length > 1) {
    sumLine = makeLine(SUM_COLOR, 0.4);
    group.add(sumLine);
  }

  // A little "signal source" box on the left, for labeling / realism.
  const source = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), stdMat(0x475569, { style }));
  source.position.set(-SPAN / 2 - 0.6, 0, 0);
  source.userData.labelOffsetY = 0.7;
  group.add(source);

  const speed = { value: 1, frozen: false };
  let time = 0;

  const evalWave = (w, x, t) => {
    const p = w.freq * (x + SPAN / 2) * 1.2 - t * 2 * w.freq + (w.phase || 0);
    return (FN[w.type] || FN.sine)(p) * w.amp;
  };

  const updateLines = (t) => {
    componentLines.forEach((line, wi) => {
      const pos = line.geometry.attributes.position;
      for (let i = 0; i < n; i++) {
        const x = -SPAN / 2 + (i / (n - 1)) * SPAN;
        pos.setXYZ(i, x, evalWave(waves[wi], x, t), 0);
      }
      pos.needsUpdate = true;
    });
    if (sumLine) {
      const pos = sumLine.geometry.attributes.position;
      for (let i = 0; i < n; i++) {
        const x = -SPAN / 2 + (i / (n - 1)) * SPAN;
        const y = waves.reduce((acc, w) => acc + evalWave(w, x, t), 0);
        pos.setXYZ(i, x, y, 0);
      }
      pos.needsUpdate = true;
    }
  };
  updateLines(0);

  // Lines have no emissive material, so give wave targets a custom highlight:
  // flash the line color to white and back.
  const lineHighlight = (line) => () => ({
    tween: null,
    start() {
      const c = line.material.color.clone();
      if (window.gsap) {
        this.tween = window.gsap.to(line.material.color, {
          r: 1, g: 1, b: 1, duration: 0.35, yoyo: true, repeat: 5,
          onComplete: () => line.material.color.copy(c),
        });
      }
    },
    stop() { this.tween?.kill(); },
  });

  const targets = {};
  componentLines.forEach((line, i) => {
    targets[`wave${i}`] = {
      objects: [line],
      custom: { highlight: lineHighlight(line), pulse: lineHighlight(line) },
    };
  });
  if (sumLine) {
    targets.sum = {
      objects: [sumLine],
      custom: { highlight: lineHighlight(sumLine), pulse: lineHighlight(sumLine) },
    };
  }
  targets.source = { objects: [source], labelAnchor: source };
  // "oscillate" on the source freezes/unfreezes time (useful for "look at this instant").
  targets.source.custom = {
    toggle: () => ({ start: () => { speed.frozen = !speed.frozen; }, stop: () => {} }),
  };

  return {
    group,
    targets,
    tick(dt) {
      if (speed.frozen) return;
      time += dt * speed.value;
      updateLines(time);
    },
  };
}
