import { LAYOUT } from './format.js';

const SETTINGS_KEY = 'siteSettings';

/**
 * Global fallback, used for any site the user has not configured.
 */
export const DEFAULT_SETTINGS = {
  currencies: ['USD', 'EUR', 'RUB'],
  layout: LAYOUT.INLINE,
  display: 'symbol',
  decimals: 2,
  locale: 'en-US',
};

/**
 * Stored shape:
 *
 *   {
 *     defaults: { ...DEFAULT_SETTINGS },
 *     sites: {
 *       "onliner.by": {
 *         // Site level — currency order lives here so it stays stable
 *         // everywhere on the site.
 *         currencies: ["USD", "EUR"],
 *         layout: "inline",
 *         decimals: { default: 2, RUB: 0 },
 *
 *         // Page level — evaluated in order, FIRST MATCH WINS. A rule may
 *         // override any field; layout and decimals are the ones that vary
 *         // in practice. A dense catalog grid wants inline, a product page
 *         // wants block; apartment prices want no fractions at all.
 *         pages: [
 *           { pattern: "/catalog/*",    layout: "inline" },
 *           { pattern: "/product/*",    layout: "block"  },
 *           { pattern: "/apartments/*", layout: "block", decimals: 0 }
 *         ]
 *       }
 *     }
 *   }
 *
 * Resolution is a three-layer merge: defaults ← site ← first matching page rule.
 */

/**
 * Normalizes a hostname for use as a settings key.
 * "www.Onliner.by" → "onliner.by"
 *
 * @param {string} hostname
 * @returns {string}
 */
function normalizeHost(hostname) {
  return hostname.toLowerCase().replace(/^www\./, '');
}

/**
 * Compiles a page pattern into a RegExp.
 *
 * Only `*` is a wildcard; it matches any run of characters, including `/`.
 * Every other character — `?` included — is literal, so a pattern can target
 * a query string directly (e.g. "/search?view=grid").
 *
 * @param {string} pattern
 * @returns {RegExp}
 */
function patternToRegExp(pattern) {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const withWildcards = escaped.replace(/\\\*/g, '.*');
  return new RegExp(`^${withWildcards}$`);
}

/**
 * Builds the string a page pattern is tested against.
 *
 * Patterns that mention a query string are matched against "path + search";
 * everything else is matched against the path alone, so a stray "?utm_source"
 * does not break an otherwise-matching rule.
 *
 * @param {URL} url
 * @param {string} pattern
 * @returns {string}
 */
function matchTarget(url, pattern) {
  return pattern.includes('?') ? `${url.pathname}${url.search}` : url.pathname;
}

/**
 * Finds the first page rule matching the URL. Order is significant — put the
 * most specific patterns first.
 *
 * @param {URL} url
 * @param {Array<Object>} pages
 * @returns {Object|null}
 */
function findPageRule(url, pages) {
  if (!Array.isArray(pages)) {
    return null;
  }

  for (const rule of pages) {
    if (!rule || typeof rule.pattern !== 'string') {
      continue;
    }
    if (patternToRegExp(rule.pattern).test(matchTarget(url, rule.pattern))) {
      return rule;
    }
  }

  return null;
}

/**
 * Strips the bookkeeping fields so a rule can be spread as an options patch.
 *
 * @param {Object|null} rule
 * @returns {Object}
 */
function ruleOverrides(rule) {
  if (!rule) {
    return {};
  }
  const { pattern, ...overrides } = rule;
  return overrides;
}

/**
 * Resolves the effective settings for a URL. Pure — takes the whole settings
 * object rather than reading storage, so it is straightforward to test.
 *
 * An unparseable URL falls back to the global defaults rather than throwing.
 *
 * @param {string} url - Full page URL
 * @param {Object} settings - Stored settings object
 * @returns {Object} Resolved settings, ready to spread into formatPrices options
 */
export function resolveSettings(url, settings = {}) {
  const defaults = { ...DEFAULT_SETTINGS, ...(settings.defaults ?? {}) };

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return defaults;
  }

  const site = settings.sites?.[normalizeHost(parsed.hostname)];
  if (!site) {
    return defaults;
  }

  const { pages, ...siteOverrides } = site;
  const pageRule = findPageRule(parsed, pages);

  return {
    ...defaults,
    ...siteOverrides,
    ...ruleOverrides(pageRule),
  };
}

