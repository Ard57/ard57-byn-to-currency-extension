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

    /**
     * Catalog widgets embedded in news articles, e.g.
     * tech.onliner.by/2026/09/17/kakoj-ajfon-vybrat. Set on the parent domain
     * because the widget is a shared news component; subdomains with their own
     * prices (catalog.) override the selector. Verified on tech. only.
     *
     *   <div class="news-widget__price">
     *     <div class="news-widget__price-value news-widget__price-value_primary">
     *       <a class="news-widget__link news-widget__link_other">2483 ƃ</a>
     *     </div>
     *   </div>
     *   <div class="news-widget__monthly">…от 75,78 ƃ/мес…</div>
     *
     * Only the price converts, not the monthly installment. The menu's
     * "Авто до 4000 ƃ" labels are outside the widget and never matched.
     *
     * Appended inside the price-value div, which carries the price's 20px
     * bold, so the conversion inherits it with no borrowed classes. The
     * column is 180px, so the ruble amount wraps to a second line.
     */
    priceSelector: '.news-widget__price-value_primary > .news-widget__link',
    priceContainer: '.news-widget__price-value_primary',
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
   * Real estate. Prices run to six or seven figures, so no cents anywhere.
   * The page always shows BYN (the ?currency= parameter changes nothing).
   *
   * Search page (r.onliner.by/pk/): cards appear in the list on the right AND
   * in the map popup opened by clicking a red dot. Both use the same card
   * component, so one selector covers both; the popup is added to the page on
   * click, and the content script's MutationObserver picks it up.
   *
   *   <span class="classified__figure" style="background-image: …">
   *     <span class="classified__price classified__price_primary">
   *       <span class="classified__price-value classified__price-value_primary">
   *         <span>305 000,00</span> <span class="classified__currency">ƃ</span>
   *
   * The number and the sign are separate spans, so the price element is their
   * parent and its combined text is parsed. The price box is absolutely
   * positioned at the bottom of the photo: a stacked conversion appended
   * inside it inherits the white bold text and its shadow, and the box grows
   * upward, staying inside the photo (measured in the 215px list card and
   * the 242px popup card).
   *
   * Apartment page (r.onliner.by/pk/apartments/1283917): the price sits in a
   * yellow panel, 21px on #ffdd22.
   *
   *   <div class="apartment-bar__item apartment-bar__item_price">
   *     <span class="apartment-bar__price apartment-bar__price_primary">
   *       <span class="apartment-bar__price-value apartment-bar__price-value_primary">1 103 322,00 ƃ</span>
   *
   * A `styles` rule keeps it on one line, appended inside the panel so the
   * yellow grows with it (55px → 75px). 0.7em fits the 280px text width even
   * for amounts several digits longer; 0.75em already wraps those.
   */
  'r.onliner.by': {
    layout: LAYOUT.BLOCK,
    decimals: 0,

    priceSelector: '.classified__price-value_primary, .apartment-bar__price-value_primary',
    priceContainer: '.classified__price',

    styles: [
      {
        selector: '.apartment-bar',
        layout: LAYOUT.INLINE,
        priceContainer: '.apartment-bar__item_price',
        fontSize: '0.7em',
        fontWeight: 'bold',
      },
    ],
  },

  /**
   * Cars. Large round numbers, so no cents in any currency.
   *
   * Only onliner's own BYN price of each ad converts. Not similar-ad prices,
   * leasing ("от 1013 ƃ месяц", "Первоначальный взнос 22 399 ƃ"), or the menu's
   * "Авто до 4000 ƃ" labels. A price element holding USD text is left alone
   * too: the parser only reads BYN markers, so it finds nothing to convert.
   *
   * Listing cards (ab.onliner.by/), two variants, each the only child of the
   * price part:
   *
   *   <div class="vehicle-form__offers-part vehicle-form__offers-part_price">
   *     <div class="vehicle-form__description ... _font-weight_bold ..."> 17 532 ƃ </div>
   *   </div>
   *   <div class="vehicle-form__offers-part vehicle-form__offers-part_price">
   *     <div class="button-style ... vehicle-form__button_price"> 24 000 ƃ </div>
   *   </div>
   *
   * The price part is a flex row with font-size 0 — anything appended inside
   * it inherits 0px and is invisible. So the conversion goes right after the
   * price and borrows the regular price's classes (16px bold); fontSize is
   * reset because an em size would scale off that 0px.
   *
   * Ad page (ab.onliner.by/audi/a6/5077777): the price is `.jest-price-byn`,
   * 36px bold, which does not fit on one line. A `styles` rule swaps in the
   * similar-ads price classes (15px semibold), which do.
   *
   * Both page kinds share one selector with an element-scoped rule rather
   * than a URL page rule: a three-segment URL pattern would also match
   * generation listings like /audi/a6/4gc7-restayling and strip their card
   * conversions.
   *
   * Stacked on the listing: in the narrow price column none of the cards fit
   * all three currencies on one line. The ad page has room, so its rule keeps
   * the conversion inline.
   */
  'ab.onliner.by': {
    layout: LAYOUT.BLOCK,
    decimals: 0,

    priceSelector: '.vehicle-form__offers-part_price > div, .jest-price-byn',
    insertPosition: 'after',
    className: 'vehicle-form__description vehicle-form__description_middle vehicle-form__description_primary vehicle-form__description_font-weight_bold vehicle-form__description_condensed-other',
    fontSize: null,

    styles: [
      {
        selector: '.jest-price-byn',
        layout: LAYOUT.INLINE,
        className: 'vehicle-form__description vehicle-form__description_primary vehicle-form__description_base-alter vehicle-form__description_font-weight_semibold',
      },
    ],
  },

  /**
   * Motorcycles. An older table-based design, so nothing is shared with the
   * car site's markup. Whole numbers, like cars.
   *
   * Search page (mb.onliner.by/), one price per row, then a separate
   * "ТОРГ / ОБМЕН" paragraph:
   *
   *   <td class="cost lst"><div class="cost-i">
   *     <p class="big"><a><span class="price-primary">51 150 ƃ</span></a></p>
   *     <p><strong class="c-torg">ТОРГ</strong></p>
   *   </div></td>
   *
   * The price column is 80px wide, so the conversion is stacked, appended
   * inside p.big right under the price. There it inherits 13px; bold is added
   * to match the price (18px bold does not fit the column).
   *
   * Bike page (mb.onliner.by/moto/216196) shows the same price twice, in the
   * header and again under the description. Both are this bike's own price,
   * so both convert:
   *
   *   <div class="autoba-hd-details">
   *     <span class="autoba-hd-details-costs"><span class="cost price-primary">52 295 ƃ</span></span>
   *     <strong class="c-torg">ТОРГ</strong>
   *   </div>
   *
   * Both containers have font-size 0, so an inherited or em size would be
   * invisible and the rule sets an explicit 15px semibold (as on the car ad
   * page). Appended to the details row, after "ТОРГ", keeping the price and
   * its badge together on one line with the conversion below.
   *
   * The price filter's "ƃ" label (strong.price-filter) has no number and is
   * outside both selectors.
   */
  'mb.onliner.by': {
    layout: LAYOUT.BLOCK,
    decimals: 0,

    priceSelector: 'td.cost .price-primary, .autoba-hd-details .price-primary',
    priceContainer: '.cost-i .big',
    fontSize: null,
    fontWeight: 'bold',

    styles: [
      {
        selector: '.autoba-hd-details',
        layout: LAYOUT.INLINE,
        priceContainer: '.autoba-hd-details',
        fontSize: '15px',
        fontWeight: '600',
        // The row falls back to Verdana; the price itself uses this stack.
        fontFamily: 'nbrb, Arial, Helvetica',
      },
    ],
  },
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
