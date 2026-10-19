import { convertPrices } from './format.js';
import { DEFAULT_SETTINGS, SOURCE_CURRENCY, loadSettings, setDefaults } from './settings.js';
import { SITE_PRESETS, hostnameChain } from './sites.js';

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
 * The popup lists only the currencies in use, in the order they are printed.
 * The rest wait behind the add button, in a picker that searches them, since
 * a reader uses three or four and the other thirty-odd only get in the way.
 *
 * Every change is written as it is made. Content scripts watch storage and
 * redraw, so an open page follows along without being reloaded.
 */

/** How long a status message stays on screen. */
const STATUS_MS = 1200;

/** Chrome's own limit on a popup's height; anything taller is cut off. */
const POPUP_MAX_HEIGHT = 600;

/** The share of the browser window's height the popup may take up. */
const WINDOW_SHARE = 0.75;

/** A scrolling list never shrinks below this, however small the window. */
const LIST_MIN_HEIGHT = 120;

/** The price the preview converts, in SOURCE_CURRENCY. */
const PREVIEW_AMOUNT = 100;

/**
 * Where the popup keeps its own state between openings: the open tab and
 * what the converter was converting. A key of its own, apart from the
 * settings, so typing an amount never makes open pages redraw.
 */
const STATE_KEY = 'popupState';

/** The popup's state, as saved under STATE_KEY. */
let state = {
  tab: 'currencies',
  amount: '100',
  from: 'USD',
  to: SOURCE_CURRENCY,
};

async function loadState() {
  try {
    const saved = (await chrome.storage.local.get(STATE_KEY))[STATE_KEY] ?? {};
    const known = DEFAULT_SETTINGS.currencyOrder;

    state = {
      tab: ['converter', 'sites'].includes(saved.tab) ? saved.tab : 'currencies',
      amount: typeof saved.amount === 'string' ? saved.amount : state.amount,
      from: known.includes(saved.from) ? saved.from : state.from,
      to: known.includes(saved.to) ? saved.to : state.to,
    };
  } catch {
    // Opens on the defaults.
  }
}

function saveState() {
  chrome.storage.local.set({ [STATE_KEY]: state }).catch(() => {});
}

/**
 * An amount as people type it — "1 234,5", "1234.50", "1,234.50" — or null
 * when it is not one. A comma is the decimal point unless a dot is there to
 * be one, in which case commas only group thousands.
 *
 * @param {string} text
 * @returns {number|null}
 */
function parseAmount(text) {
  const bare = String(text).replace(/[\s ]/g, '');
  const cleaned = bare.includes('.') ? bare.replace(/,/g, '') : bare.replace(',', '.');
  const value = cleaned === '' ? NaN : Number(cleaned);

  return Number.isFinite(value) && value >= 0 ? value : null;
}

/** An amount the user entered, as the preview repeats it: "1,234.5". */
function formatAmount(value) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
}

const els = {
  name: document.getElementById('extension-name'),
  main: document.getElementById('main-view'),
  currencies: document.getElementById('currencies'),
  add: document.getElementById('add'),
  picker: document.getElementById('picker-view'),
  pickerList: document.getElementById('picker-list'),
  pickerEmpty: document.getElementById('picker-empty'),
  search: document.getElementById('search'),
  back: document.getElementById('back'),
  status: document.getElementById('status'),
  sites: document.getElementById('sites'),
  previewSource: document.getElementById('preview-source'),
  previewPrices: document.getElementById('preview-prices'),
  previewDate: document.getElementById('preview-date'),
  hero: document.querySelector('.hero'),
  convertAmount: document.getElementById('convert-amount'),
  convertFrom: document.getElementById('convert-from'),
  convertTo: document.getElementById('convert-to'),
  convertSwap: document.getElementById('convert-swap'),
  convertResult: document.getElementById('convert-result'),
  convertRate: document.getElementById('convert-rate'),
};

/**
 * Every currency on offer, in the stored order. The chosen ones lead it, in
 * the order they are printed; the rest follow in the order the picker lists
 * them.
 */
let order = [];

/** The currencies in use, in the order they are printed. */
let chosen = [];

