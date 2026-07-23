// Virtual Oscilloscope for EngiBuddy Circuit Builder
// Renders voltage-vs-time traces from transient simulation on a CRT-style canvas.

const TRACE_COLORS = ['#ffff0055', '#00ffff', '#ff00ff', '#00ff80', '#ff8000', '#8080ff'];

export class Oscilloscope {
  /**
   * @param {import('./circuit_builder.js').CircuitBuilder} builder
   */
  constructor(builder) {
    this.builder = builder;
    this.visible = false;
    this.running = false;
    this.data = null;              // result from transient()
    this.selectedNodes = [];       // node IDs being displayed
    this.timeDiv = 0.001;          // seconds per division (1 ms)
    this.voltDiv = 2;              // volts per division
    this.triggerMode = 'auto';     // 'auto', 'normal', 'single'

    // DOM
    this._panel = null;
    this._canvas = null;
    this._ctx = null;
    this._traceCheckboxes = [];    // checkbox elements per trace
    this._infoEl = null;
    this._animId = null;
  }

  /* ---- Open / Close ---- */

  show() {
    if (this.visible) return;
    this.visible = true;
    this._buildUI();
    this._panel.style.display = 'flex';
    this.run();
  }

  hide() {
    if (!this.visible) return;
    this.visible = false;
    this._stopAnim();
    if (this._panel) this._panel.style.display = 'none';
  }

  toggle() {
    if (this.visible) this.hide();
    else this.show();
  }

  /* ---- Run / Stop ---- */

  run() {
    if (this.running) return;
    this.running = true;

    // Run transient simulation
    const engine = this.builder.simEngine;
    const result = engine.transient(0.01, 1e-6);
    this.data = result;

    // Auto-select up to 4 non-grounded nodes
    const groundNode = this.builder.components.find(c => c.type === 'ground')?.nodeA;
    const candidates = result.nodeIds.filter(n => n !== groundNode);
    this.selectedNodes = candidates.slice(0, 4);

    this._updateTraceCheckboxes();
    this._draw();
  }

  stop() {
    this.running = false;
    this._stopAnim();
  }

  /* ---- UI Construction ---- */

