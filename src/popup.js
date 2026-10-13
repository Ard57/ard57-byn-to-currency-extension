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
 * The symbol and full name that follow a code in the popup list — "$, US
 * Dollar" — always in English, from the browser's own currency data rather
 * than a table of ours that would trail the currency list.
 *
 * The symbol is the narrow one ("$", not "US$"), since the code beside it
 * already says which dollar. A currency with no symbol of its own gets its
 * code back, which would only repeat itself, so it is left out.
 *
 * @param {string} code
 * @returns {string} Empty when the browser knows neither
 */
function describe(code) {
  const locale = 'en';
  const parts = [];

  try {
    const symbol = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
    }).formatToParts(0).find(part => part.type === 'currency')?.value;

    if (symbol && symbol !== code) {
      parts.push(symbol);
    }

    const name = new Intl.DisplayNames([locale], { type: 'currency' }).of(code);
    if (name && name !== code) {
      parts.push(name);
    }
  } catch {
    // An engine without this data still lists the code on its own.
  }

  return parts.join(', ');
}

/**
 * One row per currency: a drag handle, a checkbox, the code with its symbol
 * and name, and the two buttons that move it. The source currency is listed
 * like any other — a price is never converted into the currency it is already
 * in, so ticking it shows nothing today, but it will once prices in other
 * currencies are read too.
 *
 * @param {string[]} chosen - The ticked currencies
 */
function render(chosen) {
  els.currencies.replaceChildren(...order.map((code, index) => {
    const row = document.createElement('li');
    const handle = document.createElement('span');
    const label = document.createElement('label');
    const box = document.createElement('input');

    row.draggable = true;
    row.dataset.code = code;

    // The whole row drags; the handle only says so. The buttons stay the way
    // to reorder from the keyboard.
    handle.className = 'handle';
    handle.textContent = '⋮⋮';
    handle.setAttribute('aria-hidden', 'true');

    box.type = 'checkbox';
    box.value = code;
    box.checked = chosen.includes(code);
    box.addEventListener('change', onToggle);

    const details = describe(code);
    label.append(box, code);

    if (details) {
      const extra = document.createElement('span');
      extra.className = 'details';
      extra.textContent = details;
      label.append(extra);
    }

    row.append(handle, label, moveButton(code, index, -1), moveButton(code, index, 1));

    // Long names are cut short to fit the popup, so the row's tooltip spells
    // them out — except on the source row, whose tooltip has more to say.
    if (code === SOURCE_CURRENCY) {
      row.title = chrome.i18n.getMessage('popupSourceHint') || '';
    } else if (details) {
      row.title = `${code} (${details})`;
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

  const next = [...order];
  [next[index], next[target]] = [next[target], next[index]];
  reorder(next);

  // Keep the keyboard where it was: on the button that just moved this row.
  els.currencies
    .querySelector(`button[data-code="${code}"][data-step="${step}"]`)
    ?.focus();
}

/**
 * Adopts a new order, redraws and saves it. The ticked currencies are saved
 * in the new order too, since that is the order they are printed in.
 *
 * @param {string[]} next
 */
function reorder(next) {
  const ticked = chosen();

  order = next;
  render(ticked);

  save(
    { currencyOrder: [...order], currencies: order.filter(c => ticked.includes(c)) },
    chrome.i18n.getMessage('popupSaved') || 'Saved',
  );
}

/** The row being dragged, while a drag is under way. */
let dragged = null;

/**
 * Drag and drop, wired once on the list rather than per row, since every
 * move redraws the rows.
 *
 * The dragged row moves through the list as the pointer passes the middle of
 * another row, so the list shows the new order before the drop. Only the drop
 * saves it; a drag cancelled with Escape or released outside the list puts
 * the rows back as they were.
 */
function enableDragging() {
  const list = els.currencies;

  list.addEventListener('dragstart', event => {
    dragged = event.target.closest('li');
    if (!dragged) {
      return;
    }

    dragged.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', dragged.dataset.code);
  });

  list.addEventListener('dragover', event => {
    if (!dragged) {
      return;
    }

    // Marks the list as a drop target; without it the drop never fires.
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    const row = event.target.closest('li');
    if (!row || row === dragged) {
      return;
    }

    const { top, height } = row.getBoundingClientRect();
    if (event.clientY > top + height / 2) {
      row.after(dragged);
    } else {
      row.before(dragged);
    }
  });

  list.addEventListener('drop', event => {
    event.preventDefault();
  });

  list.addEventListener('dragend', event => {
    if (!dragged) {
      return;
    }

    dragged.classList.remove('dragging');
    dragged = null;

    const next = [...list.children].map(row => row.dataset.code);

    if (event.dataTransfer.dropEffect === 'none') {
      render(chosen());
    } else if (next.some((code, index) => code !== order[index])) {
      reorder(next);
    }
  });
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
  enableDragging();
}

start().catch(error => {
  els.status.textContent = error.message;
});
