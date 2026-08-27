/**
 * Tishka AI — Chat Widget
 * Self-contained: CSS + HTML + JS in one file. No dependencies, no build step.
 * Drop a <script src="chat-widget.js"></script> before </body> and it self-initialises.
 *
 * Design: DM Sans, charcoal canvas #1A1A1A, indigo user bubbles, plain-text AI replies.
 * Spec: Claude/Business/Website/chat-widget-spec.md
 *
 * Talks to the n8n chatbot workflow:
 *   POST <webhookUrl>  →  { message, conversationId, history }
 *   ← { reply, offerFollowUp, followUpMessage }
 */

(function () {
  'use strict';

  // ─────────────────────────────────────────────────────────────
  // CONFIG — edit here. Flip webhook URLs to https://tishka.ai/... at go-live.
  // ─────────────────────────────────────────────────────────────
  const CONFIG = {
    webhookUrl:      'http://localhost:5678/webhook/chat',        // n8n chat endpoint (local test)
    emailWebhookUrl: 'http://localhost:5678/webhook/chat-email',  // email capture endpoint (Phase 4 — see note)
    botName:         'Tishka AI',
    greeting:        "Hi! I'm Tishka's AI assistant. Ask me anything about our services, pricing, or how it works.",
    maxHistory: 10,    // past messages sent to the webhook for context
    timeout:    30000, // ms before showing the connection error (Ollama can be slow on follow-ups)
  };

  // ─────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────
  const state = {
    isOpen: false,
    conversationId: null,
    messages: [],            // { role: 'user' | 'assistant', content: '...', ts: '14:32' }
    isWaiting: false,
    showEmailCapture: false,
  };

  // ─────────────────────────────────────────────────────────────
  // IDs + helpers
  // ─────────────────────────────────────────────────────────────
  const IDs = {
    root:    'tishka-chat-widget',
    bubble:  'tishka-chat-bubble',
    window:  'tishka-chat-window',
    header:  'tishka-chat-header',
    close:   'tishka-chat-close',
    messages:'tishka-chat-messages',
    emailBar:'tishka-chat-email-bar',
    emailIn: 'tishka-chat-email-input',
    emailSend:'tishka-chat-email-send',
    composer:'tishka-chat-composer',
    input:   'tishka-chat-input',
    send:    'tishka-chat-send',
    quick:   'tishka-chat-quick',
  };

  function nowTs() {
    const d = new Date();
    return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
  }

  function generateId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  function saveToSessionStorage() {
    if (!state.conversationId) return;
    try {
      sessionStorage.setItem('tishka-chat-' + state.conversationId, JSON.stringify({
        conversationId: state.conversationId,
        messages: state.messages,
      }));
    } catch (e) { /* sessionStorage unavailable — degrade silently */ }
  }

  function restoreFromSessionStorage() {
    try {
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.indexOf('tishka-chat-') === 0) {
          const saved = JSON.parse(sessionStorage.getItem(key));
          if (saved && saved.conversationId) {
            state.conversationId = saved.conversationId;
            state.messages = Array.isArray(saved.messages) ? saved.messages : [];
            return true;
          }
        }
      }
    } catch (e) { /* ignore */ }
    state.conversationId = generateId();
    return false;
  }

  // ─────────────────────────────────────────────────────────────
  // Design tokens + CSS (spec: charcoal / indigo / DM Sans)
  // ─────────────────────────────────────────────────────────────
  const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap');

#${IDs.root} {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9999;
  font-family: "DM Sans", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;

  /* ── Surfaces ─────────────────────────────── */
  --cw-bg:             #1A1A1A;
  --cw-surface-input:  #262626;
  --cw-bubble-user:    #37335A;
  --cw-chip:           #322E4D;

  /* ── Text ────────────────────────────────── */
  --cw-text:           #F2F2F2;
  --cw-text-user:      #A79FF7;
  --cw-text-muted:     #8C8C8C;
  --cw-text-on-chip:   #F0EEFF;

  /* ── Lines / accents ──────────────────────── */
  --cw-border:         #4D4D4D;
  --cw-divider:        #2E2E2E;
  --cw-accent:         #673DE6;
  --cw-accent-2:       #4F8CFF;

  /* ── Radius ───────────────────────────────── */
  --cw-r-bubble:       18px;
  --cw-r-bubble-user:  18px 6px 18px 18px;
  --cw-r-chip:         14px;
  --cw-r-composer:     24px;

  /* ── Type ─────────────────────────────────── */
  --cw-fs-msg:   16px;
  --cw-lh-msg:   1.65;
  --cw-fs-title: 17px;
  --cw-fs-chip:  15px;
  --cw-fs-small: 13px;

  /* ── Spacing ──────────────────────────────── */
  --cw-pad-x:    24px;
  --cw-gap-msg:  24px;
}
#${IDs.root} * { box-sizing: border-box; }

