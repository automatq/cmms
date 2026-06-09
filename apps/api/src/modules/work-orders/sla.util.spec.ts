import { isDueSoon, overdueEscalationLevel, SLA_SOON_WINDOW_MS } from './sla.util';

describe('sla.util', () => {
  describe('isDueSoon', () => {
    const now = 1_000_000_000_000;

    it('is true when due within the window and still in the future', () => {
      expect(isDueSoon(now + 60 * 60 * 1000, now)).toBe(true); // 1h out
    });

    it('is false when due further out than the window', () => {
      expect(isDueSoon(now + SLA_SOON_WINDOW_MS + 1, now)).toBe(false);
    });

    it('is false when already past due (that is overdue, not due-soon)', () => {
      expect(isDueSoon(now - 1, now)).toBe(false);
    });

    it('respects a custom window', () => {
      expect(isDueSoon(now + 2 * 60 * 60 * 1000, now, 60 * 60 * 1000)).toBe(false);
      expect(isDueSoon(now + 30 * 60 * 1000, now, 60 * 60 * 1000)).toBe(true);
    });
  });

  describe('overdueEscalationLevel', () => {
    it('is level 1 immediately after due', () => {
      expect(overdueEscalationLevel(0)).toBe(1);
      expect(overdueEscalationLevel(23.9)).toBe(1);
    });

    it('is level 2 after 24h', () => {
      expect(overdueEscalationLevel(24)).toBe(2);
      expect(overdueEscalationLevel(71)).toBe(2);
    });

    it('is level 3 after 72h', () => {
      expect(overdueEscalationLevel(72)).toBe(3);
      expect(overdueEscalationLevel(1000)).toBe(3);
    });
  });
});
