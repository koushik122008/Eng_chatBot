# ⚡ EngiBuddy

A study-companion chatbot for BTech/engineering students that pairs AI
explanations with **live, interactive 3D models**. Ask about a transistor, a
logic gate, a gear train, an oscillator, or any engineering concept — EngiBuddy
explains it in chat while a rotatable, zoomable 3D model animates **in sync
with the explanation**.

- **Backend:** Python + FastAPI, streaming Groq API (or any OpenAI-compatible LLM)
- **Frontend:** vanilla HTML/CSS/JS, Three.js + GSAP (via CDN), dark/light themes, mobile responsive
- **3D Templates:** 133+ parametric 3D scene templates across 20+ engineering categories
- **Storage:** SQLite (per-session chat history)
- **Config:** `config.yaml` (subject focus, difficulty, Socratic mode, model)

## How it works

The AI model never writes Three.js code. It emits a small, **validated JSON scene
spec** inside `<scene>…</scene>` tags that parameterizes one of 133 pre-built
parametric templates, plus inline `[[anim:id]]` markers that fire animations at
the exact sentence being streamed. The backend strips both from the visible
text, validates the spec against a JSON Schema, and forwards everything to the
browser over Server-Sent Events:

```
Groq/LLM stream ──> stream_parser ──> SSE events ──> frontend
  text deltas         text             text           chat bubble
  <scene>{json}       scene_json       scene          Three.js template render
  [[anim:id]]         anim             anim           GSAP highlight/flow/pulse
```

Invalid scene specs are rejected server-side and reported as an `error` event —
the chat text keeps streaming, so visuals degrade gracefully.

## Setup

Requires Python 3.11+ and a modern browser (WebGL). Tested on Python 3.14.

```bash
pip install -r requirements.txt
cp .env.example .env         # then put your real Groq API key in .env
```

`.env`:

```
GROQ_API_KEY=gsk_your-key-here
```