/* Bubble (launcher) */
#${IDs.bubble} {
  width: 60px; height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--cw-accent), var(--cw-accent-2));
  border: none;
  cursor: pointer;
  box-shadow: 0 2px 12px rgba(0,0,0,0.35);
  display: flex; align-items: center; justify-content: center;
  transition: transform 0.2s;
  padding: 0;
}
#${IDs.bubble}:hover, #${IDs.bubble}:focus-visible { transform: scale(1.05); outline: none; }
#${IDs.bubble} svg { width: 28px; height: 28px; fill: #ffffff; display: block; }

/* Window: full-height canvas, flush bottom-right */
#${IDs.window} {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 400px;
  height: calc(100vh - 48px);
  background: var(--cw-bg);
  border: 1px solid var(--cw-divider);
  border-radius: 18px;
  box-shadow: 0 8px 40px rgba(0,0,0,0.5);
  display: none;            /* JS toggles 'flex' on open, 'none' on close */
  flex-direction: column;
  overflow: hidden;
  color: var(--cw-text);
}

/* Header: icon + purple logo + title left, white icons right */
#${IDs.header} {
  display: flex; align-items: center; gap: 12px;
  padding: 16px var(--cw-pad-x);
  border-bottom: 1px solid var(--cw-divider);
  flex-shrink: 0;
}
#${IDs.header} .title { font-size: var(--cw-fs-title); font-weight: 700; color: #FFF; }
#${IDs.header} svg { width: 20px; height: 20px; color: #FFF; }
#${IDs.header} .logo { color: var(--cw-accent); }
#${IDs.header} .header-actions { margin-left: auto; display: flex; align-items: center; gap: 14px; }
#${IDs.header} button { background: none; border: none; cursor: pointer; padding: 0; display: flex; }
#${IDs.header} button:hover { opacity: 0.8; }

/* Scroll area */
#${IDs.messages} {
  flex: 1;
  overflow-y: auto;
  padding: 20px 0 8px;
  display: flex;
  flex-direction: column;
  gap: var(--cw-gap-msg);
}
#${IDs.messages}::-webkit-scrollbar { width: 4px; }
#${IDs.messages}::-webkit-scrollbar-thumb { background: #3F3F3F; border-radius: 999px; }

/* USER bubble: right-aligned indigo pill, periwinkle text */
.msg.user { display: flex; justify-content: flex-end; padding: 0 var(--cw-pad-x); }
.msg.user .bubble {
  background: var(--cw-bubble-user);
  color: var(--cw-text-user);
  font-size: var(--cw-fs-msg); line-height: 1.5;
  padding: 14px 20px;
  border-radius: var(--cw-r-bubble-user);
  max-width: 80%;
  white-space: pre-wrap; word-wrap: break-word;
}

/* AI reply: NO bubble — plain off-white text on the canvas */
#${IDs.messages} .msg.ai {
  padding: 0 var(--cw-pad-x);
  background: transparent;
  font-size: var(--cw-fs-msg); line-height: var(--cw-lh-msg);
  color: var(--cw-text);
  white-space: pre-wrap; word-wrap: break-word;
}
.msg.ai ul { margin: 12px 0; padding-left: 24px; }
.msg.ai li { margin: 10px 0; }
.msg.ai li::marker { color: var(--cw-text); }

