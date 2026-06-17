import { computeHealthScore } from './health.util';

describe('computeHealthScore', () => {
  it('maps a top condition with no issues to a healthy band', () => {
    const r = computeHealthScore({ condition: 5, status: 'active', downtimeMinutes: 0 });
    expect(r.score).toBe(100);
    expect(r.band).toBe('healthy');
  });

  it('uses a neutral baseline when condition is unknown', () => {
    const r = computeHealthScore({ status: 'active' });
    expect(r.score).toBe(70);
    expect(r.band).toBe('monitor');
    expect(r.factors.join(' ')).toMatch(/No condition assessment/);
  });

  it('penalizes recent downtime, capped at -30', () => {
    expect(computeHealthScore({ condition: 5, downtimeMinutes: 240 }).score).toBe(98); // -2
    expect(computeHealthScore({ condition: 5, downtimeMinutes: 100000 }).score).toBe(70); // capped -30
  });

  it('applies an under-repair penalty', () => {
    const r = computeHealthScore({ condition: 4, status: 'under_repair' });
    expect(r.score).toBe(60); // 85 - 25
    expect(r.factors.join(' ')).toMatch(/under repair/i);
  });

  it('penalizes retired and inactive assets so they are not falsely healthy', () => {
    const retired = computeHealthScore({ condition: 5, status: 'retired' });
    expect(retired.score).toBe(50); // 100 - 50
    expect(retired.band).not.toBe('healthy');

    const inactive = computeHealthScore({ condition: 5, status: 'inactive' });
    expect(inactive.score).toBe(80); // 100 - 20
  });

  it('clamps to 0 and lands in the critical band for a failing asset', () => {
    const r = computeHealthScore({ condition: 1, status: 'under_repair', downtimeMinutes: 100000 });
    expect(r.score).toBe(0);
    expect(r.band).toBe('critical');
  });

  it('bands the boundaries correctly', () => {
    expect(computeHealthScore({ condition: 4 }).band).toBe('healthy'); // 85
    expect(computeHealthScore({ condition: 3 }).band).toBe('monitor'); // 65
    expect(computeHealthScore({ condition: 2 }).band).toBe('at_risk'); // 40
    expect(computeHealthScore({ condition: 1 }).band).toBe('critical'); // 20
  });
});