/** The latest rates from the service worker, once they arrive. */
let rates = null;

/** Small helper for the many elements built below. */
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (text !== undefined) {
    node.textContent = text;
  }
  return node;
}

/** A localized message, or the English fallback when a locale lacks it. */
function t(key, fallback, substitutions) {
  return chrome.i18n.getMessage(key, substitutions) || fallback;
}

/**
 * Fills in any element carrying data-i18n (its text), data-i18n-label (its
 * aria-label) or data-i18n-placeholder, leaving the markup's own text as the
 * fallback when a locale has no message for it.
 */
function localize() {
  const fill = (attr, apply) => {
    for (const node of document.querySelectorAll(`[data-${attr}]`)) {
      const message = chrome.i18n.getMessage(node.dataset[attr.replace(/-(\w)/g, (_, c) => c.toUpperCase())]);
      if (message) {
        apply(node, message);
      }
    }
  };

  fill('i18n', (node, message) => { node.textContent = message; });
  fill('i18n-label', (node, message) => node.setAttribute('aria-label', message));
  fill('i18n-placeholder', (node, message) => { node.placeholder = message; });
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
 * The symbol and full name of a currency — "$" and "US Dollar" — always in
 * English, from the browser's own currency data rather than a table of ours
 * that would trail the currency list.
 *
 * The symbol is the narrow one ("$", not "US$"), since the code beside it
 * already says which dollar. A currency with no symbol of its own gets an
 * empty one rather than its code repeated.
 *
 * @param {string} code
 * @returns {{ symbol: string, name: string }}
 */
const described = new Map();
function describe(code) {
  if (described.has(code)) {
    return described.get(code);
  }

  const locale = 'en';
  let symbol = '';
  let name = '';

  try {
    const narrow = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
    }).formatToParts(0).find(part => part.type === 'currency')?.value;

    if (narrow && narrow !== code) {
      symbol = narrow;
    }

    const full = new Intl.DisplayNames([locale], { type: 'currency' }).of(code);
    if (full && full !== code) {
      name = full;
    }
  } catch {
    // An engine without this data still lists the code on its own.
  }

  const result = { symbol, name };
  described.set(code, result);
  return result;
}

/**
 * The round badge that opens every row: the currency's symbol, or its code
 * in small type when it has no symbol of its own.
 *
 * @param {string} code
 * @returns {HTMLElement}
 */
function badge(code) {
  const { symbol } = describe(code);
  const node = el('span', 'badge', symbol || code);

  if (!symbol || symbol.length > 2) {
    node.classList.add('badge--long');
  }
  node.setAttribute('aria-hidden', 'true');

  return node;
}

/**
 * What one unit of a currency is worth in SOURCE_CURRENCY, scaled up for the
 * small ones so the figure says something: "3.02 Br" per dollar, but "3.53
 * Br" per 100 roubles rather than "0.04 Br" per rouble.
 *
 * @param {string} code
 * @returns {{ value: string, per: string }|null} Null without rates for it
 */
function unitRate(code) {
  if (!rates || code === SOURCE_CURRENCY || !(code in rates) || !(SOURCE_CURRENCY in rates)) {
    return null;
  }

  const one = rates[SOURCE_CURRENCY] / rates[code];
  let unit = 1;
  while (one * unit < 1 && unit < 1e6) {
    unit *= 10;
  }

  const value = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(one * unit);

  return { value: `${value} Br`, per: t('popupPer', `per ${unit} ${code}`, [`${unit} ${code}`]) };
}

/**
 * One row per chosen currency: a grip, the badge, the code over its name,
 * what it is worth in rubles, and the cross that removes it.
 *
 * Rows are focusable, so the keyboard can do what dragging does: Alt with an
 * arrow moves the focused row, Delete removes it.
 */
