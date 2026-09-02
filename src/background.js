import { getExchangeRates, convertAmount } from './rates.js';

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
    getExchangeRates()
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));

    // Return true to indicate we'll respond asynchronously
    return true;
  }

  if (message.type === 'CONVERT') {
    const { amount, from, to } = message;

    getExchangeRates()
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

