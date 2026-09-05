/**
 * Tishka AI — Chat Widget
 * Self-contained: CSS + HTML + JS in one file. No dependencies, no build step.
 * Drop a <script src="chat-widget.js"></script> before </body> and it self-initialises.
 *
 * Design: site tokens (resource/site.css, reference page Drafts/index-v2.html) —
 * Schibsted Grotesk display + Archivo body, paper/ink surfaces, 6px radii,
 * full light/dark mirror. Consumes the page's CSS custom properties with
 * same-name legacy fallbacks, so it follows whatever page it sits on.
 * Spec: Claude/Business/Website/chat-widget-spec.md + style-guide.md
 *
 * Talks to the n8n chatbot workflow:
 *   POST <webhookUrl>  →  { message, conversationId, history }
 *   ← { reply, offerFollowUp, followUpMessage }
 */

(function () {
  'use strict';

  // ─────────────────────────────────────────────────────────────
  // CONFIG — edit here. Live webhooks point at the PikaPods n8n instance.
  // ─────────────────────────────────────────────────────────────
  const CONFIG = {
    enabled:           true,    // LIVE — chat bubble shown
    webhookUrl:      'https://armored-perch.pikapod.net/webhook/chat',        // n8n chat endpoint (live PikaPods)
    emailWebhookUrl: 'https://armored-perch.pikapod.net/webhook/chat-email',  // email capture endpoint (live PikaPods)
    botName:         'Tishka AI',
    greeting:        "Hi! I'm Tishka's AI assistant. Ask me anything about our services or how we work.",
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

  // Page-push: while the panel is open the page shifts left instead of
  // being covered (Pete, 2026-09-04). Class goes on <html> + <body>.
  const PUSH_CLASS = 'tishka-chat-open';

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
  // Design tokens + CSS (site identity: paper/ink, Archivo + Schibsted Grotesk)
  // ─────────────────────────────────────────────────────────────
  const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=Schibsted+Grotesk:wght@400;700;800&display=swap');

#${IDs.root} {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9999;
  font-family: var(--font-body, "Archivo", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);

  /* ── Site tokens (resource/site.css) ─────────────────────
     Resolved from the host page, then from legacy same-name
     vars on older pages, then the light identity as fallback. */
  --cw-canvas:     var(--paper, var(--bg, #f6f6f3));
  --cw-raise:      var(--raise, var(--bg-card, #ffffff));
  --cw-border:     var(--border, #e3e3dc);
  --cw-ink:        var(--ink, var(--text, #17171b));
  --cw-muted:      var(--muted, var(--text-muted, #5b5b64));
  --cw-btn-bg:     var(--btn-bg, var(--accent, var(--text, #17171b)));
  --cw-btn-fg:     var(--btn-fg, var(--bg, #ffffff));
  --cw-btn-hover:  var(--btn-bg-hover, color-mix(in srgb, var(--cw-btn-bg) 88%, var(--cw-canvas) 12%));
  --cw-ghost:      var(--ghost-bg, var(--cw-raise));
  --cw-ghost-hover: var(--ghost-hover, color-mix(in srgb, var(--cw-ghost) 92%, var(--cw-ink) 8%));
  /* Input well: a recessed surface inside the raised panel —
     kept light (Pete: the band grey read too dark), half band / half card */
  --cw-well:       color-mix(in srgb, var(--cw-raise) 55%, var(--band, var(--cw-canvas)) 45%);
  --cw-font-display: var(--font-display, "Schibsted Grotesk", "Archivo", sans-serif);

  /* ── Type (site rule: 18px reading text, 16px floor) ────── */
  --cw-fs-msg: 1.125rem;   /* 18px — messages + typed input */
  --cw-fs-ui:  1rem;       /* 16px — title, labels, times, disclaimer */

  /* ── Shape (site rule: 6px buttons, 12px cards) ─────────── */
  --cw-r-btn:  6px;
  --cw-r-card: 12px;

  /* ── Spacing ─────────────────────────────────────────────── */
  --cw-pad-x:   20px;
  --cw-gap-msg: 22px;
}
#${IDs.root} * { box-sizing: border-box; }

/* Focus — same rule as every site element.
   Exception (Pete, 2026-09-04): text fields drop the outline ring —
   the caret + the composer card border are the focus indication. */
#${IDs.root} :focus-visible { outline: 2px solid var(--cw-ink); outline-offset: 2px; }
#${IDs.root} input:focus-visible,
#${IDs.root} textarea:focus-visible { outline: none; }

/* Bubble (launcher): the site's primary button as a floating action */
#${IDs.bubble} {
  width: 60px; height: 60px;
  border-radius: var(--cw-r-btn);
  background: var(--cw-btn-bg);
  border: none;
  cursor: pointer;
  box-shadow: 0 2px 12px rgba(0,0,0,0.22);
  display: flex; align-items: center; justify-content: center;
  padding: 0;
}
#${IDs.bubble}:hover { background: var(--cw-btn-hover); }
#${IDs.bubble}:active { transform: scale(0.97); }
#${IDs.bubble} svg { width: 26px; height: 26px; fill: var(--cw-btn-fg); display: block; }

/* Window: a raised site card, flush bottom-right.
   Raised surface (not the page colour) so the panel reads as its own
   thing (Pete, 2026-09-04); 1px border is the edge, no drop shadow.
   Height is set by JS at open time: panel stops at the header's bottom
   edge (Pete: up to the top nav bar, never over it). */
#${IDs.window} {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 400px;
  height: calc(100vh - 48px);
  background: var(--cw-raise);
  border: 1px solid var(--cw-border);
  border-radius: var(--cw-r-card);
  box-shadow: none;
  display: none;            /* JS toggles 'flex' on open, 'none' on close */
  flex-direction: column;
  overflow: hidden;
  color: var(--cw-ink);
}

/* Header: chat glyph + name left, close right */
#${IDs.header} {
  display: flex; align-items: center; gap: 10px;
  padding: 14px var(--cw-pad-x);
  border-bottom: 1px solid var(--cw-border);
  flex-shrink: 0;
}
#${IDs.header} .title {
  font-family: var(--cw-font-display);
  font-size: var(--cw-fs-ui);
  font-weight: 700;
  color: var(--cw-ink);
}
#${IDs.header} .logo { color: var(--cw-ink); display: flex; }
#${IDs.header} .logo svg { width: 20px; height: 20px; }
#${IDs.header} .header-actions { margin-left: auto; display: flex; align-items: center; }
#${IDs.header} button {
  background: none; border: none; cursor: pointer; padding: 2px;
  display: flex; color: var(--cw-muted);
}
#${IDs.header} button:hover { color: var(--cw-ink); }
#${IDs.header} button svg { width: 20px; height: 20px; }

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
#${IDs.messages}::-webkit-scrollbar-thumb { background: var(--cw-border); border-radius: 999px; }

/* USER message: the site's primary button colour, right-aligned */
.msg.user { display: flex; justify-content: flex-end; padding: 0 var(--cw-pad-x); }
.msg.user .bubble {
  background: var(--cw-btn-bg);
  color: var(--cw-btn-fg);
  font-size: var(--cw-fs-msg); line-height: 1.5;
  padding: 12px 16px;
  border-radius: var(--cw-r-btn);
  max-width: 80%;
  white-space: pre-wrap; word-wrap: break-word;
}

/* AI reply: plain text on the canvas — no bubble, no decoration */
#${IDs.messages} .msg.ai {
  padding: 0 var(--cw-pad-x);
  background: transparent;
  font-size: var(--cw-fs-msg); line-height: 1.55;
  color: var(--cw-ink);
  white-space: pre-wrap; word-wrap: break-word;
}
.msg.ai ul { margin: 12px 0; padding-left: 24px; }
.msg.ai li { margin: 10px 0; }
.msg.ai li::marker { color: var(--cw-muted); }
.msg.ai a { color: var(--cw-ink); text-decoration: underline; text-underline-offset: 2px; }
.msg.ai a:hover { text-decoration-thickness: 2px; }

/* Icon row under AI reply (copy + time) */
.msg-actions { display: flex; align-items: center; gap: 16px; margin-top: 10px; color: var(--cw-muted); }
.msg-actions button { background: none; border: none; cursor: pointer; padding: 0; display: flex; color: inherit; }
.msg-actions button:hover { color: var(--cw-ink); }
.msg-actions svg { width: 18px; height: 18px; }
.msg-actions .time { font-size: var(--cw-fs-ui); }

/* Thinking dots */
.tishka-thinking {
  align-self: flex-start;
  padding: 4px var(--cw-pad-x);
  background: transparent;
  display: flex;
  gap: 4px;
}
.tishka-thinking span {
  width: 8px; height: 8px;
  background: var(--cw-muted);
  border-radius: 50%;
  animation: tishka-bounce 1.4s infinite ease-in-out both;
}
.tishka-thinking span:nth-child(1) { animation-delay: -0.32s; }
.tishka-thinking span:nth-child(2) { animation-delay: -0.16s; }
@keyframes tishka-bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

/* Quick actions: muted label + hairline, stacked ghost buttons */
.quick-label {
  display: flex; align-items: center; gap: 16px;
  padding: 4px var(--cw-pad-x);
  color: var(--cw-muted); font-weight: 600; font-size: var(--cw-fs-ui);
}
.quick-label::after { content: ""; flex: 1; height: 1px; background: var(--cw-border); }
.quick-actions { display: flex; flex-direction: column; align-items: stretch; gap: 10px; padding: 12px var(--cw-pad-x); }
.chip {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  background: var(--cw-ghost); color: var(--cw-ink);
  border: 1px solid var(--cw-border);
  padding: 12px 16px; border-radius: var(--cw-r-btn);
  font-size: var(--cw-fs-ui); font-weight: 600;
  font-family: inherit; text-align: left; cursor: pointer;
}
.chip:hover { background: var(--cw-ghost-hover); }

/* Composer: recessed input well, 1px border, button radius */
.composer {
  margin: 12px var(--cw-pad-x) 8px;
  padding: 14px 16px;
  background: var(--cw-well);
  border: 1px solid var(--cw-border);
  border-radius: var(--cw-r-btn);
  flex-shrink: 0;
}
.composer textarea, .composer input {
  width: 100%; background: transparent; border: 0; outline: 0;
  color: var(--cw-ink); font: inherit; font-size: var(--cw-fs-msg);
  resize: none;
}
.composer ::placeholder { color: var(--cw-muted); }
.composer-bar { display: flex; align-items: center; gap: 16px; margin-top: 10px; }

/* Send button: up-pointing arrow (Pete, 2026-09-04) on the band token —
   a clearly darker shade of the input well (the well is white+band; the
   button is the band end of that blend). Hover darkens slightly. */
.send-btn {
  width: 44px; height: 44px; border-radius: var(--cw-r-btn); margin-left: auto;
  border: none;
  background: var(--band, var(--cw-canvas));
  display: grid; place-items: center;
  cursor: pointer; padding: 0;
}
.send-btn svg { color: var(--cw-ink); width: 20px; height: 20px; }
.send-btn:hover { filter: brightness(0.94); }
.send-btn:disabled { opacity: 0.5; cursor: default; }

/* Dark theme only (Pete, 2026-09-04): the button sits a little lighter
   than the input well (well + a touch of ink-light). */
html[data-theme="dark"] .send-btn {
  background: color-mix(in srgb, var(--cw-well) 88%, var(--cw-ink) 12%);
}

/* Email capture bar (follow-up) */
#${IDs.emailBar} {
  display: none;
  padding: 12px var(--cw-pad-x) 4px;
  flex-shrink: 0;
}
#${IDs.emailBar} label {
  font-size: var(--cw-fs-ui); color: var(--cw-ink);
  margin: 0 0 6px 0; font-weight: 600; display: block;
}
#${IDs.emailBar} .email-row {
  display: flex; gap: 8px; align-items: center;
  background: var(--cw-well);
  border: 1px solid var(--cw-border);
  border-radius: var(--cw-r-btn);
  padding: 10px 14px;
}
#${IDs.emailBar} input {
  flex: 1; background: transparent; border: 0; outline: 0;
  color: var(--cw-ink); font: inherit; font-size: var(--cw-fs-ui);
}
#${IDs.emailBar} input::placeholder { color: var(--cw-muted); }
#${IDs.emailSend} {
  background: none; border: none; cursor: pointer; padding: 0;
  display: flex; align-items: center; color: var(--cw-muted);
}
#${IDs.emailSend}:hover { color: var(--cw-ink); }
#${IDs.emailSend} svg { width: 20px; height: 20px; }

/* Footer disclaimer — 14px per Pete, 2026-09-04 (the one text below the
   16px floor on the site; flagged in style-guide.md) */
.disclaimer {
  text-align: center; font-size: var(--text-chip, 0.875rem);
  color: var(--cw-muted); padding: 6px 16px 12px; flex-shrink: 0;
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

/* Push, not overlay (Pete, 2026-09-04): the page content moves left to
   make room while the panel is open. Panel is 400px + 24px right offset;
   448px keeps a 24px gutter. Below 768px the panel overlays as before
   (it goes full-screen under 480px). Sticky headers shift with the body. */
body { transition: margin-right 0.25s ease; }
@media (min-width: 768px) {
  html.${PUSH_CLASS} { background: var(--paper, var(--bg, #f6f6f3)); }
  html.${PUSH_CLASS} body { margin-right: 448px; }
}
`;

  // ─────────────────────────────────────────────────────────────
  // SVG icons
  // ─────────────────────────────────────────────────────────────
  const ICONS = {
    bubble: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3C6.5 3 2 6.6 2 11c0 2 1 3.8 2.7 5.1-.1 1.3-.5 3-1.4 4.2-.2.3 0 .7.4.6 2.2-.6 3.7-1.5 4.6-2.2C9.5 19.5 10.7 20 12 20c5.5 0 10-3.6 10-8.5S17.5 3 12 3z"/></svg>',
    logo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3C6.5 3 2 6.6 2 11c0 2 1 3.8 2.7 5.1-.1 1.3-.5 3-1.4 4.2-.2.3 0 .7.4.9 2.2-.6 3.7-1.5 4.6-2.2C9.5 19.5 10.7 20 12 20c5.5 0 10-3.6 10-8.5S17.5 3 12 3z"/></svg>',
    dots: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>',
    mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 19v3"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    speaker: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14"/></svg>',
    thumbsUp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 10v12M15 5.9 13.9 10H20a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-5l1.1 5.2a2 2 0 0 1-2 2.3L7 21H3V10h4z"/></svg>',
    thumbsDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 14V2M9 18.1 10.1 15H4a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h5L8 4.8a2 2 0 0 1 2-2.3L17 14l-1.1 5.2a2 2 0 0 1-2 2.3L7 21v-3z" transform="rotate(180 12 12)"/></svg>',
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
            <button id="${IDs.send}" class="send-btn" aria-label="Send message">${ICONS.send}</button>
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
      <div class="quick-label">Quick actions</div>
      <div class="quick-actions">
        ${QUICK_ACTIONS.map((q, i) =>
          `<button class="chip" data-q="${i}">${q}</button>`
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

  // Bot text renders as plain text, but markdown-style [label](url) links and
  // bare URLs become real anchors, so raw brackets never show in the chat
  // (Pete, 2026-09-05). Everything else stays escaped plain text.
  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function linkifyAiText(content) {
    const LINK_RE = /\[([^\]\n]+)\]\(([^)\s]+)\)|(?:https?:\/\/|www\.)[^\s<]+|\btishka\.ai\/[^\s<,."')]+/g;
    let text = escapeHtml(content)
      .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')   // **bold** → bold, never raw asterisks
      .replace(/(^|\n)#{1,4}\s+/g, '$1');                     // heading hashes stripped
    return text.replace(LINK_RE, function (m, label, url) {
      const a = 'target="_blank" rel="noopener"';
      if (label !== undefined) {
        return '<a href="' + url + '" ' + a + '>' + label + '</a>';
      }
      const trail = (m.match(/[.,;:!?)\]]+$/) || [''])[0];
      const addr = m.slice(0, m.length - trail.length);
      const href = addr.indexOf('http') === 0 || addr.indexOf('www.') === 0 ? (addr.indexOf('www.') === 0 ? 'https://' + addr : addr) : 'https://' + addr;
      return '<a href="' + href + '" ' + a + '>' + addr + '</a>' + trail;
    });
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
      div.innerHTML = linkifyAiText(content);

      const actions = document.createElement('div');
      actions.className = 'msg-actions';
      actions.innerHTML = `
        <span class="time">${time}</span>
        <button class="act-copy" aria-label="Copy reply">${ICONS.copy}</button>
      `;
      actions.querySelector('.act-copy').addEventListener('click', function () {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(content).then(() => {
            this.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
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
  // Panel height: from the header's bottom edge down to the 24px
  // bottom gap. Falls back to the CSS height when no header exists.
  function updatePanelHeight() {
    if (!state.isOpen) return;
    if (window.matchMedia('(max-width: 480px)').matches) {
      el.window.style.height = ''; // full-screen media query wins
      return;
    }
    let top = 24; // no header → keep the CSS default top gap
    const headerEl = document.querySelector('header');
    if (headerEl) {
      const rect = headerEl.getBoundingClientRect();
      if (rect.bottom > 0 && rect.bottom < window.innerHeight) top = rect.bottom;
    }
    const height = Math.max(320, window.innerHeight - top - 24);
    el.window.style.height = height + 'px';
  }

  function openChat() {
    state.isOpen = true;
    el.window.style.display = 'flex';
    el.bubble.style.display = 'none';
    el.bubble.setAttribute('aria-expanded', 'true');
    updatePanelHeight();
    document.documentElement.classList.add(PUSH_CLASS);
    document.body.classList.add(PUSH_CLASS);
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
    document.documentElement.classList.remove(PUSH_CLASS);
    document.body.classList.remove(PUSH_CLASS);
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
      const fail = "Sorry, something went wrong. You can email Pete directly at pete@tishka.ai.";
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
  // Click-away (Pete, 2026-09-04): any click outside the widget closes it.
  function handleOutsideClick(e) {
    if (!state.isOpen) return;
    if (el.root && el.root.contains(e.target)) return; // bubble + panel + controls
    closeChat();
  }

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
    document.addEventListener('click', handleOutsideClick);
    window.addEventListener('resize', updatePanelHeight);
  }

  // ─────────────────────────────────────────────────────────────
  // Init
  // ─────────────────────────────────────────────────────────────
  function init() {
    if (!CONFIG.enabled) return; // hidden — flip CONFIG.enabled to true to show
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
