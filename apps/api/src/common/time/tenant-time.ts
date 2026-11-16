/**
 * Tenant-local calendar helpers. The server runs in UTC, but working days,
 * blackout dates, "due today" and scheduled-report times are all meant in the
 * organization's own timezone (organizations.timezone, an IANA name).
 * Implemented with Intl so no extra dependency is needed.
 */

export interface ZonedParts {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number;
  weekday: number; // 0 = Sunday
  ymd: string; // YYYY-MM-DD
}

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const formatters = new Map<string, Intl.DateTimeFormat>();

/** Returns a valid IANA zone, falling back to UTC for missing/invalid values. */
export function resolveTimeZone(tz: string | null | undefined): string {
  if (!tz) return 'UTC';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return tz;
  } catch {
    return 'UTC';
  }
}

function formatter(tz: string): Intl.DateTimeFormat {
  let f = formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short',
    });
    formatters.set(tz, f);
  }
  return f;
}

/** Calendar/clock fields of `date` as seen in `timeZone`. */
export function zonedParts(date: Date, timeZone: string): ZonedParts {
  const parts: Record<string, string> = {};
  for (const p of formatter(resolveTimeZone(timeZone)).formatToParts(date)) parts[p.type] = p.value;
  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  return {
    year,
    month,
    day,
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    weekday: WEEKDAYS[parts.weekday],
    ymd: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

/** Offset (ms) of `timeZone` from UTC at instant `date`. */
function offsetMs(date: Date, timeZone: string): number {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return asUtc - Math.floor(date.getTime() / 60000) * 60000;
}

/** The instant of local midnight (start of day) in `timeZone` for the day containing `date`. */
export function startOfZonedDay(date: Date, timeZone: string): Date {
  const p = zonedParts(date, timeZone);
  const guess = new Date(Date.UTC(p.year, p.month - 1, p.day));
  // Two passes handle DST changes between the guess and the target.
  let result = new Date(guess.getTime() - offsetMs(guess, timeZone));
  result = new Date(guess.getTime() - offsetMs(result, timeZone));
  return result;
}

/** The last millisecond of the local day containing `date` in `timeZone`. */
export function endOfZonedDay(date: Date, timeZone: string): Date {
  const start = startOfZonedDay(date, timeZone);
  // Next local midnight: jump 26h ahead (covers DST) then snap to its start.
  const nextStart = startOfZonedDay(new Date(start.getTime() + 26 * 3600 * 1000), timeZone);
  return new Date(nextStart.getTime() - 1);
}
