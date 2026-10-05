/**
 * When exchange rates are expected to change.
 *
 * Frankfurter republishes the ECB reference rates on weekdays at around 16:00
 * Central European time, and nothing moves in between — not overnight, not
 * over a weekend. So the refresh is pinned to that publication instead of a
 * rolling age: one update per weekday, shortly after the new rates land.
 *
 * Each installation refreshes at its own minute between 17:15 and 17:30 CET.
 * The quarter hour of margin keeps us from ever arriving before the new rates
 * are out, and the random minute spreads every user's request across the
 * window instead of sending them all at the same second.
 */

/**
 * The publisher's own timezone, so the schedule follows CET/CEST — including
 * the two days a year the clocks move — rather than drifting against it.
 */
const TIME_ZONE = 'Europe/Berlin';

/** An hour past publication, as a margin for a late update. */
const UPDATE_HOUR = 17;

const MINUTE_MS = 60 * 1000;

/** Earliest minute past UPDATE_HOUR this installation may refresh. */
const WINDOW_START_MS = 15 * MINUTE_MS;

/** How wide the window is: 17:15 up to, but not including, 17:30. */
const WINDOW_SPAN_MS = 15 * MINUTE_MS;

/** Where this installation's own minute is kept. */
const OFFSET_KEY = 'updateOffset';

const zoneFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

/**
 * Splits an instant into the wall-clock fields shown in TIME_ZONE.
 *
 * @param {number} timestamp - Milliseconds since the epoch
 * @returns {{year: number, month: number, day: number, hour: number, minute: number, second: number}}
 */
function zonedParts(timestamp) {
  const parts = {};

  for (const { type, value } of zoneFormat.formatToParts(timestamp)) {
    if (type !== 'literal') {
      parts[type] = Number(value);
    }
  }

  return parts;
}

/**
 * The zone's UTC offset at a given instant, in milliseconds.
 *
 * Derived by reading the wall clock and treating it as if it were UTC: the
 * gap between that and the real instant is the offset. Whole seconds only,
 * which every real offset is.
 *
 * @param {number} timestamp
 * @returns {number}
 */
function zoneOffsetMs(timestamp) {
  const { year, month, day, hour, minute, second } = zonedParts(timestamp);
  const asIfUtc = Date.UTC(year, month - 1, day, hour, minute, second);

  return asIfUtc - Math.floor(timestamp / 1000) * 1000;
}

/**
 * The calendar date in TIME_ZONE, carried as a UTC-midnight Date purely so
 * day arithmetic and getUTCDay() work on it. Its instant is meaningless.
 *
 * @param {number} timestamp
 * @returns {Date}
 */
function zonedDate(timestamp) {
  const { year, month, day } = zonedParts(timestamp);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * @param {Date} date - A calendar date from zonedDate()
 * @returns {boolean} True Monday through Friday
 */
function isWeekday(date) {
  const weekday = date.getUTCDay();
  return weekday >= 1 && weekday <= 5;
}

/**
 * The instant this installation's refresh time falls on a given calendar date
 * in TIME_ZONE.
 *
 * The first guess uses the offset in force at the same wall clock read as
 * UTC, which can be the wrong side of a DST change; applying the offset found
 * at that guess settles it. The refresh never lands inside a transition —
 * those happen in the small hours — so one correction is always enough.
 *
 * @param {Date} date - A calendar date from zonedDate()
 * @param {number} offsetMs - Milliseconds past UPDATE_HOUR
 * @returns {number} Milliseconds since the epoch
 */
function updateInstant(date, offsetMs) {
  const wallClock = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    UPDATE_HOUR,
  ) + offsetMs;

  const guess = wallClock - zoneOffsetMs(wallClock);
  return wallClock - zoneOffsetMs(guess);
}

/**
 * Walks calendar dates from `now` until a weekday update instant satisfies
 * `accept`. Any four consecutive days include a weekday, so the bound is only
 * a guard against a formatter that has stopped making sense.
 *
 * @param {number} now
 * @param {1|-1} step - Days to move each turn
 * @param {(instant: number) => boolean} accept
 * @returns {number}
 */
function findUpdate(now, step, accept, offsetMs) {
  const date = zonedDate(now);

  for (let attempts = 0; attempts < 8; attempts++) {
    if (isWeekday(date)) {
      const instant = updateInstant(date, offsetMs);
      if (accept(instant)) {
        return instant;
      }
    }

    date.setUTCDate(date.getUTCDate() + step);
  }

  throw new Error('BYN to Currency: no update time found within a week');
}

/**
 * The most recent scheduled update at or before `now`.
 *
 * This is the line cached rates are judged against: anything fetched after it
 * already has the newest published rates, however many hours ago that was.
 *
 * @param {number} [now] - Milliseconds since the epoch
 * @param {number} [offsetMs] - This installation's minute, from updateOffsetMs()
 * @returns {number} Milliseconds since the epoch
 */
export function lastUpdateAt(now = Date.now(), offsetMs = WINDOW_START_MS) {
  return findUpdate(now, -1, instant => instant <= now, offsetMs);
}

/**
 * The next scheduled update strictly after `now`. Used to arm the alarm.
 *
 * @param {number} [now] - Milliseconds since the epoch
 * @param {number} [offsetMs] - This installation's minute, from updateOffsetMs()
 * @returns {number} Milliseconds since the epoch
 */
export function nextUpdateAt(now = Date.now(), offsetMs = WINDOW_START_MS) {
  return findUpdate(now, 1, instant => instant > now, offsetMs);
}

/**
 * A minute somewhere in the window, as milliseconds past UPDATE_HOUR.
 *
 * @returns {number}
 */
function pickOffsetMs() {
  return WINDOW_START_MS + Math.floor(Math.random() * WINDOW_SPAN_MS);
}

/** Resolves once per worker; the stored value never changes after that. */
let offsetPromise = null;

/**
 * This installation's refresh minute, drawn once and kept.
 *
 * Drawn once rather than per call because the same number has to serve both
 * ends of the schedule: the alarm that fetches, and the line
 * {@link lastUpdateAt} draws for judging the cache. A number that moved
 * between those two would have a page load declare the just-fetched rates
 * stale and fetch them again — one more request, which is the opposite of
 * what spreading them out is for.
 *
 * Falls back to the start of the window if storage is unavailable: early
 * within the window, but never before the rates are published.
 *
 * @returns {Promise<number>} Milliseconds past UPDATE_HOUR
 */
export function updateOffsetMs() {
  offsetPromise ??= loadOffsetMs();
  return offsetPromise;
}

async function loadOffsetMs() {
  try {
    const stored = (await chrome.storage.local.get(OFFSET_KEY))[OFFSET_KEY];

    if (Number.isFinite(stored) && stored >= WINDOW_START_MS && stored < WINDOW_START_MS + WINDOW_SPAN_MS) {
      return stored;
    }

    const picked = pickOffsetMs();
    await chrome.storage.local.set({ [OFFSET_KEY]: picked });
    return picked;
  } catch {
    return WINDOW_START_MS;
  }
}
