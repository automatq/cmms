jest.mock('../files/files.service', () => ({ FilesService: class {} }));
jest.mock('../notifications/notifications.service', () => ({ NotificationsService: class {} }));
jest.mock('../inventory/inventory.service', () => ({ InventoryService: class {} }));
jest.mock('../assets/downtime.service', () => ({ DowntimeService: class {} }));
jest.mock('../webhooks/webhooks.service', () => ({ WebhooksService: class {} }));

import { WorkOrdersService } from './work-orders.service';
import { WorkOrderStatus } from './entities/work-order.entity';
import { PmHistory, PmHistoryStatus } from '../pm/entities/pm-history.entity';
import { PmPlan } from '../pm/entities/pm-plan.entity';

function setup(wo: any, opts: { otherActive?: number; history?: any; planNextDue?: Date } = {}) {
  const workOrderRepository = {
    findOne: jest.fn().mockResolvedValue({ parts: [], ...wo }),
    save: jest.fn().mockImplementation(async (w) => w),
    count: jest.fn().mockResolvedValue(opts.otherActive ?? 0),
  };
  const historyRepo = {
    findOne: jest.fn().mockResolvedValue(opts.history ?? null),
    save: jest.fn().mockImplementation(async (h) => h),
    manager: {
      getRepository: (e: any) =>
        e === PmPlan ? { findOne: jest.fn().mockResolvedValue({ id: 'plan1', nextDueAt: opts.planNextDue }) } : null,
    },
  };
  const dataSource = {
    transaction: jest.fn(),
    getRepository: (e: any) => (e === PmHistory ? historyRepo : null),
  };
  const downtime = { endDowntime: jest.fn() };
  const svc = new WorkOrdersService(
    workOrderRepository as any, { find: jest.fn().mockResolvedValue([]) } as any,
    { find: jest.fn().mockResolvedValue([]) } as any,
    {} as any, {} as any, {} as any, {} as any, {} as any,
    { onWoStatusChanged: jest.fn() } as any,
    {} as any,
    downtime as any,
    { trigger: jest.fn() } as any,
    {} as any,
    dataSource as any,
  );
  return { svc, downtime, historyRepo, workOrderRepository };
}

describe('WorkOrdersService downtime on cancel', () => {
  it('ends downtime when a started work order is cancelled', async () => {
    const { svc, downtime } = setup({ id: 'wo1', status: WorkOrderStatus.IN_PROGRESS, assetId: 'a1', actualStart: new Date() });
    await svc.updateStatus('wo1', WorkOrderStatus.CANCELLED, 'u', 't1');
    expect(downtime.endDowntime).toHaveBeenCalledWith('a1', 'u', 't1');
  });

  it('does not touch downtime when cancelling a never-started work order', async () => {
    const { svc, downtime } = setup({ id: 'wo1', status: WorkOrderStatus.OPEN, assetId: 'a1' });
    await svc.updateStatus('wo1', WorkOrderStatus.CANCELLED, 'u', 't1');
    expect(downtime.endDowntime).not.toHaveBeenCalled();
  });

  it('keeps downtime open while another work order on the asset is in progress', async () => {
    const { svc, downtime } = setup(
      { id: 'wo1', status: WorkOrderStatus.IN_PROGRESS, assetId: 'a1', actualStart: new Date() },
      { otherActive: 1 },
    );
    await svc.updateStatus('wo1', WorkOrderStatus.COMPLETED, 'u', 't1');
    expect(downtime.endDowntime).not.toHaveBeenCalled();
  });
});

describe('WorkOrdersService PM outcome recording', () => {
  const pmWo = { id: 'wo1', status: WorkOrderStatus.IN_PROGRESS, pmPlanId: 'plan1', actualStart: new Date() };

  it('marks a PM completed before the next occurrence as on time', async () => {
    const history: any = { id: 'h1' };
    const { svc, historyRepo } = setup(pmWo, { history, planNextDue: new Date(Date.now() + 86400000) });
    await svc.updateStatus('wo1', WorkOrderStatus.COMPLETED, 'u', 't1');
    expect(historyRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: PmHistoryStatus.ON_TIME }));
    expect(history.completedAt).toBeInstanceOf(Date);
  });

  it('marks a PM completed after the next occurrence was due as late', async () => {
    const { svc, historyRepo } = setup(pmWo, { history: { id: 'h1' }, planNextDue: new Date(Date.now() - 86400000) });
    await svc.updateStatus('wo1', WorkOrderStatus.COMPLETED, 'u', 't1');
    expect(historyRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: PmHistoryStatus.LATE }));
  });

  it('marks a cancelled PM as skipped', async () => {
    const { svc, historyRepo } = setup(pmWo, { history: { id: 'h1' } });
    await svc.updateStatus('wo1', WorkOrderStatus.CANCELLED, 'u', 't1');
    expect(historyRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: PmHistoryStatus.SKIPPED }));
  });
});
