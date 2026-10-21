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
   * left alone. The conversion goes straight after the price, on a line of
   * its own above it.
   */
  'olx.pl': {
    priceSelector: '[data-testid="ad-price"]',
    insertPosition: 'after',
    fontSize: '13px',
  },
};
