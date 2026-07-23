// EngiBuddy frontend: chat UI, SSE streaming, 3D sync, sessions, quick actions.
// Features: theme toggle, export chat, keyboard shortcuts, session search, improved markdown
import { Viewer } from './viewer.js';
import { openGallery, setSelectCallback } from './model_gallery.js';
import { InlineViewer } from './mini_viewer.js';
import { CircuitBuilder } from './circuit_builder.js';

// API base URL for the backend server.
// On web (browser), use relative paths (same origin).
// On Capacitor mobile (file/capacitor protocol), connect to the backend.
// Set window.ENGIBUDDY_API_URL before the app loads to override for production.
const API_BASE = window.location.protocol === 'capacitor:' || window.location.protocol === 'file:'
  ? (window.ENGIBUDDY_API_URL || 'http://localhost:8000')
  : '';

function api(path) {
  return API_BASE + path;
}


const $ = (sel) => document.querySelector(sel);
const messagesEl = $('#messages');
const inputEl = $('#input');
const sendBtn = $('#send');
const sessionListEl = $('#session-list');
const viewerPane = $('#viewer-pane');
const viewerOpenBtn = $('#viewer-open');
const sceneTitleEl = $('#scene-title');
const qaDifferentBtn = $('#qa-different');
const sessionSearchEl = $('#session-search');
const themeToggleEl = $('#theme-toggle');
const exportBtnEl = $('#export-btn');

const viewer = new Viewer($('#viewer'));

const infoPanelEl = $('#info-panel');
const infoToggleEl = $('#info-toggle');
const infoCategoryEl = $('#info-category');
const infoNameEl = $('#info-name');
const infoDescEl = $('#info-desc');
const infoPurposeEl = $('#info-purpose span');
const infoUsageEl = $('#info-usage span');

let activeInlineViewer = null; // only one inline viewer at a time
let allSessions = []; // cached session list for search

const state = {
  sessionId: null,
  streaming: false,
  lastUserMessage: null,
  lastScene: null,
  config: null,
  theme: localStorage.getItem('engibuddy-theme') || 'dark',
};

/* ---------------- Theme Toggle ---------------- */

function applyTheme(theme) {
  state.theme = theme;
  localStorage.setItem('engibuddy-theme', theme);
  if (theme === 'light') {
    document.body.classList.add('light-theme');
    themeToggleEl.textContent = '☀️';
    themeToggleEl.title = 'Switch to dark theme';
  } else {
    document.body.classList.remove('light-theme');
    themeToggleEl.textContent = '🌙';
    themeToggleEl.title = 'Switch to light theme';
  }
}

themeToggleEl?.addEventListener('click', () => {
  applyTheme(state.theme === 'dark' ? 'light' : 'dark');
});

// Apply saved theme on load
applyTheme(state.theme);

/* ---------------- Export Chat as Markdown ---------------- */

