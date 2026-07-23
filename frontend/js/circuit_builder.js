// Interactive Circuit Builder for EngiBuddy
// Click components from a palette, place them on a grid, wire them up, and see live simulation.
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { V3, COLORS, stdMat, makeWire } from './three-scenes/common.js';
import { Oscilloscope } from './oscilloscope.js';
import { CircuitLibrary } from './circuit_library.js';

/* ===================== COMPONENT DEFINITIONS ===================== */

const COMPONENT_TYPES = {
  battery: {
    label: 'Battery',
    icon: '🔋',
    color: 0x22c55e,
    params: { voltage: 5, default: 5, min: 1, max: 24 },
    terminals: 2,
    description: 'DC voltage source',
  },
  resistor: {
    label: 'Resistor',
    icon: '◖◗',
    color: 0xf97316,
    params: { resistance: 1000, default: 1000, unit: 'Ω', min: 10, max: 1e6 },
    terminals: 2,
    description: 'R = 1 kΩ',
  },
  capacitor: {
    label: 'Capacitor',
    icon: '‖‖',
    color: 0x60a5fa,
    params: { capacitance: 1e-6, default: 1e-6, unit: 'F', min: 1e-12, max: 1e-3 },
    terminals: 2,
    description: 'C = 1 µF',
  },
  inductor: {
    label: 'Inductor',
    icon: '∞∞',
    color: 0x38bdf8,
    params: { inductance: 1e-3, default: 1e-3, unit: 'H', min: 1e-6, max: 10 },
    terminals: 2,
    description: 'L = 1 mH',
  },
  led: {
    label: 'LED',
    icon: '💡',
    color: 0xfde047,
    params: { forwardVoltage: 2.0, default: 2.0, min: 1.2, max: 3.6 },
    terminals: 2,
    description: 'Vf = 2.0 V',
  },
  switch: {
    label: 'Switch',
    icon: '⚡',
    color: 0x9ca3af,
    params: {},
    terminals: 2,
    description: 'Click to toggle',
  },
  ground: {
    label: 'Ground',
    icon: '⊥',
    color: 0x4b5563,
    params: {},
    terminals: 1,
    description: '0 V reference',
  },
  and_gate: {
    label: 'AND',
    icon: '&',
    color: 0x8b5cf6,
    params: {},
    terminals: 3,
    description: 'A · B',
  },
  or_gate: {
    label: 'OR',
    icon: '≥1',
    color: 0x8b5cf6,
    params: {},
    terminals: 3,
    description: 'A + B',
  },
  not_gate: {
    label: 'NOT',
    icon: '1',
    color: 0x8b5cf6,
    params: {},
    terminals: 2,
    description: '¬A',
  },
  opamp: {
    label: 'Op-Amp',
    icon: '⊿',
    color: 0x8b5cf6,
    params: { gain: 200000, default: 200000 },
    terminals: 5,
    description: 'Vout = A·(V+ − V−)',
  },
  transformer: {
    label: 'XFMR',
    icon: '⧁',
    color: 0xd97706,
    params: { turnsRatio: 2, default: 2, min: 0.1, max: 100 },
    terminals: 4,
    description: 'N = 2:1',
  },
  npn_transistor: {
    label: 'NPN',
    icon: '🔺',
    color: 0x3b82f6,
    params: { beta: 100, default: 100, min: 20, max: 1000 },
    terminals: 3,
    description: 'β = 100',
  },
  pnp_transistor: {
    label: 'PNP',
    icon: '🔻',
    color: 0xf97316,
    params: { beta: 100, default: 100, min: 20, max: 1000 },
    terminals: 3,
    description: 'β = 100',
  },
  voltage_regulator: {
    label: 'Vreg',
    icon: '⊟',
    color: 0x22c55e,
    params: { outputVoltage: 5, default: 5, min: 1.2, max: 24 },
    terminals: 3,
    description: 'Vout = 5 V',
  },
  wire: {
    label: 'Wire',
    icon: '—',
    color: 0x64748b,
    params: {},
    terminals: 2,
    description: 'Connect nodes',
  },
};

/* ===================== SIMULATION ENGINE ===================== */

/**
 * Simple DC circuit simulator using modified nodal analysis.
 * Solves for node voltages and branch currents.
 */
class SimEngine {
  constructor() {
    this.clear();
  }

  clear() {
    this.nodes = new Map();   // nodeId -> { voltage: number }
    this.components = [];     // { type, nodeA, nodeB, value, id }
    this.voltages = new Map(); // nodeId -> computed voltage
  }

  addComponent(comp) {
    this.components.push(comp);
  }

  removeComponent(id) {
    const idx = this.components.findIndex((c) => c.id === id);
    if (idx >= 0) this.components.splice(idx, 1);
  }