  _buildUI() {
    if (this._panel) return;

    const panel = document.createElement('div');
    panel.className = 'oscope-panel';
    panel.style.display = 'none';

    // ----- Header -----
    const header = document.createElement('div');
    header.className = 'oscope-header';

    const title = document.createElement('span');
    title.textContent = '📊 Virtual Oscilloscope';
    header.appendChild(title);

    const controls = document.createElement('div');
    controls.className = 'oscope-header-controls';

    const runBtn = document.createElement('button');
    runBtn.className = 'oscope-btn oscope-btn-run';
    runBtn.textContent = '⏵ Run';
    runBtn.title = 'Run transient simulation';
    runBtn.onclick = () => this.run();
    controls.appendChild(runBtn);

    const stopBtn = document.createElement('button');
    stopBtn.className = 'oscope-btn';
    stopBtn.textContent = '⏹ Stop';
    stopBtn.title = 'Stop';
    stopBtn.onclick = () => this.stop();
    controls.appendChild(stopBtn);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'oscope-btn oscope-btn-close';
    closeBtn.textContent = '✕';
    closeBtn.title = 'Close oscilloscope';
    closeBtn.onclick = () => this.hide();
    controls.appendChild(closeBtn);

    header.appendChild(controls);
    panel.appendChild(header);

    // ----- Canvas area -----
    const canvasWrap = document.createElement('div');
    canvasWrap.className = 'oscope-canvas-wrap';

    this._canvas = document.createElement('canvas');
    this._canvas.className = 'oscope-canvas';
    canvasWrap.appendChild(this._canvas);
    panel.appendChild(canvasWrap);

    // ----- Trace selector -----
    const traceBar = document.createElement('div');
    traceBar.className = 'oscope-trace-bar';
    traceBar.id = 'oscope-trace-bar';
    this._traceBar = traceBar;
    panel.appendChild(traceBar);

    // ----- Controls row -----
    const knobRow = document.createElement('div');
    knobRow.className = 'oscope-knob-row';

    // Time/div
    const tDiv = document.createElement('label');
    tDiv.className = 'oscope-knob-group';
    tDiv.innerHTML = `<span class="oscope-knob-label">Time/div</span>
      <input type="range" class="oscope-knob" min="-5" max="-1" step="0.1" value="-3"
             data-prop="timeDiv">`;
    tDiv.querySelector('input').oninput = (e) => {
      const val = Math.pow(10, parseFloat(e.target.value));
      this.timeDiv = val;
      this._draw();
    };
    knobRow.appendChild(tDiv);

    // Volts/div
    const vDiv = document.createElement('label');
    vDiv.className = 'oscope-knob-group';
    vDiv.innerHTML = `<span class="oscope-knob-label">Volts/div</span>
      <input type="range" class="oscope-knob" min="0" max="2.5" step="0.1" value="1"
             data-prop="voltDiv">`;
    vDiv.querySelector('input').oninput = (e) => {
      this.voltDiv = Math.pow(10, parseFloat(e.target.value) - 1);
      this._draw();
    };
    knobRow.appendChild(vDiv);

    // Trigger mode
    const trigDiv = document.createElement('select');
    trigDiv.className = 'oscope-trigger-select';
    ['auto', 'normal', 'single'].forEach(m => {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = `Trig: ${m}`;
      if (m === this.triggerMode) opt.selected = true;
      trigDiv.appendChild(opt);
    });
    trigDiv.onchange = (e) => {
      this.triggerMode = e.target.value;
      this._draw();
    };
    knobRow.appendChild(trigDiv);

    // Info display
    this._infoEl = document.createElement('div');
    this._infoEl.className = 'oscope-info';
    this._infoEl.textContent = 'Run to capture waveforms';
    knobRow.appendChild(this._infoEl);

    panel.appendChild(knobRow);

    // Append to viewer container
    const viewer = this.builder.viewer;
    viewer.container.appendChild(panel);
    this._panel = panel;
    this._ctx = this._canvas.getContext('2d');

    // Resize observer
    this._resizeObserver = new ResizeObserver(() => this._resizeCanvas());
    this._resizeObserver.observe(canvasWrap);
    this._resizeCanvas();

    // Keyboard: Esc to close
    this._onKey = (e) => {
      if (e.key === 'Escape' && this.visible) this.hide();
    };
    document.addEventListener('keydown', this._onKey);

    // Redraw on control changes only (no continuous rAF loop for static data)
    this._redrawNeeded = false;
    this._scheduleDraw = () => {
      if (!this._redrawNeeded && this.visible) {
        this._redrawNeeded = true;
        requestAnimationFrame(() => {
          if (this._redrawNeeded) {
            this._redrawNeeded = false;
            this._draw();
          }
        });
      }
    };

    // Wire all controls to trigger redraw via the debounced scheduler
    const allInputs = panel.querySelectorAll('input, select');
    allInputs.forEach(el => {
      el.addEventListener('input', () => this._scheduleDraw());
      el.addEventListener('change', () => this._scheduleDraw());
    });
  }

