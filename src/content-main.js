import { loadSettings, resolveSettings } from './settings.js';
import { annotatePrices } from './inject.js';

/**
 * Content script entry point, loaded by content.js.
 *
 * Rates come from the service worker, which owns fetching and caching.
 * Settings are read straight from storage (content scripts can) and resolved
 * against the current URL on every scan — single-page sites change the URL
 * without reloading, and a page rule may apply to only some of those URLs.
 */

/** Batches bursts of DOM mutations into one scan. */
const SCAN_DELAY_MS = 150;

async function start() {
  const response = await chrome.runtime.sendMessage({ type: 'GET_RATES' });
  if (!response?.success) {
    console.warn('BYN to Currency: no exchange rates —', response?.error);
    return;
  }

  const { rates } = response.data;
  let stored = await loadSettings();

  const scan = () => annotatePrices(document, resolveSettings(location.href, stored), rates);
  scan();

  // Catalogs render and re-render prices after load: filtering, sorting,
  // pagination. Rescanning is cheap because unchanged prices are skipped.
  let pending = null;
  new MutationObserver(() => {
    pending ??= setTimeout(() => {
      pending = null;
      scan();
    }, SCAN_DELAY_MS);
  }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.siteSettings) {
      stored = changes.siteSettings.newValue ?? {};
      scan();
    }
  });
}

start().catch(error => console.error('BYN to Currency: content script failed —', error));
