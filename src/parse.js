/**
 * Finding BYN prices in page text.
 *
 * Belarusian sites write prices in a handful of shapes:
 *
 *   1 234,56 р.      199 руб.        Br 1 234
 *   1234.56 BYN      12,50 руб       5 р
 *   1744,64 ƃ
 *
 * The last one is onliner's: it writes BYN as "ƃ" (U+0183).
 *
 * Grouping is a space — very often a non-breaking or narrow one — and the
 * decimal separator is usually a comma, though sites that lean on JS number
 * formatting emit dots. Both have to work.
 */

/**
 * Currency markers, longest alternatives first so "руб." beats "р.".
 *
 * Both Cyrillic "р" and Latin "p" appear in the wild — sites are inconsistent
 * and the two are visually identical. The letter guards keep a marker from
 * matching inside a word: "5 рядов" must not read as 5 rubles.
 */
const MARKER = /(?<!\p{L})(?:BYN|Br|ƃ|бел\.?\s*руб\.?|руб\.?|[рp]\.?)(?!\p{L})/;

/**
 * A run of digits that may contain grouping spaces and separators.
 *
 * `\s` already covers U+00A0 (non-breaking), U+202F (narrow no-break) and
 * U+2009 (thin), which is exactly what sites use for grouping.
 *
 * A space is consumed only when a digit follows it, so "199 руб." stops the
 * number at "199" rather than swallowing the space before the marker.
 */
const NUMBER = /\d(?:[\d.,]|\s(?=\d))*/;

/** Whitespace between a marker and its number. */
const GAP = /\s*/;

/**
 * Prefix marker, number, suffix marker — the outer two both optional.
 *
 * Matches with neither marker are discarded by findPrices(). Letting the regex
 * match a bare number and filtering afterwards keeps the pattern readable; the
 * alternative is two near-identical branches.
 *
 * Composed from the regex literals above rather than written as one string:
 * every backslash then lives inside a literal, where it means what it looks
 * like, instead of being escaped twice through a string.
 */
const PRICE_PATTERN = new RegExp(
  '(?:(?<prefix>' + MARKER.source + ')' + GAP.source + ')?' +
  '(?<number>' + NUMBER.source + ')' +
  '(?:' + GAP.source + '(?<suffix>' + MARKER.source + '))?',
  'giu'
);

/**
 * Parses a numeric string into a number, resolving the separator ambiguity
 * between Belarusian, European and US conventions.
 *
 * Rules, in order:
 *   - Both "." and "," present → the rightmost is the decimal separator
 *     ("1.234,56" → 1234.56, "1,234.56" → 1234.56)
 *   - One separator appearing more than once → grouping ("1.234.567")
 *   - One separator with exactly 3 digits after it → grouping ("1,234" → 1234).
 *     Genuinely ambiguous, but a price is likelier to be twelve hundred than
 *     one and a bit.
 *   - Otherwise → decimal separator ("12,50" → 12.5)
 *
 * @param {string} raw - Numeric text, e.g. "1 234,56"
 * @returns {number|null} Parsed value, or null if there is no number in it
 */
export function parseAmount(raw) {
  if (typeof raw !== 'string') {
    return null;
  }

  const compact = raw.replace(/\s/gu, '');
  if (!/\d/.test(compact)) {
    return null;
  }

  const lastComma = compact.lastIndexOf(',');
  const lastDot = compact.lastIndexOf('.');
  let decimalIndex = -1;

  if (lastComma >= 0 && lastDot >= 0) {
    decimalIndex = Math.max(lastComma, lastDot);
  } else {
    const sepIndex = Math.max(lastComma, lastDot);

    if (sepIndex >= 0) {
      const separator = compact[sepIndex];
      const occurrences = compact.split(separator).length - 1;
      const digitsAfter = compact.length - sepIndex - 1;

      if (occurrences === 1 && digitsAfter !== 3) {
        decimalIndex = sepIndex;
      }
    }
  }

  const wholeText = decimalIndex >= 0 ? compact.slice(0, decimalIndex) : compact;
  const fractionText = decimalIndex >= 0 ? compact.slice(decimalIndex + 1) : '';

  const whole = wholeText.replace(/\D/gu, '');
  const fraction = fractionText.replace(/\D/gu, '');

  if (!whole && !fraction) {
    return null;
  }

  const value = Number((whole || '0') + '.' + (fraction || '0'));
  return Number.isFinite(value) ? value : null;
}

/**
 * Finds every BYN price in a string.
 *
 * A bare number is never a price — without a currency marker on one side or
 * the other, annotating it would rewrite dates, quantities and model numbers.
 *
 * Offsets are returned so a caller can splice the original text node rather
 * than rebuild it, keeping the surrounding markup intact.
 *
 * @param {string} text - Text to scan, typically one text node
 * @returns {Array<{ index: number, length: number, amount: number, raw: string }>}
 */
export function findPrices(text) {
  if (typeof text !== 'string' || !text) {
    return [];
  }

  const found = [];

  // matchAll builds its own regex from this one, so the shared PRICE_PATTERN's
  // lastIndex is never mutated and concurrent scans cannot interfere.
  for (const match of text.matchAll(PRICE_PATTERN)) {
    const { prefix, suffix, number } = match.groups;

    if (!prefix && !suffix) {
      continue;
    }

    const amount = parseAmount(number);
    if (amount === null) {
      continue;
    }

    found.push({
      index: match.index,
      length: match[0].length,
      amount,
      raw: match[0],
    });
  }

  return found;
}
