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

  /**
   * Classifieds, including auto.kufar.by. A Next.js site whose class names are
   * CSS-module hashes ("styles-module-scss-module__eug91q__price") that change
   * on redeploy, so selectors lean on data-testid, data-name, and the unhashed
   * tail of a class name via [class*=…] / [class$=…].
   *
   * Everything lives on the parent domain: auto. reuses the same components,
   * and the rules are scoped by element, so each only fires where its markup
   * exists.
   *
   * Listing cards (kufar.by/l/mobilnye-telefony), two variants:
   *
   *   <div class="…__price_block">
   *     <p class="…__price" data-testid="card-price"><span>4 999 р.</span></p>
   *   </div>
   *
   *   <div class="…__price_block">
   *     <div class="…__wrapper">
   *       <span class="…__old_price">4 800 р.</span>
   *       <div class="…__price__wrapper">
   *         <span class="…__price" data-testid="card-price">3 520 р.</span>
   *         <span class="…__discount">-27%</span>
   *
   * The price <p> is line-clamped to two lines with overflow hidden, and the
   * discounted price sits in an inline-flex row with its badge, so neither is
   * a safe place to append. The conversion goes at the end of the price block
   * in both cases, under the price. It inherits the card text's 14px regular.
   * "Договорная" has no number and is skipped by the parser.
   *
   * The same cards appear as recommendations on the ad page and convert there
   * too.
   *
   * Car cards and ad pages: see the `styles` rules.
   */
  'kufar.by': {
    layout: LAYOUT.INLINE,

    priceSelector: [
      '[data-testid="card-price"]',
      '[data-name="av_right_sidebar"] [class$="__main"]:not(:has([class*="__discountContainer"]))',
      '[data-name="av_right_sidebar"] [class*="__discountContainer"] > [class$="__price"]',
    ].join(', '),
    priceContainer: '[class*="__price_block"]',

    styles: [
      {
        /**
         * The ad's own price in the right sidebar, on both kufar.by/item/… and
         * auto.kufar.by/vi/cars/…:
         *
         *   <div data-name="av_right_sidebar">
         *     …
         *     <div class="…__container …__price">
         *       <span class="…__main">1 650 р.</span>
         *     </div>
         *
         * (On kufar.by the container also sits inside a schema.org Offer div;
         * auto. has none, so the selector does not rely on it.)
         *
         * Discounted, the span holds old price, price and badge instead:
         *
         *       <span class="…__main">
         *         <div class="…__discountContainer">
         *           <div class="…__oldPrice">7 290 р.</div>
         *           <div class="…__price">5 990 р.</div>
         *           <div class="…__discount">-18%</div>
         *
         * The span's text would then start with the old price, so the selector
         * takes the inner price div instead. `[class$="__price"]` alone would
         * also match the outer container, whose last class ends the same way.
         *
         * Stacked, right after the price container rather than inside it: that
         * one is nowrap with overflow hidden. `[class*="__container"]` does not
         * match "__discountContainer" — the C is uppercase there.
         *
         * The fixed footer that repeats the price while scrolling is left
         * alone — it is a one-line bar that stacked text would push open.
         */
        selector: '[data-name="av_right_sidebar"]',
        layout: LAYOUT.BLOCK,
        priceContainer: '[class*="__container"]',
        insertPosition: 'afterContainer',
        // auto.kufar.by sets body line-height: 1, which squeezes the stack.
        lineHeight: 1.4,
      },
      {
        /**
         * Car cards (auto.kufar.by/l/cars) and the car recommendations on a
         * car ad page. The price shares a row with a gray secondary span:
         *
         *   <div class="…__info__price">          (flex row; on ad pages a
         *     <span data-testid="card-price">40 800 р.</span>   clamped box)
         *     <span></span>
         *   </div>
         *
         * Neither row can take a stacked conversion, so it goes right after
         * the row, under the BYN price and above the badges / parameters.
         *
         * Scoped to a card price whose PARENT's class ends in "__price". The
         * generic cards never match: there the parent is "…__price_block" or
         * "…__price__wrapper", and the price itself does not count.
         */
        selector: '[class$="__price"] > [data-testid="card-price"]',
        layout: LAYOUT.BLOCK,
        priceContainer: '[class$="__price"]',
        insertPosition: 'afterContainer',
        lineHeight: 1.4,
      },
    ],
  },

  /**
   * Real estate. Own components, none of which the kufar.by rules fit, so this
   * preset replaces the parent's selector and rules outright. Six-figure
   * prices, so no cents.
   *
   * One stack under the price, a currency per line, each line carrying that
   * currency's total AND its price per m²:
   *
   *   $190,822 · $2,589/м²
   *
   * The same conversions are what Kufar hides behind the calculator icon's
   * tooltip — the icon stays, the conversions are simply always visible.
   *
   * Listing cards (re.kufar.by/l/belarus/kupit/kvartiru), a flex row:
   *
   *   <div class="…__price …__price__map">
   *     <span class="…__price__byr" data-testid="card-price">178 008 р.</span>
   *     <span class="…__price__meter">4 485 р./м²</span>
   *     <div class="…__calculator-icon">…</div>
   *
   * The row is nowrap with overflow hidden, so the stack is appended INSIDE
   * the price span (priceContainer ':scope' — closest() matches the element
   * itself). Flex items are blockified, so the stack sits under the number.
   *
   * Map popup cards are a different component: same class tails, but the
   * price span carries no data-testid and the spans are inline rather than a
   * flex row. Hence the [class$="__price__byr"] selector, which covers both.
   *
   * Ad page (re.kufar.by/vi/minsk/kupit/kvartiru/1080759810), a flex row
   * aligned to the bottom:
   *
   *   <div class="…__adview_desktop_price">
   *     <div class="…__container …__price"><span class="…__main">559 107 р.</span></div>
   *     <div><span class="…__per_square_meter">7 586 р./м²</span></div>
   *     <div class="…__calculator-icon">…</div>
   *
   * Same treatment; the size and line height are set explicitly because the
   * price above the stack differs in size from page to page (24px here, 18px
   * on cards). The stack keeps the price's weight and color.
   *
   * Recommendations on the ad page, no data-testid:
   *
   *   <div class="…__header">
   *     <p class="…__price"><span>483 552 р.</span><span></span></p>
   *
   * The <p> is nowrap with overflow hidden; the first span is inline-block,
   * so the stack goes inside it like the others.
   *
   * The fixed footer bar repeating the price is left alone, as on kufar.by.
   */
  're.kufar.by': {
    layout: LAYOUT.BLOCK,
    decimals: 0,

    priceSelector: [
      '[data-testid="card-price"]',
      '[class$="__price__byr"]',
      '[class$="__adview_desktop_price"] [class$="__main"]',
      '[class$="__header"] > [class$="__price"] > span:first-child',
    ].join(', '),
    priceContainer: ':scope',
    fontSize: '14px',
    lineHeight: '20px',

    /**
     * The per-m² figure rides along on each line — "$190,822 · $2,589/м²" —
     * rather than converting into a stack of its own. Two stacks only line up
     * where the row is a flex row (list cards, ad page); in the map popup the
     * spans are inline, so a separate stack would put all eight numbers in one
     * column.
     *
     * Scope: the ad page's price and per-m² figure sit in different children
     * of the price row, so they need a named common ancestor. On every card
     * the two are siblings, the scope matches nothing, and the price's own
     * parent is searched instead.
     */
    companion: {
      scope: '[class$="__adview_desktop_price"]',
      selector: '[class$="__price__meter"], [class$="__per_square_meter"]',
      suffix: '/м²',
      // Kufar prints every per-m² figure in gray; the converted ones match.
      color: 'gray',
    },

    styles: [
      {
        /**
         * The ad page's price row is aligned to the bottom, so a stack grown
         * inside the price would drag Kufar's own per-m² figure down with it,
         * away from the price. Below the whole row instead, leaving the row as
         * the site drew it.
         */
        selector: '[class$="__adview_desktop_price"]',
        priceContainer: '[class$="__adview_desktop_price"]',
        insertPosition: 'afterContainer',
      },
      {
        /**
         * Map popup cards. Their price row is not a flex row — the price and
         * the per-m² figure are inline spans on one line — so a stack inside
         * the price would split that line and strand the per-m² figure below
         * the conversion. Appended to the row instead, it lands after both and
         * the site's own line stays intact.
         *
         * The row is the nearest ancestor whose class mentions "__price"; the
         * price span itself ("…__price__byr") has to be excluded, because
         * closest() would otherwise stop there.
         */
        selector: '[class$="__price__byr"]:not([data-testid])',
        priceContainer: '[class*="__price"]:not([class$="__price__byr"])',
      },
    ],
  },

  /**
   * Short-term rentals. Nightly rates and stay totals — three figures at most,
   * so cents stay on, unlike the property and vehicle sites.
   *
   * The listing mixes two kinds of card. Excursions and the like are the plain
   * kufar.by cards, already covered by the parent preset's data-testid and
   * inherited whole: one line inside the price block. The rentals are booking
   * cards, whose price shares a bottom-aligned flex row with the nights label
   * and a tooltip button:
   *
   *   <div class="…__priceContainer">
   *     <div class="…__price">137,75 р.</div>
   *     <div class="…__nights">за 1 ночь</div>
   *     <button class="…__tooltip">…</button>
   *
   * The conversion goes under the whole row, so "за 1 ночь" stays beside the
   * price it belongs to. The map variant of the card reuses these classes, so
   * the popup is covered too.
   *
   * Hotel pages list rooms and their rates; see the `styles` rules.
   *
   * Ad page (travel.kufar.by/vi/grodno/1080983481) — the booking widget's
   * total, which is "от 75 р." until dates are picked and the real total once
   * they are:
   *
   *   <div class="…__priceBlock">
   *     <div class="…__row …__row_l">
   *       <div class="…__key …__key_bold">Итого</div>
   *       <div class="…__separator"></div>
   *       <div class="…__value_bold">600 р.</div>
   *
   * The row is a flex row with a dashed separator that stretches, so the stack
   * goes inside the value itself and grows down from the total. Rows are
   * matched by class rather than by position, so any further rows a booking
   * breakdown adds convert the same way.
   *
   * Recommendations at the bottom are the re.kufar.by card, same markup.
   *
   * The bar that slides up from the bottom of the ad page repeats the total;
   * left alone, like every other fixed bar on Kufar.
   */
  'travel.kufar.by': {
    priceSelector: [
      '[data-testid="card-price"]',
      '[class$="__priceContainer"] > [class$="__price"]',
      '[class$="__priceBlock"] [class*="__value"]',
      '[class$="__variant__info"] [class$="__price"]',
      '[class$="__header"] > [class$="__price"] > span:first-child',
    ].join(', '),

    styles: [
      {
        // One line under the price row: the cards are wide enough for it, and
        // the site's own line stays whole.
        selector: '[class$="__priceContainer"] > [class$="__price"]',
        priceContainer: '[class$="__priceContainer"]',
        insertPosition: 'afterContainer',
      },
      {
        /**
         * Hotel page (travel.kufar.by/hotel/minsk/1086103505): each room lists
         * its rates, and every rate carries its own nightly price:
         *
         *   <div class="…__variant__info">
         *     <div>                                  (right-aligned column)
         *       <div class="…__price">200 р.</div>
         *       <div class="…__nights">за 1 ночь</div>
         *     </div>
         *     <a …>Забронировать</a>
         *
         * The price and its nights label are already a column of their own, so
         * the stack joins them there, right-aligned with them. The classless
         * div is addressed through its parent.
         *
         * The bar at the bottom of the page is left alone, as everywhere else.
         */
        selector: '[class$="__variant__info"] [class$="__price"]',
        layout: LAYOUT.BLOCK,
        priceContainer: '[class$="__variant__info"] > div',
      },
      {
        selector: '[class$="__priceBlock"] [class*="__value"]',
        layout: LAYOUT.BLOCK,
        priceContainer: ':scope',
        // The total is 18px bold; the stack under it is quieter than that.
        fontSize: '14px',
        fontWeight: 'normal',
        lineHeight: '20px',
      },
      {
        selector: '[class$="__header"] > [class$="__price"] > span:first-child',
        layout: LAYOUT.BLOCK,
        priceContainer: ':scope',
        fontSize: '14px',
        lineHeight: '20px',
      },
    ],
  },

  /**
   * Real estate. Prices are written with onliner's "ƃ", and run to six
   * figures, so no cents. The price per m² converts too, on its own line.
   *
   * Unlike the other sites here, the markup carries no classes of its own:
   * it is Tailwind utilities all the way down, with no data-testid, no
   * schema.org attributes, nothing stable to name. Selectors therefore pick
   * out distinctive utility fragments, which is as firm a hold as this markup
   * offers and will need revisiting if the design changes. The parser is what
   * keeps that loose aim safe — an element without a BYN marker in it is
   * skipped, so matching a few extra elements costs nothing. Counted on the
   * saved pages: the listing's badge class matches its 20 card prices and
   * nothing else; on an ad page the heading matches the price and the span
   * matches the per-m² line, each three times (see below).
   *
   * Listing cards (realt.by/sale/flats/), the price in a yellow badge:
   *
   *   <div class="… md:flex-row … flex flex-col flex-wrap …">   (the row)
   *     <span class="md:mr-0 flex items-center mr-1">
   *       <span class="… bg-primary-300 …">800 486 ƃ</span>
   *       <div class="ml-2 mr-1">…tooltip button…</div>
   *
   * The conversion goes after the whole row, not after the badge: that row is
   * a column on phones but a ROW from md up, where anything appended inside it
   * would land beside the price instead of under it.
   *
   * The same card prints some prices plain and blue instead of in the badge —
   * the home page's "ТОП Дня" pair, for one — so the blue variant is matched
   * as well. The row around it is identical, so both share a rule. Only the
   * weight keeps "font-semibold text-info-500" off ordinary blue links, of
   * which these pages have plenty.
   *
   * Ad page (realt.by/sale-flats/object/4164866/):
   *
   *   <div class="flex items-center mt-0">
   *     <div class="inline-flex items-center">
   *       <h2 class="… font-raleway font-bold …">403 263 ƃ</h2>
   *       <span>…triangle…</span>
   *   <p class="w-full">
   *     <span class="mr-1 text-subhead sm:text-body text-basic">6 271 ƃ за м²</span>
   *
   * The price sits in a flex row with a marker and a tooltip, so its line goes
   * after that row. The per-m² span is plain inline text, so its line is
   * appended inside it, where a block simply breaks the line.
   *
   * The page holds three copies of this block — phone, tablet and desktop —
   * with all but one hidden by CSS. All three convert; only the visible one
   * shows, and a hidden copy would otherwise appear unconverted the moment the
   * window is resized across a breakpoint.
   *
   * The "Подать за 0 ƃ" button in the header is not matched by any of these.
   */
  'realt.by': {
    layout: LAYOUT.INLINE,
    decimals: 0,

    /**
     * Every price here sits in a flex row of some kind, and several of those
     * rows wrap, so a short conversion next to a short price would sit on the
     * price's own line — "1 800 ƃ/мес. $614 | €524 | 50,007 ₽" on a rental ad,
     * where a six-figure sale price happened to push it onto its own line. A
     * full basis keeps the conversion under the price whatever their lengths.
     */
    flexBasis: '100%',

    priceSelector: [
      'span[class*="bg-primary-300"]',
      'span[class*="font-semibold"][class*="text-info-500"]',
      'h2[class*="font-raleway"]',
      'p > span[class*="text-subhead"][class*="text-basic"]',
    ].join(', '),

    styles: [
      {
        selector: 'span[class*="bg-primary-300"], span[class*="font-semibold"][class*="text-info-500"]',
        priceContainer: 'div[class*="md:flex-row"]',
        insertPosition: 'afterContainer',
      },
      {
        selector: 'h2[class*="font-raleway"]',
        priceContainer: 'div[class*="mt-0"]',
        insertPosition: 'afterContainer',
      },
      {
        // "6 271 ƃ за м²" → "$2,141/м² | €1,826/м² | 174,290 ₽/м²"
        selector: 'p > span[class*="text-subhead"][class*="text-basic"]',
        priceContainer: ':scope',
        suffix: '/м²',
      },
    ],
  },

  /**
   * Cottages and houses by the day. Nightly rates and booking totals in the
   * low hundreds, so cents stay on. Classes are the site's own and read like
   * names, which makes this the plainest preset here.
   *
   * Search results (flatby.by/?city=min&…), one price per card:
   *
   *   <div class="ahc_txt_right">            (flex column, 192px)
   *     <div class="ahc_price_wrap">
   *       <div class="ahc_price_txt"><span>За сутки</span></div>
   *       <div class="ahc_price"><span>300 BYN</span></div>
   *     </div>
   *     <a class="ahc_lnk">Подробнее</a>
   *
   * The price block is only as wide as the price, so the line goes after it,
   * into the column, where it has the full 192px and lands between the price
   * and the "Подробнее" button.
   *
   * Ad page (flatby.by/kottedzh-3/): nothing is priced until dates and guests
   * are chosen — the nightly rate appears only in the page title. What the
   * booking form then fills in is the total, and the prepayment beside it:
   *
   *   <div class="single_order_results">     (flex row, wraps)
   *     <div class="single_order_res_title">Стоимость: </div>
   *     <div class="single_order_res_price">550 BYN</div>
   *     <div class="single_order_prepay">Внести предоплату: <span>…</span></div>
   *
   * Both convert, each on its own line directly below its price — hence the
   * full basis, without which a short total and a short conversion would share
   * the row. Until dates are picked both read "0 BYN", which the injector now
   * skips everywhere: zero converts to zero.
   *
   * The description prose quotes its own prices ("Баня — 150 руб/4 часа") and
   * is left alone; a block of converted currencies mid-paragraph would break
   * the sentence it sits in.
   */
  'flatby.by': {
    layout: LAYOUT.INLINE,
    insertPosition: 'after',
    flexBasis: '100%',

    priceSelector: '.ahc_price, .single_order_res_price, .single_order_prepay span',

    styles: [
      {
        selector: '.ahc_price',
        priceContainer: '.ahc_price_wrap',
        insertPosition: 'afterContainer',
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