function renderRows() {
  const rows = chosen.map(code => {
    const { name } = describe(code);
    const row = el('li', 'row');
    const text = el('span', 'row__text');
    const rate = el('span', 'row__rate');
    const remove = el('button', 'remove');

    row.draggable = true;
    row.tabIndex = 0;
    row.dataset.code = code;
    row.setAttribute('aria-label', name ? `${code}, ${name}` : code);
    row.title = code === SOURCE_CURRENCY
      ? t('popupSourceHint', '')
      : t('popupReorderKeys', 'Drag, or Alt+↑/↓ to move');

    text.append(el('span', 'row__code', code));
    if (name) {
      text.append(el('span', 'row__name', name));
    }

    rate.dataset.code = code;

    remove.type = 'button';
    remove.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
    remove.setAttribute('aria-label', t('popupRemove', `Remove ${code}`, [code]));
    remove.addEventListener('click', () => removeCurrency(code));

    row.append(el('span', 'grip', '⋮⋮'), badge(code), text, rate, remove);
    row.firstChild.setAttribute('aria-hidden', 'true');

    return row;
  });

  if (rows.length === 0) {
    rows.push(el('li', 'rows__empty', t('popupEmpty', 'No currencies yet. Add one to see prices converted.')));
  }

  els.currencies.replaceChildren(...rows);
  fillRates();
}

/** Writes each row's rate in, which arrives after the rows are drawn. */
function fillRates() {
  for (const cell of els.currencies.querySelectorAll('.row__rate')) {
    const rate = unitRate(cell.dataset.code);

    cell.replaceChildren(...(rate ? [el('span', 'row__value', rate.value), el('span', 'row__per', rate.per)] : []));
  }
}

/**
 * The currencies not in use, filtered by what is typed in the search box:
 * code, name or symbol, anywhere in it, ignoring case.
 */
function renderPicker() {
  const query = els.search.value.trim().toLowerCase();

  const items = pickerOrder
    .filter(code => {
      if (!query) {
        return true;
      }
      const { symbol, name } = describe(code);
      return [code, name, symbol].some(field => field.toLowerCase().includes(query));
    })
    .map(code => {
      const { name } = describe(code);
      const item = el('li');
      const button = el('button', 'pick');
      const text = el('span', 'row__text');

      button.type = 'button';
      button.dataset.code = code;
      if (code === SOURCE_CURRENCY) {
        button.title = t('popupSourceHint', '');
      }

      text.append(el('span', 'row__code', code));
      if (name) {
        text.append(el('span', 'row__name', name));
      }

      const mark = el('span', 'pick__mark');
      mark.setAttribute('aria-hidden', 'true');
      mark.innerHTML = PICK_MARKS;

      button.append(badge(code), text, mark);
      if (choosing) {
        button.addEventListener('click', () => choose(code));
      } else {
        button.addEventListener('click', () => togglePick(button));
        button.addEventListener('mouseleave', () => button.classList.remove('is-fresh'));
      }
      markPick(button);
      item.append(button);

      return item;
    });

  els.pickerList.replaceChildren(...items);
  els.pickerEmpty.hidden = items.length > 0;
}

/**
 * The three marks a pick can show, swapped by CSS: a plus to add, a check
 * for a chosen currency, and a cross over the check when hovering a chosen
 * one, to say a click removes it.
 */
const PICK_MARKS = [
  '<svg class="pick__add" viewBox="0 0 24 24" width="14" height="14"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  '<svg class="pick__check" viewBox="0 0 24 24" width="14" height="14"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  '<svg class="pick__remove" viewBox="0 0 24 24" width="14" height="14"><path d="M7 7l10 10M17 7L7 17" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
].join('');

/**
 * Brings a pick's look and label in line with whether its currency is chosen
 * — or, choosing for the converter, whether it is the one picked there now.
 */
function markPick(button) {
  const { code } = button.dataset;

  if (choosing) {
    const current = code === state[choosing];
    button.classList.toggle('is-current', current);
    button.setAttribute('aria-current', String(current));
    return;
  }

  const on = chosen.includes(code);

  button.classList.toggle('is-chosen', on);
  button.setAttribute('aria-pressed', String(on));
  button.setAttribute('aria-label', on
    ? t('popupRemove', `Remove ${code}`, [code])
    : t('popupAddCode', `Add ${code}`, [code]));
}

/**
 * Adds or removes a pick's currency, staying in the picker so several can be
 * picked in a row. Only the pick itself is redrawn, so focus and the scroll
 * position stay put.
 *
 * Under the pointer, a currency that has just been added would at once show
 * the red cross that says "click to remove". The cross waits until the
 * pointer has left the pick once (`is-fresh`).
 */
