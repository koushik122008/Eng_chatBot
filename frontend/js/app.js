// EngiBuddy frontend: chat UI, SSE streaming, 3D sync, sessions, quick actions.
import { Viewer } from './viewer.js';

const $ = (sel) => document.querySelector(sel);
const messagesEl = $('#messages');
const inputEl = $('#input');
const sendBtn = $('#send');
const sessionListEl = $('#session-list');
const viewerPane = $('#viewer-pane');
const viewerOpenBtn = $('#viewer-open');
const sceneTitleEl = $('#scene-title');
const qaDifferentBtn = $('#qa-different');

const viewer = new Viewer($('#viewer'));

const state = {
  sessionId: null,
  streaming: false,
  lastUserMessage: null,
  lastScene: null,
  config: null,
};

/* ---------------- rendering helpers ---------------- */

function escapeHtml(s) {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

// Minimal markdown: bold, inline code, bullets, ## headings.
function renderMarkdown(raw) {
  let s = escapeHtml(raw);
  s = s.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>');
  s = s.replace(/^#{1,3} (.+)$/gm, '<b>$1</b>');
  s = s.replace(/^[-*] /gm, '• ');
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

function addSceneChip(bubble, spec) {
  const chip = document.createElement('span');
  chip.className = 'scene-chip';
  chip.textContent = `🧊 ${spec.title}`;
  chip.title = 'Show this 3D model';
  chip.onclick = () => { loadScene(spec); };
  bubble.appendChild(document.createElement('br'));
  bubble.appendChild(chip);
}

function loadScene(spec) {
  state.lastScene = spec;
  viewer.loadScene(spec);
  sceneTitleEl.textContent = spec.title;
  qaDifferentBtn.hidden = false;
  // On narrow screens the 3D pane is a drawer — surface it.
  viewerOpenBtn.classList.add('available');
  if (window.matchMedia('(max-width: 1080px)').matches) {
    viewerPane.classList.add('open');
  }
}

/* ---------------- SSE chat ---------------- */

async function sendMessage(text, { record = true } = {}) {
  text = text.trim();
  if (!text || state.streaming) return;
  state.streaming = true;
  sendBtn.disabled = true;
  if (record) state.lastUserMessage = text;

  addMessage('user', renderMarkdown(text));
  const typing = document.createElement('div');
  typing.className = 'typing';
  typing.textContent = 'EngiBuddy is thinking';
  messagesEl.appendChild(typing);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  let bubble = null;
  let fullText = '';

  const dispatch = (event, data) => {
    if (event === 'session') {
      const isNew = state.sessionId !== data.session_id;
      state.sessionId = data.session_id;
      if (isNew) refreshSessions();
    } else if (event === 'text') {
      typing.remove();
      if (!bubble) bubble = addMessage('assistant');
      fullText += data.delta;
      bubble.innerHTML = renderMarkdown(fullText);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    } else if (event === 'scene') {
      loadScene(data.spec);
    } else if (event === 'anim') {
      viewer.triggerAnim(data.id);
    } else if (event === 'error') {
      typing.remove();
      addMessage('error', escapeHtml(data.message));
    } else if (event === 'done') {
      if (bubble && state.lastScene) addSceneChip(bubble, state.lastScene);
    }
  };

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, session_id: state.sessionId }),
    });
    if (!res.ok) {
      const detail = (await res.json().catch(() => ({}))).detail || res.statusText;
      throw new Error(detail);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
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
    typing.remove();
    addMessage('error', escapeHtml(`Request failed: ${err.message}`));
  } finally {
    typing.remove();
    state.streaming = false;
    sendBtn.disabled = false;
    inputEl.focus();
  }
}

/* ---------------- sessions sidebar ---------------- */

async function refreshSessions() {
  const sessions = await (await fetch('/api/sessions')).json();
  sessionListEl.innerHTML = '';
  for (const s of sessions) {
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
      await fetch(`/api/sessions/${s.id}`, { method: 'DELETE' });
      if (s.id === state.sessionId) newChat();
      refreshSessions();
    };
    item.append(label, del);
    item.onclick = () => openSession(s.id);
    sessionListEl.appendChild(item);
  }
}

async function openSession(id) {
  const msgs = await (await fetch(`/api/sessions/${id}/messages`)).json();
  state.sessionId = id;
  state.lastScene = null;
  messagesEl.innerHTML = '';
  let lastSpec = null;
  for (const m of msgs) {
    const bubble = addMessage(m.role, renderMarkdown(m.content));
    if (m.scene_spec) {
      addSceneChip(bubble, m.scene_spec);
      lastSpec = m.scene_spec;
    }
    if (m.role === 'user') state.lastUserMessage = m.content;
  }
  if (lastSpec) loadScene(lastSpec);
  refreshSessions();
  $('#sidebar').classList.remove('open');
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

$('#new-chat').onclick = newChat;
$('#sidebar-toggle').onclick = () => $('#sidebar').classList.toggle('open');
$('#viewer-close').onclick = () => viewerPane.classList.remove('open');
viewerOpenBtn.onclick = () => viewerPane.classList.add('open');

$('#lowpoly-toggle').onclick = (e) => {
  viewer.lowPoly = !viewer.lowPoly;
  e.currentTarget.classList.toggle('on', viewer.lowPoly);
  if (viewer.renderer) {
    viewer.renderer.setPixelRatio(Math.min(window.devicePixelRatio, viewer.lowPoly ? 1.25 : 2));
  }
  if (state.lastScene) viewer.loadScene(state.lastScene);
};

document.addEventListener('scene-title', (e) => { sceneTitleEl.textContent = e.detail; });

/* ---------------- init ---------------- */

(async function init() {
  try {
    state.config = await (await fetch('/api/config')).json();
    $('#sidebar-foot').textContent =
      `${state.config.subject_focus} · ${state.config.difficulty} · ${state.config.model}`;
  } catch { /* backend not reachable yet */ }
  refreshSessions();
  inputEl.focus();
})();
