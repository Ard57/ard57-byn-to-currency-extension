const API_BASE_URL = 'https://api.frankfurter.dev/v2/rates';
const CACHE_KEY = 'exchangeRates';
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Supported currencies. USD is the base used for API calls —
 * all other rates are derived as cross-rates from USD.
 */
const SUPPORTED_CURRENCIES = ['USD', 'BYN', 'EUR', 'RUB'];

/**
 * Fetches latest exchange rates from the Frankfurter API v2.
 * Uses USD as the base currency so we can compute any cross-rate.
 *
 * API response format:
 *   [
 *     { date: "2026-08-28", base: "USD", quote: "BYN", rate: 3.0189 },
 *     { date: "2026-08-28", base: "USD", quote: "EUR", rate: 0.85827 },
 *     { date: "2026-08-28", base: "USD", quote: "RUB", rate: 85.56 }
 *   ]
 *
 * @returns {Promise<Object>} Normalized rates object
 * @throws {Error} If the fetch fails or returns a non-OK status
 */
async function fetchRatesFromApi() {
  const quotes = SUPPORTED_CURRENCIES.filter(c => c !== 'USD').join(',');
  const url = `${API_BASE_URL}?base=USD&quotes=${quotes}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Frankfurter API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Normalize the array response into a { currency: rate } map
  const rates = { USD: 1 };
  let date = null;

  for (const entry of data) {
    rates[entry.quote] = entry.rate;
    date = entry.date; // All entries share the same date
  }

  return { rates, date };
}

/**
 * Reads cached exchange rates from chrome.storage.local.
 *
 * @returns {Promise<Object|null>} Cached rates object, or null if missing/stale
 */
async function getCachedRates() {
  const result = await chrome.storage.local.get(CACHE_KEY);
  const cached = result[CACHE_KEY];

  if (!cached || !cached.fetchedAt) {
    return null;
  }

  const age = Date.now() - cached.fetchedAt;
  if (age > CACHE_MAX_AGE_MS) {
    return null;
  }

  return cached;
}

/**
 * Saves exchange rates to chrome.storage.local with a fetch timestamp.
 *
 * @param {Object} normalizedData - { rates: { USD: 1, BYN: ..., ... }, date: "..." }
 * @returns {Promise<Object>} The stored rates object
 */
async function cacheRates(normalizedData) {
  const ratesData = {
    rates: normalizedData.rates,
    base: 'USD',
    date: normalizedData.date,
    fetchedAt: Date.now(),
  };

  await chrome.storage.local.set({ [CACHE_KEY]: ratesData });
  return ratesData;
}

/**
 * Main entry point: returns exchange rates, using cache when fresh.
 * Fetches from the API only if the cache is missing or older than 24 hours.
 *
 * @returns {Promise<Object>} Rates object:
 *   { rates: { USD: 1, BYN: 3.02, EUR: 0.86, RUB: 85.56 }, base: "USD", date: "...", fetchedAt: ... }
 */
export async function getExchangeRates() {
  const cached = await getCachedRates();
  if (cached) {
    return cached;
  }

  const normalizedData = await fetchRatesFromApi();
  return cacheRates(normalizedData);
}

/**
 * Converts an amount from one currency to another using USD-based rates.
 *
 * @param {number} amount - The amount to convert
 * @param {string} fromCurrency - Source currency code (e.g. "BYN")
 * @param {string} toCurrency - Target currency code (e.g. "EUR")
 * @param {Object} rates - The rates object from getExchangeRates().rates
 * @returns {number} Converted amount
 * @throws {Error} If either currency is not in the rates object
 */
export function convertAmount(amount, fromCurrency, toCurrency, rates) {
  if (!(fromCurrency in rates)) {
    throw new Error(`Unknown currency: ${fromCurrency}`);
  }
  if (!(toCurrency in rates)) {
    throw new Error(`Unknown currency: ${toCurrency}`);
  }

  if (fromCurrency === toCurrency) {
    return amount;
  }

  // Cross-rate: convert through USD
  // amount in "from" → USD → "to"
  return amount * rates[toCurrency] / rates[fromCurrency];
}
