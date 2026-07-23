// Circuit Library — save/load circuit designs with localStorage, file export/import, and "My Circuits" tab.
// EngiBuddy Circuit Builder companion.

const STORAGE_KEY = 'engibuddy_circuits';

export class CircuitLibrary {
  constructor(builder) {
    this.builder = builder;
    this._panel = null;
    this.visible = false;
    this._onKey = null;
  }

  /* ---- Storage ---- */

  /** Load all saved circuits from localStorage */
  _loadAll() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  /** Save circuits array to localStorage */
  _saveAll(circuits) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(circuits));
    } catch (e) {
      console.warn('Could not save circuits to localStorage:', e);
    }
  }

  /** Save current circuit with a given name */
  save(name) {
    const json = this.builder.exportJSON();
    json.name = name || 'Untitled Circuit';
    json.savedAt = new Date().toISOString();

    const circuits = this._loadAll();

    // Update existing circuit with same name, or add new
    const existing = circuits.findIndex((c) => c.name === json.name);
    if (existing >= 0) {
      circuits[existing] = json;
    } else {
      circuits.push(json);
    }

    this._saveAll(circuits);
    this.builder._setStatus(`💾 Circuit "${json.name}" saved.`);
    if (this.visible) this._renderList();
    return json;
  }

  /** Load a circuit by index in the saved list */
  load(index) {
    const circuits = this._loadAll();
    const circuit = circuits[index];
    if (!circuit) {
      this.builder._setStatus('Circuit not found.');
      return false;
    }
    const ok = this.builder.importJSON(circuit);
    if (ok) {
      this.builder._setStatus(`📂 Loaded "${circuit.name}"`);
    }
    if (this.visible) this._renderList();
    return ok;
  }

  /** Delete a saved circuit by index */
  remove(index) {
    const circuits = this._loadAll();
    if (index < 0 || index >= circuits.length) return;
    const name = circuits[index].name;
    circuits.splice(index, 1);
    this._saveAll(circuits);
    this.builder._setStatus(`🗑 Deleted "${name}"`);
    if (this.visible) this._renderList();
  }

  /** Download current circuit as a .json file */
  download() {
    const json = this.builder.exportJSON();
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = (json.name || 'circuit').replace(/[^a-zA-Z0-9_-]/g, '_');
    a.download = `${safeName}.engibuddy.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.builder._setStatus(`📥 Downloaded "${json.name}.json"`);
  }

  /** Trigger a file picker to upload and import a .json circuit */
  upload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.engibuddy.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const ok = this.builder.loadJSON(ev.target.result);
        if (ok) {
          // Auto-save to library
          const circuits = this._loadAll();
          const name = file.name.replace(/\.engibuddy\.json$|\.json$/i, '');
          const circuit = this.builder.exportJSON();
          circuit.name = name;
          const existing = circuits.findIndex((c) => c.name === name);
          if (existing >= 0) circuits[existing] = circuit;
          else circuits.push(circuit);
          this._saveAll(circuits);
          this.builder._setStatus(`📂 Imported "${name}" from file`);
          if (this.visible) this._renderList();
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  /* ---- Panel UI ---- */

  show() {
    if (this.visible) return;
    this.visible = true;
    this._buildUI();
    this._panel.style.display = 'flex';
    this._renderList();
  }

  hide() {
    if (!this.visible) return;
    this.visible = false;
    if (this._panel) this._panel.style.display = 'none';
  }

  toggle() {
    if (this.visible) this.hide();
    else this.show();
  }

  _buildUI() {
    if (this._panel) return;

    const panel = document.createElement('div');
    panel.className = 'circuit-library-panel';
    panel.style.display = 'none';

    // Header
    const header = document.createElement('div');
    header.className = 'circuit-lib-header';
    header.innerHTML = '<span>📂 My Circuits</span>';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'circuit-lib-close';
    closeBtn.textContent = '✕';
    closeBtn.title = 'Close';
    closeBtn.onclick = () => this.hide();
    header.appendChild(closeBtn);
    panel.appendChild(header);

    // Action bar
    const actionBar = document.createElement('div');
    actionBar.className = 'circuit-lib-actions';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'circuit-lib-btn circuit-lib-save';
    saveBtn.innerHTML = '💾 Save';
    saveBtn.title = 'Save current circuit';
    saveBtn.onclick = () => {
      const name = prompt('Circuit name:', 'My Circuit');
      if (name) this.save(name);
    };
    actionBar.appendChild(saveBtn);

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'circuit-lib-btn';
    downloadBtn.innerHTML = '📥 Export File';
    downloadBtn.title = 'Download circuit as JSON file';
    downloadBtn.onclick = () => this.download();
    actionBar.appendChild(downloadBtn);

    const uploadBtn = document.createElement('button');
    uploadBtn.className = 'circuit-lib-btn';
    uploadBtn.innerHTML = '📤 Import File';
    uploadBtn.title = 'Import circuit from JSON file';
    uploadBtn.onclick = () => this.upload();
    actionBar.appendChild(uploadBtn);

    panel.appendChild(actionBar);

    // List area
    const listWrap = document.createElement('div');
    listWrap.className = 'circuit-lib-list-wrap';
    this._listEl = document.createElement('div');
    this._listEl.className = 'circuit-lib-list';
    listWrap.appendChild(this._listEl);
    panel.appendChild(listWrap);

    // Footer info
    const footer = document.createElement('div');
    footer.className = 'circuit-lib-footer';
    this._footerEl = document.createElement('span');
    footer.appendChild(this._footerEl);
    panel.appendChild(footer);

    // Append to viewer container
    this.builder.viewer.container.appendChild(panel);
    this._panel = panel;

    // Keyboard: Esc to close
    this._onKey = (e) => {
      if (e.key === 'Escape' && this.visible) this.hide();
    };
    document.addEventListener('keydown', this._onKey);
  }

  _renderList() {
    if (!this._listEl) return;
    const circuits = this._loadAll();
    this._listEl.innerHTML = '';

    if (circuits.length === 0) {
      this._listEl.innerHTML =
        '<div class="circuit-lib-empty">No saved circuits yet.<br>Build a circuit and click <b>💾 Save</b> to store it here.</div>';
      if (this._footerEl) this._footerEl.textContent = '0 circuits';
      return;
    }

    // Sort by savedAt descending (newest first)
    circuits.sort((a, b) => new Date(b.savedAt || b.createdAt) - new Date(a.savedAt || a.createdAt));

    for (let i = 0; i < circuits.length; i++) {
      const c = circuits[i];
      const card = document.createElement('div');
      card.className = 'circuit-lib-card';

      // Info section (click to load)
      const info = document.createElement('div');
      info.className = 'circuit-lib-card-info';
      info.onclick = () => this.load(circuits.indexOf(c));

      const nameEl = document.createElement('div');
      nameEl.className = 'circuit-lib-card-name';
      nameEl.textContent = c.name || 'Untitled';
      info.appendChild(nameEl);

      const meta = document.createElement('div');
      meta.className = 'circuit-lib-card-meta';
      const compCount = c.components?.length || 0;
      const wireCount = c.wires?.length || 0;
      const savedDate = c.savedAt || c.createdAt || '';
      const dateStr = savedDate ? new Date(savedDate).toLocaleDateString() : '';
      meta.textContent = `${compCount} parts · ${wireCount} wires${dateStr ? ' · ' + dateStr : ''}`;
      info.appendChild(meta);

      card.appendChild(info);

      // Action buttons
      const actions = document.createElement('div');
      actions.className = 'circuit-lib-card-actions';

      const loadBtn = document.createElement('button');
      loadBtn.className = 'circuit-lib-btn-sm circuit-lib-load-btn';
      loadBtn.textContent = 'Load';
      loadBtn.title = 'Open this circuit';
      loadBtn.onclick = (e) => {
        e.stopPropagation();
        this.load(circuits.indexOf(c));
      };
      actions.appendChild(loadBtn);

      const downloadSm = document.createElement('button');
      downloadSm.className = 'circuit-lib-btn-sm';
      downloadSm.textContent = '📥';
      downloadSm.title = 'Download this circuit';
      downloadSm.onclick = (e) => {
        e.stopPropagation();
        // Temporarily load to get the JSON, then restore current
        this.load(circuits.indexOf(c));
        this.download();
        // Re-render to show the list again (load may have cleared panel)
        if (this.visible) this._renderList();
      };
      actions.appendChild(downloadSm);

      const delBtn = document.createElement('button');
      delBtn.className = 'circuit-lib-btn-sm circuit-lib-del-btn';
      delBtn.textContent = '✕';
      delBtn.title = 'Delete this circuit';
      delBtn.onclick = (e) => {
        e.stopPropagation();
        if (confirm(`Delete "${c.name}"?`)) {
          this.remove(circuits.indexOf(c));
        }
      };
      actions.appendChild(delBtn);

      card.appendChild(actions);
      this._listEl.appendChild(card);
    }

    if (this._footerEl) {
      this._footerEl.textContent = `${circuits.length} circuit${circuits.length > 1 ? 's' : ''} saved locally`;
    }
  }

  /** Clean up DOM and event listeners */
  detach() {
    if (this._onKey) {
      document.removeEventListener('keydown', this._onKey);
      this._onKey = null;
    }
    if (this._panel && this._panel.parentNode) {
      this._panel.parentNode.removeChild(this._panel);
    }
    this._panel = null;
    this._listEl = null;
    this._footerEl = null;
    this.visible = false;
  }
}
