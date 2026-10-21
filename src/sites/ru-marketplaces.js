import { LAYOUT } from '../format.js';

/**
 * Presets for the marketplaces that run one storefront across several
 * countries. Each country domain serves the same markup in its own
 * currency, so a preset here is written once and attached to every domain
 * that uses it, by that region's file:
 *
 *   'ozon.by': OZON,  'wildberries.by': WILDBERRIES     (sites/by.js)
 *
 * Examples below are from the .by sites, where they were worked out.
 */

/**
 * Marketplace. Prices are written "6,80 BYN". Class names are generated
 * per build (c35_6_3-a, g7r_22), so tiles are matched by the parts that
 * stay: the tile-root class, the tile's shape, and the typography classes.
 * Every tile on the main page (www.ozon.by/) is the same:
 *
 *   <div class="tile-root …">
 *     <a …>…picture…</a>
 *     <div class="…">                                    (the tile's text)
 *       <div class="… c35_6_3-a …">                      (price block)
 *         <div class="…">
 *           <span class="… tsHeadline500Medium …">6,80 BYN</span>
 *           <span class="… tsBodyControl400Small …">…10,38 BYN…</span>   (old, struck)
 *           <span class="…">−34%</span>
 *         </div>
 *       </div>
 *       …name, rating…
 *
 * The current price is the one headline-type text in a tile; the old price
 * and the discount are body text. The conversion goes after the price
 * block, on a line of its own above the name.
 *
 * Product page: the price widget, current price beside the old one, then a
 * per-unit line that is left alone:
 *
 *   <div data-widget="webPrice" …>
 *     <div …>
 *       <div …>                                         (price row)
 *         <div …><div …>
 *           <span class="… tsHeadline600Large">27,23 BYN</span>
 *           <span class="… tsBody400Small">172,80 BYN</span>      (old)
 *         </div></div>
 *         …info icon…
 *       </div>
 *     </div>
 *     <div class="… tsBody400Small">28,00 BYN за 1 шт</div>
 *
 * The conversion goes under the price row, above the per-unit line.
 *
 * A product on sale is first served with webPrice, which the page's
 * scripts then swap for a webSale widget holding the same price row a
 * level deeper. The conversion follows it there:
 *
 *   <div data-widget="webSale">
 *     …
 *     <div class="pdp_b8i">                             (price row)
 *       <div …><div …>
 *         <span class="… tsHeadline600Large">29,75 BYN</span>
 *         <span class="… tsBody400Small">61,51 BYN</span>   (old)
 *       </div></div>
 *       …info icon…
 *
 *
 * Cart (ozon.by/cart): each item's price sits in the grid's price column,
 * built like a tile's price block one level deeper:
 *
 *   <div data-widget="cartSplit" …>
 *     …
 *     <div class="checkout_u7">                         (price column)
 *       <div class="checkout_q9">                       (flex row)
 *         <div class="… c35_6_2-a …"><div …>
 *           <span class="… tsHeadline400Small …">32.6 BYN</span>
 *           <span class="… tsBodyControl300XSmall …">…79.75 BYN…</span>   (old)
 *
 * The conversion goes under that flex row. The summary on the right lists
 * goods, discount and the total; only the total is converted. Its row is
 * the one whose first child is a span (the label) rather than a div:
 *
 *   <section data-widget="total" …>
 *     <div class="checkout_ag2">                       (flex, space-between)
 *       <span …><span …>Общая стоимость</span></span>
 *       <div …><span …>68.8 BYN</span></div>
 *
 * The conversion goes under that row, right-aligned with the total.
 *
 * "Other offers" popup on a product page, one row per seller:
 *
 *   <div data-widget="webSellerList">
 *     …
 *     <div class="pdp_nb0 pdp_nb1">                     (price column)
 *       <div class="pdp_n5b">                           (price block)
 *         <div class="pdp_bn6">7,95 BYN</div>
 *         <div><span>43%</span><span>14,01 BYN</span></div>   (old)
 *
 * The current price is a plain-text div; the old one is a span. Other
 * text-only divs in a row ("Перейти в магазин", "В корзину") carry no
 * currency and are skipped. The conversion goes under the price block.
 */
