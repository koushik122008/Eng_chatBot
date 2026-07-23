"""Groq (OpenAI-compatible) integration: system-prompt assembly + streaming chat.

Replaces the previous Anthropic Claude client.  Keeps the same public
interface (stream_reply, parse_scene_json) so the chat route is unaffected.

The system prompt is assembled once from config.yaml and kept byte-stable for
prompt-caching benefits via Groq's API.
"""
import json
from collections.abc import Iterator
from groq import Groq

from backend.config import config
from backend.stream_parser import StreamParser

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = Groq()
    return _client

# Keep this description in sync with backend/scene_schema.py and
# frontend/js/three-scenes/registry.js.
_TEMPLATE_DOCS = """
Available 3D scene templates and their params:

## Original 8 Templates

1. "npn_transistor" — NPN transistor / PN junction cross-section.
   params: {"bias": "cutoff"|"active"|"saturation", "showDepletionRegion": bool}
   Targets: "electrons", "holes", "depletion", "base", "emitter", "collector".

2. "logic_gate" — a logic gate with clickable input switches and an output lamp.
   params: {"gate": "AND"|"OR"|"NOT"|"NAND"|"NOR"|"XOR", "inputs": [0|1, ...]}
   Targets: "inputA", "inputB", "output", "gate".

3. "gear_train" — 2 to 4 meshed spur gears showing gear ratios.
   params: {"gears": [{"teeth": int 6..60}, ...] (2-4 gears), "rpm": number 1..120}
   Targets: "gear0", "gear1", ...

4. "spring_mass" — vertical spring-mass(-damper) oscillator.
   params: {"mass": 0.1..100, "k": 0.1..1000, "damping": 0..10, "initialDisplacement": -2..2}
   Targets: "mass", "spring", "equilibrium".

5. "wave" — waveform display (one to three components and their sum).
   params: {"mode": "time"|"superposition",
            "waves": [{"type": "sine"|"square"|"triangle"|"sawtooth",
                       "freq": 0.1..10, "amp": 0.1..2, "phase": -pi..pi}, ...]}
   Targets: "wave0", "wave1", "wave2", "sum", "source".

6. "mosfet" — MOSFET / CMOS inverter cross-section.
   params: {"type": "nmos"|"pmos"|"cmos_inverter", "vgs": 0..5, "vds": 0..5}
   Targets: "gate", "source", "drain", "channel", "substrate", "oxide", "electrons".

7. "opamp" — Op-amp circuit with feedback network.
   params: {"config": "inverting"|"noninverting"|"integrator", "r1": 1..10000, "r2": 1..10000, "inputVoltage": -10..10}
   Targets: "opamp_body", "inverting_input", "noninverting_input", "output", "feedback", "signal_flow".

8. "rlc_filter" — RLC circuit / filter.
   params: {"type": "series_rlc"|"parallel_rlc"|"lowpass"|"highpass", "r": 1..10000, "l": 0.1..1000, "c": 0.01..10000, "frequency": 1..100000}
   Targets: "resistor", "inductor", "capacitor", "source", "output_signal", "rlc_loop", "resonance_indicator".


## CATEGORY TEMPLATES (11 categories, ~110+ variants)

All category templates accept the same generic param shape:
  params: {"type": string (operating mode), "showLabels": bool}


### Semiconductor Devices (12 variants)
"pn_junction", "zener_diode", "schottky_diode", "led", "photodiode",
"pnp_transistor", "n_jfet", "p_jfet", "igbt", "scr", "triac"
Targets: "device_body", "terminals" (array), "current_flow", "depletion" (where applicable)

### Rectifiers (6 variants)
"half_wave_rectifier", "full_wave_ct_rectifier", "full_wave_bridge",
"precision_rectifier", "voltage_doubler", "three_phase_rectifier"
Targets: "input_ac", "output_dc", "diodes" (array), "capacitor", "current_flow", "load"

### Amplifiers (11 variants)
"common_emitter", "common_base", "common_collector", "differential_pair",
"darlington_pair", "cascode_amplifier", "push_pull", "instrumentation_amp",
"transconductance_amp", "multistage_amp", "tuned_amplifier"
Targets: "input", "output", "transistor" (array), "load", "supply", "signal_path"

### Filters (10 variants)
"rc_lowpass", "rc_highpass", "rlc_bandpass", "rlc_bandstop",
"butterworth_lp", "butterworth_hp", "chebyshev_lp", "sallen_key_lp",
"sallen_key_hp", "active_bpf"
Targets: "input", "output", "components" (array), "response_curve", "signal_trace"

### Oscillators (10 variants)
"rc_phase_shift", "wien_bridge", "colpitts", "hartley", "crystal",
"ring_oscillator", "relaxation_osc", "astable_multivibrator",
"lc_oscillator", "vco_block"
Targets: "output_wave", "tank_circuit", "feedback", "frequency_meter", "oscillation_loop"

### Digital Gates (10 variants)
"and_gate", "or_gate", "not_gate", "nand_gate", "nor_gate",
"xor_gate", "xnor_gate", "buffer_gate", "tri_state", "schmitt_trigger"
Targets: "input_a", "input_b", "output", "gate_body"

### Digital Circuits (12 variants)
"half_adder", "full_adder", "half_subtractor", "full_subtractor",
"mux_2to1", "mux_4to1", "demux_1to4", "decoder_3to8", "encoder_8to3",
"sr_flipflop", "jk_flipflop", "d_flipflop"
Targets: "inputs" (array), "outputs" (array), "circuit_body", "signal_path"

### VLSI / CMOS (10 variants)
"cmos_inverter_layout", "cmos_nand", "cmos_nor", "cmos_and", "cmos_or",
"transmission_gate", "pass_transistor", "sram_cell_6t", "dram_cell_1t", "pla_block"
Targets: "pmos", "nmos", "output", "vdd", "gnd", "signal_path"

### Power Electronics (10 variants)
"buck_converter", "boost_converter", "buck_boost", "flyback",
"forward_converter", "h_bridge", "inverter_3ph",
"cuk_converter", "sepic", "charge_pump"
Targets: "input", "output", "switch", "diode", "inductor", "capacitor", "power_flow"

### Signal / Control Systems (7 variants)
"pll", "pid_controller", "feedback_system", "sample_hold",
"flash_adc", "r2r_dac", "mixer"

## NEW CATEGORIES

### Electromagnetics & Motors (9 variants)
"solenoid", "electromagnet", "dc_motor", "stepper_motor",
"transformer_core", "relay", "inductor_core", "magnetic_circuit",
"generator_alternator"
Targets: "device_body", "terminals", "current_flow"

### Antennas & Wave Propagation (7 variants)
"dipole_antenna", "monopole_antenna", "patch_antenna",
"yagi_uda", "parabolic_dish", "horn_antenna", "wave_guide"
Targets: "device_body", "terminals", "signal_flow"

### Thermal & Fluid Systems (8 variants)
"heat_sink", "heat_exchanger", "pipe_flow", "venturi_meter",
"pitot_tube", "pump_cross", "turbine_blade", "nozzle"
Targets: "device_body", "terminals", "current_flow"

### Structures & Mechanical Engineering (8 variants)
"beam_bending", "cantilever_beam", "truss", "column_buckling",
"torsion_shaft", "stress_concentration", "retaining_wall", "rcc_beam"
Targets: "device_body", "terminals", "signal_flow"

### Sensors & Actuators (8 variants)
"thermocouple", "piezoelectric", "strain_gauge", "accelerometer",
"pressure_sensor", "photodiode_sensor", "thermistor", "potentiometer"
Targets: "device_body", "terminals", "signal_flow"

### RF & Microwave (6 variants)
"microstrip_line", "stripline", "coaxial_cable",
"smith_chart", "circulator", "directional_coupler"
Targets: "device_body", "terminals", "signal_flow"

### Materials Science (6 variants)
"crystal_lattice", "stress_strain", "phase_diagram",
"dislocation", "grain_structure", "composite"

### Chemistry / Process Engineering (6 variants)
"distillation_column", "chemical_reactor", "crystallizer",
"evaporator", "centrifuge", "fermenter"

### Renewable Energy & Storage (6 variants)
"solar_panel", "wind_turbine", "fuel_cell",
"battery_cell", "supercapacitor", "electrolyzer"

### Optics & Photonics (8 variants)
"convex_lens", "concave_lens", "prism", "fiber_optic",
"laser_cavity", "diffraction_grating", "interferometer", "beam_splitter"

### Manufacturing & Industrial (5 variants)
"cnc_mill", "injection_mold", "conveyor_belt",
"robot_arm", "welding_torch"

### Aerospace Engineering (5 variants)
"airfoil", "rocket", "satellite",
"propeller", "jet_engine"
Targets: "device_body", "terminals", "signal_flow"
Targets: "input_signal", "output_signal", "controller", "feedback_path", "signal_flow"


## Scene spec JSON shape (all fields except template/title optional)
{
  "v": 1,
  "template": "<one of the template names>",
  "title": "short title shown above the 3D view",
  "style": "schematic" | "realistic",
  "params": { ...template params... },
  "labels": [{"id": "<target>", "text": "label text"}],
  "animations": [{"id": "my-anim", "target": "<target>",
                  "type": "flow"|"pulse"|"highlight"|"rotate"|"oscillate"|"toggle",
                  "loop": true|false, "speed": 0.1..5}],
  "camera": {"orbit": [azimuthDeg, elevationDeg], "zoom": 0.3..3},
  "autoplay": ["anim-ids to start immediately"]
}
""".strip()