  /**
   * Solve the circuit using simple iterative approach.
   * For DC circuits: voltage dividers, parallel/series.
   * For digital: logic gate evaluation.
   */
  solve() {
    this.voltages.clear();
    const nodeSet = new Set();

    // Phase 1: Ground and battery fixed voltages
    for (const c of this.components) {
      if (c.type === 'ground') {
        this.voltages.set(c.nodeA, 0);
      }
      if (c.type === 'battery') {
        const v = c.value || 5;
        this.voltages.set(c.nodeA, v);
        if (!this.voltages.has(c.nodeB)) this.voltages.set(c.nodeB, 0);
      }
      if (c.nodeA !== undefined) nodeSet.add(c.nodeA);
      if (c.nodeB !== undefined) nodeSet.add(c.nodeB);
    }

    // Phase 2: Switches
    for (const c of this.components) {
      if (c.type === 'switch') {
        const val = c.closed ? 5 : 0;
        if (!this.voltages.has(c.nodeA)) this.voltages.set(c.nodeA, val);
        if (!this.voltages.has(c.nodeB)) this.voltages.set(c.nodeB, val);
      }
    }

    // Phase 3: Op-amp differential mode
    for (const c of this.components) {
      if (c.type === 'opamp') {
        const vPlus = this.voltages.get(c.nodeA) || 0;   // non-inverting (+)
        const vMinus = this.voltages.get(c.nodeB) || 0; // inverting (-)
        const vSup = this.voltages.get(c.nodeC) || 12;  // V+ supply (nodeC)
        const vNeg = this.voltages.get(c.nodeD) || -12; // V- supply (nodeD)
        const gain = c.value || 200000;
        let vOut = gain * (vPlus - vMinus);
        // Saturation
        vOut = Math.max(vNeg + 1.5, Math.min(vSup - 1.5, vOut));
        this.voltages.set(c.nodeE, vOut);
      }
    }

    // Phase 3b: Transformer (DC approximation)
    for (const c of this.components) {
      if (c.type === 'transformer') {
        const ratio = c.value || 2;
        const vPrim = this.voltages.get(c.nodeA) || 0;
        const vSec = vPrim * ratio;
        if (vPrim > 0) {
          this.voltages.set(c.nodeC, vSec); // secondary high
          this.voltages.set(c.nodeD, 0);   // secondary low ref
        }
      }
    }

    // Phase 3c: Transistor (NPN/PNP) — switch mode
    for (const c of this.components) {
      if (c.type === 'npn_transistor' || c.type === 'pnp_transistor') {
        const isNpn = c.type === 'npn_transistor';
        // nodeA = base, nodeB = collector, nodeC = emitter
        const vBase = this.voltages.get(c.nodeA) || 0;
        const vCollector = this.voltages.get(c.nodeB) || 0;
        const vEmitter = this.voltages.get(c.nodeC) || 0;
        const beta = c.value || 100;
        if (isNpn) {
          // NPN: conducts when Vbe > 0.65V
          const vbe = vBase - vEmitter;
          if (vbe > 0.65) {
            c.on = true;
            // Saturation: Vce ≈ 0.2V
            this.voltages.set(c.nodeC, vBase - 0.65);
            const ib = (vbe - 0.65) / 10000; // crude base current
            c.current = ib * beta;
            // Pull collector down
            if (vCollector > vEmitter + 0.2) {
              this.voltages.set(c.nodeB, vEmitter + 0.2);
            }
          } else {
            c.on = false;
            c.current = 0;
          }
        } else {
          // PNP: conducts when Veb > 0.65V (emitter higher than base)
          const veb = vEmitter - vBase;
          if (veb > 0.65) {
            c.on = true;
            this.voltages.set(c.nodeC, vBase + 0.65);
            const ib = (veb - 0.65) / 10000;
            c.current = ib * beta;
            // Pull emitter down toward collector
            if (vEmitter > vCollector + 0.2) {
              this.voltages.set(c.nodeA, vEmitter - 0.65);
            }
          } else {
            c.on = false;
            c.current = 0;
          }
        }
      }
    }

    // Phase 3d: Voltage regulator
    for (const c of this.components) {
      if (c.type === 'voltage_regulator') {
        const vOut = c.value || 5;
        // nodeA = input, nodeB = ground, nodeC = output
        const vIn = this.voltages.get(c.nodeA) || 0;
        const vGnd = this.voltages.get(c.nodeB) || 0;
        if (vIn > vOut + 2) { // dropout voltage ≈ 2V
          this.voltages.set(c.nodeC, vOut);
          c.on = true;
        } else {
          this.voltages.set(c.nodeC, Math.max(0, vIn - 2));
          c.on = false;
        }
      }
    }

    // Phase 3e: Find gate input nodes and evaluate logic
    for (const c of this.components) {
      if (c.type === 'and_gate' || c.type === 'or_gate' || c.type === 'not_gate') {
        const inputVoltage = this.voltages.get(c.nodeA) || 0;
        let output = 0;
        if (c.type === 'not_gate') {
          output = inputVoltage > 2.5 ? 0 : 5;
        } else {
          // Second input comes from nodeC (assigned during placement)
          const input2Voltage = this.voltages.get(c.nodeC) || 0;
          const v1 = inputVoltage > 2.5 ? 1 : 0;
          const v2 = input2Voltage > 2.5 ? 1 : 0;
          if (c.type === 'and_gate') output = (v1 & v2) * 5;
          else output = (v1 | v2) * 5;
        }
        this.voltages.set(c.nodeB, output);
      }
    }

    // Set default unknown voltages to 0
    for (const n of nodeSet) {
      if (!this.voltages.has(n)) this.voltages.set(n, 0);
    }

    // Phase 4: Voltage divider solver for resistor networks
    for (const c of this.components) {
      if (c.type === 'resistor' && this.voltages.has(c.nodeA) && this.voltages.has(c.nodeB)) {
        const va = this.voltages.get(c.nodeA);
        const vb = this.voltages.get(c.nodeB);
        if (va !== vb) {
          c.current = (va - vb) / (c.value || 1000);
        } else {
          c.current = 0;
        }
        c.voltageDrop = Math.abs(va - vb);
      }
    }

    // Phase 5: LED evaluation
    for (const c of this.components) {
      if (c.type === 'led') {
        const vf = c.value || 2.0;
        const va = this.voltages.get(c.nodeA) || 0;
        const vb = this.voltages.get(c.nodeB) || 0;
        c.voltageDrop = va - vb;
        c.on = c.voltageDrop >= vf && va > 0;
        if (c.on) c.current = (c.voltageDrop - vf) / 220;
        else c.current = 0;
      }
    }

    return this.voltages;
  }

  /**
   * Run a time-domain transient simulation of the circuit.
   * Uses explicit forward Euler integration for reactive elements (caps/inductors).
   * Returns raw voltage-vs-time traces for all nodes in the circuit.
   */
  transient(duration = 0.01, dt = 1e-6) {
    const caps = this.components.filter((c) => c.type === 'capacitor');
    const inds = this.components.filter((c) => c.type === 'inductor');
    const steps = Math.ceil(duration / dt);

    const nodeIds = new Set();
    for (const c of this.components) {
      [c.nodeA, c.nodeB, c.nodeC, c.nodeD, c.nodeE]
        .filter((n) => n !== undefined)
        .forEach((n) => nodeIds.add(n));
    }
    const allNodeIds = [...nodeIds];

    const capV = new Map();
    const indI = new Map();

    const maxSamples = 1000;
    const recordInterval = Math.max(1, Math.floor(steps / maxSamples));
    const expectedSamples = Math.floor(steps / recordInterval) + 1;

    const raw = {};
    for (const nid of allNodeIds) raw[nid] = new Float64Array(expectedSamples);

    let recorded = 0;
    this.solve();

    for (const nid of allNodeIds) {
      raw[nid][recorded] = this.voltages.get(nid) || 0;
    }
    recorded++;

    for (const cap of caps) {
      const va = this.voltages.get(cap.nodeA) || 0;
      const vb = this.voltages.get(cap.nodeB) || 0;
      capV.set(cap.id, va - vb);
    }

    for (let step = 1; step <= steps; step++) {
      for (const ind of inds) {
        const L = ind.value || 1e-3;
        const vl = (this.voltages.get(ind.nodeA) || 0) - (this.voltages.get(ind.nodeB) || 0);
        const prevIl = indI.get(ind.id) || 0;
        indI.set(ind.id, prevIl + (vl / L) * dt);
      }

      for (const cap of caps) {
        const C = cap.value || 1e-6;
        const vApplied = (this.voltages.get(cap.nodeA) || 0) - (this.voltages.get(cap.nodeB) || 0);
        const prevVc = capV.get(cap.id) ?? 0;
        let rSum = 0, rCount = 0;
        for (const c of this.components) {
          if (c.type === 'resistor' && c.value && (c.nodeA === cap.nodeA || c.nodeB === cap.nodeA || c.nodeA === cap.nodeB || c.nodeB === cap.nodeB)) {
            rSum += c.value; rCount++;
          }
        }
        const tau = Math.max((rCount > 0 ? rSum / rCount : 1000) * C, 1e-9);
        capV.set(cap.id, prevVc + (1 - Math.exp(-dt / tau)) * (vApplied - prevVc));
      }

      this.solve();

      for (const cap of caps) {
        const vc = capV.get(cap.id) || 0;
        const vA = this.voltages.get(cap.nodeA) || 0;
        const vB = this.voltages.get(cap.nodeB) || 0;
        if (Math.abs((vA - vB) - vc) > 0.01) this.voltages.set(cap.nodeB, vA - vc);
      }

      if (step % recordInterval === 0 && recorded < expectedSamples) {
        for (const nid of allNodeIds) raw[nid][recorded] = this.voltages.get(nid) || 0;
        recorded++;
      }
    }

    const trimmed = {};
    for (const nid of allNodeIds) {
      const arr = new Float64Array(recorded);
      for (let i = 0; i < recorded; i++) arr[i] = raw[nid][i];
      trimmed[nid] = arr;
    }
    return { traces: trimmed, nodeIds: allNodeIds, duration, dt, samples: recorded };
  }
}

