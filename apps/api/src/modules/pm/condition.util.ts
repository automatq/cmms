/**
 * Pure threshold evaluation for condition-based PM triggers. Extracted from
 * PmService so it can be unit-tested without the DI graph.
 */
export interface ConditionRule {
  metric?: string;
  operator?: string; // 'gt' (default) breaches above, 'lt' breaches below
  criticalThreshold?: number;
  warningThreshold?: number;
  debounceMinutes?: number;
}

export type ConditionSeverity = 'warning' | 'critical' | null;

export function evalCondition(
  value: number,
  cond: ConditionRule,
): { breached: boolean; severity: ConditionSeverity } {
  const op = cond.operator === 'lt' ? 'lt' : 'gt';
  const crosses = (threshold: number) => (op === 'lt' ? value <= threshold : value >= threshold);

  const critical = Number(cond.criticalThreshold);
  if (!isNaN(critical) && crosses(critical)) return { breached: true, severity: 'critical' };

  if (cond.warningThreshold != null) {
    const warning = Number(cond.warningThreshold);
    if (!isNaN(warning) && crosses(warning)) return { breached: true, severity: 'warning' };
  }
  return { breached: false, severity: null };
}
