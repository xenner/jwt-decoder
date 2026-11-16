const $ = (id) => document.getElementById(id);

const I18n = window.JWTDecoderI18n;
const i18nReady = I18n ? I18n.ready : Promise.resolve();
const t = (key, substitutions) => (I18n ? I18n.t(key, substitutions) : key);

let current = null;
let statusTimer = 0;

function applyTheme () {
  const dark = window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.body.dataset.theme = dark ? 'dark' : 'light';
}

function status (message) {
  const element = $('status');
  element.textContent = message || '';
  clearTimeout(statusTimer);
  if (message) {
    statusTimer = setTimeout(() => {
      element.textContent = '';
    }, 1800);
  }
}

function decode () {
  current = JWTDecode.parse($('token').value);

  const result = $('result');
  result.replaceChildren(JWTDecodeUI.build(current));
  result.hidden = false;
  document.body.classList.add('jwd-has-result');

  if (!current.ok) status('');
}

async function copyFromButton (button) {
  if (!current || !current.ok) return;

  const kind = button.getAttribute('data-copy');
  let value = '';
  if (kind === 'payload' && current.payload) value = JWTDecode.formatJson(current.payload);
  else if (kind === 'header') value = JWTDecode.formatJson(current.header);
  else if (kind === 'signature') value = current.signature || '';

  if (!value) return;
  const ok = await JWTDecode.copyText(value);
  status(ok ? t('copied') : t('copyFailed'));
}

$('decode').addEventListener('click', decode);

$('token').addEventListener('paste', () => {
  setTimeout(decode, 0);
});

$('token').addEventListener('input', () => {
  if ($('token').value.trim()) return;
  document.body.classList.remove('jwd-has-result');
  $('result').hidden = true;
  current = null;
});

$('token').addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    decode();
  }
});

$('result').addEventListener('click', (event) => {
  const target = event.target instanceof Element
    ? event.target.closest('[data-copy]')
    : null;
  if (target) copyFromButton(target);
});

applyTheme();
if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
}

i18nReady.then(() => {
  $('token').focus();
});
