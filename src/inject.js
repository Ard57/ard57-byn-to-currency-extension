import { findPriceRange, findPrices } from './parse.js';
import { priceRows, priceSeparator, DEFAULT_COMPANION_SEPARATOR } from './format.js';
import { SOURCE_CURRENCY } from './settings.js';

/**
 * Putting converted prices into the page.
 *
 * Works only from a resolved settings object (see resolveSettings) and a rates
 * map. It knows nothing about storage or messaging, so the same code runs in
 * the content script and in a plain test page.
 */

/** Marks every element this extension inserts. */
const MARKER_ATTRIBUTE = 'data-byn-to-currency';

/**
 * Style fields that settings or a `styles` rule may set.
 *
 * `flexBasis` is here for one job: the conversion is a block, which already
 * takes a line of its own in ordinary flow, but a flex container lays its
 * children out side by side instead. `flexBasis: '100%'` fills the line in a
 * wrapping flex row, putting the conversion back under the price.
 *
 * `order` serves the same end in a grid: where the price is pinned to a row
 * of its own and everything else is auto-placed, a negative order makes the
 * conversion the first of those, so it lands in the row right below the price
 * instead of behind whatever the markup happens to list next.
 */
const STYLE_FIELDS = [
  'fontSize', 'fontWeight', 'fontFamily', 'lineHeight', 'color', 'opacity',
  'flexBasis', 'order', 'margin', 'whiteSpace', 'float', 'width', 'textAlign',
];

/**
 * What was inserted for each price element, and for which source text.
 * Weakly held, so prices the site re-renders away are simply forgotten.
 */
const inserted = new WeakMap();

/**
 * element.closest() that tolerates a missing or malformed selector — a typo in
 * stored settings must not break the scan for every other price.
 *
 * @param {Element} element
 * @param {string|null} selector
 * @returns {Element|null}
 */
function safeClosest(element, selector) {
  if (typeof selector !== 'string' || !selector) {
    return null;
  }
  try {
    return element.closest(selector);
  } catch {
    return null;
  }
}

/**
 * The price element's text, minus any conversion inserted inside it.
 *
 * A preset may append the conversion into the price element itself (to stack
 * it under the price inside a flex item). Its text must not count as part of
 * the price, or every scan would see changed text and re-insert — forever,
 * since each insertion triggers the next scan.
 *
 * Pieces of text are joined as they stand — 21vek splits "509,00 Ҕ" into
 * "509" and ",00 Ҕ" — except where two words would run together: olx.pl
 * puts "do negocjacji" in its own element right after "33 000 zł", and as
 * "złdo" the sign would no longer read as one. A space goes between two
 * pieces only when the first ends in a letter and the next starts with one.
 *
 * Style and script text is skipped: otomoto.pl renders its CSS-in-JS rules as
 * <style> elements inside the price, and "24px" is no part of it.
 *
 * @param {Element} element
 * @returns {string}
 */
function priceText(element) {
  let text = '';
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.parentElement.closest(`[${MARKER_ATTRIBUTE}], style, script`)) {
      continue;
    }
    if (/\p{L}$/u.test(text) && /^\p{L}/u.test(node.data)) {
      text += ' ';
    }
    text += node.data;
  }
  return text;
}

/**
 * The element holding the companion price for a price, if the settings ask for
 * one: a per-unit figure the site prints beside the price, e.g. "7 586 р./м²".
 *
 * `scope` names the ancestor the two share; when it matches nothing, the
 * price's own parent is searched, which covers the common case of the two
 * sitting side by side in one row.
 *
 * @param {Element} priceElement
 * @param {Object} companion - { scope, selector }
 * @returns {Element|null}
 */
function companionElement(priceElement, companion) {
  if (!companion?.selector) {
    return null;
  }

  const scope = safeClosest(priceElement, companion.scope) ?? priceElement.parentElement;
  try {
    return scope?.querySelector(companion.selector) ?? null;
  } catch {
    return null;
  }
}

/**
 * Where a conversion is inserted, from `priceContainer`.
 *
 * A plain selector names an ancestor of the price, which covers almost every
 * site. An { scope, selector } pair instead names a card and an element
 * inside it, for the rare layout where the only place a line fits is a
 * sibling subtree rather than anything above the price — see the tiles in
 * sites.js under salon.av.by.
 *
 * Either way, a selector that matches nothing falls back to the price's own
 * parent rather than dropping the conversion.
 *
 * @param {Element} priceElement
 * @param {string|{scope: string, selector: string}|null} container
 * @returns {Element|null}
 */
