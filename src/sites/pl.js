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
   * The conversion goes in front of the price. The wide tiles of a search
   * (www.olx.pl/motoryzacja/) pin the price to the right end of a row, and a
   * conversion after it would push it inwards; in front, the price stays put
   * and the conversion takes the room to its left. In the main page's
   * narrow cards, a column, it goes above the price.
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
   *
   * Wherever it goes, the conversion takes a line of its own: `pageStyles`
   * lets the row holding it wrap and stretches it across that row, so in a
   * wide tile it sits above the price rather than squeezed beside it.
   */
  'olx.pl': {
    priceSelector: [
      '[data-testid="ad-price"]',
      '[data-testid="ad-price-container"] h3',
    ].join(', '),
    insertPosition: 'before',
    fontSize: '13px',

    pageStyles: `
      :has(> div[data-byn-to-currency]) {
        flex-wrap: wrap !important;
      }
      div[data-byn-to-currency] {
        width: 100%;
      }
    `,

    styles: [
      {
        selector: '[data-testid="ad-price-container"]',
        insertPosition: 'after',
        fontSize: '16px',
      },
    ],
  },
};
