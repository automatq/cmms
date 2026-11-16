jest.mock('../work-orders/work-orders.service', () => ({ WorkOrdersService: class {} }));
jest.mock('../notifications/notifications.service', () => ({ NotificationsService: class {} }));
jest.mock('../webhooks/webhooks.service', () => ({ WebhooksService: class {} }));
jest.mock('../blackouts/blackouts.service', () => ({ BlackoutsService: class {} }));

import { PmService, OPEN_PM_WORK_ORDER_STATUSES } from './pm.service';
import { FrequencyUnit, TriggerType } from './entities/pm-plan.entity';
import { WorkOrderStatus } from '../work-orders/entities/work-order.entity';

function makeService(opts: { openWoTotal?: number } = {}) {
  const plans: any[] = [];
  const pmPlanRepository = {
    find: jest.fn().mockImplementation(async () => plans.filter((p) => p.nextDueAt <= new Date())),
    save: jest.fn().mockImplementation(async (p) => p),
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
  return { svc, plans, workOrdersService };
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