function togglePick(button) {
  const { code } = button.dataset;

  if (chosen.includes(code)) {
    removeCurrency(code);
  } else {
    addCurrency(code);
  }

  markPick(button);
  button.classList.add('is-fresh');
}

/**
 * Every currency, in the order the picker opened with. Frozen while it is
 * open: the full order puts chosen currencies first, and a pick jumping up
 * the list the moment it is clicked would leave the pointer on another one.
 */
let pickerOrder = [];

/**
 * Which converter field the picker is choosing for, 'from' or 'to', or null
 * when it is adding currencies to the list. Choosing, a click picks one
 * currency and goes back; the one picked now is checked.
 */
let choosing = null;

function openPicker() {
  choosing = null;
  showPicker([...order]);
}

/**
 * Opens the picker to choose a converter currency, listing every currency in
 * the grouped order of the settings — the same place each time, unlike the
 * list's own order, which moves with what is chosen.
 *
 * @param {'from'|'to'} field
 */
function openChooser(field) {
  choosing = field;
  showPicker([...DEFAULT_SETTINGS.currencyOrder]);
}

function showPicker(codes) {
  pickerOrder = codes;
  els.search.value = '';
  els.pickerList.classList.toggle('picks--choose', Boolean(choosing));
  renderPicker();
  els.main.hidden = true;
  els.picker.hidden = false;
  els.search.focus();

  // Choosing, the current currency is in view straight away.
  els.pickerList.querySelector('.is-current')?.scrollIntoView({ block: 'nearest' });
  fitList();
}

/** Sets the converter field being chosen for, and goes back to it. */
function choose(code) {
  state[choosing] = code;
  converterChanged();
  closePicker();
}

function closePicker() {
  const back = choosing === 'from' ? els.convertFrom : choosing === 'to' ? els.convertTo : els.add;
  choosing = null;

  els.picker.hidden = true;
  els.main.hidden = false;
  back.focus();

  // The card was measured while hidden, at no height at all; picks made in
  // the picker may also have changed what it holds.
  preview();
  fitList();
}

/** Puts a currency at the end of the chosen ones. */
function addCurrency(code) {
  if (chosen.includes(code)) {
    return;
  }

  commit([...chosen, code], t('popupSaved', 'Saved'));
}

function removeCurrency(code) {
  const index = chosen.indexOf(code);
  const next = chosen.filter(c => c !== code);

  commit(next, next.length === 0 ? t('popupOff', 'Conversions off') : t('popupSaved', 'Saved'));

  // From the list, keep the keyboard in it: on the row that took this one's
  // place. From the picker, focus stays on the pick that was clicked.
  if (!els.main.hidden) {
    const rows = els.currencies.querySelectorAll('.row');
    (rows[Math.min(index, rows.length - 1)] ?? els.add).focus();
  }
}

/**
 * Swaps a currency with its neighbour.
 *
 * @param {string} code
 * @param {-1|1} step - Up or down
 */
function move(code, step) {
  const index = chosen.indexOf(code);
  const target = index + step;

  if (index === -1 || target < 0 || target >= chosen.length) {
    return;
  }

  const next = [...chosen];
  [next[index], next[target]] = [next[target], next[index]];
  commit(next, t('popupSaved', 'Saved'));

  els.currencies.querySelector(`.row[data-code="${code}"]`)?.focus();
}

/**
 * Adopts a new list of chosen currencies, redraws and saves it. The full
 * order is saved too, with the chosen ones leading it, so the next popup
 * opens on the same list.
 *
 * @param {string[]} next
 * @param {string} message
 */
function commit(next, message) {
  chosen = next;
  order = [...chosen, ...order.filter(code => !chosen.includes(code))];
  renderRows();
  preview();

  save({ currencyOrder: [...order], currencies: [...chosen] }, message);
}