function exportChatAsMarkdown() {
  const messages = messagesEl.querySelectorAll('.msg');
  if (messages.length === 0) return;

  let md = `# EngiBuddy Chat Export\n\n`;
  md += `*Exported on ${new Date().toLocaleString()}*\n\n---\n\n`;

  messages.forEach((msg) => {
    const role = msg.classList.contains('user') ? '**You**' : '**EngiBuddy**';
    const bubble = msg.querySelector('.bubble');
    if (!bubble) return;

    let text = bubble.textContent || '';
    const sceneLabel = bubble.querySelector('.inline-scene-label');

    md += `${role}:\n\n${text}\n\n`;
    if (sceneLabel) {
      md += `*${sceneLabel.textContent}*\n\n`;
    }
    md += `---\n\n`;
  });

  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `engibuddy-chat-${new Date().toISOString().slice(0, 10)}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

exportBtnEl?.addEventListener('click', exportChatAsMarkdown);

/* ---------------- rendering helpers ---------------- */

function escapeHtml(s) {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

// Enhanced markdown: code blocks, bold, italic, inline code, links, bullets, headings, LaTeX math, tables
function renderMarkdown(raw) {
  let s = escapeHtml(raw);

  // Code blocks (triple backtick) - preserve content without further processing
  s = s.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const langLabel = lang ? `<span class="code-lang">${lang}</span>` : '';
    return `<div class="code-block-wrap">${langLabel}<pre class="code-block"><code>${code.trim()}</code></pre></div>`;
  });

  // Inline code
  s = s.replace(/`([^\n`]+)`/g, '<code>$1</code>');

  // Bold
  s = s.replace(/\*\*([^\n*]+)\*\*/g, '<b>$1</b>');

  // Italic
  s = s.replace(/(?<!\*)\*([^\n*]+)\*(?!\*)/g, '<em>$1</em>');

  // Links [text](url)
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="md-link">$1</a>');

  // LaTeX display math: $$...$$
  s = s.replace(/\$\$([^\n$]+)\$\$/g, '<div class="math-display">$1</div>');

  // LaTeX inline math: $...$
  s = s.replace(/\$([^\n$]+)\$/g, '<span class="math-inline">$1</span>');

  // Headings
  s = s.replace(/^### (.+)$/gm, '<h4 class="md-h3">$1</h4>');
  s = s.replace(/^## (.+)$/gm, '<h3 class="md-h2">$1</h3>');
  s = s.replace(/^# (.+)$/gm, '<h2 class="md-h1">$1</h2>');

  // Bullet points
  s = s.replace(/^[-*] (.+)$/gm, '<span class="md-bullet">• $1</span>');

  // Numbered lists
  s = s.replace(/^(\d+)\. (.+)$/gm, '<span class="md-numbered"><span class="md-num">$1.</span> $2</span>');

  // Bold section headers
  s = s.replace(/\*\*([^*]+):\*\*/g, '<span class="md-keyword">$1:</span>');

  // Horizontal rule
  s = s.replace(/^---+$/gm, '<hr class="md-hr">');

  // Line breaks
  s = s.replace(/\n/g, '<br>');

  return s;
}

function addMessage(role, html = '') {
  $('.welcome')?.remove();
  const wrap = document.createElement('div');
  wrap.className = `msg ${role}`;
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.innerHTML = html;
  wrap.appendChild(bubble);
  messagesEl.appendChild(wrap);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return bubble;
}

function addTypingIndicator() {
  const wrap = document.createElement('div');
  wrap.className = 'typing-indicator';
  wrap.innerHTML = `
    <div class="bubble">
      <span class="label">Thinking</span>
      <div class="typing-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  `;
  messagesEl.appendChild(wrap);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return wrap;
}

function removeTypingIndicator(el) {
  if (el && el.parentNode) {
    el.style.opacity = '0';
    el.style.transform = 'translateY(-8px)';
    el.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
    setTimeout(() => el.remove(), 200);
  }
}

function addInlineScene(bubble, spec) {
  // Dispose previous inline viewer
  if (activeInlineViewer) {
    activeInlineViewer.dispose();
    activeInlineViewer = null;
  }

  bubble.classList.add('has-scene');

  const wrapper = document.createElement('div');
  wrapper.className = 'inline-scene-wrap';

  const viewerEl = document.createElement('div');
  viewerEl.className = 'inline-scene';
  wrapper.appendChild(viewerEl);

  const expandBtn = document.createElement('button');
  expandBtn.className = 'inline-scene-expand';
  expandBtn.innerHTML = '⛶';
  expandBtn.title = 'Open in full viewer';
  expandBtn.setAttribute('aria-label', 'Open in full viewer');
  expandBtn.onclick = (e) => {
    e.stopPropagation();
    loadScene(spec);
  };
  wrapper.appendChild(expandBtn);

  const label = document.createElement('div');
  label.className = 'inline-scene-label';
  label.textContent = `🧊 ${spec.title}`;
  wrapper.appendChild(label);

  bubble.appendChild(wrapper);

  const iv = new InlineViewer(viewerEl);
  iv.loadScene(spec);
  activeInlineViewer = iv;
}

function loadScene(spec) {
  state.lastScene = spec;
  viewer.loadScene(spec);
  sceneTitleEl.textContent = spec.title;
  qaDifferentBtn.hidden = false;
  viewerOpenBtn.classList.add('available');
  if (window.innerWidth <= 1080) {
    sheet.open('half');
  }
}

/* ---------------- Throttled rendering for streaming ---------------- */

/**
 * Create a throttled updater that batches DOM writes during streaming.
 * Instead of re-rendering markdown on every tiny SSE delta (which kills the
 * main thread and freezes the chat), we accumulate text and flush at most
 * once per animation frame.
 */
function createStreamRenderer(getBubble, getFullText) {
  let _raf = null;
  let _dirty = false;

  function scheduleFlush() {
    if (_raf) return; // already scheduled
    _raf = requestAnimationFrame(() => {
      _raf = null;
      if (!_dirty) return;
      _dirty = false;
      const bubble = getBubble();
      if (bubble) {
        bubble.innerHTML = renderMarkdown(getFullText());
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }
    });
  }

  return {
    /** Mark that new text arrived and a re-render is needed */
    markDirty() {
      _dirty = true;
      scheduleFlush();
    },
    /** Immediate flush (for done/error) */
    flushNow() {
      if (_raf) { cancelAnimationFrame(_raf); _raf = null; }
      const bubble = getBubble();
      if (bubble) {
        bubble.innerHTML = renderMarkdown(getFullText());
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }
    },
    /** Cancel pending flush */
    cancel() {
      if (_raf) { cancelAnimationFrame(_raf); _raf = null; }
      _dirty = false;
    },
  };
}

/* ---------------- SSE chat ---------------- */

/** How long (ms) we wait for the first token before showing an error */
const SSE_FIRST_TOKEN_TIMEOUT = 30_000;
/** How long (ms) between tokens before we consider the stream stalled */
const SSE_STALL_TIMEOUT = 60_000;

async function sendMessage(text, { record = true } = {}) {
  text = text.trim();
  if (!text || state.streaming) return;
  state.streaming = true;
  sendBtn.disabled = true;
  if (record) state.lastUserMessage = text;

  addMessage('user', renderMarkdown(text));

  const typingEl = addTypingIndicator();

  let bubble = null;
  let fullText = '';
  let firstTokenReceived = false;
  let stalledTimer = null;
  let firstTokenTimer = null;
  let aborted = false;
  let reader = null;

  // Throttled renderer — updates the DOM at most once per frame
  const renderer = createStreamRenderer(
    () => bubble,
    () => fullText,
  );

  function clearTimers() {
    if (stalledTimer) { clearTimeout(stalledTimer); stalledTimer = null; }
    if (firstTokenTimer) { clearTimeout(firstTokenTimer); firstTokenTimer = null; }
  }

  function resetStallTimer() {
    if (stalledTimer) clearTimeout(stalledTimer);
    stalledTimer = setTimeout(() => {
      if (!aborted) {
        abort();
        renderer.cancel();
        removeTypingIndicator(typingEl);
        addMessage('error', 'Response timed out — the stream stalled. Please try again.');
        finalize();
      }
    }, SSE_STALL_TIMEOUT);
  }

  function abort() {
    aborted = true;
    if (reader) {
      try { reader.cancel(); } catch { /* ignore */ }
    }
  }

  function finalize() {
    clearTimers();
    renderer.cancel();
    state.streaming = false;
    sendBtn.disabled = false;
    inputEl.focus();
  }

  // Start a timeout for the first token
  firstTokenTimer = setTimeout(() => {
    if (!firstTokenReceived && !aborted) {
      abort();
      renderer.cancel();
      removeTypingIndicator(typingEl);
      addMessage('error', 'No response received — please check your connection and API key, then try again.');
      finalize();
    }
  }, SSE_FIRST_TOKEN_TIMEOUT);

  const dispatch = (event, data) => {
    if (event === 'session') {
      const isNew = state.sessionId !== data.session_id;
      state.sessionId = data.session_id;
      if (isNew) refreshSessions();
    } else if (event === 'text') {
      // First token received — clear the first-token timeout
      if (!firstTokenReceived) {
        firstTokenReceived = true;
        clearTimers();
        // Now start the stall timer for subsequent tokens
        resetStallTimer();
      } else {
        resetStallTimer();
      }

      // Remove typing indicator on first text
      if (typingEl.parentNode) {
        removeTypingIndicator(typingEl);
      }
      if (!bubble) bubble = addMessage('assistant');
      fullText += data.delta;
      // Throttled: just mark dirty, the RAF callback does the heavy work
      renderer.markDirty();
    } else if (event === 'scene') {
      loadScene(data.spec);
    } else if (event === 'anim') {
      viewer.triggerAnim(data.id);
    } else if (event === 'error') {
      clearTimers();
      renderer.flushNow();
      removeTypingIndicator(typingEl);
      addMessage('error', escapeHtml(data.message));
    } else if (event === 'done') {
      clearTimers();
      // Force a final flush so all text is rendered
      renderer.flushNow();
      removeTypingIndicator(typingEl);
      if (bubble && state.lastScene) {
        requestAnimationFrame(() => addInlineScene(bubble, state.lastScene));
      }
    }
  };

  try {
    const controller = new AbortController();
    // Overall request timeout (5 minutes)
    const reqTimeout = setTimeout(() => {
      if (!aborted) {
        abort();
        controller.abort();
      }
    }, 300_000);

    const res = await fetch(api('/api/chat'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, session_id: state.sessionId }),
      signal: controller.signal,
    });

    clearTimeout(reqTimeout);

    if (!res.ok) {
      const detail = (await res.json().catch(() => ({}))).detail || res.statusText;
      throw new Error(detail);
    }

    reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';

    for (;;) {
      let chunk;
      try {
        chunk = await reader.read();
      } catch (e) {
        // Network error / abort
        break;
      }

      if (chunk.done) break;

      buf += decoder.decode(chunk.value, { stream: true });
      let sep;
      while ((sep = buf.indexOf('\n\n')) !== -1) {
        const block = buf.slice(0, sep);
        buf = buf.slice(sep + 2);
        const evLine = block.split('\n').find((l) => l.startsWith('event: '));
        const dataLine = block.split('\n').find((l) => l.startsWith('data: '));
        if (evLine && dataLine) {
          dispatch(evLine.slice(7).trim(), JSON.parse(dataLine.slice(6)));
        }
      }
    }
  } catch (err) {
    if (!aborted) {
      clearTimers();
      renderer.cancel();
      removeTypingIndicator(typingEl);
      addMessage('error', escapeHtml(`Request failed: ${err.message}`));
    }
  } finally {
    finalize();
  }
}

/* ---------------- sessions sidebar ---------------- */

async function refreshSessions() {
  try {
    const sessions = await (await fetch(api('/api/sessions'))).json();
    allSessions = sessions;
    renderSessionList(sessions);
  } catch {
    // Backend not reachable — don't crash
  }
}

function renderSessionList(sessions) {
  const filter = sessionSearchEl?.value?.toLowerCase() || '';
  const filtered = filter
    ? sessions.filter((s) => s.title.toLowerCase().includes(filter))
    : sessions;

  sessionListEl.innerHTML = '';
  for (const s of filtered) {
    const item = document.createElement('div');
    item.className = 'session-item' + (s.id === state.sessionId ? ' active' : '');
    const label = document.createElement('span');
    label.textContent = s.title;
    const del = document.createElement('button');
    del.className = 'session-del';
    del.textContent = '✕';
    del.title = 'Delete session';
    del.onclick = async (e) => {
      e.stopPropagation();
      await fetch(api(`/api/sessions/${s.id}`), { method: 'DELETE' });
      if (s.id === state.sessionId) newChat();
      refreshSessions();
    };
    item.append(label, del);
    item.onclick = () => openSession(s.id);
    sessionListEl.appendChild(item);
  }

  if (filtered.length === 0 && filter) {
    const empty = document.createElement('div');
    empty.style.cssText = 'padding:12px;text-align:center;color:var(--muted);font-size:12px;';
    empty.textContent = `No sessions matching "${filter}"`;
    sessionListEl.appendChild(empty);
  }
}

sessionSearchEl?.addEventListener('input', () => {
  renderSessionList(allSessions);
});

async function openSession(id) {
  try {
    const msgs = await (await fetch(api(`/api/sessions/${id}/messages`))).json();
    state.sessionId = id;
    state.lastScene = null;
    messagesEl.innerHTML = '';
    let lastSpec = null;
    for (const m of msgs) {
      const bubble = addMessage(m.role, renderMarkdown(m.content));
      if (m.scene_spec) {
        addInlineScene(bubble, m.scene_spec);
        lastSpec = m.scene_spec;
      }
      if (m.role === 'user') state.lastUserMessage = m.content;
    }
    if (lastSpec) loadScene(lastSpec);
    refreshSessions();
    $('#sidebar').classList.remove('open');
  } catch (err) {
    addMessage('error', `Failed to load session: ${err.message}`);
  }
}

function newChat() {
  state.sessionId = null;
  state.lastScene = null;
  state.lastUserMessage = null;
  qaDifferentBtn.hidden = true;
  messagesEl.innerHTML = '';
  location.reload();
}

/* ---------------- quick actions ---------------- */

function quickActionPrompt(kind) {
  const cfg = state.config || {};
  switch (kind) {
    case 'practice':
      return 'Give me 3 practice problems on what we just discussed (or a core topic if we haven\'t started), from easy to hard. Don\'t reveal the answers yet.';
    case 'summary':
      return 'Summarize what we covered as short bullet points I can revise from.';
    case 'realworld':
      return 'Where is this concept used in the real world? Give 2-3 concrete engineering applications.';
    case 'show3d':
      return 'Show me this concept as an interactive 3D model and walk me through it.';
    case 'projects':
      return `Suggest 3 project ideas suitable for a semester-${cfg.semester ?? 3} ${cfg.branch ?? 'engineering'} student, ordered by difficulty, with a one-line build plan each.`;
    case 'different': {
      const other = state.lastScene?.style === 'realistic' ? 'schematic' : 'realistic';
      return `Explain that differently — take a different angle in words, and rebuild the 3D scene in "${other}" style (or with different parameters) so I can see it another way.`;
    }
    default:
      return '';
  }
}

/* ---------------- Keyboard Shortcuts ---------------- */

document.addEventListener('keydown', (e) => {
  const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable;

  // Ctrl+Shift+N: New chat
  if (e.ctrlKey && e.shiftKey && e.key === 'N') {
    e.preventDefault();
    newChat();
    return;
  }

  // Ctrl+K: Open gallery
  if (e.ctrlKey && e.key === 'k') {
    e.preventDefault();
    openGallery();
    return;
  }

  // Escape: Close gallery, close sidebar on mobile
  if (e.key === 'Escape') {
    const gallery = document.querySelector('.gallery-overlay.open');
    if (gallery) {
      document.querySelector('.gallery-close')?.click();
      return;
    }
    if (window.innerWidth <= 720) {
      $('#sidebar').classList.remove('open');
    }
    return;
  }

  // G: Open gallery (only when not typing)
  if (e.key === 'g' && !isInput && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    openGallery();
    return;
  }

  // /: Focus search input
  if (e.key === '/' && !isInput) {
    e.preventDefault();
    sessionSearchEl?.focus();
    return;
  }

  // Ctrl+E: Export chat
  if (e.ctrlKey && e.key === 'e') {
    e.preventDefault();
    exportChatAsMarkdown();
    return;
  }
});

/* ---------------- wiring ---------------- */

$('#composer').addEventListener('submit', (e) => {
  e.preventDefault();
  const text = inputEl.value;
  inputEl.value = '';
  inputEl.style.height = 'auto';
  sendMessage(text);
});

inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    $('#composer').requestSubmit();
  }
});
inputEl.addEventListener('input', () => {
  inputEl.style.height = 'auto';
  inputEl.style.height = `${Math.min(inputEl.scrollHeight, 140)}px`;
});

