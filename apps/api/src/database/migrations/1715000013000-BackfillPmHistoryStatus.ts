import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * pm_history.status was never written, so PM compliance always read 0%.
 * Backfill from the linked work orders using the same rule the app now
 * applies on completion: on time if completed before the plan's next
 * occurrence was due (the next history row's due_at, or the plan's current
 * next_due_at for the latest row); cancelled work orders count as skipped.
 */
export class BackfillPmHistoryStatus1715000013000 implements MigrationInterface {
  name = 'BackfillPmHistoryStatus1715000013000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      WITH ordered AS (
        SELECT ph.id,
               wo.status::text AS wo_status,
               wo.completed_at,
               COALESCE(
                 LEAD(ph.due_at) OVER (PARTITION BY ph.pm_plan_id ORDER BY ph.due_at),
                 plan.next_due_at
               ) AS next_due
        FROM pm_history ph
        JOIN work_orders wo ON wo.id = ph.wo_id
        JOIN pm_plans plan ON plan.id = ph.pm_plan_id
        WHERE ph.status IS NULL
      )
      UPDATE pm_history ph
      SET status = CASE
            WHEN o.wo_status = 'cancelled' THEN 'skipped'
            WHEN o.next_due IS NULL OR o.completed_at <= o.next_due THEN 'on_time'
            ELSE 'late'
          END::pm_history_status_enum,
          completed_at = CASE WHEN o.wo_status = 'completed' THEN o.completed_at ELSE ph.completed_at END
      FROM ordered o
      WHERE ph.id = o.id
        AND (o.wo_status = 'cancelled' OR (o.wo_status = 'completed' AND o.completed_at IS NOT NULL))
    `);
  }

  public async down(): Promise<void> {
    // Data backfill; nothing to undo structurally.
  }
}