/* ===================== 3D COMPONENT MESHES ===================== */

function makeComponentMesh(type, params = {}) {
  const g = new THREE.Group();
  const color = COMPONENT_TYPES[type]?.color || 0x64748b;
  const mat = () => stdMat(color, { style: 'schematic' });
  const wireMat = () => new THREE.MeshStandardMaterial({ color: COLORS.wireOff, roughness: 0.5, metalness: 0.2 });

  switch (type) {
    case 'battery': {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.3), mat());
      g.add(body);
      // Positive terminal
      const pos = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.15, 0.08), wireMat());
      pos.position.set(0, 0.45, 0);
      g.add(pos);
      // Negative terminal
      const neg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), wireMat());
      neg.position.set(0, -0.4, 0);
      g.add(neg);
      // + label
      const plus = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.04), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
      plus.position.set(0, 0.55, 0.2);
      g.add(plus);
      break;
    }
    case 'resistor': {
      const pts = [];
      const segs = 7;
      for (let i = 0; i <= segs; i++) {
        const t = (i / segs) - 0.5;
        pts.push(new THREE.Vector3(t * 0.6, i % 2 === 0 ? 0 : 0.12, 0));
      }
      const body = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.04, 6, false),
        new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.2 }),
      );
      g.add(body);
      g.userData.terminalPositions = [
        V3(-0.4, 0, 0),
        V3(0.4, 0, 0),
      ];
      break;
    }
    case 'capacitor': {
      const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.25, 0.15), wireMat());
      p1.position.set(-0.1, 0, 0);
      g.add(p1);
      const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.25, 0.15), wireMat());
      p2.position.set(0.1, 0, 0);
      g.add(p2);
      break;
    }
    case 'inductor': {
      const pts = [];
      for (let i = 0; i <= 12; i++) {
        const t = (i / 12) - 0.5;
        pts.push(new THREE.Vector3(t * 0.5, Math.sin(i * 1.5) * 0.12, 0));
      }
      const body = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.035, 6, false),
        new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.3 }),
      );
      g.add(body);
      break;
    }
    case 'led': {
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), mat());
      g.add(body);
      const anode = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.06), wireMat());
      anode.position.set(0, 0.25, 0);
      g.add(anode);
      const cathode = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.06), wireMat());
      cathode.position.set(0, -0.2, 0);
      g.add(cathode);
      // Flat side on cathode
      break;
    }
    case 'switch': {
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.08, 0.2), wireMat());
      g.add(base);
      const lever = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.2, 4),
        new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.5, roughness: 0.3 }),
      );
      lever.position.set(0, 0.14, 0);
      lever.rotation.x = Math.PI / 2;
      lever.userData.isLever = true;
      g.add(lever);
      break;
    }
    case 'ground': {
      const vert = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.15, 0.04), wireMat());
      vert.position.set(0, 0.08, 0);
      g.add(vert);
      const horiz = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.04), wireMat());
      g.add(horiz);
      break;
    }
    case 'and_gate':
    case 'or_gate':
    case 'not_gate': {
      const bodyMat = stdMat(0x8b5cf6, { style: 'schematic' });
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 0.2), bodyMat);
      g.add(body);
      // Gate symbol text
      const sym = type === 'and_gate' ? '&' : type === 'or_gate' ? '≥1' : '1';
      // Input pins
      const nInputs = type === 'not_gate' ? 1 : 2;
      for (let i = 0; i < nInputs; i++) {
        const pin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.15), wireMat());
        pin.position.set(-0.3, (i === 0 ? 0.1 : -0.1), 0);
        g.add(pin);
      }
      // Output pin
      const outPin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.15), wireMat());
      outPin.position.set(0.3, 0, 0);
      g.add(outPin);
      break;
    }
    case 'opamp': {
      const bodyMat = stdMat(0x8b5cf6, { style: 'schematic' });
      const wireMatOp = () => new THREE.MeshStandardMaterial({ color: COLORS.wireOff, roughness: 0.5, metalness: 0.2 });
      // Triangle body
      const shape = new THREE.Shape();
      shape.moveTo(-0.3, -0.25);
      shape.lineTo(0.3, 0);
      shape.lineTo(-0.3, 0.25);
      shape.closePath();
      const body = new THREE.Mesh(
        new THREE.ExtrudeGeometry(shape, { depth: 0.15, bevelEnabled: false }),
        bodyMat
      );
      body.position.z = -0.075;
      g.add(body);
      // Inverting input (−)
      const negPin = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.04, 0.04), wireMatOp());
      negPin.position.set(-0.45, 0.15, 0);
      g.add(negPin);
      // Non-inverting input (+)
      const posPin = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.04, 0.04), wireMatOp());
      posPin.position.set(-0.45, -0.15, 0);
      g.add(posPin);
      // Output
      const outPin = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.04, 0.04), wireMatOp());
      outPin.position.set(0.45, 0, 0);
      g.add(outPin);
      // + symbol (non-inv)
      const plusSign = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.02), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
      plusSign.position.set(-0.35, -0.12, 0.1);
      g.add(plusSign);
      const plusV = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.08, 0.02), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
      plusV.position.set(-0.35, -0.12, 0.1);
      g.add(plusV);
      // − symbol (inv)
      const minusS = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.02), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
      minusS.position.set(-0.35, 0.12, 0.1);
      g.add(minusS);
      // Power pins (V+, V−)
      const vccPin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.04), wireMatOp());
      vccPin.position.set(0, 0.35, 0);
      g.add(vccPin);
      const veePin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.04), wireMatOp());
      veePin.position.set(0, -0.35, 0);
      g.add(veePin);
      // Terminal positions for 5 terminals: [in-, in+, out, v+, v-]
      g.userData.terminalPositions = [
        V3(-0.5, 0.15, 0), V3(-0.5, -0.15, 0), V3(0.5, 0, 0),
        V3(0, 0.4, 0), V3(0, -0.4, 0),
      ];
      break;
    }
    case 'transformer': {
      const coreMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.6, roughness: 0.3 });
      const coilMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4, metalness: 0.5 });
      // Core (E-I shape)
      const coreBar = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.12), coreMat);
      g.add(coreBar);
      const coreLeft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.12), coreMat);
      coreLeft.position.set(-0.35, 0, 0);
      g.add(coreLeft);
      const coreRight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.12), coreMat);
      coreRight.position.set(0.35, 0, 0);
      g.add(coreRight);
      // Primary coil (left side)
      const primPts = [];
      for (let i = 0; i <= 10; i++) {
        const t = (i / 10) - 0.5;
        primPts.push(new THREE.Vector3(t * 0.15, Math.sin(i * 1.8) * 0.08, 0.08));
      }
      const primary = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(primPts), 10, 0.025, 4, false),
        coilMat
      );
      primary.position.set(-0.2, 0.05, 0);
      g.add(primary);
      // Secondary coil (right side)
      const secPts = [];
      for (let i = 0; i <= 10; i++) {
        const t = (i / 10) - 0.5;
        secPts.push(new THREE.Vector3(t * 0.15, Math.sin(i * 1.8) * 0.08, 0.08));
      }
      const secondary = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(secPts), 10, 0.025, 4, false),
        coilMat
      );
      secondary.position.set(0.2, -0.05, 0);
      g.add(secondary);
      // Primary leads
      const pLead1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.03), new THREE.MeshStandardMaterial({ color: COLORS.wireOff }));
      pLead1.position.set(-0.5, 0.15, 0);
      g.add(pLead1);
      const pLead2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.03), new THREE.MeshStandardMaterial({ color: COLORS.wireOff }));
      pLead2.position.set(-0.5, -0.05, 0);
      g.add(pLead2);
      // Secondary leads
      const sLead1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.03), new THREE.MeshStandardMaterial({ color: COLORS.wireOff }));
      sLead1.position.set(0.5, 0.05, 0);
      g.add(sLead1);
      const sLead2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.03), new THREE.MeshStandardMaterial({ color: COLORS.wireOff }));
      sLead2.position.set(0.5, -0.15, 0);
      g.add(sLead2);
      // Terminal positions: [prim+, prim-, sec+, sec-]
      g.userData.terminalPositions = [
        V3(-0.55, 0.15, 0), V3(-0.55, -0.05, 0),
        V3(0.55, 0.05, 0), V3(0.55, -0.15, 0),
      ];
      break;
    }
    case 'npn_transistor':
    case 'pnp_transistor': {
      const isNpn = type === 'npn_transistor';
      const baseColor = isNpn ? 0x3b82f6 : 0xf97316;
      const bodyMat = stdMat(baseColor, { style: 'schematic' });
      const wireMatTr = () => new THREE.MeshStandardMaterial({ color: COLORS.wireOff, roughness: 0.5, metalness: 0.2 });
      // Circle body
      const body = new THREE.Mesh(new THREE.CircleGeometry(0.2, 12), bodyMat);
      body.position.z = 0;
      g.add(body);
      // Emitter arrow
      const arrShape = new THREE.Shape();
      if (isNpn) {
        arrShape.moveTo(0, -0.08);
        arrShape.lineTo(-0.1, 0);
        arrShape.lineTo(0, 0.08);
      } else {
        arrShape.moveTo(-0.08, -0.06);
        arrShape.lineTo(0.05, 0);
        arrShape.lineTo(-0.08, 0.06);
      }
      arrShape.closePath();
      const arrow = new THREE.Mesh(
        new THREE.ExtrudeGeometry(arrShape, { depth: 0.08, bevelEnabled: false }),
        new THREE.MeshStandardMaterial({ color: baseColor })
      );
      arrow.position.z = -0.04;
      if (isNpn) arrow.position.set(0.05, 0, 0);
      else arrow.position.set(-0.05, 0, 0);
      g.add(arrow);
      // Base lead (left)
      const baseLead = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.03, 0.03), wireMatTr());
      baseLead.position.set(-0.35, 0, 0);
      g.add(baseLead);
      // Collector lead (top)
      const collLead = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.15, 0.03), wireMatTr());
      collLead.position.set(0, 0.3, 0);
      g.add(collLead);
      // Emitter lead (bottom)
      const emitLead = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.15, 0.03), wireMatTr());
      emitLead.position.set(0, -0.3, 0);
      g.add(emitLead);
      // Terminal positions: [base, collector, emitter]
      g.userData.terminalPositions = [
        V3(-0.4, 0, 0), V3(0, 0.35, 0), V3(0, -0.35, 0),
      ];
      break;
    }
    case 'voltage_regulator': {
      const regMat = stdMat(0x22c55e, { style: 'schematic' });
      const wireMatReg = () => new THREE.MeshStandardMaterial({ color: COLORS.wireOff, roughness: 0.5, metalness: 0.2 });
      // IC body
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.45, 0.15), regMat);
      g.add(body);
      // Tab (heat sink tab)
      const tab = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.02, 0.08), new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.5 }));
      tab.position.set(0, -0.25, 0);
      g.add(tab);
      // Pin 1: Input (left)
      const pin1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.03), wireMatReg());
      pin1.position.set(-0.4, 0.15, 0);
      g.add(pin1);
      // Pin 2: Ground (center-bottom)
      const pin2 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.03), wireMatReg());
      pin2.position.set(0, -0.4, 0);
      g.add(pin2);
      // Pin 3: Output (right)
      const pin3 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.03), wireMatReg());
      pin3.position.set(0.4, -0.15, 0);
      g.add(pin3);
      // Label
      const lbl = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.01), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      lbl.position.set(0, 0.1, 0.1);
      g.add(lbl);
      // Terminal positions: [input, ground, output]
      g.userData.terminalPositions = [
        V3(-0.45, 0.15, 0), V3(0, -0.45, 0), V3(0.45, -0.15, 0),
      ];
      break;
    }
    default: // wire or unknown
      break;
  }

  return g;
}