export const OZON = {
  priceSelector: [
    '.tile-root span[class*="tsHeadline"]',
    '[data-widget="webPrice"] span[class*="tsHeadline"]',
    '[data-widget="webSale"] span[class*="tsHeadline"]',
    '[data-widget="cartSplit"] span[class*="tsHeadline"]',
    '[data-widget="total"] div:has(> span:first-child) > div > span',
    '[data-widget="webSellerList"] div:not(:has(*))',
  ].join(', '),
  priceContainer: '.tile-root > div > div',
  insertPosition: 'afterContainer',
  fontSize: '13px',

  styles: [
    {
      selector: '[data-widget="webPrice"]',
      priceContainer: '[data-widget="webPrice"] > div > div',
      fontSize: '16px',
    },
    {
      selector: '[data-widget="webSale"]',
      priceContainer: 'div:has(> div > div > span[class*="tsHeadline"])',
      fontSize: '16px',
    },
    {
      selector: '[data-widget="cartSplit"]',
      priceContainer: 'div:has(> div > div > span[class*="tsHeadline"])',
    },
    {
      selector: '[data-widget="total"]',
      priceContainer: 'div:has(> span:first-child):has(> div > span)',
      fontSize: '14px',
      textAlign: 'right',
      margin: '4px 0 0',
    },
    {
      selector: '[data-widget="webSellerList"]',
      priceContainer: 'div:has(> div:first-child:not(:has(*)))',
    },
  ],
};

/**
 * Marketplace. Prices write BYN as "ƃ", as onliner does. Class names are
 * hashed per build (price--TuQtK), so they are matched by their stable
 * part. The main page's product cards, plain and accented alike:
 *
 *   <article class="main-page__product product-card …">
 *     <div class="catalogCard--… [accentCatalogCard--…]">
 *       <div class="middleWrap--…">
 *         <div class="price--…">
 *           <span class="firstRowPrice--…">
 *             <span class="mainPriceWrapper--…"><ins class="mo-typography …">21,15 ƃ</ins></span>
 *             <del class="mo-typography …">72,26 ƃ</del>    (on sale only)
 *           </span>
 *         </div>
 *         …name…
 *
 * The current price is the <ins>; the struck-through <del> is never
 * matched. The cards are narrow, so the conversion goes after the whole
 * price line, across the card, where it wraps within the card's width — as
 * on 21vek's small cards.
 *
 * The card every Wildberries site used before the redesign
 * (ins.price__lower-price in p.product-card__price) is matched too, for
 * pages that still draw it.
 *
 * Product page (www.wildberries.by/catalog/823725522/detail.aspx): the
 * price beside the struck-through old one, which is a span of its own:
 *
 *   <div class="productSummary--…">
 *     …promo timer…
 *     <div class="productPrice--… productPriceAside--…">
 *       …
 *         <div class="priceBlockPriceWrapper--…">          (lays out in a row)
 *           <div class="priceBlockPriceWrap--…">
 *             <span class="priceBlockPrice--…"><ins class="… priceBlockFinalPrice--…">21,15 ƃ</ins></span>
 *             <span class="… priceBlockOldPrice--…">72,26 ƃ</span>
 *           </div>
 *     </div>
 *     …"Хорошая цена" badges, buttons…
 *
 * The row holding the price lays out sideways (and clips), so the
 * conversion goes at the end of the whole price block instead, under the
 * row — larger than on the cards. Measured there, two margins meet it:
 * 16px under the price (priceBlock--…), and −8px over the badges below,
 * which reach up into that space. Margins collapse: −12px above leaves 4px
 * under the price, and 16px below leaves the badges their usual 8px.
 *
 * "Other offers" on the product page, each seller's price in bold:
 *
 *   <div class="itemContent--…">
 *     <div class="priceWrap--…"><b class="mo-typography …">21,15 ƃ</b></div>
 *     …rating, delivery day, seller…
 *   </div>
 *
 * The price's div lays out sideways, so the conversion goes after it, on
 * a line of its own above the rating. ("priceWrap--" is case-sensitive,
 * so the product's own priceBlockPriceWrap-- never matches.)
 *
 * Other sellers' page (www.wildberries.by/catalog/762229639/other-sellers),
 * one line per seller, the current price beside the old one:
 *
 *   <div class="productLinePrice--…">
 *     <div class="productLinePriceWrapDesktop--…">
 *       <div class="productLinePriceContainer--…">
 *         <span class="… productLinePriceNow--…"><span>19,63 ƃ</span></span>
 *       </div>
 *       <span class="… productLinePriceOld--…">21,22 ƃ</span>
 *     </div>
 *   </div>
 *
 * The conversion goes after the pair, under them, one currency a line.
 *
 * "Предложения продавцов" on a product page: one row per seller, laid out
 * in columns — description, price, delivery button, seller:
 *
 *   <div class="container--…">
 *     <div class="description--…">…</div>
 *     <div class="price--…">                              (current over old)
 *       <span class="… priceNow--…">21,15 ƃ</span>
 *       <span class="… priceOld--…">72,26 ƃ</span>
 *     </div>
 *     <button …>Послезавтра</button>
 *     …seller…
 *
 * After the price div, as on the cards, the conversion would take a
 * column slot of its own, far from the price. So it goes last in the price
 * div, one currency a line, and `pageStyles` turns that div into two
 * columns — current over old price, and the conversion beside them:
 *
 *   21,15 ƃ   $7.06
 *   72,26 ƃ   €6.29
 *             585 ₽
 *
 * Only a price div holding a conversion is changed. ("priceNow--" is
 * case-sensitive, so the other sellers' productLinePriceNow-- never
 * matches it.)
 *
 * Basket (www.wildberries.by/lk/basket), in the site's older markup:
 *
 * - Each item's price, in a column with the old price under it:
 *
 *     <div class="list-item__price">
 *       <div class="list-item__price-new">19,63 ƃ</div>
 *       <div class="list-item__price-old">21,22 ƃ</div>
 *     </div>
 *
 *   The conversion goes last in that column, under the old price.
 *
 * - The order total, label left and amount right:
 *
 *     <p class="b-top__total line …"><span>Итого</span><span>1 314,87 ƃ</span></p>
 *
 *   Only the total converts, not the goods subtotal or the discount above
 *   it. The conversion goes under the line, right-aligned under the amount.
 */
