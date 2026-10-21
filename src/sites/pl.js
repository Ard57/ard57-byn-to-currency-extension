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
};
