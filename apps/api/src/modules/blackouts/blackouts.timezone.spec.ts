import { BlackoutsService } from './blackouts.service';

function svc(timezone: string, blackoutHits = 0) {
  const qb: any = { where: () => qb, andWhere: jest.fn(() => qb), getCount: async () => blackoutHits };
  const blackoutRepo = { createQueryBuilder: () => qb };
  const tenantRepo = { findOne: jest.fn().mockResolvedValue({ id: 't1', timezone, settings: {} }) };
  return { service: new BlackoutsService(blackoutRepo as any, tenantRepo as any), qb, tenantRepo };
}

describe('BlackoutsService timezone handling', () => {
  it('judges working days in the tenant timezone', async () => {
    // Sunday 22:30 UTC = Monday 07:30 in Tokyo -> a working day there.
    const at = new Date('2026-11-15T22:30:00Z');
    expect(await svc('Asia/Tokyo').service.isBlackout(at, 't1')).toBe(false);
    expect(await svc('UTC').service.isBlackout(at, 't1')).toBe(true);
  });

  it('checks blackout dates using the local calendar date', async () => {
    const { service, qb } = svc('Asia/Tokyo');
    await service.isBlackout(new Date('2026-11-15T22:30:00Z'), 't1');
    expect(qb.andWhere).toHaveBeenCalledWith(expect.any(String), { iso: '2026-11-16' });
  });

  it('loads the tenant calendar once when rolling forward', async () => {
    const { service, tenantRepo } = svc('UTC');
    // Saturday -> rolls to Monday, checking 3 days.
    const next = await service.nextWorkingDay(new Date('2026-11-21T09:00:00Z'), 't1');
    expect(next.toISOString()).toBe('2026-11-23T09:00:00.000Z');
    expect(tenantRepo.findOne).toHaveBeenCalledTimes(1);
  });
});