def build_system_prompt() -> str:
    socratic = (
        "Teach Socratically: when the student asks a problem, give guiding hints and "
        "questions first; give the full worked solution only when they explicitly ask "
        "for it (or after they have attempted it)."
        if config.socratic
        else "Explain directly and completely."
    )
    return f"""You are EngiBuddy, a friendly study companion for BTech/engineering students.

Student context: subject focus is {config.subject_focus}; branch: {config.branch}; semester {config.semester}; default difficulty: {config.difficulty}.

{socratic}

Core abilities:
- Explain engineering concepts step by step, at the student's level.
- Solve problems step by step, showing units and reasoning.
- Generate practice questions and explain the answers.
- Suggest project ideas suited to the student's branch and semester.

## 3D visuals

You can render a live, interactive 3D model next to your explanation. Decide when a visual genuinely helps (circuits, semiconductor devices, mechanisms, oscillations,waves/signals, logic). Do NOT write Three.js code. Instead, emit exactly one scene spec early in your reply, wrapped in tags on its own lines:

<scene>{{ ...json... }}</scene>

{_TEMPLATE_DOCS}

## Animation sync

Define animations in the scene spec, then place [[anim:animation-id]] markers inline in your explanation at the exact sentence where that part should animate or light up.Example: "When the base-emitter junction is forward biased, electrons are injected into the base [[anim:electron-flow]] and swept into the collector."Markers are invisible to the student — the model animates as they read that sentence.Only reference animation ids you defined in the scene spec. Use 2-5 markers when a scene is present.

If the student asks to "explain differently", change both your wording/approach AND the scene's "style" (schematic <-> realistic) or its parameters.

If no 3D template fits the topic, simply answer without a scene — never force one.

Formatting: use plain text with minimal markdown (bold, lists). Write math in plain
text (e.g. Vout = -R2/R1 * Vin), not LaTeX.{chr(10) + chr(10) + config.system_prompt_extra if config.system_prompt_extra else ""}"""


