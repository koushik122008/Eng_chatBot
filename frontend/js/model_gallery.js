// Model Gallery — browse, search, and load any 3D template.
// Opens a full-screen modal showing all 110+ models organized by category.
import { registry, templateMeta } from './three-scenes/registry.js';

/* ---------- default scene specs per template ---------- */

const ORIGINAL_DEFAULTS = {
  npn_transistor:   { bias: 'active', showDepletionRegion: true },
  logic_gate:       { gate: 'NAND', inputs: [1, 1] },
  gear_train:       { gears: [{ teeth: 20 }, { teeth: 35 }], rpm: 60 },
  spring_mass:      { mass: 2, k: 50, damping: 0.5, initialDisplacement: 1.5 },
  wave:             { mode: 'time', waves: [{ type: 'sine', freq: 2, amp: 1, phase: 0 }] },
  mosfet:           { type: 'nmos', vgs: 3, vds: 5 },
  opamp:            { config: 'inverting', r1: 1000, r2: 10000, inputVoltage: 1 },
  rlc_filter:       { type: 'series_rlc', r: 100, l: 10, c: 100, frequency: 50 },
};

const ORIGINALS = new Set(Object.keys(ORIGINAL_DEFAULTS));

function defaultSpec(name, meta) {
  const spec = {
    template: name,
    title: meta?.name || name,
    style: 'realistic',
    params: {},
  };
  if (ORIGINALS.has(name)) {
    spec.params = { ...ORIGINAL_DEFAULTS[name], showLabels: true };
  } else {
    spec.params = { type: name, showLabels: true };
  }
  return spec;
}

/* ---------- modal DOM ---------- */

let modalEl = null;
let onSelect = null; // callback: (spec) => void

const CATEGORY_ORDER = [
  'Semiconductor Devices',
  'Rectifiers',
  'Amplifiers',
  'Filters',
  'Oscillators',
  'Digital Logic',
  'Digital Circuits',
  'VLSI / CMOS',
  'Power Electronics',
  'Signals & Systems',
  'Signal Processing',
  'Control Systems',
  'Mechanical',
  'Electromagnetics & Motors',
  'Antennas & Wave Propagation',
  'Thermal & Fluid Systems',
  'Structures & Mechanical Engineering',
  'Sensors & Actuators',
  'RF & Microwave',
  'Materials Science',
  'Chemistry / Process Engineering',
  'Renewable Energy & Storage',
  'Optics & Photonics',
  'Manufacturing & Industrial',
  'Aerospace Engineering',
];

function escapeHtml(s) {
  return String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function buildModal() {
  modalEl = document.createElement('div');
  modalEl.id = 'model-gallery';
  modalEl.className = 'gallery-overlay';
  modalEl.innerHTML = `
    <div class="gallery-backdrop"></div>
    <div class="gallery-panel" role="dialog" aria-label="3D Model Gallery">
      <div class="gallery-header">
        <h2>🧊 3D Model Gallery</h2>
        <div class="gallery-search-wrap">
          <span class="gallery-search-icon">🔍</span>
          <input class="gallery-search" id="gallery-search" type="search" placeholder="Search models…" autocomplete="off">
        </div>
        <button id="gallery-random" class="gallery-random-btn" title="Load a random model">🎲 Random</button>
        <button class="gallery-close" title="Close gallery">✕</button>
      </div>
      <div class="gallery-count"></div>
      <div class="gallery-body"></div>
      <div class="gallery-footer">
        <span class="gallery-total"></span>
        <span class="gallery-hint">Click any model to load it in the 3D viewer</span>
      </div>
    </div>
  `;

  // Close handlers
  modalEl.querySelector('.gallery-close').onclick = closeGallery;
  modalEl.querySelector('.gallery-backdrop').onclick = closeGallery;

  // Random model button
  modalEl.querySelector('#gallery-random').onclick = () => {
    const names = Object.keys(templateMeta).filter((n) => registry[n]);
    if (names.length === 0) return;
    const name = names[Math.floor(Math.random() * names.length)];
    const meta = templateMeta[name];
    const spec = defaultSpec(name, meta);
    if (onSelect) onSelect(spec);
    closeGallery();
  };

  // Search handler
  const searchInput = modalEl.querySelector('.gallery-search');
  let debounceTimer = null;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => renderGallery(searchInput.value), 120);
  });

  document.body.appendChild(modalEl);
}

