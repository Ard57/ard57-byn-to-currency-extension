import { getExchangeRates, convertAmount } from './rates.js';
import { formatPrices, convertPrices, LAYOUT } from './format.js';
import { nextUpdateAt } from './schedule.js';
import {
  resolveSettings,
  getSettingsForUrl,
  setSiteSettings,
  setPageRule,
  removePageRule,
  collectCurrencies,
  getAllCurrencies,
} from './settings.js';

/**
 * Rates covering every currency the user has configured, across all sites.
 *
 * The currency list lives in settings, the fetcher takes it as an argument —
 * rates.js stays a leaf module rather than importing settings.js, which would
 * close the cycle settings → format → rates.
 *
 * @returns {Promise<Object>} Rates object from getExchangeRates()
 */
function getConfiguredRates() {
  return getAllCurrencies().then(getExchangeRates);
}

/** Name of the alarm that wakes the worker for the daily refresh. */
const REFRESH_ALARM = 'refresh-rates';

/**
 * Arms a one-shot alarm for the next scheduled publication.
 *
 * One-shot rather than periodic: a fixed period would drift off 17:00 twice a
 * year when the clocks move, and would keep firing through the weekend. Each
 * run arms the next, so the schedule is recomputed every time.
 *
 * Creating an alarm under an existing name replaces it, so calling this more
 * often than needed is harmless.
 *
 * @returns {Promise<void>}
 */
function scheduleRefresh() {
  return chrome.alarms.create(REFRESH_ALARM, { when: nextUpdateAt() });
}

// Alarms survive a browser restart, but not an extension install or update —
// and a browser that was closed at 17:00 needs the schedule moved on.
chrome.runtime.onInstalled.addListener(scheduleRefresh);
chrome.runtime.onStartup.addListener(scheduleRefresh);

/**
 * Refreshes the cache shortly after new rates are published, so the first page
 * load of the evening reads storage instead of waiting on the network.
 *
 * getConfiguredRates() fetches because the cache is now behind the day's
 * publication; if the alarm fires a moment early it finds the cache still
 * fresh and does nothing, and the re-armed alarm comes back to it.
 */
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name !== REFRESH_ALARM) {
    return;
  }

  scheduleRefresh();
  getConfiguredRates().catch(error =>
    console.warn('BYN to Currency: scheduled rate refresh failed —', error.message),
  );
});

/**
 * Handle messages from content scripts or popup.
 *
 * Supported message types:
 *   { type: "GET_RATES" }
 *     → Returns the full rates object
 *
 *   { type: "CONVERT", amount: number, from: string, to: string }
 *     → Returns { result: number, from, to, amount, date }
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_RATES') {
    getConfiguredRates()
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));

    // Return true to indicate we'll respond asynchronously
    return true;
  }

  if (message.type === 'CONVERT') {
    const { amount, from, to } = message;

    getConfiguredRates()
      .then(data => {
        const result = convertAmount(amount, from, to, data.rates);
        sendResponse({
          success: true,
          data: { result, from, to, amount, date: data.date },
        });
      })
      .catch(error => sendResponse({ success: false, error: error.message }));

    return true;
  }
});

console.log('BYN to Currency: service worker registered');

// Expose on global scope for easy testing in the DevTools console
globalThis.getExchangeRates = getExchangeRates;
globalThis.convertAmount = convertAmount;
globalThis.formatPrices = formatPrices;
globalThis.convertPrices = convertPrices;
globalThis.LAYOUT = LAYOUT;
globalThis.resolveSettings = resolveSettings;
globalThis.getSettingsForUrl = getSettingsForUrl;
globalThis.setSiteSettings = setSiteSettings;
globalThis.setPageRule = setPageRule;
globalThis.removePageRule = removePageRule;
globalThis.collectCurrencies = collectCurrencies;
globalThis.getAllCurrencies = getAllCurrencies;
globalThis.getConfiguredRates = getConfiguredRates;
globalThis.nextUpdateAt = nextUpdateAt;
globalThis.scheduleRefresh = scheduleRefresh;

