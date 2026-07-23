// Digital circuits category builder.
// types: half_adder, full_adder, half_subtractor, full_subtractor, mux_2to1, mux_4to1, demux_1to4, decoder_3to8, encoder_8to3, sr_flipflop, jk_flipflop, d_flipflop
import { V3, COLORS, stdMat, makeWire, makeFlow, makeLabel } from './common.js';

export function build({ THREE, style, params, quality, template }) {
  const group = new THREE.Group();
  const type = template || 'half_adder';
  const seg = quality === 'low' ? 6 : 12;
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

  // Interactive state: input values (0 or 1)
  let inputStates = [];
  let toggleCount = 0;

  const makeBlock = (pos, w, h, color = 0x475569, tooltip = 'Digital logic block') => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.3), stdMat(color, { style }));
    m.userData.tooltip = tooltip;
    m.position.copy(pos); return m;
  };

  // Store clickable input meshes
  const inputMeshes = [];

  const makeInputWire = (from, to, label, color = 0x22c55e, idx = -1) => {
    const w = makeWire(from, to, { color: COLORS.wireOff, radius: 0.025 });
    w.userData.inputIndex = idx;
    w.userData.tooltip = () => {
      if (idx >= 0 && idx < inputStates.length) {
        return `${label || 'Input'} &bull; <b>${inputStates[idx]}</b> &bull; ${inputStates[idx] ? 'HIGH (5V)' : 'LOW (0V)'} &bull; Click to toggle`;
      }
      return `${label || 'Input'} &bull; Digital signal (0/1) &bull; Click to toggle`;
    };
    group.add(w);
    if (label) {
      const l = makeLabel(label);
      l.position.set(from.x - 0.3, from.y, 0);
      l.userData.inputIndex = idx;
      l.userData.tooltip = () => w.userData.tooltip();
      group.add(l);
    }
    // Make label clickable too
    if (idx >= 0) inputMeshes.push(w);
    return w;
  };

  const makeOutputWire = (from, to, label, color = 0x60a5fa) => {
    const w = makeWire(from, to, { color: COLORS.wireOff, radius: 0.025 });
    w.userData.tooltip = `${label || 'Output'} &bull; Computed result &bull; Digital logic level`;
    w.userData.isOutput = true;
    group.add(w);
    if (label) { const l = makeLabel(label); l.position.set(to.x + 0.3, to.y, 0); group.add(l); }
    return w;
  };

  // Define input labels and output logic for each circuit type
  const circuitConfigs = {
    half_adder: {
      inputs: ['A', 'B'],
      outputs: ['Sum', 'Carry'],
      compute: (s) => [s[0] ^ s[1], s[0] & s[1]],
    },
    full_adder: {
      inputs: ['A', 'B', 'Cin'],
      outputs: ['Sum', 'Cout'],
      compute: (s) => {
        const sum = s[0] ^ s[1] ^ s[2];
        const cout = (s[0] & s[1]) | (s[2] & (s[0] ^ s[1]));
        return [sum, cout];
      },
    },
    half_subtractor: {
      inputs: ['A', 'B'],
      outputs: ['Diff', 'Borrow'],
      compute: (s) => [s[0] ^ s[1], (~s[0] & s[1]) & 1],
    },
    full_subtractor: {
      inputs: ['A', 'B', 'Bin'],
      outputs: ['Diff', 'Bout'],
      compute: (s) => {
        const diff = s[0] ^ s[1] ^ s[2];
        const bout = ((~s[0] & s[1]) | (~s[0] & s[2]) | (s[1] & s[2])) & 1;
        return [diff, bout];
      },
    },
    mux_2to1: {
      inputs: ['D0', 'D1', 'S'],
      outputs: ['Y'],
      compute: (s) => [s[2] ? s[1] : s[0]],
    },
    mux_4to1: {
      inputs: ['D0', 'D1', 'D2', 'D3', 'S0', 'S1'],
      outputs: ['Y'],
      compute: (s) => {
        const sel = s[4] | (s[5] << 1);
        return [s[sel] || 0];
      },
    },
    demux_1to4: {
      inputs: ['IN', 'S0', 'S1'],
      outputs: ['Y0', 'Y1', 'Y2', 'Y3'],
      compute: (s) => {
        const sel = s[1] | (s[2] << 1);
        return [sel === 0 ? s[0] : 0, sel === 1 ? s[0] : 0, sel === 2 ? s[0] : 0, sel === 3 ? s[0] : 0];
      },
    },
    decoder_3to8: {
      inputs: ['A0', 'A1', 'A2'],
      outputs: ['Y0', 'Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y6', 'Y7'],
      compute: (s) => {
        const val = s[0] | (s[1] << 1) | (s[2] << 2);
        const out = new Array(8).fill(0);
        out[val] = 1;
        return out;
      },
    },
    encoder_8to3: {
      inputs: ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'],
      outputs: ['Y0', 'Y1', 'Y2'],
      compute: (s) => {
        let priority = 0;
        for (let i = 7; i >= 0; i--) {
          if (s[i]) { priority = i; break; }
        }
        return [priority & 1, (priority >> 1) & 1, (priority >> 2) & 1];
      },
    },
    sr_flipflop: {
      inputs: ['S', 'R', 'CLK'],
      outputs: ['Q', 'Q̅'],
      compute: (s) => {
        // Q state is managed by onClick, just read it
        const q = inputStates[3] || 0;
        return [q, 1 - q];
      },
    },
    jk_flipflop: {
      inputs: ['J', 'K', 'CLK'],
      outputs: ['Q', 'Q̅'],
      compute: (s) => {
        // Q state is managed by onClick, just read it
        const q = inputStates[3] || 0;
        return [q, 1 - q];
      },
    },
    d_flipflop: {
      inputs: ['D', 'CLK'],
      outputs: ['Q', 'Q̅'],
      compute: (s) => {
        // Q state is managed by onClick, just read it
        const q = inputStates[2] || 0;
        return [q, 1 - q];
      },
    },
  };

  const config = circuitConfigs[type] || circuitConfigs.half_adder;
  inputStates = new Array(config.inputs.length).fill(0);

  // Store internal state for flipflops
  if (type === 'sr_flipflop' || type === 'jk_flipflop' || type === 'd_flipflop') {
    inputStates.push(0); // Q state
  }

  // Build the visual circuit
  if (type === 'half_adder') {
    const blk = makeBlock(V3(0, 0, 0), 1.0, 0.8, 0x475569, 'Half Adder &bull; Adds two 1-bit numbers &bull; Sum = A &oplus; B, Carry = A &sdot; B');
    group.add(blk);
    makeInputWire(V3(-1.5, 0.25, 0), V3(-0.5, 0.25, 0), 'A', 0x22c55e, 0);
    makeInputWire(V3(-1.5, -0.25, 0), V3(-0.5, -0.25, 0), 'B', 0x22c55e, 1);
    const sumW = makeOutputWire(V3(0.5, 0.25, 0), V3(1.5, 0.25, 0), 'Sum');
    const carryW = makeOutputWire(V3(0.5, -0.25, 0), V3(1.5, -0.25, 0), 'Carry');
    const lbl = makeLabel('HA'); lbl.position.set(0, 0.6, 0.2); group.add(lbl);
  } else if (type === 'full_adder') {
    const blk = makeBlock(V3(0, 0, 0), 1.2, 0.9, 0x475569, 'Full Adder &bull; Adds A + B + C<sub>in</sub> &bull; Sum = A &oplus; B &oplus; C<sub>in</sub>, C<sub>out</sub> = A&sdot;B + C<sub>in</sub>(A&oplus;B)');
    group.add(blk);
    makeInputWire(V3(-1.8, 0.3, 0), V3(-0.6, 0.3, 0), 'A', 0x22c55e, 0);
    makeInputWire(V3(-1.8, 0.0, 0), V3(-0.6, 0.0, 0), 'B', 0x22c55e, 1);
    makeInputWire(V3(-1.8, -0.3, 0), V3(-0.6, -0.3, 0), 'Cin', 0x22c55e, 2);
    makeOutputWire(V3(0.6, 0.3, 0), V3(1.8, 0.3, 0), 'Sum');
    makeOutputWire(V3(0.6, -0.3, 0), V3(1.8, -0.3, 0), 'Cout');
    const lbl2 = makeLabel('FA'); lbl2.position.set(0, 0.7, 0.2); group.add(lbl2);
  } else if (type === 'half_subtractor') {
    const blk = makeBlock(V3(0, 0, 0), 1.0, 0.8); group.add(blk);
    makeInputWire(V3(-1.5, 0.25, 0), V3(-0.5, 0.25, 0), 'A', 0x22c55e, 0);
    makeInputWire(V3(-1.5, -0.25, 0), V3(-0.5, -0.25, 0), 'B', 0x22c55e, 1);
    makeOutputWire(V3(0.5, 0.25, 0), V3(1.5, 0.25, 0), 'Diff');
    makeOutputWire(V3(0.5, -0.25, 0), V3(1.5, -0.25, 0), 'Borrow');
    const lbl3 = makeLabel('HS'); lbl3.position.set(0, 0.6, 0.2); group.add(lbl3);
  } else if (type === 'full_subtractor') {
    const blk = makeBlock(V3(0, 0, 0), 1.2, 0.9); group.add(blk);
    makeInputWire(V3(-1.8, 0.3, 0), V3(-0.6, 0.3, 0), 'A', 0x22c55e, 0);
    makeInputWire(V3(-1.8, 0.0, 0), V3(-0.6, 0.0, 0), 'B', 0x22c55e, 1);
    makeInputWire(V3(-1.8, -0.3, 0), V3(-0.6, -0.3, 0), 'Bin', 0x22c55e, 2);
    makeOutputWire(V3(0.6, 0.3, 0), V3(1.8, 0.3, 0), 'Diff');
    makeOutputWire(V3(0.6, -0.3, 0), V3(1.8, -0.3, 0), 'Bout');
    const lbl4 = makeLabel('FS'); lbl4.position.set(0, 0.7, 0.2); group.add(lbl4);
  } else if (type === 'mux_2to1') {
    const blk = makeBlock(V3(0, 0, 0), 1.0, 0.8); group.add(blk);
    makeInputWire(V3(-1.5, 0.25, 0), V3(-0.5, 0.25, 0), 'D0', 0x22c55e, 0);
    makeInputWire(V3(-1.5, -0.25, 0), V3(-0.5, -0.25, 0), 'D1', 0x22c55e, 1);
    makeInputWire(V3(0, -0.75, 0), V3(0, -0.4, 0), 'S', 0x22c55e, 2);
    makeOutputWire(V3(0.5, 0, 0), V3(1.5, 0, 0), 'Y');
    const lbl5 = makeLabel('MUX'); lbl5.position.set(0, 0.6, 0.2); group.add(lbl5);
  } else if (type === 'mux_4to1') {
    const blk = makeBlock(V3(0, 0, 0), 1.2, 1.0); group.add(blk);
    makeInputWire(V3(-1.8, 0.45, 0), V3(-0.6, 0.45, 0), 'D0', 0x22c55e, 0);
    makeInputWire(V3(-1.8, 0.15, 0), V3(-0.6, 0.15, 0), 'D1', 0x22c55e, 1);
    makeInputWire(V3(-1.8, -0.15, 0), V3(-0.6, -0.15, 0), 'D2', 0x22c55e, 2);
    makeInputWire(V3(-1.8, -0.45, 0), V3(-0.6, -0.45, 0), 'D3', 0x22c55e, 3);
    makeInputWire(V3(0.6, -0.8, 0), V3(0.6, -0.5, 0), 'S0', 0x22c55e, 4);
    makeInputWire(V3(0.9, -0.8, 0), V3(0.9, -0.5, 0), 'S1', 0x22c55e, 5);
    makeOutputWire(V3(0.6, 0, 0), V3(1.8, 0, 0), 'Y');
    const lbl6 = makeLabel('MUX4'); lbl6.position.set(0, 0.7, 0.2); group.add(lbl6);
  } else if (type === 'demux_1to4') {
    const blk = makeBlock(V3(0, 0, 0), 1.0, 1.0); group.add(blk);
    makeInputWire(V3(-1.5, 0, 0), V3(-0.5, 0, 0), 'IN', 0x22c55e, 0);
    makeInputWire(V3(0.4, -0.8, 0), V3(0.4, -0.5, 0), 'S0', 0x22c55e, 1);
    makeInputWire(V3(0.7, -0.8, 0), V3(0.7, -0.5, 0), 'S1', 0x22c55e, 2);
    makeOutputWire(V3(0.5, 0.45, 0), V3(1.5, 0.45, 0), 'Y0');
    makeOutputWire(V3(0.5, 0.15, 0), V3(1.5, 0.15, 0), 'Y1');
    makeOutputWire(V3(0.5, -0.15, 0), V3(1.5, -0.15, 0), 'Y2');
    makeOutputWire(V3(0.5, -0.45, 0), V3(1.5, -0.45, 0), 'Y3');
    const lbl7 = makeLabel('DEMUX'); lbl7.position.set(0, 0.7, 0.2); group.add(lbl7);
  } else if (type === 'decoder_3to8') {
    const blk = makeBlock(V3(0, 0, 0), 1.2, 1.6); group.add(blk);
    makeInputWire(V3(-1.8, 0.6, 0), V3(-0.6, 0.6, 0), 'A0', 0x22c55e, 0);
    makeInputWire(V3(-1.8, 0.0, 0), V3(-0.6, 0.0, 0), 'A1', 0x22c55e, 1);
    makeInputWire(V3(-1.8, -0.6, 0), V3(-0.6, -0.6, 0), 'A2', 0x22c55e, 2);
    for (let i = 0; i < 8; i++) {
      const y = 0.7 - i * 0.2;
      makeOutputWire(V3(0.6, y, 0), V3(1.8, y, 0), `Y${i}`);
    }
    const lbl8 = makeLabel('3:8'); lbl8.position.set(0, 1.0, 0.2); group.add(lbl8);
  } else if (type === 'encoder_8to3') {
    const blk = makeBlock(V3(0, 0, 0), 1.2, 1.6); group.add(blk);
    for (let i = 0; i < 8; i++) {
      const y = 0.7 - i * 0.2;
      makeInputWire(V3(-1.8, y, 0), V3(-0.6, y, 0), `D${i}`, 0x22c55e, i);
    }
    makeOutputWire(V3(0.6, 0.5, 0), V3(1.8, 0.5, 0), 'Y0');
    makeOutputWire(V3(0.6, 0.0, 0), V3(1.8, 0.0, 0), 'Y1');
    makeOutputWire(V3(0.6, -0.5, 0), V3(1.8, -0.5, 0), 'Y2');
    const lbl9 = makeLabel('8:3'); lbl9.position.set(0, 1.0, 0.2); group.add(lbl9);
  } else if (type === 'sr_flipflop' || type === 'jk_flipflop' || type === 'd_flipflop') {
    const blk = makeBlock(V3(0, 0, 0), 1.2, 0.9); group.add(blk);
    const ffType = type === 'sr_flipflop' ? 'SR' : type === 'jk_flipflop' ? 'JK' : 'D';
    if (type === 'sr_flipflop') {
      makeInputWire(V3(-1.8, 0.3, 0), V3(-0.6, 0.3, 0), 'S', 0x22c55e, 0);
      makeInputWire(V3(-1.8, -0.3, 0), V3(-0.6, -0.3, 0), 'R', 0x22c55e, 1);
      makeInputWire(V3(-0.3, -0.8, 0), V3(-0.3, -0.45, 0), 'CLK', 0x22c55e, 2);
    } else if (type === 'jk_flipflop') {
      makeInputWire(V3(-1.8, 0.3, 0), V3(-0.6, 0.3, 0), 'J', 0x22c55e, 0);
      makeInputWire(V3(-1.8, -0.3, 0), V3(-0.6, -0.3, 0), 'K', 0x22c55e, 1);
      makeInputWire(V3(-0.3, -0.8, 0), V3(-0.3, -0.45, 0), 'CLK', 0x22c55e, 2);
    } else {
      makeInputWire(V3(-1.8, 0.0, 0), V3(-0.6, 0.0, 0), 'D', 0x22c55e, 0);
      makeInputWire(V3(-0.3, -0.8, 0), V3(-0.3, -0.45, 0), 'CLK', 0x22c55e, 1);
    }
    makeOutputWire(V3(0.6, 0.3, 0), V3(1.8, 0.3, 0), 'Q');
    makeOutputWire(V3(0.6, -0.3, 0), V3(1.8, -0.3, 0), 'Q̅');
    const lbl10 = makeLabel(ffType + ' FF'); lbl10.position.set(0, 0.7, 0.2); group.add(lbl10);
  }

  // Collect output wire meshes for dynamic color updates
  const outputWires = [];
  group.children.forEach((c) => {
    if (c.userData.isOutput) {
      outputWires.push(c);
    }
  });

  // Collect all input wire meshes
  const allInputWires = [];
  group.children.forEach((c) => {
    if (c.userData.inputIndex !== undefined && c.type === 'Mesh') {
      allInputWires.push(c);
    }
  });

  const refresh = () => {
    toggleCount++;
    const outputs = config.compute(inputStates);

    // Update input wire colors
    allInputWires.forEach((w) => {
      if (w.userData.inputIndex !== undefined && w.userData.inputIndex < inputStates.length) {
        const val = inputStates[w.userData.inputIndex];
        w.material.color.setHex(val ? 0x22c55e : COLORS.wireOff);
      }
    });

    // Update output wire colors
    let outIdx = 0;
    outputWires.forEach((w) => {
      if (outIdx < outputs.length) {
        w.material.color.setHex(outputs[outIdx] ? 0x60a5fa : COLORS.wireOff);
        w.userData.tooltip = `${config.outputs[outIdx] || 'Output'} &bull; <b>${outputs[outIdx]}</b>`;
        outIdx++;
      }
    });
  };

  refresh();

  const onClick = (obj) => {
    let node = obj;
    while (node && (node.userData.inputIndex === undefined || node.userData.inputIndex < 0) && node.parent) node = node.parent;
    if (node && node.userData.inputIndex !== undefined && node.userData.inputIndex >= 0) {
      const idx = node.userData.inputIndex;
      if (idx < config.inputs.length) {
        inputStates[idx] = 1 - inputStates[idx];
        // Flipflop: CLK edge triggers state update
        if (type === 'sr_flipflop' || type === 'jk_flipflop' || type === 'd_flipflop') {
          if (idx === (type === 'd_flipflop' ? 1 : 2)) { // CLK got toggled
            if (type === 'sr_flipflop') {
              if (inputStates[2]) { // rising edge
                if (inputStates[0]) inputStates[3] = 1;
                else if (inputStates[1]) inputStates[3] = 0;
              }
            } else if (type === 'jk_flipflop') {
              if (inputStates[2]) { // rising edge
                if (inputStates[0] && inputStates[1]) inputStates[3] = 1 - (inputStates[3] || 0);
                else if (inputStates[0]) inputStates[3] = 1;
                else if (inputStates[1]) inputStates[3] = 0;
              }
            } else { // D flipflop
              if (inputStates[1]) inputStates[2] = inputStates[0];
            }
          }
        }
        if (window.gsap && node.isMesh) {
          window.gsap.fromTo(node.scale, { x: 1.3, y: 1.3, z: 1.3 },
            { x: 1, y: 1, z: 1, duration: 0.3, ease: 'back.out(3)' });
        }
        refresh();
      }
    }
  };

  group.position.y = -0.2;
  return { group, targets: { circuit: { objects: [group] } }, tick() {}, onClick };
}