  _resizeCanvas() {
    if (!this._canvas) return;
    const wrap = this._canvas.parentElement;
    const rect = wrap.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio, 2);
    this._canvas.width = rect.width * dpr;
    this._canvas.height = rect.height * dpr;
    this._canvas.style.width = rect.width + 'px';
    this._canvas.style.height = rect.height + 'px';
    this._ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.data) this._draw();
  }

  _updateTraceCheckboxes() {
    if (!this._traceBar) return;
    this._traceBar.innerHTML = '';

    if (!this.data || this.data.nodeIds.length === 0) {
      this._traceBar.textContent = 'No nodes to probe. Build a circuit first.';
      return;
    }

    const groundNode = this.builder.components.find(c => c.type === 'ground')?.nodeA;
    const label = document.createElement('span');
    label.className = 'oscope-trace-label';
    label.textContent = 'Probes:';
    this._traceBar.appendChild(label);

    this._traceCheckboxes = [];
    for (const nid of this.data.nodeIds) {
      if (nid === groundNode) continue;
      const chk = document.createElement('label');
      chk.className = 'oscope-trace-chk';
      const idx = this._traceCheckboxes.length;
      const color = TRACE_COLORS[idx % TRACE_COLORS.length];
      const isSelected = this.selectedNodes.includes(nid);

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = isSelected;
      cb.dataset.nodeId = nid;
      cb.onchange = () => {
        if (cb.checked) {
          if (!this.selectedNodes.includes(nid)) this.selectedNodes.push(nid);
        } else {
          this.selectedNodes = this.selectedNodes.filter(n => n !== nid);
        }
        // Keep max 4
        if (this.selectedNodes.length > 4) {
          this.selectedNodes = this.selectedNodes.slice(0, 4);
          // Uncheck extra
          this._traceCheckboxes.forEach((c, i) => {
            if (i >= 4) c.querySelector('input').checked = false;
          });
        }
        this._draw();
      };

      const dot = document.createElement('span');
      dot.className = 'oscope-trace-dot';
      dot.style.background = color;
      chk.appendChild(dot);
      chk.appendChild(cb);
      chk.appendChild(document.createTextNode(` N${nid}`));

      this._traceBar.appendChild(chk);
      this._traceCheckboxes.push(chk);
    }
  }

  /* ---- Animation Loop ---- */

  _startAnim() {
    // No-op for static traces; redraws triggered on control changes + resize
  }

  _stopAnim() {
    // No-op since we don't use continuous rAF
  }

  /* ---- Drawing ---- */

  _draw() {
    const ctx = this._ctx;
    if (!ctx || !this._canvas) return;
    const w = this._canvas.width / (Math.min(window.devicePixelRatio, 2));
    const h = this._canvas.height / (Math.min(window.devicePixelRatio, 2));
    if (w < 10 || h < 10) return;

    // --- Clear / background ---
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, w, h);

    // --- Grid ---
    const cols = 10;  // 10 horizontal divisions
    const rows = 8;   // 8 vertical divisions
    const margin = { top: 12, bottom: 16, left: 32, right: 16 };
    const plotW = w - margin.left - margin.right;
    const plotH = h - margin.top - margin.bottom;
    const cellW = plotW / cols;
    const cellH = plotH / rows;

    ctx.strokeStyle = 'rgba(30, 50, 80, 0.5)';
    ctx.lineWidth = 0.5;

    // Minor grid
    for (let i = 0; i <= cols; i++) {
      const x = margin.left + i * cellW;
      ctx.beginPath();
      ctx.moveTo(x, margin.top);
      ctx.lineTo(x, margin.top + plotH);
      ctx.stroke();
    }
    for (let j = 0; j <= rows; j++) {
      const y = margin.top + j * cellH;
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(margin.left + plotW, y);
      ctx.stroke();
    }

    // Center lines (highlighted)
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top + plotH / 2);
    ctx.lineTo(margin.left + plotW, margin.top + plotH / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(margin.left + plotW / 2, margin.top);
    ctx.lineTo(margin.left + plotW / 2, margin.top + plotH);
    ctx.stroke();

    // --- Axis labels ---
    ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
    ctx.font = '9px ui-monospace, monospace';
    ctx.textAlign = 'center';

    // Time labels (X axis)
    const timeRange = this.timeDiv * cols;
    for (let i = 0; i <= cols; i++) {
      const t = (i / cols) * timeRange;
      const x = margin.left + i * cellW;
      ctx.fillText(this._fmtTime(t), x, margin.top + plotH + 10);
    }

    // Voltage labels (Y axis)
    ctx.textAlign = 'right';
    const voltRange = this.voltDiv * (rows / 2);
    for (let j = 0; j <= rows; j++) {
      const v = voltRange - (j / rows) * voltRange * 2;
      const y = margin.top + j * cellH;
      ctx.fillText(v.toFixed(1), margin.left - 4, y + 3);
    }

    // Unit labels
    ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
    ctx.textAlign = 'left';
    ctx.fillText('s', margin.left + plotW + 2, margin.top + plotH + 10);
    ctx.textAlign = 'right';
    ctx.fillText('V', margin.left - 2, margin.top - 2);

    if (!this.data || this.data.samples < 2) {
      ctx.fillStyle = '#64748b';
      ctx.font = '13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No data — click Run', w / 2, h / 2);
      // Draw "OFF" screen text glow
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#38bdf844';
      ctx.fillStyle = '#38bdf833';
      ctx.fillText('⏻', w / 2, h / 2 - 20);
      ctx.shadowBlur = 0;
      return;
    }

    // --- Draw traces ---
    const sampleCount = this.data.samples;
    const timeRangeS = this.timeDiv * cols;

    for (let ti = 0; ti < Math.min(this.selectedNodes.length, TRACE_COLORS.length); ti++) {
      const nid = this.selectedNodes[ti];
      const samples = this.data.traces[nid];
      if (!samples || samples.length < 2) continue;

      const color = TRACE_COLORS[ti];
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;
      ctx.shadowBlur = 6;
      ctx.shadowColor = color.replace('55', '33');

      ctx.beginPath();
      for (let i = 0; i < sampleCount; i++) {
        const frac = i / (sampleCount - 1);
        const voltage = samples[i];
        const x = margin.left + frac * plotW;
        // Map voltage to Y (centered, with volts/div scaling)
        const yNorm = voltage / (this.voltDiv * (rows / 2));
        const y = margin.top + plotH / 2 - yNorm * (plotH / 2);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    ctx.shadowBlur = 0;

    // --- Legend ---
    for (let ti = 0; ti < Math.min(this.selectedNodes.length, TRACE_COLORS.length); ti++) {
      const nid = this.selectedNodes[ti];
      const color = TRACE_COLORS[ti];
      const lx = margin.left + 6;
      const ly = margin.top + 14 + ti * 16;
      ctx.fillStyle = color;
      ctx.fillRect(lx, ly - 5, 12, 2);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px ui-monospace, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`N${nid}`, lx + 16, ly + 1);
    }

    // --- Trigger indicator ---
    ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.font = '9px ui-monospace, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`Trig: ${this.triggerMode}`, margin.left + plotW, margin.top + 10);
    ctx.fillText(`${this._fmtTime(this.timeDiv)}/div`, margin.left + plotW, margin.top + 22);
    ctx.fillText(`${this.voltDiv.toFixed(1)}V/div`, margin.left + plotW, margin.top + 34);

    // Update info
    if (this._infoEl) {
      const groundNode = this.builder.components.find(c => c.type === 'ground')?.nodeA;
      const active = this.selectedNodes.filter(n => n !== groundNode).length;
      this._infoEl.textContent = `📊 ${this.data.samples} samples · ${active} traces · ${this.data.duration * 1000} ms`;
    }
  }

  /* ---- Helpers ---- */

  _fmtTime(seconds) {
    if (seconds >= 1) return seconds.toFixed(1) + 's';
    if (seconds >= 1e-3) return (seconds * 1e3).toFixed(0) + 'ms';
    if (seconds >= 1e-6) return (seconds * 1e6).toFixed(0) + 'µs';
    return (seconds * 1e9).toFixed(0) + 'ns';
  }

  detach() {
    this._stopAnim();
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
    if (this._onKey) {
      document.removeEventListener('keydown', this._onKey);
      this._onKey = null;
    }
    if (this._panel && this._panel.parentNode) {
      this._panel.parentNode.removeChild(this._panel);
    }
    this._panel = null;
    this._canvas = null;
    this._ctx = null;
    this.visible = false;
  }
}
