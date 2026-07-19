"""Scene-spec JSON Schema and validation.

Claude emits a <scene>{...}</scene> block; this module validates it before it
is forwarded to the frontend. The top-level shape is fixed; `params` is
validated per-template via TEMPLATE_PARAM_SCHEMAS, which mirrors the frontend
template registry in frontend/js/three-scenes/registry.js.
"""
import jsonschema

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
