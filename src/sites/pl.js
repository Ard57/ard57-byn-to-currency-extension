import { LAYOUT } from '../format.js';

/**
 * Polish sites. Prices are in PLN, written "1 234 zł".
 */
export const PL_PRESETS = {
  /**
   * Classifieds. Class names are generated (css-1u06pz9), but every price
   * carries a test id, on the main page's ad cards and in listings alike:
   *
   *   <div class="css-rc6l13">                            (flex column)
   *     <div class="flex …"></div>
   *     <p data-testid="ad-price" …>5 899 zł</p>
   *     <span data-testid="btr-label-wrapper">…55,25 zł z Pakietem Ochronnym…</span>
   *   </div>
   *
   * The second figure is the price with OLX's buyer protection added, and is
   * left alone. A negotiable price carries "do negocjacji" inside the price
   * element, under the amount.
   *
   * The conversion goes under the price — except on search and category
   * pages (www.olx.pl/motoryzacja/), whose wide tiles pin the price to the
   * right end of a row: a conversion after it would push it inwards, so
   * there it goes in front, and the price stays put.
   *
   * Ad page (www.olx.pl/d/oferta/…): the price is a heading in a container
   * of its own, "Do negocjacji" beside it where it applies:
   *
   *   <div data-testid="ad-price-container">
   *     <h3 …>69 900 zł</h3>
   *     <p …>Do negocjacji</p>
   *   </div>
   *
   * The conversion goes under the heading, larger than on the cards.
   */
  'olx.pl': {
    priceSelector: [
      '[data-testid="ad-price"]',
      '[data-testid="ad-price-container"] h3',
    ].join(', '),
    insertPosition: 'after',
    fontSize: '13px',

    // On the ad page the heading shares a row with what follows it, so the
    // row is let wrap and the conversion stretched across it, onto a line of
    // its own. The cards need none of this.
    pageStyles: `
      [data-testid="ad-price-container"]:has(> div[data-byn-to-currency]),
      [data-testid="ad-price-container"] :has(> div[data-byn-to-currency]) {
        flex-wrap: wrap !important;
      }
      [data-testid="ad-price-container"] div[data-byn-to-currency] {
        width: 100%;
      }
    `,

    // Only search and category pages lay ads out as wide tiles; the main
    // page and ad pages (and their "similar ads") use narrow cards.
    pages: [
      { pattern: '/' },
      { pattern: '/d/*' },
      { pattern: '/*', insertPosition: 'before' },
    ],

    styles: [
      {
        selector: '[data-testid="ad-price-container"]',
        insertPosition: 'after',
        fontSize: '16px',
      },
    ],
  },

  /**
   * Real estate, from the same group as OLX. Cards are marked with data-cy;
   * the rest is utility classes. The main page's recommendations:
   *
   *   <a data-cy="offer-card" …>
   *     <img …>
   *     <span class="flex grow flex-col p-200">
   *       <p class="type-body-base mt-0 mb-150 font-bold">648 000 zł</p>
   *       <p class="type-body-small …">Opole, opolskie</p>
   *       <span class="mt-auto block">…developer, bold too…</span>
   *     </span>
   *   </a>
   *
   * The price is the text block's first paragraph. The conversion goes
   * inside it, under the amount, so the paragraph's bottom margin still
   * separates the pair from the location — after it, the conversion would
   * sit across that gap, nearer the location than its price.
   *
   * Search results (www.otodom.pl/pl/wyniki/…): the price comes with its
   * per-m² figure, in a row it shares with the favourites heart:
   *
   *   <div class="css-1wgv22l …">                         (price row)
   *     <div data-cy="listing-item-price" …>
   *       <span …>598 000 zł</span>
   *       <span …>19 933,33 zł/m²</span>
   *     </div>
   *     …favourites button…
   *   </div>
   *   <a data-cy="listing-item-link" …>…title…</a>
   *
   * The per-m² figure rides along on each line, one currency a line, as on
   * re.kufar.by: "$166,111 · $5,537/m²". The stack goes under the whole row,
   * above the title, leaving the price and the heart where they are.
   *
   * Offer page (www.otodom.pl/pl/oferta/…): the price and its per-m² figure,
   * each in a wrapper of its own, in a section under the title:
   *
   *   <div class="css-zh1qtc …">                          (price section)
   *     <div …><strong data-cy="adPageHeaderPrice" …>780 000 zł</strong></div>
   *     <div …><div aria-label="Cena za metr kwadratowy" …>15 918,37 zł/m²</div></div>
   *   </div>
   *   …loan advert…
   *
   * The same stack as on search cards, larger, under the whole section.
   *
   * Recommendations on the offer page carry no data-cy, but name their parts
   * in the attributes of Otodom's error reporting (data-sentry-*):
   *
   *   <div data-sentry-component="RecommendedAdItemDetails" …>
   *     <div data-sentry-element="PriceWrapper" …><h2 …>950 000 zł</h2></div>
   *     <p …>…address…</p>
   *     <div …>…3 pokoje · 46 m² · 20 652,17 zł/m²…</div>
   *   </div>
   *
   * The conversion goes under the price, above the address. The per-m²
   * figure is just one unlabelled spec among others here, so it is left
   * out rather than picked by position.
   */
  'otodom.pl': {
    priceSelector: [
      '[data-cy="offer-card"] > span > p:first-child',
      '[data-cy="listing-item-price"] > span:first-child',
      '[data-cy="adPageHeaderPrice"]',
      '[data-sentry-element="PriceWrapper"] > h2',
    ].join(', '),
    priceContainer: ':scope',
    insertPosition: 'append',
    fontSize: '13px',
    fontWeight: '400',

    styles: [
      {
        selector: '[data-cy="listing-item-price"]',
        priceContainer: 'div:has(> [data-cy="listing-item-price"])',
        insertPosition: 'afterContainer',
        layout: LAYOUT.BLOCK,
        companion: {
          scope: '[data-cy="listing-item-price"]',
          selector: '[data-cy="listing-item-price"] > span:nth-child(2)',
          suffix: '/m²',
        },
      },
      {
        selector: '[data-cy="adPageHeaderPrice"]',
        priceContainer: 'div:has(> div > [data-cy="adPageHeaderPrice"])',
        insertPosition: 'afterContainer',
        layout: LAYOUT.BLOCK,
        fontSize: '16px',
        companion: {
          scope: 'div:has(> div > [data-cy="adPageHeaderPrice"])',
          selector: '[aria-label="Cena za metr kwadratowy"]',
          suffix: '/m²',
        },
      },
      {
        selector: '[data-sentry-element="PriceWrapper"]',
        priceContainer: '[data-sentry-element="PriceWrapper"]',
        insertPosition: 'afterContainer',
      },
    ],
  },

  /**
   * Real estate. A Nuxt site with readable class names and data-cy on every
   * part of a card. The main page's sliders:
   *
   *   <div class="card" data-cy="card">
   *     …
   *     <div class="property-card__price">               (block, min-height 4rem)
   *       <div class="property-card__price--wrapper">      (flex row)
   *         <span data-cy="propertyCardPrice" …>2 500 000 zł</span>
   *         <span data-cy="offerPricePerM2" …>7 485 zł/m²</span>
   *       </div>
   *       <!---->                                         …previous price, if cut…
   *     </div>
   *     <div data-cy="propertyCardInfo" …>334 m² • piętro 4/4</div>
   *   </div>
   *
   * The per-m² figure rides along on each line, as on otodom.pl, and the
   * stack goes at the end of the price block: under the previous price where
   * one is shown, above the area and floor. The price row itself is left
   * alone. Each card also opens with a hidden link whose text repeats the
   * price ("…49 m² 780 000 zł Włochy…"); it is not selected.
   *
   * Developments (gratka.pl/nieruchomosci/inwestycje-deweloperskie) have
   * cards of their own, priced by the square metre only, as a starting
   * figure — or "Zapytaj o cenę", with no figure, which is left alone:
   *
   *   <div class="development-card__development-details">  (flex column)
   *     <div class="development-card__header">…title, location…</div>
   *     <div class="development-card__price" data-cy="cardDevelopmentPrice">
   *       <span>od 11 297 zł/m²</span>                (flex row, grows)
   *     </div>
   *     <div data-cy="developmentCardInfo">IV kwartał 2026 • 33 - 89 m² • …</div>
   *   </div>
   *
   * The conversion goes under the figure, inside the price block, which is
   * turned from a row into a column for it; the block still grows and keeps
   * the pair centred in the space it takes. The "od" is not carried over.
   *
   * Map popups show an offer as a tile, the price first in its line of specs,
   * the only item there with no data-cy:
   *
   *   <div class="offer-item__content" data-cy="favouritePropertyCard">
   *     <a data-cy="favouritePropertyUrl" …>
   *       <img …>
   *       <div class="offer-item__offer__content">
   *         …location, street…
   *         <ul class="offer-info">
   *           <li …><span>900 000 zł</span></li>
   *           <li …><span> • </span><span data-cy="cardPropertyInfoArea">25 m²</span></li>
   *           …rooms, floor…
   *         </ul>
   *       </div>
   *     </a>
   *     <div class="offer-item__offer__actions">…favourites button…</div>
   *   </div>
   *
   * The conversion goes under the whole tile, on one line.
   *
   * Offer page (gratka.pl/nieruchomosci/…/ob/…): the price and its per-m²
   * figure in a row under the title, in a block of their own:
   *
   *   <div id="details-price" class="details-price">
   *     <div class="details-price__inner">                (inline flex, wraps)
   *       <span data-cy="priceRowPrice" …>742 920 zł</span>
   *       <span data-cy="detailsRowTextPriceM2Formatted" …>12 000 zł/m²</span>
   *     </div>
   *     <!---->                                           …previous price, if cut…
   *   </div>
   *   …"Zapytaj o możliwość negocjacji ceny"…
   *
   * A development's page (…/inwestycje-deweloperskie/…/ok/…) has the same
   * block holding a range, "478 224 - 1 007 471 zł", with no per-m² figure;
   * each line then reads "$131,512 – $277,055". Under it, a table of the
   * flats still for sale, built in the browser:
   *
   *   <tr class="investment-table-row-desktop" data-cy="investmentTableRow" …>
   *     <td …>…plan, reference "3_133"…</td>
   *     <td …>33,21 m²</td><td …>2</td><td …>1/3</td>
   *     <td class="investment-table-row-desktop__price-col">
   *       <div class="investment-table-row-price">
   *         <span class="investment-table-row-price__value">478 224 zł</span>
   *         <!---->
   *       </div>
   *     </td>
   *     …chevron…
   *   </tr>
   *
   * The conversion goes inside the price component, under the price, so it
   * stays in the price column; the component is picked by its own class
   * rather than the row's, so whichever row it sits in is covered.
   *
   * The same stack as on the cards, larger, at the end of that block. The
   * price repeated further down belongs to a mortgage calculator advert and
   * is left alone; the recommendations are the cards above.
   */
  'gratka.pl': {
    priceSelector: [
      '[data-cy="propertyCardPrice"]',
      '[data-cy="cardDevelopmentPrice"] > span',
      '[data-cy="favouritePropertyCard"] .offer-info__item > span:not([data-cy], .offer-info__separator)',
      '[data-cy="priceRowPrice"]',
      '.investment-table-row-price__value',
    ].join(', '),
    priceContainer: '.property-card__price',
    insertPosition: 'append',
    layout: LAYOUT.BLOCK,
    fontSize: '14px',
    companion: {
      scope: '[data-cy="card"]',
      selector: '[data-cy="offerPricePerM2"]',
      suffix: '/m²',
    },

    pageStyles: `
      [data-cy="cardDevelopmentPrice"]:has(> div[data-byn-to-currency]) {
        flex-direction: column;
        align-items: flex-start;
        justify-content: center;
      }
    `,

    styles: [
      {
        selector: '[data-cy="cardDevelopmentPrice"]',
        insertPosition: 'after',
        suffix: '/m²',
        companion: null,
        fontSize: '16px',
        fontWeight: '400',
      },
      {
        selector: '[data-cy="favouritePropertyCard"]',
        priceContainer: '[data-cy="favouritePropertyCard"]',
        insertPosition: 'afterContainer',
        layout: LAYOUT.INLINE,
        companion: null,
      },
      {
        selector: '.investment-table-row-price',
        priceContainer: '.investment-table-row-price',
        companion: null,
      },
      {
        selector: '#details-price',
        priceContainer: '#details-price',
        fontSize: '18px',
        companion: {
          scope: '#details-price',
          selector: '[data-cy="detailsRowTextPriceM2Formatted"]',
          suffix: '/m²',
        },
      },
    ],
  },

  /**
   * Marketplace. Class names come in two kinds: atomic ones from Allegro's
   * design system (mpof_ki, mgn2_21 — one property each, stable across
   * releases) and per-build hashes (_e8529_5LKaL), which are never used here.
   * A tile on the main page lists its parts, the price in a row of its own:
   *
   *   <li class="">
   *     <div class="mpof_ki m389_6m">
   *       <div class="mpof_ki mwdn_1 m389_6m meqh_en m6ax_n4 _e8529_5LKaL">   (flex row)
   *         <span class="mgn2_21 mgn2_24_s mqu1_ae">15,90 zł</span>
   *       </div>
   *     </div>
   *   </li>
   *
   * The price is picked by that shape and its font-size class; a span of the
   * same shape without "zł" in it is not a price and is skipped. The
   * conversion goes under the price row, inside the list item.
   */
  'allegro.pl': {
    priceSelector: 'li > div > div > span[class*="mgn2_"]:only-child',
    priceContainer: 'li > div',
    insertPosition: 'afterContainer',
    fontSize: '13px',
  },

  /**
   * Price comparison. The main page's product boxes, a grid that gives the
   * price box a row of its own:
   *
   *   <div class="recommendation__content">                (grid)
   *     …badges, name, "kupionych ostatnio", "Darmowa wysyłka"…
   *     <div class="box-prod-price">
   *       <span class="price-prefix">od</span>
   *       <span class="price-format nowrap">
   *         <span class="price"><span class="value">2 649</span><span class="penny">,00</span></span>zł
   *       </span>
   *     </div>
   *   </div>
   *
   * The server's markup has line breaks between the parts of the price,
   * which priceText() closes up. The conversion goes at the end of the price
   * box, under the price, in the box's own grid row. The "od" — the lowest of
   * the shops' offers — is not carried over.
   *
   * Search and category pages (www.ceneo.pl/Klimatyzatory) list products in
   * rows, the price in a right-aligned column of its own, linked to the
   * product or straight to a shop:
   *
   *   <div class="cat-prod-row__price">                   (text-align: right)
   *     <a class="js_seoUrl js_clickHash go-to-shop" …>
   *       <span class="price-prefix">od</span>            …where several shops…
   *       <span class="price-format nowrap">…1 898,96 zł…</span>
   *     </a>
   *     <div class="btn-compare-outer">…"Porównaj ceny"…</div>
   *     …"w 3 sklepach", "Darmowa wysyłka"…
   *   </div>
   *
   * The conversion goes right after the link, under the price and above the
   * button, right-aligned with them. The column sets line-height: 1, too
   * tight for a conversion that wraps, so it gets its own.
   *
   * Product page (www.ceneo.pl/194539597): the best offer's price heads the
   * page, linked to its shop, or bare beside a buyer-protection badge:
   *
   *   <div class="product-offer-summary">
   *     <div class="product-offer-summary__price-box">     (line-height: 1)
   *       <span class="offer-default"><a …><span class="price-format …">…3 699,00 zł…</span></a></span>
   *     </div>
   *     <div class="product-offer-summary__button">…</div>
   *   </div>
   *
   *   <div class="product-offer-summary__price-box product-offer-summary__price-box--with-icon">
   *     <span class="price-format …">…</span>              (flex row)
   *     <div class="product-offer-summary__price-box__pok">…badge…</div>
   *   </div>
   *
   * Either way the conversion goes after the whole box, above the button.
   * The shops' offers below each have a column of their own:
   *
   *   <div class="product-offer__product__price">        (flex column, to the right)
   *     <a class="product-price go-to-shop" …><span class="price-format …">…</span></a>
   *     <div class="product-offer__product__delivery-section">…</div>
   *   </div>
   *
   * There it goes right after the price link, above the delivery details.
   * Prices elsewhere on the page — other variants, the sticky bar, the price
   * history — are left alone.
   *
   * The search box's drop-down suggests products, each a compact row of
   * picture and description, built in the browser:
   *
   *   <div class="suggester__product__description">      (grid)
   *     <span class="suggester__product__description__name">…</span>
   *     <div class="suggester__product__description__price">
   *       <span class="price-prefix">od</span><span class="price-format …">…1948,00 zł…</span>
   *     </div>
   *   </div>
   *
   * The conversion goes at the end of the price box, under the price, small
   * to keep the rows compact.
   *
   * Basket, an Angular app with markup of its own. Each item:
   *
   *   <div data-cy="item-price-and-shipping" …>
   *     <div data-cy="item-price" …><span id="price">1 459,99 zł</span></div>
   *     <div class="product-item__description__shipping">…</div>
   *   </div>
   *
   * a carousel of the shop's other products under the items:
   *
   *   <div class="recommended-offer">
   *     …picture, name…
   *     <div class="recommended-offer__price">580,99 zł</div>
   *     <a …>Dodaj do koszyka</a>
   *   </div>
   *
   * and the total, its parts in elements of their own, beside its label:
   *
   *   <div class="fixed-step-summary__price">
   *     <div …>Suma</div>
   *     <c-price class="fixed-step-summary__price__value">
   *       <span class="price"><span class="price__integer">8 174</span>…<span class="price__currency"> zł</span></span>
   *     </c-price>
   *   </div>
   *
   * The conversion goes under each price inside its own box, and under the
   * total's row. What is missing for free delivery ("brakuje Ci 1 825,02 zł")
   * and the coupons' "15 zł" are not prices of anything, and are left alone.
   */
  'ceneo.pl': {
    priceSelector: [
      '.box-prod-price .price-format',
      '.cat-prod-row__price > a > .price-format',
      '.product-offer-summary__price-box .price-format',
      '.product-offer__product__price > .product-price > .price-format',
      '.suggester__product__description__price > .price-format',
      '[data-cy="item-price"] > #price',
      '.recommended-offer__price',
      '.fixed-step-summary__price__value > .price',
    ].join(', '),
    priceContainer: '.box-prod-price',
    insertPosition: 'append',
    fontSize: '13px',

    styles: [
      {
        selector: '.cat-prod-row__price',
        priceContainer: '.cat-prod-row__price > a',
        insertPosition: 'afterContainer',
        lineHeight: '1.3',
        margin: '0.25rem 0 0',
      },
      {
        selector: '.product-offer-summary__price-box',
        priceContainer: '.product-offer-summary__price-box',
        insertPosition: 'afterContainer',
        fontSize: '16px',
        lineHeight: '1.3',
        margin: '0.25rem 0',
      },
      {
        selector: '.product-offer__product__price',
        priceContainer: '.product-price',
        insertPosition: 'afterContainer',
        lineHeight: '1.3',
      },
      {
        selector: '.suggester__product__description__price',
        priceContainer: '.suggester__product__description__price',
        fontSize: '12px',
      },
      {
        selector: '[data-cy="item-price"]',
        priceContainer: '[data-cy="item-price"]',
      },
      {
        selector: '.recommended-offer__price',
        priceContainer: ':scope',
        fontSize: '12px',
      },
      {
        selector: '.fixed-step-summary__price',
        priceContainer: '.fixed-step-summary__price',
        insertPosition: 'afterContainer',
        fontSize: '14px',
      },
    ],
  },

  /**
   * Cars, from the same group as OLX. Prices are written "45 900 PLN" rather
   * than in złoty. The main page's promoted cards — and the "today's pick"
   * spotlight above them — carry a test id on the price, which opens a line
   * of specs:
   *
   *   <a data-testid="compact-promoted-card-…" …>
   *     <div …><img …></div>
   *     <div class="flex min-w-0 flex-col gap-[6px]">
   *       <p …>Opel Astra 1.4 Turbo Start/Stop Automatik Ultimate</p>
   *       <p class="… text-turbo-content-muted opacity-90 …">
   *         <span data-testid="homepage-card-standout-price" …>45 900 PLN</span>
   *         · 147 216 km · 2018
   *       </p>
   *     </div>
   *   </a>
   *
   * The cards are 171px wide, too narrow to put anything beside the price
   * without wrapping the mileage and year. The conversion goes inside the
   * specs line, under it, in that line's own muted color and size — already
   * quieter than the price, so it is not dimmed further.
   *
   * Search results (www.otomoto.pl/osobowe/bmw/m5): each ad is an
   * <article data-id>, its class names generated. The price is split, the
   * amount in a heading and the currency in a paragraph beside it, so the
   * element read is the grid holding both:
   *
   *   <div class="ooa-vtik1a …">                          (price column)
   *     <div class="ooa-rz87wg …">                        (grid)
   *       <h3 …><span translate="no">539 900</span></h3>
   *       <p translate="no" …>PLN</p>
   *     </div>
   *     …price evaluation ("W granicach średniej")…
   *   </div>
   *
   * The conversion goes right after that grid, above the evaluation, aligned
   * to the right like the price. A reduced price comes in a stack of its own,
   * the saving in a badge above it and the grid wrapped in a row:
   *
   *   <div data-testid="price-drop-stack" …>
   *     <div class="flex flex-col gap-50 items-end">
   *       <div data-testid="price-drop-savings-badge" …>- 10 000 PLN</div>
   *       <div class="flex flex-row items-start gap-50 …">…the grid…</div>
   *     </div>
   *   </div>
   *
   * There the conversion goes after the row: inside it, it would sit beside
   * the price rather than under it. The saving is left alone.
   *
   * Offer page (www.otomoto.pl/osobowe/oferta/…): the price is split the
   * same way, in a grid it shares with the price evaluation:
   *
   *   <div data-testid="ad-price" class="grid … [grid-template-areas:'price_indicator']">
   *     <div …>…<div …>
   *       <h3 class="offer-price__number" …>189 000</h3>
   *       <span class="… offer-price__currency …"> PLN</span>
   *     </div>…</div>
   *     <button data-testid="small-price-evaluation-indicator" …>…W średniej</button>
   *   </div>
   *
   * The conversion goes after the whole grid, larger than on the cards. A
   * reduced price puts this grid in a price-drop stack too, so its rule
   * comes before the search cards' one.
   */
  'otomoto.pl': {
    priceSelector: [
      '[data-testid="homepage-card-standout-price"]',
      'article[data-id] div:has(> h3 > span[translate="no"]):has(> p[translate="no"])',
      '[data-testid="ad-price"] div:has(> h3.offer-price__number)',
    ].join(', '),
    insertPosition: 'after',
    decimals: 0,
    fontSize: '14px',
    textAlign: 'right',

    styles: [
      {
        selector: '[data-testid="homepage-card-standout-price"]',
        priceContainer: 'p:has(> [data-testid="homepage-card-standout-price"])',
        insertPosition: 'append',
        fontSize: '1em',
        opacity: 1,
        textAlign: null,
      },
      {
        selector: '[data-testid="ad-price"]',
        priceContainer: '[data-testid="ad-price"]',
        insertPosition: 'afterContainer',
        fontSize: '16px',
        textAlign: null,
      },
      {
        selector: '[data-testid="price-drop-stack"]',
        priceContainer: 'div:has(> div > h3 > span[translate="no"])',
        insertPosition: 'afterContainer',
      },
    ],
  },
};