> Get your free Groq API key at **[console.groq.com/keys](https://console.groq.com/keys)**

## Run

```bash
python -m uvicorn backend.main:app --port 8000
```

Open <http://localhost:8000>.

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
| `model` | Groq/OpenAI-compatible model ID (default `llama-3.3-70b-versatile`) |
| `max_tokens` | per-reply output cap |
| `subject_focus` | e.g. `ECE / VLSI design`, `Mechanical engineering` |
| `branch`, `semester` | used to tailor examples and project ideas |
| `difficulty` | `beginner` \| `intermediate` \| `advanced` |
| `socratic` | `true`: hints first, full solution on request |
| `system_prompt_extra` | free-form text appended to the system prompt |

Restart the server after editing (the system prompt is assembled once at
startup so it stays byte-stable for prompt caching).

## Built-in scene templates (133+ total)

The project includes **133 parametric 3D templates** across 20+ engineering categories:

**Electronics & Devices** — `npn_transistor`, `pnp_transistor`, `mosfet`, `pn_junction`, `zener_diode`, `schottky_diode`, `led`, `photodiode`, `n_jfet`, `p_jfet`, `igbt`, `scr`, `triac`, `opamp`

**Circuits & Systems** — `logic_gate`, `half_adder`, `full_adder`, `mux_2to1`, `mux_4to1`, `sr_flipflop`, `jk_flipflop`, `d_flipflop`, `pll`, `pid_controller`, `feedback_system`, `sample_hold`, `flash_adc`, `r2r_dac`, `mixer`

**Power & Energy** — `buck_converter`, `boost_converter`, `buck_boost`, `flyback`, `h_bridge`, `inverter_3ph`, `charge_pump`, `half_wave_rectifier`, `full_wave_bridge`, `voltage_doubler`, `solar_panel`, `wind_turbine`, `fuel_cell`, `battery_cell`

**Filters & Oscillators** — `rlc_filter`, `rc_lowpass`, `rc_highpass`, `butterworth_lp`, `chebyshev_lp`, `sallen_key_lp`, `active_bpf`, `wien_bridge`, `colpitts`, `hartley`, `crystal`, `ring_oscillator`, `relaxation_osc`

**Amplifiers** — `common_emitter`, `common_base`, `common_collector`, `differential_pair`, `darlington_pair`, `cascode_amplifier`, `push_pull`, `instrumentation_amp`, `multistage_amp`, `tuned_amplifier`

**VLSI & Digital** — `cmos_inverter_layout`, `cmos_nand`, `cmos_nor`, `transmission_gate`, `sram_cell_6t`, `dram_cell_1t`, `pla_block`, `and_gate`, `nand_gate`, `xor_gate`, `schmitt_trigger`

**Mechanical & Aerospace** — `gear_train`, `spring_mass`, `beam_bending`, `column_buckling`, `truss`, `torsion_shaft`, `airfoil`, `propeller`, `jet_engine`, `rocket`, `satellite`, `cnc_mill`, `robot_arm`

**Thermal, Fluids & Chemistry** — `heat_sink`, `heat_exchanger`, `pipe_flow`, `venturi_meter`, `turbine_blade`, `distillation_column`, `chemical_reactor`, `evaporator`, `fermenter`

**Electromagnetics & RF** — `solenoid`, `dc_motor`, `stepper_motor`, `transformer_core`, `dipole_antenna`, `yagi_uda`, `parabolic_dish`, `microstrip_line`, `smith_chart`

**Materials & Optics** — `crystal_lattice`, `stress_strain`, `phase_diagram`, `convex_lens`, `concave_lens`, `prism`, `fiber_optic`, `laser_cavity`, `interferometer`

**Sensors** — `thermocouple`, `piezoelectric`, `strain_gauge`, `accelerometer`, `pressure_sensor`, `thermistor`

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
   the LLM's output and adds the template name to the scene-spec enum), and
   document the template + its targets in `_TEMPLATE_DOCS` in
   `backend/groq_client.py` so the AI knows it exists.

Then add a dummy spec to `frontend/test.html` and eyeball it at `/test.html`
before relying on Claude to drive it.

## Deployment

### Deploy to Render (recommended)

1. Push this repo to GitHub.
2. Go to [dashboard.render.com](https://dashboard.render.com) → **New +** → **Web Service**.
3. Connect your GitHub repo.
4. Render auto-detects the `render.yaml` config. Or manually:
   - **Runtime:** Python
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
5. **Health Check Path:** `/health`
6. **Set Environment Variable:** `GROQ_API_KEY` — paste your key from [console.groq.com](https://console.groq.com/keys).
7. Deploy! The free tier works well for this app.

> 💡 The SQLite database lives on ephemeral storage — sessions are lost on each deploy. For persistent storage, add a managed Postgres database.

### Deploy with Docker

```bash
docker build -t engibuddy .
docker run -e GROQ_API_KEY=gsk_your-key-here -p 8000:8000 engibuddy
```

Opens at <http://localhost:8000>.

## Project structure

```
backend/
  main.py            FastAPI app, serves API + static frontend
  config.py          config.yaml loader
  groq_client.py     Groq/OpenAI-compatible streaming + system prompt (incl. template docs)
  claude_client.py   (shim for compatibility)
  stream_parser.py   incremental <scene>/[[anim:]] parser
  scene_schema.py    scene-spec JSON Schema + 133 per-template param schemas
  db.py              SQLite sessions/messages
  routes/chat.py     SSE chat endpoint + session CRUD
frontend/
  index.html         app shell (split pane: chat | 3D viewer)
  test.html          template test harness (dummy specs, no key needed)
  css/               stylesheets (style, onboarding, typing indicator, component properties)
  js/app.js          chat UI, SSE consumption, 3D sync, sessions, quick actions
  js/viewer.js       renderer, orbit controls, animation engine, hover info, fallbacks
  js/three-scenes/   27 builder modules + registry + electron flow + template metadata (133 templates)
  js/circuit_builder.js   interactive circuit construction mode
  js/oscilloscope.js       real-time waveform visualization
  js/model_gallery.js      browsable gallery of all 3D templates
  js/mini_viewer.js        inline 3D viewer embedded in chat bubbles
config.yaml
requirements.txt
Dockerfile
.dockerignore
render.yaml
.env.example
```