// Persistent global keydown listener (added once at module init time)
document.addEventListener('keydown', _onKeyDown);

function _onKeyDown(e) {
  const isOpen = modalEl?.classList.contains('open');
  const target = e.target;
  const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

  if (isOpen) {
    // Escape → close gallery
    if (e.key === 'Escape') {
      closeGallery();
      return;
    }
    // / → focus search input (re-uses the key)
    if (e.key === '/' && !isInput) {
      e.preventDefault();
      const inp = modalEl.querySelector('.gallery-search');
      if (inp) inp.focus();
      return;
    }
    // Ctrl+K / Cmd+K → focus search
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      const inp = modalEl.querySelector('.gallery-search');
      if (inp) inp.focus();
      return;
    }
  } else {
    // g → open gallery (only when not typing in an input)
    if (e.key === 'g' && !e.metaKey && !e.ctrlKey && !isInput) {
      e.preventDefault();
      openGallery();
      return;
    }
  }
}

/* ---------- render ---------- */

function groupTemplates(filter = '') {
  const q = filter.toLowerCase().trim();
  const groups = {};
  const names = Object.keys(templateMeta);

  for (const name of names) {
    const meta = templateMeta[name];
    // Only include templates that are actually in the registry
    if (!registry[name]) continue;

    const label = (meta?.name || name).toLowerCase();
    const cat = (meta?.category || '').toLowerCase();
    const desc = (meta?.desc || '').toLowerCase();

    if (q && !label.includes(q) && !cat.includes(q) && !desc.includes(q) && !name.toLowerCase().includes(q)) {
      continue;
    }

    const category = meta?.category || 'Other';
    if (!groups[category]) groups[category] = [];
    groups[category].push({ name, meta });
  }

  return groups;
}

function renderGallery(filter = '') {
  const body = modalEl.querySelector('.gallery-body');
  const countEl = modalEl.querySelector('.gallery-count');
  const totalEl = modalEl.querySelector('.gallery-total');
  const groups = groupTemplates(filter);
  const total = Object.values(groups).reduce((s, arr) => s + arr.length, 0);

  countEl.textContent = filter
    ? `🔍 ${total} model${total !== 1 ? 's' : ''} found`
    : '';
  totalEl.textContent = `${total} model${total !== 1 ? 's' : ''}`;

  if (total === 0) {
    body.innerHTML = `<div class="gallery-empty">No models match "<b>${escapeHtml(filter)}</b>"</div>`;
    return;
  }

  let html = '';
  for (const cat of CATEGORY_ORDER) {
    if (!groups[cat]) continue;
    const items = groups[cat];
    html += `<section class="gallery-category">
      <h3 class="gallery-cat-title">${escapeHtml(cat)} <span class="gallery-cat-count">${items.length}</span></h3>
      <div class="gallery-grid">`;
    for (const { name, meta } of items) {
      html += `<button class="gallery-card" data-template="${escapeHtml(name)}">
        <div class="gallery-card-badge">${escapeHtml(name.replace(/_/g, ' '))}</div>
        <div class="gallery-card-name">${escapeHtml(meta?.name || name)}</div>
        <div class="gallery-card-desc">${escapeHtml(meta?.desc || '')}</div>
      </button>`;
    }
    html += `</div></section>`;
  }
  body.innerHTML = html;

  // Click handler — load scene
  body.querySelectorAll('.gallery-card').forEach((card) => {
    card.addEventListener('click', () => {
      const name = card.dataset.template;
      const meta = templateMeta[name];
      const spec = defaultSpec(name, meta);
      if (onSelect) onSelect(spec);
      closeGallery();
    });
  });
}

/* ---------- public API ---------- */

/**
 * Permanently set the callback invoked when a model card is selected.
 * Call this once from app.js so keyboard shortcuts work without a callback arg.
 */
export function setSelectCallback(cb) {
  onSelect = cb;
}

export function openGallery(callback) {
  if (callback) onSelect = callback;
  if (!onSelect) return; // no callback set yet
  if (!modalEl) buildModal();
  renderGallery('');
  modalEl.classList.add('open');
  // Focus the search input after a brief delay
  requestAnimationFrame(() => {
    const inp = modalEl.querySelector('.gallery-search');
    if (inp) inp.focus();
  });
  document.body.style.overflow = 'hidden';
}

export function closeGallery() {
  if (!modalEl) return;
  modalEl.classList.remove('open');
  document.body.style.overflow = '';
}