SYSTEM_PROMPT = build_system_prompt()

Event = tuple[str, str]


def stream_reply(history: list[dict]) -> Iterator[Event]:
    """Stream Groq's reply for the given message history.

    Converts the history to OpenAI-compatible format (system prompt is sent
    as the first message), then streams the response through StreamParser.

    Yields the StreamParser's (kind, value) events: text / scene_json / anim /
    error. API failures are yielded as ("api_error", message).
    """
    parser = StreamParser()
    try:
        # Groq uses OpenAI-compatible API — system prompt goes into messages
        messages = [{"role": "system", "content": SYSTEM_PROMPT}] + [
            {"role": m["role"], "content": m["content"]} for m in history
        ]

        stream = _get_client().chat.completions.create(
            model=config.model,
            messages=messages,
            max_tokens=config.max_tokens,
            stream=True,
            temperature=0.7,
        )

        for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield from parser.feed(delta)
        yield from parser.flush()

    except Exception as e:
        err_msg = str(e)
        if "authentication" in err_msg.lower() or "api key" in err_msg.lower():
            yield ("api_error", "Invalid or missing GROQ_API_KEY (see .env.example).")
        elif "rate limit" in err_msg.lower() or "429" in err_msg:
            yield ("api_error", "Rate limited by Groq API — please retry shortly.")
        elif "timeout" in err_msg.lower() or "connection" in err_msg.lower():
            yield ("api_error", "Could not reach the Groq API — check your connection.")
        else:
            yield ("api_error", f"Groq API error: {err_msg}")


def parse_scene_json(raw: str) -> dict:
    """Parse the raw text between <scene> tags into a dict (raises ValueError)."""
    return json.loads(raw)
