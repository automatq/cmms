import { types } from 'pg';

/**
 * node-postgres returns NUMERIC/DECIMAL columns as strings by default (to avoid
 * precision loss). Our entities type them as `number` and the services do
 * arithmetic on them, e.g. `stock.qtyOnHand += qty`, which silently turned
 * into string concatenation ("10.00" + 5 === "10.005").
 *
 * All decimal columns in this schema are precision <= 12, which a JS double
 * represents exactly at scale 2-4, so parsing to a number is safe.
 *
 * Imported for its side effect from app.module.ts (API + worker) and the
 * TypeORM CLI data source. Must run before the first query.
 */
export function parseNumeric(value: string | null): number | null {
  return value === null ? null : parseFloat(value);
}

types.setTypeParser(types.builtins.NUMERIC, parseNumeric);