/* ===================== CIRCUIT BUILDER ===================== */

export class CircuitBuilder {
  constructor(viewer) {
    this.viewer = viewer;
    this.active = false;
    this.components = [];      // placed components
    this.wires = [];           // drawn wires
    this.gridSize = 0.6;       // grid spacing
    this.gridWidth = 12;       // cells wide
    this.gridHeight = 10;      // cells high
    this.selectedType = null;  // current component to place
    this.nextId = 1;
    this.nodeCounter = 1;
    this.simEngine = new SimEngine();
    this.deleteMode = false;
    this.wireMode = false;
    this.wireStart = null;     // { compId, terminalIdx }
    this.voltageLabels = [];   // CSS2D labels for node voltages
    this.hoveredComp = null;   // currently hovered component for highlighting
    this.solveTimer = null;

    // Group containing all builder objects
    this.group = new THREE.Group();
    this.gridGroup = new THREE.Group();
    this.compGroup = new THREE.Group();
    this.wireGroup = new THREE.Group();
    this.labelGroup = new THREE.Group();
    this.group.add(this.gridGroup);
    this.group.add(this.compGroup);
    this.group.add(this.wireGroup);
    this.group.add(this.labelGroup);

    // Circuit library (save/load)
    this._circuitLib = new CircuitLibrary(this);

    this._buildGrid();
    this._buildPalette();
  }

  /* ---- Grid ---- */

  _buildGrid() {
    const mat = new THREE.LineBasicMaterial({ color: 0x1e293b, transparent: true, opacity: 0.5 });
    const w = this.gridWidth * this.gridSize;
    const h = this.gridHeight * this.gridSize;
    this.gridGroup.children.length = 0;

    for (let x = -w / 2; x <= w / 2; x += this.gridSize) {
      const geo = new THREE.BufferGeometry().setFromPoints([
        V3(x, -h / 2, -0.01), V3(x, h / 2, -0.01),
      ]);
      this.gridGroup.add(new THREE.Line(geo, mat));
    }
    for (let y = -h / 2; y <= h / 2; y += this.gridSize) {
      const geo = new THREE.BufferGeometry().setFromPoints([
        V3(-w / 2, y, -0.01), V3(w / 2, y, -0.01),
      ]);
      this.gridGroup.add(new THREE.Line(geo, mat));
    }

    // Grid origin label
    this._addLabel(this.gridGroup, '0', V3(-w / 2 - 0.3, -h / 2 - 0.3, 0), '#64748b', '10px');
  }

  /* ---- Palette UI ---- */