function containerFor(priceElement, container) {
  if (container && typeof container === 'object') {
    const scope = safeClosest(priceElement, container.scope);
    try {
      return scope?.querySelector(container.selector) ?? priceElement.parentElement;
    } catch {
      return priceElement.parentElement;
    }
  }

  return safeClosest(priceElement, container) ?? priceElement.parentElement;
}

/**
 * Settings for one price: the resolved settings, with the first matching
 * `styles` rule on top. A rule may override formatting as well as styling —
 * a cramped card can switch layout without the rest of the page changing.
 *
 * @param {Element} priceElement
 * @param {Object} settings
 * @returns {Object}
 */
function settingsForPrice(priceElement, settings) {
  const rules = Array.isArray(settings.styles) ? settings.styles : [];
  const rule = rules.find(candidate => candidate && safeClosest(priceElement, candidate.selector));

  if (!rule) {
    return settings;
  }

  const { selector, ...overrides } = rule;
  return { ...settings, ...overrides };
}

/**
 * Builds the element holding the converted prices.
 *
 * Only the fields that are set become inline styles. Everything else — font
 * family, weight, color — is inherited from where the element lands, which is
 * what makes the conversion look like part of the site. When the price's look
 * comes from its own classes rather than an ancestor, `className` borrows the
 * site's classes directly.
 *
 * A companion figure gets its own span on each line, so it can keep the
 * quieter color the site gives its own per-unit price (`companion.color`)
 * while the converted price itself stays as prominent as the price above it.
 *
 * @param {Array<{ text: string, companion: string }>} rows - From priceRows()
 * @param {Object} settings - Settings for this price
 * @returns {HTMLElement}
 */
function render(rows, settings) {
  const node = document.createElement('div');
  node.setAttribute(MARKER_ATTRIBUTE, '');

  const separator = priceSeparator(settings);
  const companionSeparator = settings.companion?.separator ?? DEFAULT_COMPANION_SEPARATOR;

  rows.forEach((row, index) => {
    if (index > 0) {
      node.append(separator);
    }
    node.append(row.text);

    if (row.companion) {
      const companion = document.createElement('span');
      companion.textContent = companionSeparator + row.companion;
      if (settings.companion?.color) {
        companion.style.color = settings.companion.color;
      }
      node.append(companion);
    }
  });

  if (typeof settings.className === 'string') {
    node.classList.add(...settings.className.split(' ').filter(Boolean));
  }

  // BLOCK layout joins currencies with newlines; pre-line turns those into
  // line breaks while still collapsing any other whitespace.
  node.style.whiteSpace = 'pre-line';

  for (const field of STYLE_FIELDS) {
    if (settings[field] !== undefined && settings[field] !== null) {
      node.style[field] = String(settings[field]);
    }
  }

  return node;
}

/**
 * Puts `settings.pageStyles` on the page, in a style element marked like the
 * conversions so that removeConversions() takes it away with them. Replaced
 * when the styles change, removed when there are none, otherwise left alone —
 * it runs on every scan.
 *
 * @param {Object} settings - Resolved settings for the current URL
 */
export function applyPageStyles(settings) {
  const existing = document.querySelector(`style[${MARKER_ATTRIBUTE}]`);
  const css = settings?.pageStyles;

  if (existing && existing.textContent === css) {
    return;
  }
  existing?.remove();

  if (!css) {
    return;
  }

  const style = document.createElement('style');
  style.setAttribute(MARKER_ATTRIBUTE, '');
  style.textContent = css;
  (document.head ?? document.documentElement).append(style);
}

/**
 * Removes every conversion this extension has inserted under `root`, and
 * the page styles that went with them.
 *
 * For when the settings change rather than the page: the prices themselves
 * are untouched, so annotatePrices() would skip each one as already done and
 * the old currencies would stay on screen. Clearing first has the next scan
 * render them afresh — and leaves the page as the site wrote it when the new
 * settings convert nothing at all.
 *
 * The record of what was inserted needs no clearing: those nodes are now
 * disconnected, which is itself the signal to insert again.
 *
 * @param {ParentNode} [root] - Where to look, usually `document`
 * @returns {number} How many conversions were removed
 */