document.addEventListener('click', (e) => {
  const starter = e.target.closest('.starter');
  if (starter) sendMessage(starter.textContent);
  const qa = e.target.closest('#quick-actions button');
  if (qa) sendMessage(quickActionPrompt(qa.dataset.qa));
});

// Permanently wire the gallery callback so keyboard shortcuts work without passing it each time.
setSelectCallback((spec) => loadScene(spec));

$('#gallery-btn').onclick = () => openGallery();

$('#new-chat').onclick = newChat;
$('#sidebar-toggle').onclick = () => $('#sidebar').classList.toggle('open');

/* ---------- swipeable bottom sheet controller ---------- */

class BottomSheet {
  constructor(el) {
    this.el = el;
    this.handle = el.querySelector('.sheet-handle');
    this.state = this._readState() || 'closed';
    this._currentTranslate = 100;
    this.dragging = false;
    this.startY = 0;
    this.startTranslate = 0;
    this.lastY = 0;
    this.lastTime = 0;
    this.velocity = 0;

    if (!this.handle) return;

    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);

    this.handle.addEventListener('pointerdown', this._onPointerDown);

    const head = el.querySelector('#viewer-head');
    if (head) {
      head.addEventListener('pointerdown', (e) => {
        if (e.target.closest('button')) return;
        this._onPointerDown(e);
      });
    }
  }

  _readState() {
    return this.el.getAttribute('data-sheet');
  }

  _getCurrentTranslate() {
    const inline = this.el.style.getPropertyValue('--sheet-translate');
    if (inline) return parseFloat(inline);
    return this._currentTranslate ?? 100;
  }

  _onPointerDown(e) {
    if (window.innerWidth > 1080) return;
    if (e.button !== 0) return;

    this.dragging = true;
    this.startY = e.clientY;
    this.lastY = e.clientY;
    this.lastTime = performance.now();
    this.velocity = 0;
    this.startTranslate = this._getCurrentTranslate();
    this.el.classList.add('dragging');
    this.el.setPointerCapture(e.pointerId);

    document.addEventListener('pointermove', this._onPointerMove);
    document.addEventListener('pointerup', this._onPointerUp);
    document.addEventListener('pointercancel', this._onPointerUp);
  }

  _onPointerMove(e) {
    if (!this.dragging) return;
    const now = performance.now();
    const dt = Math.max(now - this.lastTime, 1);
    const dy = e.clientY - this.lastY;
    this.velocity = dy / dt;
    this.lastY = e.clientY;
    this.lastTime = now;

    const totalDy = e.clientY - this.startY;
    const vh = window.innerHeight;
    const pct = (totalDy / vh) * 100;
    const newTranslate = Math.max(0, Math.min(100, this.startTranslate + pct));
    this.el.style.setProperty('--sheet-translate', `${newTranslate}%`);
  }

  _onPointerUp() {
    if (!this.dragging) return;
    this.dragging = false;
    this.el.classList.remove('dragging');

    document.removeEventListener('pointermove', this._onPointerMove);
    document.removeEventListener('pointerup', this._onPointerUp);
    document.removeEventListener('pointercancel', this._onPointerUp);

    const vh = window.innerHeight;
    const current = this._getCurrentTranslate();

    const fullAt = 4;
    const halfAt = 50;
    const peekAt = (1 - 82 / vh) * 100;

    const states = [
      { state: 'full', val: fullAt },
      { state: 'half', val: halfAt },
      { state: 'peek', val: peekAt },
      { state: 'closed', val: 100 },
    ];

    let target;
    const absVel = Math.abs(this.velocity);

    if (absVel > 0.3) {
      if (this.velocity > 0) {
        const candidates = [...states].reverse();
        target = candidates.find((s) => s.val > current)?.state || 'closed';
      } else {
        target = states.find((s) => s.val < current)?.state || 'full';
      }
    } else {
      target = states.reduce((a, b) =>
        Math.abs(current - a.val) < Math.abs(current - b.val) ? a : b
      ).state;
    }

    this.snapTo(target);
  }

  snapTo(state) {
    this.state = state;
    this.el.setAttribute('data-sheet', state);
    this.el.style.removeProperty('--sheet-translate');

    const vh = window.innerHeight;
    const snapValues = {
      closed: 100,
      peek: (1 - 82 / vh) * 100,
      half: 50,
      full: 4,
    };
    this._currentTranslate = Math.max(0, Math.min(100, snapValues[state] ?? 100));

    if (state === 'full' || state === 'half') {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    setTimeout(() => {
      window.dispatchEvent(new Event('sheet-resize'));
    }, 50);
  }

  open(state = 'half') {
    this.snapTo(state);
  }

  close() {
    this.snapTo('closed');
  }

  isOpen() {
    return this.state !== 'closed';
  }
}

