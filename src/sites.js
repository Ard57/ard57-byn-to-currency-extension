import { LAYOUT } from './format.js';

/**
 * Built-in site presets, shipped with the extension.
 *
 * These are defaults, not user data: they sit between DEFAULT_SETTINGS and
 * whatever the user has stored, so a preset improves a site out of the box and
 * the user can still override any field of it.
 *
 *   DEFAULT_SETTINGS ← SITE_PRESETS ← stored settings
 *
 * Keys are hostnames, matched broadest to narrowest along the hostname chain.
 * For "r.onliner.by" the chain is:
 *
 *   by  →  onliner.by  →  r.onliner.by
 *
 * Whichever of those exist are merged in that order, so shared presentation
 * lives once on the parent domain and each subdomain overrides only what
 * differs. Nobody stores a bare "by" entry, so the chain walk never needs a
 * public-suffix list to know where the registrable domain starts.
 *
 * Fields are the same ones resolveSettings() produces — see settings.js for
 * the full list and DEFAULT_SETTINGS for the fallbacks.
 *
 * ── Styling ──────────────────────────────────────────────────────────────────
 *
 * The converted price is inserted inside the element holding the original
 * price, so by default it INHERITS that element's font family, weight and
 * color. Nothing about color is stored: white bold text over a listing photo
 * and black text on a yellow panel both come out matching, with no config.
 *
 * Presets therefore only store *relative* adjustments that read correctly on
 * any background — `fontSize` in em, `opacity` — so the conversion looks like
 * part of the site's price, just quieter.
 *
 * When inheritance is not enough, `styles` holds element-scoped overrides:
 *
 *   styles: [
 *     { selector: '.some-card .price', opacity: 1, fontWeight: 'normal' },
 *     { selector: '.some-panel .price', fontSize: '0.7em' },
 *   ]
 *
 * Each rule is tested with `priceElement.closest(selector)`; the FIRST match
 * wins and its fields are applied over the host-level ones. Rules are scoped
 * by element rather than by URL on purpose: one page can hold both kinds of
 * price at once — an apartment page with a "similar listings" strip of cards
 * under its own price panel — and a page rule could only pick one style for
 * all of them.
 */
export const SITE_PRESETS = {
  /**
   * Shared across every onliner subdomain. Color and weight are inherited
   * from each price; only size and emphasis are toned down.
   *
   * Currencies are deliberately not set here — the user's global choice should
   * carry over rather than a site preset dictating which currencies matter.
   */
  'onliner.by': {
    fontSize: '0.85em',
    opacity: 0.85,
  },

  /**
   * Product catalog. Dense listing grids; decimals follow the global default
   * (cents for USD and EUR, whole rubles).
   */
  'catalog.onliner.by': {
    layout: LAYOUT.INLINE,

    /**
     * Listing cards. Inside the price link the current price is the only span
     * without a class: the optional "от" prefix and the struck-through old
     * price both carry one.
     *
     *   <a class="catalog-form__link catalog-form__link_huge-additional ...">
     *     <span class="..."> от </span>
     *     <span>1744,64 ƃ</span>
     *     <span class="... catalog-form__description_through">1879,00 ƃ</span>
     *   </a>
     */
    priceSelector: '.catalog-form__link_huge-additional > span:not([class])',

    /**
     * Appended inside the price block, not the link: the conversion inherits
     * the price's font and color without becoming part of the clickable text.
     */
    priceContainer: '.catalog-form__description_huge-additional',

    pages: [
      {
        /**
         * Product page, e.g. /mobile/google/pixel11pro16512o. Only the lowest
         * price across stores is converted: not the monthly installment, not
         * the per-store offers, not the "N предложений (от …)" button, and not
         * recommended products. All of those also say "ƃ", which is why the
         * selector names the one link rather than scanning for prices.
         *
         *   <div class="h_flx_grw h_mnw_zer">
         *     <a class="... js-description-price-link h_txt_pri-t">
         *       <div class="h_txt_tl2">от </div>
         *       <div class="h_txt_tl0">5039</div>
         *       <div class="h_txt_tl2">,00 ƃ</div>
         *     </a>
         *     <div class="h_txt_ftr ...">от 155,37 ƃ/мес частями</div>
         *     ...
         *   </div>
         *
         * The price is split across three divs, so the whole link is the
         * price element and its combined text is what gets parsed.
         *
         * Inserted right after the link, so it sits above the installment
         * row. There it inherits only the container's 14px regular text, so
         * a site class sets the look. `h_txt_fte` is 14px bold: the size of
         * the installment row, bold like the price. The price's own 28px
         * (`h_txt_tl2`) does not fit three currencies on one line in the
         * 419px panel, and 24px (`h_txt_tl3`) fits by only 5px — a longer
         * ruble amount would wrap. Measured at a 1400px window; at 1024px the
         * panel is 234px and even 14px wraps by a few pixels.
         *
         * fontSize is reset because an inherited em size would override the
         * class and scale off the container instead.
         *
         * The pattern needs three path segments, so the /mobile listing never
         * matches. It does match /…/prices and similar subpages, where the
         * selector simply finds nothing if the link is absent.
         */
        pattern: '/*/*/*',
        priceSelector: '.js-description-price-link',
        insertPosition: 'after',
        className: 'h_txt_fte',
        fontSize: null,
      },
    ],
  },

  /**
   * Real estate. Prices run to six figures, where kopecks are noise, and
   * listings have vertical room for a stacked conversion.
   *
   * Two price contexts, both covered by inheritance alone for now:
   *   - listing cards: white bold text over the photo
   *   - apartment page: black text on a yellow panel
   *
   * TODO: add `styles` entries once the real selectors are inspected — e.g. if
   * the card's photo leaves too little room for a stacked block.
   */
  'r.onliner.by': {
    layout: LAYOUT.BLOCK,
    decimals: 0,
    styles: [],
  },

  /**
   * Cars. Same reasoning as real estate — large round numbers.
   */
  'ab.onliner.by': {
    layout: LAYOUT.BLOCK,
    decimals: 0,
  },

  /**
   * TODO: confirm what mb.onliner.by actually sells before tuning this.
   * Until then it inherits the onliner.by styling and the global layout and
   * decimals, which is the safe default rather than a guess.
   */
  'mb.onliner.by': {},
};

/**
 * Every hostname a preset exists for, broadest first.
 *
 * "r.onliner.by" yields ["by", "onliner.by", "r.onliner.by"] — the chain a
 * resolver walks, merging each entry that exists.
 *
 * @param {string} hostname - Already normalized (lowercased, no "www.")
 * @returns {string[]} Hostname chain, broadest to narrowest
 */
export function hostnameChain(hostname) {
  if (typeof hostname !== 'string' || !hostname) {
    return [];
  }

  const labels = hostname.split('.');

  return labels
    .map((_, index) => labels.slice(index).join('.'))
    .reverse();
}