export function removeConversions(root = document) {
  const nodes = root.querySelectorAll(`[${MARKER_ATTRIBUTE}]`);

  for (const node of nodes) {
    node.remove();
  }

  return nodes.length;
}

/**
 * Adds converted prices next to every price matched by `settings.priceSelector`.
 *
 * Safe to call repeatedly — it is what the MutationObserver calls on every
 * change. A price whose text is unchanged and whose conversion is still in
 * the page is skipped without touching the DOM, which is also what stops the
 * observer from looping on these insertions. A price whose text changed has
 * its old conversion replaced.
 *
 * @param {ParentNode} root - Where to look, usually `document`
 * @param {Object} settings - Resolved settings for the current URL
 * @param {Object} rates - Rates map from getExchangeRates().rates
 * @returns {number} How many conversions were inserted or replaced
 */
export function annotatePrices(root, settings, rates) {
  if (!settings?.priceSelector || !rates) {
    return 0;
  }

  let priceElements;
  try {
    priceElements = root.querySelectorAll(settings.priceSelector);
  } catch {
    return 0;
  }

  let changed = 0;

  for (const priceElement of priceElements) {
    if (priceElement.closest(`[${MARKER_ATTRIBUTE}]`)) {
      continue;
    }

    const effective = settingsForPrice(priceElement, settings);
    const companion = companionElement(priceElement, effective.companion);
    const companionSource = companion ? priceText(companion) : '';

    // The companion is part of what was rendered, so a change to it has to
    // count as a change to this price.
    const source = priceText(priceElement) + companionSource;
    const previous = inserted.get(priceElement);

    // Still ours means still in the page, still marked, still reading what
    // was written. Sites that hydrate server-rendered markup (ozon.by, on
    // Vue) can adopt an inserted <div> as one of their own and rewrite it in
    // place: it stays connected, but the conversion is gone.
    const stillOurs = previous?.node.isConnected
      && previous.node.hasAttribute(MARKER_ATTRIBUTE)
      && previous.node.textContent === previous.text;

    if (stillOurs && previous.source === source) {
      continue;
    }

    // A node the site has taken over is the site's now; removing it would
    // tear a hole in its layout.
    // Our marker and inline style are let go too: left behind, the marker
    // would have removeConversions() delete the site's element, and the
    // style would draw it in ours.
    if (stillOurs) {
      previous.node.remove();
    } else if (previous) {
      previous.node.removeAttribute(MARKER_ATTRIBUTE);
      if (previous.node.getAttribute('style') === previous.style) {
        previous.node.removeAttribute('style');
      }
    }
    inserted.delete(priceElement);

    // Read in the region's currency, which every conversion starts from.
    const currency = effective.sourceCurrency ?? SOURCE_CURRENCY;
    const parseOptions = { requireMarker: !effective.markerOptional, currency };

    // Zero converts to zero in every currency, so there is nothing to show.
    // Booking forms print a "0 BYN" total until dates are picked, and sites
    // put "0 ƃ" on "list your ad for free" buttons.
    const price = findPriceRange(priceText(priceElement), parseOptions);
    if (!price || price.amount === 0) {
      continue;
    }

    const [companionPrice] = findPrices(companionSource, parseOptions);
    const forPrice = {
      ...effective,
      companion: { ...effective.companion, amount: companionPrice?.amount },
      upTo: price.upTo,
    };
    const rows = priceRows(price.amount, currency, effective.currencies, rates, forPrice);
    if (!rows.length) {
      continue;
    }

    const node = render(rows, forPrice);

    if (effective.insertPosition === 'after') {
      priceElement.after(node);
    } else if (effective.insertPosition === 'before') {
      priceElement.before(node);
    } else {
      const container = containerFor(priceElement, effective.priceContainer);
      if (!container) {
        continue;
      }
      if (effective.insertPosition === 'afterContainer') {
        container.after(node);
      } else if (effective.insertPosition === 'prepend') {
        container.prepend(node);
      } else {
        container.appendChild(node);
      }
    }

    inserted.set(priceElement, {
      source,
      node,
      text: node.textContent,
      style: node.getAttribute('style'),
    });
    changed++;
  }

  return changed;
}