function enableKeyboard() {
  els.currencies.addEventListener('keydown', event => {
    const row = event.target.closest?.('.row');
    if (!row || event.target !== row) {
      return;
    }

    if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      event.preventDefault();
      move(row.dataset.code, event.key === 'ArrowUp' ? -1 : 1);
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      (event.key === 'ArrowUp' ? row.previousElementSibling : row.nextElementSibling)?.focus();
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      removeCurrency(row.dataset.code);
    }
  });

  els.add.addEventListener('click', openPicker);
  els.back.addEventListener('click', closePicker);
  els.search.addEventListener('input', renderPicker);

  els.search.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      // Enter takes the first match. Adding, it never removes one already
      // chosen; choosing for the converter, any match will do.
      els.pickerList.querySelector(choosing ? '.pick' : '.pick:not(.is-chosen)')?.click();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      els.pickerList.querySelector('.pick')?.focus();
    }
  });

  els.pickerList.addEventListener('keydown', event => {
    const item = event.target.closest?.('li');
    if (!item) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      item.nextElementSibling?.querySelector('.pick')?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      (item.previousElementSibling?.querySelector('.pick') ?? els.search).focus();
    }
  });

  // Escape steps back out of the picker rather than closing the popup.
  els.picker.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closePicker();
    }
  });
}

/** The row being dragged, while a drag is under way. */
let dragged = null;

/**
 * Drag and drop, wired once on the list rather than per row, since every
 * change redraws the rows.
 *
 * The dragged row moves through the list as the pointer passes the middle of
 * another row, so the list shows the new order before the drop. Only the drop
 * saves it; a drag cancelled with Escape or released outside the list puts
 * the rows back as they were.
 */
function enableDragging() {
  const list = els.currencies;

  list.addEventListener('dragstart', event => {
    dragged = event.target.closest('.row');
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

    const row = event.target.closest('.row');
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

    const next = [...list.querySelectorAll('.row')].map(row => row.dataset.code);

    if (event.dataTransfer.dropEffect === 'none') {
      renderRows();
    } else if (next.some((code, index) => code !== chosen[index])) {
      commit(next, t('popupSaved', 'Saved'));
    }
  });
}

/**
 * @param {string} message - Shown briefly at the bottom of the popup
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
 * the second would undo the first — adding a currency and moving another
 * quickly enough would lose the addition.
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
    .then(loadRates)
    .catch(error => {
      els.status.textContent = error.message;
    });

  return writes;
}

/**
 * Asks the service worker for rates, the way pages do. It fetches any newly
 * added currency, so once a save lands the preview can show it — and the
 * converter's two, which no site may convert into.
 */
async function loadRates() {
  const response = await chrome.runtime
    .sendMessage({ type: 'GET_RATES', extra: [state.from, state.to] })
    .catch(() => null);

  if (response?.success) {
    rates = response.data.rates;
    preview(response.data);
    fillRates();
    renderConverter();
  } else if (!rates) {
    preview(null);
  }
}

/**
 * What the preview converts: 100 BYN on the currencies tab, and on the
 * converter whatever is being converted there, so the card shows the same
 * amount in every chosen currency at once.
 *
 * @param {string} [tab] - The tab to ask about; the open one by default
 * @returns {{ amount: number|null, from: string }}
 */
function previewSubject(tab = state.tab) {
  return tab === 'converter'
    ? { amount: parseAmount(state.amount), from: state.from }
    : { amount: PREVIEW_AMOUNT, from: SOURCE_CURRENCY };
}

/**
 * The rates last shown, with their date and staleness, for redraws without a
 * fetch. Undefined until the service worker first answers, null if it could
 * not.
 */
let lastRates;

/**
 * Shows what an amount turns into with the chosen currencies, in their
 * order, and the date of the rates behind it — formatted the way the global
 * defaults format it, since no site's preset applies here.
 *
 * Converting from anything but BYN, BYN itself leads the list when it is not
 * chosen: rubles are what every price on the supported sites is in.
 *
 * The card is as tall as the taller of the two tabs' versions of it, so
 * switching tabs never moves the tabs below it: the converter can show one or
 * two prices more than the currencies tab, enough to wrap onto another line.
 * The other tab's version is drawn first, only to be measured — both draws
 * happen before the browser paints, so it is never seen.
 *
 * @param {Object|null} [data] - A GET_RATES answer; omitted, the last one
 */
