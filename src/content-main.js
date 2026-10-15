import { loadSettings, resolveSettings } from './settings.js';
import { annotatePrices, removeConversions } from './inject.js';

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

/**
 * Rates for every currency the settings name, from the service worker.
 *
 * @returns {Promise<Object|null>} The rates map, or null without one
 */
async function fetchRates() {
  const response = await chrome.runtime.sendMessage({ type: 'GET_RATES' }).catch(() => null);
  if (!response?.success) {
    console.warn('BYN to Currency: no exchange rates —', response?.error);
    return null;
  }
  return response.data.rates;
}

async function start() {
  let rates = await fetchRates();
  if (!rates) {
    return;
  }

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

  // Settings changes come in bursts — every pick in the popup's picker is
  // one — so only the latest one's rates are applied.
  let latest = 0;

  chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area !== 'local' || !changes.siteSettings) {
      return;
    }

    const change = ++latest;
    stored = changes.siteSettings.newValue ?? {};

    // A currency just added was not among the rates fetched when the page
    // loaded, and would be skipped; asking again has the service worker
    // fetch it. Reordering needs no new rates, but costs only a cache read.
    const fresh = await fetchRates();
    if (change !== latest) {
      return;
    }
    rates = fresh ?? rates;

    // What changed is how prices should read, not the prices, so a plain
    // rescan would skip every one of them as already converted. Clearing
    // first is also what empties the page when the new settings ask for no
    // currencies at all.
    removeConversions(document);
    scan();
  });
}

start().catch(error => console.error('BYN to Currency: content script failed —', error));