  _buildPalette() {
    // HTML toolbar injected into the viewer container
    if (document.getElementById('builder-toolbar')) return;
    const toolbar = document.createElement('div');
    toolbar.id = 'builder-toolbar';
    toolbar.style.display = 'none';

    const title = document.createElement('div');
    title.className = 'builder-title';
    title.textContent = '⚡ Circuit Builder';
    toolbar.appendChild(title);

    const row = document.createElement('div');
    row.className = 'builder-palette';

    for (const [key, def] of Object.entries(COMPONENT_TYPES)) {
      const btn = document.createElement('button');
      btn.className = 'builder-btn';
      btn.dataset.type = key;
      btn.innerHTML = `<span class="builder-btn-icon">${def.icon}</span><span class="builder-btn-label">${def.label}</span>`;
      btn.title = def.description;
      btn.onclick = () => this._selectComponent(key, btn);
      row.appendChild(btn);
    }

    // Utility buttons
    const wireBtn = document.createElement('button');
    wireBtn.className = 'builder-btn builder-util';
    wireBtn.innerHTML = '<span class="builder-btn-icon">—</span><span class="builder-btn-label">Wire</span>';
    wireBtn.title = 'Click two component terminals to connect';
    wireBtn.onclick = () => this._toggleWireMode(wireBtn);
    row.appendChild(wireBtn);

    const delBtn = document.createElement('button');
    delBtn.className = 'builder-btn builder-util';
    delBtn.innerHTML = '<span class="builder-btn-icon">✕</span><span class="builder-btn-label">Delete</span>';
    delBtn.title = 'Click a component to remove it';
    delBtn.onclick = () => this._toggleDeleteMode(delBtn);
    row.appendChild(delBtn);

    const clearBtn = document.createElement('button');
    clearBtn.className = 'builder-btn builder-util';
    clearBtn.innerHTML = '<span class="builder-btn-icon">🗑</span><span class="builder-btn-label">Clear</span>';
    clearBtn.title = 'Remove all components';
    clearBtn.onclick = () => this._clearCircuit();
    row.appendChild(clearBtn);

    // Simulate button (opens oscilloscope)
    const simBtn = document.createElement('button');
    simBtn.className = 'builder-btn builder-util builder-sim';
    simBtn.innerHTML = '<span class="builder-btn-icon">📊</span><span class="builder-btn-label">Simulate</span>';
    simBtn.title = 'Run transient simulation and view waveforms on oscilloscope';
    simBtn.onclick = () => this._toggleOscilloscope();
    row.appendChild(simBtn);

    // Save / Load circuit buttons
    const saveBtn = document.createElement('button');
    saveBtn.className = 'builder-btn';
    saveBtn.innerHTML = '<span class="builder-btn-icon">💾</span><span class="builder-btn-label">Save</span>';
    saveBtn.title = 'Save circuit design to My Circuits';
    saveBtn.onclick = () => {
      const name = prompt('Circuit name:', 'My Circuit');
      if (name) this._circuitLib.save(name);
    };
    row.appendChild(saveBtn);

    const loadBtn = document.createElement('button');
    loadBtn.className = 'builder-btn';
    loadBtn.innerHTML = '<span class="builder-btn-icon">📂</span><span class="builder-btn-label">Load</span>';
    loadBtn.title = 'Open My Circuits library';
    loadBtn.onclick = () => this._toggleCircuitLibrary();
    row.appendChild(loadBtn);

    toolbar.appendChild(row);

    // Status bar
    const status = document.createElement('div');
    status.id = 'builder-status';
    status.textContent = 'Select a component from the palette, then click on the grid to place it.';
    toolbar.appendChild(status);

    // Find the best insertion point: before the viewer container in the viewer pane
    const viewerPane = this.viewer.container.closest('#viewer-pane') || this.viewer.container.parentElement;
    if (viewerPane) {
      viewerPane.insertBefore(toolbar, this.viewer.container);
    } else {
      // Fallback: append to body
      document.body.appendChild(toolbar);
    }
    this._toolbar = toolbar;
  }

  _selectComponent(type, btn) {
    this.deleteMode = false;
    this.wireMode = false;
    this._updateUtilButtons();
    this.selectedType = type;
    document.querySelectorAll('.builder-btn').forEach((b) => b.classList.remove('selected'));
    if (btn) btn.classList.add('selected');
    this._setStatus(`Click on the grid to place a ${COMPONENT_TYPES[type]?.label || type}`);
  }

  _toggleWireMode(btn) {
    this.selectedType = null;
    this.deleteMode = false;
    this.wireMode = !this.wireMode;
    this._updateUtilButtons();
    document.querySelectorAll('.builder-btn').forEach((b) => b.classList.remove('selected'));
    if (this.wireMode) {
      btn.classList.add('selected');
      this._setStatus('Click a component terminal, then another to connect them with a wire.');
      this.wireStart = null;
    }
  }

  _toggleDeleteMode(btn) {
    this.selectedType = null;
    this.wireMode = false;
    this.deleteMode = !this.deleteMode;
    this._updateUtilButtons();
    document.querySelectorAll('.builder-btn').forEach((b) => b.classList.remove('selected'));
    if (this.deleteMode) {
      btn.classList.add('selected');
      this._setStatus('Click a component to remove it.');
    }
  }

  _clearCircuit() {
    // Remove all component meshes
    for (const comp of this.components) {
      this.compGroup.remove(comp.mesh);
    }
    for (const w of this.wires) {
      this.wireGroup.remove(w.mesh);
    }
    this.components = [];
    this.wires = [];
    this.wireStart = null;
    this.nextId = 1;
    this.nodeCounter = 1;
    this.simEngine.clear();
    this._clearLabels();
    this._runSolve();
    this._setStatus('Circuit cleared. Select a component to start building.');
  }

  _updateUtilButtons() {
    document.querySelectorAll('.builder-util').forEach((b) => b.classList.remove('selected'));
  }

  _setStatus(msg) {
    const el = document.getElementById('builder-status');
    if (el) el.textContent = msg;
  }

  /* ---- Activation ---- */

  activate() {
    if (this.active) return;
    this.active = true;
    this._toolbar.style.display = 'block';

    // Add the builder group to the scene
    if (this.viewer.scene) {
      this.viewer.scene.add(this.group);
    }
  }

  deactivate() {
    if (!this.active) return;
    this.active = false;
    this._toolbar.style.display = 'none';

    if (this.viewer.scene) {
      this.viewer.scene.remove(this.group);
    }
    this.selectedType = null;
    this.deleteMode = false;
    this.wireMode = false;
    this.wireStart = null;
    // Clear hover highlights
    if (this.hoveredComp) {
      this._unhighlightComp(this.hoveredComp);
      this.hoveredComp = null;
    }
  }

  /* ---- Placement ---- */

  _snapToGrid(pos) {
    const w = this.gridWidth * this.gridSize;
    const h = this.gridHeight * this.gridSize;
    const x = Math.round((pos.x + w / 2) / this.gridSize) * this.gridSize - w / 2;
    const y = Math.round((pos.y + h / 2) / this.gridSize) * this.gridSize - h / 2;
    // Clamp to grid bounds
    const clampedX = Math.max(-w / 2, Math.min(w / 2, x));
    const clampedY = Math.max(-h / 2, Math.min(h / 2, y));
    return V3(clampedX, clampedY, 0);
  }

  _getGridPos(clientX, clientY) {
    const rect = this.viewer.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(ndc, this.viewer.camera);
    // Intersect with an invisible plane at z=0
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const point = new THREE.Vector3();
    const intersect = raycaster.ray.intersectPlane(plane, point);
    if (intersect) {
      return this._snapToGrid(point);
    }
    return null;
  }

