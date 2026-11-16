/* Service worker: creates the "JWT Decode" context menu and injects the panel
   on demand. Nothing is decoded here and no request leaves the browser. */

const MENU_ID = 'jwt-decoder-decode';

const t = (key, substitutions) => {
  try {
    return chrome.i18n.getMessage(key, substitutions) || key;
  } catch {
    return key;
  }
};

function createMenu () {
  chrome.contextMenus.removeAll(() => {
    // Reading lastError keeps Chrome from logging a warning if the menu was
    // already removed by another lifecycle event.
    void chrome.runtime.lastError;
    chrome.contextMenus.create({
      id: MENU_ID,
      title: t('contextMenuTitle'),
      contexts: ['selection']
    }, () => {
      void chrome.runtime.lastError;
    });
  });
}

chrome.runtime.onInstalled.addListener(createMenu);
chrome.runtime.onStartup.addListener(createMenu);

async function ensureInjected (tabId, frameId) {
  const target = { tabId, frameIds: [frameId] };

  let alreadyLoaded = false;
  try {
    const [inspection] = await chrome.scripting.executeScript({
      target,
      func: () => Boolean(globalThis.__jwtDecoderLoaded)
    });
    alreadyLoaded = Boolean(inspection && inspection.result);
  } catch {
    // The inspection can fail on restricted pages; the next call reports the
    // real error in a more useful place.
  }
  if (alreadyLoaded) return;

  await chrome.scripting.executeScript({
    target,
    files: ['src/jwt.js', 'src/ui.js', 'src/content.js']
  });
}

async function openInFrame (tabId, frameId, text) {
  await ensureInjected(tabId, frameId);
  await chrome.tabs.sendMessage(tabId, {
    type: 'JWT_DECODE_SELECTION',
    text
  }, { frameId });
}

async function reportFailure (tabId) {
  try {
    await chrome.action.setBadgeBackgroundColor({ tabId, color: '#be123c' });
    await chrome.action.setBadgeText({ tabId, text: '!' });
    await chrome.action.setTitle({ tabId, title: t('cannotOpenHere') });
    setTimeout(() => {
      chrome.action.setBadgeText({ tabId, text: '' }).catch(() => {});
      chrome.action.setTitle({ tabId, title: t('extName') }).catch(() => {});
    }, 4000);
  } catch { /* the tab may already be gone */ }
}

async function decodeSelection (info, tab) {
  if (!tab || tab.id == null) return;

  const frameId = typeof info.frameId === 'number' ? info.frameId : 0;
  const text = info.selectionText || '';

  try {
    await openInFrame(tab.id, frameId, text);
  } catch (error) {
    // Cross-origin subframes may not be reachable with activeTab. Fall back to
    // the top frame and show the panel there.
    if (frameId !== 0) {
      try {
        await openInFrame(tab.id, 0, text);
        return;
      } catch { /* fall through to the toolbar fallback */ }
    }
    console.warn('[JWT Decoder] Could not open the panel on this page.', error);
    reportFailure(tab.id);
  }
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID) return;
  decodeSelection(info, tab);
});
