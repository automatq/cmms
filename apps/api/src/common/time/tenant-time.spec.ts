import { endOfZonedDay, resolveTimeZone, startOfZonedDay, zonedParts } from './tenant-time';

describe('tenant-time', () => {
  it('reports local calendar fields in the tenant timezone', () => {
    // Sunday 22:30 UTC is already Monday 07:30 in Tokyo.
    const at = new Date('2026-11-15T22:30:00Z');
    expect(zonedParts(at, 'UTC')).toMatchObject({ weekday: 0, hour: 22, ymd: '2026-11-15' });
    expect(zonedParts(at, 'Asia/Tokyo')).toMatchObject({ weekday: 1, hour: 7, minute: 30, ymd: '2026-11-16' });
  });

  it('falls back to UTC for missing or invalid zones', () => {
    expect(resolveTimeZone(undefined)).toBe('UTC');
    expect(resolveTimeZone('Not/AZone')).toBe('UTC');
    expect(resolveTimeZone('America/Toronto')).toBe('America/Toronto');
  });

  it('computes local day bounds', () => {
    const at = new Date('2026-11-16T03:00:00Z'); // 22:00 on the 15th in Toronto (UTC-5)
    expect(startOfZonedDay(at, 'America/Toronto').toISOString()).toBe('2026-11-15T05:00:00.000Z');
    expect(endOfZonedDay(at, 'America/Toronto').toISOString()).toBe('2026-11-16T04:59:59.999Z');
  });

  it('handles DST transition days', () => {
    // 2026-03-08 is the US spring-forward day: the local day is 23h long.
    const at = new Date('2026-03-08T18:00:00Z');
    const start = startOfZonedDay(at, 'America/Toronto');
    const end = endOfZonedDay(at, 'America/Toronto');
    expect(start.toISOString()).toBe('2026-03-08T05:00:00.000Z');
    expect(end.getTime() - start.getTime() + 1).toBe(23 * 3600 * 1000);
  });
});