  placeComponent(gridPos) {
    if (!this.selectedType) return null;

    const type = this.selectedType;
    const def = COMPONENT_TYPES[type];
    if (!def) return null;

    // Check if grid cell is already occupied
    for (const c of this.components) {
      if (c.gridPos.distanceTo(gridPos) < 0.1) {
        this._setStatus('Grid cell already occupied!');
        return null;
      }
    }

    const mesh = makeComponentMesh(type);
    mesh.position.copy(gridPos);
    mesh.position.z = 0;
    const id = this.nextId++;
    // Multi-terminal node assignment
    let nodeA = this.nodeCounter++, nodeB = nodeA, nodeC = nodeB, nodeD = nodeC, nodeE = nodeD;
    const t = def.terminals;
    if (t >= 2) nodeB = this.nodeCounter++;
    if (t >= 3) nodeC = this.nodeCounter++;
    if (t >= 4) nodeD = this.nodeCounter++;
    if (t >= 5) nodeE = this.nodeCounter++;

    const comp = {
      id,
      type,
      mesh,
      gridPos: gridPos.clone(),
      nodeA, nodeB, nodeC, nodeD, nodeE,
      value: def.params.default || def.params.default === 0 ? def.params.default : null,
      closed: type === 'switch' ? false : true,
      on: false,
      current: 0,
      voltageDrop: 0,
    };

    // Store node info on mesh for wire mode
    mesh.userData.compId = id;
    mesh.userData.terminalPositions = mesh.userData.terminalPositions || [V3(0, -0.2, 0), V3(0, 0.2, 0)];

    this.compGroup.add(mesh);
    this.components.push(comp);
    this.simEngine.addComponent(comp);

    // Add terminal indicator dots
    this._addTerminalDots(mesh, gridPos);

    this._runSolve();
    this._setStatus(`${def.label} placed. ${def.description}`);

    // Animate in
    if (window.gsap) {
      mesh.scale.setScalar(0.01);
      window.gsap.to(mesh.scale, { x: 1, y: 1, z: 1, duration: 0.3, ease: 'back.out(2)' });
    }

    return comp;
  }

