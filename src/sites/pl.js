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
   */
  'gratka.pl': {
    priceSelector: [
      '[data-cy="propertyCardPrice"]',
      '[data-cy="cardDevelopmentPrice"] > span',
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