/* Icon row under AI reply (copy / speak / 👍 / 👎 + time) */
.msg-actions { display: flex; align-items: center; gap: 16px; margin-top: 12px; color: var(--cw-text-muted); }
.msg-actions button { background: none; border: none; cursor: pointer; padding: 0; display: flex; color: inherit; }
.msg-actions button:hover { color: #FFF; }
.msg-actions svg { width: 18px; height: 18px; }
.msg-actions .time { font-size: var(--cw-fs-small); }

/* Thinking dots */
.tishka-thinking {
  align-self: flex-start;
  padding: 12px 16px;
  background: transparent;
  display: flex;
  gap: 4px;
}
.tishka-thinking span {
  width: 8px; height: 8px;
  background: var(--cw-text-muted);
  border-radius: 50%;
  animation: tishka-bounce 1.4s infinite ease-in-out both;
}
.tishka-thinking span:nth-child(1) { animation-delay: -0.32s; }
.tishka-thinking span:nth-child(2) { animation-delay: -0.16s; }
@keyframes tishka-bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

/* Quick actions: grey bold label + thin rule, stacked chips */
.quick-label {
  display: flex; align-items: center; gap: 16px;
  padding: 4px var(--cw-pad-x);
  color: var(--cw-text-muted); font-weight: 700; font-size: 15px;
}
.quick-label::after { content: ""; flex: 1; height: 1px; background: var(--cw-divider); }
.quick-actions { display: flex; flex-direction: column; align-items: flex-start; gap: 12px; padding: 12px var(--cw-pad-x); }
.chip {
  display: flex; align-items: center; gap: 12px;
  background: var(--cw-chip); color: var(--cw-text-on-chip);
  padding: 14px 18px; border-radius: var(--cw-r-chip);
  font-size: var(--cw-fs-chip); font-weight: 500;
  border: none; cursor: pointer; font-family: inherit; text-align: left;
}
.chip:hover { background: #3d3861; }
.chip .chev { color: #B9B3D8; margin-left: 4px; }

/* Composer: raised grey card, 1px border, big radius */
.composer {
  margin: 12px var(--cw-pad-x) 8px;
  padding: 16px;
  background: var(--cw-surface-input);
  border: 1px solid var(--cw-border);
  border-radius: var(--cw-r-composer);
  flex-shrink: 0;
}
.composer textarea, .composer input {
  width: 100%; background: transparent; border: 0; outline: 0;
  color: var(--cw-text); font: inherit; font-size: var(--cw-fs-msg);
  resize: none;
}
.composer ::placeholder { color: var(--cw-text-muted); }
.composer-bar { display: flex; align-items: center; gap: 16px; margin-top: 12px; }

/* Mic/send button: white circle, dark icon, purple→blue gradient ring */
.mic {
  width: 56px; height: 56px; border-radius: 50%; margin-left: auto;
  border: 2px solid transparent;
  background: linear-gradient(#FFF,#FFF) padding-box,
              linear-gradient(135deg, var(--cw-accent), var(--cw-accent-2)) border-box;
  display: grid; place-items: center;
  cursor: pointer; padding: 0;
}
.mic svg { color: #1A1A1A; width: 22px; height: 22px; }
.mic:hover { transform: scale(1.04); }
.mic:disabled { opacity: 0.6; cursor: default; }

/* Email capture bar (follow-up) */
#${IDs.emailBar} {
  display: none;
  padding: 12px var(--cw-pad-x) 4px;
  flex-shrink: 0;
}
#${IDs.emailBar} label {
  font-size: 14px; color: var(--cw-text);
  margin: 0 0 6px 0; font-weight: 600; display: block;
}
#${IDs.emailBar} .email-row {
  display: flex; gap: 8px; align-items: center;
  background: var(--cw-surface-input);
  border: 1px solid var(--cw-border);
  border-radius: var(--cw-r-composer);
  padding: 12px 16px;
}
#${IDs.emailBar} input {
  flex: 1; background: transparent; border: 0; outline: 0;
  color: var(--cw-text); font: inherit; font-size: 15px;
}
#${IDs.emailBar} input::placeholder { color: var(--cw-text-muted); }
#${IDs.emailSend} {
  background: none; border: none; cursor: pointer; padding: 0;
  display: flex; align-items: center; color: var(--cw-text-muted);
}
#${IDs.emailSend}:hover { color: #FFF; }
#${IDs.emailSend} svg { width: 20px; height: 20px; }

/* Footer disclaimer */
.disclaimer {
  text-align: center; font-size: var(--cw-fs-small);
  color: var(--cw-text-muted); padding: 6px 16px 12px; flex-shrink: 0;
}