  _addTerminalDots(mesh, gridPos) {
    const dotMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.5 });
    const terminals = mesh.userData.terminalPositions || [V3(-0.2, 0, 0.05), V3(0.2, 0, 0.05)];
    for (const t of terminals) {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), dotMat);
      dot.position.copy(t);
      dot.userData.isTerminal = true;
      dot.userData.compId = mesh.userData.compId;
      mesh.add(dot);
    }
  }

  removeComponent(id) {
    const idx = this.components.findIndex((c) => c.id === id);
    if (idx < 0) return;
    const comp = this.components[idx];
    this.compGroup.remove(comp.mesh);
    // Remove associated wires
    const toRemove = [];
    for (const w of this.wires) {
      if (w.compA === id || w.compB === id) {
        this.wireGroup.remove(w.mesh);
        // Clean up labels
        if (w.labelEl && w.labelEl.parentNode) w.labelEl.parentNode.removeChild(w.labelEl);
        toRemove.push(w);
      }
    }
    this.wires = this.wires.filter((w) => !toRemove.includes(w));
    this.components.splice(idx, 1);
    this.simEngine.removeComponent(id);
    this._runSolve();
    this._setStatus('Component removed.');
  }

  /* ---- Wire Drawing ---- */

  addWire(compAId, compBId) {
    const compA = this.components.find((c) => c.id === compAId);
    const compB = this.components.find((c) => c.id === compBId);
    if (!compA || !compB) return null;

    // Don't allow duplicate wires
    for (const w of this.wires) {
      if ((w.compA === compAId && w.compB === compBId) || (w.compA === compBId && w.compB === compAId)) {
        this._setStatus('These components are already connected!');
        return null;
      }
    }

    const from = compA.mesh.position.clone();
    const to = compB.mesh.position.clone();

    // Check for existing mesh connections (same node)
    const sameNode = this._areConnected(compA, compB);
    if (sameNode) {
      this._setStatus('Components share the same node already.');
      return null;
    }

    // Create wire mesh
    const wireMesh = makeWire(from, to, { color: COLORS.wireOn, radius: 0.025 });
    const id = this.nextId++;

    // Voltage label on wire
    const labelEl = document.createElement('div');
    labelEl.className = 'builder-wire-label';
    labelEl.textContent = '0 V';
    const label = new CSS2DObject(labelEl);
    label.position.copy(from.clone().add(to.clone()).multiplyScalar(0.5));

    const wireData = {
      id,
      compA: compAId,
      compB: compBId,
      mesh: wireMesh,
      label,
      labelEl,
    };

    this.wireGroup.add(wireMesh);
    this.labelGroup.add(label);
    this.wires.push(wireData);

    // Merge nodes in simulation
    this._mergeNodes(compA, compB);

    this._runSolve();

    // Animate wire in
    if (window.gsap) {
      wireMesh.scale.setScalar(0.01);
      window.gsap.to(wireMesh.scale, { x: 1, y: 1, z: 1, duration: 0.25, ease: 'back.out(2)' });
    }

    this._setStatus('Wire added!');
    return wireData;
  }

  _areConnected(a, b) {
    // Collect all nodes from both components (up to 5 terminals)
    const aNodes = [a.nodeA, a.nodeB, a.nodeC, a.nodeD, a.nodeE].filter((n) => n !== undefined);
    const bNodes = [b.nodeA, b.nodeB, b.nodeC, b.nodeD, b.nodeE].filter((n) => n !== undefined);
    // Direct node sharing
    for (const an of aNodes) {
      for (const bn of bNodes) {
        if (an === bn) return true;
      }
    }
    // Check through wires
    for (const w of this.wires) {
      const wa = this.components.find((c) => c.id === w.compA);
      const wb = this.components.find((c) => c.id === w.compB);
      if (wa && wb) {
        const waNodes = [wa.nodeA, wa.nodeB, wa.nodeC, wa.nodeD, wa.nodeE].filter((n) => n !== undefined);
        const wbNodes = [wb.nodeA, wb.nodeB, wb.nodeC, wb.nodeD, wb.nodeE].filter((n) => n !== undefined);
        for (const wan of waNodes) {
          for (const aNode of aNodes) {
            if (wan === aNode) {
              for (const wbn of wbNodes) {
                for (const bNode of bNodes) {
                  if (wbn === bNode) return true;
                }
              }
            }
          }
        }
      }
    }
    return false;
  }

  _mergeNodes(a, b) {
    // Merge b's all nodes into a's nodeA
    const target = a.nodeA;
    const bNodes = [b.nodeA, b.nodeB, b.nodeC, b.nodeD, b.nodeE].filter((n) => n !== undefined);
    for (const c of this.components) {
      if (bNodes.includes(c.nodeA)) c.nodeA = target;
      if (bNodes.includes(c.nodeB)) c.nodeB = target;
      if (bNodes.includes(c.nodeC)) c.nodeC = target;
      if (bNodes.includes(c.nodeD)) c.nodeD = target;
      if (bNodes.includes(c.nodeE)) c.nodeE = target;
    }
  }

  /* ---- Hover / Click Handling ---- */

  handlePointerMove(clientX, clientY) {
    if (!this.active) return;

    // Raycast to find hovered component
    const rect = this.viewer.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(ndc, this.viewer.camera);

    const hits = raycaster.intersectObjects(this.compGroup.children, true);
    let found = null;
    if (hits.length > 0) {
      let obj = hits[0].object;
      while (obj && obj.userData.compId === undefined && obj.parent !== this.compGroup) obj = obj.parent;
      if (obj && obj.userData.compId !== undefined) {
        found = this.components.find((c) => c.id === obj.userData.compId);
      }
    }

    // Highlight / unhighlight
    if (found !== this.hoveredComp) {
      if (this.hoveredComp) this._unhighlightComp(this.hoveredComp);
      if (found) this._highlightComp(found);
      this.hoveredComp = found;
    }

    // Update cursor
    this.viewer.renderer.domElement.style.cursor =
      (found && (this.deleteMode || this.wireMode || this.selectedType)) ? 'pointer' : '';

    // Show voltage on hover
    if (found) {
      const v = this.simEngine.voltages.get(found.nodeA);
      this._setStatus(`${COMPONENT_TYPES[found.type]?.label || found.type} · V = ${v !== undefined ? v.toFixed(2) : '?'} V · I = ${(found.current || 0) < 0.001 ? (found.current || 0) * 1000 < 0.001 ? (found.current || 0) * 1e6 : (found.current || 0) * 1000 : (found.current || 0)} ${(found.current || 0) < 0.001 ? (found.current || 0) * 1000 < 0.001 ? 'µA' : 'mA' : 'A'}`);
    } else if (!this.selectedType && !this.deleteMode && !this.wireMode) {
      this._setStatus('Select a component from the palette, then click the grid to place it. Click a placed component to select it.');
    }
  }

  handleClick(clientX, clientY) {
    if (!this.active) return;

    const rect = this.viewer.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(ndc, this.viewer.camera);

    if (this.deleteMode) {
      // Delete clicked component
      const hits = raycaster.intersectObjects(this.compGroup.children, true);
      if (hits.length > 0) {
        let obj = hits[0].object;
        while (obj && obj.userData.compId === undefined && obj.parent !== this.compGroup) obj = obj.parent;
        if (obj && obj.userData.compId !== undefined) {
          this.removeComponent(obj.userData.compId);
          return;
        }
      }
      return;
    }

    if (this.wireMode) {
      // Wire mode — click two terminals
      const hits = raycaster.intersectObjects(this.compGroup.children, true);
      if (hits.length > 0) {
        let obj = hits[0].object;
        while (obj && obj.userData.compId === undefined && obj.parent !== this.compGroup) obj = obj.parent;
        if (obj && obj.userData.compId !== undefined) {
          const compId = obj.userData.compId;
          if (this.wireStart === null) {
            this.wireStart = compId;
            this._setStatus('First terminal selected. Click another component terminal to connect.');
            // Flash indicator on selected
            const comp = this.components.find((c) => c.id === compId);
            if (comp && window.gsap) {
              window.gsap.fromTo(comp.mesh.children[0]?.material, { emissive: new THREE.Color(0x38bdf8), emissiveIntensity: 1 }, { emissiveIntensity: 0.3, duration: 0.3 });
            }
          } else if (compId !== this.wireStart) {
            this.addWire(this.wireStart, compId);
            this.wireStart = null;
          } else {
            this._setStatus('Cannot connect a component to itself. Click a different component.');
          }
          return;
        }
      }
      return;
    }

    if (this.selectedType) {
      // Place component on grid
      const gridPos = this._getGridPos(clientX, clientY);
      if (gridPos) {
        this.placeComponent(gridPos);
      }
      return;
    }

    // Default: click a component to select it (for parameter editing)
    const hits = raycaster.intersectObjects(this.compGroup.children, true);
    if (hits.length > 0) {
      let obj = hits[0].object;
      while (obj && obj.userData.compId === undefined && obj.parent !== this.compGroup) obj = obj.parent;
      if (obj && obj.userData.compId !== undefined) {
        const comp = this.components.find((c) => c.id === obj.userData.compId);
        if (comp) {
          if (comp.type === 'switch') {
            comp.closed = !comp.closed;
            this._runSolve();
            this._setStatus(`Switch ${comp.closed ? 'CLOSED' : 'OPEN'}`);
          } else {
            const def = COMPONENT_TYPES[comp.type];
            this._setStatus(`${def.label} · V = ${this.simEngine.voltages.get(comp.nodeA)?.toFixed(2) || '?'} V · I = ${(comp.current || 0).toFixed(3)} A`);
          }
        }
      }
    }
  }

  /* ---- Highlighting ---- */

  _highlightComp(comp) {
    comp.mesh.traverse((c) => {
      if (c.isMesh && c.material && !c.userData.isTerminal) {
        c.material.emissive = new THREE.Color(0x38bdf8);
        c.material.emissiveIntensity = 0.15;
      }
    });
  }

  _unhighlightComp(comp) {
    comp.mesh.traverse((c) => {
      if (c.isMesh && c.material) {
        c.material.emissive = new THREE.Color(0x000000);
        c.material.emissiveIntensity = 0;
      }
    });
  }

  /* ---- Simulation & Labels ---- */

  _runSolve() {
    // Debounce solve calls
    if (this.solveTimer) clearTimeout(this.solveTimer);
    this.solveTimer = setTimeout(() => {
      this.simEngine.solve();
      this._updateLabels();
    }, 50);
  }

  _clearLabels() {
    for (const l of this.voltageLabels) {
      this.labelGroup.remove(l);
    }
    this.voltageLabels = [];
  }

  _updateLabels() {
    this._clearLabels();

    // Show node voltages on placed components
    for (const comp of this.components) {
      const v = this.simEngine.voltages.get(comp.nodeA);
      if (v === undefined) continue;

      const el = document.createElement('div');
      el.className = `builder-voltage-label ${v > 0 ? 'positive' : v < 0 ? 'negative' : ''}`;
      el.textContent = v > 0 ? `+${v.toFixed(1)}V` : `${v.toFixed(1)}V`;

      const label = new CSS2DObject(el);
      label.position.copy(comp.mesh.position);
      label.position.z = 0.3;
      label.position.y += 0.3;
      this.labelGroup.add(label);
      this.voltageLabels.push(label);

      // Current direction indicator
      if (comp.current && Math.abs(comp.current) > 0.0001) {
        const arrowEl = document.createElement('div');
        arrowEl.className = 'builder-current-label';
        const currentMa = Math.abs(comp.current) * 1000;
        arrowEl.textContent = currentMa >= 1 ? `${currentMa.toFixed(1)} mA` : `${(Math.abs(comp.current) * 1e6).toFixed(0)} µA`;
        const arrowLabel = new CSS2DObject(arrowEl);
        arrowLabel.position.copy(comp.mesh.position);
        arrowLabel.position.z = 0.3;
        arrowLabel.position.y -= 0.35;
        this.labelGroup.add(arrowLabel);
        this.voltageLabels.push(arrowLabel);
      }

      // LED glow
      if (comp.type === 'led' && comp.on) {
        comp.mesh.traverse((c) => {
          if (c.isMesh && c.material) {
            c.material.emissive = new THREE.Color(0xfde047);
            c.material.emissiveIntensity = 0.5 + Math.sin(Date.now() * 0.005) * 0.2;
          }
        });
      } else if (comp.type === 'led' && !comp.on) {
        comp.mesh.traverse((c) => {
          if (c.isMesh && c.material) {
            c.material.emissive = new THREE.Color(0x000000);
            c.material.emissiveIntensity = 0;
          }
        });
      }
    }

    // Update wire labels
    for (const w of this.wires) {
      const compA = this.components.find((c) => c.id === w.compA);
      if (compA) {
        const v = this.simEngine.voltages.get(compA.nodeA);
        w.labelEl.textContent = v !== undefined ? `${v.toFixed(2)} V` : '? V';
      }
    }
  }

  /* ---- Lifecycle ---- */

  tick(dt, t) {
    if (!this.active) return;
    // Continuous updates for LEDs, etc.
    for (const comp of this.components) {
      if (comp.type === 'led' && comp.on) {
        comp.mesh.traverse((c) => {
          if (c.isMesh && c.material) {
            c.material.emissiveIntensity = 0.5 + Math.sin(t * 4) * 0.3;
          }
        });
      }
    }
  }

  _addLabel(parent, text, pos, color = '#94a3b8', size = '11px') {
    const el = document.createElement('div');
    el.textContent = text;
    el.style.cssText = `color:${color};font-size:${size};pointer-events:none;opacity:0.6`;
    const label = new CSS2DObject(el);
    label.position.copy(pos);
    parent.add(label);
    return label;
  }

  /* ===================== SAVE / LOAD CIRCUITS ===================== */

  /**
   * Export the current circuit as a portable JSON object.
   * Serializes component types, grid positions, values, switch states,
   * and wire connections (by component index).
   */
  exportJSON() {
    const compData = this.components.map((c) => ({
      type: c.type,
      x: c.gridPos.x,
      y: c.gridPos.y,
      value: c.value,
      closed: c.closed,
    }));

    // Wire connections use component indices in the compData array
    const wireData = [];
    for (const w of this.wires) {
      const idxA = this.components.findIndex((c) => c.id === w.compA);
      const idxB = this.components.findIndex((c) => c.id === w.compB);
      if (idxA >= 0 && idxB >= 0) {
        wireData.push({ from: idxA, to: idxB });
      }
    }

    return {
      version: 1,
      name: 'Untitled Circuit',
      createdAt: new Date().toISOString(),
      components: compData,
      wires: wireData,
      gridWidth: this.gridWidth,
      gridHeight: this.gridHeight,
      gridSize: this.gridSize,
    };
  }

  /**
   * Import a circuit from a JSON object (previously exported via exportJSON).
   * Clears the current circuit, recreates all components and wires.
   */
  importJSON(json) {
    // Validate format
    if (!json || !json.components || !Array.isArray(json.components)) {
      this._setStatus('Invalid circuit file format.');
      return false;
    }

    // Clear current circuit
    this._clearCircuit();

    // Temporarily switch to a mode that allows placing components programmatically
    // We'll store the restored components and wires here
    const restoredComps = [];

    // Recreate each component
    for (const cd of json.components) {
      const gridPos = V3(cd.x, cd.y, 0);
      const type = cd.type;
      const def = COMPONENT_TYPES[type];
      if (!def) {
        console.warn('Unknown component type in import:', type);
        continue;
      }

      const mesh = makeComponentMesh(type);
      mesh.position.copy(gridPos);
      mesh.position.z = 0;
      const id = this.nextId++;

      let nodeA = this.nodeCounter++, nodeB = nodeA, nodeC = nodeB, nodeD = nodeC, nodeE = nodeD;
      const t = def.terminals;
      if (t >= 2) nodeB = this.nodeCounter++;
      if (t >= 3) nodeC = this.nodeCounter++;
      if (t >= 4) nodeD = this.nodeCounter++;
      if (t >= 5) nodeE = this.nodeCounter++;

      const comp = {
        id,
        type,
        mesh,
        gridPos: gridPos.clone(),
        nodeA, nodeB, nodeC, nodeD, nodeE,
        value: cd.value !== undefined ? cd.value : (def.params.default ?? null),
        closed: cd.closed !== undefined ? cd.closed : (type === 'switch' ? false : true),
        on: false,
        current: 0,
        voltageDrop: 0,
      };

      mesh.userData.compId = id;
      mesh.userData.terminalPositions = mesh.userData.terminalPositions || [V3(0, -0.2, 0), V3(0, 0.2, 0)];

      this.compGroup.add(mesh);
      this.components.push(comp);
      this.simEngine.addComponent(comp);
      this._addTerminalDots(mesh, gridPos);
      restoredComps.push(comp);
    }

    // Recreate wires
    if (json.wires && Array.isArray(json.wires)) {
      for (const wd of json.wires) {
        const compA = restoredComps[wd.from];
        const compB = restoredComps[wd.to];
        if (!compA || !compB) {
          console.warn('Wire references invalid component index:', wd);
          continue;
        }

        // Check if already connected
        let alreadyConnected = false;
        for (const w of this.wires) {
          if ((w.compA === compA.id && w.compB === compB.id) ||
              (w.compA === compB.id && w.compB === compA.id)) {
            alreadyConnected = true;
            break;
          }
        }
        if (alreadyConnected) continue;

        const from = compA.mesh.position.clone();
        const to = compB.mesh.position.clone();
        const wireMesh = makeWire(from, to, { color: COLORS.wireOn, radius: 0.025 });
        const wireId = this.nextId++;

        const labelEl = document.createElement('div');
        labelEl.className = 'builder-wire-label';
        labelEl.textContent = '0 V';
        const label = new CSS2DObject(labelEl);
        label.position.copy(from.clone().add(to.clone()).multiplyScalar(0.5));

        const wireData = { id: wireId, compA: compA.id, compB: compB.id, mesh: wireMesh, label, labelEl };
        this.wireGroup.add(wireMesh);
        this.labelGroup.add(label);
        this.wires.push(wireData);
        this._mergeNodes(compA, compB);
      }
    }

    this._runSolve();
    this._setStatus(`Circuit loaded: ${json.name || 'Untitled'} (${this.components.length} components, ${this.wires.length} wires)`);
    return true;
  }

  /**
   * Convenience: load from a JSON string (e.g., from localStorage or file).
   */
  loadJSON(jsonString) {
    try {
      const obj = JSON.parse(jsonString);
      return this.importJSON(obj);
    } catch (e) {
      this._setStatus('Failed to parse circuit JSON: ' + e.message);
      return false;
    }
  }

  _toggleCircuitLibrary() {
    this._circuitLib.toggle();
    this._setStatus(this._circuitLib.visible ? '📂 My Circuits — click a circuit to load' : '');
  }

  /* ---- Oscilloscope (transient analysis) ---- */

  _toggleOscilloscope() {
    if (!this._scope) {
      this._scope = new Oscilloscope(this);
    }
    this._scope.toggle();
    this._setStatus(this._scope.visible ? '📊 Oscilloscope open — click Run to capture waveforms' : 'Oscilloscope closed');
  }

  destroy() {
    this.deactivate();
    if (this._scope) {
      this._scope.detach();
      this._scope = null;
    }
    if (this._circuitLib) {
      this._circuitLib.detach();
      this._circuitLib = null;
    }
    if (this._toolbar?.parentNode) {
      this._toolbar.parentNode.removeChild(this._toolbar);
    }
    this._clearLabels();
    this.group.traverse((c) => {
      c.geometry?.dispose?.();
      if (c.material) {
        if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose?.());
        else c.material.dispose?.();
      }
    });
  }
}
