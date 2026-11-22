jest.mock('../work-orders/work-orders.service', () => ({ WorkOrdersService: class {} }));
jest.mock('../notifications/notifications.service', () => ({ NotificationsService: class {} }));
jest.mock('../webhooks/webhooks.service', () => ({ WebhooksService: class {} }));
jest.mock('../blackouts/blackouts.service', () => ({ BlackoutsService: class {} }));

import { PmService, OPEN_PM_WORK_ORDER_STATUSES } from './pm.service';
import { FrequencyUnit, TriggerType } from './entities/pm-plan.entity';
import { WorkOrderStatus } from '../work-orders/entities/work-order.entity';

function makeService(opts: { openWoTotal?: number; actorId?: string | null } = {}) {
  const plans: any[] = [];
  const query = jest.fn().mockResolvedValue(
    opts.actorId === null ? [] : [{ user_id: opts.actorId ?? 'owner-user' }],
  );
  const pmPlanRepository = {
    find: jest.fn().mockImplementation(async () => plans.filter((p) => p.nextDueAt <= new Date())),
    save: jest.fn().mockImplementation(async (p) => p),
    manager: { query },
  };
  const workOrdersService = {
    findAll: jest.fn().mockResolvedValue({ total: opts.openWoTotal ?? 0 }),
    create: jest.fn().mockImplementation(async () => ({ id: `wo${Math.random()}` })),
  };
  const svc = new PmService(
    pmPlanRepository as any,
    {} as any,
    { save: jest.fn() } as any,
    {} as any,
    workOrdersService as any,
    { onPmDue: jest.fn() } as any,
    { trigger: jest.fn() } as any,
    { isBlackout: jest.fn().mockResolvedValue(false), nextWorkingDay: jest.fn(async (d: Date) => d) } as any,
    {} as any,
  );
  return { svc, plans, workOrdersService, query };
}

const monthlyPlan = (nextDueAt: Date) => ({
  id: 'plan1',
  tenantId: 't1',
  name: 'Monthly lube',
  isActive: true,
  triggerType: TriggerType.TIME,
  frequencyValue: 1,
  frequencyUnit: FrequencyUnit.MONTH,
  rollingSchedule: false,
  ignoreBlackouts: true,
  nextDueAt,
});

describe('PM scheduling', () => {
  it('treats a freshly created (REQUESTED) PM work order as open', () => {
    expect(OPEN_PM_WORK_ORDER_STATUSES).toContain(WorkOrderStatus.REQUESTED);
    expect(OPEN_PM_WORK_ORDER_STATUSES).not.toContain(WorkOrderStatus.COMPLETED);
    expect(OPEN_PM_WORK_ORDER_STATUSES).not.toContain(WorkOrderStatus.CANCELLED);
  });

  it('passes the full open-status list to the duplicate check', async () => {
    const { svc, plans, workOrdersService } = makeService({ openWoTotal: 1 });
    plans.push(monthlyPlan(new Date(Date.now() - 1000)));
    await svc.processScheduledPMs();
    expect(workOrdersService.findAll.mock.calls[0][0].status).toEqual(OPEN_PM_WORK_ORDER_STATUSES);
    expect(workOrdersService.create).not.toHaveBeenCalled();
  });

  it('a plan 6 months overdue generates ONE work order and jumps to the next future date', async () => {
    const { svc, plans, workOrdersService } = makeService();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const plan = monthlyPlan(sixMonthsAgo);
    plans.push(plan);

    await svc.processScheduledPMs();
    expect(plan.nextDueAt.getTime()).toBeGreaterThan(Date.now());
    // keeps the original day-of-month cadence
    expect(plan.nextDueAt.getDate()).toBe(sixMonthsAgo.getDate());

    // Next hourly tick: nothing more is due.
    await svc.processScheduledPMs();
    expect(workOrdersService.create).toHaveBeenCalledTimes(1);
  });

  it('creates scheduled PM work orders as the org owner (created_by_id is a user FK)', async () => {
    const { svc, plans, workOrdersService, query } = makeService({ actorId: 'owner-123' });
    plans.push(monthlyPlan(new Date(Date.now() - 1000)));
    plans.push({ ...monthlyPlan(new Date(Date.now() - 1000)), id: 'plan2' });
    await svc.processScheduledPMs();
    expect(workOrdersService.create).toHaveBeenCalledTimes(2);
    for (const call of workOrdersService.create.mock.calls) expect(call[1]).toBe('owner-123');
    expect(workOrdersService.create.mock.calls.some((c: any[]) => c[1] === 'system')).toBe(false);
    // resolved once per tenant per run, only active owner/admin memberships
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toMatch(/role IN \('owner', 'admin'\)/);
    expect(query.mock.calls[0][0]).toMatch(/'inactive'/);
    expect(query.mock.calls[0][1]).toEqual(['t1']);
  });

  it('skips (without advancing) when the tenant has no active owner/admin', async () => {
    const { svc, plans, workOrdersService } = makeService({ actorId: null });
    const due = new Date(Date.now() - 1000);
    const plan = monthlyPlan(due);
    plans.push(plan);
    const result = await svc.processScheduledPMs();
    expect(workOrdersService.create).not.toHaveBeenCalled();
    expect(result.skipped).toBe(1);
    expect(plan.nextDueAt).toBe(due);
  });

  it('rolling schedules are anchored on now', async () => {
    const { svc } = makeService();
    const now = new Date('2026-11-16T10:00:00Z');
    const next = await (svc as any).calculateNextDueDate(
      { ...monthlyPlan(new Date('2026-01-01')), rollingSchedule: true, frequencyUnit: FrequencyUnit.WEEK },
      't1',
      now,
    );
    expect(next.toISOString()).toBe('2026-11-23T10:00:00.000Z');
  });
});
