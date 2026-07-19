# ⚡ EngiBuddy

A study-companion chatbot for BTech/engineering students that pairs Claude
explanations with **live, interactive 3D models**. Ask about a transistor, a
logic gate, a gear train, an oscillator, or a signal — EngiBuddy explains it in
chat while a rotatable, zoomable 3D model animates **in sync with the
explanation**.

- **Backend:** Python + FastAPI, streaming Anthropic Claude API (`claude-sonnet-4-6`)
- **Frontend:** vanilla HTML/CSS/JS, Three.js + GSAP (via CDN), dark mode, mobile responsive
- **Storage:** SQLite (per-session chat history)
- **Config:** `config.yaml` (subject focus, difficulty, Socratic mode, model)

## How it works

Claude never writes Three.js code. It emits a small, **validated JSON scene
spec** inside `<scene>…</scene>` tags that parameterizes one of five pre-built
parametric templates, plus inline `[[anim:id]]` markers that fire animations at
the exact sentence being streamed. The backend strips both from the visible
text, validates the spec against a JSON Schema, and forwards everything to the
browser over Server-Sent Events:

```
Claude stream ──> stream_parser ──> SSE events ──> frontend
  text deltas        text             text           chat bubble
  <scene>{json}      scene_json       scene          Three.js template render
  [[anim:id]]        anim             anim           GSAP highlight/flow/pulse
```

Invalid scene specs are rejected server-side and reported as an `error` event —
the chat text keeps streaming, so visuals degrade gracefully.

## Setup

Requires Python 3.11+ and a modern browser (WebGL). Tested on Python 3.14.

```bash
pip install -r requirements.txt
cp .env.example .env         # then put your real Anthropic API key in .env
```

`.env`:

```
ANTHROPIC_API_KEY=sk-ant-your-key
```

## Run

```bash
python -m uvicorn backend.main:app --port 8000
```

Open <http://localhost:8000>. Try: *"Explain how an NPN transistor works, in 3D."*

- **3D controls:** drag to rotate, scroll/pinch to zoom, click logic-gate
  switches to toggle them.
- **Quick actions:** practice problems, bullet summary, real-world uses,
  "show me in 3D", project ideas, and **"explain differently"** (regenerates the
  explanation and swaps the scene style schematic ↔ realistic).
- **Mobile:** the 3D pane becomes a slide-up drawer; sessions sidebar collapses
  behind the ☰ button.
- **Performance:** pixel ratio capping, low-poly geometry on weak devices
  (auto-detected, or toggle with the "⚙ quality" button); static fallback text
  if WebGL is unavailable.

### 3D template test harness (no API key needed)

<http://localhost:8000/test.html> renders every template from hardcoded dummy
scene specs, with buttons to fire each animation. Use it when developing
templates.

### Tests

```bash
python -m backend.test_stream_parser   # incremental tag-parser unit tests
python -m backend.test_chat_route      # full route/SSE pipeline with a mocked Claude stream
```

Live smoke test of the real Claude call (needs a valid key in `.env`):

```bash
curl -N -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Briefly explain an NPN transistor and show me in 3D."}'
```

You should see `session`, `text`, one `scene`, several `anim`, then `done` events.

## Configuration (`config.yaml`)

| key | meaning |
|---|---|
| `model` | Anthropic model ID (default `claude-sonnet-4-6`) |
| `max_tokens` | per-reply output cap |
| `subject_focus` | e.g. `ECE / VLSI design`, `Mechanical engineering` |
| `branch`, `semester` | used to tailor examples and project ideas |
| `difficulty` | `beginner` \| `intermediate` \| `advanced` |
| `socratic` | `true`: hints first, full solution on request |
| `system_prompt_extra` | free-form text appended to the system prompt |

Restart the server after editing (the system prompt is assembled once at
startup so it stays byte-stable for Anthropic prompt caching).

## Built-in scene templates

| template | shows | key params | animation targets |
|---|---|---|---|
| `npn_transistor` | NPN/PN-junction cross-section | `bias`, `showDepletionRegion` | `emitter` `base` `collector` `depletion` `electrons` `holes` |
| `logic_gate` | clickable gate + output lamp | `gate`, `inputs` | `gate` `inputA` `inputB` `output` |
| `gear_train` | 2–4 meshed gears / ratios | `gears[{teeth}]`, `rpm` | `gear0…gearN` |
| `spring_mass` | oscillator with real physics | `mass`, `k`, `damping`, `initialDisplacement` | `mass` `spring` `equilibrium` |
| `wave` | waveforms + superposition | `mode`, `waves[{type,freq,amp,phase}]` | `wave0…wave2` `sum` `source` |

## Adding a new 3D scene template

Three files to touch — the shape of the change is always the same:

1. **Frontend module** — create `frontend/js/three-scenes/my_template.js`:

   ```js
   import { stdMat, makeFlow } from './common.js';

   export function build({ THREE, style, params, quality }) {
     const group = new THREE.Group();
     // ...build meshes; use quality === 'low' to reduce segments...
     return {
       group,
       targets: {
         // name -> { objects: [Object3D], flow?: makeFlow(...), custom?: {...} }
         rotor: { objects: [rotorMesh] },
       },
       tick(dt, t) { /* per-frame motion */ },
       onClick(obj) { /* optional interactivity */ },
     };
   }
   ```

   - `targets` names are what scene-spec `animations[].target` and `labels[].id`
     refer to. Generic animation types (`highlight`, `pulse`, `rotate`,
     `oscillate`) work on any target with `objects`; `flow` needs a
     `makeFlow(...)` particle stream; `custom.<type> = (anim) => ({start, stop})`
     overrides any type per-target.

2. **Register it** — add the import + entry in
   `frontend/js/three-scenes/registry.js`.

3. **Backend schema + prompt** — add a params schema under
   `TEMPLATE_PARAM_SCHEMAS` in `backend/scene_schema.py` (this both validates
   Claude's output and adds the template name to the scene-spec enum), and
   document the template + its targets in `_TEMPLATE_DOCS` in
   `backend/claude_client.py` so Claude knows it exists.

Then add a dummy spec to `frontend/test.html` and eyeball it at `/test.html`
before relying on Claude to drive it.

## Project structure

```
backend/
  main.py            FastAPI app, serves API + static frontend
  config.py          config.yaml loader
  claude_client.py   Anthropic streaming + system prompt (incl. template docs)
  stream_parser.py   incremental <scene>/[[anim:]] parser
  scene_schema.py    scene-spec JSON Schema + per-template param schemas
  db.py              SQLite sessions/messages
  routes/chat.py     SSE chat endpoint + session CRUD
frontend/
  index.html         app shell (split pane: chat | 3D)
  test.html          template test harness (dummy specs, no key needed)
  css/style.css      dark theme, responsive
  js/app.js          chat UI, SSE consumption, 3D sync, sessions, quick actions
  js/viewer.js       renderer, orbit controls, animation engine, fallbacks
  js/three-scenes/   parametric template library + registry
config.yaml
requirements.txt
.env.example
```
