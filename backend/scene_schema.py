"""Scene-spec JSON Schema and validation.

Claude emits a <scene>{...}</scene> block; this module validates it before it
is forwarded to the frontend. The top-level shape is fixed; `params` is
validated per-template via TEMPLATE_PARAM_SCHEMAS, which mirrors the frontend
template registry in frontend/js/three-scenes/registry.js.
"""
import jsonschema

def _category_schema(modes: list[str]) -> dict:
    """Build a param schema for category-based templates that share a builder."""
    return {
        "type": "object",
        "properties": {
            "type": {"type": "string", "enum": modes},
            "showLabels": {"type": "boolean"},
        },
        "additionalProperties": False,
    }


# Per-template parameter schemas. Keep in sync with the frontend registry.
TEMPLATE_PARAM_SCHEMAS: dict[str, dict] = {
    "npn_transistor": {
        "type": "object",
        "properties": {
            "bias": {"type": "string", "enum": ["cutoff", "active", "saturation"]},
            "showDepletionRegion": {"type": "boolean"},
        },
        "additionalProperties": False,
    },
    "logic_gate": {
        "type": "object",
        "properties": {
            "gate": {"type": "string", "enum": ["AND", "OR", "NOT", "NAND", "NOR", "XOR"]},
            "inputs": {
                "type": "array",
                "items": {"type": "integer", "enum": [0, 1]},
                "minItems": 1,
                "maxItems": 2,
            },
        },
        "additionalProperties": False,
    },
    "gear_train": {
        "type": "object",
        "properties": {
            "gears": {
                "type": "array",
                "minItems": 2,
                "maxItems": 4,
                "items": {
                    "type": "object",
                    "properties": {
                        "teeth": {"type": "integer", "minimum": 6, "maximum": 60},
                    },
                    "required": ["teeth"],
                    "additionalProperties": False,
                },
            },
            "rpm": {"type": "number", "minimum": 1, "maximum": 120},
        },
        "additionalProperties": False,
    },
    "spring_mass": {
        "type": "object",
        "properties": {
            "mass": {"type": "number", "minimum": 0.1, "maximum": 100},
            "k": {"type": "number", "minimum": 0.1, "maximum": 1000},
            "damping": {"type": "number", "minimum": 0, "maximum": 10},
            "initialDisplacement": {"type": "number", "minimum": -2, "maximum": 2},
        },
        "additionalProperties": False,
    },
    "wave": {
        "type": "object",
        "properties": {
            "mode": {"type": "string", "enum": ["time", "superposition"]},
            "waves": {
                "type": "array",
                "minItems": 1,
                "maxItems": 3,
                "items": {
                    "type": "object",
                    "properties": {
                        "type": {"type": "string", "enum": ["sine", "square", "triangle", "sawtooth"]},
                        "freq": {"type": "number", "minimum": 0.1, "maximum": 10},
                        "amp": {"type": "number", "minimum": 0.1, "maximum": 2},
                        "phase": {"type": "number", "minimum": -3.1416, "maximum": 3.1416},
                    },
                    "required": ["type", "freq", "amp"],
                    "additionalProperties": False,
                },
            },
        },
        "additionalProperties": False,
    },
    "mosfet": {
        "type": "object",
        "properties": {
            "type": {"type": "string", "enum": ["nmos", "pmos", "cmos_inverter"]},
            "vgs": {"type": "number", "minimum": 0, "maximum": 5},
            "vds": {"type": "number", "minimum": 0, "maximum": 5},
        },
        "additionalProperties": False,
    },
    "opamp": {
        "type": "object",
        "properties": {
            "config": {"type": "string", "enum": ["inverting", "noninverting", "integrator"]},
            "r1": {"type": "number", "minimum": 1, "maximum": 10000},
            "r2": {"type": "number", "minimum": 1, "maximum": 10000},
            "inputVoltage": {"type": "number", "minimum": -10, "maximum": 10},
        },
        "additionalProperties": False,
    },
    "rlc_filter": {
        "type": "object",
        "properties": {
            "type": {"type": "string", "enum": ["series_rlc", "parallel_rlc", "lowpass", "highpass"]},
            "r": {"type": "number", "minimum": 1, "maximum": 10000},
            "l": {"type": "number", "minimum": 0.1, "maximum": 1000},
            "c": {"type": "number", "minimum": 0.01, "maximum": 10000},
            "frequency": {"type": "number", "minimum": 1, "maximum": 100000},
        },
        "additionalProperties": False,
    },

    # ===== SEMICONDUCTOR DEVICES =====
    "pn_junction": _category_schema(["forward_biased", "reverse_biased", "breakdown"]),
    "zener_diode": _category_schema(["forward", "reverse", "breakdown"]),
    "schottky_diode": _category_schema(["forward", "reverse"]),
    "led": _category_schema(["off", "on", "pulsed"]),
    "photodiode": _category_schema(["dark", "illuminated"]),
    "pnp_transistor": _category_schema(["cutoff", "active", "saturation"]),
    "n_jfet": _category_schema(["cutoff", "ohmic", "saturation"]),
    "p_jfet": _category_schema(["cutoff", "ohmic", "saturation"]),
    "igbt": _category_schema(["off", "on"]),
    "scr": _category_schema(["blocking", "conducting"]),
    "triac": _category_schema(["off", "on"]),

    # ===== RECTIFIERS =====
    "half_wave_rectifier": _category_schema(["unfiltered", "filtered"]),
    "full_wave_ct_rectifier": _category_schema(["unfiltered", "filtered"]),
    "full_wave_bridge": _category_schema(["unfiltered", "filtered"]),
    "precision_rectifier": _category_schema(["positive", "negative", "full"]),
    "voltage_doubler": _category_schema(["half_wave", "full_wave"]),
    "three_phase_rectifier": _category_schema(["unfiltered", "filtered"]),

    # ===== AMPLIFIERS =====
    "common_emitter": _category_schema(["no_bias", "biased", "loaded"]),
    "common_base": _category_schema(["biased", "loaded"]),
    "common_collector": _category_schema(["biased", "loaded"]),
    "differential_pair": _category_schema(["balanced", "unbalanced"]),
    "darlington_pair": _category_schema(["small_signal", "power"]),
    "cascode_amplifier": _category_schema(["biased", "loaded"]),
    "push_pull": _category_schema(["class_a", "class_ab", "class_b"]),
    "instrumentation_amp": _category_schema(["unity", "gain10", "gain100"]),
    "transconductance_amp": _category_schema(["low_gm", "high_gm"]),
    "multistage_amp": _category_schema(["two_stage", "three_stage"]),
    "tuned_amplifier": _category_schema(["single_tuned", "double_tuned"]),

    # ===== FILTERS =====
    "rc_lowpass": _category_schema(["first_order", "second_order"]),
    "rc_highpass": _category_schema(["first_order", "second_order"]),
    "rlc_bandpass": _category_schema(["narrow", "wide"]),
    "rlc_bandstop": _category_schema(["narrow", "wide"]),
    "butterworth_lp": _category_schema(["order2", "order4"]),
    "butterworth_hp": _category_schema(["order2", "order4"]),
    "chebyshev_lp": _category_schema(["order2", "order4"]),
    "sallen_key_lp": _category_schema(["q0_5", "q1", "q2"]),
    "sallen_key_hp": _category_schema(["q0_5", "q1", "q2"]),
    "active_bpf": _category_schema(["narrow", "wide"]),

    # ===== OSCILLATORS =====
    "rc_phase_shift": _category_schema(["three_stage", "four_stage"]),
    "wien_bridge": _category_schema(["low_freq", "high_freq"]),
    "colpitts": _category_schema(["common_base", "common_emitter"]),
    "hartley": _category_schema(["series_fed", "shunt_fed"]),
    "crystal": _category_schema(["series", "parallel"]),
    "ring_oscillator": _category_schema(["stage3", "stage5", "stage7"]),
    "relaxation_osc": _category_schema(["square", "triangle", "sawtooth"]),
    "astable_multivibrator": _category_schema(["symmetric", "asymmetric"]),
    "lc_oscillator": _category_schema(["tuned_collector", "tuned_base"]),
    "vco_block": _category_schema(["low", "mid", "high"]),

    # ===== DIGITAL GATES =====
    "and_gate": _category_schema(["cmos", "ttl"]),
    "or_gate": _category_schema(["cmos", "ttl"]),
    "not_gate": _category_schema(["cmos", "ttl"]),
    "nand_gate": _category_schema(["cmos", "ttl"]),
    "nor_gate": _category_schema(["cmos", "ttl"]),
    "xor_gate": _category_schema(["cmos", "ttl"]),
    "xnor_gate": _category_schema(["cmos", "ttl"]),
    "buffer_gate": _category_schema(["cmos", "ttl"]),
    "tri_state": _category_schema(["enabled", "disabled_high_z"]),
    "schmitt_trigger": _category_schema(["inverting", "non_inverting"]),

    # ===== DIGITAL CIRCUITS =====
    "half_adder": _category_schema(["0plus0", "0plus1", "1plus0", "1plus1"]),
    "full_adder": _category_schema(["000", "001", "010", "011", "100", "101", "110", "111"]),
    "half_subtractor": _category_schema(["0minus0", "1minus0", "1minus1", "0minus1"]),
    "full_subtractor": _category_schema(["000", "001", "010", "011", "100", "101", "110", "111"]),
    "mux_2to1": _category_schema(["sel0", "sel1"]),
    "mux_4to1": _category_schema(["sel00", "sel01", "sel10", "sel11"]),
    "demux_1to4": _category_schema(["sel00", "sel01", "sel10", "sel11"]),
    "decoder_3to8": _category_schema(["in000", "in001", "in010", "in100"]),
    "encoder_8to3": _category_schema(["in0", "in1", "in2", "in4"]),
    "sr_flipflop": _category_schema(["hold", "set", "reset"]),
    "jk_flipflop": _category_schema(["hold", "set", "reset", "toggle"]),
    "d_flipflop": _category_schema(["d0", "d1"]),

    # ===== VLSI =====
    "cmos_inverter_layout": _category_schema(["in0", "in1"]),
    "cmos_nand": _category_schema(["00", "01", "10", "11"]),
    "cmos_nor": _category_schema(["00", "01", "10", "11"]),
    "cmos_and": _category_schema(["00", "01", "10", "11"]),
    "cmos_or": _category_schema(["00", "01", "10", "11"]),
    "transmission_gate": _category_schema(["open", "closed"]),
    "pass_transistor": _category_schema(["on", "off"]),
    "sram_cell_6t": _category_schema(["hold_0", "hold_1", "read", "write"]),
    "dram_cell_1t": _category_schema(["hold", "read", "write"]),
    "pla_block": _category_schema(["and_plane", "or_plane", "full"]),

    # ===== POWER ELECTRONICS =====
    "buck_converter": _category_schema(["continuous", "discontinuous"]),
    "boost_converter": _category_schema(["continuous", "discontinuous"]),
    "buck_boost": _category_schema(["continuous", "discontinuous"]),
    "flyback": _category_schema(["continuous", "discontinuous"]),
    "forward_converter": _category_schema(["continuous", "discontinuous"]),
    "h_bridge": _category_schema(["forward", "reverse", "brake", "coast"]),
    "inverter_3ph": _category_schema(["spwm", "square"]),
    "cuk_converter": _category_schema(["continuous", "discontinuous"]),
    "sepic": _category_schema(["continuous", "discontinuous"]),
    "charge_pump": _category_schema(["doubler", "inverter", "regulator"]),

    # ===== SIGNAL / CONTROL =====
    "pll": _category_schema(["unlocked", "locked", "tracking"]),
    "pid_controller": _category_schema(["p_only", "pi", "pid"]),
    "feedback_system": _category_schema(["open_loop", "closed_loop", "negative_fb"]),
    "sample_hold": _category_schema(["sample", "hold"]),
    "flash_adc": _category_schema(["2bit", "3bit"]),
    "r2r_dac": _category_schema(["4bit", "8bit"]),
    "mixer": _category_schema(["upconverter", "downconverter"]),
    # ===== NEW CATEGORIES =====
    "solenoid": _category_schema(["default"]),
    "stepper_motor": _category_schema(["default"]),
    "inductor_core": _category_schema(["default"]),
    "dipole_antenna": _category_schema(["default"]),
    "yagi_uda": _category_schema(["default"]),
    "heat_sink": _category_schema(["default"]),
    "venturi_meter": _category_schema(["default"]),
    "turbine_blade": _category_schema(["default"]),
    "beam_bending": _category_schema(["default"]),
    "column_buckling": _category_schema(["default"]),
    "retaining_wall": _category_schema(["default"]),
    "thermocouple": _category_schema(["default"]),
    "accelerometer": _category_schema(["default"]),
    "thermistor": _category_schema(["default"]),
    "microstrip_line": _category_schema(["default"]),
    "smith_chart": _category_schema(["default"]),
    "crystal_lattice": _category_schema(["default"]),
    "dislocation": _category_schema(["default"]),
    "distillation_column": _category_schema(["default"]),
    "evaporator": _category_schema(["default"]),
    "solar_panel": _category_schema(["default"]),
    "battery_cell": _category_schema(["default"]),
    "convex_lens": _category_schema(["default"]),
    "laser_cavity": _category_schema(["default"]),
    "cnc_mill": _category_schema(["default"]),
    "robot_arm": _category_schema(["default"]),
    "airfoil": _category_schema(["default"]),
    "propeller": _category_schema(["default"]),
}

