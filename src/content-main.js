import { isSiteEnabled, loadSettings, resolveSettings } from './settings.js';
import { annotatePrices, applyPageStyles, removeConversions } from './inject.js';

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

/** Least time between two attempts at rates that failed to load. */
const RATES_RETRY_MS = 3000;

/** Timed retries before waiting on page changes alone. */
const RATES_RETRY_LIMIT = 10;

/**
 * Resolves once the page is on screen.
 *
 * ozon.by prerenders the product page behind a hovered tile, so the content
 * script can start in a page nobody is looking at yet, where requests may be
 * held back or fail. Waiting for activation costs a plain page nothing.
 *
 * @returns {Promise<void>}
 */
function whenShown() {
  if (!document.prerendering) {
    return Promise.resolve();
  }
  return new Promise(resolve => {
    document.addEventListener('prerenderingchange', () => resolve(), { once: true });
  });
}

async function start() {
  await whenShown();

  let stored = await loadSettings();

  // A first request for rates can fail — the service worker waking up, the
  // network blinking while a page loads in the background. Rather than give
  // the page up until a reload, the next scan asks again, no more often than
  // RATES_RETRY_MS.
  let rates = await fetchRates();
  let ratesAskedAt = Date.now();
  let ratesPending = false;
  let ratesRetries = 0;

  const retryRates = () => {
    if (ratesPending || Date.now() - ratesAskedAt < RATES_RETRY_MS) {
      return;
    }
    ratesPending = true;
    ratesAskedAt = Date.now();
    fetchRates().then(fresh => {
      ratesPending = false;
      rates ??= fresh;
      if (rates) {
        scan();
      } else if (++ratesRetries < RATES_RETRY_LIMIT) {
        // A quiet page fires no mutations to retry on, so try on a timer too.
        setTimeout(scan, RATES_RETRY_MS);
      }
    });
  };

  // A site switched off in the popup is left as the site drew it. Checked on
  // every scan, like the settings, since it can be switched back on while
  // the page is open.
  const scan = () => {
    if (!rates) {
      retryRates();
      return 0;
    }

    if (!isSiteEnabled(location.href, stored)) {
      return 0;
    }

    const settings = resolveSettings(location.href, stored);
    applyPageStyles(settings);
    return annotatePrices(document, settings, rates);
  };
  scan();

  // Catalogs render and re-render prices after load: filtering, sorting,
  // pagination. Rescanning is cheap because unchanged prices are skipped.
  //
  // The document itself is watched, not its root element: a page can swap
  // the root for a new one — wildberries.by first serves an anti-bot check
  // that gives way to the store — and an observer on the old root would
  // never hear of anything under the new.
  let pending = null;
  new MutationObserver(() => {
    pending ??= setTimeout(() => {
      pending = null;
      scan();
    }, SCAN_DELAY_MS);
  }).observe(document, { childList: true, subtree: true, characterData: true });

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
