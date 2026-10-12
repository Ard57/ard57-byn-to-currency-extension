import { DEFAULT_SETTINGS, SOURCE_CURRENCY, loadSettings, setDefaults } from './settings.js';

/**
 * The toolbar popup: which currencies prices are converted into.
 *
 * Only currencies are set here, and deliberately so. How a conversion is laid
 * out depends on the page it lands on — the room in a card, the width of a
 * column — and whether fractions are worth showing depends on what is being
 * sold. Both belong to the site presets in sites.js, which know those answers
 * per page. Currencies are the one choice that is the reader's alone, which
 * is why no preset sets them.
 *
 * The choice is written as it is made. Content scripts watch storage and
 * rescan, so an open page updates without being reloaded.
 */

/**
 * Currencies offered, in the order they are rendered on a page. All are
 * quoted by the rates API; the source currency is never among them, since
 * converting BYN to BYN says nothing.
 */
const CURRENCIES = ['USD', 'EUR', 'RUB', 'PLN', 'GBP', 'CNY'];

/** How long "Saved" stays on screen. */
const STATUS_MS = 1200;

const els = {
  name: document.getElementById('extension-name'),
  currencies: document.getElementById('currencies'),
  status: document.getElementById('status'),
};

/**
 * Fills in any element carrying data-i18n, leaving the markup's own text as
 * the fallback when a locale has no message for it.
 */
function localize() {
  for (const el of document.querySelectorAll('[data-i18n]')) {
    const message = chrome.i18n.getMessage(el.dataset.i18n);
    if (message) {
      el.textContent = message;
    }
  }
}

/**
 * A checkbox per currency, including the last one: unticking everything is
 * allowed, and switches the extension off. Prices are left as the site wrote
 * them until a currency is ticked again — which is also what lets someone
 * untick the one they have before ticking the one they want.
 *
 * @param {string[]} chosen
 */
function renderCurrencies(chosen) {
  els.currencies.replaceChildren(...CURRENCIES.map(code => {
    const label = document.createElement('label');
    const box = document.createElement('input');

    box.type = 'checkbox';
    box.value = code;
    box.checked = chosen.includes(code);
    box.addEventListener('change', onCurrencyChange);

    label.append(box, code);
    return label;
  }));
}

/** The ticked currencies, in the order they are offered. */
function chosenCurrencies() {
  return [...els.currencies.querySelectorAll('input:checked')].map(box => box.value);
}

function onCurrencyChange() {
  const currencies = chosenCurrencies();

  save({ currencies }, currencies.length === 0
    ? chrome.i18n.getMessage('popupOff') || 'Conversions off'
    : chrome.i18n.getMessage('popupSaved') || 'Saved');
}

/**
 * @param {string} message - Shown briefly under the settings
 */
let noteTimer = null;
function note(message) {
  els.status.textContent = message;
  clearTimeout(noteTimer);
  noteTimer = setTimeout(() => {
    els.status.textContent = '';
  }, STATUS_MS);
}

/**
 * Writes run one after another, never side by side.
 *
 * Each one reads the stored settings, merges its field and writes the whole
 * object back, so two in flight at once would both read the same state and
 * the second would undo the first — ticking two currencies quickly enough
 * would lose the first of them.
 */
let writes = Promise.resolve();

/**
 * @param {Object} patch - Fields to merge into the global defaults
 * @param {string} message - Shown once the write lands
 */
function save(patch, message) {
  writes = writes
    .then(() => setDefaults(patch))
    .then(() => note(message))
    .catch(error => {
      els.status.textContent = error.message;
    });

  return writes;
}

async function start() {
  localize();
  els.name.textContent = chrome.runtime.getManifest().name;

  const stored = await loadSettings();
  const settings = { ...DEFAULT_SETTINGS, ...(stored.defaults ?? {}) };

  renderCurrencies((settings.currencies ?? []).filter(code => code !== SOURCE_CURRENCY));
}

start().catch(error => {
  els.status.textContent = error.message;
});
