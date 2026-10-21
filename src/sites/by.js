import { LAYOUT } from '../format.js';
import { OZON, WILDBERRIES } from './ru-marketplaces.js';

/**
 * Anything inside 21vek's add-on services — the block on a product page, its
 * pop-ups, and the offer of services after adding to the basket — for
 * leaving their prices alone. A descendant selector, for use in :not().
 */
const VEK_SERVICES = [
  'ServicesBlock_', 'ServiceItem_', 'ServiceModalItem_', 'ServicesModal_',
  'NewServices_', 'AddPromotionServicesModal_',
].map(prefix => `[class*="${prefix}"] *`).join(', ');

/**
 * Belarusian sites. Prices are in BYN.
 */
export const BY_PRESETS = {
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
     *
     * Product cards in news articles, a different widget, e.g.
     * people.onliner.by/2026/10/07/idei-na-den-materi. The primary and
     * secondary variants are both the product's own price:
     *
     *   <a class="news-product__price news-product__price_primary">
     *     <span class="news-product__price-prefix">от</span>
     *     <span class="news-product__price-value">49,00 ƃ</span>
     *   </a>
     *   <a class="news-product__monthly">…от 1,55 ƃ/мес…</a>
     *
     * The value span alone is parsed. The monthly installment is a sibling
     * and never matched. See the styles rule for where the conversion goes.
     */
    priceSelector: [
      '.news-widget__price-value_primary > .news-widget__link',
      '.news-product__price > .news-product__price-value',
    ].join(', '),
    priceContainer: '.news-widget__price-value_primary',

    styles: [
      {
        /**
         * The price link is a flex row (prefix and value on a baseline), so
         * anything appended inside it would sit beside the price. On a line
         * of its own after the link instead, above the monthly installment.
         *
         * Stacked: the small square tiles are too narrow for one line, and
         * a line kept from wrapping runs into the next tile. The link's 8px
         * bottom margin is mostly taken back with a negative top margin, so
         * the stack sits close under the price, and repeated below it.
         *
         * Outside the link nothing carries the price's look, so the 15px
         * semibold of the value is set, two steps smaller.
         */
        selector: '.news-product__price',
        priceContainer: '.news-product__price',
        insertPosition: 'afterContainer',
        layout: LAYOUT.BLOCK,
        fontSize: '12px',
        fontWeight: '600',
        lineHeight: '1.3',
        margin: '-6px 0 8px',
      },
    ],
  },

  /**
   * Product catalog. Dense listing grids; decimals follow the global default
   * (cents, except for the currencies MAX_DECIMALS in format.js keeps whole).
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
     *
     * Cards on the catalog's main page (catalog.onliner.by/) are a variant
     * with "alter" classes, the whole number a bare text node and the
     * kopecks in a span of their own, so the whole link is the price:
     *
     *   <div class="catalog-form__description catalog-form__description_huge-alter …">
     *     <a class="catalog-form__link catalog-form__link_huge-alter …">
     *       <span class="…"> от </span> 1399<span class="…">,00 ƃ</span>
     *     </a>
     *   </div>
     */
    priceSelector: [
      '.catalog-form__link_huge-additional > span:not([class])',
      '.catalog-form__link_huge-alter',
    ].join(', '),

    /**
     * Appended inside the price block, not the link: the conversion inherits
     * the price's font and color without becoming part of the clickable text.
     */
    priceContainer: '.catalog-form__description_huge-additional, .catalog-form__description_huge-alter',

    styles: [
      {
        /**
         * Recommended products at the bottom of a product page, e.g.
         * /mobile/samsung/sms731b8256bka8:
         *
         *   <div class="product-recommended__price">
         *     <a class="product-recommended__link …">от 37,49 ƃ </a>
         *   </div>
         *
         * Appended to the price div, after the link. The product page rule
         * inserts after its price and borrows a class; neither suits these.
         */
        selector: '.product-recommended__price',
        insertPosition: 'append',
        className: null,
        fontSize: '0.85em',
      },
      {
        /**
         * Main page cards: narrow, with a large price. Three currencies do
         * not fit on one line beside it, so they are stacked under it, each
         * at well under the price's size.
         */
        selector: '.catalog-form__description_huge-alter',
        layout: LAYOUT.BLOCK,
        fontSize: '0.6em',
      },
    ],

    pages: [
      {
        /**
         * Product page, e.g. /mobile/google/pixel11pro16512o. The lowest
         * price across stores is converted, and the recommended products'
         * prices at the bottom (see the styles rule above): not the monthly
         * installment, not the per-store offers, not the "N предложений
         * (от …)" button. All of those also say "ƃ", which is why the
         * selector names the links rather than scanning for prices.
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
        priceSelector: '.js-description-price-link, .product-recommended__price > a',
        insertPosition: 'after',
        className: 'h_txt_fte',
        fontSize: null,
      },
    ],
  },

  /**
   * Cart (cart.onliner.by): each item's price, each store's total, and the
   * whole cart's in the heading. Not the delivery terms or anything else.
   *
   *   <div class="cart-form__offers-part cart-form__offers-part_price …">
   *     <div class="cart-form__description … _font-weight_semibold cart-form__description_ellipsis …">1649,00 ƃ</div>
   *     <div class="…">В наличии на складе</div>
   *   </div>
   *
   *   <div class="cart-form__offers-part cart-form__offers-part_sum …">
   *     <div class="cart-form__description … _ellipsis …"><span>1649,00 ƃ</span> <span>за 1 товар</span></div>
   *   </div>
   *
   *   <div class="cart-form__part cart-form__part_wide">
   *     …"Корзина"…
   *     <div class="cart-form__description … cart-form__description_condensed-other">2 товара на сумму: 1939,21 ƃ</div>
   *
   * An item's price is drawn twice, for narrow screens and wide, one of them
   * hidden; both convert, so the one on screen has its line. The price and
   * the store total each sit in a line cut short with an ellipsis, so the
   * conversion goes after that line, under it. The cart total's line does
   * not clip, and takes it on a line of its own inside.
   */
  'cart.onliner.by': {
    priceSelector: [
      '.cart-form__offers-part_price > .cart-form__description_font-weight_semibold',
      '.cart-form__offers-part_sum > .cart-form__description > span:first-child',
      '.cart-form__part_wide > .cart-form__description_condensed-other',
    ].join(', '),
    insertPosition: 'after',
    priceContainer: null,

    styles: [
      {
        selector: '.cart-form__offers-part_sum',
        priceContainer: '.cart-form__offers-part_sum > .cart-form__description',
        insertPosition: 'afterContainer',
      },
      {
        selector: '.cart-form__part_wide',
        insertPosition: 'append',
        priceContainer: '.cart-form__description_condensed-other',
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
   * Only onliner's own BYN price of each ad converts. Not leasing
   * ("от 1013 ƃ месяц", "Первоначальный взнос 22 399 ƃ"), or the menu's
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
   * Similar ads on the ad page (ab.onliner.by/bmw/5-seriya/5057427), a
   * carousel of cards, the price last in each:
   *
   *   <a class="vehicle-form__carousel-item">
   *     …title, year and mileage, city…
   *     <div class="vehicle-form__description … _font-weight_semibold vehicle-form__description_ellipsis"> 45 000 ƃ </div>
   *   </a>
   *
   * The price div clips to one line, so the conversion goes after it, with
   * the same classes as the ad's own price: they are these very ones, minus
   * the clipping.
   *
   * Both page kinds share one selector with an element-scoped rule rather
   * than a URL page rule: a three-segment URL pattern would also match
   * generation listings like /audi/a6/4gc7-restayling and strip their card
   * conversions.
   *
   * Stacked on both page kinds: in the listing's narrow price column none of
   * the cards fit all three currencies on one line, and on the ad page the
   * line does not reliably fit either (ab.onliner.by/bmw/x5/5083041).
   */
  'ab.onliner.by': {
    layout: LAYOUT.BLOCK,
    decimals: 0,

    priceSelector: [
      '.vehicle-form__offers-part_price > div',
      '.jest-price-byn',
      '.vehicle-form__carousel-item > .vehicle-form__description_font-weight_semibold',
    ].join(', '),
    insertPosition: 'after',
    className: 'vehicle-form__description vehicle-form__description_middle vehicle-form__description_primary vehicle-form__description_font-weight_bold vehicle-form__description_condensed-other',
    fontSize: null,

    /**
     * Both prices are followed by the site's own spacing — 8px under the ad's
     * price, the 15px every description gets under a card's — which would
     * otherwise stand between the price and its conversion. A negative top
     * margin takes all but 2px of it back (the margins collapse), and the
     * borrowed description class keeps its 15px below the conversion.
     */
    styles: [
      {
        selector: '.jest-price-byn',
        className: 'vehicle-form__description vehicle-form__description_primary vehicle-form__description_base-alter vehicle-form__description_font-weight_semibold',
        margin: '-6px 0 15px',
      },
      {
        selector: '.vehicle-form__carousel-item',
        className: 'vehicle-form__description vehicle-form__description_primary vehicle-form__description_base-alter vehicle-form__description_font-weight_semibold',
        margin: '-13px 0 15px',
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
   *   <div class="…__adview_price">
   *     <div class="…__container …__price"><span class="…__main">559 107 р.</span></div>
   *     <span class="…__per_square_meter">7 586 р./м²</span>
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
      '[class$="__adview_price"] [class$="__main"]',
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
      scope: '[class$="__adview_price"]',
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
        selector: '[class$="__adview_price"]',
        priceContainer: '[class$="__adview_price"]',
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

  /**
   * Cars. Whole numbers, as on the other vehicle sites. The site shows one
   * currency at a time (a header switcher); these selectors read whatever it
   * prints, and when that is not BYN the parser simply finds nothing.
   *
   * Only each ad's own asking price converts. Leasing lines are left alone —
   * "Лизинг от 921 руб. в месяц" on cards, "921 руб. в месяц" in the финансы
   * panel on an ad — as is the "средняя цена" figure above Похожие
   * объявления, which is a statistic rather than a price and already prints
   * its own "≈ 7 785 $".
   *
   * Search results (cars.av.by/bmw), wide cards, stacked:
   *
   *   <div class="listing-item__prices">        (flex column, 201px)
   *     <div class="listing-item__price-primary"><span>35 160</span><small>руб.</small></div>
   *     <div class="listing-item__finance">Лизинг от 921 руб. в месяц</div>
   *
   * Inserted right after the price, so the stack sits between the price and
   * the leasing line rather than below it.
   *
   * Ad page (cars.av.by/bmw/5-seriya/139092233), stacked, after the button
   * holding the price — inside it the stack would join a flex row and become
   * part of the clickable area:
   *
   *   <div class="card__price">
   *     <button class="card__price-button">
   *       <span class="card__price-primary">35 160<small>руб.</small></span>
   *
   * Похожие объявления further down are narrower cards and take one line, as
   * their price row is flex: the full basis is what puts that line under the
   * price instead of beside it.
   *
   *   <div class="listing-top__prices">         (flex row, wraps, 276px)
   *     <div class="listing-top__price-primary"><span>35 160</span><small>руб.</small></div>
   *
   * The ad cards on av.by itself (.listing-index__price) are about the same
   * width as those, so they take one line too.
   *
   * The dealer promo strip at the top of a search page ("Новые авто на
   * salon.av.by", .salon-listing-top__prices) is deliberately not converted:
   * those cards print their price over the photo, where a conversion lands on
   * the image itself and reads badly against whatever is behind it.
   */
  'av.by': {
    layout: LAYOUT.BLOCK,
    decimals: 0,
    insertPosition: 'after',
    flexBasis: '100%',

    priceSelector: [
      '.listing-item__price-primary',
      '.card__price-primary',
      '.listing-top__price-primary',
      '.listing-index__price',
    ].join(', '),

    styles: [
      {
        selector: '.card__price-primary',
        priceContainer: '.card__price-button',
        insertPosition: 'afterContainer',
      },
      {
        selector: '.listing-top__price-primary',
        layout: LAYOUT.INLINE,
      },
      {
        /**
         * Cards on av.by itself. Their summary is a grid that declares no
         * rows: the price is pinned to row 1 and every other child is
         * auto-placed into the rows below, in document order. A conversion
         * inserted after the price is auto-placed too, so it would queue up
         * behind the parameters — or, on a card with more children, behind
         * the description. A negative order places it first instead, in the
         * row directly under the price.
         */
        selector: '.listing-index__price',
        layout: LAYOUT.INLINE,
        order: -1,
      },
    ],
  },

  /**
   * New cars from dealers. Its own components — none of the cars.av.by or
   * av.by selectors appear here — but the same whole numbers, the same
   * insertion after the price, and the same silence about leasing
   * (.listing-item__finance sits right beside the price on a model page).
   *
   * One line everywhere except the wide offer cards.
   *
   * Home page, cards whose text block is laid over the photo:
   *
   *   <div class="salon-listing-top__desc">        (absolute, 171px)
   *     <div class="salon-listing-top__prices">от 46 579 руб.</div>
   *
   * Narrow, and the line only just fits; it is kept at full opacity because
   * it sits on a photograph rather than a flat background. This is the same
   * component as the promo strip on a cars.av.by search page, which stays
   * unconverted — there it is a sideshow among ordinary cards, here it is
   * what the page is made of.
   *
   * Brand page (salon.av.by/bmw), tiles in a subgrid:
   *
   *   <li class="salon-listing-tile__item">        (subgrid, 6 rows)
   *     …photo, title…
   *     <div class="salon-listing-tile__item-price">348 081<small> руб.</small></div>
   *     …params, button…
   *
   * The price itself is a nowrap flex row, so the line goes after it as a
   * grid item of its own, taking the row the tile's spare track leaves.
   *
   * A model page also opens with a banner quoting the starting price:
   *
   *   <div class="salon-listing-model__banner-desc">        (block, 700px)
   *     <div class="salon-listing-model__banner-priсe">от 120 201 руб.</div>
   *
   * That class is matched on "__banner-pri" because the site spells the rest
   * of it with a Cyrillic "с" — searching the markup for "price" never finds
   * it, which is how it went missing the first time round.
   *
   * Model page (salon.av.by/bmw_5-seriya), the wide offer cards under
   * "N предложений в продаже" — stacked, the one exception here:
   *
   *   <div class="salon-listing-items__item-prices">
   *     <div class="salon-listing-items__item-price-byn">348 081<span> руб.</span></div>
   *     <div class="listing-item__finance">Лизинг от 4 605 руб. в месяц</div>
   *
   * Inserted after the price, so the stack separates it from the leasing
   * line rather than following both.
   */
  'salon.av.by': {
    layout: LAYOUT.INLINE,

    priceSelector: [
      '.salon-listing-top__prices',
      '.salon-listing-tile__item-price',
      '.salon-listing-items__item-price-byn',
      'div[class*="__banner-pri"]',
      '.salon-card__price-primary',
    ].join(', '),

    styles: [
      {
        selector: '.salon-listing-items__item-price-byn',
        layout: LAYOUT.BLOCK,
      },
      {
        /**
         * Brand page tiles. Each tile is `grid-row: span 5` over a subgrid,
         * so it has exactly five tracks for its five children — photo, title,
         * price, parameters, button. A conversion added as a sixth child has
         * no track to go in: subgrid cannot create one, so it is clamped into
         * the last track and lands on top of the "N предложений" button.
         *
         * The tracks themselves size to their content, so the way to make
         * room is to put the line inside a child that already has a track.
         * The parameters text is the one below the price, and it is a plain
         * block, so the line sits under the body type and the row grows to
         * fit. The price itself is a nowrap flex row and would only put the
         * line beside the number.
         */
        selector: '.salon-listing-tile__item-price',
        priceContainer: {
          scope: '.salon-listing-tile__item',
          selector: '.salon-listing-tile__item-params-text',
        },

        /**
         * First inside that text, so the stack reads directly under the
         * price, with the body type below it.
         *
         * Floating it full width is what keeps the site's own text intact.
         * That element carries `::first-letter { text-transform: uppercase }`,
         * and an ordinary first child would take that pseudo-element for
         * itself, leaving the body type reading "седан" instead of "Седан".
         * A float is out of flow, so the first formatted line — and the
         * capital — stays with the site's text, which the full width then
         * pushes below the conversion. The float cannot escape the box
         * either: the parameters text is a flex item, so it contains it.
         */
        insertPosition: 'prepend',
        float: 'left',
        width: '100%',

        /**
         * Stacked, unlike the rest of the site. That text is only as wide as
         * its own words, and the colour swatches sit at the far end of the
         * row, so one line would have to run the width of the card — past
         * the swatches on the widest tiles, or shrunk small enough to squeeze
         * under them. A currency per line needs none of that room, and the
         * tile simply grows to fit: these tracks size to their content.
         */
        layout: LAYOUT.BLOCK,
      },
      {
        /**
         * Each of these cards is one big <a>, so the conversion inherits the
         * link blue while the price sets white on itself — the one place on
         * this site where inheritance gives the wrong color. The site's own
         * token for text over a photo puts it back, and follows the theme.
         */
        selector: '.salon-listing-top__prices',
        opacity: 1,
        color: 'var(--color-text-static-white, #fff)',
      },
      {
        /**
         * An ad page's price shares a nowrap flex row with the leasing panel,
         * and that row shares another with the действие button, so the line
         * goes under the whole row — where it still lands under the price,
         * the row's leftmost item.
         */
        selector: '.salon-card__price-primary',
        priceContainer: '.salon-card__header-inner',
        insertPosition: 'afterContainer',
        /**
         * That row carries the header's padding (24px, 20px on the left), so
         * the line would otherwise start at the card's edge and sit below the
         * padding, against the gallery. The margin aligns it with the price
         * and lifts it back into the padding, right under the price.
         */
        margin: '-18px 0 6px 20px',
      },
    ],
  },

  /**
   * Cars, parts and everything else. Whole numbers, stacked everywhere.
   *
   * This site draws the ruble sign instead of writing it:
   *
   *   <span class="price-byn">51 988 <span class="nbrb-icon"></span></span>
   *
   * so a price reads as a bare "51 988" and the parser's marker rule would
   * throw it away. `markerOptional` lifts that rule — safe here because every
   * selector below names a price element and nothing else.
   *
   * Search results (abw.by/cars/brand_bmw), one price per card, in a block of
   * its own:
   *
   *   <div class="price"><span class="price-byn">51 988 …</span></div>
   *   <a class="leasing-offer">Лизинг от 649 р./мес</a>
   *
   * The leasing line below it is a monthly payment and stays as it is, here
   * and on the ad page ("В лизинг от 601 р./мес", "Аванс от 0 руб").
   *
   * Ad page (abw.by/cars/detail/bmw/5er/26422270):
   *
   *   <ul class="price"><li class="byn">48 082 <span class="nbrb-icon"></span>
   *     …currency-converter tooltip…
   *
   * The tooltip's text sits inside the same <li>, but the number comes first
   * and only the first price in an element is taken.
   *
   * Parts offered under the ad are their own cards, and their price block is
   * a wrapping flex row, so the stack needs a full basis to clear the price:
   *
   *   <div class="card__price"><div class="card__price_byn">1 150 …</div></div>
   *
   * Two prices are deliberately left alone: the one in the bar that appears
   * at the top of an ad page while scrolling, which a stack would push open,
   * and "Стоимость: 48 082 BYN" inside the leasing promo, which repeats the
   * price already converted at the top of the page.
   */
  'abw.by': {
    layout: LAYOUT.BLOCK,
    decimals: 0,
    markerOptional: true,
    insertPosition: 'after',
    flexBasis: '100%',

    priceSelector: '.price-byn, li.byn, .card__price_byn',
  },

  /**
   * Online hypermarket. A Next.js site whose own class names are hashed
   * (ProductCard_price__MhmhF), but every price is drawn by one shared
   * component whose classes are not:
   *
   *   <div class="Price-module__container ProductCard_price__…">
   *     <span class="Price-module__price Price-module__majorPrice-small">
   *       <span>1 234</span><span class="Price-module__minorPrice-small">,00 Ҕ</span>
   *     </span>
   *     <span class="Price-module__oldPrice">1 399,00 Ҕ</span>   (on sale only)
   *   </div>
   *
   * "Ҕ" is 21vek's stand-in for the new ruble sign; see parse.js.
   *
   * The current price span alone is parsed; the struck-through old price is
   * a sibling and never matched. Prices run from a few rubles up, so cents
   * stay on.
   *
   * Main page (www.21vek.by/), so far:
   *
   * - Product tiles — recommendations, and the same card elsewhere on the
   *   site. The container is a wrapping flex row, so the conversion goes in
   *   it with a full-width basis: on a line of its own under the price.
   * - Goods of the week, a narrow card — WeeklyProductMiniCard, or
   *   ProductCardCompact where 21vek's "unified-product-card-compact" flag
   *   is on — and the AccessoriesProduct cards in the "Рекомендуем с этим
   *   товаром" popup that opens on adding to the basket; all are laid out
   *   alike (the popup's cards are fixed at 200px tall, so `pageStyles` lets
   *   one grow to fit its conversion). The price shares a row with the basket
   *   button, and a conversion in the price's
   *   container would squeeze in between and spill under the button. It goes
   *   after that whole row instead, across the card, where it wraps within
   *   the card's width.
   *
   *     <div class="WeeklyProductMiniCard_priceBasketWrapper__…">   (flex row)
   *       <div class="Price-module__container WeeklyProductMiniCard_price__…">…</div>
   *       <div class="…basketBlock…">🛒</div>
   *     </div>
   *
   * Set at 13px rather than scaled off the price's container, which on these
   * cards made it smaller than the card's own small print.
   *
   * Matched by the shared classes alone, so every price the component
   * draws anywhere on the site converts the same way.
   *
   * Category pages (www.21vek.by/mobile/) end with a small SEO table of
   * products and prices, drawn without the component:
   *
   *   <tr data-testid="seo-product-10203906">
   *     <th>…product link…</th>
   *     <th><span class="ListingSEOProductsTable_price__… Text-module__caption">77,00 Ҕ</span></th>
   *   </tr>
   *
   * The conversion goes in the price's cell, under the price, at the
   * table's caption size rather than the 13px of the cards.
   *
   * As 21vek draws it, the price column is only as wide as the price: the
   * name column takes the rest, its names taken out of the flow and cut
   * short to one line. A conversion there wraps in a sliver. `pageStyles`
   * gives the price column 35% of the table and lets both columns wrap: the
   * names go back into the flow, and the row grows to fit.
   *
   * Product page (www.21vek.by/mobile/iphone17256gb_apple_10019135.html):
   *
   * - The product's own price, also drawn without the component, in a block
   *   with the old price under it; the conversion goes last in that block:
   *
   *     <div class="Prices_wrapper__…">
   *       <div class="Prices_priceContainer__…">
   *         <span data-testid="productPrice-3399" class="ProductPrice_productPrice__… …">3 399,<span>00 Ҕ</span></span>
   *         …discount label, info button…
   *       </div>
   *       <div class="Prices_oldPrice__…">4 099,00 Ҕ</div>
   *     </div>
   *
   * - "Другие товары коллекции", a carousel of small tiles: a picture beside
   *   the name, and under the name the price beside the basket button. The
   *   price is a bare bold text span, first in its block:
   *
   *     <div class="CollectionProduct_container__…">          (flex row)
   *       …80px picture…
   *       <div class="CollectionProduct_content__…">
   *         …name…
   *         <div class="CollectionProduct_info__…">
   *           <div class="CollectionProduct_prices__…"><span>2 899,00 Ҕ</span>…old price…</div>
   *           …basket button…
   *
   *   The conversion goes last in the tile, across its whole width, under
   *   picture, price and button alike. The tile's row does not wrap, so
   *   `pageStyles` lets it: a full-width basis then starts a line of its own.
   *
   * Add-ons offered with a product — warranty, setup, insurance — are not
   * converted: they are not what the page is selling. Their prices are drawn
   * by the same ProductPrice component as the product's own, which is why
   * that one is matched only inside the product's price block, and the
   * service blocks and pop-ups are excluded from the shared component too.
   *
   * Basket (www.21vek.by/order/), prices drawn by a PriceBlock component:
   *
   * - Each item: the old price, the current one, and the discount line.
   *   Only the current price is matched — the one PriceBlock without the
   *   grossPrice class — and the conversion goes last, under the discount:
   *
   *     <div class="BasketItem_price__…">
   *       <div class="PriceBlock_priceBlock__… BasketItem_grossPrice__…"><span>2 699,</span><span>00 Ҕ</span></div>
   *       <div class="PriceBlock_priceBlock__…"><span>2 599,</span><span>00 Ҕ</span></div>
   *       <p class="BasketItem_promotion__…">Скидка <span>100,00 Ҕ</span></p>
   *     </div>
   *
   * - The order total, label left and amount right; its amount alone, not
   *   the goods subtotal or the discount under it. The row is a flex row
   *   underlined with a border, so the conversion goes inside it, above the
   *   line: `pageStyles` lets the row wrap, and a full-width basis gives the
   *   conversion a line of its own, right-aligned under the amount:
   *
   *     <div class="OrderPrice_totalPrice__… OrderPrice_row__…">
   *       <span>Итого</span>
   *       <div data-testid="total-price" class="PriceBlock_priceBlock__… …">…2 599,00 Ҕ</div>
   *     </div>
   */
  '21vek.by': {
    priceSelector: [
      `.Price-module__price:not(${VEK_SERVICES})`,
      // The popup after adding to the basket is a services modal, excluded
      // above, but its "Рекомендуем с этим товаром" cards are plain goods.
      '[class*="AccessoriesProduct_price__"] > .Price-module__price',
      '[class*="ListingSEOProductsTable_price__"]',
      '[class*="Prices_priceContainer__"] > [class*="ProductPrice_productPrice__"]',
      '[class*="CollectionProduct_prices__"] > :first-child',
      '[class*="BasketItem_price__"] > [class*="PriceBlock_priceBlock__"]:not([class*="BasketItem_grossPrice__"])',
      '[data-testid="total-price"]',
    ].join(', '),
    priceContainer: '.Price-module__container',
    flexBasis: '100%',
    fontSize: '13px',

    pageStyles: `
      [class*="ListingSEOProductsTable_container__"] th:first-child {
        width: 65% !important;
        padding-right: 16px !important;
      }
      [class*="ListingSEOProductsTable_container__"] th:last-child {
        width: 35% !important;
      }
      [class*="ListingSEOProductsTable_linkWrapper__"] {
        position: static !important;
      }
      [class*="ListingSEOProductsTable_linkContent__"] {
        white-space: normal !important;
      }
      [class*="CollectionProduct_container__"] {
        flex-wrap: wrap !important;
      }
      [class*="OrderPrice_totalPrice__"]:has(> [data-byn-to-currency]) {
        flex-wrap: wrap !important;
      }
      [class*="AccessoriesProduct_product__"]:has([data-byn-to-currency]) {
        height: auto !important;
        min-height: 200px;
      }
    `,

    styles: [
      {
        selector: [
          '[class*="WeeklyProductMiniCard_price__"]',
          '[class*="ProductCardCompact_price__"]',
          '[class*="AccessoriesProduct_price__"]',
        ].join(', '),
        priceContainer: [
          '[class*="WeeklyProductMiniCard_priceBasketWrapper__"]',
          '[class*="ProductCardCompact_priceBasketWrapper__"]',
          '[class*="AccessoriesProduct_priceBasketWrapper__"]',
        ].join(', '),
        insertPosition: 'afterContainer',
        flexBasis: null,
        margin: '6px 0 0',
      },
      {
        selector: '[class*="ListingSEOProductsTable_price__"]',
        priceContainer: 'th',
        flexBasis: null,
        fontSize: '0.85em',
      },
      {
        selector: '[class*="ProductPrice_productPrice__"]',
        priceContainer: '[class*="Prices_wrapper__"]',
        flexBasis: null,
        fontSize: '16px',
        margin: '4px 0 0',
      },
      {
        selector: '[class*="CollectionProduct_prices__"]',
        priceContainer: '[class*="CollectionProduct_container__"]',
      },
      {
        selector: '[class*="BasketItem_price__"]',
        priceContainer: '[class*="BasketItem_price__"]',
        flexBasis: null,
      },
      {
        selector: '[data-testid="total-price"]',
        priceContainer: '[class*="OrderPrice_totalPrice__"]',
        textAlign: 'right',
        fontWeight: '400',
      },
    ],
  },

  'ozon.by': OZON,
  'wildberries.by': WILDBERRIES,
};
