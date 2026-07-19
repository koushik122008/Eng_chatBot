"""Anthropic Claude integration: system-prompt assembly + streaming chat.

The system prompt is assembled once from config.yaml and kept byte-stable so
the `cache_control` breakpoint on it gets prompt-cache hits across requests.
"""
import json
from collections.abc import Iterator

import anthropic

from backend.config import config
from backend.stream_parser import StreamParser

client = anthropic.Anthropic()

# Keep this description in sync with backend/scene_schema.py and
# frontend/js/three-scenes/registry.js.
_TEMPLATE_DOCS = """
Available 3D scene templates and their params:

1. "npn_transistor" — NPN transistor / PN junction cross-section.
   params: {"bias": "cutoff"|"active"|"saturation", "showDepletionRegion": bool}
   Useful animation targets: "electrons" (electron flow emitter->collector),
   "holes" (base current), "depletion" (depletion region), "base"|"emitter"|"collector".

2. "logic_gate" — a logic gate with clickable input switches and an output lamp.
   params: {"gate": "AND"|"OR"|"NOT"|"NAND"|"NOR"|"XOR", "inputs": [0|1, ...]}
   (1 input for NOT, 2 otherwise). Targets: "inputA", "inputB", "output", "gate".

3. "gear_train" — 2 to 4 meshed spur gears showing gear ratios.
   params: {"gears": [{"teeth": int 6..60}, ...] (2-4 gears), "rpm": number 1..120}
   Targets: "gear0", "gear1", ... (driver is gear0).

4. "spring_mass" — vertical spring-mass(-damper) oscillator.
   params: {"mass": 0.1..100, "k": 0.1..1000, "damping": 0..10, "initialDisplacement": -2..2}
   Targets: "mass", "spring", "equilibrium".

5. "wave" — waveform display (one to three components and their sum).
   params: {"mode": "time"|"superposition",
            "waves": [{"type": "sine"|"square"|"triangle"|"sawtooth",
                       "freq": 0.1..10, "amp": 0.1..2, "phase": -pi..pi}, ...]}
   Targets: "wave0", "wave1", "wave2", "sum", "source" (toggle on "source" freezes time).

Scene spec JSON shape (all fields except template/title optional):
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

Student context: subject focus is {config.subject_focus}; branch: {config.branch}; \
semester {config.semester}; default difficulty: {config.difficulty}.

{socratic}

Core abilities:
- Explain engineering concepts step by step, at the student's level.
- Solve problems step by step, showing units and reasoning.
- Generate practice questions and explain the answers.
- Suggest project ideas suited to the student's branch and semester.

## 3D visuals

You can render a live, interactive 3D model next to your explanation. Decide when a
visual genuinely helps (circuits, semiconductor devices, mechanisms, oscillations,
waves/signals, logic). Do NOT write Three.js code. Instead, emit exactly one scene
spec early in your reply, wrapped in tags on its own lines:

<scene>{{ ...json... }}</scene>

{_TEMPLATE_DOCS}

## Animation sync

Define animations in the scene spec, then place [[anim:animation-id]] markers inline
in your explanation at the exact sentence where that part should animate or light up.
Example: "When the base-emitter junction is forward biased, electrons are injected
into the base [[anim:electron-flow]] and swept into the collector."
Markers are invisible to the student — the model animates as they read that sentence.
Only reference animation ids you defined in the scene spec. Use 2-5 markers when a
scene is present.

If the student asks to "explain differently", change both your wording/approach AND
the scene's "style" (schematic <-> realistic) or its parameters.

If no 3D template fits the topic, simply answer without a scene — never force one.

Formatting: use plain text with minimal markdown (bold, lists). Write math in plain
text (e.g. Vout = -R2/R1 * Vin), not LaTeX.{chr(10) + chr(10) + config.system_prompt_extra if config.system_prompt_extra else ""}"""


SYSTEM_PROMPT = build_system_prompt()

Event = tuple[str, str]


def stream_reply(history: list[dict]) -> Iterator[Event]:
    """Stream Claude's reply for the given message history.

    Yields the StreamParser's (kind, value) events: text / scene_json / anim /
    error. API failures are yielded as ("api_error", message).
    """
    parser = StreamParser()
    try:
        with client.messages.stream(
            model=config.model,
            max_tokens=config.max_tokens,
            system=[
                {
                    "type": "text",
                    "text": SYSTEM_PROMPT,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=history,
        ) as stream:
            for delta in stream.text_stream:
                yield from parser.feed(delta)
        yield from parser.flush()
    except anthropic.AuthenticationError:
        yield ("api_error", "Invalid or missing ANTHROPIC_API_KEY (see .env.example).")
    except anthropic.RateLimitError:
        yield ("api_error", "Rate limited by the Anthropic API — please retry shortly.")
    except anthropic.APIStatusError as e:
        yield ("api_error", f"Anthropic API error ({e.status_code}).")
    except anthropic.APIConnectionError:
        yield ("api_error", "Could not reach the Anthropic API — check your connection.")


def parse_scene_json(raw: str) -> dict:
    """Parse the raw text between <scene> tags into a dict (raises ValueError)."""
    return json.loads(raw)
