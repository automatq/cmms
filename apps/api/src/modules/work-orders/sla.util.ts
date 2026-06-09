/**
 * Pure SLA decision helpers, extracted from WorkOrdersService.processSlaEscalations
 * so the thresholds can be unit-tested without the DI graph / DB.
 */
export const SLA_SOON_WINDOW_MS = 24 * 60 * 60 * 1000;

/** True when an upcoming due date is within the pre-due reminder window. */
export function isDueSoon(dueMs: number, nowMs: number, windowMs = SLA_SOON_WINDOW_MS): boolean {
  return dueMs > nowMs && dueMs - nowMs <= windowMs;
}

/** Escalation level for an overdue work order: 1 now, 2 after 24h, 3 after 72h. */
export function overdueEscalationLevel(hoursOverdue: number): 1 | 2 | 3 {
  return hoursOverdue >= 72 ? 3 : hoursOverdue >= 24 ? 2 : 1;
}
