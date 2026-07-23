// Template metadata — purpose, usage, and description for every template.
// Used by the info panel to display context when a template is selected.
export const TEMPLATE_META = {
  // ============ EXISTING ============
  npn_transistor: {
    category: 'Semiconductor Devices', name: 'NPN Bipolar Junction Transistor',
    desc: 'Three-terminal semiconductor device with N-P-N doping layers',
    purpose: 'Amplification and switching. A small base current controls a larger collector current.',
    usage: 'Signal amplification in audio/RF circuits, digital logic (TTL), switching regulators, motor drivers'
  },
  logic_gate: { category: 'Digital Logic', name: 'Logic Gate',
    desc: 'Fundamental building block of digital circuits that performs Boolean operations',
    purpose: 'Implements Boolean logic functions (AND, OR, NOT, NAND, NOR, XOR)',
    usage: 'CPUs, digital controllers, FPGA/ASIC design, arithmetic circuits, data routing'
  },
  gear_train: { category: 'Mechanical', name: 'Gear Train',
    desc: 'Multiple meshed gears transmitting rotational motion and torque',
    purpose: 'Change rotational speed, torque, and direction between shafts',
    usage: 'Transmissions, clocks, robotics, industrial machinery, vehicles'
  },
  spring_mass: { category: 'Mechanical', name: 'Spring-Mass Oscillator',
    desc: 'A mass attached to a spring exhibiting simple harmonic motion',
    purpose: 'Demonstrates the fundamental physics of oscillation, resonance, and damping',
    usage: 'Suspension systems, vibration analysis, seismometers, clock mechanisms'
  },
  wave: { category: 'Signals & Systems', name: 'Waveform Superposition',
    desc: 'Multiple waveforms combined to demonstrate superposition principle',
    purpose: 'Visualize constructive/destructive interference and Fourier decomposition',
    usage: 'Signal processing, communications, acoustics, quantum mechanics'
  },
  mosfet: { category: 'Semiconductor Devices', name: 'MOSFET Transistor',
    desc: 'Metal-Oxide-Semiconductor Field-Effect Transistor cross-section',
    purpose: 'Voltage-controlled switching and amplification with high input impedance',
    usage: 'CMOS digital ICs (95%+ of all chips), power management, RF amplifiers, memory'
  },
  opamp: { category: 'Amplifiers', name: 'Operational Amplifier',
    desc: 'High-gain differential voltage amplifier with feedback network',
    purpose: 'Performs mathematical operations: amplification, integration, differentiation, filtering',
    usage: 'Analog computers, active filters, signal conditioning, instrumentation, audio processing'
  },
  rlc_filter: { category: 'Filters', name: 'RLC Circuit / Filter',
    desc: 'Circuit with resistor, inductor, and capacitor forming frequency-selective network',
    purpose: 'Selectively passes or blocks signals based on frequency (resonance)',
    usage: 'Radio tuning, power supply filtering, crossover networks, impedance matching'
  },

  // ============ SEMICONDUCTOR DEVICES ============
  pn_junction: { category: 'Semiconductor Devices', name: 'PN Junction Diode',
    desc: 'Basic semiconductor diode formed by P-type and N-type material junction',
    purpose: 'Allows current flow in forward bias; blocks in reverse bias',
    usage: 'Rectification, signal demodulation, protection diodes, voltage clamping'
  },
  zener_diode: { category: 'Semiconductor Devices', name: 'Zener Diode',
    desc: 'Diode designed to operate in reverse breakdown region at a specific voltage',
    purpose: 'Provides stable reference voltage; conducts in reverse bias at Zener voltage',
    usage: 'Voltage regulation, reference voltage sources, overvoltage protection, clipping circuits'
  },
  schottky_diode: { category: 'Semiconductor Devices', name: 'Schottky Diode',
    desc: 'Metal-semiconductor junction diode with low forward voltage drop',
    purpose: 'Fast switching with low forward voltage (~0.3V) and minimal reverse recovery',
    usage: 'High-speed switching, power rectification, RF mixers, clamp diodes in digital circuits'
  },
  led: { category: 'Semiconductor Devices', name: 'Light Emitting Diode (LED)',
    desc: 'Diode that emits light when forward biased due to electroluminescence',
    purpose: 'Converts electrical energy directly into light (photons)',
    usage: 'Indicators, displays, lighting, optical communication, automotive lighting'
  },
  photodiode: { category: 'Semiconductor Devices', name: 'Photodiode',
    desc: 'Diode that generates current when exposed to light (photovoltaic effect)',
    purpose: 'Converts light energy into electrical current',
    usage: 'Light sensors, optical receivers, cameras, solar cells, medical imaging'
  },
  pnp_transistor: { category: 'Semiconductor Devices', name: 'PNP Bipolar Junction Transistor',
    desc: 'Three-terminal BJT with P-N-P doping; current flows from emitter to collector',
    purpose: 'Amplification and switching (complementary to NPN); holes are majority carriers',
    usage: 'Push-pull amplifiers, complementary circuits, current sources, analog switches'
  },
  n_jfet: { category: 'Semiconductor Devices', name: 'N-Channel JFET',
    desc: 'Junction Field-Effect Transistor with N-type channel; voltage-controlled device',
    purpose: 'Voltage-controlled current source with very high input impedance',
    usage: 'Low-noise amplifiers, analog switches, voltage-controlled resistors, buffer amplifiers'
  },
  p_jfet: { category: 'Semiconductor Devices', name: 'P-Channel JFET',
    desc: 'JFET with P-type channel; complementary to N-channel JFET',
    purpose: 'Voltage-controlled current regulation with opposite polarity to N-JFET',
    usage: 'Complementary JFET circuits, analog multiplexers, current limiters'
  },
  igbt: { category: 'Semiconductor Devices', name: 'IGBT',
    desc: 'Insulated-Gate Bipolar Transistor combines MOSFET gate with BJT output',
    purpose: 'High-voltage, high-current switching with voltage-controlled gate',
    usage: 'Motor drives, power inverters, electric vehicles, induction heating, welding'
  },
  scr: { category: 'Semiconductor Devices', name: 'Silicon Controlled Rectifier (SCR)',
    desc: 'Four-layer PNPN thyristor that latches on when triggered and conducts until current drops',
    purpose: 'High-power switching and phase control; once on, stays on until current interrupts',
    usage: 'AC motor control, light dimmers, power supplies, crowbar protection circuits'
  },
  triac: { category: 'Semiconductor Devices', name: 'TRIAC',
    desc: 'Bidirectional thyristor that can conduct in both directions when triggered',
    purpose: 'AC power control; switches both halves of AC waveform',
    usage: 'AC dimmers, fan speed controllers, solid-state relays, universal motor control'
  },

  // ============ RECTIFIERS ============
  half_wave_rectifier: { category: 'Rectifiers', name: 'Half-Wave Rectifier',
    desc: 'Rectifies only one half of the AC input waveform using a single diode',
    purpose: 'Converts AC to pulsating DC using only positive (or negative) half-cycle',
    usage: 'Low-cost power supplies, battery chargers, signal demodulation'
  },
  full_wave_ct_rectifier: { category: 'Rectifiers', name: 'Full-Wave Center-Tap Rectifier',
    desc: 'Uses two diodes and a center-tapped transformer to rectify both half-cycles',
    purpose: 'More efficient than half-wave; uses both halves of AC input',
    usage: 'Mid-range power supplies, vacuum tube circuits, audio power amplifiers'
  },
  full_wave_bridge: { category: 'Rectifiers', name: 'Full-Wave Bridge Rectifier',
    desc: 'Four-diode bridge configuration rectifies both half-cycles without center tap',
    purpose: 'Most common rectifier topology; high efficiency, no center tap required',
    usage: 'Most power supplies (99% of applications), battery chargers, DC motor drives'
  },
  precision_rectifier: { category: 'Rectifiers', name: 'Precision Rectifier',
    desc: 'Op-amp based rectifier that overcomes diode forward voltage drop',
    purpose: 'Rectifies signals below silicon diode threshold (~0.7V) with high accuracy',
    usage: 'Instrumentation, precision measurement, signal processing, AC voltmeters'
  },
  voltage_doubler: { category: 'Rectifiers', name: 'Voltage Doubler',
    desc: 'Capacitor-diode network that doubles peak AC input voltage',
    purpose: 'Generates DC voltage approximately 2× the peak AC input',
    usage: 'High-voltage low-current supplies, CRT displays, photoflash chargers, multipliers'
  },
  three_phase_rectifier: { category: 'Rectifiers', name: 'Three-Phase Rectifier',
    desc: 'Six-diode bridge rectifying three-phase AC to DC with low ripple',
    purpose: 'Converts three-phase AC to DC with minimal output ripple',
    usage: 'Industrial power supplies, motor drives, EV charging stations, welding equipment'
  },

  // ============ AMPLIFIERS ============
  common_emitter: { category: 'Amplifiers', name: 'Common Emitter Amplifier',
    desc: 'BJT amplifier with emitter grounded; input at base, output at collector',
    purpose: 'Provides high voltage and current gain; most common BJT amplifier topology',
    usage: 'General-purpose voltage amplification, preamplifiers, RF amplifiers'
  },
  common_base: { category: 'Amplifiers', name: 'Common Base Amplifier',
    desc: 'BJT amplifier with base grounded; low input impedance, high voltage gain',
    purpose: 'High-frequency amplification with low input impedance and good isolation',
    usage: 'RF amplifiers, cascode stages, current buffers, high-frequency oscillators'
  },
  common_collector: { category: 'Amplifiers', name: 'Common Collector (Emitter Follower)',
    desc: 'BJT amplifier with collector grounded; voltage gain ~1, high input impedance',
    purpose: 'Impedance transformation; buffers high-impedance source to low-impedance load',
    usage: 'Buffer stages, voltage regulators, audio output stages, impedance matching'
  },
  differential_pair: { category: 'Amplifiers', name: 'Differential Amplifier Pair',
    desc: 'Two matched transistors amplifying the difference between two input signals',
    purpose: 'Rejects common-mode noise while amplifying differential signals',
    usage: 'Op-amp input stages, instrumentation amplifiers, balanced signal processing'
  },
  darlington_pair: { category: 'Amplifiers', name: 'Darlington Pair',
    desc: 'Two cascaded BJTs with current gain equal to product of individual gains',
    purpose: 'Extremely high current gain (β_total = β1 × β2)',
    usage: 'High-current drivers, power output stages, sensitive touch sensors, voltage regulators'
  },
  cascode_amplifier: { category: 'Amplifiers', name: 'Cascode Amplifier',
    desc: 'CE-CB (or CS-CG) cascade combining high gain with wide bandwidth',
    purpose: 'High gain-bandwidth product; minimizes Miller effect capacitance',
    usage: 'RF amplifiers, high-speed analog circuits, oscilloscopes, microwave circuits'
  },
  push_pull: { category: 'Amplifiers', name: 'Push-Pull Amplifier',
    desc: 'Complementary NPN/PNP pair alternately conducting for each half-cycle',
    purpose: 'Class AB/B operation with higher efficiency than single-ended Class A',
    usage: 'Audio power amplifiers, motor drivers, output stages, power converters'
  },
  instrumentation_amp: { category: 'Amplifiers', name: 'Instrumentation Amplifier',
    desc: 'Three op-amp configuration providing high CMRR and differential gain',
    purpose: 'Precise differential measurement with extremely high common-mode rejection',
    usage: 'Medical instrumentation (ECG/EEG), sensor interfaces, bridge circuits, data acquisition'
  },
  transconductance_amp: { category: 'Amplifiers', name: 'Operational Transconductance Amplifier (OTA)',
    desc: 'Amplifier where output current is proportional to input voltage (gm = gain)',
    purpose: 'Voltage-controlled current source; gain adjustable by bias current',
    usage: 'Active filters, multipliers, sample-and-hold circuits, oscillators, neural networks'
  },
  multistage_amp: { category: 'Amplifiers', name: 'Multistage Amplifier',
    desc: 'Multiple amplifier stages cascaded for very high overall gain',
    purpose: 'Achieve gain beyond single-stage limits (10^5 or more)',
    usage: 'High-gain amplifiers, sensitive receivers, measurement equipment, hearing aids'
  },
  tuned_amplifier: { category: 'Amplifiers', name: 'Tuned Amplifier',
    desc: 'Amplifier with LC tank circuit as load; selective frequency response',
    purpose: 'Amplifies signals only within a narrow frequency band (resonant)',
    usage: 'Radio frequency (RF) stages, IF amplifiers, wireless receivers, bandwidth selection'
  },

  // ============ FILTERS ============
  rc_lowpass: { category: 'Filters', name: 'RC Low-Pass Filter',
    desc: 'Resistor-capacitor network that passes low frequencies, attenuates high',
    purpose: 'Remove high-frequency noise and ripple from signals',
    usage: 'Power supply smoothing, anti-aliasing, audio tweeter protection, DAC reconstruction'
  },
  rc_highpass: { category: 'Filters', name: 'RC High-Pass Filter',
    desc: 'RC network that passes high frequencies, blocks low frequencies',
    purpose: 'Remove DC offset and low-frequency drift from signals',
    usage: 'AC coupling, bass removal, DC blocking, high-frequency signal extraction'
  },
  rlc_bandpass: { category: 'Filters', name: 'RLC Band-Pass Filter',
    desc: 'Resonant RLC circuit that passes a specific frequency band',
    purpose: 'Selectively passes signals within a frequency band around resonance',
    usage: 'Radio tuning, channel selection, IF stages, wireless receivers, spectrum analysis'
  },
  rlc_bandstop: { category: 'Filters', name: 'RLC Band-Stop (Notch) Filter',
    desc: 'RLC circuit that attenuates a specific frequency band',
    purpose: 'Reject or notch out unwanted frequencies while passing others',
    usage: 'Hum elimination (50/60Hz), interference rejection, feedback suppression, equalizers'
  },
  butterworth_lp: { category: 'Filters', name: 'Butterworth Low-Pass Filter',
    desc: 'Maximally flat passband filter with monotonic roll-off',
    purpose: 'Flat amplitude response in passband with no ripple',
    usage: 'High-fidelity audio, precision measurement, anti-aliasing, data conversion'
  },
  butterworth_hp: { category: 'Filters', name: 'Butterworth High-Pass Filter',
    desc: 'High-pass version of Butterworth filter with maximally flat passband',
    purpose: 'Flat passband response while blocking low frequencies',
    usage: 'Subsonic filtering, DC removal with zero ripple, instrument front-ends'
  },
  chebyshev_lp: { category: 'Filters', name: 'Chebyshev Low-Pass Filter',
    desc: 'Filter with equiripple in passband and sharper roll-off than Butterworth',
    purpose: 'Sharper cutoff at expense of passband ripple (±dB specified)',
    usage: 'Sharp cutoff applications, channel separation, anti-aliasing with tight specs'
  },
  sallen_key_lp: { category: 'Filters', name: 'Sallen-Key Low-Pass Filter',
    desc: 'Active second-order filter using one op-amp with RC feedback',
    purpose: 'Built-in gain with second-order low-pass response; no inductors needed',
    usage: 'Active crossover networks, tone control, sensor filtering, audio signal conditioning'
  },
  sallen_key_hp: { category: 'Filters', name: 'Sallen-Key High-Pass Filter',
    desc: 'Active high-pass filter using op-amp in Sallen-Key topology',
    purpose: 'Second-order high-pass response with adjustable Q and gain',
    usage: 'Rumble filters, DC blocking with sharp response, spectrum analyzers'
  },
  active_bpf: { category: 'Filters', name: 'Active Band-Pass Filter',
    desc: 'Multiple-feedback active filter using op-amp for band-pass response',
    purpose: 'Selective frequency band amplification with gain control',
    usage: 'Tone detectors, parametric equalizers, signal selection, lock-in amplifiers'
  },

  // ============ OSCILLATORS ============
  rc_phase_shift: { category: 'Oscillators', name: 'RC Phase Shift Oscillator',
    desc: 'Oscillator using three RC networks to achieve 180° phase shift',
    purpose: 'Generates sinusoidal output at audio frequencies without LC components',
    usage: 'Audio signal generators, function generators, test equipment, tone generation'
  },
  wien_bridge: { category: 'Oscillators', name: 'Wien Bridge Oscillator',
    desc: 'RC bridge oscillator with op-amp providing low-distortion sine waves',
    purpose: 'Low-distortion (~0.01%) sine wave generation at audio frequencies',
    usage: 'Audio oscillators, distortion testers, impedance bridges, function generators'
  },
  colpitts: { category: 'Oscillators', name: 'Colpitts Oscillator',
    desc: 'LC oscillator with tapped capacitor voltage divider feedback',
    purpose: 'High-frequency sinusoidal oscillation using LC tank circuit',
    usage: 'RF oscillators, local oscillators in radios, VCOs, proximity sensors'
  },
  hartley: { category: 'Oscillators', name: 'Hartley Oscillator',
    desc: 'LC oscillator with tapped inductor providing feedback',
    purpose: 'Sinusoidal oscillation at RF frequencies using tapped coil',
    usage: 'RF signal generators, mixers, radio receivers, induction heating'
  },
  crystal: { category: 'Oscillators', name: 'Crystal Oscillator',
    desc: 'Piezoelectric quartz crystal resonator providing ultra-stable oscillation',
    purpose: 'Extremely stable and precise frequency reference (10^-6 to 10^-9 accuracy)',
    usage: 'Clocks & watches, microcontrollers, GPS, communication systems, frequency standards'
  },
  ring_oscillator: { category: 'Oscillators', name: 'Ring Oscillator',
    desc: 'Odd number of inverters in a loop producing self-sustaining oscillation',
    purpose: 'On-chip clock generation using only digital gates (no external components)',
    usage: 'VLSI clock generation, process monitoring, PLL reference, delay measurement'
  },
  relaxation_osc: { category: 'Oscillators', name: 'Relaxation Oscillator',
    desc: 'Op-amp/comparator with RC timing producing square/triangular waves',
    purpose: 'Generates non-sinusoidal waveforms (square, triangle, sawtooth)',
    usage: 'Function generators, PWM generation, timer circuits (555), DC-DC converters'
  },
  astable_multivibrator: { category: 'Oscillators', name: 'Astable Multivibrator',
    desc: 'Two-transistor switching circuit with no stable state; oscillates continuously',
    purpose: 'Square wave generation using cross-coupled transistors and RC timing',
    usage: 'Clock sources, flasher circuits, tone generators, timing references'
  },
  lc_oscillator: { category: 'Oscillators', name: 'LC Oscillator',
    desc: 'Inductor-capacitor tank circuit producing high-frequency sinusoidal oscillation',
    purpose: 'Pure sinusoidal RF generation using LC resonance',
    usage: 'RF carriers, wireless transmitters, proximity detectors, metal detectors'
  },

  // ============ DIGITAL GATES ============
  and_gate: { category: 'Digital Logic', name: 'AND Gate',
    desc: '1 only when ALL inputs are 1; output = A · B',
    purpose: 'Fundamental Boolean logic: output high only when all inputs high',
    usage: 'Enable signals, mask operations, data routing, comparator circuits'
  },
  or_gate: { category: 'Digital Logic', name: 'OR Gate',
    desc: '1 when ANY input is 1; output = A + B',
    purpose: 'Boolean OR: output high when at least one input is high',
    usage: 'Interrupt combining, alarm systems, data bus control, priority encoders'
  },
  not_gate: { category: 'Digital Logic', name: 'NOT Gate (Inverter)',
    desc: 'Inverts input: output = NOT A (complement)',
    purpose: 'Basic signal inversion; fundamental building block of CMOS logic',
    usage: 'CMOS inverter cells, ring oscillators, clock generation, logic inversion'
  },
  nand_gate: { category: 'Digital Logic', name: 'NAND Gate',
    desc: 'AND followed by NOT: only 0 when ALL inputs are 1',
    purpose: 'Universal gate; any Boolean function can be implemented using only NANDs',
    usage: 'Universal logic, memory cells (SRAM), flip-flops, arithmetic circuits'
  },
  nor_gate: { category: 'Digital Logic', name: 'NOR Gate',
    desc: 'OR followed by NOT: only 1 when ALL inputs are 0',
    purpose: 'Universal gate (alternative to NAND); implements any Boolean function',
    usage: 'SR latches, decoding logic, universal logic implementation, memory'
  },
  xor_gate: { category: 'Digital Logic', name: 'XOR Gate',
    desc: '1 when inputs DIFFER; output = A ⊕ B',
    purpose: 'Detects inequality; fundamental to arithmetic and error detection',
    usage: 'Adders, subtractors, parity generators, pseudo-random generators, comparators'
  },
  xnor_gate: { category: 'Digital Logic', name: 'XNOR Gate',
    desc: '1 when inputs MATCH; output = NOT (A ⊕ B); equality detector',
    purpose: 'Detects equality between two bits',
    usage: 'Magnitude comparators, encryption, correlation, phase detection'
  },
  buffer_gate: { category: 'Digital Logic', name: 'Buffer Gate',
    desc: 'Passes input to output without logic change; used for drive strength',
    purpose: 'Signal regeneration and fan-out increase without changing logic value',
    usage: 'Clock distribution, bus driving, signal restoration, fan-out improvement'
  },
  tri_state: { category: 'Digital Logic', name: 'Tri-State Buffer',
    desc: 'Buffer with enable input; output can be 0, 1, or high-impedance (Z)',
    purpose: 'Allows multiple outputs to share a bus without conflict',
    usage: 'Shared data buses (memory, I/O), multiplexed lines, bidirectional buses'
  },
  schmitt_trigger: { category: 'Digital Logic', name: 'Schmitt Trigger',
    desc: 'Comparator with hysteresis; different thresholds for rising/falling edges',
    purpose: 'Cleans noisy signals; provides noise immunity with built-in hysteresis',
    usage: 'Switch debouncing, square wave generation, noise filtering, level detection'
  },

  // ============ DIGITAL CIRCUITS ============
  half_adder: { category: 'Digital Circuits', name: 'Half Adder',
    desc: 'Combinational circuit adding two bits: outputs Sum and Carry',
    purpose: 'Binary addition of two 1-bit numbers; basic arithmetic building block',
    usage: 'ALU design, multi-bit adders, counters, DSP arithmetic units'
  },
  full_adder: { category: 'Digital Circuits', name: 'Full Adder',
    desc: 'Adds three bits (A + B + Carry-in): outputs Sum and Carry-out',
    purpose: 'Complete 1-bit addition with carry propagation for multi-bit arithmetic',
    usage: 'Ripple-carry adders, carry-lookahead adders, ALUs, DSP, CPU arithmetic'
  },
  half_subtractor: { category: 'Digital Circuits', name: 'Half Subtractor',
    desc: 'Subtracts two bits: outputs Difference and Borrow',
    purpose: 'Basic binary subtraction; complement/subtract operations',
    usage: 'Arithmetic logic units, complement circuits, digital signal processors'
  },
  full_subtractor: { category: 'Digital Circuits', name: 'Full Subtractor',
    desc: 'Subtracts three bits (A - B - Borrow-in): outputs Difference and Borrow-out',
    purpose: 'Complete 1-bit subtraction with borrow propagation',
    usage: 'Multi-bit subtraction, comparison circuits, DSP, scientific computing'
  },
  mux_2to1: { category: 'Digital Circuits', name: '2-to-1 Multiplexer',
    desc: 'Selects one of two data inputs based on a select line',
    purpose: 'Data routing: connects one of N inputs to a single output',
    usage: 'Data selection, resource sharing, function generators, routing matrices'
  },
  mux_4to1: { category: 'Digital Circuits', name: '4-to-1 Multiplexer',
    desc: 'Selects one of four data inputs using two select lines',
    purpose: 'Larger-scale data selection from multiple sources',
    usage: 'Register file selection, ALU input routing, data acquisition systems'
  },
  demux_1to4: { category: 'Digital Circuits', name: '1-to-4 Demultiplexer',
    desc: 'Routes single input to one of four outputs based on select lines',
    purpose: 'Data distribution: connects single source to one of multiple destinations',
    usage: 'Memory addressing, data distribution, bus demultiplexing, display driving'
  },
  decoder_3to8: { category: 'Digital Circuits', name: '3-to-8 Decoder',
    desc: '3-bit binary input activates exactly one of eight outputs',
    purpose: 'Binary-to-unary conversion; address decoding',
    usage: 'Memory address decoding, instruction decoding, seven-segment display, demux'
  },
  encoder_8to3: { category: 'Digital Circuits', name: '8-to-3 Encoder',
    desc: '8 inputs produce 3-bit binary output corresponding to active input',
    purpose: 'Encodes the position of an active input line into binary code',
    usage: 'Keypad encoders, interrupt controllers, priority resolution, data compression'
  },
  sr_flipflop: { category: 'Digital Circuits', name: 'SR Flip-Flop',
    desc: 'Set-Reset bistable latch; fundamental 1-bit memory element',
    purpose: 'Stores one bit; Q = 1 on Set, Q = 0 on Reset',
    usage: 'State registers, data storage, debounce circuits, control logic'
  },
  jk_flipflop: { category: 'Digital Circuits', name: 'JK Flip-Flop',
    desc: 'Universal flip-flop with no invalid states (unlike SR)',
    purpose: 'Toggles when J=K=1; most versatile flip-flop type',
    usage: 'Counters, frequency dividers, shift registers, state machines'
  },
  d_flipflop: { category: 'Digital Circuits', name: 'D Flip-Flop',
    desc: 'Data flip-flop; Q follows D input on clock edge',
    purpose: 'Edge-triggered data storage and synchronization',
    usage: 'Registers, pipeline stages, data synchronization, memory arrays, counters'
  },

  // ============ VLSI ============
  cmos_inverter_layout: { category: 'VLSI / CMOS', name: 'CMOS Inverter Layout',
    desc: 'Physical layout of complementary PMOS and NMOS transistors forming inverter',
    purpose: 'Basic CMOS gate: when IN=1, NMOS pulls OUT to GND; IN=0, PMOS pulls to VDD',
    usage: 'Standard cell libraries, all digital CMOS ICs, microprocessor core elements'
  },
  cmos_nand: { category: 'VLSI / CMOS', name: 'CMOS NAND Gate',
    desc: 'Series NMOS + parallel PMOS transistors implementing NAND logic',
    purpose: '2-input NAND using 4 transistors (2 NMOS + 2 PMOS)',
    usage: 'Universal CMOS logic, memory decoders, standard cell libraries'
  },
  cmos_nor: { category: 'VLSI / CMOS', name: 'CMOS NOR Gate',
    desc: 'Parallel NMOS + series PMOS transistors implementing NOR logic',
    purpose: '2-input NOR using 4 transistors; complementary to NAND topology',
    usage: 'CMOS logic families, SRAM decoders, complex gate implementations'
  },
  cmos_and: { category: 'VLSI / CMOS', name: 'CMOS AND Gate',
    desc: 'NAND followed by inverter; CMOS implementation of AND function',
    purpose: 'AND function using 6 transistors (NAND + inverter)',
    usage: 'Standard cell libraries, clock gating, enable logic, data paths'
  },
  cmos_or: { category: 'VLSI / CMOS', name: 'CMOS OR Gate',
    desc: 'NOR followed by inverter; CMOS implementation of OR function',
    purpose: 'OR function using 6 transistors (NOR + inverter)',
    usage: 'Standard cells, interrupt logic, control path, function generation'
  },
  transmission_gate: { category: 'VLSI / CMOS', name: 'Transmission Gate (TG)',
    desc: 'Parallel NMOS + PMOS pass gate that conducts both 0 and 1 perfectly',
    purpose: 'Bidirectional switch passing full logic levels without threshold drop',
    usage: 'Analog switches, multiplexers, D-latches, flip-flops, low-power logic'
  },
  pass_transistor: { category: 'VLSI / CMOS', name: 'Pass Transistor Logic',
    desc: 'NMOS/PMOS transistor used as a switch to pass logic signals',
    purpose: 'Reduced transistor count logic; passes signals through transistor channel',
    usage: 'Low-power logic, XOR/adder circuits, LVS emulation, FPGA switch matrices'
  },
  sram_cell_6t: { category: 'VLSI / CMOS', name: '6T SRAM Cell',
    desc: 'Six-transistor static RAM cell with cross-coupled inverters + access transistors',
    purpose: 'Static memory storage; retains data as long as power is applied',
    usage: 'CPU cache (L1/L2/L3), register files, embedded memory, buffer storage'
  },
  dram_cell_1t: { category: 'VLSI / CMOS', name: '1T DRAM Cell',
    desc: 'Single-transistor DRAM cell with storage capacitor',
    purpose: 'High-density volatile memory; capacitor stores charge representing data',
    usage: 'Main memory (RAM), frame buffers, graphics memory, mass storage'
  },
  pla_block: { category: 'VLSI / CMOS', name: 'Programmable Logic Array',
    desc: 'AND-plane followed by OR-plane; customizable logic implementation',
    purpose: 'Implements any sum-of-products Boolean expression in hardware',
    usage: 'ASIC prototyping, control logic, state machine implementation, FPGA fabric'
  },

  // ============ POWER ELECTRONICS ============
  buck_converter: { category: 'Power Electronics', name: 'Buck (Step-Down) Converter',
    desc: 'Switching regulator that steps down input voltage with high efficiency',
    purpose: 'Efficient DC-DC voltage step-down (Vout < Vin) with >90% efficiency',
    usage: 'CPU/GPU voltage regulators (VRM), battery-powered devices, point-of-load supplies'
  },
  boost_converter: { category: 'Power Electronics', name: 'Boost (Step-Up) Converter',
    desc: 'Switching regulator that steps up input voltage',
    purpose: 'Efficient DC-DC voltage step-up (Vout > Vin)',
    usage: 'LED drivers, battery boost circuits, solar inverters, automotive systems'
  },
  buck_boost: { category: 'Power Electronics', name: 'Buck-Boost Converter',
    desc: 'Switching regulator that can step up or step down voltage',
    purpose: 'DC-DC conversion where output can be above or below input',
    usage: 'Battery-powered devices (battery voltage crosses regulation point), automotive, portable'
  },
  flyback: { category: 'Power Electronics', name: 'Flyback Converter',
    desc: 'Isolated DC-DC converter using coupled inductor; popular for low-power isolated supplies',
    purpose: 'Galvanically isolated power conversion with minimal components',
    usage: 'AC-DC chargers, TV power supplies, auxiliary bias supplies, high-voltage supplies'
  },
  forward_converter: { category: 'Power Electronics', name: 'Forward Converter',
    desc: 'Isolated DC-DC converter using transformer; higher power than flyback',
    purpose: 'Isolated step-down/up with better efficiency and higher output power',
    usage: 'Server power supplies, industrial converters, battery chargers (mid-power)'
  },
  h_bridge: { category: 'Power Electronics', name: 'H-Bridge Motor Driver',
    desc: 'Four-switch configuration that drives motor in both directions',
    purpose: 'Bi-directional DC motor control; allows forward, reverse, brake, coast',
    usage: 'Robotics, motor control, DC-DC converters, inverters, servo amplifiers'
  },
  inverter_3ph: { category: 'Power Electronics', name: 'Three-Phase Inverter',
    desc: 'Six-switch bridge converting DC to three-phase AC',
    purpose: 'DC to three-phase AC conversion with variable frequency and voltage',
    usage: 'Motor drives (EVs,工业), grid-tie inverters, UPS systems, renewable energy'
  },
  cuk_converter: { category: 'Power Electronics', name: 'Čuk (Ćuk) Converter',
    desc: 'DC-DC converter with continuous input/output current and inverted output',
    purpose: 'Step-up/step-down with low ripple current at both input and output',
    usage: 'Power factor correction, battery systems, low-EMI applications'
  },
  sepic: { category: 'Power Electronics', name: 'SEPIC Converter',
    desc: 'Single-Ended Primary Inductor Converter; non-inverting buck-boost',
    purpose: 'Non-inverting buck-boost with continuous input current (low ripple)',
    usage: 'Battery-powered systems, LED drivers, automotive power, PFC preregulators'
  },
  charge_pump: { category: 'Power Electronics', name: 'Charge Pump (Switched Capacitor)',
    desc: 'Capacitor-based voltage converter without inductors',
    purpose: 'Voltage inversion, doubling, or regulation using only capacitors and switches',
    usage: 'RS-232 level shifters, EEPROM programming, LCD bias, portable audio'
  },

  // ============ SIGNAL / CONTROL ============
  pll: { category: 'Signals & Systems', name: 'Phase-Locked Loop (PLL)',
    desc: 'Feedback system that locks output frequency/phase to input reference',
    purpose: 'Frequency synthesis, phase synchronization, clock recovery, demodulation',
    usage: 'Wireless transceivers, clock generation, FM demodulation, frequency multiplication'
  },
  pid_controller: { category: 'Control Systems', name: 'PID Controller',
    desc: 'Proportional-Integral-Derivative feedback control system',
    purpose: 'Automated closed-loop control minimizing error between setpoint and output',
    usage: 'Temperature control, motor speed regulation, process control, drone stabilization'
  },
  feedback_system: { category: 'Control Systems', name: 'Feedback Control System',
    desc: 'Generic closed-loop system with sensor, controller, plant, and feedback path',
    purpose: 'Regulates system output by comparing with reference and applying correction',
    usage: 'All automated control: cruise control, temperature regulation, servo systems'
  },
  sample_hold: { category: 'Signal Processing', name: 'Sample and Hold Circuit',
    desc: 'Captures analog voltage and holds it constant for processing',
    purpose: 'Acquires analog signal at a moment in time and maintains it for ADC conversion',
    usage: 'ADC front-ends, data acquisition, waveform reconstruction, peak detection'
  },
  flash_adc: { category: 'Signal Processing', name: 'Flash ADC (Parallel ADC)',
    desc: 'Fastest ADC type using 2^n comparators to convert analog to n-bit digital',
    purpose: 'Ultra-high-speed analog-to-digital conversion (GHz sampling rates)',
    usage: 'Oscilloscopes, radar, satellite communications, high-speed data acquisition'
  },
  r2r_dac: { category: 'Signal Processing', name: 'R-2R Ladder DAC',
    desc: 'Binary-weighted resistor ladder converting digital to analog voltage',
    purpose: 'Accurate digital-to-analog conversion using only two resistor values',
    usage: 'Audio DACs, waveform generation, control systems, calibration equipment'
  },
  mixer: { category: 'Signals & Systems', name: 'Frequency Mixer',
    desc: 'Nonlinear circuit producing sum and difference frequencies from two inputs',
    purpose: 'Frequency translation for heterodyne reception and modulation',
    usage: 'Superheterodyne receivers, up/down converters, modems, spectrum analyzers'
  },
  vco_block: { category: 'Oscillators', name: 'Voltage-Controlled Oscillator (VCO)',
    desc: 'Oscillator whose frequency is controlled by an input voltage',
    purpose: 'Frequency modulation; output frequency proportional to control voltage',
    usage: 'PLLs, frequency synthesizers, FM modulators, sweep generators, clock recovery'
  },
};
