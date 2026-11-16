/* Content script: shows the decoded token in a floating panel next to the
   selection. It is injected on demand by the service worker after the user
   picks "JWT Decode" in the context menu. The panel lives in a shadow root so
   the page styles cannot affect it. */

(() => {
  if (globalThis.__jwtDecoderLoaded) return;
  globalThis.__jwtDecoderLoaded = true;

  const t = (key, substitutions) => {
    try {
      return chrome.i18n.getMessage(key, substitutions) || key;
    } catch {
      return key;
    }
  };

  const HOST_ID = 'jwt-decoder-panel';
  const CLOSE_ICON = '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8"/></svg>';
  const COPY_ICON = '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="5.5" y="5.5" width="8" height="8" rx="1.5"/><path d="M10.5 5.5v-2a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2"/></svg>';

  let host = null;
  let shadow = null;
  let panel = null;
  let result = null;
  let styleReady = false;
  let cssPromise = null;
  let toastTimer = 0;

  /* ---------------------------------------------------------------- theme */

  function detectTheme () {
    const html = document.documentElement;
    const body = document.body;
    const explicit =
      (html && html.getAttribute('data-color-mode')) ||
      (html && html.getAttribute('data-theme')) ||
      (body && body.getAttribute('data-color-mode')) ||
      (body && body.getAttribute('data-theme')) ||
      '';

    if (/dark/i.test(explicit)) return 'dark';
    if (/light/i.test(explicit)) return 'light';

    const parseColor = (value) => {
      const match = String(value || '').match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?/i);
      if (!match) return null;
      const [r, g, b] = match.slice(1, 4).map(Number);
      const alpha = match[4] == null ? 1 : Number(match[4]);
      return { r, g, b, alpha };
    };

    const bodyColor = body && parseColor(getComputedStyle(body).backgroundColor);
    const htmlColor = html && parseColor(getComputedStyle(html).backgroundColor);
    const color = bodyColor && bodyColor.alpha > 0.2 ? bodyColor : htmlColor;

    if (color && color.alpha > 0.2) {
      const luminance = (0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b) / 255;
      if (luminance < 0.42) return 'dark';
      if (luminance > 0.58) return 'light';
    }

    return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  /* ---------------------------------------------------------------- shell */

  function loadStyles () {
    if (!cssPromise) {
      cssPromise = fetch(chrome.runtime.getURL('src/jwd.css'))
        .then((response) => response.text())
        .catch(() => '');
    }
    return cssPromise;
  }

  function ensureHost () {
    if (host && host.isConnected && shadow) return host;

    host = document.createElement('div');
    host.id = HOST_ID;
    shadow = host.attachShadow({ mode: 'open' });
    styleReady = false;
    panel = null;
    (document.body || document.documentElement).appendChild(host);
    return host;
  }

  function close () {
    clearTimeout(toastTimer);
    if (host) host.remove();
    host = null;
    shadow = null;
    panel = null;
    styleReady = false;
    result = null;
  }

  function iconButton (icon, label, attributes) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'jwd-icon';
    button.title = label;
    button.setAttribute('aria-label', label);
    button.innerHTML = icon;
    for (const [name, value] of Object.entries(attributes || {})) {
      button.setAttribute(name, value);
    }
    return button;
  }

  function selectionRect () {
    const selection = window.getSelection && window.getSelection();
    if (!selection || !selection.rangeCount) return null;

    const range = selection.getRangeAt(0);
    if (range.collapsed) return null;

    const rects = range.getClientRects();
    const rect = rects && rects.length
      ? rects[rects.length - 1]
      : range.getBoundingClientRect();

    if (!rect || (!rect.width && !rect.height)) return null;
    return rect;
  }

  function positionPanel (element) {
    element.style.visibility = 'hidden';
    element.style.left = '0px';
    element.style.top = '0px';

    const box = element.getBoundingClientRect();
    const anchor = selectionRect();
    const margin = 12;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left;
    let top;

    if (anchor) {
      left = anchor.left + anchor.width / 2 - box.width / 2;
      top = anchor.bottom + 10;
    } else {
      left = (viewportWidth - box.width) / 2;
      top = 80;
    }

    if (top + box.height > viewportHeight - margin) {
      const above = anchor ? anchor.top - box.height - 10 : -1;
      top = above >= margin
        ? above
        : Math.max(margin, viewportHeight - box.height - margin);
    }

    left = Math.min(Math.max(margin, left), Math.max(margin, viewportWidth - box.width - margin));
    top = Math.min(Math.max(margin, top), Math.max(margin, viewportHeight - box.height - margin));

    element.style.left = `${Math.round(left)}px`;
    element.style.top = `${Math.round(top)}px`;
    element.style.visibility = '';
  }

  function toast (message) {
    if (!panel) return;

    let element = panel.querySelector('.jwd-toast');
    if (!element) {
      element = document.createElement('div');
      element.className = 'jwd-toast';
      element.setAttribute('role', 'status');
      panel.append(element);
    }

    element.textContent = message;
    element.classList.add('jwd-toast-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      element.classList.remove('jwd-toast-show');
    }, 1500);
  }

  async function copyFromButton (button) {
    if (!result || !result.ok) return;

    const kind = button.dataset.copy;
    let value = '';
    if (kind === 'token') value = result.token;
    else if (kind === 'payload' && result.payload) value = JWTDecode.formatJson(result.payload);
    else if (kind === 'header') value = JWTDecode.formatJson(result.header);
    else if (kind === 'signature') value = result.signature || '';

    if (!value) return;
    const ok = await JWTDecode.copyText(value);
    toast(ok ? t('copied') : t('copyFailed'));
  }

  function onPanelClick (event) {
    event.stopPropagation();

    const target = event.target instanceof Element
      ? event.target.closest('[data-copy], [data-close]')
      : null;
    if (!target) return;

    if (target.hasAttribute('data-close')) {
      close();
      return;
    }
    copyFromButton(target);
  }

  function onDocumentMouseDown (event) {
    if (!panel) return;
    const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
    if (path.includes(host) || path.includes(panel)) return;
    close();
  }

  function onDocumentKeyDown (event) {
    if (!panel || event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    close();
  }

  document.addEventListener('mousedown', onDocumentMouseDown, true);
  document.addEventListener('keydown', onDocumentKeyDown, true);

  /* --------------------------------------------------------------- render */

  async function show (rawText) {
    const parsed = JWTDecode.parse(rawText);
    result = parsed;

    const css = await loadStyles();
    ensureHost();

    if (shadow && !styleReady && css) {
      const style = document.createElement('style');
      style.textContent = css;
      shadow.append(style);
      styleReady = true;
    }

    if (panel) panel.remove();

    const element = document.createElement('div');
    element.className = 'jwd-panel';
    element.dataset.theme = detectTheme();
    element.setAttribute('role', 'dialog');
    element.setAttribute('aria-label', t('panelTitle'));
    element.tabIndex = -1;

    const head = document.createElement('header');
    head.className = 'jwd-head';

    const brand = document.createElement('span');
    brand.className = 'jwd-brand';
    brand.setAttribute('aria-hidden', 'true');
    brand.textContent = 'JWT';

    const heading = document.createElement('div');
    heading.className = 'jwd-head-text';
    const title = document.createElement('span');
    title.className = 'jwd-head-title';
    title.textContent = t('panelTitle');
    const subtitle = document.createElement('span');
    subtitle.className = 'jwd-head-sub';
    subtitle.textContent = JWTDecodeUI.stateLabel(parsed);
    heading.append(title, subtitle);

    const actions = document.createElement('div');
    actions.className = 'jwd-head-actions';
    if (parsed.ok) {
      actions.append(iconButton(COPY_ICON, t('copyToken'), { 'data-copy': 'token' }));
    }
    actions.append(iconButton(CLOSE_ICON, t('closeEsc'), { 'data-close': '' }));

    head.append(brand, heading, actions);

    const body = document.createElement('div');
    body.className = 'jwd-body';
    body.append(JWTDecodeUI.build(parsed));

    element.append(head, body);
    element.addEventListener('click', onPanelClick);
    element.addEventListener('mousedown', (event) => event.stopPropagation());
    element.addEventListener('keydown', (event) => event.stopPropagation());

    shadow.append(element);
    panel = element;

    positionPanel(element);
    element.focus({ preventScroll: true });
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || message.type !== 'JWT_DECODE_SELECTION') return undefined;

    show(String(message.text || ''))
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: String((error && error.message) || error) }));
    return true;
  });
})();
