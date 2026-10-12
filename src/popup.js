import { DEFAULT_SETTINGS, SOURCE_CURRENCY, loadSettings, setDefaults } from './settings.js';

/**
 * The toolbar popup: which currencies prices are converted into, and in what
 * order they are printed.
 *
 * Only currencies are set here, and deliberately so. How a conversion is laid
 * out depends on the page it lands on — the room in a card, the width of a
 * column — and whether fractions are worth showing depends on what is being
 * sold. Both belong to the site presets in sites.js, which know those answers
 * per page. Currencies are the one choice that is the reader's alone, which
 * is why no preset sets them.
 *
 * Every change is written as it is made. Content scripts watch storage and
 * redraw, so an open page follows along without being reloaded.
 */

/** How long a status message stays on screen. */
const STATUS_MS = 1200;

const els = {
  name: document.getElementById('extension-name'),
  currencies: document.getElementById('currencies'),
  status: document.getElementById('status'),
};

/** The popup's working copy of the order, saved on every change. */
let order = [];

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
 * The stored order, repaired: unknown codes dropped, missing ones appended.
 *
 * A currency added to the defaults in a later version has to appear for
 * people whose stored order predates it, and a code that is no longer offered
 * must not linger as a row that converts nothing.
 *
 * @param {string[]} stored
 * @returns {string[]}
 */
function usableOrder(stored) {
  const known = DEFAULT_SETTINGS.currencyOrder;
  const kept = (Array.isArray(stored) ? stored : []).filter(code => known.includes(code));

  return [...kept, ...known.filter(code => !kept.includes(code))];
}

/**
 * One row per currency: a checkbox, the code, and the two buttons that move
 * it. The source currency is listed like any other — a price is never
 * converted into the currency it is already in, so ticking it shows nothing
 * today, but it will once prices in other currencies are read too.
 *
 * @param {string[]} chosen - The ticked currencies
 */
function render(chosen) {
  els.currencies.replaceChildren(...order.map((code, index) => {
    const row = document.createElement('li');
    const label = document.createElement('label');
    const box = document.createElement('input');

    box.type = 'checkbox';
    box.value = code;
    box.checked = chosen.includes(code);
    box.addEventListener('change', onToggle);

    label.append(box, code);
    row.append(label, moveButton(code, index, -1), moveButton(code, index, 1));

    if (code === SOURCE_CURRENCY) {
      row.title = chrome.i18n.getMessage('popupSourceHint') || '';
    }

    return row;
  }));
}

/**
 * @param {string} code
 * @param {number} index - Where the currency sits now
 * @param {-1|1} step - Up or down
 * @returns {HTMLButtonElement}
 */
function moveButton(code, index, step) {
  const button = document.createElement('button');
  const target = index + step;

  button.type = 'button';
  button.className = 'move';
  button.dataset.code = code;
  button.dataset.step = String(step);
  button.textContent = step < 0 ? '↑' : '↓';
  button.disabled = target < 0 || target >= order.length;
  button.setAttribute('aria-label', `${code} ${step < 0 ? 'up' : 'down'}`);
  button.addEventListener('click', () => move(code, step));

  return button;
}

/** The ticked currencies, in the order they are listed. */
function chosen() {
  return [...els.currencies.querySelectorAll('input:checked')].map(box => box.value);
}

function onToggle() {
  const currencies = chosen();

  save({ currencies }, currencies.length === 0
    ? chrome.i18n.getMessage('popupOff') || 'Conversions off'
    : chrome.i18n.getMessage('popupSaved') || 'Saved');
}

/**
 * Swaps a currency with its neighbour, then redraws — the buttons that can be
 * pressed change with every move, and so does which currency sits where.
 *
 * @param {string} code
 * @param {-1|1} step
 */
function move(code, step) {
  const index = order.indexOf(code);
  const target = index + step;

  if (index === -1 || target < 0 || target >= order.length) {
    return;
  }

  const ticked = chosen();
  [order[index], order[target]] = [order[target], order[index]];
  render(ticked);

  // Keep the keyboard where it was: on the button that just moved this row.
  els.currencies
    .querySelector(`button[data-code="${code}"][data-step="${step}"]`)
    ?.focus();

  save(
    { currencyOrder: [...order], currencies: order.filter(c => ticked.includes(c)) },
    chrome.i18n.getMessage('popupSaved') || 'Saved',
  );
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
 * Each one reads the stored settings, merges its fields and writes the whole
 * object back, so two in flight at once would both read the same state and
 * the second would undo the first — ticking a currency and moving another
 * quickly enough would lose the tick.
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

  order = usableOrder(settings.currencyOrder);
  render(settings.currencies ?? []);
}

start().catch(error => {
  els.status.textContent = error.message;
});
