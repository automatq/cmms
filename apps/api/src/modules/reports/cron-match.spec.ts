import { cronMatches } from './cron-match';
import { zonedParts } from '../../common/time/tenant-time';

const at = (iso: string, tz = 'UTC') => zonedParts(new Date(iso), tz);

describe('cronMatches', () => {
  it('matches the weekly Monday 8 AM preset in the tenant timezone', () => {
    // 08:00 Monday in Toronto is 13:00 UTC.
    expect(cronMatches('0 8 * * 1', at('2026-11-16T13:00:00Z', 'America/Toronto'))).toBe(true);
    expect(cronMatches('0 8 * * 1', at('2026-11-16T08:00:00Z', 'America/Toronto'))).toBe(false);
  });

  it('supports ranges, lists and steps', () => {
    expect(cronMatches('*/15 9-17 * * 1-5', at('2026-11-17T10:45:00Z'))).toBe(true); // Tue
    expect(cronMatches('*/15 9-17 * * 1-5', at('2026-11-21T10:45:00Z'))).toBe(false); // Sat
    expect(cronMatches('0 8,20 * * *', at('2026-11-17T20:00:00Z'))).toBe(true);
    expect(cronMatches('0 8,20 * * *', at('2026-11-17T12:00:00Z'))).toBe(false);
  });

  it('treats day-of-week 7 as Sunday', () => {
    expect(cronMatches('0 0 * * 7', at('2026-11-15T00:00:00Z'))).toBe(true);
  });

  it('ORs day-of-month and day-of-week when both are restricted', () => {
    expect(cronMatches('0 8 1 * 1', at('2026-11-16T08:00:00Z'))).toBe(true); // Monday, not the 1st
    expect(cronMatches('0 8 1 * 1', at('2026-12-01T08:00:00Z'))).toBe(true); // 1st, a Tuesday
    expect(cronMatches('0 8 1 * 1', at('2026-11-17T08:00:00Z'))).toBe(false);
  });

  it('rejects malformed expressions', () => {
    expect(cronMatches('0 8 * *', at('2026-11-16T08:00:00Z'))).toBe(false);
  });
});