/**
 * Collects every currency mentioned anywhere in the settings — global
 * defaults, every site, every page rule.
 *
 * The rate cache is global while currency lists are per-site, so a single
 * fetch has to satisfy all of them: the union is what gets requested. Without
 * this, a site configured for PLN would silently render nothing for it,
 * because the fetcher would never have asked for PLN.
 *
 * @param {Object} settings - Stored settings object
 * @returns {string[]} Uppercased, deduplicated currency codes
 */
export function collectCurrencies(settings = {}) {
  const found = new Set();

  const add = list => {
    if (!Array.isArray(list)) {
      return;
    }
    for (const code of list) {
      if (typeof code === 'string' && code) {
        found.add(code.toUpperCase());
      }
    }
  };

  add({ ...DEFAULT_SETTINGS, ...(settings.defaults ?? {}) }.currencies);

  for (const site of Object.values(settings.sites ?? {})) {
    add(site?.currencies);
    for (const rule of site?.pages ?? []) {
      add(rule?.currencies);
    }
  }

  return [...found];
}

/**
 * Convenience: every currency the user has configured, read from storage.
 * Pass the result to getExchangeRates().
 *
 * @returns {Promise<string[]>}
 */
export async function getAllCurrencies() {
  return collectCurrencies(await loadSettings());
}

/**
 * Reads the full settings object from storage.
 *
 * @returns {Promise<Object>}
 */
export async function loadSettings() {
  const result = await chrome.storage.local.get(SETTINGS_KEY);
  return result[SETTINGS_KEY] ?? { defaults: { ...DEFAULT_SETTINGS }, sites: {} };
}

/**
 * Writes the full settings object to storage.
 *
 * @param {Object} settings
 * @returns {Promise<void>}
 */
export async function saveSettings(settings) {
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
}

/**
 * Convenience: resolved settings for a URL, read straight from storage.
 *
 * @param {string} url
 * @returns {Promise<Object>}
 */
export async function getSettingsForUrl(url) {
  return resolveSettings(url, await loadSettings());
}

/**
 * Updates site-level settings (currency order, site default layout).
 *
 * @param {string} url - Any URL on the site
 * @param {Object} patch - Fields to merge, e.g. { currencies: ["USD"] }
 * @returns {Promise<Object>} The updated settings object
 */
export async function setSiteSettings(url, patch) {
  const settings = await loadSettings();
  const host = normalizeHost(new URL(url).hostname);

  settings.sites ??= {};
  settings.sites[host] = { ...(settings.sites[host] ?? {}), ...patch };

  await saveSettings(settings);
  return settings;
}

/**
 * Adds or updates the page rule for `pattern` on the URL's site.
 *
 * New rules are prepended, so a rule added later — which is by definition more
 * specific to what the user is looking at — takes priority over broader ones
 * already stored.
 *
 * @param {string} url - Any URL on the site
 * @param {string} pattern - Page pattern, e.g. "/product/*"
 * @param {Object} patch - Fields to apply, e.g. { layout: "block" }
 * @returns {Promise<Object>} The updated settings object
 */
export async function setPageRule(url, pattern, patch) {
  const settings = await loadSettings();
  const host = normalizeHost(new URL(url).hostname);

  settings.sites ??= {};
  settings.sites[host] ??= {};
  settings.sites[host].pages ??= [];

  const pages = settings.sites[host].pages;
  const existing = pages.findIndex(rule => rule.pattern === pattern);

  if (existing === -1) {
    pages.unshift({ pattern, ...patch });
  } else {
    pages[existing] = { ...pages[existing], ...patch };
  }

  await saveSettings(settings);
  return settings;
}

/**
 * Removes a page rule.
 *
 * @param {string} url - Any URL on the site
 * @param {string} pattern - The rule's pattern
 * @returns {Promise<Object>} The updated settings object
 */
export async function removePageRule(url, pattern) {
  const settings = await loadSettings();
  const host = normalizeHost(new URL(url).hostname);
  const pages = settings.sites?.[host]?.pages;

  if (pages) {
    settings.sites[host].pages = pages.filter(rule => rule.pattern !== pattern);
    await saveSettings(settings);
  }

  return settings;
}