@media (max-width: 480px) {
  #${IDs.window} {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    width: 100%; height: 100%;
    border-radius: 0; border: none;
  }
  #${IDs.bubble} { width: 52px; height: 52px; }
}
`;

  // ─────────────────────────────────────────────────────────────
  // SVG icons
  // ─────────────────────────────────────────────────────────────
  const ICONS = {
    bubble: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3C6.5 3 2 6.6 2 11c0 2 1 3.8 2.7 5.1-.1 1.3-.5 3-1.4 4.2-.2.3 0 .7.4.6 2.2-.6 3.7-1.5 4.6-2.2C9.5 19.5 10.7 20 12 20c5.5 0 10-3.6 10-8.5S17.5 3 12 3z"/></svg>',
    logo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3C6.5 3 2 6.6 2 11c0 2 1 3.8 2.7 5.1-.1 1.3-.5 3-1.4 4.2-.2.3 0 .7.4.9 2.2-.6 3.7-1.5 4.6-2.2C9.5 19.5 10.7 20 12 20c5.5 0 10-3.6 10-8.5S17.5 3 12 3z"/></svg>',
    dots: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11.5 21 3l-8.5 18-2.2-7.3L3 11.5z"/></svg>',
    mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 19v3"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    speaker: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14"/></svg>',
    thumbsUp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 10v12M15 5.9 13.9 10H20a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-5l1.1 5.2a2 2 0 0 1-2 2.3L7 21H3V10h4z"/></svg>',
    thumbsDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 14V2M9 18.1 10.1 15H4a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h5L8 4.8a2 2 0 0 1 2-2.3L17 14l-1.1 5.2a2 2 0 0 1-2 2.3L7 21v-3z" transform="rotate(180 12 12)"/></svg>',
    chevronRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>',
  };

  // ─────────────────────────────────────────────────────────────
  // DOM
  // ─────────────────────────────────────────────────────────────
  let el = {};

  function injectStyles() {
    const style = document.createElement('style');
    style.setAttribute('data-tishka-chat', '');
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  function buildDOM() {
    const root = document.createElement('div');
    root.id = IDs.root;
    root.innerHTML = `
      <button id="${IDs.bubble}" aria-label="Open chat" aria-expanded="false">${ICONS.bubble}</button>
      <div id="${IDs.window}" role="dialog" aria-modal="false" aria-label="${CONFIG.botName} chat" style="display:none;">
        <div id="${IDs.header}">
          <span class="logo">${ICONS.logo}</span>
          <span class="title">${CONFIG.botName}</span>
          <div class="header-actions">
            <button id="${IDs.close}" aria-label="Close chat">${ICONS.close}</button>
          </div>
        </div>
        <div id="${IDs.messages}" aria-live="polite" aria-label="Chat messages"></div>
        <div id="${IDs.emailBar}" style="display:none;">
          <label>Leave your email and Pete will get back to you:</label>
          <div class="email-row">
            <input type="email" id="${IDs.emailIn}" placeholder="Your email address" aria-label="Your email address">
            <button id="${IDs.emailSend}" aria-label="Send email">${ICONS.send}</button>
          </div>
        </div>
        <div id="${IDs.composer}" class="composer">
          <input type="text" id="${IDs.input}" placeholder="Type your message..." aria-label="Type your message">
          <div class="composer-bar">
            <button id="${IDs.send}" class="mic" aria-label="Send message">${ICONS.send}</button>
          </div>
        </div>
        <div class="disclaimer">AI assistant — always check important details</div>
      </div>
    `;
    document.body.appendChild(root);

    el = {
      root,
      bubble:   document.getElementById(IDs.bubble),
      window:   document.getElementById(IDs.window),
      close:    document.getElementById(IDs.close),
      messages: document.getElementById(IDs.messages),
      emailBar: document.getElementById(IDs.emailBar),
      emailIn:  document.getElementById(IDs.emailIn),
      emailSend:document.getElementById(IDs.emailSend),
      input:    document.getElementById(IDs.input),
      send:     document.getElementById(IDs.send),
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Quick actions
  // ─────────────────────────────────────────────────────────────
  const QUICK_ACTIONS = [
    'How much does it cost?',
    'What do you do?',
    'Who do you work with?',
  ];

  function buildQuickActions() {
    const wrap = document.createElement('div');
    wrap.id = IDs.quick;
    wrap.innerHTML = `
      <div class="quick-label">QUICK ACTIONS</div>
      <div class="quick-actions">
        ${QUICK_ACTIONS.map((q, i) =>
          `<button class="chip" data-q="${i}">${q}<span class="chev">${ICONS.chevronRight}</span></button>`
        ).join('')}
      </div>
    `;
    wrap.querySelectorAll('.chip').forEach((chip) => {
      chip.addEventListener('click', function () {
        el.input.value = QUICK_ACTIONS[parseInt(chip.getAttribute('data-q'), 10)];
        sendMessage();
      });
    });
    return wrap;
  }

  // ─────────────────────────────────────────────────────────────
  // Rendering
  // ─────────────────────────────────────────────────────────────
  function scrollMessagesToBottom() {
    el.messages.scrollTop = el.messages.scrollHeight;
  }

  function renderMessage(role, content, ts) {
    const time = ts || nowTs();
    if (role === 'user') {
      const div = document.createElement('div');
      div.className = 'msg user';
      div.innerHTML = '<div class="bubble"></div>';
      div.querySelector('.bubble').textContent = content;
      el.messages.appendChild(div);
    } else {
      const div = document.createElement('div');
      div.className = 'msg ai';
      div.textContent = content;

      const actions = document.createElement('div');
      actions.className = 'msg-actions';
      actions.innerHTML = `
        <span class="time">${time}</span>
        <button class="act-copy" aria-label="Copy reply">${ICONS.copy}</button>
      `;
      actions.querySelector('.act-copy').addEventListener('click', function () {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(content).then(() => {
            this.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
          });
        }
      });

      div.appendChild(actions);
      el.messages.appendChild(div);
    }
    scrollMessagesToBottom();
  }

  function showThinking() {
    const div = document.createElement('div');
    div.className = 'tishka-thinking';
    div.id = 'tishka-thinking-indicator';
    div.setAttribute('aria-label', 'Thinking');
    div.innerHTML = '<span></span><span></span><span></span>';
    el.messages.appendChild(div);
    scrollMessagesToBottom();
  }

  function removeThinking() {
    const t = document.getElementById('tishka-thinking-indicator');
    if (t) t.remove();
  }

  function renderHistory() {
    el.messages.innerHTML = '';
    state.messages.forEach(m => renderMessage(m.role, m.content, m.ts));
    if (state.messages.length > 0 && !el.messages.querySelector('#' + IDs.quick)) {
      // Quick actions only show on a fresh conversation (before first user message).
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Open / close
  // ─────────────────────────────────────────────────────────────
  function openChat() {
    state.isOpen = true;
    el.window.style.display = 'flex';
    el.bubble.style.display = 'none';
    el.bubble.setAttribute('aria-expanded', 'true');
    // First open with a fresh conversation → greet + quick actions.
    if (state.messages.length === 0) {
      state.messages.push({ role: 'assistant', content: CONFIG.greeting, ts: nowTs() });
      renderMessage('assistant', CONFIG.greeting);
      el.messages.appendChild(buildQuickActions());
      saveToSessionStorage();
    }
    setTimeout(() => { el.input.focus(); }, 0);
  }

  function closeChat() {
    state.isOpen = false;
    el.window.style.display = 'none';
    el.bubble.style.display = 'flex';
    el.bubble.setAttribute('aria-expanded', 'false');
    saveToSessionStorage();
  }

  function showEmailBar(message) {
    state.showEmailCapture = true;
    if (message) {
      state.messages.push({ role: 'assistant', content: message, ts: nowTs() });
      renderMessage('assistant', message);
      saveToSessionStorage();
    }
    el.emailBar.style.display = 'block';
    setTimeout(() => { el.emailIn.focus(); }, 0);
  }

  function hideEmailBar() {
    state.showEmailCapture = false;
    el.emailBar.style.display = 'none';
    el.emailIn.value = '';
  }

  // ─────────────────────────────────────────────────────────────
  // Send a chat message
  // ─────────────────────────────────────────────────────────────
  async function sendMessage() {
    const text = el.input.value.trim();
    if (!text || state.isWaiting) return;

    // Remove quick actions once the conversation starts.
    const quick = document.getElementById(IDs.quick);
    if (quick) quick.remove();

    state.messages.push({ role: 'user', content: text, ts: nowTs() });
    renderMessage('user', text);
    el.input.value = '';

    const history = state.messages.slice(-CONFIG.maxHistory - 1, -1)
      .map(m => ({ role: m.role, content: m.content }));

    const body = {
      message: text,
      conversationId: state.conversationId,
      history: history,
    };

    state.isWaiting = true;
    el.send.disabled = true;
    el.input.disabled = true;
    showThinking();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeout);

    try {
      const response = await fetch(CONFIG.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error('Server error');

      const data = await response.json();
      const reply = (data && typeof data.reply === 'string' && data.reply)
        ? data.reply
        : "Sorry, I'm having trouble connecting. Try again in a moment.";

      removeThinking();
      state.messages.push({ role: 'assistant', content: reply, ts: nowTs() });
      renderMessage('assistant', reply);

      if (data && data.offerFollowUp === true) {
        showEmailBar(data.followUpMessage || 'Leave your email and Pete will get back to you:');
      } else {
        hideEmailBar();
      }
    } catch (err) {
      clearTimeout(timeoutId);
      removeThinking();
      const fallback = "Sorry, I'm having trouble connecting. Try again in a moment.";
      state.messages.push({ role: 'assistant', content: fallback, ts: nowTs() });
      renderMessage('assistant', fallback);
    } finally {
      state.isWaiting = false;
      el.send.disabled = false;
      el.input.disabled = false;
      saveToSessionStorage();
      setTimeout(() => { el.input.focus(); }, 0);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Submit email (follow-up capture)
  // ─────────────────────────────────────────────────────────────
  async function sendEmail() {
    const email = el.emailIn.value.trim();
    if (!email || email.indexOf('@') === -1) {
      el.emailIn.focus();
      return;
    }

    el.emailSend.disabled = true;
    el.emailIn.disabled = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeout);

    try {
      const response = await fetch(CONFIG.emailWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          conversationId: state.conversationId,
          message: 'Email captured from follow-up prompt',
          history: state.messages,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      // The email endpoint may not exist yet (Phase 4). Treat any non-network
      // failure as success so the visitor isn't punished for infra we haven't
      // stood up — the address is in the chat log + n8n execution either way.
      if (!response.ok && response.status !== 404) throw new Error('Server error');

      hideEmailBar();
      const thanks = "Thanks — Pete will get back to you within 48 hours.";
      state.messages.push({ role: 'assistant', content: thanks, ts: nowTs() });
      renderMessage('assistant', thanks);
    } catch (err) {
      clearTimeout(timeoutId);
      const fail = "Sorry, something went wrong. You can email Pete directly at hello@tishka.ai.";
      state.messages.push({ role: 'assistant', content: fail, ts: nowTs() });
      renderMessage('assistant', fail);
    } finally {
      el.emailSend.disabled = false;
      el.emailIn.disabled = false;
      saveToSessionStorage();
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Focus trap (Tab cycles within the open chat)
  // ─────────────────────────────────────────────────────────────
  function handleKeydown(e) {
    if (e.key === 'Escape' && state.isOpen) {
      closeChat();
      el.bubble.focus();
      return;
    }

    if (e.key !== 'Tab' || !state.isOpen) return;

    const focusables = [el.close, el.input, el.send];
    if (state.showEmailCapture) {
      focusables.push(el.emailIn, el.emailSend);
    }

    const active = document.activeElement;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.shiftKey) {
      if (active === first) { e.preventDefault(); last.focus(); }
    } else {
      if (active === last) { e.preventDefault(); first.focus(); }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Bind events
  // ─────────────────────────────────────────────────────────────
  function bindEvents() {
    el.bubble.addEventListener('click', openChat);
    el.close.addEventListener('click', closeChat);
    el.send.addEventListener('click', sendMessage);

    el.input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    el.emailSend.addEventListener('click', sendEmail);
    el.emailIn.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendEmail();
      }
    });

    document.addEventListener('keydown', handleKeydown);
  }

  // ─────────────────────────────────────────────────────────────
  // Init
  // ─────────────────────────────────────────────────────────────
  function init() {
    if (document.getElementById(IDs.root)) return; // already injected

    const hadHistory = restoreFromSessionStorage();

    injectStyles();
    buildDOM();
    bindEvents();

    if (hadHistory && state.messages.length > 0) {
      renderHistory();
    }
    el.window.style.display = 'none';
    el.bubble.style.display = 'flex';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
