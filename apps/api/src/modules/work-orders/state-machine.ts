/**
 * Pure state-machine logic for WorkOrder status transitions.
 *
 * Extracted from work-orders.service.ts so it can be unit-tested without
 * pulling in the service's entire DI graph (which transitively imports
 * ESM-only packages like better-auth that Jest can't load in test).
 */
import { WorkOrderStatus } from './entities';

export const STATUS_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  [WorkOrderStatus.REQUESTED]: [
    WorkOrderStatus.OPEN,
    WorkOrderStatus.PENDING_APPROVAL,
    WorkOrderStatus.CANCELLED,
  ],
  [WorkOrderStatus.PENDING_APPROVAL]: [
    WorkOrderStatus.OPEN,
    WorkOrderStatus.REQUESTED,
    WorkOrderStatus.CANCELLED,
  ],
  [WorkOrderStatus.OPEN]: [
    WorkOrderStatus.IN_PROGRESS,
    WorkOrderStatus.ON_HOLD,
    WorkOrderStatus.CANCELLED,
  ],
  [WorkOrderStatus.IN_PROGRESS]: [
    WorkOrderStatus.ON_HOLD,
    WorkOrderStatus.COMPLETED,
    WorkOrderStatus.CANCELLED,
  ],
  [WorkOrderStatus.ON_HOLD]: [
    WorkOrderStatus.OPEN,
    WorkOrderStatus.IN_PROGRESS,
    WorkOrderStatus.CANCELLED,
  ],
  [WorkOrderStatus.COMPLETED]: [WorkOrderStatus.IN_PROGRESS],
  [WorkOrderStatus.CANCELLED]: [],
};

export function canTransition(from: WorkOrderStatus, to: WorkOrderStatus): boolean {
  return STATUS_TRANSITIONS[from].includes(to);
}

export function isTerminal(status: WorkOrderStatus): boolean {
  return STATUS_TRANSITIONS[status].length === 0;
}
