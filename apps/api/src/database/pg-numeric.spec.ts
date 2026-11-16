import { types } from 'pg';
import './pg-numeric';

describe('pg NUMERIC parsing', () => {
  const parse = types.getTypeParser(types.builtins.NUMERIC);

  it('returns numbers so += adds instead of concatenating', () => {
    let qtyOnHand = parse('10.00') as unknown as number;
    qtyOnHand += 5;
    expect(qtyOnHand).toBe(15);
  });

  it('keeps 2-decimal money values exact', () => {
    expect(parse('1234567890.12')).toBe(1234567890.12);
  });
});