// Initialize the bottom sheet
const sheet = new BottomSheet(viewerPane);

// Wire existing open/close buttons to the sheet
$('#viewer-close').onclick = () => sheet.close();
viewerOpenBtn.onclick = () => {
  if (sheet.isOpen()) {
    sheet.close();
  } else {
    sheet.open('peek');
  }
};

/* ---- Circuit Builder ---- */

const circuitBuilder = new CircuitBuilder(viewer);
let builderActive = false;

window.addEventListener('beforeunload', () => circuitBuilder.destroy());

$('#builder-toggle').onclick = (e) => {
  builderActive = !builderActive;
  e.currentTarget.classList.toggle('on', builderActive);
  viewer.setBuilder(builderActive ? circuitBuilder : null);
  if (!builderActive) {
    if (state.lastScene) viewer.loadScene(state.lastScene);
  }
};

$('#lowpoly-toggle').onclick = (e) => {
  viewer.lowPoly = !viewer.lowPoly;
  e.currentTarget.classList.toggle('on', viewer.lowPoly);
  if (viewer.renderer) {
    viewer.renderer.setPixelRatio(Math.min(window.devicePixelRatio, viewer.lowPoly ? 1.25 : 2));
  }
  if (state.lastScene) viewer.loadScene(state.lastScene);
};