export const WILDBERRIES = {
  pageStyles: `
    div[class^="price--"]:has(> [class*="priceNow--"]):has(> [data-byn-to-currency]) {
      display: grid !important;
      grid-template-columns: auto auto;
      column-gap: 12px;
      align-items: start;
    }
    div[class^="price--"]:has(> [class*="priceNow--"]) > [class*="priceNow--"],
    div[class^="price--"]:has(> [class*="priceNow--"]) > [class*="priceOld--"] {
      grid-column: 1;
    }
    div[class^="price--"]:has(> [class*="priceNow--"]) > [data-byn-to-currency] {
      grid-column: 2;
      grid-row: 1 / span 2;
    }
  `,

  priceSelector: [
    '[class*="mainPriceWrapper--"] > ins',
    '[class*="priceBlockFinalPrice--"]',
    '[class*="priceWrap--"] > b',
    '[class*="productLinePriceNow--"]',
    '[class*="priceNow--"]',
    '.list-item__price-new',
    '.b-top__total > span:last-child',
    '.price__lower-price',
  ].join(', '),
  priceContainer: 'div[class^="price--"], div[class*=" price--"], .product-card__price',
  insertPosition: 'afterContainer',
  fontSize: '13px',

  styles: [
    {
      selector: '[class*="priceBlockFinalPrice--"]',
      priceContainer: '[class*="productPrice--"]',
      insertPosition: 'append',
      fontSize: '16px',
      margin: '-12px 0 16px',
    },
    {
      selector: '[class*="priceWrap--"]',
      priceContainer: '[class*="priceWrap--"]',
    },
    {
      selector: '[class*="productLinePriceNow--"]',
      priceContainer: '[class*="productLinePriceWrapDesktop--"]',
      layout: LAYOUT.BLOCK,
    },
    {
      selector: '[class*="priceNow--"]',
      insertPosition: 'append',
      layout: LAYOUT.BLOCK,
    },
    {
      selector: '.list-item__price',
      priceContainer: '.list-item__price',
      insertPosition: 'append',
    },
    {
      selector: '.b-top__total',
      priceContainer: '.b-top__total',
      textAlign: 'right',
    },
  ],
};
