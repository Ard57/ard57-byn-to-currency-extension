import { convertAmount } from './rates.js';

/**
 * Layout modes for rendering a converted price list.
 *
 *   INLINE — all currencies on one line, joined by a separator.
 *            Use where the price sits in a tight row (cards, tables, list rows).
 *   BLOCK  — one currency per line.
 *            Use where the price has vertical room (product pages, detail views).
 */
export const LAYOUT = {
  INLINE: 'inline',
  BLOCK: 'block',
};

/**
 * How each currency renders when `display: 'symbol'` is used.
 * Position matters: "$12.34" reads naturally, "₽86.30" does not.
 */
const CURRENCY_FORMAT = {
  USD: { symbol: '$', position: 'prefix' },
  EUR: { symbol: '€', position: 'prefix' },
  RUB: { symbol: '₽', position: 'suffix' },
  BYN: { symbol: 'Br', position: 'suffix' },
};

const DEFAULT_SEPARATOR = {
  [LAYOUT.INLINE]: ' | ',
  [LAYOUT.BLOCK]: '\n',
};

export const DEFAULT_OPTIONS = {
  layout: LAYOUT.INLINE,
  /** Overrides the layout's default separator when set. */
  separator: null,
  /** 'symbol' → "$12.34", 'code' → "12.34 USD", 'none' → "12.34" */
  display: 'symbol',
  /**
   * Either a number applied to every currency, or a per-currency map with an
   * optional `default`:  { default: 2, RUB: 0 }
   *
   * Pages override this wholesale — an apartment listing sets `decimals: 0`
   * and no currency shows fractions, regardless of the site-level map.
   */
  decimals: 2,
  locale: 'en-US',
  /** Include the source currency in the output (usually redundant). */
  includeSource: false,
  /** Appended to every converted value, e.g. '/м²' → "$1,531/м²". */
  suffix: '',
};

/**
 * Resolves how many fraction digits a currency gets.
 *
 * Accepts a plain number (applies to everything) or a per-currency map with an
 * optional `default`. An out-of-range or non-numeric value falls back to 2
 * rather than throwing inside Intl.
 *
 * @param {number|Object} decimals
 * @param {string} currency - Currency code
 * @returns {number} Fraction digits, clamped to Intl's 0–20 range
 */
function resolveDecimals(decimals, currency) {
  const value = typeof decimals === 'object' && decimals !== null
    ? decimals[currency] ?? decimals.default
    : decimals;

  if (!Number.isFinite(value)) {
    return 2;
  }

  return Math.min(Math.max(Math.trunc(value), 0), 20);
}

/**
 * Formats a single number using the target currency's convention.
 *
 * @param {number} value
 * @param {string} currency - Currency code
 * @param {Object} options - Resolved options (see DEFAULT_OPTIONS)
 * @returns {string}
 */
function formatValue(value, currency, options) {
  const fractionDigits = resolveDecimals(options.decimals, currency);

  const number = new Intl.NumberFormat(options.locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);

  if (options.display === 'none') {
    return number;
  }

  if (options.display === 'code') {
    return `${number} ${currency}`;
  }

  // 'symbol' — fall back to the code for currencies we have no symbol for
  const format = CURRENCY_FORMAT[currency];
  if (!format) {
    return `${number} ${currency}`;
  }

  return format.position === 'prefix'
    ? `${format.symbol}${number}`
    : `${number} ${format.symbol}`;
}

/**
 * Converts one amount into several currencies, preserving the order of the
 * `currencies` list. That order is the caller's to decide — it comes from the
 * per-site settings so a given site always renders its currencies the same way.
 *
 * Currencies missing from `rates` are skipped rather than throwing, so one
 * unknown code cannot blank out an entire page of prices.
 *
 * @param {number} amount - Amount in the source currency
 * @param {string} fromCurrency - Source currency code (e.g. "BYN")
 * @param {string[]} currencies - Ordered target currency codes (e.g. ["USD", "EUR"])
 * @param {Object} rates - Rates map from getExchangeRates().rates
 * @param {Object} [options] - See DEFAULT_OPTIONS
 * @returns {Array<{ currency: string, value: number, text: string }>}
 */
export function convertPrices(amount, fromCurrency, currencies, rates, options = {}) {
  const resolved = { ...DEFAULT_OPTIONS, ...options };

  if (!Number.isFinite(amount) || !Array.isArray(currencies)) {
    return [];
  }

  const parts = [];

  for (const currency of currencies) {
    if (currency === fromCurrency && !resolved.includeSource) {
      continue;
    }
    if (!(currency in rates) || !(fromCurrency in rates)) {
      continue;
    }

    const value = convertAmount(amount, fromCurrency, currency, rates);
    parts.push({
      currency,
      value,
      text: formatValue(value, currency, resolved) + (resolved.suffix ?? ''),
    });
  }

  return parts;
}

/**
 * Renders converted prices as a single string, laid out for the host site.
 *
 * @example
 *   formatPrices(100, 'BYN', ['USD', 'EUR'], rates)
 *   // → "$32.55 | €28.00"
 *
 *   formatPrices(100, 'BYN', ['USD', 'EUR'], rates, { layout: LAYOUT.BLOCK })
 *   // → "$32.55\n€28.00"
 *
 * @param {number} amount
 * @param {string} fromCurrency
 * @param {string[]} currencies - Ordered target currency codes
 * @param {Object} rates - Rates map from getExchangeRates().rates
 * @param {Object} [options] - See DEFAULT_OPTIONS
 * @returns {string} Empty string when nothing could be converted
 */
export function formatPrices(amount, fromCurrency, currencies, rates, options = {}) {
  const resolved = { ...DEFAULT_OPTIONS, ...options };
  const separator = resolved.separator ?? DEFAULT_SEPARATOR[resolved.layout] ?? ' ';

  return convertPrices(amount, fromCurrency, currencies, rates, resolved)
    .map(part => part.text)
    .join(separator);
}