function preview(data = lastRates) {
  lastRates = data;

  // Still asking: a blank card for the moment it takes, rather than a flash
  // of "not loaded" on every opening.
  if (data === undefined) {
    return;
  }

  const hero = els.hero;
  const other = state.tab === 'converter' ? 'currencies' : 'converter';

  hero.style.minHeight = '';
  drawPreview(previewSubject(other), data);
  const otherHeight = hero.offsetHeight;

  drawPreview(previewSubject(), data);
  hero.style.minHeight = `${Math.max(otherHeight, hero.offsetHeight)}px`;

  fitList();
}

/**
 * Fills the card for one amount: the amount, its conversions and the date.
 *
 * @param {{ amount: number|null, from: string }} subject
 * @param {Object|null} data - A GET_RATES answer
 */
function drawPreview({ amount, from }, data) {
  const home = from === SOURCE_CURRENCY || chosen.includes(SOURCE_CURRENCY) ? [] : [SOURCE_CURRENCY];
  const currencies = [...home, ...chosen].filter(code => code !== from);
  const prices = els.previewPrices;
  const date = els.previewDate;

  prices.classList.remove('is-empty', 'is-long');

  const parts = amount !== null && currencies.length > 0 && data
    ? convertPrices(amount, from, currencies, data.rates, DEFAULT_SETTINGS)
    : [];

  els.previewSource.hidden = parts.length === 0;
  els.previewSource.textContent = amount === null ? '' : `${formatAmount(amount)} ${from} ≈`;

  if (parts.length === 0) {
    prices.classList.add('is-empty');
    if (amount === null) {
      prices.textContent = t('popupConvertEnter', 'Enter an amount to convert');
    } else if (currencies.length === 0) {
      prices.textContent = t('popupPreviewNone', 'Add a currency to see prices converted');
    } else {
      prices.textContent = t('popupPreviewNoRates', 'Rates are not loaded yet');
    }
    date.textContent = '';
    return;
  }

  // Each separator travels with the price after it, so a wrapped line never
  // ends on a dangling dot.
  prices.classList.toggle('is-long', parts.length > 3);
  prices.replaceChildren(...parts.map((part, index) => {
    const item = el('span', 'hero__item');
    if (index > 0) {
      item.append(el('span', 'hero__sep', '·'));
    }
    item.append(part.text);
    return item;
  }));

  date.textContent = data.date
    ? t(
      data.stale ? 'popupPreviewStale' : 'popupPreviewDate',
      `${data.stale ? 'Offline, using rates of' : 'ECB rates of'} ${formatDate(data.date)}`,
      [formatDate(data.date)],
    )
    : '';
}

/**
 * "2026-10-10" as the browser's language writes a day: "10 Oct 2026",
 * "10 окт. 2026 г.". Read as UTC, since it names a calendar day rather than a
 * moment, and a timezone west of Greenwich would otherwise make it the 9th.
 *
 * @param {string} isoDate
 * @returns {string}
 */
function formatDate(isoDate) {
  const day = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(day.getTime())) {
    return isoDate;
  }

  return new Intl.DateTimeFormat(chrome.i18n.getUILanguage?.() || undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(day);
}

/**
 * Lets whichever list is on screen grow as tall as the popup can be: 75% of
 * the browser window, but never past Chrome's 600px cap, minus whatever else
 * the popup shows. Only what is left over scrolls.
 */
let windowLimit = POPUP_MAX_HEIGHT;

async function measureWindow() {
  try {
    const { height } = await chrome.windows.getCurrent();
    if (height) {
      windowLimit = Math.min(POPUP_MAX_HEIGHT, Math.floor(height * WINDOW_SHARE));
    }
  } catch {
    // Keep Chrome's cap as the limit.
  }
}

