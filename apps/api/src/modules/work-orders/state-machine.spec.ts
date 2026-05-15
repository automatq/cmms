import { WorkOrderStatus } from './entities';
import { STATUS_TRANSITIONS, canTransition, isTerminal } from './state-machine';

describe('STATUS_TRANSITIONS map', () => {
  it('defines a transition list for every WorkOrderStatus value', () => {
    for (const status of Object.values(WorkOrderStatus)) {
      expect(STATUS_TRANSITIONS[status]).toBeDefined();
    }
  });

  it('CANCELLED is reachable from every non-terminal state', () => {
    for (const [from, transitions] of Object.entries(STATUS_TRANSITIONS)) {
      if (from === WorkOrderStatus.CANCELLED || from === WorkOrderStatus.COMPLETED) continue;
      expect(transitions).toContain(WorkOrderStatus.CANCELLED);
    }
  });

  it('CANCELLED is terminal', () => {
    expect(STATUS_TRANSITIONS[WorkOrderStatus.CANCELLED]).toEqual([]);
  });

  it('COMPLETED only allows reopen to IN_PROGRESS (no cancellation post-completion)', () => {
    expect(STATUS_TRANSITIONS[WorkOrderStatus.COMPLETED]).toEqual([WorkOrderStatus.IN_PROGRESS]);
  });

  it('happy-path REQUESTED → OPEN → IN_PROGRESS → COMPLETED is fully valid', () => {
    expect(canTransition(WorkOrderStatus.REQUESTED, WorkOrderStatus.OPEN)).toBe(true);
    expect(canTransition(WorkOrderStatus.OPEN, WorkOrderStatus.IN_PROGRESS)).toBe(true);
    expect(canTransition(WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.COMPLETED)).toBe(true);
  });

  it('approval gate: REQUESTED → PENDING_APPROVAL → OPEN is valid', () => {
    expect(canTransition(WorkOrderStatus.REQUESTED, WorkOrderStatus.PENDING_APPROVAL)).toBe(true);
    expect(canTransition(WorkOrderStatus.PENDING_APPROVAL, WorkOrderStatus.OPEN)).toBe(true);
  });

  it('hold loop: OPEN → ON_HOLD → OPEN is valid', () => {
    expect(canTransition(WorkOrderStatus.OPEN, WorkOrderStatus.ON_HOLD)).toBe(true);
    expect(canTransition(WorkOrderStatus.ON_HOLD, WorkOrderStatus.OPEN)).toBe(true);
  });

  it('hold loop: IN_PROGRESS → ON_HOLD → IN_PROGRESS is valid', () => {
    expect(canTransition(WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.ON_HOLD)).toBe(true);
    expect(canTransition(WorkOrderStatus.ON_HOLD, WorkOrderStatus.IN_PROGRESS)).toBe(true);
  });
});

describe('canTransition — invalid transitions', () => {
  it.each([
    // Cannot skip ahead in the lifecycle
    [WorkOrderStatus.REQUESTED, WorkOrderStatus.IN_PROGRESS],
    [WorkOrderStatus.REQUESTED, WorkOrderStatus.COMPLETED],
    [WorkOrderStatus.REQUESTED, WorkOrderStatus.ON_HOLD],
    [WorkOrderStatus.OPEN, WorkOrderStatus.COMPLETED],
    [WorkOrderStatus.OPEN, WorkOrderStatus.PENDING_APPROVAL],
    // Cannot move out of CANCELLED at all
    [WorkOrderStatus.CANCELLED, WorkOrderStatus.OPEN],
    [WorkOrderStatus.CANCELLED, WorkOrderStatus.IN_PROGRESS],
    [WorkOrderStatus.CANCELLED, WorkOrderStatus.COMPLETED],
    [WorkOrderStatus.CANCELLED, WorkOrderStatus.REQUESTED],
    // Cannot cancel a completed WO (it's done; cancellation no longer meaningful)
    [WorkOrderStatus.COMPLETED, WorkOrderStatus.CANCELLED],
    [WorkOrderStatus.COMPLETED, WorkOrderStatus.OPEN],
    [WorkOrderStatus.COMPLETED, WorkOrderStatus.REQUESTED],
  ])('rejects %s → %s', (from, to) => {
    expect(canTransition(from, to)).toBe(false);
  });
});

describe('isTerminal', () => {
  it('CANCELLED is terminal', () => {
    expect(isTerminal(WorkOrderStatus.CANCELLED)).toBe(true);
  });

  it('COMPLETED is NOT terminal (can reopen to IN_PROGRESS)', () => {
    expect(isTerminal(WorkOrderStatus.COMPLETED)).toBe(false);
  });

  it.each([
    WorkOrderStatus.REQUESTED,
    WorkOrderStatus.PENDING_APPROVAL,
    WorkOrderStatus.OPEN,
    WorkOrderStatus.IN_PROGRESS,
    WorkOrderStatus.ON_HOLD,
  ])('%s is not terminal', (status) => {
    expect(isTerminal(status)).toBe(false);
  });
});
