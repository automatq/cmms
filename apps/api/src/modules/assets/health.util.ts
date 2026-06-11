/**
 * Pure, rule-based asset health score (0–100). Combines the most recent
 * condition rating with recent downtime and the asset's operational status —
 * all data we already collect — into one sortable number + band. Kept pure so
 * it is unit-testable and reusable.
 */
export interface HealthInputs {
  /** Latest condition assessment, 1 (worst) – 5 (best); null when unknown. */
  condition?: number | null;
  /** Operational status, e.g. 'active' | 'under_repair' | 'inactive' | 'retired'. */
  status?: string | null;
  /** Total downtime minutes over the recent window (e.g. last 90 days). */
  downtimeMinutes?: number;
}

export type HealthBand = 'healthy' | 'monitor' | 'at_risk' | 'critical';

export interface HealthScore {
  score: number;
  band: HealthBand;
  factors: string[];
}

const CONDITION_BASE: Record<number, number> = { 5: 100, 4: 85, 3: 65, 2: 40, 1: 20 };

export function computeHealthScore(inputs: HealthInputs): HealthScore {
  const factors: string[] = [];

  let score: number;
  if (inputs.condition != null && CONDITION_BASE[inputs.condition] != null) {
    score = CONDITION_BASE[inputs.condition];
    factors.push(`Condition rating ${inputs.condition}/5`);
  } else {
    score = 70; // unknown condition → neutral baseline
    factors.push('No condition assessment on record');
  }

  const downtime = Math.max(0, inputs.downtimeMinutes || 0);
  if (downtime > 0) {
    // −1 point per 2 hours of recent downtime, capped at −30.
    const penalty = Math.min(30, Math.floor(downtime / 120));
    if (penalty > 0) {
      score -= penalty;
      factors.push(`${Math.round(downtime)} min downtime recently (−${penalty})`);
    }
  }

  const status = (inputs.status || '').toLowerCase();
  if (status === 'under_repair') {
    score -= 25;
    factors.push('Currently under repair (−25)');
  } else if (status === 'retired') {
    score -= 50;
    factors.push('Asset retired (−50)');
  } else if (status === 'inactive') {
    score -= 20;
    factors.push('Asset inactive (−20)');
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const band: HealthBand =
    score >= 80 ? 'healthy' : score >= 55 ? 'monitor' : score >= 30 ? 'at_risk' : 'critical';

  return { score, band, factors };
}
