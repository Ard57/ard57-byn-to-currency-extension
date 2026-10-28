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

/**
 * The most fraction digits a currency is ever shown with, whatever the
 * settings ask for. Listed are the currencies whose unit is worth under about
 * five US cents: their minor unit is noise ("1,302.47 ₽") and nobody prices
 * in it. Others take the settings' decimals unchanged.
 *
 * A cap rather than a default, so a preset can ask for cents everywhere on a
 * site of small prices and still get whole rubles.
 */
const MAX_DECIMALS = {
  // Neighbours and Europe
  RUB: 0, UAH: 0, CZK: 0, HUF: 0, ISK: 0,
  // Balkans and Turkey
  RSD: 0, MKD: 0, ALL: 0, TRY: 0,
  // Caucasus and Central Asia
  AMD: 0, KZT: 0, UZS: 0, KGS: 0,
  // Asia
  INR: 0, JPY: 0, THB: 0, IDR: 0,
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
   * optional `default`:  { default: 2, EUR: 0 }. Either way MAX_DECIMALS
   * caps it per currency.
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
 * optional `default`, then capped by MAX_DECIMALS. An out-of-range or
 * non-numeric value falls back to 2 rather than throwing inside Intl.
 *
 * @param {number|Object} decimals
 * @param {string} currency - Currency code
 * @returns {number} Fraction digits, clamped to Intl's 0–20 range
 */
function resolveDecimals(decimals, currency) {
  const value = typeof decimals === 'object' && decimals !== null
    ? decimals[currency] ?? decimals.default
    : decimals;

  const digits = Number.isFinite(value) ? Math.min(Math.max(Math.trunc(value), 0), 20) : 2;

  return Math.min(digits, MAX_DECIMALS[currency] ?? 20);
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

/** Between a converted price and its companion on the same line. */
export const DEFAULT_COMPANION_SEPARATOR = ' · ';

/** Between the two ends of a converted range. */
const RANGE_SEPARATOR = ' – ';

/**
 * What separates one converted price from the next — a newline in BLOCK
 * layout, " | " inline, unless the options name their own.
 *
 * @param {Object} [options] - See DEFAULT_OPTIONS
 * @returns {string}
 */
export function priceSeparator(options = {}) {
  const resolved = { ...DEFAULT_OPTIONS, ...options };
  return resolved.separator ?? DEFAULT_SEPARATOR[resolved.layout] ?? ' ';
}

/**
 * Converted prices as rows, one per currency, ready to be laid out.
 *
 * A second amount belonging to the same price — a per-unit figure the site
 * shows next to it — rides along on each row instead of forming a stack of its
 * own, in `companion`:
 *
 *   priceRows(100, 'BYN', ['USD'], rates, { companion: { amount: 2, suffix: '/м²' } })
 *   // → [{ text: '$32.55', companion: '$0.65/м²' }]
 *
 * Rows rather than a finished string, because a caller may want the companion
 * in its own element — the host site usually prints its per-unit figure in a
 * quieter color, and matching that needs two elements, not one.
 *
 * @param {number} amount
 * @param {string} fromCurrency
 * @param {string[]} currencies - Ordered target currency codes
 * @param {Object} rates - Rates map from getExchangeRates().rates
 * A range — `upTo`, its high end in the same source currency — is converted
 * at both ends and written as one: "$131,500 – $277,000". The suffix goes on
 * the high end only.
 *
 * @param {Object} [options] - See DEFAULT_OPTIONS, plus `companion`:
 *   { amount, suffix } — the companion amount is in the SAME source currency;
 *   and `upTo`, the high end of a range.
 * @returns {Array<{ currency: string, text: string, companion: string }>}
 */
export function priceRows(amount, fromCurrency, currencies, rates, options = {}) {
  const resolved = { ...DEFAULT_OPTIONS, ...options };
  const companion = resolved.companion ?? {};

  const highParts = new Map(
    Number.isFinite(resolved.upTo)
      ? convertPrices(resolved.upTo, fromCurrency, currencies, rates, resolved)
        .map(part => [part.currency, part.text])
      : []
  );
  const lowOptions = highParts.size ? { ...resolved, suffix: '' } : resolved;

  // Keyed by currency rather than zipped by position: a currency missing from
  // one list would otherwise shift every later pairing by one.
  const companionParts = new Map(
    Number.isFinite(companion.amount)
      ? convertPrices(companion.amount, fromCurrency, currencies, rates, {
        ...resolved,
        suffix: companion.suffix ?? resolved.suffix,
      }).map(part => [part.currency, part.text])
      : []
  );

  return convertPrices(amount, fromCurrency, currencies, rates, lowOptions).map(part => ({
    currency: part.currency,
    text: highParts.has(part.currency)
      ? `${part.text}${RANGE_SEPARATOR}${highParts.get(part.currency)}`
      : part.text,
    companion: companionParts.get(part.currency) ?? '',
  }));
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
 *   formatPrices(100, 'BYN', ['USD'], rates, { companion: { amount: 2, suffix: '/м²' } })
 *   // → "$32.55 · $0.65/м²"
 *
 * @param {number} amount
 * @param {string} fromCurrency
 * @param {string[]} currencies - Ordered target currency codes
 * @param {Object} rates - Rates map from getExchangeRates().rates
 * @param {Object} [options] - See DEFAULT_OPTIONS and priceRows()
 * @returns {string} Empty string when nothing could be converted
 */
export function formatPrices(amount, fromCurrency, currencies, rates, options = {}) {
  const companionSeparator = options.companion?.separator ?? DEFAULT_COMPANION_SEPARATOR;

  return priceRows(amount, fromCurrency, currencies, rates, options)
    .map(row => (row.companion ? `${row.text}${companionSeparator}${row.companion}` : row.text))
    .join(priceSeparator(options));
}