function fitList() {
  // The picker's list, or the one in the open tab; a tab may have none.
  const list = els.picker.hidden
    ? document.querySelector('[role="tabpanel"]:not([hidden]) [data-fit]')
    : els.pickerList;
  if (!list) {
    return;
  }

  // The rest of the popup is measured around the list at whatever height it
  // has now, never by lifting its cap first: for that moment the list would
  // not scroll, and the browser would put it back at the top — on every pick.
  //
  // Rounded up, so a fraction of a pixel cannot tip the popup over its limit
  // and bring up a scrollbar of its own.
  const rest = Math.ceil(
    document.documentElement.getBoundingClientRect().height - list.getBoundingClientRect().height,
  );

  list.style.maxHeight = `${Math.max(LIST_MIN_HEIGHT, windowLimit - rest)}px`;
}

/**
 * The converter's result and the rate behind it, from the rates last loaded.
 * The result is the bare number, rounded the way prices on pages are; the
 * currency it is in is the one picked beside it.
 */
function renderConverter() {
  const { from, to } = state;
  const amount = parseAmount(state.amount);
  const known = lastRates?.rates;

  if (!known || !(from in known) || !(to in known)) {
    els.convertResult.textContent = '';
    els.convertRate.textContent = lastRates === null ? t('popupPreviewNoRates', 'Rates are not loaded yet') : '';
    return;
  }

  els.convertResult.textContent = amount === null
    ? ''
    : convertPrices(amount, from, [to], known, { ...DEFAULT_SETTINGS, display: 'none', includeSource: true })[0]?.text ?? '';

  // Per 100 or 1000 of a small currency, as the rows do: "100 RUB = 3.53 BYN".
  const one = known[to] / known[from];
  let unit = 1;
  while (one * unit < 1 && unit < 1e6) {
    unit *= 10;
  }

  const rate = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(one * unit);

  els.convertRate.textContent = `${unit} ${from} = ${rate} ${to}`;
}

/**
 * Saves a converter change and redraws what follows from it: the two
 * currency buttons, the result, and the preview, which converts the same
 * amount.
 */
function converterChanged() {
  saveState();
  labelCurrencyButtons();
  preview();
  renderConverter();

  // A currency no site converts into is not in the rates yet.
  const known = lastRates?.rates ?? {};
  if (!(state.from in known) || !(state.to in known)) {
    loadRates();
  }
}

/**
 * The converter's currency buttons: the badge, the code and the name of the
 * currency picked, the name cut short to fit. Each button's accessible name
 * keeps its role ("Convert from") and adds what is picked.
 */
function labelCurrencyButtons() {
  for (const [button, code] of [[els.convertFrom, state.from], [els.convertTo, state.to]]) {
    const { name } = describe(code);
    const text = el('span', 'currency-button__text');
    text.append(el('span', 'currency-button__code', code));
    if (name) {
      text.append(el('span', 'currency-button__name', name));
    }

    const chevron = el('span', 'currency-button__chevron');
    chevron.setAttribute('aria-hidden', 'true');
    chevron.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    button.dataset.role ??= button.getAttribute('aria-label') ?? '';
    button.setAttribute('aria-label', `${button.dataset.role}: ${code}${name ? `, ${name}` : ''}`);
    button.replaceChildren(badge(code), text, chevron);
  }
}

/**
 * Wires the converter. Its currencies are picked on the picker's screen, with
 * the same search as adding a currency, rather than in a plain drop-down,
 * which has none. Every change is saved as it is made.
 */
function enableConverter() {
  els.convertAmount.value = state.amount;
  labelCurrencyButtons();

  els.convertAmount.addEventListener('input', () => {
    state.amount = els.convertAmount.value;
    converterChanged();
  });

  els.convertFrom.addEventListener('click', () => openChooser('from'));
  els.convertTo.addEventListener('click', () => openChooser('to'));

  els.convertSwap.addEventListener('click', () => {
    [state.from, state.to] = [state.to, state.from];
    converterChanged();
  });
}

/**
 * The tabs under the preview. Each `role="tab"` names its panel through
 * aria-controls, so a new tab needs only its markup. Arrow keys, Home and End
 * move between tabs, which hold a single stop in the Tab order between them.
 *
 * The open tab is saved, so the popup opens on it next time, and the preview
 * follows it: the converter's amount there, 100 BYN everywhere else.
 */
