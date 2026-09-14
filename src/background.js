import { getExchangeRates, convertAmount } from './rates.js';
import { formatPrices, convertPrices, LAYOUT } from './format.js';
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

