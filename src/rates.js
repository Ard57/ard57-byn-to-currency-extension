import { lastUpdateAt, updateOffsetMs } from './schedule.js';

const API_BASE_URL = 'https://api.frankfurter.dev/v2/rates';
const CACHE_KEY = 'exchangeRates';

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
 * Cleans a caller-supplied currency list: uppercased, deduplicated, and sorted
 * so the same set always produces the same cache and in-flight key.
 *
 * BASE_CURRENCY is always included — not as a preference but because every
 * cross-rate divides through it, and it costs nothing, being worth 1 of itself.
 * Which currencies are actually wanted is the caller's business entirely; see
 * collectCurrencies() in settings.js.
 *
 * @param {string[]} [currencies]
 * @returns {string[]}
 */
function normalizeCurrencies(currencies) {
  const codes = (Array.isArray(currencies) ? currencies : [])
    .filter(code => typeof code === 'string' && code)
    .map(code => code.toUpperCase());

  return [...new Set([BASE_CURRENCY, ...codes])].sort();
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
 * True if the cache was filled after the latest rates were published, so a
 * refetch would only return the same numbers.
 *
 * Age is beside the point: Friday's rates are still current on Sunday, while
 * yesterday's are obsolete the moment today's go out. See schedule.js.
 *
 * @param {Object|null} cached
 * @param {number} offsetMs - This installation's refresh minute
 * @returns {boolean}
 */
function isFresh(cached, offsetMs) {
  return Boolean(cached) && cached.fetchedAt >= lastUpdateAt(Date.now(), offsetMs);
}

/**
 * True if the cache was fetched for at least the currencies asked for.
 *
 * The check is against what was *requested*, not what came back: an API that
 * silently omits an unsupported code would otherwise never satisfy the check,
 * and every call would refetch forever.
 *
 * Cache entries written before `quotes` existed fall back to their rate keys.
 *
 * @param {Object|null} cached
 * @param {string[]} currencies - Normalized currency codes
 * @returns {boolean}
 */
function covers(cached, currencies) {
  if (!cached) {
    return false;
  }

  const requested = new Set(cached.quotes ?? Object.keys(cached.rates ?? {}));
  return currencies.every(code => requested.has(code));
}

/**
 * Saves exchange rates to chrome.storage.local with a fetch timestamp.
 *
 * @param {Object} normalizedData - { rates: { USD: 1, BYN: ..., ... }, date: "..." }
 * @param {string[]} currencies - The list this fetch was made for
 * @returns {Promise<Object>} The stored rates object
 */
async function cacheRates(normalizedData, currencies) {
  const ratesData = {
    rates: normalizedData.rates,
    base: BASE_CURRENCY,
    quotes: currencies,
    date: normalizedData.date,
    fetchedAt: Date.now(),
  };

  await chrome.storage.local.set({ [CACHE_KEY]: ratesData });
  return ratesData;
}

/**
 * Fetches and caches rates, collapsing concurrent callers onto one request.
 *
 * Sharing is keyed by the currency list, so a caller wanting a wider set is
 * not handed a narrower fetch that happens to be in flight.
 *
 * @param {string[]} currencies - Normalized currency codes
 * @returns {Promise<Object>} The freshly stored rates object
 * @throws {Error} If the fetch fails
 */
function refreshRates(currencies) {
  const key = currencies.join(',');

  if (!inFlightFetch || inFlightKey !== key) {
    inFlightKey = key;
    inFlightFetch = fetchRatesFromApi(currencies)
      .then(data => cacheRates(data, currencies))
      .catch(error => {
        lastFailureAt = Date.now();
        throw error;
      })
      .finally(() => {
        inFlightFetch = null;
      });
  }

  return inFlightFetch;
}

/**
 * Main entry point: returns exchange rates, preferring fresh ones but never
 * failing just because the network did.
 *
 * Order of preference:
 *   1. Cache filled since the last publication, covering every requested currency
 *   2. A fresh fetch
 *   3. Whatever is cached, however old, flagged with `stale: true`
 *
 * Only a missing cache AND a failed fetch throws. Rates are also served stale
 * without attempting a fetch while a recent failure is inside the retry
 * cooldown, so an outage costs one request rather than one per price.
 *
 * A stale fallback is returned even when it does not cover every requested
 * currency — `convertPrices` skips what it cannot convert, so a partial answer
 * still beats a blank page.
 *
 * @param {string[]} [currencies] - Currency codes to make available. Callers
 *   pass the union of every configured site's list, via collectCurrencies().
 *   Omitting it yields the base currency alone.
 * @returns {Promise<Object>} Rates object:
 *   { rates: { USD: 1, BYN: 3.02, EUR: 0.86, RUB: 85.56 }, base: "USD",
 *     quotes: [...], date: "...", fetchedAt: ..., stale?: true }
 */
export async function getExchangeRates(currencies) {
  const wanted = normalizeCurrencies(currencies);
  const cached = await readCache();

  if (isFresh(cached, await updateOffsetMs()) && covers(cached, wanted)) {
    return cached;
  }

  if (cached && Date.now() - lastFailureAt < RETRY_COOLDOWN_MS) {
    return { ...cached, stale: true };
  }

  try {
    return await refreshRates(wanted);
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