function enableTabs() {
  const tabs = [...document.querySelectorAll('[role="tab"]')];

  const select = tab => {
    for (const each of tabs) {
      const on = each === tab;
      each.setAttribute('aria-selected', String(on));
      each.tabIndex = on ? 0 : -1;
      document.getElementById(each.getAttribute('aria-controls')).hidden = !on;
    }

    const name = tab.id.replace(/^tab-/, '');
    if (name !== state.tab) {
      state.tab = name;
      saveState();
    }

    preview();
    fitList();
  };

  for (const tab of tabs) {
    tab.addEventListener('click', () => select(tab));

    tab.addEventListener('keydown', event => {
      const index = tabs.indexOf(tab);
      const target = {
        ArrowLeft: tabs[(index - 1 + tabs.length) % tabs.length],
        ArrowRight: tabs[(index + 1) % tabs.length],
        Home: tabs[0],
        End: tabs[tabs.length - 1],
      }[event.key];

      if (target) {
        event.preventDefault();
        target.focus();
        select(target);
      }
    });
  }

  select(document.getElementById(`tab-${state.tab}`) ?? tabs[0]);
}

/** Every site with a preset of its own, in the order sites.js lists them. */
const SITE_HOSTS = Object.keys(SITE_PRESETS);

/** The sites switched off, as stored in `defaults.disabledSites`. */
let disabledSites = [];

/**
 * The nearest site above a host that has a preset of its own — "onliner.by"
 * for "ab.onliner.by" — or null for a site at the top.
 *
 * @param {string} host
 * @returns {string|null}
 */
function siteParent(host) {
  return hostnameChain(host).slice(0, -1).reverse().find(each => SITE_HOSTS.includes(each)) ?? null;
}

/**
 * One switch per site, subdomains indented under their domain. A domain's
 * switch covers its subdomains too, so while it is off theirs are greyed out
 * and cannot be used — but keep their own setting for when it is back on.
 */
function renderSites() {
  els.sites.replaceChildren(...SITE_HOSTS.map(host => {
    const parent = siteParent(host);
    const row = el('li', parent ? 'site site--child' : 'site');
    const label = el('label', 'site__label');
    const text = el('span', 'site__text');
    const toggle = el('input', 'switch');

    text.append(el('span', 'site__host', host));
    const name = t(`site_${host.replace(/[.-]/g, '_')}`, '');
    if (name) {
      text.append(el('span', 'site__name', name));
    }

    toggle.type = 'checkbox';
    toggle.setAttribute('role', 'switch');
    toggle.dataset.host = host;
    toggle.checked = !disabledSites.includes(host);
    toggle.disabled = Boolean(parent) && disabledSites.includes(parent);
    toggle.addEventListener('change', () => toggleSite(host, toggle.checked));

    row.classList.toggle('is-inactive', toggle.disabled);
    label.append(text, toggle);
    row.append(label);

    return row;
  }));
}

/**
 * Switches a site on or off, and redraws, since a domain's switch decides
 * whether its subdomains' can be used. Pages watch the settings, so open
 * ones follow at once.
 *
 * @param {string} host
 * @param {boolean} on
 */
function toggleSite(host, on) {
  disabledSites = on
    ? disabledSites.filter(each => each !== host)
    : [...disabledSites.filter(each => each !== host), host];

  renderSites();
  els.sites.querySelector(`input[data-host="${host}"]`)?.focus();

  save({ disabledSites: [...disabledSites] }, t('popupSaved', 'Saved'));
}

async function start() {
  localize();
  els.name.textContent = chrome.runtime.getManifest().name;

  const [stored] = await Promise.all([loadSettings(), loadState()]);
  const settings = { ...DEFAULT_SETTINGS, ...(stored.defaults ?? {}) };

  order = usableOrder(settings.currencyOrder);
  chosen = (settings.currencies ?? []).filter(code => order.includes(code));
  order = [...chosen, ...order.filter(code => !chosen.includes(code))];
  disabledSites = Array.isArray(settings.disabledSites)
    ? settings.disabledSites.filter(host => SITE_HOSTS.includes(host))
    : [];

  renderRows();
  renderSites();
  enableConverter();
  enableTabs();
  enableKeyboard();
  enableDragging();
  await measureWindow();
  fitList();
  await loadRates();
}

start().catch(error => {
  els.status.textContent = error.message;
});
