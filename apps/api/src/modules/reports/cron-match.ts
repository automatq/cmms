import { ZonedParts } from '../../common/time/tenant-time';

/**
 * Minimal 5-field cron matcher (minute hour day-of-month month day-of-week)
 * supporting '*', lists (1,2), ranges (1-5), steps (* /15, 1-30/5) and
 * day-of-week 7 = Sunday. Follows standard cron semantics: when BOTH
 * day-of-month and day-of-week are restricted, either may match.
 */
function fieldMatches(field: string, value: number, min: number, max: number, isDow = false): boolean {
  return field.split(',').some((term) => {
    const [rangePart, stepPart] = term.split('/');
    const step = stepPart ? parseInt(stepPart, 10) : 1;
    if (!Number.isFinite(step) || step <= 0) return false;

    let lo: number;
    let hi: number;
    if (rangePart === '*') {
      lo = min;
      hi = max;
    } else if (rangePart.includes('-')) {
      [lo, hi] = rangePart.split('-').map((n) => parseInt(n, 10));
    } else {
      lo = parseInt(rangePart, 10);
      hi = stepPart ? max : lo;
    }
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return false;

    const candidates = isDow && value === 0 ? [0, 7] : [value];
    return candidates.some((v) => v >= lo && v <= hi && (v - lo) % step === 0);
  });
}

export function cronMatches(expr: string, at: ZonedParts): boolean {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  const [minute, hour, dom, month, dow] = parts;

  if (!fieldMatches(minute, at.minute, 0, 59)) return false;
  if (!fieldMatches(hour, at.hour, 0, 23)) return false;
  if (!fieldMatches(month, at.month, 1, 12)) return false;

  const domMatch = fieldMatches(dom, at.day, 1, 31);
  const dowMatch = fieldMatches(dow, at.weekday, 0, 7, true);
  const domRestricted = dom !== '*';
  const dowRestricted = dow !== '*';
  if (domRestricted && dowRestricted) return domMatch || dowMatch;
  return domMatch && dowMatch;
}
