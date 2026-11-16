/* Builds the decoded-token UI as DOM nodes. Used by the in-page panel and by
   the toolbar popup. All token values are rendered with textContent. */

(() => {
  if (globalThis.JWTDecodeUI) return;

  const JWT = globalThis.JWTDecode;

  const locale = (() => {
    try {
      if (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getUILanguage) {
        return chrome.i18n.getUILanguage() || navigator.language || 'en';
      }
    } catch { /* fall through */ }
    return (typeof navigator !== 'undefined' && navigator.language) || 'en';
  })();

  function t (key, substitutions) {
    try {
      return chrome.i18n.getMessage(key, substitutions) || key;
    } catch {
      return key;
    }
  }

  function node (tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text != null) element.textContent = text;
    return element;
  }

  function claimCount (payload) {
    return payload && typeof payload === 'object' ? Object.keys(payload).length : 0;
  }

  function claimsLabel (count) {
    return count === 1 ? t('claimsOne') : t('claimsMany', [String(count)]);
  }

  function stateLabel (result) {
    if (!result || !result.ok) return t('notDecoded');
    if (result.encrypted) return t('encryptedSubtitle');
    return t('decodedLocally');
  }

  function reasonText (reason) {
    switch (reason) {
      case 'empty': return t('reasonEmpty');
      case 'chars': return t('reasonChars');
      case 'base64': return t('reasonBase64');
      case 'utf8': return t('reasonUtf8');
      case 'json': return t('reasonJson');
      case 'object': return t('reasonObject');
      default: return t('reasonUnknown');
    }
  }

  function errorMessage (result) {
    if (!result) return t('errorEmpty');
    switch (result.code) {
      case 'empty': return t('errorEmpty');
      case 'notJwt': return t('errorNotJwt');
      case 'segments': return t('errorSegments', [String(result.count)]);
      case 'tooLong': return t('errorTooLong');
      case 'header': return t('errorHeader', [reasonText(result.reason)]);
      case 'payload': return t('errorPayload', [reasonText(result.reason)]);
      default: return t('errorNotJwt');
    }
  }

  function buildMeta (result) {
    const meta = node('div', 'jwd-meta');
    const header = result.header || {};

    if (result.encrypted) {
      meta.append(node('span', 'jwd-tag', 'JWE'));
      if (typeof header.enc === 'string' && header.enc) {
        meta.append(node('span', 'jwd-meta-item', `enc: ${header.enc}`));
      }
      return meta;
    }

    const alg = typeof header.alg === 'string' && header.alg ? header.alg : t('unknownAlg');
    meta.append(node('span', 'jwd-tag', alg));
    if (typeof header.typ === 'string' && header.typ) {
      meta.append(node('span', 'jwd-meta-item', `typ: ${header.typ}`));
    }
    meta.append(node('span', 'jwd-meta-item', claimsLabel(claimCount(result.payload))));
    return meta;
  }

  function timeChips (payload) {
    const chips = node('div', 'jwd-chips');
    const now = Date.now();

    for (const name of ['exp', 'nbf', 'iat']) {
      if (!Object.prototype.hasOwnProperty.call(payload, name)) continue;
      const date = JWT.claimDate(payload[name]);
      if (!date) continue;

      const chip = node('span', 'jwd-chip');
      chip.append(node('b', 'jwd-chip-key', name));
      chip.append(document.createTextNode(' ' + JWT.formatDate(payload[name], locale)));

      const relative = JWT.formatRelative(payload[name], locale);
      if (name === 'exp') {
        if (relative) chip.append(document.createTextNode(' · ' + relative));
        if (date.getTime() <= now) chip.classList.add('jwd-chip-danger');
      } else if (name === 'nbf' && date.getTime() > now) {
        if (relative) chip.append(document.createTextNode(' · ' + relative));
        chip.classList.add('jwd-chip-warn');
      } else if (name === 'iat' && relative) {
        chip.append(document.createTextNode(' · ' + relative));
      }

      chips.append(chip);
    }

    return chips.childNodes.length ? chips : null;
  }

  function copyButton (kind, labelKey) {
    const button = node('button', 'jwd-copy', t('copy'));
    button.type = 'button';
    button.dataset.copy = kind;
    button.title = t(labelKey);
    return button;
  }

  function codeBlock (value) {
    const pre = node('pre', 'jwd-code');
    JWT.highlightJson(pre, value);
    return pre;
  }

  function payloadSection (result) {
    const section = node('section', 'jwd-section');
    const head = node('div', 'jwd-section-head');
    head.append(node('h3', 'jwd-section-title', t('payloadTitle')));
    head.append(copyButton('payload', 'copyPayload'));
    section.append(head, codeBlock(result.payload));
    return section;
  }

  function headerDetails (result, open = false) {
    const details = node('details', 'jwd-details');
    details.open = open;
    const summary = node('summary', 'jwd-summary');
    summary.append(node('span', 'jwd-summary-title', t('headerTitle')));
    const meta = [];
    if (typeof result.header.typ === 'string' && result.header.typ) meta.push(`typ: ${result.header.typ}`);
    if (typeof result.header.alg === 'string' && result.header.alg) meta.push(`alg: ${result.header.alg}`);
    if (meta.length) summary.append(node('span', 'jwd-summary-meta', meta.join(' · ')));

    const body = node('div', 'jwd-details-body');
    const bar = node('div', 'jwd-details-bar');
    bar.append(copyButton('header', 'copyHeader'));
    body.append(bar, codeBlock(result.header));

    details.append(summary, body);
    return details;
  }

  function signatureDetails (result) {
    const details = node('details', 'jwd-details');
    const summary = node('summary', 'jwd-summary');
    summary.append(node('span', 'jwd-summary-title', t('signatureTitle')));
    summary.append(node('span', 'jwd-summary-meta', t('notVerified')));

    const body = node('div', 'jwd-details-body');

    if (result.signature) {
      const bar = node('div', 'jwd-details-bar');
      bar.append(copyButton('signature', 'copySignature'));
      const pre = node('pre', 'jwd-code jwd-signature', result.signature);
      body.append(bar, pre);
    } else {
      body.append(node('p', 'jwd-note', t('unsigned')));
    }

    details.append(summary, body);
    return details;
  }

  function buildDecoded (result) {
    const view = node('div', 'jwd-view');
    view.append(buildMeta(result));

    if (typeof result.header.alg === 'string' && result.header.alg.toLowerCase() === 'none') {
      view.append(node('p', 'jwd-note jwd-note-warn', t('algNoneNote')));
    }

    const chips = timeChips(result.payload);
    if (chips) view.append(chips);

    view.append(payloadSection(result));
    view.append(headerDetails(result));
    view.append(signatureDetails(result));
    view.append(node('p', 'jwd-note', t('notVerifiedNote')));
    return view;
  }

  function buildEncrypted (result) {
    const view = node('div', 'jwd-view');
    view.append(buildMeta(result));

    const alert = node('div', 'jwd-alert jwd-alert-info');
    alert.append(node('div', 'jwd-alert-title', t('encryptedTitle')));
    alert.append(node('p', 'jwd-alert-text', t('encryptedText')));
    view.append(alert);

    view.append(headerDetails(result, true));
    return view;
  }

  function buildError (result) {
    const view = node('div', 'jwd-view');
    const alert = node('div', 'jwd-alert');
    alert.append(node('div', 'jwd-alert-title', t('errorTitle')));
    alert.append(node('p', 'jwd-alert-text', errorMessage(result)));

    if (result && result.preview) {
      const preview = node('pre', 'jwd-code jwd-preview');
      preview.textContent = result.preview;
      alert.append(preview);
    }

    view.append(alert);
    view.append(node('p', 'jwd-hint', t('errorHint')));
    return view;
  }

  function build (result) {
    if (!result || !result.ok) return buildError(result);
    if (result.encrypted) return buildEncrypted(result);
    return buildDecoded(result);
  }

  globalThis.JWTDecodeUI = { build, stateLabel };
})();
