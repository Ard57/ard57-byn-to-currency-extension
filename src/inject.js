import { findPrices } from './parse.js';
import { formatPrices } from './format.js';
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

/** Style fields that settings or a `styles` rule may set. */
const STYLE_FIELDS = ['fontSize', 'fontWeight', 'fontFamily', 'lineHeight', 'color', 'opacity'];

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
 * @param {Element} element
 * @returns {string}
 */
function priceText(element) {
  if (!element.querySelector(`[${MARKER_ATTRIBUTE}]`)) {
    return element.textContent;
  }

  let text = '';
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.parentElement.closest(`[${MARKER_ATTRIBUTE}]`)) {
      text += node.data;
    }
  }
  return text;
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
 * @param {string} text - Output of formatPrices
 * @param {Object} settings - Settings for this price
 * @returns {HTMLElement}
 */
function render(text, settings) {
  const node = document.createElement('div');
  node.setAttribute(MARKER_ATTRIBUTE, '');
  node.textContent = text;

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

    const source = priceText(priceElement);
    const previous = inserted.get(priceElement);

    if (previous && previous.source === source && previous.node.isConnected) {
      continue;
    }

    previous?.node.remove();
    inserted.delete(priceElement);

    const [price] = findPrices(source);
    if (!price) {
      continue;
    }

    const effective = settingsForPrice(priceElement, settings);
    const text = formatPrices(price.amount, SOURCE_CURRENCY, effective.currencies, rates, effective);
    if (!text) {
      continue;
    }

    const node = render(text, effective);

    if (effective.insertPosition === 'after') {
      priceElement.after(node);
    } else {
      const container = safeClosest(priceElement, effective.priceContainer) ?? priceElement.parentElement;
      if (!container) {
        continue;
      }
      if (effective.insertPosition === 'afterContainer') {
        container.after(node);
      } else {
        container.appendChild(node);
      }
    }

    inserted.set(priceElement, { source, node });
    changed++;
  }

  return changed;
}
