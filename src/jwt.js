/* JWT decoding utilities shared by the content script and the toolbar popup.
   Everything runs locally: this file never performs network requests and never
   verifies signatures. It only reads the token the user selected. */

(() => {
  if (globalThis.JWTDecode) return;

  const MAX_TOKEN_LENGTH = 256 * 1024;
  const MAX_INPUT_LENGTH = 1024 * 1024;

  // The whole selection may be "Bearer <token>" or just the token. The header
  // and payload lengths keep ordinary dotted text from being treated as a JWT.
  const EXACT_TOKEN_RE = /^(?:bearer\s+)?[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{2,}(?:\.[A-Za-z0-9_-]*){0,3}$/i;
  // A token inside a larger selection. Segments after the payload must be
  // non-empty so a sentence period at the end is not swallowed.
  const TOKEN_IN_TEXT_RE = /[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{2,}(?:\.[A-Za-z0-9_-]+){0,3}/;
  // A selection made only of token characters and dots: if it did not match
  // EXACT_TOKEN_RE it is malformed, and searching a suffix would be misleading.
  const TOKEN_SHAPE_RE = /^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]*)+$/;
  const SEGMENT_RE = /^[A-Za-z0-9_-]*$/;

  const JSON_TOKEN_RE = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;

  function base64UrlToBytes (segment) {
    const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
    const remainder = normalized.length % 4;
    if (remainder === 1) throw new Error('Invalid Base64URL length');
    const padded = remainder ? normalized + '='.repeat(4 - remainder) : normalized;
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  /** Decode one dot-separated segment. Returns { value, text } or { error }. */
  function readSegment (segment) {
    if (!segment) return { error: 'empty' };
    if (!SEGMENT_RE.test(segment)) return { error: 'chars' };
    if (segment.length % 4 === 1) return { error: 'base64' };

    let bytes;
    try {
      bytes = base64UrlToBytes(segment);
    } catch {
      return { error: 'base64' };
    }

    let text;
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      return { error: 'utf8' };
    }

    let value;
    try {
      value = JSON.parse(text);
    } catch {
      return { error: 'json' };
    }

    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      return { error: 'object' };
    }
    return { value, text };
  }

  function extractToken (input) {
    const raw = String(input == null ? '' : input).slice(0, MAX_INPUT_LENGTH);
    let text = raw.trim();
    if (!text) return '';

    // Quoted selections (copying from JSON or a log) are common.
    text = text.replace(/^["'`\s]+|["'`\s]+$/g, '').trim();
    if (!text) return '';

    const withoutBearer = text.replace(/^bearer\s+/i, '').trim();
    if (EXACT_TOKEN_RE.test(withoutBearer)) return withoutBearer;
    if (TOKEN_SHAPE_RE.test(withoutBearer)) return '';

    const match = text.match(TOKEN_IN_TEXT_RE);
    return match ? match[0] : '';
  }

  /**
   * Parse a JWT/JWE from the given selection.
   *
   * Success: { ok: true, token, header, payload, signature, encrypted, parts }
   * Failure: { ok: false, code, reason?, count?, preview }
   */
  function parse (input) {
    const rawText = String(input == null ? '' : input);
    const preview = rawText.trim().slice(0, 240);
    const token = extractToken(rawText);
    if (!token) return { ok: false, code: 'notJwt', preview };
    if (token.length > MAX_TOKEN_LENGTH) {
      return { ok: false, code: 'tooLong', preview };
    }

    const parts = token.split('.');
    if (parts.length < 2 || parts.length > 5 || parts.length === 4) {
      return { ok: false, code: 'segments', count: parts.length, preview };
    }

    const header = readSegment(parts[0]);
    if (header.error) {
      return { ok: false, code: 'header', reason: header.error, preview };
    }

    // A JWE has five segments: the payload is encrypted and cannot be read.
    if (parts.length === 5) {
      return {
        ok: true,
        token,
        header: header.value,
        headerText: header.text,
        payload: null,
        payloadText: '',
        signature: '',
        encrypted: true,
        parts: parts.length
      };
    }

    const payload = readSegment(parts[1]);
    if (payload.error) {
      return { ok: false, code: 'payload', reason: payload.error, preview };
    }

    return {
      ok: true,
      token,
      header: header.value,
      headerText: header.text,
      payload: payload.value,
      payloadText: payload.text,
      signature: parts[2] || '',
      encrypted: false,
      parts: parts.length
    };
  }

  function formatJson (value) {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  /** Pretty-print JSON into an element with span-based syntax colours. The
      values come from the token, so they are always written with textContent. */
  function highlightJson (element, value) {
    if (!element) return;
    const text = formatJson(value);
    element.textContent = '';

    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    JSON_TOKEN_RE.lastIndex = 0;

    let match;
    while ((match = JSON_TOKEN_RE.exec(text)) !== null) {
      if (match.index > lastIndex) {
        fragment.append(document.createTextNode(text.slice(lastIndex, match.index)));
      }

      if (match[1]) {
        const span = document.createElement('span');
        span.className = match[2] ? 'jwd-key' : 'jwd-string';
        span.textContent = match[1];
        fragment.append(span);
        if (match[2]) fragment.append(document.createTextNode(match[2]));
      } else if (match[3]) {
        const span = document.createElement('span');
        span.className = match[3] === 'null' ? 'jwd-null' : 'jwd-boolean';
        span.textContent = match[3];
        fragment.append(span);
      } else {
        const span = document.createElement('span');
        span.className = 'jwd-number';
        span.textContent = match[0];
        fragment.append(span);
      }

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      fragment.append(document.createTextNode(text.slice(lastIndex)));
    }
    element.append(fragment);
  }

  async function copyText (text) {
    const value = String(text == null ? '' : text);
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(value);
        return true;
      }
    } catch { /* fall back to a temporary textarea */ }

    try {
      const area = document.createElement('textarea');
      area.value = value;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.top = '-1000px';
      area.style.opacity = '0';
      (document.body || document.documentElement).appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }

  function claimDate (value) {
    const number = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(number)) return null;
    const date = new Date(number * 1000);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function formatDate (value, locale) {
    const date = claimDate(value);
    if (!date) return '';
    try {
      return new Intl.DateTimeFormat(locale || undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(date);
    } catch {
      return date.toISOString();
    }
  }

  const RELATIVE_UNITS = [
    ['year', 31536000000],
    ['month', 2592000000],
    ['week', 604800000],
    ['day', 86400000],
    ['hour', 3600000],
    ['minute', 60000],
    ['second', 1000]
  ];

  function formatRelative (value, locale) {
    const date = claimDate(value);
    if (!date) return '';
    const diff = date.getTime() - Date.now();
    const absolute = Math.abs(diff);

    let unit = 'second';
    let amount = diff / 1000;
    for (const [name, milliseconds] of RELATIVE_UNITS) {
      if (absolute >= milliseconds || name === 'second') {
        unit = name;
        amount = diff / milliseconds;
        break;
      }
    }

    try {
      const formatter = new Intl.RelativeTimeFormat(locale || undefined, { numeric: 'auto' });
      return formatter.format(Math.round(amount), unit);
    } catch {
      return '';
    }
  }

  globalThis.JWTDecode = {
    parse,
    extractToken,
    formatJson,
    highlightJson,
    copyText,
    claimDate,
    formatDate,
    formatRelative,
    MAX_TOKEN_LENGTH
  };
})();