/* ---------------- info panel ---------------- */

document.addEventListener('scene-info', (e) => {
  const meta = e.detail;
  if (!meta) { infoPanelEl.hidden = true; return; }
  infoCategoryEl.textContent = meta.category || '';
  infoNameEl.textContent = meta.name || '';
  infoDescEl.textContent = meta.desc || '';
  infoPurposeEl.textContent = meta.purpose || '';
  infoUsageEl.textContent = meta.usage || '';
  infoPanelEl.hidden = false;
  infoPanelEl.classList.remove('expanded');
});

infoToggleEl.addEventListener('click', () => {
  infoPanelEl.classList.toggle('expanded');
  infoToggleEl.textContent = infoPanelEl.classList.contains('expanded') ? '✕' : 'ℹ️';
});

document.addEventListener('scene-title', (e) => { sceneTitleEl.textContent = e.detail; });

/* ---------------- onboarding ---------------- */

function initOnboarding() {
  const overlay = $('#onboarding-overlay');
  if (!overlay) return;

  const hasSeen = localStorage.getItem('engibuddy-onboarded');
  if (hasSeen) {
    overlay.style.display = 'none';
    return;
  }

  const steps = overlay.querySelectorAll('.onb-step');
  const dots = overlay.querySelectorAll('.onb-dot');
  const backBtn = $('#onb-back');
  const nextBtn = $('#onb-next');
  const skipBtn = $('#onb-skip');
  let current = 0;
  const total = steps.length;

  function showStep(idx) {
    steps.forEach((s) => s.classList.remove('active'));
    dots.forEach((d) => d.classList.remove('active'));
    steps[idx].classList.add('active');
    dots[idx].classList.add('active');
    backBtn.style.display = idx === 0 ? 'none' : '';
    nextBtn.textContent = idx === total - 1 ? "Let's go!" : 'Next';
    current = idx;
  }

  let _escHandler = null;

  function closeOnboarding() {
    overlay.classList.add('exit');
    setTimeout(() => { overlay.style.display = 'none'; }, 350);
    localStorage.setItem('engibuddy-onboarded', '1');
    if (_escHandler) {
      document.removeEventListener('keydown', _escHandler);
      _escHandler = null;
    }
  }

  overlay.style.display = 'flex';
  showStep(0);

  nextBtn.addEventListener('click', () => {
    if (current < total - 1) {
      showStep(current + 1);
    } else {
      closeOnboarding();
    }
  });

  backBtn.addEventListener('click', () => {
    if (current > 0) showStep(current - 1);
  });

  skipBtn.addEventListener('click', closeOnboarding);

  _escHandler = (e) => {
    if (e.key === 'Escape' && overlay.style.display !== 'none') {
      e.stopPropagation();
      closeOnboarding();
    }
  };
  document.addEventListener('keydown', _escHandler);
}

/* ---------------- init ---------------- */

(async function init() {
  try {
    state.config = await (await fetch(api('/api/config'))).json();
    $('#sidebar-foot').textContent =
      `${state.config.subject_focus} · ${state.config.difficulty} · ${state.config.model}`;
  } catch { /* backend not reachable yet */ }
  refreshSessions();
  initOnboarding();
  inputEl.focus();
})();
