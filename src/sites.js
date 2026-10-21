import { BY_PRESETS } from './sites/by.js';


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
 *
 * ── Regions ──────────────────────────────────────────────────────────────────
 *
 * Presets live in one file per region under sites/, merged here in the order
 * the popup lists them. A storefront shared between countries keeps its
 * preset in a file of its own (sites/ru-marketplaces.js) for each region to
 * attach to its domain.
 */
export const SITE_PRESETS = {
  ...BY_PRESETS,
};

/**
 * Every region the extension knows, keyed by top-level domain, in the order
 * the popup lists them — a region shows there even before it has a site.
 *
 * A region's fields apply to every site under its domain, beneath the site's
 * own preset: resolveSettings() merges them in right after the defaults. So
 * far that is only the currency prices are written in there.
 */
export const REGIONS = {
  by: { sourceCurrency: 'BYN' },
  pl: { sourceCurrency: 'PLN' },
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
