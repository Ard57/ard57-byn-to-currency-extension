const API_BASE_URL = 'https://api.frankfurter.dev/v2/rates';
const CACHE_KEY = 'exchangeRates';
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * After a failed fetch, don't hit the API again for this long. A catalog page
 * can ask for rates dozens of times; without a cooldown an outage turns every
 * one of those into its own doomed request.
 */
const RETRY_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

/** Shared in-flight fetch, so N concurrent callers cause one request. */
let inFlightFetch = null;

/** The currency list `inFlightFetch` was started for. */
let inFlightKey = '';

/** Timestamp of the last failed fetch, for RETRY_COOLDOWN_MS. */
let lastFailureAt = 0;

/** The API base, and the pivot every cross-rate is computed through. */
const BASE_CURRENCY = 'USD';

/**
 * Fetched whatever the settings say: USD because it is the base, BYN because
 * it is the currency page prices are read in.
 */
const REQUIRED_CURRENCIES = [BASE_CURRENCY, 'BYN'];

/** Used when a caller supplies no list — console testing, mostly. */
const DEFAULT_CURRENCIES = [...REQUIRED_CURRENCIES, 'EUR', 'RUB'];

/**
 * Cleans a caller-supplied currency list: uppercased, deduplicated, always
 * including the required pair, and sorted so the same set always produces the
 * same cache and in-flight key.
 *
 * @param {string[]} [currencies]
 * @returns {string[]}
 */
function normalizeCurrencies(currencies) {
  const list = Array.isArray(currencies) && currencies.length
    ? currencies
    : DEFAULT_CURRENCIES;

  const codes = list
    .filter(code => typeof code === 'string' && code)
    .map(code => code.toUpperCase());

  return [...new Set([...REQUIRED_CURRENCIES, ...codes])].sort();
}

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
 * @param {string[]} currencies - Normalized currency codes to fetch
 * @returns {Promise<Object>} Normalized rates object
 * @throws {Error} If the fetch fails or returns a non-OK status
 */
async function fetchRatesFromApi(currencies) {
  const quotes = currencies.filter(code => code !== BASE_CURRENCY);

  // Nothing to ask for — the base is always worth 1 of itself
  if (quotes.length === 0) {
    return { rates: { [BASE_CURRENCY]: 1 }, date: null };
  }

  const url = `${API_BASE_URL}?base=${BASE_CURRENCY}&quotes=${quotes.join(',')}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Frankfurter API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Normalize the array response into a { currency: rate } map
  const rates = { [BASE_CURRENCY]: 1 };
  let date = null;

  for (const entry of data) {
    rates[entry.quote] = entry.rate;
    date = entry.date; // All entries share the same date
  }

  return { rates, date };
}

/**
 * Reads whatever is in the cache, however old.
 *
 * Staleness is deliberately not judged here — old rates are still useful when
 * the network is gone, so the decision belongs to the caller.
 *
 * @returns {Promise<Object|null>} Cached rates object, or null if absent
 */
async function readCache() {
  const result = await chrome.storage.local.get(CACHE_KEY);
  const cached = result[CACHE_KEY];

  return cached?.fetchedAt ? cached : null;
}

/**
 * @param {Object|null} cached
 * @returns {boolean} True if the cache is young enough to use without refetching
 */
function isFresh(cached) {
  return Boolean(cached) && Date.now() - cached.fetchedAt <= CACHE_MAX_AGE_MS;
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
 * Fetches and caches rates, collapsing concurrent callers onto one request.
 *
 * @returns {Promise<Object>} The freshly stored rates object
 * @throws {Error} If the fetch fails
 */
function refreshRates() {
  inFlightFetch ??= fetchRatesFromApi()
    .then(cacheRates)
    .catch(error => {
      lastFailureAt = Date.now();
      throw error;
    })
    .finally(() => {
      inFlightFetch = null;
    });

  return inFlightFetch;
}

/**
 * Main entry point: returns exchange rates, preferring fresh ones but never
 * failing just because the network did.
 *
 * Order of preference:
 *   1. Cache younger than 24 hours
 *   2. A fresh fetch
 *   3. Whatever is cached, however old, flagged with `stale: true`
 *
 * Only a missing cache AND a failed fetch throws. Rates are also served stale
 * without attempting a fetch while a recent failure is inside the retry
 * cooldown, so an outage costs one request rather than one per price.
 *
 * @returns {Promise<Object>} Rates object:
 *   { rates: { USD: 1, BYN: 3.02, EUR: 0.86, RUB: 85.56 }, base: "USD",
 *     date: "...", fetchedAt: ..., stale?: true }
 */
export async function getExchangeRates() {
  const cached = await readCache();

  if (isFresh(cached)) {
    return cached;
  }

  if (cached && Date.now() - lastFailureAt < RETRY_COOLDOWN_MS) {
    return { ...cached, stale: true };
  }

  try {
    return await refreshRates();
  } catch (error) {
    if (cached) {
      console.warn('BYN to Currency: rate refresh failed, using cached rates —', error.message);
      return { ...cached, stale: true };
    }
    throw error;
  }
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
