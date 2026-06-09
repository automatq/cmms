import { evalCondition } from './condition.util';

describe('evalCondition', () => {
  it('breaches critical when value is at/above a gt critical threshold', () => {
    expect(evalCondition(85, { operator: 'gt', criticalThreshold: 80 })).toEqual({
      breached: true,
      severity: 'critical',
    });
    expect(evalCondition(80, { operator: 'gt', criticalThreshold: 80 }).severity).toBe('critical');
  });

  it('breaches warning (not critical) between warning and critical for gt', () => {
    const r = evalCondition(75, { operator: 'gt', warningThreshold: 70, criticalThreshold: 80 });
    expect(r).toEqual({ breached: true, severity: 'warning' });
  });

  it('does not breach below all thresholds for gt', () => {
    expect(evalCondition(60, { operator: 'gt', warningThreshold: 70, criticalThreshold: 80 })).toEqual({
      breached: false,
      severity: null,
    });
  });

  it('defaults to gt when operator is missing', () => {
    expect(evalCondition(100, { criticalThreshold: 90 }).severity).toBe('critical');
  });

  it('breaches below the threshold for lt (e.g. low pressure)', () => {
    expect(evalCondition(5, { operator: 'lt', criticalThreshold: 10 })).toEqual({
      breached: true,
      severity: 'critical',
    });
    expect(evalCondition(15, { operator: 'lt', criticalThreshold: 10 }).breached).toBe(false);
  });

  it('prefers critical over warning when both cross', () => {
    expect(
      evalCondition(95, { operator: 'gt', warningThreshold: 70, criticalThreshold: 90 }).severity,
    ).toBe('critical');
  });

  it('ignores a missing/NaN critical threshold but still honors warning', () => {
    expect(evalCondition(75, { operator: 'gt', warningThreshold: 70 })).toEqual({
      breached: true,
      severity: 'warning',
    });
    expect(evalCondition(50, { operator: 'gt' }).breached).toBe(false);
  });
});