ANIMATION_TYPES = ["flow", "pulse", "highlight", "rotate", "oscillate", "toggle"]

SCENE_SCHEMA: dict = {
    "type": "object",
    "properties": {
        "v": {"type": "integer", "enum": [1]},
        "template": {"type": "string", "enum": sorted(TEMPLATE_PARAM_SCHEMAS)},
        "title": {"type": "string", "maxLength": 120},
        "style": {"type": "string", "enum": ["schematic", "realistic"]},
        "params": {"type": "object"},
        "labels": {
            "type": "array",
            "maxItems": 12,
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "text": {"type": "string", "maxLength": 60},
                },
                "required": ["id", "text"],
                "additionalProperties": False,
            },
        },
        "animations": {
            "type": "array",
            "maxItems": 10,
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "target": {"type": "string"},
                    "type": {"type": "string", "enum": ANIMATION_TYPES},
                    "loop": {"type": "boolean"},
                    "speed": {"type": "number", "minimum": 0.1, "maximum": 5},
                },
                "required": ["id", "type"],
                "additionalProperties": False,
            },
        },
        "camera": {
            "type": "object",
            "properties": {
                "orbit": {
                    "type": "array",
                    "items": {"type": "number"},
                    "minItems": 2,
                    "maxItems": 2,
                },
                "zoom": {"type": "number", "minimum": 0.3, "maximum": 3},
            },
            "additionalProperties": False,
        },
        "autoplay": {"type": "array", "items": {"type": "string"}, "maxItems": 10},
    },
    "required": ["template", "title"],
    "additionalProperties": False,
}


class SceneValidationError(ValueError):
    pass


def validate_scene(spec: dict) -> dict:
    """Validate a scene spec; returns it (with defaults filled) or raises."""
    try:
        jsonschema.validate(spec, SCENE_SCHEMA)
        params_schema = TEMPLATE_PARAM_SCHEMAS[spec["template"]]
        jsonschema.validate(spec.get("params", {}), params_schema)
    except jsonschema.ValidationError as e:
        raise SceneValidationError(f"invalid scene spec: {e.message}") from e

    spec.setdefault("v", 1)
    spec.setdefault("style", "schematic")
    spec.setdefault("params", {})
    spec.setdefault("labels", [])
    spec.setdefault("animations", [])
    spec.setdefault("autoplay", [])
    return spec
